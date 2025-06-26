
"""
Security Hardening Module
Implements request signing, CSRF protection, and security utilities.
"""

import hmac
import hashlib
import secrets
import time
from typing import Optional, Dict, Any
from datetime import datetime, timedelta
from fastapi import HTTPException, Request, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.core.config import settings
from app.core.logging import setup_logging

logger = setup_logging()

# Request signing for internal services
class RequestSigner:
    """Handles request signing for internal service communication"""
    
    def __init__(self, secret_key: str = None):
        self.secret_key = secret_key or settings.SECRET_KEY
    
    def sign_request(self, method: str, path: str, body: str = "", timestamp: int = None) -> str:
        """Generate HMAC signature for request"""
        timestamp = timestamp or int(time.time())
        
        # Create signature payload
        payload = f"{method.upper()}|{path}|{body}|{timestamp}"
        
        # Generate HMAC signature
        signature = hmac.new(
            self.secret_key.encode(),
            payload.encode(),
            hashlib.sha256
        ).hexdigest()
        
        return f"{timestamp}.{signature}"
    
    def verify_signature(self, method: str, path: str, body: str, signature: str, max_age: int = 300) -> bool:
        """Verify request signature"""
        try:
            timestamp_str, sig = signature.split('.', 1)
            timestamp = int(timestamp_str)
            
            # Check timestamp validity (prevent replay attacks)
            current_time = int(time.time())
            if current_time - timestamp > max_age:
                logger.warning(f"Request signature expired: {timestamp}")
                return False
            
            # Verify signature
            expected_sig = self.sign_request(method, path, body, timestamp).split('.', 1)[1]
            
            return hmac.compare_digest(sig, expected_sig)
            
        except (ValueError, IndexError) as e:
            logger.warning(f"Invalid signature format: {e}")
            return False

# CSRF Protection
class CSRFProtection:
    """CSRF token generation and validation"""
    
    def __init__(self, secret_key: str = None):
        self.secret_key = secret_key or settings.SECRET_KEY
    
    def generate_token(self, session_id: str) -> str:
        """Generate CSRF token for session"""
        timestamp = str(int(time.time()))
        payload = f"{session_id}|{timestamp}"
        
        token = hmac.new(
            self.secret_key.encode(),
            payload.encode(),
            hashlib.sha256
        ).hexdigest()
        
        return f"{timestamp}.{token}"
    
    def validate_token(self, token: str, session_id: str, max_age: int = 3600) -> bool:
        """Validate CSRF token"""
        try:
            timestamp_str, token_hash = token.split('.', 1)
            timestamp = int(timestamp_str)
            
            # Check token age
            current_time = int(time.time())
            if current_time - timestamp > max_age:
                return False
            
            # Verify token
            expected_token = self.generate_token(session_id).split('.', 1)[1]
            return hmac.compare_digest(token_hash, expected_token)
            
        except (ValueError, IndexError):
            return False

# SQL Injection Prevention
class SQLSanitizer:
    """SQL injection prevention utilities"""
    
    @staticmethod
    def sanitize_identifier(identifier: str) -> str:
        """Sanitize SQL identifiers (table/column names)"""
        # Remove any non-alphanumeric characters except underscores
        sanitized = ''.join(c for c in identifier if c.isalnum() or c == '_')
        
        # Ensure it doesn't start with a number
        if sanitized and sanitized[0].isdigit():
            sanitized = f"_{sanitized}"
        
        return sanitized
    
    @staticmethod
    def validate_order_by(column: str, allowed_columns: list) -> str:
        """Validate ORDER BY column against whitelist"""
        if column not in allowed_columns:
            raise ValueError(f"Invalid column for ordering: {column}")
        return column
    
    @staticmethod
    def validate_limit(limit: int, max_limit: int = 1000) -> int:
        """Validate and cap LIMIT values"""
        if limit < 1:
            return 1
        return min(limit, max_limit)

# Security Headers
SECURITY_HEADERS = {
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "X-XSS-Protection": "1; mode=block",
    "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
    "Content-Security-Policy": (
        "default-src 'self'; "
        "script-src 'self' 'unsafe-inline' 'unsafe-eval'; "
        "style-src 'self' 'unsafe-inline'; "
        "img-src 'self' data: https:; "
        "connect-src 'self' wss: https:; "
        "font-src 'self' data:; "
        "object-src 'none'; "
        "media-src 'self'; "
        "frame-src 'none';"
    ),
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Permissions-Policy": (
        "geolocation=(), microphone=(), camera=(), "
        "payment=(), usb=(), magnetometer=(), gyroscope=()"
    )
}

# Rate limiting storage (in-memory for simplicity, use Redis in production)
class RateLimiter:
    """Simple rate limiter for API endpoints"""
    
    def __init__(self):
        self.requests = {}
    
    def is_allowed(self, key: str, limit: int, window: int) -> bool:
        """Check if request is within rate limit"""
        current_time = time.time()
        window_start = current_time - window
        
        # Clean old entries
        if key in self.requests:
            self.requests[key] = [req_time for req_time in self.requests[key] if req_time > window_start]
        else:
            self.requests[key] = []
        
        # Check current count
        if len(self.requests[key]) >= limit:
            return False
        
        # Add current request
        self.requests[key].append(current_time)
        return True

# Security utilities
def generate_secure_token(length: int = 32) -> str:
    """Generate cryptographically secure random token"""
    return secrets.token_urlsafe(length)

def hash_password(password: str) -> str:
    """Hash password using secure method"""
    import bcrypt
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    """Verify password against hash"""
    import bcrypt
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

# Initialize global instances
request_signer = RequestSigner()
csrf_protection = CSRFProtection()
sql_sanitizer = SQLSanitizer()
rate_limiter = RateLimiter()
