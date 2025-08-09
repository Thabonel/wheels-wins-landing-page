"""
XSS and CSRF Protection Middleware
Comprehensive protection against Cross-Site Scripting and Cross-Site Request Forgery attacks.
"""

import re
import json
import hmac
import hashlib
import secrets
import time
import html
from typing import Dict, List, Optional, Set, Any
from datetime import datetime, timedelta
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response, JSONResponse
from app.core.logging import get_logger

try:
    import bleach
    BLEACH_AVAILABLE = True
except ImportError:
    BLEACH_AVAILABLE = False

logger = get_logger(__name__)


class XSSProtector:
    """Advanced XSS protection with content sanitization"""
    
    def __init__(self):
        # Allowed HTML tags and attributes for rich content
        self.allowed_tags = {
            'p', 'br', 'strong', 'em', 'u', 'ol', 'ul', 'li', 'blockquote',
            'a', 'span', 'div', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'
        }
        
        self.allowed_attributes = {
            'a': ['href', 'title'],
            'span': ['class'],
            'div': ['class'],
            '*': ['class']
        }
        
        # XSS attack patterns
        self.xss_patterns = [
            # Script injection
            r'<\s*script[^>]*>.*?</\s*script\s*>',
            r'<\s*script[^>]*>',
            
            # JavaScript protocols
            r'javascript\s*:',
            r'vbscript\s*:',
            r'data\s*:.*?base64',
            
            # Event handlers
            r'\bon\w+\s*=',  # onclick, onload, onerror, etc.
            
            # CSS expressions
            r'expression\s*\(',
            r'behaviour\s*:',
            r'@import',
            
            # Meta and link injections
            r'<\s*meta[^>]*>',
            r'<\s*link[^>]*>',
            
            # Form injections
            r'<\s*form[^>]*>',
            r'<\s*input[^>]*>',
            r'<\s*textarea[^>]*>',
            r'<\s*select[^>]*>',
            
            # Frame injections
            r'<\s*iframe[^>]*>',
            r'<\s*frame[^>]*>',
            r'<\s*frameset[^>]*>',
            
            # Object and embed
            r'<\s*object[^>]*>',
            r'<\s*embed[^>]*>',
            r'<\s*applet[^>]*>',
            
            # SVG attacks
            r'<\s*svg[^>]*>',
            
            # Style injections
            r'<\s*style[^>]*>.*?</\s*style\s*>',
            
            # XML/HTML entity attacks
            r'&\#x[0-9a-f]+;',
            r'&\#[0-9]+;',
            
            # JavaScript function calls
            r'eval\s*\(',
            r'setTimeout\s*\(',
            r'setInterval\s*\(',
            r'Function\s*\(',
            
            # Document object access
            r'document\.',
            r'window\.',
            
            # URL-based attacks
            r'url\s*\(',
            
            # CDATA sections
            r'<!\[CDATA\[.*?\]\]>',
        ]
        
        # Compile patterns for performance
        self.compiled_patterns = [
            re.compile(pattern, re.IGNORECASE | re.DOTALL) 
            for pattern in self.xss_patterns
        ]
        
        # Dangerous characters in different contexts
        self.html_dangerous_chars = ['<', '>', '"', "'", '&']
        self.js_dangerous_chars = ['"', "'", '\\', '\n', '\r', '\t']
        self.css_dangerous_chars = ['(', ')', '{', '}', ';', ':', '"', "'"]
    
    def detect_xss(self, content: str, context: str = "html") -> Optional[Dict[str, Any]]:
        """Detect XSS attempts in content"""
        if not content:
            return None
        
        # Check against known XSS patterns
        for i, pattern in enumerate(self.compiled_patterns):
            match = pattern.search(content)
            if match:
                return {
                    "attack_type": "xss",
                    "pattern_index": i,
                    "pattern": self.xss_patterns[i],
                    "matched_content": match.group(0)[:100],
                    "context": context,
                    "severity": self._get_pattern_severity(i)
                }
        
        # Context-specific checks
        if context == "html":
            return self._check_html_context(content)
        elif context == "javascript":
            return self._check_js_context(content)
        elif context == "css":
            return self._check_css_context(content)
        
        return None
    
    def sanitize_content(self, content: str, context: str = "html", allow_html: bool = False) -> str:
        """Sanitize content to prevent XSS"""
        if not content:
            return content
        
        if allow_html and BLEACH_AVAILABLE:
            # Use bleach for safe HTML sanitization
            return bleach.clean(
                content,
                tags=self.allowed_tags,
                attributes=self.allowed_attributes,
                strip=True
            )
        elif context == "html":
            # HTML escape
            return html.escape(content, quote=True)
        elif context == "javascript":
            # JavaScript context sanitization
            return self._sanitize_js_context(content)
        elif context == "css":
            # CSS context sanitization
            return self._sanitize_css_context(content)
        else:
            # Default: HTML escape
            return html.escape(content, quote=True)
    
    def _get_pattern_severity(self, pattern_index: int) -> str:
        """Get severity level for XSS pattern"""
        critical_patterns = [0, 1, 2, 3, 4, 9, 10, 20, 21]  # Script, JS protocols, eval, etc.
        high_patterns = [5, 6, 7, 8, 11, 12, 13, 14, 15, 16, 17, 18]  # Event handlers, forms, etc.
        
        if pattern_index in critical_patterns:
            return "critical"
        elif pattern_index in high_patterns:
            return "high"
        else:
            return "medium"
    
    def _check_html_context(self, content: str) -> Optional[Dict[str, Any]]:
        """Check for HTML context-specific XSS"""
        # Look for unescaped dangerous characters
        dangerous_count = sum(1 for char in self.html_dangerous_chars if char in content)
        
        if dangerous_count > 5:  # Threshold for suspicion
            return {
                "attack_type": "html_injection",
                "dangerous_chars": dangerous_count,
                "context": "html",
                "severity": "medium"
            }
        
        return None
    
    def _check_js_context(self, content: str) -> Optional[Dict[str, Any]]:
        """Check for JavaScript context-specific XSS"""
        # Look for JavaScript injection attempts
        js_patterns = [
            r'\\u[0-9a-f]{4}',  # Unicode escapes
            r'\\x[0-9a-f]{2}',  # Hex escapes
            r'String\.fromCharCode',  # Character code injection
            r'\+\s*["\']',  # String concatenation
        ]
        
        for pattern in js_patterns:
            if re.search(pattern, content, re.IGNORECASE):
                return {
                    "attack_type": "js_injection",
                    "pattern": pattern,
                    "context": "javascript",
                    "severity": "high"
                }
        
        return None
    
    def _check_css_context(self, content: str) -> Optional[Dict[str, Any]]:
        """Check for CSS context-specific XSS"""
        css_attack_patterns = [
            r'expression\s*\(',
            r'javascript\s*:',
            r'@import\s+url',
            r'behavior\s*:',
        ]
        
        for pattern in css_attack_patterns:
            if re.search(pattern, content, re.IGNORECASE):
                return {
                    "attack_type": "css_injection",
                    "pattern": pattern,
                    "context": "css",
                    "severity": "high"
                }
        
        return None
    
    def _sanitize_js_context(self, content: str) -> str:
        """Sanitize content for JavaScript context"""
        # Escape dangerous JavaScript characters
        content = content.replace('\\', '\\\\')
        content = content.replace('"', '\\"')
        content = content.replace("'", "\\'")
        content = content.replace('\n', '\\n')
        content = content.replace('\r', '\\r')
        content = content.replace('\t', '\\t')
        content = content.replace('<', '\\u003c')
        content = content.replace('>', '\\u003e')
        
        return content
    
    def _sanitize_css_context(self, content: str) -> str:
        """Sanitize content for CSS context"""
        # Remove dangerous CSS characters and patterns
        content = re.sub(r'[(){};"\'\\]', '', content)
        content = re.sub(r'@\w+', '', content)  # Remove @ rules
        content = re.sub(r'url\s*\([^)]*\)', '', content)  # Remove url() functions
        
        return content


