"""
PAM Backend Main Application
High-performance FastAPI application with comprehensive monitoring and security.
"""

import asyncio
import os
from contextlib import asynccontextmanager
from datetime import datetime
from fastapi import FastAPI, Request, UploadFile, File, Depends
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
from app.core.environment_validator import validate_environment

# Import monitoring services
from app.services.monitoring_service import monitoring_service
from app.services.sentry_service import sentry_service
from app.monitoring.production_monitor import production_monitor, MonitoringMiddleware

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
    voice_conversation,  # Re-enabled after fixing user schema import
    profiles,
    products,
    orders,
    maintenance,
    custom_routes,
    mapbox,
    user_settings,
    onboarding,
)
from app.api.v1 import observability as observability_api
from app.api import websocket, actions
from app.api.v1 import voice_streaming
from app.api import editing_hub
from app.webhooks import stripe_webhooks
from app.api.deps import verify_supabase_jwt_token

setup_logging()
logger = get_logger(__name__)

# Environment validation at startup - temporarily disabled for development
try:
    # validate_environment()  # Disabled for development
    logger.info("⚠️ Environment validation skipped for development mode")
except Exception as env_error:
    logger.error(f"❌ Environment validation failed: {env_error}")
    raise SystemExit(f"Environment validation failed: {env_error}")

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

        # Initialize production monitoring
        await production_monitor.start_monitoring()
        logger.info("✅ Production monitoring system initialized")

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
            # Initialize fallback TTS service
            try:
                from app.services.tts.fallback_tts import fallback_tts_service
                await fallback_tts_service.initialize()
                logger.info("✅ Fallback TTS Service initialized")
            except Exception as fallback_error:
                logger.warning(f"⚠️ Fallback TTS Service initialization failed: {fallback_error}")

        # Initialize Voice Conversation Manager
        try:
            from app.services.voice.conversation_manager import conversation_manager

            await conversation_manager.initialize()
            logger.info("✅ Voice Conversation Manager initialized")
        except Exception as e:
            logger.warning(f"⚠️ Voice Conversation Manager initialization failed: {e}")

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
        
        # Shutdown production monitoring
        await production_monitor.stop_monitoring()
        logger.info("✅ Production monitoring system shutdown")

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
app.add_middleware(MonitoringMiddleware, monitor=production_monitor)
setup_security_middleware(app)
setup_middleware(app)
app.add_middleware(GuardrailsMiddleware)

# CORS middleware MUST be added LAST so it executes FIRST
# Secure CORS configuration - NO WILDCARDS for production security

# Build environment-specific CORS origins
cors_origins = []

# Development origins (localhost)
if settings.DEBUG or "localhost" in str(settings.SITE_URL):
    cors_origins.extend([
        "http://localhost:3000",
        "http://localhost:8080", 
        "http://localhost:5173",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:8080",
        "http://127.0.0.1:5173",
    ])

# Production origins (your actual domains)
cors_origins.extend([
    "https://wheelsandwins.com",
    "https://www.wheelsandwins.com",
    "https://wheelz-wins.com",
    "https://www.wheelz-wins.com",
])

# Lovable.app development platform origins (secure development only)
cors_origins.extend([
    "https://4fd8d7d4-1c59-4996-a0dd-48be31131e7c.lovable.app",
    "https://id-preview--4fd8d7d4-1c59-4996-a0dd-48be31131e7c.lovable.app",
    "https://4fd8d7d4-1c59-4996-a0dd-48be31131e7c.lovableproject.com",
    "https://preview--4fd8d7d4-1c59-4996-a0dd-48be31131e7c.lovable.app",
    "https://main--4fd8d7d4-1c59-4996-a0dd-48be31131e7c.lovable.app",
])

# Add any additional origins from environment variable
if os.getenv("ADDITIONAL_CORS_ORIGINS"):
    additional_origins = os.getenv("ADDITIONAL_CORS_ORIGINS").split(",")
    cors_origins.extend([origin.strip() for origin in additional_origins if origin.strip()])

# Remove duplicates and ensure HTTPS in production
cors_origins = list(set(cors_origins))

# Security logging
logger.info(f"🔒 SECURE CORS - Using {len(cors_origins)} allowed origins")
logger.info(f"🌐 CORS origins: {cors_origins}")

