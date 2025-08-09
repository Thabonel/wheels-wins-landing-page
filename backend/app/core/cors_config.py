"""
Centralized CORS Configuration Module
Provides comprehensive CORS handling for the PAM Backend
"""

import os
from typing import List, Dict, Any
from fastapi import Response
from app.core.config import get_settings
from app.core.logging import get_logger

logger = get_logger(__name__)
settings = get_settings()


class CORSConfig:
    """Centralized CORS configuration management"""
    
    def __init__(self):
        self._origins = []
        self._initialize_origins()
        
    def _initialize_origins(self):
        """Initialize CORS origins based on environment"""
        # Development origins (localhost)
        if self._is_development():
            self._origins.extend([
                "http://localhost:3000",
                "http://localhost:8080", 
                "http://localhost:5173",
                "http://127.0.0.1:3000",
                "http://127.0.0.1:8080",
                "http://127.0.0.1:5173",
            ])
            logger.info("🔧 Development mode: Added localhost origins")
        
        # Production origins - always included
        self._origins.extend([
            "https://wheelsandwins.com",
            "https://www.wheelsandwins.com",
            "https://wheelz-wins.com",
            "https://www.wheelz-wins.com",
            "https://wheels-wins-landing-page.netlify.app",
            "https://wheels-wins-staging.netlify.app",  # Staging frontend
            "https://staging-wheelsandwins.netlify.app",  # Additional staging URL
            "https://65a8f6b6c9f5d2092be8bfc2--wheels-wins-landing-page.netlify.app",
        ])
        
        # Lovable platform origins (for development/testing)
        if self._should_enable_lovable():
            self._origins.extend([
                "https://4fd8d7d4-1c59-4996-a0dd-48be31131e7c.lovable.app",
                "https://id-preview--4fd8d7d4-1c59-4996-a0dd-48be31131e7c.lovable.app",
                "https://4fd8d7d4-1c59-4996-a0dd-48be31131e7c.lovableproject.com",
                "https://preview--4fd8d7d4-1c59-4996-a0dd-48be31131e7c.lovable.app",
                "https://main--4fd8d7d4-1c59-4996-a0dd-48be31131e7c.lovable.app",
            ])
            logger.info("🔧 Added Lovable platform origins")
        
        # Additional origins from environment
        if os.getenv("ADDITIONAL_CORS_ORIGINS"):
            additional = os.getenv("ADDITIONAL_CORS_ORIGINS").split(",")
            self._origins.extend([origin.strip() for origin in additional if origin.strip()])
            logger.info(f"🔧 Added {len(additional)} additional origins from environment")
        
        # Add common development origins that might be missing
        common_dev_origins = [
            "http://localhost:3001",
            "http://localhost:4000",
            "http://localhost:5000",
            "https://localhost:3000",
            "https://localhost:8080",
        ]
        if self._is_development():
            self._origins.extend(common_dev_origins)
        
        # Remove duplicates while preserving order
        self._origins = list(dict.fromkeys(self._origins))
        
        # Security validation
        self._validate_origins()
        
        logger.info(f"🔒 CORS Configuration initialized with {len(self._origins)} origins")
        
    def _is_development(self) -> bool:
        """Check if running in development mode"""
        try:
            env = getattr(settings, 'NODE_ENV', 'production')
            debug = getattr(settings, 'DEBUG', False)
            return env in ["development", "staging"] or debug
        except AttributeError:
            logger.warning("⚠️ Using fallback environment detection")
            return True  # Fallback to development for safety
            
    def _should_enable_lovable(self) -> bool:
        """Check if Lovable origins should be enabled"""
        is_dev = self._is_development()
        explicit_enable = os.getenv("ENABLE_LOVABLE_ORIGINS", "false").lower() == "true"
        production_default = (
            self._get_environment() == "production" and 
            not os.getenv("DISABLE_LOVABLE_ORIGINS")
        )
        return is_dev or explicit_enable or production_default
        
    def _get_environment(self) -> str:
        """Get current environment"""
        try:
            return getattr(settings, 'NODE_ENV', 'production')
        except AttributeError:
            return 'production'
            
    def _validate_origins(self):
        """Validate origins for security"""
        # No wildcards allowed
        if "*" in self._origins:
            logger.error("🚨 SECURITY ALERT: Wildcard CORS origin detected!")
            raise ValueError("Wildcard CORS origins are prohibited")
            
        # In production, ensure HTTPS only (except localhost)
        if self._get_environment() == "production":
            insecure = [
                origin for origin in self._origins 
                if origin.startswith("http://") and 
                "localhost" not in origin and 
                "127.0.0.1" not in origin
            ]
            if insecure:
                logger.error(f"🚨 SECURITY ALERT: HTTP origins in production: {insecure}")
                raise ValueError("HTTP origins not allowed in production")
                
    @property
    def origins(self) -> List[str]:
        """Get list of allowed origins"""
        return self._origins.copy()
        
    @property
    def allowed_methods(self) -> List[str]:
        """Get list of allowed HTTP methods"""
        return ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH", "HEAD"]
        
    @property
    def allowed_headers(self) -> List[str]:
        """Get list of allowed headers"""
        return [
            "Accept",
            "Accept-Language", 
            "Content-Language",
            "Content-Type",
            "Authorization",
            "X-Requested-With",
            "Origin",
            "Access-Control-Request-Method",
            "Access-Control-Request-Headers",
            "Cache-Control",
            "Pragma",
            "X-Supabase-Auth",
            "apikey",
            "X-CSRF-Token",
            "X-Client-Info",
            "X-Request-ID",
            "X-Auth-Type",
        ]
        
    @property
    def expose_headers(self) -> List[str]:
        """Get list of headers to expose to client"""
        return [
            "Content-Range",
            "X-Content-Range",
            "X-Request-ID",
            "X-Response-Time",
        ]
        
    def create_options_response(
        self, 
        origin: str = None,
        requested_method: str = None,
        requested_headers: str = None,
        cache_bust: bool = True
    ) -> Response:
        """
        Create a properly configured OPTIONS response
        
        Args:
            origin: Request origin header value
            requested_method: Access-Control-Request-Method header value
            requested_headers: Access-Control-Request-Headers header value
            cache_bust: Whether to add cache-busting headers
        """
        # Always return 200 for OPTIONS requests
        response = Response(
            content='',  # Empty content for OPTIONS
            status_code=200
        )
        
        # Add CORS headers
        if origin and self.is_origin_allowed(origin):
            response.headers["Access-Control-Allow-Origin"] = origin
            logger.debug(f"✅ CORS: Allowing origin {origin}")
        elif origin:
            # For debugging - still allow but log
            logger.warning(f"⚠️ CORS: Origin {origin} not in allowed list, but responding anyway")
            response.headers["Access-Control-Allow-Origin"] = origin
        else:
            # Fallback for requests without origin header
            response.headers["Access-Control-Allow-Origin"] = "*"
            
        # Method validation
        if requested_method and requested_method not in self.allowed_methods:
            logger.warning(f"⚠️ CORS: Method {requested_method} not allowed")
            # Still include it to avoid errors
            methods = self.allowed_methods + [requested_method]
        else:
            methods = self.allowed_methods
            
        response.headers["Access-Control-Allow-Methods"] = ", ".join(methods)
        
        # Headers validation
        if requested_headers:
            requested_header_list = [h.strip() for h in requested_headers.split(",")]
            all_headers = list(set(self.allowed_headers + requested_header_list))
        else:
            all_headers = self.allowed_headers
            
        response.headers["Access-Control-Allow-Headers"] = ", ".join(all_headers)
        response.headers["Access-Control-Allow-Credentials"] = "true"
        response.headers["Access-Control-Max-Age"] = "3600"  # 1 hour (reduced for debugging)
        
        # Expose headers
        if self.expose_headers:
            response.headers["Access-Control-Expose-Headers"] = ", ".join(self.expose_headers)
        
        # Add cache-busting headers if requested
        if cache_bust:
            response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
            response.headers["Pragma"] = "no-cache"
            response.headers["Expires"] = "0"
        
        # Add Vary header for proper caching
        response.headers["Vary"] = "Origin, Access-Control-Request-Method, Access-Control-Request-Headers"
            
        return response
        
    def is_origin_allowed(self, origin: str) -> bool:
        """Check if an origin is allowed"""
        return origin in self._origins
        
    def get_cors_config_dict(self) -> Dict[str, Any]:
        """Get CORS configuration as dictionary for FastAPI CORSMiddleware"""
        return {
            "allow_origins": self._origins,
            "allow_credentials": True,
            "allow_methods": self.allowed_methods,
            "allow_headers": self.allowed_headers,
            "expose_headers": self.expose_headers,
            "max_age": 86400,  # 24 hours
        }
        
    def log_cors_debug(self, request_origin: str, endpoint: str, allowed: bool):
        """Log CORS debugging information"""
        if allowed:
            logger.debug(f"✅ CORS: Origin {request_origin} allowed for {endpoint}")
        else:
            logger.warning(
                f"❌ CORS: Origin {request_origin} blocked for {endpoint}. "
                f"Allowed origins: {', '.join(self._origins[:3])}..."
            )
    
    def handle_preflight_request(self, request) -> Response:
        """Handle CORS preflight requests with full debugging."""
        origin = request.headers.get("origin")
        method = request.headers.get("access-control-request-method")
        headers = request.headers.get("access-control-request-headers")
        
        logger.info(
            f"📫 CORS Preflight: origin={origin}, method={method}, "
            f"headers={headers}, endpoint={request.url.path}"
        )
        
        # Check if origin is allowed
        origin_allowed = not origin or self.is_origin_allowed(origin)
        if not origin_allowed:
            logger.warning(f"⚠️ CORS: Preflight failed - origin {origin} not allowed")
        
        # Create response
        response = self.create_options_response(
            origin=origin,
            requested_method=method,
            requested_headers=headers
        )
        
        logger.debug(f"✅ CORS: Preflight response created with headers: {dict(response.headers)}")
        return response


# Global CORS configuration instance
cors_config = CORSConfig()