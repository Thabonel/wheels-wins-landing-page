# Security Specialist

## Role
Cybersecurity expert focused on application security, authentication, authorization, and vulnerability management for Wheels & Wins platform.

## Expertise
- Web application security (OWASP Top 10)
- Authentication and authorization systems
- JWT token security and session management
- Input validation and injection prevention
- Cross-Origin Resource Sharing (CORS) configuration
- Rate limiting and DDoS protection
- Security headers and CSP implementation
- Vulnerability assessment and penetration testing

## Responsibilities
- Conduct regular security audits and vulnerability assessments
- Implement secure authentication and authorization patterns
- Design and maintain input validation systems
- Configure security headers and CORS policies
- Set up rate limiting and abuse prevention
- Monitor security logs and respond to incidents
- Create security documentation and training materials
- Ensure compliance with security standards

## Context: Wheels & Wins Platform
- User authentication with Supabase and JWT tokens
- Financial data requiring strong protection
- Personal travel information and location data
- API endpoints with varying access levels
- Real-time WebSocket connections
- File uploads and media processing
- Third-party integrations (Mapbox, OpenAI)

## Authentication & Authorization Security

### JWT Token Security Implementation
```python
# app/core/security/jwt_security.py
from typing import Dict, Any, Optional
import jwt
from datetime import datetime, timedelta
from app.core.config import settings

class JWTSecurityManager:
    def __init__(self):
        self.secret_key = settings.SECRET_KEY.get_secret_value()
        self.algorithm = "HS256"
        self.access_token_expire_minutes = 60
        self.refresh_token_expire_days = 30
        
    def create_access_token(
        self,
        user_id: str,
        email: str,
        role: str = "user",
        additional_claims: Optional[Dict] = None
    ) -> str:
        """Create secure access token with proper claims."""
        now = datetime.utcnow()
        expire = now + timedelta(minutes=self.access_token_expire_minutes)
        
        claims = {
            "sub": user_id,
            "email": email,
            "role": role,
            "type": "access",
            "iat": now,
            "exp": expire,
            "iss": "wheels-wins-api",
            "aud": "wheels-wins-app"
        }
        
        if additional_claims:
            claims.update(additional_claims)
        
        return jwt.encode(claims, self.secret_key, algorithm=self.algorithm)
    
    def verify_token(self, token: str) -> Dict[str, Any]:
        """Verify and decode JWT token with security checks."""
        try:
            payload = jwt.decode(
                token,
                self.secret_key,
                algorithms=[self.algorithm],
                audience="wheels-wins-app",
                issuer="wheels-wins-api",
                options={
                    "verify_signature": True,
                    "verify_exp": True,
                    "verify_iat": True,
                    "verify_aud": True,
                    "verify_iss": True,
                    "require": ["sub", "email", "role", "type", "iat", "exp"]
                }
            )
            
            # Additional security checks
            if payload.get("type") \!= "access":
                raise jwt.InvalidTokenError("Invalid token type")
            
            # Check if token is not too old (even if not expired)
            issued_at = datetime.fromtimestamp(payload["iat"])
            if datetime.utcnow() - issued_at > timedelta(hours=24):
                raise jwt.InvalidTokenError("Token too old, please refresh")
            
            return payload
            
        except jwt.ExpiredSignatureError:
            raise HTTPException(
                status_code=401,
                detail="Token has expired",
                headers={"WWW-Authenticate": "Bearer"}
            )
        except jwt.InvalidTokenError as e:
            raise HTTPException(
                status_code=401,
                detail=f"Invalid token: {str(e)}",
                headers={"WWW-Authenticate": "Bearer"}
            )

    def revoke_token(self, token: str, user_id: str):
        """Add token to revocation list."""
        # Implement token blacklisting in Redis
        # This prevents compromised tokens from being used
        pass
```