class CSRFProtector:
    """CSRF protection with token-based validation"""
    
    def __init__(self, secret_key: str):
        self.secret_key = secret_key
        self.token_lifetime = 3600  # 1 hour
        self.token_storage: Dict[str, Dict[str, Any]] = {}
        
        # Safe HTTP methods that don't require CSRF protection
        self.safe_methods = {"GET", "HEAD", "OPTIONS", "TRACE"}
        
        # Origins that are always allowed (same-origin + development platforms)
        self.allowed_origins: Set[str] = {
            "https://wheelsandwins.com",
            "https://www.wheelsandwins.com", 
            "https://wheels-wins-landing-page.netlify.app",
            "https://4fd8d7d4-1c59-4996-a0dd-48be31131e7c.lovableproject.com",  # Lovable platform
            "http://localhost:8080",  # Local development
            "http://localhost:3000",  # Alternative local dev
        }
    
    def generate_csrf_token(self, session_id: str) -> str:
        """Generate CSRF token for session"""
        timestamp = str(int(time.time()))
        token_data = f"{session_id}:{timestamp}"
        
        # Create HMAC signature
        signature = hmac.new(
            self.secret_key.encode(),
            token_data.encode(),
            hashlib.sha256
        ).hexdigest()
        
        token = f"{timestamp}.{signature}"
        
        # Store token metadata
        self.token_storage[token] = {
            "session_id": session_id,
            "created_at": datetime.now(),
            "used": False
        }
        
        return token
    
    def validate_csrf_token(self, token: str, session_id: str) -> bool:
        """Validate CSRF token"""
        if not token:
            return False
        
        try:
            timestamp_str, signature = token.split('.', 1)
            timestamp = int(timestamp_str)
            
            # Check token age
            current_time = int(time.time())
            if current_time - timestamp > self.token_lifetime:
                logger.debug(f"CSRF token expired: {token}")
                return False
            
            # Verify signature
            token_data = f"{session_id}:{timestamp_str}"
            expected_signature = hmac.new(
                self.secret_key.encode(),
                token_data.encode(),
                hashlib.sha256
            ).hexdigest()
            
            if not hmac.compare_digest(signature, expected_signature):
                logger.warning(f"CSRF token signature mismatch: {token}")
                return False
            
            # Check if token exists in storage
            if token not in self.token_storage:
                logger.warning(f"CSRF token not found in storage: {token}")
                return False
            
            token_info = self.token_storage[token]
            
            # Verify session ID
            if token_info["session_id"] != session_id:
                logger.warning(f"CSRF token session ID mismatch: {token}")
                return False
            
            # Mark token as used (optional: implement one-time use)
            token_info["used"] = True
            
            return True
        
        except (ValueError, KeyError) as e:
            logger.warning(f"CSRF token validation error: {e}")
            return False
    
    def check_origin(self, request: Request) -> bool:
        """Check if request origin is allowed"""
        origin = request.headers.get("origin")
        referer = request.headers.get("referer")
        
        # Get request host
        host = request.headers.get("host")
        if not host:
            return False
        
        # Build allowed origins
        allowed_origins = {
            f"https://{host}",
            f"http://{host}",  # Allow HTTP for development
        }
        allowed_origins.update(self.allowed_origins)
        
        # Check Origin header
        if origin:
            return origin in allowed_origins
        
        # Check Referer header as fallback
        if referer:
            for allowed_origin in allowed_origins:
                if referer.startswith(allowed_origin):
                    return True
        
        # No valid origin found
        return False
    
    def cleanup_expired_tokens(self):
        """Clean up expired tokens from storage"""
        current_time = datetime.now()
        expired_tokens = []
        
        for token, token_info in self.token_storage.items():
            token_age = (current_time - token_info["created_at"]).total_seconds()
            if token_age > self.token_lifetime:
                expired_tokens.append(token)
        
        for token in expired_tokens:
            del self.token_storage[token]
        
        if expired_tokens:
            logger.debug(f"Cleaned up {len(expired_tokens)} expired CSRF tokens")