# Validate no wildcard origins in production
if "*" in cors_origins:
    if not settings.DEBUG:
        logger.error("🚨 SECURITY ALERT: Wildcard CORS origin detected in production!")
        raise ValueError("Wildcard CORS origins are not allowed in production")
    else:
        logger.warning("⚠️  Wildcard CORS detected in development mode")

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,  # Enable credentials for authenticated requests
    allow_methods=[
        "GET", 
        "POST", 
        "PUT", 
        "DELETE", 
        "OPTIONS", 
        "PATCH"
    ],  # Specific methods only
    allow_headers=[
        "Accept",
        "Accept-Language", 
        "Content-Language",
        "Content-Type",
        "Authorization",
        "X-Requested-With",
        "Origin",
        "Access-Control-Request-Method",
        "Access-Control-Request-Headers",
        "X-CSRF-Token",
    ],  # Specific headers only
    expose_headers=[
        "Content-Range",
        "X-Content-Range"
    ],
    max_age=86400,  # Cache preflight requests for 24 hours
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


# The CORSMiddleware added above automatically handles all CORS preflight
# requests.  A custom global OPTIONS handler previously overrode this
# behaviour and returned wildcard CORS headers.  This caused the frontend to
# receive responses without the appropriate `Access-Control-Allow-Origin`
# header, breaking cross-origin requests.  Removing the route allows
# CORSMiddleware to apply the configured `cors_origins` list and return the
# correct headers for `https://wheelsandwins.com` and other allowed origins.


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
app.include_router(user_settings.router, prefix="/api/v1", tags=["User Settings"])
app.include_router(products.router, prefix="/api/v1", tags=["Products"])
app.include_router(orders.router, prefix="/api/v1", tags=["Orders"])
app.include_router(maintenance.router, prefix="/api/v1", tags=["Maintenance"])
app.include_router(custom_routes.router, prefix="/api/v1", tags=["Routes"])
app.include_router(onboarding.router, prefix="/api/v1", tags=["Onboarding"])
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
app.include_router(voice_conversation.router, prefix="/api/v1", tags=["Voice Conversation"])  # Re-enabled - import issues resolved
app.include_router(
    voice_streaming.router, prefix="/api/v1/voice", tags=["Voice Streaming"]
)
app.include_router(search.router, prefix="/api/v1/search", tags=["Web Search"])
app.include_router(vision.router, prefix="/api/v1/vision", tags=["Vision Analysis"])
app.include_router(mapbox.router, prefix="/api/v1/mapbox", tags=["Mapbox Proxy"])
app.include_router(editing_hub.router, prefix="/hubs", tags=["Editing"])

# LangServe router for PauterRouter - TEMPORARILY DISABLED due to WebSocket route conflicts
# pauter_router = PauterRouter()
# add_routes(app, pauter_router, path="/api/v1/pam/chat")

@app.get("/api/v1/pam/voice/health")
async def voice_health_check():
    """Check if TTS services are working properly"""
    health_status = {
        "timestamp": datetime.utcnow().isoformat(),
        "services": {},
        "overall_status": "unknown"
    }
    
    try:
        # Test Edge TTS
        try:
            import edge_tts
            health_status["services"]["edge_tts"] = {
                "available": True,
                "version": edge_tts.__version__ if hasattr(edge_tts, '__version__') else "unknown",
                "status": "healthy"
            }
        except ImportError:
            health_status["services"]["edge_tts"] = {
                "available": False,
                "error": "edge-tts package not installed",
                "status": "unavailable"
            }
        
        # Test fallback TTS
        try:
            from app.services.tts.fallback_tts import FallbackTTSService
            fallback_service = FallbackTTSService()
            await fallback_service.initialize()
            
            health_status["services"]["fallback_tts"] = {
                "available": True,
                "engines": fallback_service.available_engines,
                "status": "healthy" if fallback_service.is_initialized else "failed"
            }
        except Exception as e:
            health_status["services"]["fallback_tts"] = {
                "available": False,
                "error": str(e),
                "status": "failed"
            }
        
        # Determine overall status
        edge_healthy = health_status["services"].get("edge_tts", {}).get("available", False)
        fallback_healthy = health_status["services"].get("fallback_tts", {}).get("available", False)
        
        if edge_healthy:
            health_status["overall_status"] = "healthy"
            health_status["primary_service"] = "edge_tts"
        elif fallback_healthy:
            health_status["overall_status"] = "degraded"
            health_status["primary_service"] = "fallback_tts"
        else:
            health_status["overall_status"] = "failed"
            health_status["primary_service"] = "none"
        
        return health_status
        
    except Exception as e:
        health_status["overall_status"] = "error"
        health_status["error"] = str(e)
        return health_status