### Secure Authentication Endpoints
```python
# app/api/v1/secure_auth.py
from fastapi import APIRouter, Depends, HTTPException, Request, Response
from fastapi.security import HTTPBearer
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
import bcrypt
import secrets
from app.core.security.input_validation import sanitize_input, validate_email
from app.core.security.rate_limiting import create_rate_limiter

router = APIRouter()
limiter = create_rate_limiter()
security = HTTPBearer()

class SecureAuthEndpoints:
    
    @router.post("/login")
    @limiter.limit("5/minute")  # Strict rate limiting for login attempts
    async def secure_login(
        self,
        request: Request,
        credentials: LoginRequest,
        response: Response
    ):
        """Secure login with comprehensive security measures."""
        
        # Input validation and sanitization
        email = validate_email(sanitize_input(credentials.email))
        password = sanitize_input(credentials.password)
        
        # Check for suspicious patterns
        if self._detect_suspicious_login(request, email):
            # Log security incident
            logger.warning(f"Suspicious login attempt from {get_remote_address(request)}")
            # Return generic error to prevent information disclosure
            raise HTTPException(status_code=401, detail="Invalid credentials")
        
        # Verify credentials with timing attack protection
        user = await self._get_user_by_email(email)
        
        # Use constant-time comparison to prevent timing attacks
        if not user or not self._verify_password_secure(password, user.password_hash):
            # Log failed attempt
            await self._log_failed_login(email, get_remote_address(request))
            raise HTTPException(status_code=401, detail="Invalid credentials")
        
        # Check if account is locked
        if await self._is_account_locked(user.id):
            raise HTTPException(status_code=423, detail="Account temporarily locked")
        
        # Generate secure session tokens
        access_token = self.jwt_manager.create_access_token(
            user_id=user.id,
            email=user.email,
            role=user.role
        )
        
        refresh_token = self._generate_refresh_token(user.id)
        
        # Set secure HTTP-only cookies
        response.set_cookie(
            key="refresh_token",
            value=refresh_token,
            httponly=True,
            secure=True,
            samesite="strict",
            max_age=30 * 24 * 60 * 60  # 30 days
        )
        
        # Log successful login
        await self._log_successful_login(user.id, get_remote_address(request))
        
        return {
            "access_token": access_token,
            "token_type": "bearer",
            "expires_in": 3600,
            "user": {
                "id": user.id,
                "email": user.email,
                "role": user.role
            }
        }
    
    def _verify_password_secure(self, password: str, hash: str) -> bool:
        """Secure password verification with timing attack protection."""
        try:
            return bcrypt.checkpw(password.encode('utf-8'), hash.encode('utf-8'))
        except Exception:
            # If verification fails, still take similar time to prevent timing attacks
            bcrypt.checkpw(b"dummy", b"$2b$12$dummy.hash.for.timing.protection")
            return False
    
    def _detect_suspicious_login(self, request: Request, email: str) -> bool:
        """Detect suspicious login patterns."""
        # Check for rapid successive attempts
        # Check for unusual user agents or headers
        # Check for geographical anomalies
        # Check against known bad IP lists
        return False  # Simplified for example
```

## Input Validation & Injection Prevention

### Comprehensive Input Validation
```python
# app/core/security/input_validation.py
import re
import html
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, validator
import bleach

class SecureInputValidator:
    
    @staticmethod
    def sanitize_html(input_text: str) -> str:
        """Sanitize HTML to prevent XSS attacks."""
        allowed_tags = ['p', 'br', 'strong', 'em', 'u']
        allowed_attributes = {}
        
        return bleach.clean(
            input_text,
            tags=allowed_tags,
            attributes=allowed_attributes,
            strip=True
        )
    
    @staticmethod
    def validate_sql_injection(input_text: str) -> str:
        """Check for SQL injection patterns."""
        dangerous_patterns = [
            r"(union|select|insert|update|delete|drop|create|alter|exec|execute)",
            r"(--|#|\/\*|\*\/)",
            r"(char|nchar|varchar|nvarchar)\s*\(",
            r"(sp_|xp_|cmdshell)"
        ]
        
        for pattern in dangerous_patterns:
            if re.search(pattern, input_text, re.IGNORECASE):
                raise ValueError("Invalid input detected")
        
        return input_text
    
    @staticmethod
    def validate_file_upload(file_content: bytes, filename: str) -> bool:
        """Validate uploaded files for security."""
        # Check file size
        max_size = 5 * 1024 * 1024  # 5MB
        if len(file_content) > max_size:
            raise ValueError("File too large")
        
        # Check file type by magic bytes, not just extension
        allowed_types = {
            b'\xff\xd8\xff': 'jpg',
            b'\x89\x50\x4e\x47': 'png',
            b'\x47\x49\x46\x38': 'gif',
            b'\x25\x50\x44\x46': 'pdf'
        }
        
        file_header = file_content[:4]
        is_valid = any(file_header.startswith(magic) for magic in allowed_types.keys())
        
        if not is_valid:
            raise ValueError("File type not allowed")
        
        # Scan for embedded threats (simplified)
        dangerous_patterns = [b'<script', b'javascript:', b'vbscript:']
        content_lower = file_content.lower()
        
        for pattern in dangerous_patterns:
            if pattern in content_lower:
                raise ValueError("Malicious content detected")
        
        return True

# Secure Pydantic models with validation
class SecureExpenseRequest(BaseModel):
    amount: float
    category: str
    description: Optional[str] = None
    date: Optional[str] = None
    
    @validator('amount')
    def validate_amount(cls, v):
        if v <= 0 or v > 1000000:
            raise ValueError('Invalid amount')
        return round(v, 2)
    
    @validator('category')
    def validate_category(cls, v):
        # Whitelist approach for categories
        allowed_categories = [
            'fuel', 'food', 'accommodation', 'entertainment',
            'maintenance', 'supplies', 'emergency', 'other'
        ]
        if v not in allowed_categories:
            raise ValueError('Invalid category')
        return v
    
    @validator('description')
    def validate_description(cls, v):
        if v is None:
            return v
        # Sanitize and validate description
        if len(v) > 500:
            raise ValueError('Description too long')
        return SecureInputValidator.sanitize_html(v)
```

