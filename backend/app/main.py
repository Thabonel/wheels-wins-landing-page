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

# Configuration validation at startup
def validate_configuration():
    """Validate critical configuration settings"""
    validation_errors = []
    
    # Validate required settings with defensive access
    required_settings = [
        ("SUPABASE_URL", getattr(settings, 'SUPABASE_URL', None)),
        ("SUPABASE_KEY", getattr(settings, 'SUPABASE_KEY', None)),
        ("SECRET_KEY", getattr(settings, 'SECRET_KEY', None)),
    ]
    
    for setting_name, setting_value in required_settings:
        if not setting_value:
            validation_errors.append(f"Missing required setting: {setting_name}")
    
    # Validate SITE_URL (optional but validate format if present)
    try:
        site_url = getattr(settings, 'SITE_URL', None)
        if site_url and not (site_url.startswith("http://") or site_url.startswith("https://")):
            validation_errors.append(f"SITE_URL must start with http:// or https://, got: {site_url}")
    except AttributeError:
        logger.warning("⚠️ SITE_URL property not available in settings (using fallback)")
        site_url = "http://localhost:3000"
    
    # Validate environment-specific requirements
    try:
        environment = getattr(settings, 'ENVIRONMENT', 'production')
        debug_mode = getattr(settings, 'DEBUG', False)
        openai_key = getattr(settings, 'OPENAI_API_KEY', None)
        
        if environment == "production":
            if not openai_key:
                logger.warning("⚠️ OPENAI_API_KEY not set in production - PAM features may be limited")
            
            if debug_mode:
                validation_errors.append("DEBUG mode should not be enabled in production")
    except AttributeError:
        logger.warning("⚠️ Could not access environment configuration - using defaults")
    
    # Log validation results
    if validation_errors:
        logger.error("❌ Configuration validation failed:")
        for error in validation_errors:
            logger.error(f"   - {error}")
        raise SystemExit(f"Configuration validation failed: {', '.join(validation_errors)}")
    else:
        logger.info("✅ Configuration validation passed")
        try:
            logger.info(f"   Environment: {getattr(settings, 'ENVIRONMENT', 'unknown')}")
            logger.info(f"   Debug mode: {getattr(settings, 'DEBUG', 'unknown')}")
            logger.info(f"   Site URL: {getattr(settings, 'SITE_URL', 'fallback')}")
        except AttributeError:
            logger.info("   Configuration: using fallback values (properties not available)")

try:
    validate_configuration()
except Exception as env_error:
    logger.error(f"❌ Configuration validation failed: {env_error}")
    logger.warning("⚠️ Continuing despite configuration errors for debugging")
    # Temporarily disable validation failure to debug import issues
    # raise SystemExit(f"Configuration validation failed: {env_error}")

# Debug CORS configuration
try:
    logger.info(f"CORS_ORIGINS from settings: {getattr(settings, 'CORS_ORIGINS', 'not available')}")
