"""
PAM Backend Main Application
High-performance FastAPI application with comprehensive monitoring and security.
"""

import asyncio
import os
from contextlib import asynccontextmanager
from datetime import datetime
from fastapi import FastAPI, Request, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, Response
from starlette.middleware.base import BaseHTTPMiddleware

# Import optimization and security components
from app.core.database_pool import db_pool
from app.services.cache_service import cache_service
from app.core.websocket_manager import manager as websocket_manager
from app.core.middleware import setup_middleware
from app.core.security_middleware import setup_security_middleware
from app.core.monitoring_middleware import MonitoringMiddleware
from app.guardrails.guardrails_middleware import GuardrailsMiddleware

# Temporarily disabled due to WebSocket route conflicts
# from langserve import add_routes
# from app.services.pam.mcp.controllers.pauter_router import PauterRouter
from app.voice.stt_whisper import whisper_stt

# from app.voice.tts_coqui import coqui_tts  # Temporarily disabled due to TTS dependency issues
from app.core.config import settings
from app.core.logging import setup_logging, get_logger

# Import monitoring services
from app.services.monitoring_service import monitoring_service
from app.services.sentry_service import sentry_service

# Import API routers
from app.api.v1 import (
    health,
    chat,
    wins,
    wheels,
    social,
    monitoring,
    pam,
    auth,
    subscription,
    support,
    admin,
    tts,
    search,
    vision,
    voice,
    profiles,
    products,
    orders,
    maintenance,
    custom_routes,
)
from app.api.v1 import observability as observability_api
from app.api import websocket, actions
from app.api.v1 import voice_streaming
from app.api import editing_hub
from app.webhooks import stripe_webhooks

setup_logging()
logger = get_logger(__name__)

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
        # Note: Database pool disabled - using Supabase REST API instead
        # await db_pool.initialize()
        logger.info("✅ Database access via Supabase REST API")

        await cache_service.initialize()
        logger.info("✅ Redis cache service initialized")

        # Initialize Knowledge Tool for PAM
        try:
            from app.core.orchestrator import orchestrator

            await orchestrator.initialize_knowledge_tool()
            logger.info("✅ PAM Knowledge Tool initialized")
        except Exception as e:
            logger.warning(f"⚠️ Knowledge Tool initialization failed: {e}")

        # Initialize TTS Service for PAM
        try:
            from app.services.tts.tts_service import tts_service

            await tts_service.initialize()
            logger.info("✅ PAM TTS Service initialized")
        except Exception as e:
            logger.warning(f"⚠️ TTS Service initialization failed: {e}")

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
        # await db_pool.close()  # Database pool disabled
        await cache_service.close()

        # Shutdown Knowledge Tool
        try:
            from app.tools.knowledge_tool import knowledge_tool

            await knowledge_tool.shutdown()
            logger.info("✅ Knowledge Tool shutdown completed")
        except Exception as e:
            logger.warning(f"⚠️ Knowledge Tool shutdown warning: {e}")

        # Shutdown TTS Service
        try:
            from app.services.tts.tts_service import tts_service

            await tts_service.shutdown()
            logger.info("✅ TTS Service shutdown completed")
        except Exception as e:
            logger.warning(f"⚠️ TTS Service shutdown warning: {e}")

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
    redoc_url="/api/redoc" if settings.ENVIRONMENT != "production" else None,
)

# Enable distributed tracing with OpenTelemetry if available
try:
    from app.observability.config import observability, OPENTELEMETRY_AVAILABLE
    from opentelemetry import trace
    from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor

    if OPENTELEMETRY_AVAILABLE and observability.is_enabled():
        observability.initialize_tracing()
        FastAPIInstrumentor().instrument_app(
            app, tracer_provider=trace.get_tracer_provider()
        )
        logger.info("✅ OpenTelemetry FastAPI instrumentation enabled")
except Exception as trace_error:
    logger.warning(f"OpenTelemetry instrumentation failed: {trace_error}")

# Setup middleware
app.add_middleware(MonitoringMiddleware)
setup_security_middleware(app)
setup_middleware(app)
app.add_middleware(GuardrailsMiddleware)

# CORS middleware MUST be added LAST so it executes FIRST
# Override CORS origins to include current Lovable domain
cors_origins = [
    "*",  # Temporarily allow all origins for debugging
    "http://localhost:3000",
    "http://localhost:8080",
    "http://localhost:5173",
    "https://wheelsandwins.com",
    "https://www.wheelsandwins.com",
    "https://4fd8d7d4-1c59-4996-a0dd-48be31131e7c.lovable.app",
    "https://id-preview--4fd8d7d4-1c59-4996-a0dd-48be31131e7c.lovable.app",
    "https://4fd8d7d4-1c59-4996-a0dd-48be31131e7c.lovableproject.com",
    "https://preview--4fd8d7d4-1c59-4996-a0dd-48be31131e7c.lovable.app",
    "https://main--4fd8d7d4-1c59-4996-a0dd-48be31131e7c.lovable.app",
]

