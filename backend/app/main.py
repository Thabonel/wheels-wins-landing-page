
"""
PAM Backend Main Application
High-performance FastAPI application with optimizations.
"""

import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

# Import optimization components
from app.core.database_pool import db_pool
from app.services.cache_service import cache_service
from app.services.websocket_manager import websocket_manager
from app.core.middleware import setup_middleware
from app.core.config import settings
from app.core.logging import setup_logging

# Import API routers
from app.api.v1 import health, chat, wins, wheels, social

logger = setup_logging()

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager with optimization startup/shutdown"""
    logger.info("🚀 Starting PAM Backend with performance optimizations...")
    
    # Initialize performance components
    try:
        # Initialize database pool
        await db_pool.initialize()
        logger.info("✅ Database connection pool initialized")
        
        # Initialize cache service
        await cache_service.initialize()
        logger.info("✅ Redis cache service initialized")
        
        # WebSocket manager is already initialized
        logger.info("✅ WebSocket manager ready")
        
        logger.info("🎯 All performance optimizations active")
        
    except Exception as e:
        logger.error(f"❌ Failed to initialize performance components: {e}")
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

# Create FastAPI app with optimizations
app = FastAPI(
    title="PAM Backend API",
    description="High-performance Personal Assistant Manager Backend",
    version="2.0.0",
    lifespan=lifespan,
    docs_url="/api/docs" if settings.ENVIRONMENT != "production" else None,
    redoc_url="/api/redoc" if settings.ENVIRONMENT != "production" else None
)

# Setup performance middleware
setup_middleware(app)

# CORS configuration with optimization
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
    expose_headers=["X-Process-Time", "X-Request-ID", "X-Cache"]
)

# Include API routers with optimized prefixes
app.include_router(health.router, prefix="/api", tags=["Health"])
app.include_router(chat.router, prefix="/api", tags=["Chat"])
app.include_router(wins.router, prefix="/api", tags=["Wins"])
app.include_router(wheels.router, prefix="/api", tags=["Wheels"])
app.include_router(social.router, prefix="/api", tags=["Social"])

# Global exception handler with performance logging
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Global exception handler with performance metrics"""
    logger.error(f"Unhandled exception in {request.method} {request.url.path}: {exc}")
    
    return JSONResponse(
        status_code=500,
        content={
            "error": "Internal server error",
            "path": str(request.url.path),
            "method": request.method
        }
    )

# Performance monitoring endpoint
@app.get("/api/performance/stats")
async def get_performance_stats():
    """Get performance statistics for monitoring"""
    try:
        # WebSocket stats
        ws_stats = websocket_manager.get_connection_stats()
        
        # Add other performance metrics here
        stats = {
            "websocket": ws_stats,
            "database_pool": {
                "initialized": db_pool.pool is not None,
                "pool_size": len(db_pool.pool._queue) if db_pool.pool else 0
            },
            "cache": {
                "initialized": cache_service.redis is not None
            }
        }
        
        return {"status": "success", "stats": stats}
        
    except Exception as e:
        logger.error(f"Error getting performance stats: {e}")
        return {"status": "error", "message": str(e)}

if __name__ == "__main__":
    import uvicorn
    
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.ENVIRONMENT == "development",
        workers=1 if settings.ENVIRONMENT == "development" else 4,
        loop="uvloop",  # High-performance event loop
        http="httptools",  # High-performance HTTP parser
        access_log=settings.ENVIRONMENT == "development"
    )