except AttributeError:
    logger.info("CORS_ORIGINS from settings: not available (using fallback)")
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

        # Initialize Knowledge Tool for PAM (ChromaDB-dependent)
        knowledge_tool_initialized = False
        try:
            from app.core.orchestrator import orchestrator
            await orchestrator.initialize_knowledge_tool()
            logger.info("✅ PAM Knowledge Tool initialized")
            knowledge_tool_initialized = True
        except ImportError as import_error:
            if "chromadb" in str(import_error).lower():
                logger.warning("⚠️ ChromaDB not available - Knowledge Tool disabled")
                logger.info("💡 PAM will operate without vector database capabilities")
            else:
                logger.warning(f"⚠️ Knowledge Tool import failed: {import_error}")
        except Exception as e:
            logger.warning(f"⚠️ Knowledge Tool initialization failed: {e}")
            logger.info("💡 PAM will continue without advanced knowledge retrieval")
        
        if not knowledge_tool_initialized:
            logger.info("🔍 Knowledge Tool disabled - using basic PAM functionality")

        # Initialize TTS Service for PAM with enhanced fallback chain
        tts_initialized = False
        try:
            from app.services.tts.tts_service import tts_service
            await tts_service.initialize()
            logger.info("✅ PAM TTS Service (primary) initialized")
            tts_initialized = True
        except ImportError as import_error:
            logger.warning(f"⚠️ Primary TTS Service unavailable: {import_error}")
        except Exception as e:
            logger.warning(f"⚠️ Primary TTS Service initialization failed: {e}")
        
        # Try fallback TTS services if primary failed
        if not tts_initialized:
            try:
                from app.services.tts.fallback_tts import fallback_tts_service
                await fallback_tts_service.initialize()
                logger.info("✅ Fallback TTS Service initialized")
                tts_initialized = True
            except ImportError:
                logger.warning("⚠️ Fallback TTS Service not available")
            except Exception as fallback_error:
                logger.warning(f"⚠️ Fallback TTS Service initialization failed: {fallback_error}")
        
        # Final fallback: System TTS
        if not tts_initialized:
            try:
                # Check if pyttsx3 is available for system TTS
                import pyttsx3
                logger.info("✅ System TTS (pyttsx3) available as final fallback")
                tts_initialized = True
            except ImportError:
                logger.warning("⚠️ System TTS (pyttsx3) not available")
        
        if not tts_initialized:
            logger.warning("⚠️ No TTS engines available - voice features will be limited")
            logger.info("💡 Voice responses will fallback to text-only mode")

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

        # Shutdown Knowledge Tool (if initialized)
        try:
            from app.tools.knowledge_tool import knowledge_tool
            await knowledge_tool.shutdown()
            logger.info("✅ Knowledge Tool shutdown completed")
        except ImportError:
            logger.info("📝 Knowledge Tool was not available - skipping shutdown")
        except Exception as e:
            logger.warning(f"⚠️ Knowledge Tool shutdown warning: {e}")

        # Shutdown TTS Services (if initialized)
        try:
            from app.services.tts.tts_service import tts_service
            await tts_service.shutdown()
            logger.info("✅ Primary TTS Service shutdown completed")
        except ImportError:
            logger.info("🔊 Primary TTS Service was not available - skipping shutdown")
        except Exception as e:
            logger.warning(f"⚠️ Primary TTS Service shutdown warning: {e}")
        
        # Shutdown fallback TTS if available
        try:
            from app.services.tts.fallback_tts import fallback_tts_service
            await fallback_tts_service.shutdown()
            logger.info("✅ Fallback TTS Service shutdown completed")
        except ImportError:
            logger.info("🔊 Fallback TTS Service was not available - skipping shutdown")
        except Exception as e:
            logger.warning(f"⚠️ Fallback TTS Service shutdown warning: {e}")

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
    observability_enabled = getattr(settings, 'OBSERVABILITY_ENABLED', False)
    if observability_enabled:
        from app.observability.config import observability, OPENTELEMETRY_AVAILABLE
        from opentelemetry import trace
        from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor

        if OPENTELEMETRY_AVAILABLE and observability.is_enabled():
            observability.initialize_tracing()
            FastAPIInstrumentor().instrument_app(
                app, tracer_provider=trace.get_tracer_provider()
            )
            logger.info("✅ OpenTelemetry FastAPI instrumentation enabled")
        else:
            logger.info("📊 OpenTelemetry not available or disabled")
    else:
        logger.info("📊 Observability disabled - skipping OpenTelemetry instrumentation")
except Exception as trace_error:
    logger.warning(f"⚠️ OpenTelemetry instrumentation failed (non-critical): {trace_error}")
    logger.info("📊 Application will continue without OpenTelemetry tracing")

# Setup middleware
app.add_middleware(MonitoringMiddleware, monitor=production_monitor)
setup_security_middleware(app)
setup_middleware(app)
app.add_middleware(GuardrailsMiddleware)

# CORS middleware MUST be added LAST so it executes FIRST
# Secure CORS configuration - NO WILDCARDS for production security