logger.info(f"🌐 Using CORS origins: {cors_origins}")

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=False,  # Disable credentials to allow wildcard
    allow_methods=["*"],
    allow_headers=["*"],
)

# CORS middleware handles OPTIONS requests automatically
# No custom OPTIONS handler needed


# Add root route handler
@app.get("/")
async def root():
    """Root endpoint - PAM Backend status"""
    return {
        "message": "🤖 PAM Backend API",
        "version": "2.0.1",
        "status": "operational",
        "docs": "/api/docs",
        "health": "/health",
        "updated": "2025-07-10T06:45:00Z",
    }


# Include API routers
app.include_router(
    health.router, prefix="", tags=["Health"]
)  # No prefix for /health endpoint
app.include_router(monitoring.router, prefix="/api", tags=["Monitoring"])
app.include_router(chat.router, prefix="/api", tags=["Chat"])
app.include_router(wins.router, prefix="/api", tags=["Wins"])
app.include_router(wheels.router, prefix="/api", tags=["Wheels"])
app.include_router(social.router, prefix="/api", tags=["Social"])
app.include_router(pam.router, prefix="/api/v1/pam", tags=["PAM"])
app.include_router(profiles.router, prefix="/api/v1", tags=["Profiles"])
app.include_router(products.router, prefix="/api/v1", tags=["Products"])
app.include_router(orders.router, prefix="/api/v1", tags=["Orders"])
app.include_router(maintenance.router, prefix="/api/v1", tags=["Maintenance"])
app.include_router(custom_routes.router, prefix="/api/v1", tags=["Routes"])
# Removed generic websocket router to avoid conflicts with PAM WebSocket
# app.include_router(websocket.router, prefix="/api", tags=["WebSocket"])
app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(subscription.router, prefix="/api/v1", tags=["Subscription"])
app.include_router(support.router, prefix="/api", tags=["Support"])
app.include_router(stripe_webhooks.router, prefix="/api", tags=["Webhooks"])
app.include_router(admin.router, prefix="/api/v1", tags=["Admin"])
app.include_router(observability_api.router, prefix="/api/v1", tags=["Admin Observability"])
app.include_router(tts.router, prefix="/api/v1/tts", tags=["Text-to-Speech"])
# Mundi integration removed
app.include_router(actions.router, prefix="/api", tags=["Actions"])
app.include_router(voice.router, prefix="/api/v1", tags=["Voice"])
app.include_router(
    voice_streaming.router, prefix="/api/v1/voice", tags=["Voice Streaming"]
)
app.include_router(search.router, prefix="/api/v1/search", tags=["Web Search"])
app.include_router(vision.router, prefix="/api/v1/vision", tags=["Vision Analysis"])
app.include_router(editing_hub.router, prefix="/hubs", tags=["Editing"])

# LangServe router for PauterRouter - TEMPORARILY DISABLED due to WebSocket route conflicts
# pauter_router = PauterRouter()
# add_routes(app, pauter_router, path="/api/v1/pam/chat")