class XSSCSRFProtectionMiddleware(BaseHTTPMiddleware):
    """Combined XSS and CSRF protection middleware"""
    
    def __init__(
        self,
        app,
        secret_key: str,
        enable_xss_protection: bool = True,
        enable_csrf_protection: bool = True,
        auto_sanitize: bool = False
    ):
        super().__init__(app)
        self.xss_protector = XSSProtector()
        self.csrf_protector = CSRFProtector(secret_key)
        self.enable_xss_protection = enable_xss_protection
        self.enable_csrf_protection = enable_csrf_protection
        self.auto_sanitize = auto_sanitize
        
        # Paths exempt from protection
        self.exempt_paths = [
            "/health",
            "/docs",
            "/openapi.json",
            "/favicon.ico",
            "/metrics",
            "/api/auth/csrf-token",  # Endpoint to get CSRF tokens
            "/api/v1/pam",  # PAM base endpoint
            "/api/v1/pam/voice",  # PAM voice endpoint
            "/api/v1/pam/chat",  # PAM chat endpoint
            "/api/v1/pam/ws",  # PAM WebSocket endpoint
            "/api/v1/pam_ai_sdk",  # PAM AI SDK endpoint
            "/api/v1/pam/health"  # PAM health check endpoint
        ]
        
        # Content types to check for XSS
        self.xss_content_types = [
            "application/json",
            "application/x-www-form-urlencoded",
            "text/plain",
            "text/html"
        ]
    
    async def dispatch(self, request: Request, call_next) -> Response:
        # Skip protection for exempt paths
        if any(request.url.path.startswith(path) for path in self.exempt_paths):
            return await call_next(request)
        
        # XSS Protection
        if self.enable_xss_protection:
            xss_result = await self._check_xss(request)
            if xss_result:
                logger.warning(
                    f"XSS attack detected from {request.client.host} "
                    f"on {request.url.path}: {xss_result['attack_type']}"
                )
                
                return JSONResponse(
                    status_code=400,
                    content={
                        "error": "Security Violation",
                        "message": "Request blocked due to potential XSS attack",
                        "attack_type": xss_result["attack_type"],
                        "request_id": getattr(request.state, 'request_id', 'unknown')
                    }
                )
        
        # CSRF Protection
        if self.enable_csrf_protection and request.method not in self.csrf_protector.safe_methods:
            csrf_result = await self._check_csrf(request)
            if not csrf_result:
                logger.warning(
                    f"CSRF protection triggered for {request.client.host} "
                    f"on {request.method} {request.url.path}"
                )
                
                return JSONResponse(
                    status_code=403,
                    content={
                        "error": "CSRF Protection",
                        "message": "Request blocked due to CSRF protection",
                        "details": "Missing or invalid CSRF token",
                        "request_id": getattr(request.state, 'request_id', 'unknown')
                    }
                )
        
        # Process request
        response = await call_next(request)
        
        # Add security headers
        self._add_security_headers(response)
        
        return response
    
    async def _check_xss(self, request: Request) -> Optional[Dict[str, Any]]:
        """Check request for XSS attacks"""
        
        # Check URL parameters
        for key, value in request.query_params.items():
            xss_detection = self.xss_protector.detect_xss(value, "html")
            if xss_detection:
                xss_detection["location"] = f"query_param:{key}"
                return xss_detection
        
        # Check headers (except authorization)
        for header, value in request.headers.items():
            if header.lower() not in ['authorization', 'cookie', 'x-csrf-token']:
                xss_detection = self.xss_protector.detect_xss(value, "html")
                if xss_detection:
                    xss_detection["location"] = f"header:{header}"
                    return xss_detection
        
        # Check request body for POST/PUT/PATCH
        if request.method in ["POST", "PUT", "PATCH"]:
            try:
                body = await request.body()
                if body:
                    content_type = request.headers.get("content-type", "").split(';')[0]
                    
                    if content_type in self.xss_content_types:
                        body_str = body.decode('utf-8', errors='ignore')
                        
                        if content_type == "application/json":
                            try:
                                # Parse JSON and check each field
                                json_data = json.loads(body_str)
                                xss_result = self._check_json_for_xss(json_data)
                                if xss_result:
                                    xss_result["location"] = "json_body"
                                    return xss_result
                            except json.JSONDecodeError:
                                pass  # Not valid JSON, check as plain text
                        
                        # Check body as plain text
                        xss_detection = self.xss_protector.detect_xss(body_str, "html")
                        if xss_detection:
                            xss_detection["location"] = "request_body"
                            return xss_detection
            
            except Exception as e:
                logger.error(f"Error checking request body for XSS: {e}")
        
        return None
    
    def _check_json_for_xss(self, data: Any, path: str = "") -> Optional[Dict[str, Any]]:
        """Recursively check JSON data for XSS"""
        if isinstance(data, dict):
            for key, value in data.items():
                current_path = f"{path}.{key}" if path else key
                result = self._check_json_for_xss(value, current_path)
                if result:
                    result["json_path"] = current_path
                    return result
        
        elif isinstance(data, list):
            for i, item in enumerate(data):
                current_path = f"{path}[{i}]" if path else f"[{i}]"
                result = self._check_json_for_xss(item, current_path)
                if result:
                    result["json_path"] = current_path
                    return result
        
        elif isinstance(data, str):
            xss_detection = self.xss_protector.detect_xss(data, "html")
            if xss_detection:
                return xss_detection
        
        return None
    
    async def _check_csrf(self, request: Request) -> bool:
        """Check CSRF protection"""
        
        # Check origin first
        if not self.csrf_protector.check_origin(request):
            logger.debug("CSRF check failed: invalid origin")
            return False
        
        # Get CSRF token from header or form data
        csrf_token = request.headers.get("x-csrf-token")
        
        if not csrf_token and request.method == "POST":
            # Try to get from form data
            try:
                body = await request.body()
                if body:
                    content_type = request.headers.get("content-type", "")
                    if "application/x-www-form-urlencoded" in content_type:
                        # Parse form data
                        form_data = dict(request.query_params)  # This is a simplification
                        csrf_token = form_data.get("csrf_token")
                    elif "application/json" in content_type:
                        # Parse JSON data
                        json_data = json.loads(body.decode('utf-8'))
                        csrf_token = json_data.get("csrf_token")
            except Exception as e:
                logger.debug(f"Error parsing CSRF token from body: {e}")
        
        if not csrf_token:
            logger.debug("CSRF check failed: no token provided")
            return False
        
        # Get session ID (you might need to implement session management)
        session_id = request.headers.get("x-session-id", "default-session")
        
        # Validate token
        return self.csrf_protector.validate_csrf_token(csrf_token, session_id)
    
    def _add_security_headers(self, response: Response):
        """Add security headers to response"""
        
        # XSS Protection header
        response.headers["X-XSS-Protection"] = "1; mode=block"
        
        # Content Type Options
        response.headers["X-Content-Type-Options"] = "nosniff"
        
        # Frame Options
        response.headers["X-Frame-Options"] = "DENY"
        
        # Content Security Policy
        csp = (
            "default-src 'self'; "
            "script-src 'self' 'unsafe-inline' 'unsafe-eval'; "
            "style-src 'self' 'unsafe-inline'; "
            "img-src 'self' data: https:; "
            "connect-src 'self' wss: https:; "
            "font-src 'self' data:; "
            "object-src 'none'; "
            "media-src 'self'; "
            "frame-src 'none';"
        )
        response.headers["Content-Security-Policy"] = csp


def setup_xss_csrf_protection(
    app,
    secret_key: str,
    enable_xss_protection: bool = True,
    enable_csrf_protection: bool = True,
    auto_sanitize: bool = False
):
    """Setup XSS and CSRF protection middleware"""
    app.add_middleware(
        XSSCSRFProtectionMiddleware,
        secret_key=secret_key,
        enable_xss_protection=enable_xss_protection,
        enable_csrf_protection=enable_csrf_protection,
        auto_sanitize=auto_sanitize
    )
    logger.info("XSS and CSRF protection middleware configured")