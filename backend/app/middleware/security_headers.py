"""
Security Headers Middleware
Adds comprehensive security headers to all responses for protection against common attacks.

Headers Added:
- Content-Security-Policy (CSP): Prevents XSS attacks
- X-Content-Type-Options: Prevents MIME-sniffing
- X-Frame-Options: Prevents clickjacking
- X-XSS-Protection: Legacy XSS protection
- Strict-Transport-Security (HSTS): Forces HTTPS
- Referrer-Policy: Controls referrer information
- Permissions-Policy: Controls browser features

Date: January 10, 2025
"""

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response
from typing import Callable
import secrets


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """
    Middleware to add security headers to all responses

    CRITICAL SECURITY FIX (Week 2 Thursday):
    - Removed 'unsafe-inline' from CSP
    - Implemented nonce-based CSP for inline scripts/styles
    - Nonce is generated per-request for maximum security
    """

    def __init__(self, app, environment: str = "production"):
        super().__init__(app)
        self.environment = environment
        # Base CSP directives built at init, nonce added per-request
        self._build_base_directives()

    def _build_base_directives(self) -> None:
        """Build base CSP directives (nonce added per-request)"""

        # Base directives shared across environments
        self.base_csp_directives = [
            "default-src 'self'",
            "font-src 'self' https://fonts.gstatic.com data:",
            "img-src 'self' data: https: blob:",
            "frame-src 'self'",
            "object-src 'none'",
            "base-uri 'self'",
            "form-action 'self'",
            "frame-ancestors 'none'",
        ]

        # Environment-specific directives
        if self.environment == "production":
            self.base_csp_directives.extend([
                "connect-src 'self' https://api.openai.com https://generativelanguage.googleapis.com https://*.supabase.co wss://*.supabase.co https://api.mapbox.com https://api.stripe.com",
                "upgrade-insecure-requests",
                "block-all-mixed-content"
            ])
        else:
            # Development/staging: more permissive connect-src
            self.base_csp_directives.extend([
                "connect-src 'self' https: wss: ws:",
                "report-uri /api/security/csp-report"
            ])

        # Enhanced core security headers (same for all environments, no CSP here)
        self.security_headers = {
            # Prevent MIME-sniffing
            "X-Content-Type-Options": "nosniff",

            # Prevent clickjacking
            "X-Frame-Options": "DENY",

            # Legacy XSS protection (still useful for older browsers)
            "X-XSS-Protection": "1; mode=block",

            # Control referrer information
            "Referrer-Policy": "strict-origin-when-cross-origin",

            # Enhanced browser feature control
            "Permissions-Policy": "geolocation=(self), microphone=(self), camera=(self), payment=(self), usb=(), bluetooth=(), magnetometer=(), gyroscope=(), accelerometer=()",

            # Prevent DNS prefetching leaks
            "X-DNS-Prefetch-Control": "off",

            # Prevent MIME confusion attacks
            "X-Download-Options": "noopen",

            # Cross-origin policies
            "Cross-Origin-Embedder-Policy": "require-corp",
            "Cross-Origin-Opener-Policy": "same-origin",
            "Cross-Origin-Resource-Policy": "same-origin",

            # Cache control for sensitive content
            "Cache-Control": "no-store, no-cache, must-revalidate, private",
            "Pragma": "no-cache",
            "Expires": "0",

            # Server information hiding
            "Server": "PAM-Backend",
        }

        # HSTS (HTTP Strict Transport Security) - only in production
        if self.environment == "production":
            self.security_headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains; preload"
            # Remove cache control in production for static assets
            del self.security_headers["Cache-Control"]
            del self.security_headers["Pragma"]
            del self.security_headers["Expires"]

    def _build_csp_with_nonce(self, nonce: str) -> str:
        """Build CSP header with nonce for this request"""
        csp_directives = self.base_csp_directives.copy()

        # CRITICAL FIX: Use nonce instead of unsafe-inline
        # This prevents XSS attacks while allowing legitimate inline scripts/styles
        csp_directives.extend([
            f"script-src 'self' 'nonce-{nonce}' https://cdn.jsdelivr.net https://unpkg.com 'strict-dynamic'",
            f"style-src 'self' 'nonce-{nonce}' https://fonts.googleapis.com",
            f"worker-src 'self'",
            f"manifest-src 'self'",
            f"media-src 'self' data: blob:",
            f"child-src 'none'",
            f"frame-ancestors 'none'",
            f"sandbox allow-same-origin allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox",
        ])

        return "; ".join(csp_directives)

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        """
        Add security headers to response with per-request CSP nonce

        IMPORTANT: The nonce must be added to inline scripts/styles in HTML:
        <script nonce="{{ csp_nonce }}">...</script>
        <style nonce="{{ csp_nonce }}">...</style>
        """
        # Generate unique nonce for this request
        nonce = secrets.token_urlsafe(16)

        # Store nonce in request state for templates/responses to use
        request.state.csp_nonce = nonce

        # Process the request
        response = await call_next(request)

        # Add static security headers
        for header_name, header_value in self.security_headers.items():
            response.headers[header_name] = header_value

        # Add CSP header with nonce
        response.headers["Content-Security-Policy"] = self._build_csp_with_nonce(nonce)

        return response


def add_security_headers(app, environment: str = "production"):
    """Helper function to add security headers middleware"""
    app.add_middleware(SecurityHeadersMiddleware, environment=environment)