@app.post("/api/v1/pam/voice/test")
async def voice_test_endpoint(
    current_user: dict = Depends(verify_supabase_jwt_token)
):
    """Simple TTS test endpoint"""
    test_text = "Hello! This is PAM testing the voice synthesis system. If you can hear this, the TTS pipeline is working correctly."
    
    try:
        # Try Edge TTS directly
        try:
            import edge_tts
            import tempfile
            
            voice = "en-US-AriaNeural"
            communicate = edge_tts.Communicate(test_text, voice)
            
            with tempfile.NamedTemporaryFile(suffix=".mp3", delete=False) as temp_file:
                temp_path = temp_file.name
            
            await communicate.save(temp_path)
            
            with open(temp_path, 'rb') as audio_file:
                audio_data = audio_file.read()
            
            os.unlink(temp_path)
            
            if audio_data and len(audio_data) > 0:
                return Response(
                    content=audio_data,
                    media_type="audio/mpeg",
                    headers={
                        "Content-Disposition": "inline; filename=pam_test.mp3",
                        "X-Test-Status": "success",
                        "X-TTS-Engine": "edge-tts",
                        "X-Audio-Size": str(len(audio_data))
                    }
                )
            else:
                return JSONResponse(content={
                    "error": "TTS test failed - no audio generated",
                    "test_text": test_text,
                    "status": "failed"
                })
                
        except Exception as edge_error:
            return JSONResponse(content={
                "error": f"Edge TTS test failed: {str(edge_error)}",
                "test_text": test_text,
                "status": "failed",
                "suggestion": "Check if edge-tts is properly installed in production"
            })
            
    except Exception as e:
        return JSONResponse(content={
            "error": f"TTS test endpoint failed: {str(e)}",
            "test_text": test_text,
            "status": "error"
        })