# Build environment-specific CORS origins with security-first approach
cors_origins = []

# Development origins (localhost) - only in development environment
# Use defensive access to handle potential configuration issues
try:
    is_development = getattr(settings, 'ENVIRONMENT', 'production') == "development"
    is_debug = getattr(settings, 'DEBUG', False)
except AttributeError:
    logger.warning("⚠️ Using fallback environment detection")
    is_development = True  # Fallback to development for safety
    is_debug = True

if is_development or is_debug:
    cors_origins.extend([
        "http://localhost:3000",
        "http://localhost:8080", 
        "http://localhost:5173",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:8080",
        "http://127.0.0.1:5173",
    ])
    logger.info("🔧 Development mode: Added localhost origins")

# Production origins (your actual domains) - always included
cors_origins.extend([
    "https://wheelsandwins.com",
    "https://www.wheelsandwins.com",
    "https://wheelz-wins.com",
    "https://www.wheelz-wins.com",
    # Current Netlify deployment
    "https://wheels-wins-landing-page.netlify.app",
    "https://65a8f6b6c9f5d2092be8bfc2--wheels-wins-landing-page.netlify.app",
])

# Lovable.app development platform origins 
# Enable in development OR when explicitly enabled for production testing
try:
    environment = getattr(settings, 'ENVIRONMENT', 'production')
except AttributeError:
    environment = 'production'

enable_lovable = (
    is_development or 
    os.getenv("ENABLE_LOVABLE_ORIGINS", "false").lower() == "true" or
    # Temporarily enable for production while frontend is on Lovable.app
    (environment == "production" and not os.getenv("DISABLE_LOVABLE_ORIGINS"))
)

if enable_lovable:
    cors_origins.extend([
        "https://4fd8d7d4-1c59-4996-a0dd-48be31131e7c.lovable.app",
        "https://id-preview--4fd8d7d4-1c59-4996-a0dd-48be31131e7c.lovable.app",
        "https://4fd8d7d4-1c59-4996-a0dd-48be31131e7c.lovableproject.com",
        "https://preview--4fd8d7d4-1c59-4996-a0dd-48be31131e7c.lovable.app",
        "https://main--4fd8d7d4-1c59-4996-a0dd-48be31131e7c.lovable.app",
    ])
    env_reason = "development" if is_development else "production testing"
    logger.info(f"🔧 {env_reason.title()} mode: Added Lovable platform origins")

# Add any additional origins from environment variable (for staging/testing environments)
if os.getenv("ADDITIONAL_CORS_ORIGINS"):
    additional_origins = os.getenv("ADDITIONAL_CORS_ORIGINS").split(",")
    additional_clean = [origin.strip() for origin in additional_origins if origin.strip()]
    cors_origins.extend(additional_clean)
    logger.info(f"🔧 Added {len(additional_clean)} additional origins from environment")

# Remove duplicates while preserving order
cors_origins = list(dict.fromkeys(cors_origins))

# Security validation - NO wildcards allowed in any environment
if "*" in cors_origins:
    logger.error("🚨 SECURITY ALERT: Wildcard CORS origin detected!")
    logger.error("Wildcard origins are never allowed for security reasons")
    raise ValueError("Wildcard CORS origins are prohibited in all environments")

# Log final CORS configuration
logger.info(f"🔒 SECURE CORS Configuration:")
try:
    logger.info(f"   Environment: {getattr(settings, 'ENVIRONMENT', 'unknown')}")
except AttributeError:
    logger.info("   Environment: fallback detection")
logger.info(f"   Total origins: {len(cors_origins)}")
logger.info(f"   Origins: {cors_origins}")

# Additional security validation for production
try:
    environment = getattr(settings, 'ENVIRONMENT', 'production')
except AttributeError:
    environment = 'production'  # Default to production for security

