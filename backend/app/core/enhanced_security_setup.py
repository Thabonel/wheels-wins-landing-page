"""
Enhanced Security Setup
Central configuration and setup for all security middleware components.
"""

import os
from typing import Optional
from fastapi import FastAPI
from app.core.logging import get_logger
from app.core.config import get_settings

# Import all security middleware
from app.core.waf_middleware import setup_waf_middleware
from app.core.enhanced_rate_limiter import setup_enhanced_rate_limiting
from app.core.input_validation_middleware import setup_input_validation_middleware
from app.core.xss_csrf_protection import setup_xss_csrf_protection
from app.core.security_monitoring import setup_security_monitoring

logger = get_logger(__name__)
settings = get_settings()


class SecurityConfiguration:
    """Security configuration management"""
    
    def __init__(self):
        self.redis_url = os.getenv("REDIS_URL", "redis://localhost:6379")
        self.secret_key = settings.SECRET_KEY.get_secret_value()
        self.environment = getattr(settings, 'ENVIRONMENT', 'production')
        
        # Security feature flags
        self.enable_waf = os.getenv("ENABLE_WAF", "true").lower() == "true"
        self.enable_enhanced_rate_limiting = os.getenv("ENABLE_ENHANCED_RATE_LIMITING", "true").lower() == "true"
        self.enable_input_validation = os.getenv("ENABLE_INPUT_VALIDATION", "true").lower() == "true"
        self.enable_xss_protection = os.getenv("ENABLE_XSS_PROTECTION", "true").lower() == "true"
        self.enable_csrf_protection = os.getenv("ENABLE_CSRF_PROTECTION", "true").lower() == "true"
        self.enable_security_monitoring = os.getenv("ENABLE_SECURITY_MONITORING", "true").lower() == "true"
        
        # Security settings
        self.waf_blocking_enabled = os.getenv("WAF_BLOCKING_ENABLED", "true").lower() == "true"
        self.rate_limit_blocking_enabled = os.getenv("RATE_LIMIT_BLOCKING_ENABLED", "true").lower() == "true"
        self.max_request_size = int(os.getenv("MAX_REQUEST_SIZE", str(10 * 1024 * 1024)))  # 10MB
        
        # Development mode overrides
        if self.environment == "development":
            logger.warning("🔧 Development mode: Some security features may be relaxed")
            # Keep protections enabled but log more verbosively
            
        logger.info(f"🔒 Security configuration initialized for {self.environment} environment")
    
    def is_feature_enabled(self, feature: str) -> bool:
        """Check if a security feature is enabled"""
        return getattr(self, f"enable_{feature}", False)
    
    def get_redis_url(self) -> str:
        """Get Redis URL with fallback"""
        return self.redis_url
    
    def get_security_headers(self) -> dict:
        """Get comprehensive security headers"""
        headers = {
            # XSS Protection
            "X-XSS-Protection": "1; mode=block",
            
            # Content Type Options
            "X-Content-Type-Options": "nosniff",
            
            # Frame Options
            "X-Frame-Options": "DENY",
            
            # Referrer Policy
            "Referrer-Policy": "strict-origin-when-cross-origin",
            
            # Strict Transport Security (HTTPS only)
            "Strict-Transport-Security": "max-age=31536000; includeSubDomains; preload",
            
            # Content Security Policy
            "Content-Security-Policy": self._get_csp_header(),
            
            # Permissions Policy
            "Permissions-Policy": self._get_permissions_policy(),
            
            # Custom security headers
            "X-Security-Enhanced": "true",
            "X-Security-Version": "2.0.0",
        }
        
        # Add development-specific headers
        if self.environment == "development":
            headers["X-Development-Mode"] = "true"
        
        return headers
    
    def _get_csp_header(self) -> str:
        """Generate Content Security Policy header"""
        if self.environment == "development":
            # More permissive CSP for development
            return (
                "default-src 'self'; "
                "script-src 'self' 'unsafe-inline' 'unsafe-eval' localhost:* 127.0.0.1:*; "
                "style-src 'self' 'unsafe-inline' fonts.googleapis.com; "
                "img-src 'self' data: https: localhost:* 127.0.0.1:*; "
                "connect-src 'self' wss: https: localhost:* 127.0.0.1:* ws://localhost:*; "
                "font-src 'self' data: fonts.gstatic.com; "
                "object-src 'none'; "
                "media-src 'self'; "
                "frame-src 'none';"
            )
        else:
            # Strict CSP for production
            return (
                "default-src 'self'; "
                "script-src 'self' 'unsafe-inline'; "
                "style-src 'self' 'unsafe-inline' fonts.googleapis.com; "
                "img-src 'self' data: https:; "
                "connect-src 'self' wss: https:; "
                "font-src 'self' data: fonts.gstatic.com; "
                "object-src 'none'; "
                "media-src 'self'; "
                "frame-src 'none';"
            )
    
    def _get_permissions_policy(self) -> str:
        """Generate Permissions Policy header"""
        return (
            "geolocation=(), "
            "microphone=(), "
            "camera=(), "
            "payment=(), "
            "usb=(), "
            "magnetometer=(), "
            "gyroscope=(), "
            "accelerometer=()"
        )


