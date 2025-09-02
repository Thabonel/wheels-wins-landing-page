
"""
Security Middleware
Implements security headers, rate limiting, and request validation.
"""

import json
from typing import Callable
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response, JSONResponse
from app.core.security import SECURITY_HEADERS, rate_limiter, request_signer
from app.core.logging import setup_logging, get_logger

setup_logging()
logger = get_logger(__name__)

class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """Add security headers to all responses"""
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        response = await call_next(request)
        
        # Add security headers
        for header, value in SECURITY_HEADERS.items():
            response.headers[header] = value
        
        # Add custom security headers
        response.headers["X-Request-ID"] = getattr(request.state, 'request_id', 'unknown')
        response.headers["X-API-Version"] = "2.0.0"
        
        return response

class RateLimitMiddleware(BaseHTTPMiddleware):
    """Rate limiting middleware"""
    
    def __init__(self, app, default_limit: int = 100, window: int = 60):
        super().__init__(app)
        self.default_limit = default_limit
        self.window = window
        
        # Different limits for different endpoint types
        self.endpoint_limits = {
            "/api/auth/": {"limit": 10, "window": 60},  # Stricter for auth endpoints
            "/api/chat": {"limit": 50, "window": 60},   # Moderate for chat
            "/api/": {"limit": 100, "window": 60},      # Default for API
        }
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        # Get client identifier
        client_ip = request.client.host if request.client else "unknown"
        user_agent = request.headers.get("user-agent", "unknown")
        client_key = f"{client_ip}:{user_agent[:50]}"  # Limit user-agent length
        
        # Determine rate limit for endpoint
        limit_config = self._get_limit_config(request.url.path)
        
        # Check rate limit
        if not rate_limiter.is_allowed(
            client_key, 
            limit_config["limit"], 
            limit_config["window"]
        ):
            logger.warning(f"Rate limit exceeded for {client_ip} on {request.url.path}")
            return JSONResponse(
                status_code=429,
                content={
                    "error": "Rate limit exceeded",
                    "message": f"Too many requests. Limit: {limit_config['limit']}/{limit_config['window']}s"
                },
                headers={"Retry-After": str(limit_config["window"])}
            )
        
        return await call_next(request)
    
    def _get_limit_config(self, path: str) -> dict:
        """Get rate limit configuration for path"""
        for pattern, config in self.endpoint_limits.items():
            if path.startswith(pattern):
                return config
        
        return {"limit": self.default_limit, "window": self.window}

class RequestValidationMiddleware(BaseHTTPMiddleware):
    """Validate requests for security issues"""
    
    def __init__(self, app):
        super().__init__(app)
        self.suspicious_patterns = [
            "script>", "<iframe", "javascript:", "vbscript:",
            "onload=", "onerror=", "eval(", "expression(",
            "union select", "drop table", "delete from",
            "../", "..\\", "/etc/passwd", "cmd.exe"
        ]
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        # Skip security checks for OPTIONS requests (CORS preflight)
        if request.method == "OPTIONS":
            return await call_next(request)
            
        # Check for suspicious patterns in URL
        if self._contains_suspicious_content(str(request.url)):
            logger.warning(f"Suspicious URL detected: {request.url}")
            return JSONResponse(
                status_code=400,
                content={"error": "Invalid request"}
            )
        
        # Check request headers
        for header, value in request.headers.items():
            if self._contains_suspicious_content(value):
                logger.warning(f"Suspicious header detected: {header}={value}")
                return JSONResponse(
                    status_code=400,
                    content={"error": "Invalid request headers"}
                )
        
        # For POST/PUT requests, check body
        if request.method in ["POST", "PUT", "PATCH"]:
            try:
                body = await request.body()
                if body and self._contains_suspicious_content(body.decode('utf-8', errors='ignore')):
                    logger.warning(f"Suspicious request body detected from {request.client.host}")
                    return JSONResponse(
                        status_code=400,
                        content={"error": "Invalid request body"}
                    )
            except Exception as e:
                logger.warning(f"Error reading request body: {e}")
        
        return await call_next(request)
    
    def _contains_suspicious_content(self, content: str) -> bool:
        """Check if content contains suspicious patterns"""
        content_lower = content.lower()
        return any(pattern in content_lower for pattern in self.suspicious_patterns)

class InternalServiceAuthMiddleware(BaseHTTPMiddleware):
    """Authenticate internal service requests"""
    
    def __init__(self, app):
        super().__init__(app)
        self.internal_paths = [
            "/internal/",
            "/admin/api/",
            "/system/"
        ]
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        # Check if this is an internal service request
        if any(request.url.path.startswith(path) for path in self.internal_paths):
            # Verify request signature
            signature = request.headers.get("X-Request-Signature")
            if not signature:
                return JSONResponse(
                    status_code=401,
                    content={"error": "Missing request signature"}
                )
            
            # Get request body for signature verification
            body = await request.body()
            body_str = body.decode('utf-8') if body else ""
            
            # Verify signature
            if not request_signer.verify_signature(
                request.method,
                request.url.path,
                body_str,
                signature
            ):
                logger.warning(f"Invalid signature for internal request: {request.url.path}")
                return JSONResponse(
                    status_code=401,
                    content={"error": "Invalid request signature"}
                )
        
        return await call_next(request)

def setup_security_middleware(app):
    """Setup all security middleware"""
    # Add security middleware (order matters - outermost first)
    app.add_middleware(SecurityHeadersMiddleware)
    app.add_middleware(RateLimitMiddleware, default_limit=100, window=60)
    app.add_middleware(RequestValidationMiddleware)
    app.add_middleware(InternalServiceAuthMiddleware)
    
    logger.info("Security middleware configured")
