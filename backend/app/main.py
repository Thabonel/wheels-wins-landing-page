"""
PAM Backend Main Application
High-performance FastAPI application with comprehensive monitoring and security.
"""

import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

# Import optimization and security components
from app.core.database_pool import db_pool
from app.services.cache_service import cache_service
from app.services.websocket_manager import websocket_manager
from app.core.middleware import setup_middleware
from app.core.security_middleware import setup_security_middleware
from app.core.monitoring_middleware import MonitoringMiddleware
from app.core.config import settings
from app.core.logging import setup_logging

# Import monitoring services
from app.services.monitoring_service import monitoring_service
from app.services.sentry_service import sentry_service

# Import API routers
from app.api.v1 import health, chat, wins, wheels, social, monitoring, pam, actions, demo, you

logger = setup_logging()

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager with monitoring initialization"""
    logger.info("🚀 Starting PAM Backend with monitoring and security...")
    
    # Initialize monitoring services
    try:
        # Initialize Sentry first
        sentry_service.initialize()
        logger.info("✅ Sentry error tracking initialized")
        
        # Initialize performance components
        await db_pool.initialize()
        logger.info("✅ Database connection pool initialized")
        
        await cache_service.initialize()
        logger.info("✅ Redis cache service initialized")
        
        logger.info("✅ WebSocket manager ready")
        logger.info("✅ Monitoring service ready")
        
        logger.info("🎯 All performance optimizations active")
        logger.info("🔒 Security hardening measures active")
        logger.info("📊 Monitoring and alerting active")
        
    except Exception as e:
        logger.error(f"❌ Failed to initialize components: {e}")
        sentry_service.capture_exception(e)
        raise
    
    yield
    
    # Cleanup on shutdown
    logger.info("🔄 Shutting down PAM Backend...")
    
    try:
        await db_pool.close()
        await cache_service.close()
        logger.info("✅ Cleanup completed")
    except Exception as e:
        logger.error(f"❌ Error during cleanup: {e}")
        sentry_service.capture_exception(e)

# Create FastAPI app
app = FastAPI(
    title="PAM Backend API",
    description="High-performance Personal Assistant Manager Backend with Monitoring",
    version="2.0.0",
    lifespan=lifespan,
    docs_url="/api/docs" if settings.ENVIRONMENT != "production" else None,
    redoc_url="/api/redoc" if settings.ENVIRONMENT != "production" else None
)

# Setup monitoring middleware (first for comprehensive tracking)
app.add_middleware(MonitoringMiddleware)

# Setup security middleware
setup_security_middleware(app)

# Setup performance middleware
setup_middleware(app)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
    expose_headers=["X-Process-Time", "X-Request-ID", "X-Cache", "X-Rate-Limit-Remaining"]
)

# Include API routers
app.include_router(health.router, prefix="/api", tags=["Health"])
app.include_router(monitoring.router, prefix="/api", tags=["Monitoring"])
app.include_router(chat.router, prefix="/api", tags=["Chat"])
app.include_router(wins.router, prefix="/api", tags=["Wins"])
app.include_router(wheels.router, prefix="/api", tags=["Wheels"])
app.include_router(social.router, prefix="/api", tags=["Social"])
app.include_router(pam.router, prefix="/api", tags=["PAM"])
app.include_router(actions.router, prefix="/api", tags=["Actions"])
app.include_router(demo.router, prefix="/api", tags=["Demo"])
app.include_router(you.router, prefix="/api", tags=["You"])

# Global exception handler with monitoring
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Global exception handler with comprehensive monitoring"""
    # Capture exception in Sentry with context
    sentry_service.capture_exception(exc, {
        "method": request.method,
        "endpoint": request.url.path,
        "query_params": str(request.query_params),
        "client_host": request.client.host if request.client else "unknown"
    })
    
    # Log security-relevant errors
    if "authentication" in str(exc).lower() or "authorization" in str(exc).lower():
        logger.warning(f"Security-related error in {request.method} {request.url.path}: {exc}")
    else:
        logger.error(f"Unhandled exception in {request.method} {request.url.path}: {exc}")
    
    return JSONResponse(
        status_code=500,
        content={
            "error": "Internal server error",
            "path": str(request.url.path),
            "method": request.method
        }
    )

# ... keep existing code (security and performance status endpoints)

if __name__ == "__main__":
    import uvicorn
    
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.ENVIRONMENT == "development",
        workers=1 if settings.ENVIRONMENT == "development" else 4,
        loop="uvloop",
        http="httptools",
        access_log=settings.ENVIRONMENT == "development"
    )