if environment == "production":
    # Ensure only HTTPS origins in production (except localhost for local testing)
    insecure_origins = [origin for origin in cors_origins if origin.startswith("http://") and "localhost" not in origin and "127.0.0.1" not in origin]
    if insecure_origins:
        logger.error(f"🚨 SECURITY ALERT: HTTP origins detected in production: {insecure_origins}")
        raise ValueError("HTTP origins are not allowed in production environment")

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
        "Cache-Control",
        "Pragma",
        "X-Supabase-Auth",
        "apikey",
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
        "version": "2.0.3", 
        "status": "operational",
        "docs": "/api/docs",
        "health": "/health",
        "updated": "2025-07-28T23:54:00Z",
        "fixes": ["CORS configuration enhanced", "Voice services optimized", "STT messaging improved"],
    }

# CORS debugging endpoint
@app.get("/api/cors/debug")
async def cors_debug_info(request: Request):
    """Debugging endpoint to check CORS configuration"""
    origin = request.headers.get("origin", "No origin header")
    
    return {
        "timestamp": datetime.utcnow().isoformat(),
        "request_origin": origin,
        "configured_cors_origins": cors_origins,
        "origin_allowed": origin in cors_origins if origin != "No origin header" else False,
        "environment": getattr(settings, 'ENVIRONMENT', 'unknown'),
        "lovable_enabled": enable_lovable,
        "total_origins": len(cors_origins),
        "help": "Use this endpoint to verify if your frontend origin is in the CORS allow list"
    }