### SQL Injection Prevention
```python
# app/core/security/database_security.py
from typing import Any, List, Tuple
import asyncpg

class SecureDatabaseManager:
    
    async def execute_query_safe(
        self,
        query: str,
        params: Tuple[Any, ...],
        user_id: str
    ) -> List[Dict[str, Any]]:
        """Execute database query with security measures."""
        
        # Validate query doesn't contain dangerous operations
        self._validate_query_security(query)
        
        # Add automatic user context for RLS
        secure_query = self._add_user_context(query, user_id)
        
        try:
            connection = await self.get_connection()
            
            # Use parameterized queries exclusively
            result = await connection.fetch(secure_query, *params)
            
            # Log query for audit trail
            await self._log_database_access(user_id, query, params)
            
            return [dict(row) for row in result]
            
        except Exception as e:
            # Log security incidents
            logger.error(f"Database security error: {str(e)}")
            raise
    
    def _validate_query_security(self, query: str):
        """Validate query for security issues."""
        query_upper = query.upper()
        
        # Prevent dynamic SQL construction
        if any(pattern in query for pattern in ["${", "{", "}"]):
            raise ValueError("Dynamic SQL not allowed")
        
        # Ensure proper parameterization
        if "'" in query and query.count("$") < query.count("'"):
            raise ValueError("Unparameterized query detected")
        
        # Prevent dangerous operations
        dangerous_operations = [
            "DROP", "TRUNCATE", "ALTER", "CREATE", "GRANT", "REVOKE"
        ]
        
        for operation in dangerous_operations:
            if operation in query_upper:
                raise ValueError(f"Operation {operation} not allowed")
```

## Security Headers & CORS Configuration

### Security Headers Implementation
```python
# app/core/security/headers.py
from fastapi import FastAPI, Request, Response
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from starlette.middleware.base import BaseHTTPMiddleware

class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        
        # Security headers
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = (
            "geolocation=(), microphone=(), camera=(), "
            "payment=(), usb=(), magnetometer=(), gyroscope=()"
        )
        
        # HSTS for HTTPS
        if request.url.scheme == "https":
            response.headers["Strict-Transport-Security"] = (
                "max-age=31536000; includeSubDomains; preload"
            )
        
        # Content Security Policy
        csp = (
            "default-src 'self'; "
            "script-src 'self' 'unsafe-inline' https://api.mapbox.com; "
            "style-src 'self' 'unsafe-inline' https://api.mapbox.com; "
            "img-src 'self' data: https: blob:; "
            "connect-src 'self' https://api.mapbox.com wss://; "
            "font-src 'self' data:; "
            "media-src 'self' blob:; "
            "object-src 'none'; "
            "base-uri 'self'; "
            "form-action 'self';"
        )
        response.headers["Content-Security-Policy"] = csp
        
        return response

def configure_security_middleware(app: FastAPI):
    """Configure all security middleware."""
    
    # Trusted hosts
    app.add_middleware(
        TrustedHostMiddleware,
        allowed_hosts=[
            "localhost",
            "127.0.0.1",
            "wheels-wins.netlify.app",
            "wheels-wins-backend.onrender.com"
        ]
    )
    
    # Security headers
    app.add_middleware(SecurityHeadersMiddleware)
```

### CORS Security Configuration
```python
# app/core/security/cors.py
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings

def configure_cors(app: FastAPI):
    """Configure CORS with security considerations."""
    
    # Production CORS settings
    if settings.ENVIRONMENT == "production":
        allowed_origins = [
            "https://wheels-wins.netlify.app",
            "https://www.wheels-wins.com"  # Custom domain
        ]
    else:
        # Development settings
        allowed_origins = [
            "http://localhost:8080",
            "http://127.0.0.1:8080",
            "http://localhost:3000"
        ]
    
    app.add_middleware(
        CORSMiddleware,
        allow_origins=allowed_origins,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        allow_headers=[
            "Authorization",
            "Content-Type",
            "X-Requested-With",
            "Accept",
            "Origin",
            "X-CSRF-Token"
        ],
        expose_headers=["X-Total-Count", "X-Page-Count"],
        max_age=600  # 10 minutes
    )
```