def setup_enhanced_security(app: FastAPI, config: Optional[SecurityConfiguration] = None) -> SecurityConfiguration:
    """
    Setup all enhanced security middleware components.
    
    Args:
        app: FastAPI application instance
        config: Optional security configuration (will create default if not provided)
    
    Returns:
        SecurityConfiguration instance used
    """
    if config is None:
        config = SecurityConfiguration()
    
    logger.info("🛡️ Setting up enhanced security middleware...")
    
    # 1. Security Monitoring (should be first to catch all events)
    if config.enable_security_monitoring:
        setup_security_monitoring(app, config.get_redis_url())
        logger.info("✅ Security monitoring enabled")
    
    # 2. Web Application Firewall (comprehensive attack prevention)
    if config.enable_waf:
        setup_waf_middleware(app, enable_blocking=config.waf_blocking_enabled)
        logger.info("✅ Web Application Firewall enabled")
    
    # 3. Enhanced Rate Limiting (DDoS protection)
    if config.enable_enhanced_rate_limiting:
        setup_enhanced_rate_limiting(
            app, 
            config.get_redis_url(),
            enable_blocking=config.rate_limit_blocking_enabled
        )
        logger.info("✅ Enhanced rate limiting enabled")
    
    # 4. Input Validation (comprehensive request validation)
    if config.enable_input_validation:
        setup_input_validation_middleware(app, config.max_request_size)
        logger.info("✅ Advanced input validation enabled")
    
    # 5. XSS and CSRF Protection
    if config.enable_xss_protection or config.enable_csrf_protection:
        setup_xss_csrf_protection(
            app,
            config.secret_key,
            enable_xss_protection=config.enable_xss_protection,
            enable_csrf_protection=config.enable_csrf_protection
        )
        if config.enable_xss_protection:
            logger.info("✅ XSS protection enabled")
        if config.enable_csrf_protection:
            logger.info("✅ CSRF protection enabled")
    
    # Add security headers middleware
    @app.middleware("http")
    async def add_security_headers(request, call_next):
        response = await call_next(request)
        
        # Add comprehensive security headers
        security_headers = config.get_security_headers()
        for header, value in security_headers.items():
            response.headers[header] = value
        
        return response
    
    # Add security status endpoint for monitoring
    @app.get("/api/security/status")
    async def security_status():
        """Security status endpoint"""
        return {
            "security_features": {
                "waf": config.enable_waf,
                "enhanced_rate_limiting": config.enable_enhanced_rate_limiting,
                "input_validation": config.enable_input_validation,
                "xss_protection": config.enable_xss_protection,
                "csrf_protection": config.enable_csrf_protection,
                "security_monitoring": config.enable_security_monitoring,
            },
            "environment": config.environment,
            "security_version": "2.0.0",
            "timestamp": "2025-01-30T00:00:00Z"
        }
    
    logger.info("🎯 Enhanced security setup completed successfully")
    
    # Log security summary
    enabled_features = [
        feature for feature in [
            "WAF" if config.enable_waf else None,
            "Rate Limiting" if config.enable_enhanced_rate_limiting else None,
            "Input Validation" if config.enable_input_validation else None,
            "XSS Protection" if config.enable_xss_protection else None,
            "CSRF Protection" if config.enable_csrf_protection else None,
            "Security Monitoring" if config.enable_security_monitoring else None,
        ] if feature
    ]
    
    logger.info(f"🔐 Active security features: {', '.join(enabled_features)}")
    
    return config


def get_security_recommendations() -> dict:
    """Get security recommendations based on current configuration"""
    recommendations = []
    
    # Check Redis availability
    try:
        import aioredis
        recommendations.append({
            "type": "info",
            "message": "Redis available for enhanced security features",
            "action": "Consider enabling Redis-based rate limiting and monitoring"
        })
    except ImportError:
        recommendations.append({
            "type": "warning",
            "message": "Redis not available - using in-memory fallbacks",
            "action": "Install aioredis for better performance: pip install aioredis"
        })
    
    # Check optional security libraries
    try:
        import bleach
        recommendations.append({
            "type": "info",
            "message": "Bleach library available for advanced HTML sanitization",
            "action": "HTML content will be sanitized using bleach"
        })
    except ImportError:
        recommendations.append({
            "type": "warning",
            "message": "Bleach library not available",
            "action": "Install bleach for better HTML sanitization: pip install bleach"
        })
    
    # Environment-specific recommendations
    env = os.getenv("ENVIRONMENT", "production")
    if env == "development":
        recommendations.append({
            "type": "warning",
            "message": "Running in development mode",
            "action": "Ensure ENVIRONMENT=production for production deployments"
        })
    
    # SSL/TLS recommendations
    if not os.getenv("HTTPS_ONLY", "").lower() == "true":
        recommendations.append({
            "type": "warning",
            "message": "HTTPS enforcement not explicitly enabled",
            "action": "Set HTTPS_ONLY=true in production environments"
        })
    
    return {
        "recommendations": recommendations,
        "security_score": max(0, 100 - len([r for r in recommendations if r["type"] == "warning"]) * 10),
        "timestamp": "2025-01-30T00:00:00Z"
    }


# Export main setup function and configuration class
__all__ = [
    "setup_enhanced_security",
    "SecurityConfiguration",
    "get_security_recommendations"
]