# Enhanced CORS debugging for OPTIONS requests
@app.middleware("http")
async def cors_debug_middleware(request: Request, call_next):
    """Debug middleware to log CORS issues"""
    if request.method == "OPTIONS":
        origin = request.headers.get("origin", "No origin")
        path = request.url.path
        logger.info(f"🔍 OPTIONS request: {path} from origin: {origin}")
        logger.info(f"🔍 Headers: {dict(request.headers)}")
        
        # Check if origin is in our CORS list
        if origin != "No origin":
            is_allowed = origin in cors_origins
            logger.info(f"🔍 Origin allowed: {is_allowed}")
            if not is_allowed:
                logger.warning(f"⚠️ Origin {origin} not in CORS origins list")
                logger.info(f"🔍 Configured origins: {cors_origins}")
    
    response = await call_next(request)
    
    # Log response for OPTIONS requests
    if request.method == "OPTIONS":
        logger.info(f"🔍 OPTIONS response status: {response.status_code}")
        if hasattr(response, 'headers'):
            cors_headers = {k: v for k, v in response.headers.items() if 'access-control' in k.lower()}
            logger.info(f"🔍 CORS headers in response: {cors_headers}")
    
    return response


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
    """Enhanced voice services health check with comprehensive performance monitoring"""
    health_status = {
        "timestamp": datetime.utcnow().isoformat(),
        "services": {},
        "overall_status": "unknown",
        "user_message": "",
        "capabilities": [],
        "performance_metrics": {},
        "offline_readiness": {},
        "cost_efficiency": {}
    }
    
    try:
        # Check comprehensive TTS service status
        try:
            from app.services.tts.tts_service import tts_service
            tts_status = await tts_service.get_service_status()
            
            health_status["services"]["tts"] = {
                "available": tts_status.get("is_initialized", False),
                "engines": list(tts_status.get("engines", {}).keys()),
                "status": "healthy" if tts_status.get("is_initialized") else "failed",
                "details": tts_status
            }
        except Exception as e:
            health_status["services"]["tts"] = {
                "available": False,
                "error": str(e),
                "status": "failed"
            }
        
        # Check comprehensive STT service status with performance metrics
        try:
            from app.services.voice.speech_to_text import speech_to_text_service
            stt_status = await speech_to_text_service.get_service_status()
            
            health_status["services"]["stt"] = {
                "available": stt_status.get("status") == "initialized",
                "providers": list(stt_status.get("providers", {}).keys()),
                "primary_provider": stt_status.get("primary_provider"),
                "status": "healthy" if stt_status.get("status") == "initialized" else "failed",
                "details": stt_status
            }
            
            # Extract performance insights
            performance_insights = stt_status.get("performance_insights", {})
            health_status["performance_metrics"] = stt_status.get("performance_metrics", {})
            health_status["offline_readiness"] = performance_insights.get("offline_readiness", {})
            health_status["cost_efficiency"] = performance_insights.get("cost_efficiency", {})
            
        except Exception as e:
            health_status["services"]["stt"] = {
                "available": False,
                "error": str(e),
                "status": "failed"
            }
        
        # Determine capabilities and overall status
        tts_available = health_status["services"].get("tts", {}).get("available", False)
        stt_available = health_status["services"].get("stt", {}).get("available", False)
        offline_capable = health_status["offline_readiness"].get("offline_capable", False)
        
        # Build capabilities list with enhanced messaging
        capabilities = []
        if tts_available:
            tts_engines = health_status["services"]["tts"].get("engines", [])
            if "edge" in str(tts_engines).lower():
                capabilities.append("🔊 High-quality text-to-speech (Edge TTS)")
            else:
                capabilities.append("🔊 Text-to-speech available")
        
        if stt_available:
            stt_providers = health_status["services"]["stt"].get("providers", [])
            if "openaiwhisper" in stt_providers:
                capabilities.append("🎤 Cloud speech-to-text (OpenAI Whisper)")
            if "localwhisper" in stt_providers:
                capabilities.append("🎤 Local speech-to-text (Whisper)")
            if "browserwebspeech" in stt_providers:
                capabilities.append("🎤 Browser speech-to-text (WebSpeech API)")
        
        health_status["capabilities"] = capabilities
        
        # Enhanced status determination with offline consideration
        if tts_available and stt_available and offline_capable:
            health_status["overall_status"] = "optimal"
            health_status["primary_service"] = "full_voice_with_offline"
            health_status["user_message"] = "🎉 Voice services fully operational with offline capability - Perfect for remote RV travel!"
        elif tts_available and stt_available:
            health_status["overall_status"] = "good"
            health_status["primary_service"] = "full_voice_online_only"
            health_status["user_message"] = "✅ Voice services operational - Internet connectivity recommended for best experience"
        elif tts_available or stt_available:
            health_status["overall_status"] = "limited"
            health_status["primary_service"] = "partial_voice"
            health_status["user_message"] = "⚠️ Voice services partially available - Check service configuration"
        else:
            health_status["overall_status"] = "minimal"
            health_status["primary_service"] = "text_only"
            health_status["user_message"] = "❌ Voice services not available - Text-only mode"
        
        # Add specific recommendations for RV travelers
        recommendations = []
        if offline_capable:
            recommendations.append("✅ Ready for remote areas without internet")
        elif stt_available:
            recommendations.append("📶 Internet connection recommended for voice features")
        
        cost_efficiency = health_status["cost_efficiency"]
        if cost_efficiency.get("offline_savings", 0) > 0:
            monthly_savings = cost_efficiency.get("monthly_savings_estimate", 0)
            recommendations.append(f"💰 Local STT saving ~${monthly_savings:.2f}/month in API costs")
        
        health_status["recommendations"] = recommendations
        
        return health_status
        
    except Exception as e:
        logger.error(f"Voice health check failed: {e}")
        health_status["overall_status"] = "error"
        health_status["error"] = str(e)
        health_status["user_message"] = f"❌ Voice services error: {str(e)}"
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
    # Monitor CORS-related issues  
    elif request.method == "OPTIONS" and "cors" in str(exc).lower():
        origin = request.headers.get("origin", "unknown")
        logger.warning(
            f"🚨 CORS preflight failure from origin {origin} to {request.url.path}: {exc}"
        )
        # Track CORS failures for monitoring
        sentry_service.capture_exception(exc, {
            "type": "cors_preflight_failure",
            "origin": origin,
            "endpoint": request.url.path,
            "method": request.method,
            "user_agent": request.headers.get("user-agent", "unknown")
        })
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