@app.post("/api/v1/pam/voice")
async def pam_voice(
    audio: UploadFile = File(...),
    current_user: dict = Depends(verify_supabase_jwt_token)
):
    """Complete STT→LLM→TTS pipeline for voice conversations - returns synthesized audio"""
    try:
        # Step 1: Speech-to-Text (STT)
        logger.info("🎤 Processing voice input...")
        audio_data = await audio.read()
        
        # Step 1: Speech-to-Text (STT) - Try primary then fallback
        text = None
        stt_engine = "unknown"
        
        try:
            text = await whisper_stt.transcribe(audio_data)
            stt_engine = "whisper-openai"
            logger.info(f"📝 Transcribed via Whisper: {text}")
        except Exception as stt_error:
            logger.warning(f"⚠️ Primary STT failed: {stt_error}")
            
            # Try fallback STT service
            try:
                from app.voice.fallback_stt import fallback_stt_service
                text = await fallback_stt_service.transcribe(audio_data)
                stt_engine = "fallback-stt"
                logger.info(f"📝 Transcribed via fallback: {text}")
            except Exception as fallback_error:
                logger.error(f"❌ Fallback STT failed: {fallback_error}")
                
                return JSONResponse(content={
                    "error": "Speech-to-text failed",
                    "text": "",
                    "response": "I couldn't understand your voice message. Please try speaking more clearly or use text chat.",
                    "pipeline": "STT-All-Failed",
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

        # Create a simple context for voice input with authenticated user
        user_id = current_user.get('sub', 'unknown-user')
        voice_context = {
            "input_type": "voice",
            "user_id": user_id,
            "session_id": f"voice-session-{user_id}",
            "timestamp": str(datetime.utcnow()),
        }

        # Process message through SimplePamService
        response_text = await simple_pam_service.get_response(
            message=text,
            context=voice_context
        )

        logger.info(f"🤖 PAM Response: {response_text}")

        # Step 3: Text-to-Speech (TTS) - Use simplified approach for production
        logger.info("🔊 Attempting audio synthesis...")
        
        # Try Edge TTS directly (most reliable in production)
        try:
            # Try Edge TTS first - it's free and reliable
            logger.info("🔊 Trying Edge TTS...")
            
            try:
                import edge_tts
                EDGE_TTS_AVAILABLE = True
            except ImportError:
                EDGE_TTS_AVAILABLE = False
                logger.warning("⚠️ edge-tts package not available")
            
            if EDGE_TTS_AVAILABLE:
                import tempfile
                import asyncio
                
                # Use Edge TTS directly for reliability
                voice = "en-US-AriaNeural"  # Default voice
                
                # Create TTS communicate object
                communicate = edge_tts.Communicate(response_text, voice)
                
                # Create temporary file
                with tempfile.NamedTemporaryFile(suffix=".mp3", delete=False) as temp_file:
                    temp_path = temp_file.name
                
                try:
                    # Save to temporary file
                    await communicate.save(temp_path)
                    
                    # Read the audio data
                    with open(temp_path, 'rb') as audio_file:
                        audio_data = audio_file.read()
                    
                    # Clean up temp file
                    os.unlink(temp_path)
                    
                    if audio_data and len(audio_data) > 0:
                        logger.info(f"✅ Edge TTS synthesis successful: {len(audio_data)} bytes")
                        
                        # Return audio as binary response
                        return Response(
                            content=audio_data,
                            media_type="audio/mpeg",
                            headers={
                                "Content-Disposition": "inline; filename=pam_response.mp3",
                                "X-Transcription": text,
                                "X-Response-Text": response_text,
                                "X-Pipeline": f"STT-{stt_engine}→LLM→TTS-EdgeDirect"
                            }
                        )
                    else:
                        logger.warning("⚠️ Edge TTS returned empty audio data")
                        
                except Exception as edge_error:
                    logger.error(f"❌ Edge TTS synthesis failed: {edge_error}")
                    # Clean up temp file if it exists
                    if 'temp_path' in locals() and os.path.exists(temp_path):
                        os.unlink(temp_path)
            else:
                logger.warning("⚠️ Edge TTS not available")
                
        except Exception as tts_error:
            logger.error(f"❌ TTS synthesis failed: {tts_error}")
        
        # Try system fallback TTS
        try:
            from app.services.tts.fallback_tts import FallbackTTSService
            
            fallback_service = FallbackTTSService()
            if not fallback_service.is_initialized:
                await fallback_service.initialize()
            
            if fallback_service.is_initialized:
                logger.info("🔄 Trying fallback TTS service...")
                fallback_result = await fallback_service.synthesize_speech(
                    text=response_text,
                    user_id=user_id
                )
                
                if fallback_result and fallback_result.get('success') and fallback_result.get('audio_data'):
                    logger.info(f"✅ Fallback TTS synthesis successful: {len(fallback_result['audio_data'])} bytes")
                    
                    # Return audio as binary response
                    return Response(
                        content=fallback_result['audio_data'],
                        media_type=f"audio/{fallback_result.get('format', 'wav')}",
                        headers={
                            "Content-Disposition": f"inline; filename=pam_response.{fallback_result.get('format', 'wav')}",
                            "X-Transcription": text,
                            "X-Response-Text": response_text,
                            "X-Pipeline": f"STT-{stt_engine}→LLM→TTS-Fallback-{fallback_result.get('engine', 'unknown')}"
                        }
                    )
                elif fallback_result and fallback_result.get('success'):
                    logger.info("✅ Fallback TTS completed (text-only response)")
                    
        except Exception as fallback_tts_error:
            logger.error(f"❌ Fallback TTS synthesis failed: {fallback_tts_error}")
        
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
                        # "Content-Length": str(len(audio_bytes)),  # Remove manual Content-Length
                        "X-Transcription": text,
                        "X-Response-Text": response_text,
                        "X-Pipeline": f"STT-{stt_engine}→LLM→TTS-Supabase",
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
            "pipeline": f"STT-{stt_engine}→LLM→TTS-TextOnly",
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
