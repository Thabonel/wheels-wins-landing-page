"""
PAM Backend Main Application
High-performance FastAPI application with comprehensive monitoring and security.
"""

import asyncio
import os
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, Response

# Import optimization and security components
from app.core.database_pool import db_pool
from app.services.cache_service import cache_service
from app.core.websocket_manager import manager as websocket_manager
from app.core.middleware import setup_middleware
from app.core.security_middleware import setup_security_middleware
from app.core.monitoring_middleware import MonitoringMiddleware
from app.guardrails.guardrails_middleware import GuardrailsMiddleware
from langserve import add_routes
from app.services.pam.mcp.controllers.pauter_router import PauterRouter
from app.voice.stt_whisper import whisper_stt
from app.voice.tts_coqui import coqui_tts
from app.core.config import settings
from app.core.logging import setup_logging

# Import monitoring services
from app.services.monitoring_service import monitoring_service
from app.services.sentry_service import sentry_service

# Import API routers
from app.api.v1 import health, chat, wins, wheels, social, monitoring, pam, auth, subscription, support, admin
from app.webhooks import stripe_webhooks

logger = setup_logging()

# Debug CORS configuration
logger.info(f"CORS_ORIGINS from settings: {settings.CORS_ORIGINS}")
logger.info(f"ALLOWED_ORIGINS env var: {os.getenv('ALLOWED_ORIGINS')}")
logger.info(f"CORS_ORIGINS env var: {os.getenv('CORS_ORIGINS')}")

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

# Setup middleware
app.add_middleware(MonitoringMiddleware)
setup_security_middleware(app)
setup_middleware(app)
app.add_middleware(GuardrailsMiddleware)

# CORS middleware MUST be added LAST so it executes FIRST
origins = [
    "https://4fd8d7d4-1c59-4996-a0dd-48be31131e7c.lovable.app",
    "https://id-preview--4fd8d7d4-1c59-4996-a0dd-48be31131e7c.lovable.app",
    "https://www.wheelsandwins.com",
    "http://localhost:5173",
    "http://localhost:3000"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routers
app.include_router(health.router, prefix="", tags=["Health"])  # No prefix for /health endpoint
app.include_router(monitoring.router, prefix="/api", tags=["Monitoring"])
app.include_router(chat.router, prefix="/api", tags=["Chat"])
app.include_router(wins.router, prefix="/api", tags=["Wins"])
app.include_router(wheels.router, prefix="/api", tags=["Wheels"])
app.include_router(social.router, prefix="/api", tags=["Social"])
app.include_router(pam.router, prefix="/api", tags=["PAM"])
app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(subscription.router, prefix="/api/v1", tags=["Subscription"])
app.include_router(support.router, prefix="/api", tags=["Support"])
app.include_router(stripe_webhooks.router, prefix="/api", tags=["Webhooks"])
app.include_router(admin.router, prefix="/api/v1", tags=["Admin"])

# LangServe router for PauterRouter
pauter_router = PauterRouter()
add_routes(app, pauter_router, path="/api/v1/pam/chat")


@app.post("/api/v1/pam/voice")
async def pam_voice(audio: UploadFile = File(...)):
    """Speech interface using Whisper STT, PauterRouter, and Coqui TTS."""
    data = await audio.read()
    text = await whisper_stt.transcribe(data)
    route = await pauter_router.ainvoke(text)
    speech_text = f"Routed to {route.get('target_node')}"
    wav = await coqui_tts.synthesize(speech_text)
    return Response(content=wav, media_type="audio/wav")

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