## Rate Limiting & Abuse Prevention

### Advanced Rate Limiting
```python
# app/core/security/rate_limiting.py
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
import redis
from typing import Optional

class AdvancedRateLimit:
    def __init__(self):
        self.redis_client = redis.Redis.from_url(settings.REDIS_URL)
        self.limiter = Limiter(
            key_func=self._get_identifier,
            storage_uri=settings.REDIS_URL
        )
    
    def _get_identifier(self, request: Request) -> str:
        """Get unique identifier for rate limiting."""
        # Use authenticated user ID if available
        if hasattr(request.state, "user") and request.state.user:
            return f"user:{request.state.user.id}"
        
        # Fall back to IP address
        return f"ip:{get_remote_address(request)}"
    
    def create_endpoint_limiter(
        self,
        rate: str,
        per: str = "minute",
        methods: List[str] = None
    ):
        """Create rate limiter for specific endpoint."""
        def decorator(func):
            return self.limiter.limit(f"{rate}/{per}")(func)
        return decorator
    
    async def check_abuse_patterns(self, request: Request) -> bool:
        """Check for abuse patterns beyond simple rate limiting."""
        identifier = self._get_identifier(request)
        
        # Check for rapid-fire requests
        current_minute = int(time.time() // 60)
        minute_key = f"requests:{identifier}:{current_minute}"
        
        request_count = await self.redis_client.incr(minute_key)
        await self.redis_client.expire(minute_key, 60)
        
        # Escalating penalties for repeated violations
        if request_count > 100:  # Suspicious activity
            await self._apply_temporary_ban(identifier, minutes=30)
            return True
        
        return False
    
    async def _apply_temporary_ban(self, identifier: str, minutes: int):
        """Apply temporary ban for abuse."""
        ban_key = f"banned:{identifier}"
        await self.redis_client.setex(ban_key, minutes * 60, "1")
        
        # Log security incident
        logger.warning(f"Applied {minutes}-minute ban to {identifier}")
```

## Security Monitoring & Incident Response

### Security Event Logging
```python
# app/core/security/monitoring.py
from typing import Dict, Any
import json
from datetime import datetime

class SecurityMonitor:
    def __init__(self):
        self.security_logger = logging.getLogger("security")
        
    async def log_security_event(
        self,
        event_type: str,
        severity: str,
        details: Dict[str, Any],
        user_id: Optional[str] = None,
        ip_address: Optional[str] = None
    ):
        """Log security events for monitoring."""
        
        event = {
            "timestamp": datetime.utcnow().isoformat(),
            "event_type": event_type,
            "severity": severity,
            "user_id": user_id,
            "ip_address": ip_address,
            "details": details,
            "service": "wheels-wins-api"
        }
        
        # Log to structured format
        self.security_logger.warning(json.dumps(event))
        
        # Send alerts for high-severity events
        if severity in ["high", "critical"]:
            await self._send_security_alert(event)
    
    async def _send_security_alert(self, event: Dict[str, Any]):
        """Send security alert to monitoring systems."""
        # Integration with monitoring services (Sentry, DataDog, etc.)
        pass
    
    async def generate_security_report(self) -> Dict[str, Any]:
        """Generate daily security report."""
        # Analyze security logs and generate insights
        return {
            "date": datetime.utcnow().date().isoformat(),
            "failed_logins": await self._count_failed_logins(),
            "blocked_requests": await self._count_blocked_requests(),
            "security_alerts": await self._get_security_alerts(),
            "recommendations": await self._generate_security_recommendations()
        }
```

## Tools & Commands
- `python -m app.security.audit` - Run security audit
- `python -m app.security.scan_dependencies` - Check for vulnerabilities
- `pytest tests/security/` - Run security tests
- `npm audit` - Check frontend dependencies
- `bandit -r backend/` - Python security linter

## Priority Tasks
1. Authentication and authorization security hardening
2. Input validation and injection prevention implementation
3. Security headers and CORS configuration
4. Rate limiting and abuse prevention systems
5. Security monitoring and incident response setup
6. Regular vulnerability assessments and penetration testing
7. Security documentation and developer training
8. Compliance validation (OWASP, security standards)
EOF < /dev/null