@app.post("/api/v1/pam/voice")
async def pam_voice(audio: UploadFile = File(...)):
    """Complete STT→LLM→TTS pipeline for voice conversations - returns synthesized audio"""
    try:
        # Step 1: Speech-to-Text (STT)
        logger.info("🎤 Processing voice input...")
        audio_data = await audio.read()
        
        # Step 1: Speech-to-Text (STT) - Must have valid OpenAI API
        try:
            text = await whisper_stt.transcribe(audio_data)
            logger.info(f"📝 Transcribed: {text}")
        except Exception as stt_error:
            logger.error(f"❌ STT failed: {stt_error}")
            
            # Determine the specific error type for better user feedback
            if "401" in str(stt_error) or "invalid_api_key" in str(stt_error):
                return JSONResponse(content={
                    "error": "Voice recognition unavailable",
                    "text": "",
                    "response": "Voice recognition requires API configuration. Please use the text chat instead.",
                    "pipeline": "STT-API-Key-Missing",
                    "guidance": "Voice features need to be configured by an administrator. You can still chat with PAM by typing your messages."
                })
            else:
                return JSONResponse(content={
                    "error": "Speech-to-text failed",
                    "text": "",
                    "response": "I couldn't understand your voice message. Please try speaking more clearly or use text chat.",
                    "pipeline": "STT-Processing-Failed",
                    "guidance": "Try speaking more clearly, reducing background noise, or use the text chat feature instead."
                })

        if not text or text.strip() == "":
            # Return JSON for error cases
            return JSONResponse(content={
                "error": "No speech detected", 
                "text": "", 
                "response": "I didn't hear anything. Please try speaking clearly.",
                "pipeline": "STT-Empty"
            })

        # Step 2: LLM Processing through SimplePamService (more reliable than orchestrator)
        logger.info("🧠 Processing through PAM...")
        from app.core.simple_pam_service import simple_pam_service

        # Create a simple context for voice input
        voice_context = {
            "input_type": "voice",
            "user_id": "voice-user",  # In production, extract from auth
            "session_id": "voice-session",
            "timestamp": str(datetime.utcnow()),
        }

        # Process message through SimplePamService
        response_text = await simple_pam_service.get_response(
            message=text,
            context=voice_context
        )

        logger.info(f"🤖 PAM Response: {response_text}")

        # Step 3: Text-to-Speech (TTS) - Try multiple approaches
        logger.info("🔊 Attempting audio synthesis...")
        
        # First, try local TTS service
        try:
            # Import TTS service
            from app.services.tts.tts_service import TTSService
            
            tts_service = TTSService()
            
            # Initialize TTS service if not already done
            if not tts_service.is_initialized:
                await tts_service.initialize()
            
            if tts_service.is_initialized:
                # Synthesize audio using TTS service
                tts_result = await tts_service.synthesize_for_pam(
                    text=response_text,
                    user_id="voice-user",
                    context="voice_conversation",
                    stream=False
                )
                
                if tts_result and hasattr(tts_result, 'audio_data') and tts_result.audio_data:
                    logger.info(f"✅ Local TTS synthesis successful: {len(tts_result.audio_data)} bytes")
                    
                    # Return audio as binary response
                    return Response(
                        content=tts_result.audio_data,
                        media_type="audio/mpeg",
                        headers={
                            "Content-Disposition": "inline; filename=pam_response.mp3",
                            "Content-Length": str(len(tts_result.audio_data)),
                            "X-Transcription": text,
                            "X-Response-Text": response_text,
                            "X-Pipeline": "STT→LLM→TTS-Local"
                        }
                    )
                else:
                    logger.warning("⚠️ Local TTS synthesis returned no audio data")
            else:
                logger.warning("⚠️ Local TTS service not available")
                
        except Exception as tts_error:
            logger.error(f"❌ Local TTS synthesis failed: {tts_error}")
        
        # Second, try Supabase TTS fallback
        try:
            logger.info("🔄 Trying Supabase TTS fallback...")
            from app.api.v1.voice import generate_voice, VoiceRequest
            
            voice_request = VoiceRequest(text=response_text)
            voice_response = await generate_voice(voice_request)
            
            if voice_response and voice_response.audio:
                # Convert array of integers to bytes
                import struct
                audio_bytes = struct.pack(f"{len(voice_response.audio)}h", *voice_response.audio)
                
                logger.info(f"✅ Supabase TTS successful: {len(audio_bytes)} bytes")
                
                return Response(
                    content=audio_bytes,
                    media_type="audio/wav",
                    headers={
                        "Content-Disposition": "inline; filename=pam_response.wav",
                        "Content-Length": str(len(audio_bytes)),
                        "X-Transcription": text,
                        "X-Response-Text": response_text,
                        "X-Pipeline": "STT→LLM→TTS-Supabase",
                        "X-Duration": str(voice_response.duration),
                        "X-Cached": str(voice_response.cached)
                    }
                )
            else:
                logger.warning("⚠️ Supabase TTS returned no audio data")
                
        except Exception as fallback_error:
            logger.error(f"❌ Supabase TTS fallback failed: {fallback_error}")
        
        # Final fallback: Return JSON with text response and helpful guidance
        logger.info("📝 All TTS methods failed, returning text-only response")
        return JSONResponse(content={
            "text": text,
            "response": response_text,
            "voice_ready": False,
            "pipeline": "STT→LLM→TTS-TextOnly",
            "note": "Voice processing successful but audio synthesis unavailable. Please check API configuration.",
            "guidance": "The voice recognition and AI response worked, but we couldn't generate audio. You can still read PAM's response above."
        })

    except Exception as e:
        logger.error(f"❌ Voice pipeline error: {e}", exc_info=True)
        
        # Provide helpful error information for users
        error_details = {
            "error": "Voice processing failed",
            "text": "",
            "response": "I'm having trouble with voice processing right now. Please try typing your message instead.",
            "pipeline": "Voice-Pipeline-Error",
            "guidance": "Voice features may require additional API configuration. Try refreshing and speaking clearly.",
            "technical_details": str(e) if os.getenv("DEBUG") == "true" else "Enable debug mode for technical details"
        }
        
        logger.error(f"🔍 Voice error details: {error_details}")
        return JSONResponse(content=error_details)


# Global exception handler with monitoring
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Global exception handler with comprehensive monitoring"""
    # Capture exception in Sentry with context
    sentry_service.capture_exception(
        exc,
        {
            "method": request.method,
            "endpoint": request.url.path,
            "query_params": str(request.query_params),
            "client_host": request.client.host if request.client else "unknown",
        },
    )

    # Log security-relevant errors
    if "authentication" in str(exc).lower() or "authorization" in str(exc).lower():
        logger.warning(
            f"Security-related error in {request.method} {request.url.path}: {exc}"
        )
    else:
        logger.error(
            f"Unhandled exception in {request.method} {request.url.path}: {exc}"
        )

    return JSONResponse(
        status_code=500,
        content={
            "error": "Internal server error",
            "path": str(request.url.path),
            "method": request.method,
        },
    )


# ... keep existing code (security and performance status endpoints)

# Explicitly export the app for module access
__all__ = ["app"]

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
        access_log=settings.ENVIRONMENT == "development",
    )
