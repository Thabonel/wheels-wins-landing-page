
from datetime import datetime, timedelta
from typing import Optional, Any, Dict, List
import jwt
import bcrypt
import hashlib
import hmac
import secrets
from functools import wraps
from fastapi import HTTPException, status, Depends, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import time
import re
from .config import settings
from .exceptions import (
    AuthenticationError,
    AuthorizationError,
    RateLimitError,
    ValidationError
)

# Security scheme for JWT tokens
security = HTTPBearer()

# Rate limiting storage (in production, use Redis)
rate_limit_storage = {}

class SecurityManager:
    """Central security management class"""
    
    @staticmethod
    def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
        """Create JWT access token"""
        to_encode = data.copy()
        
        if expires_delta:
            expire = datetime.utcnow() + expires_delta
        else:
            expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        
        to_encode.update({"exp": expire})
        
        try:
            encoded_jwt = jwt.encode(
                to_encode, 
                settings.SECRET_KEY, 
                algorithm=settings.ALGORITHM
            )
            return encoded_jwt
        except Exception as e:
            raise AuthenticationError(
                message="Failed to create access token",
                details={"error": str(e)}
            )

    @staticmethod
    def create_refresh_token(user_id: str) -> str:
        """Create JWT refresh token"""
        data = {
            "sub": user_id,
            "type": "refresh",
            "exp": datetime.utcnow() + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
        }
        
        try:
            return jwt.encode(data, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
        except Exception as e:
            raise AuthenticationError(
                message="Failed to create refresh token",
                details={"error": str(e)}
            )

    @staticmethod
    def verify_token(credentials: HTTPAuthorizationCredentials = Depends(security)) -> Dict[str, Any]:
        """Verify JWT token and return payload"""
        token = credentials.credentials
        
        try:
            payload = jwt.decode(
                token, 
                settings.SECRET_KEY, 
                algorithms=[settings.ALGORITHM]
            )
            
            # Check if token is expired
            exp = payload.get("exp")
            if exp and datetime.utcnow().timestamp() > exp:
                raise AuthenticationError(
                    message="Token has expired",
                    error_code="TOKEN_EXPIRED"
                )
            
            return payload
            
        except jwt.ExpiredSignatureError:
            raise AuthenticationError(
                message="Token has expired",
                error_code="TOKEN_EXPIRED"
            )
        except jwt.JWTError as e:
            raise AuthenticationError(
                message="Could not validate credentials",
                error_code="INVALID_TOKEN",
                details={"error": str(e)}
            )

    @staticmethod
    def verify_refresh_token(token: str) -> Dict[str, Any]:
        """Verify refresh token"""
        try:
            payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
            
            if payload.get("type") != "refresh":
                raise AuthenticationError(
                    message="Invalid token type",
                    error_code="INVALID_TOKEN_TYPE"
                )
            
            return payload
            
        except jwt.ExpiredSignatureError:
            raise AuthenticationError(
                message="Refresh token has expired",
                error_code="REFRESH_TOKEN_EXPIRED"
            )
        except jwt.JWTError:
            raise AuthenticationError(
                message="Invalid refresh token",
                error_code="INVALID_REFRESH_TOKEN"
            )

class PasswordManager:
    """Password hashing and verification utilities"""
    
    @staticmethod
    def hash_password(password: str) -> str:
        """Hash password using bcrypt"""
        if len(password) < 8:
            raise ValidationError(
                message="Password must be at least 8 characters long",
                error_code="PASSWORD_TOO_SHORT"
            )
        
        salt = bcrypt.gensalt()
        hashed = bcrypt.hashpw(password.encode('utf-8'), salt)
        return hashed.decode('utf-8')

    @staticmethod
    def verify_password(password: str, hashed_password: str) -> bool:
        """Verify password against hash"""
        try:
            return bcrypt.checkpw(password.encode('utf-8'), hashed_password.encode('utf-8'))
        except Exception:
            return False

    @staticmethod
    def generate_secure_password(length: int = 16) -> str:
        """Generate a secure random password"""
        import string
        characters = string.ascii_letters + string.digits + "!@#$%^&*"
        return ''.join(secrets.choice(characters) for _ in range(length))

class APIKeyManager:
    """API key validation and management"""
    
    @staticmethod
    def validate_openai_key(api_key: str) -> bool:
        """Validate OpenAI API key format"""
        if not api_key or not api_key.startswith('sk-'):
            return False
        return len(api_key) > 20

    @staticmethod
    def validate_supabase_key(api_key: str) -> bool:
        """Validate Supabase API key format"""
        if not api_key:
            return False
        return len(api_key) > 50

    @staticmethod
    def generate_api_key() -> str:
        """Generate secure API key"""
        return f"pam_{secrets.token_urlsafe(32)}"

    @staticmethod
    def hash_api_key(api_key: str) -> str:
        """Hash API key for storage"""
        return hashlib.sha256(api_key.encode()).hexdigest()

def rate_limit(max_requests: int = 60, window_minutes: int = 1):
    """Rate limiting decorator"""
    def decorator(func):
        @wraps(func)
        async def wrapper(request: Request, *args, **kwargs):
            # Get client identifier (IP address or user ID)
            client_id = request.client.host if request.client else "unknown"
            
            # Get user ID from token if available
            try:
                auth_header = request.headers.get("Authorization")
                if auth_header and auth_header.startswith("Bearer "):
                    token = auth_header.split(" ")[1]
                    payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
                    client_id = payload.get("sub", client_id)
            except:
                pass  # Use IP address as fallback
            
            current_time = time.time()
            window_start = current_time - (window_minutes * 60)
            
            # Clean old entries
            if client_id in rate_limit_storage:
                rate_limit_storage[client_id] = [
                    timestamp for timestamp in rate_limit_storage[client_id]
                    if timestamp > window_start
                ]
            else:
                rate_limit_storage[client_id] = []
            
            # Check rate limit
            if len(rate_limit_storage[client_id]) >= max_requests:
                raise RateLimitError(
                    message=f"Rate limit exceeded. Max {max_requests} requests per {window_minutes} minute(s)",
                    error_code="RATE_LIMIT_EXCEEDED"
                )
            
            # Add current request
            rate_limit_storage[client_id].append(current_time)
            
            return await func(request, *args, **kwargs)
        return wrapper
    return decorator

class RequestSanitizer:
    """Request sanitization utilities"""
    
    @staticmethod
    def sanitize_input(text: str) -> str:
        """Sanitize user input to prevent XSS and injection attacks"""
        if not text:
            return ""
        
        # Remove potentially dangerous characters
        sanitized = re.sub(r'[<>"\';()&+]', '', text)
        
        # Limit length
        if len(sanitized) > 1000:
            sanitized = sanitized[:1000]
        
        return sanitized.strip()

    @staticmethod
    def validate_email(email: str) -> bool:
        """Validate email format"""
        pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        return re.match(pattern, email) is not None

    @staticmethod
    def validate_uuid(uuid_string: str) -> bool:
        """Validate UUID format"""
        pattern = r'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        return re.match(pattern, uuid_string.lower()) is not None

def get_cors_middleware():
    """Configure CORS middleware"""
    return CORSMiddleware(
        allow_origins=settings.ALLOWED_ORIGINS,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
        allow_headers=["*"],
        expose_headers=["X-Request-ID", "X-Rate-Limit-Remaining"],
    )

def get_security_headers():
    """Get security headers for responses"""
    return {
        "X-Content-Type-Options": "nosniff",
        "X-Frame-Options": "DENY",
        "X-XSS-Protection": "1; mode=block",
        "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
        "Referrer-Policy": "strict-origin-when-cross-origin",
        "Content-Security-Policy": "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';",
    }

def create_secure_response(data: Any, status_code: int = 200) -> JSONResponse:
    """Create response with security headers"""
    response = JSONResponse(content=data, status_code=status_code)
    
    # Add security headers
    for header, value in get_security_headers().items():
        response.headers[header] = value
    
    return response

def require_permission(permission: str):
    """Decorator to require specific permission"""
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # This would integrate with your user permission system
            # For now, just a placeholder
            return await func(*args, **kwargs)
        return wrapper
    return decorator

# Signature verification for webhooks
def verify_webhook_signature(payload: bytes, signature: str, secret: str) -> bool:
    """Verify webhook signature"""
    expected_signature = hmac.new(
        secret.encode('utf-8'),
        payload,
        hashlib.sha256
    ).hexdigest()
    
    return hmac.compare_digest(f"sha256={expected_signature}", signature)

# Initialize security utilities
security_manager = SecurityManager()
password_manager = PasswordManager()
api_key_manager = APIKeyManager()
request_sanitizer = RequestSanitizer()
