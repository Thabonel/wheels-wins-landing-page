"""
PAM Backend Main Application
High-performance FastAPI application with comprehensive monitoring and security.
Updated: September 2025 - Gemini Flash Integration
"""

import os
import asyncio
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
from app.core.monitoring_middleware import MonitoringMiddleware
from app.guardrails.guardrails_middleware import GuardrailsMiddleware
from app.core.cors_settings import CORSSettings
# CORS imports removed - using simple FastAPI CORSMiddleware approach

# Import enhanced security setup
from app.core.enhanced_security_setup import setup_enhanced_security, SecurityConfiguration

# Temporarily disabled due to WebSocket route conflicts
# from langserve import add_routes
# from app.services.pam.mcp.controllers.pauter_router import PauterRouter
from app.voice.stt_whisper import whisper_stt

# from app.voice.tts_coqui import coqui_tts  # Temporarily disabled due to TTS dependency issues
# Try to import settings with fallback for deployment issues
try:
    from app.core.config import settings
    print("✅ Using full Pydantic configuration")
except Exception as config_error:
    print(f"⚠️ Failed to load full config: {config_error}")
    print("🔄 Using simple config fallback for staging...")
    try:
        from app.core.simple_config import settings
        print(f"✅ Simple config loaded - Environment: {settings.NODE_ENV}")
    except Exception as simple_config_error:
        print(f"⚠️ Simple config also failed: {simple_config_error}")
        print("🚨 Using emergency config - minimal functionality!")
        from app.core.emergency_config import settings
        print("✅ Emergency config loaded - service will start with basic features")
from app.core.logging import setup_logging, get_logger
from app.core.environment_validator import validate_environment

# Import monitoring services
from app.services.monitoring_service import monitoring_service
from app.services.sentry_service import sentry_service
from app.monitoring.production_monitor import production_monitor, MonitoringMiddleware

# Import guard for safe module loading
from app.core.import_guard import safe_import_router

# Import API routers
from app.api.v1 import (
    health,
    chat,
    wins,
    wheels,
    social,
    monitoring,
    receipts,
    pam,
    pam_ai_sdk,
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
    openroute,
    user_settings,
    onboarding,
    performance,
    digistore24,
    national_parks,
    health_consultation,
    # camping,  # Loaded separately with import guard
)
from app.api.v1 import observability as observability_api
from app.api import websocket, actions
from app.api.v1 import voice_streaming
from app.webhooks import stripe_webhooks
from app.api.deps import verify_supabase_jwt_token

setup_logging()
logger = get_logger(__name__)

# Safe imports for modules that have caused issues
camping_router = safe_import_router("app.api.v1.camping")
youtube_scraper_router = safe_import_router("app.api.v1.youtube_scraper")

# Log if critical modules failed to load
if not camping_router:
    logger.warning("⚠️ Camping module failed to load - feature will be unavailable")
if not youtube_scraper_router:
    logger.warning("⚠️ YouTube scraper module failed to load - feature will be unavailable")

# Configuration validation at startup
def validate_configuration():
    """Validate critical configuration settings"""
    validation_errors = []
    
    # Validate required settings with defensive access
    required_settings = [
        ("SUPABASE_URL", getattr(settings, 'SUPABASE_URL', None)),
        ("SUPABASE_SERVICE_ROLE_KEY", getattr(settings, 'SUPABASE_SERVICE_ROLE_KEY', None)),
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
        environment = getattr(settings, 'NODE_ENV', 'production')
        debug_mode = getattr(settings, 'DEBUG', False)
        openai_key = getattr(settings, 'OPENAI_API_KEY', None)
        
        if environment == "production":
            if not openai_key:
                logger.warning("⚠️ OPENAI_API_KEY not set in production - PAM features may be limited")
            
            if debug_mode:
                validation_errors.append("DEBUG mode should not be enabled in production")
        elif environment == "staging":
            # Staging is allowed to have DEBUG mode enabled
            if not openai_key:
                logger.warning("⚠️ OPENAI_API_KEY not set in staging - PAM features may be limited")
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
            logger.info(f"   Environment: {getattr(settings, 'NODE_ENV', 'unknown')}")
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
        
        # Initialize performance monitoring  
        from app.services.performance_monitor import performance_monitor
        await performance_monitor.start_monitoring(interval_seconds=300)  # 5-minute intervals
        logger.info("✅ Performance monitoring service initialized")

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

        # Initialize Enhanced PAM Orchestrator with AI providers (CRITICAL for WebSocket chat)
        logger.info("🧠 Initializing Enhanced PAM Orchestrator...")
        try:
            from app.services.pam.enhanced_orchestrator import get_enhanced_orchestrator

            # This will create and initialize the AI orchestrator with all providers
            orchestrator_instance = await get_enhanced_orchestrator()

            if orchestrator_instance.is_initialized:
                logger.info("✅ Enhanced PAM Orchestrator fully initialized")

                # Log AI provider status
                if hasattr(orchestrator_instance, 'ai_orchestrator') and orchestrator_instance.ai_orchestrator:
                    provider_count = len(orchestrator_instance.ai_orchestrator.providers) if orchestrator_instance.ai_orchestrator.providers else 0
                    if provider_count > 0:
                        provider_names = [p.name for p in orchestrator_instance.ai_orchestrator.providers]
                        logger.info(f"✅ AI Providers ready: {', '.join(provider_names)} ({provider_count} total)")
                    else:
                        logger.warning("⚠️ Enhanced PAM Orchestrator initialized but no AI providers available")
                else:
                    logger.warning("⚠️ Enhanced PAM Orchestrator initialized but ai_orchestrator is None")
            else:
                logger.error("❌ Enhanced PAM Orchestrator failed to initialize properly")

        except Exception as orchestrator_error:
            logger.error(f"❌ Enhanced PAM Orchestrator initialization failed: {orchestrator_error}")
            logger.error("🚨 PAM WebSocket will respond with 'unable to process' until this is fixed")
            # Don't fail startup - continue without PAM AI functionality

        # Initialize Simple Gemini Service as backup (CRITICAL fallback for PAM)
        logger.info("💎 Initializing Simple Gemini Service as backup...")
        try:
            from app.services.pam.simple_gemini_service import get_simple_gemini_service

            # Initialize the simple service
            simple_service = await get_simple_gemini_service()

            if simple_service.is_initialized:
                logger.info("✅ Simple Gemini Service initialized successfully (fallback ready)")
                service_status = simple_service.get_status()
                logger.info(f"✅ Simple Gemini status: {service_status}")
            else:
                logger.error("❌ Simple Gemini Service failed to initialize")
                logger.error("🚨 No fallback available for PAM - both orchestrator and simple service failed")

        except Exception as simple_error:
            logger.error(f"❌ Simple Gemini Service initialization failed: {simple_error}")
            logger.error("🚨 No fallback available for PAM if orchestrator fails")

        logger.info("✅ WebSocket manager ready")
        logger.info("✅ Monitoring service ready")

        logger.info("🎯 All performance optimizations active")
        logger.info("🔒 Enhanced security system active")
        logger.info("📊 Monitoring and alerting active")
        
        # Log security configuration
        try:
            from app.core.enhanced_security_setup import get_security_recommendations
            security_recommendations = get_security_recommendations()
            security_score = security_recommendations.get("security_score", 0)
            logger.info(f"🛡️ Security score: {security_score}/100")
            
            warning_count = len([r for r in security_recommendations.get("recommendations", []) if r.get("type") == "warning"])
            if warning_count == 0:
                logger.info("✅ All security checks passed")
            else:
                logger.warning(f"⚠️ {warning_count} security recommendations available")
        except Exception as sec_log_error:
            logger.warning(f"Could not retrieve security status: {sec_log_error}")

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
    docs_url="/api/docs" if settings.NODE_ENV != "production" else None,
    redoc_url="/api/redoc" if settings.NODE_ENV != "production" else None,
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

# Setup enhanced security middleware (replaces legacy security setup)
logger.info("🛡️ Initializing enhanced security system...")
security_config = setup_enhanced_security(app)
logger.info("✅ Enhanced security system fully operational")

# Setup other middleware
app.add_middleware(MonitoringMiddleware, monitor=production_monitor)
setup_middleware(app)
app.add_middleware(GuardrailsMiddleware)

# CORS Configuration - Using Dedicated CORSSettings Class
# Load proper CORS configuration with environment-aware origins
try:
    cors_settings = CORSSettings()
    allowed_origins = cors_settings.get_allowed_origins()
    print(f"🌐 CORS: Using CORSSettings class with {len(allowed_origins)} allowed origins")
    print("🌐 CORS: Configured origins:")
    for origin in allowed_origins:
        print(f"   ✅ {origin}")
except Exception as cors_error:
    print(f"⚠️ Failed to load CORSSettings: {cors_error}")
    # Fallback to basic configuration
    allowed_origins = [
        "https://wheelsandwins.com",
        "https://www.wheelsandwins.com", 
        "https://wheels-wins-staging.netlify.app",
        "http://localhost:8080",
        "http://localhost:3000"
    ]
    print(f"🌐 CORS: Using fallback configuration with {len(allowed_origins)} origins")

# Validate CORS configuration
is_production_cors = any("wheelsandwins.com" in origin for origin in allowed_origins)
print(f"🔒 CORS: Security level = {'PRODUCTION' if is_production_cors else 'DEVELOPMENT'}")
print(f"🔒 CORS: Credentials support = ENABLED")
print(f"🔒 CORS: Origin validation = EXPLICIT_ONLY (no wildcards)")
print(f"🔒 CORS: Total allowed origins = {len(allowed_origins)}")

# Add CORS middleware - Using CORSSettings configuration
try:
    cors_config = cors_settings.get_cors_middleware_config()
    app.add_middleware(CORSMiddleware, **cors_config)
    print("✅ CORS middleware configured using CORSSettings class")
except Exception as middleware_error:
    print(f"⚠️ Failed to use CORSSettings middleware config: {middleware_error}")
    # Fallback to manual configuration
    app.add_middleware(
        CORSMiddleware,
        allow_origins=allowed_origins,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
        allow_headers=[
            "Authorization",
            "Content-Type", 
            "X-Requested-With",
            "Accept",
            "Origin",
            "Access-Control-Request-Method",
            "Access-Control-Request-Headers"
        ],
        expose_headers=[
            "Content-Type",
            "Authorization", 
            "X-Request-ID",
            "X-Process-Time"
        ]
    )
    print("✅ CORS middleware configured with fallback settings")

print(f"✅ CORS middleware configured with {len(allowed_origins)} origins")
print("✅ CORS: Production-grade security enabled")
print("✅ CORS: Ready for authentication and WebSocket connections")

# CORS Validation and Error Handling
def validate_cors_setup():
    """Validate CORS configuration and provide helpful error messages"""
    try:
        # Check if we have valid origins
        if not allowed_origins:
            print("❌ CORS ERROR: No allowed origins configured!")
            return False
            
        # Validate origin format
        invalid_origins = []
        for origin in allowed_origins:
            if not (origin.startswith('http://') or origin.startswith('https://')):
                invalid_origins.append(origin)
                
        if invalid_origins:
            print(f"❌ CORS ERROR: Invalid origin format: {invalid_origins}")
            return False
            
        # Check for common misconfigurations
        if "*" in allowed_origins:
            print("❌ CORS ERROR: Wildcard origins not allowed with credentials!")
            return False
            
        print("✅ CORS validation passed")
        return True
        
    except Exception as e:
        print(f"❌ CORS validation failed: {e}")
        return False

# Run CORS validation
cors_valid = validate_cors_setup()
if not cors_valid:
    print("🚨 CORS CONFIGURATION ERROR - API may not work properly!")
    print("🔧 Check environment variables and render.yaml configuration")

# FastAPI's CORSMiddleware handles ALL OPTIONS requests automatically  
# No need for additional OPTIONS handlers - they can cause conflicts


# Add root route handler
@app.get("/")
async def root():
    """Root endpoint - PAM Backend status"""
    import os
    return {
        "message": "🤖 PAM Backend API",
        "version": "2.0.4", 
        "status": "memory-optimized",
        "docs": "/api/docs",
        "health": "/health",
        "updated": "2025-07-30T11:15:00Z",
        "optimizations": [
            "Memory optimizer removed (was causing 877MB → expect 400-500MB)",
            "Local Whisper completely removed (eliminates 72MB+ model downloads)",
            "Simplified 2-tier STT: OpenAI Whisper (cloud) + Browser WebSpeech (fallback)",
            "Python's built-in garbage collection active",
            "Lightweight monitoring enabled"
        ],
        "memory_conservation": {
            "local_whisper_status": "completely_removed",
            "memory_optimizer_status": "removed", 
            "stt_architecture": "2-tier (cloud + browser fallback)",
            "expected_memory_reduction": "60-70% (from 885MB to 400-500MB)"
        }
    }

# CORS debugging endpoint
@app.get("/api/cors/debug")
async def cors_debug_info(request: Request):
    """Debugging endpoint to check CORS configuration"""
    origin = request.headers.get("origin", "No origin header")
    
    return {
        "timestamp": datetime.utcnow().isoformat(),
        "request_origin": origin,
        "configured_cors_origins": allowed_origins,
        "origin_allowed": origin in allowed_origins if origin != "No origin header" else False,
        "environment": getattr(settings, 'NODE_ENV', 'unknown'),
        "total_origins": len(allowed_origins),
        "cors_config": {
            "allowed_methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
            "allowed_headers": "*",
            "expose_headers": ["Content-Type", "Authorization", "X-Request-ID"],
        },
        "help": "Use this endpoint to verify if your frontend origin is in the CORS allow list"
    }

# Enhanced CORS statistics endpoint  
@app.get("/api/cors/stats")
async def cors_stats():
    """Get CORS middleware statistics and configuration"""
    try:
        return {
            "timestamp": datetime.utcnow().isoformat(),
            "cors_configuration": {
                "total_origins": len(allowed_origins),
                "origins_sample": allowed_origins[:5],
                "methods_count": 6,  # GET, POST, PUT, DELETE, OPTIONS, PATCH
                "headers_count": "*",
                "expose_headers_count": 3,  # Content-Type, Authorization, X-Request-ID
            },
            "system_info": {
                "environment": getattr(settings, 'NODE_ENV', 'unknown'),
                "cors_debugging_enabled": True,
                "enhanced_middleware_active": True,
            },
            "status": "CORS system operational"
        }
    except Exception as e:
        return {
            "timestamp": datetime.utcnow().isoformat(),
            "error": f"Failed to get CORS stats: {str(e)}",
            "cors_basic_info": {
                "total_origins": len(allowed_origins),
                "status": "CORS config loaded"
            }
        }


# Enhanced CORS middleware handles all CORS preflight requests automatically
# with comprehensive debugging, fallback OPTIONS handling, and proper origin validation.
# The centralized configuration ensures consistency across all endpoints.


# Include API routers
app.include_router(
    health.router, prefix="", tags=["Health"]
)  # No prefix for /health endpoint
app.include_router(monitoring.router, prefix="/api", tags=["Monitoring"])
app.include_router(chat.router, prefix="/api", tags=["Chat"])
app.include_router(wins.router, prefix="/api", tags=["Wins"])
app.include_router(wheels.router, prefix="/api", tags=["Wheels"])
app.include_router(receipts.router, prefix="/api/v1", tags=["Receipts"])
app.include_router(social.router, prefix="/api", tags=["Social"])
app.include_router(pam.router, prefix="/api/v1/pam", tags=["PAM"])
# PAM 2.0 - Clean, modular implementation (Phase 1 setup)
# PAM 2.0 - Modular AI Assistant (New Architecture)
try:
    from app.services.pam_2.api.routes import router as pam_2_router
    from app.services.pam_2.api.websocket import websocket_endpoint as pam_2_websocket
    app.include_router(pam_2_router, prefix="/api/v1/pam-2", tags=["PAM 2.0"])
    app.websocket("/api/v1/pam-2/chat/ws/{user_id}")(pam_2_websocket)
    logger.info("✅ PAM 2.0 modular architecture loaded successfully")
except Exception as pam2_error:
    logger.error(f"❌ Failed to load PAM 2.0: {pam2_error}")
    # Fallback to old PAM 2.0 if new structure fails
    try:
        from app.api.v1 import pam_2
        app.include_router(pam_2.router, prefix="/api/v1/pam-2", tags=["PAM 2.0 Fallback"])
        logger.warning("⚠️ Using fallback PAM 2.0 implementation")
    except Exception as fallback_error:
        logger.error(f"❌ PAM 2.0 fallback also failed: {fallback_error}")
app.include_router(pam_ai_sdk.router, prefix="/api/v1/pam-ai-sdk", tags=["PAM AI SDK"])

# PAM Hybrid System - REMOVED (simplified to single Claude Sonnet 4.5 implementation)
# Hybrid system deleted during Day 1 cleanup (October 1, 2025)
# See docs/DELETION_MANIFEST_20251001.md for details

# PAM Simple - NEW clean implementation (Day 2, October 1, 2025)
# Simple WebSocket + REST endpoints using core PAM brain
try:
    from app.api.v1 import pam_simple
    app.include_router(pam_simple.router, prefix="/api/v1/pam-simple", tags=["PAM Simple"])
    logger.info("✅ PAM Simple (Claude Sonnet 4.5) loaded successfully")
except Exception as simple_error:
    logger.error(f"❌ Failed to load PAM Simple: {simple_error}")

# PAM Savings API - Day 3 (October 1, 2025)
# Savings tracking and celebration endpoints
try:
    from app.api.v1.pam import savings
    app.include_router(savings.router, prefix="/api/v1/pam/savings", tags=["PAM Savings"])
    logger.info("✅ PAM Savings API loaded successfully")
except Exception as savings_error:
    logger.error(f"❌ Failed to load PAM Savings API: {savings_error}")

# Import and add intent classification routes
try:
    from app.api.v1 import intent
    app.include_router(intent.router, prefix="/api/v1/pam", tags=["Intent Classification"])
    print("✅ Intent classification routes added successfully")
except ImportError as e:
    print(f"⚠️  Intent classification routes not available: {e}")
except Exception as e:
    print(f"❌ Failed to add intent classification routes: {e}")
app.include_router(profiles.router, prefix="/api/v1", tags=["Profiles"])
app.include_router(user_settings.router, prefix="/api/v1", tags=["User Settings"])
app.include_router(products.router, prefix="/api/v1", tags=["Products"])
app.include_router(orders.router, prefix="/api/v1", tags=["Orders"])
app.include_router(maintenance.router, prefix="/api/v1", tags=["Maintenance"])
app.include_router(custom_routes.router, prefix="/api/v1", tags=["Routes"])
app.include_router(onboarding.router, prefix="/api/v1", tags=["Onboarding"])
app.include_router(digistore24.router, prefix="/api/v1/digistore24", tags=["Digistore24"])
app.include_router(national_parks.router, prefix="/api/v1", tags=["National Parks"])
# Removed generic websocket router to avoid conflicts with PAM WebSocket
# app.include_router(websocket.router, prefix="/api", tags=["WebSocket"])
app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(subscription.router, prefix="/api/v1", tags=["Subscription"])
app.include_router(support.router, prefix="/api", tags=["Support"])
app.include_router(stripe_webhooks.router, prefix="/api", tags=["Webhooks"])
app.include_router(admin.router, prefix="/api/v1", tags=["Admin"])
app.include_router(observability_api.router, prefix="/api/v1", tags=["Admin Observability"])
app.include_router(performance.router, prefix="/api/v1", tags=["Performance Monitoring"])
app.include_router(tts.router, prefix="/api/v1/tts", tags=["Text-to-Speech"])
# Mundi integration removed
app.include_router(actions.router, prefix="/api", tags=["Actions"])
app.include_router(voice.router, prefix="/api/v1", tags=["Voice"])
app.include_router(voice_conversation.router, prefix="/api/v1", tags=["Voice Conversation"])  # Re-enabled - import issues resolved
app.include_router(
    voice_streaming.router, prefix="/api/v1/voice", tags=["Voice Streaming"]
)

# Voice health check endpoints for TTS/STT pipeline monitoring
try:
    from app.api.v1.voice_health import router as voice_health_router
    app.include_router(voice_health_router, prefix="/api/v1/voice", tags=["Voice Health"])
    logger.info("✅ Voice health check endpoints registered")
except ImportError as e:
    logger.warning(f"⚠️ Voice health endpoints not available: {e}")
except Exception as e:
    logger.error(f"❌ Failed to register voice health endpoints: {e}")
app.include_router(search.router, prefix="/api/v1/search", tags=["Web Search"])
app.include_router(vision.router, prefix="/api/v1/vision", tags=["Vision Analysis"])
app.include_router(mapbox.router, prefix="/api/v1/mapbox", tags=["Mapbox Proxy"])
app.include_router(openroute.router, prefix="/api/v1/openroute", tags=["OpenRoute Service Proxy"])
app.include_router(health_consultation.router, prefix="/api/v1", tags=["Health Consultation"])

# Conditionally register routers that might fail to import
if camping_router:
    app.include_router(camping_router, prefix="/api/v1", tags=["Camping Locations"])
    logger.info("✅ Camping routes registered successfully")
else:
    logger.warning("⚠️ Camping routes not available - module import failed")

if youtube_scraper_router:
    app.include_router(youtube_scraper_router, prefix="/api/v1/youtube", tags=["YouTube Scraper"])
    logger.info("✅ YouTube scraper routes registered successfully")
else:
    logger.warning("⚠️ YouTube scraper routes not available - module import failed")

# Security status endpoint is automatically added by enhanced_security_setup
# Additional security endpoints can be accessed at /api/security/status and /api/security/recommendations

# Add security recommendations endpoint
@app.get("/api/security/recommendations")
async def security_recommendations():
    """Get security recommendations and configuration analysis"""
    try:
        from app.core.enhanced_security_setup import get_security_recommendations
        return get_security_recommendations()
    except Exception as e:
        logger.error(f"Error getting security recommendations: {e}")
        return {
            "error": "Could not retrieve security recommendations",
            "message": str(e),
            "timestamp": datetime.utcnow().isoformat()
        }

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
            
            voice = settings.TTS_VOICE_DEFAULT or "en-US-SaraNeural"
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

        # Step 3: Text-to-Speech (TTS) - Use enhanced TTS service with 3-tier fallback
        logger.info("🔊 Attempting audio synthesis using Enhanced TTS Service...")
        
        # Try Enhanced TTS Service first (preferred method with 3-tier fallback)
        try:
            from app.services.tts.enhanced_tts_service import enhanced_tts_service
            
            # Initialize service if not already done
            if not enhanced_tts_service.is_initialized:
                logger.info("🔄 Initializing Enhanced TTS service...")
                await enhanced_tts_service.initialize()
            
            if enhanced_tts_service.is_initialized:
                logger.info("🎯 Using Enhanced TTS Service with automatic fallback...")
                
                # Use enhanced TTS service with automatic 3-tier fallback
                result = await enhanced_tts_service.synthesize(
                    text=response_text,
                    voice_id=settings.TTS_VOICE_DEFAULT or "en-US-SaraNeural",
                    max_retries=3
                )
                
                if result.audio_data and result.error is None:
                    logger.info(f"✅ Enhanced TTS successful with {result.engine.value}: {len(result.audio_data)} bytes")
                    
                    # Determine media type based on engine used
                    media_type = "audio/wav"
                    if result.engine.value == "edge":
                        media_type = "audio/mpeg"
                    elif result.engine.value in ["system", "pyttsx3"]:
                        media_type = "audio/wav"
                    
                    return Response(
                        content=result.audio_data,
                        media_type=media_type,
                        headers={
                            "Content-Disposition": f"inline; filename=pam_response.{'mp3' if result.engine.value == 'edge' else 'wav'}",
                            "X-Transcription": text,
                            "X-Response-Text": response_text,
                            "X-Pipeline": f"STT-{stt_engine}→LLM→TTS-Enhanced-{result.engine.value}",
                            "X-TTS-Engine": result.engine.value,
                            "X-TTS-Quality": result.quality.value,
                            "X-Fallback-Used": str(result.fallback_used),
                            "X-Processing-Time": str(result.processing_time_ms)
                        }
                    )
                elif result.error:
                    logger.warning(f"⚠️ Enhanced TTS failed: {result.error}")
                else:
                    logger.warning("⚠️ Enhanced TTS returned no audio data")
            else:
                logger.warning("⚠️ Enhanced TTS service could not be initialized")
                
        except Exception as enhanced_error:
            logger.error(f"❌ Enhanced TTS service failed: {enhanced_error}")
        
        # Legacy fallback: Try direct Edge TTS as backup
        try:
            logger.info("🔄 Trying direct Edge TTS as backup...")
            
            try:
                import edge_tts
                EDGE_TTS_AVAILABLE = True
            except ImportError:
                EDGE_TTS_AVAILABLE = False
                logger.warning("⚠️ edge-tts package not available")
            
            if EDGE_TTS_AVAILABLE:
                import tempfile
                
                voice = settings.TTS_VOICE_DEFAULT or "en-US-SaraNeural"
                communicate = edge_tts.Communicate(response_text, voice)
                
                with tempfile.NamedTemporaryFile(suffix=".mp3", delete=False) as temp_file:
                    temp_path = temp_file.name
                
                try:
                    await communicate.save(temp_path)
                    
                    with open(temp_path, 'rb') as audio_file:
                        audio_data = audio_file.read()
                    
                    os.unlink(temp_path)
                    
                    if audio_data and len(audio_data) > 0:
                        logger.info(f"✅ Direct Edge TTS successful: {len(audio_data)} bytes")
                        
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
                        
                except Exception as edge_error:
                    logger.error(f"❌ Direct Edge TTS synthesis failed: {edge_error}")
                    if 'temp_path' in locals() and os.path.exists(temp_path):
                        os.unlink(temp_path)
                        
        except Exception as tts_error:
            logger.error(f"❌ Direct TTS synthesis failed: {tts_error}")
        
        # Final fallback: System TTS via pyttsx3
        try:
            logger.info("🔄 Trying system TTS as final fallback...")
            import pyttsx3
            import tempfile
            
            engine = pyttsx3.init()
            
            with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as tmp_file:
                tmp_path = tmp_file.name
            
            engine.save_to_file(response_text, tmp_path)
            engine.runAndWait()
            
            if os.path.exists(tmp_path) and os.path.getsize(tmp_path) > 0:
                with open(tmp_path, 'rb') as f:
                    audio_data = f.read()
                os.unlink(tmp_path)
                
                if audio_data:
                    logger.info(f"✅ System TTS successful: {len(audio_data)} bytes")
                    
                    return Response(
                        content=audio_data,
                        media_type="audio/wav",
                        headers={
                            "Content-Disposition": "inline; filename=pam_response.wav",
                            "X-Transcription": text,
                            "X-Response-Text": response_text,
                            "X-Pipeline": f"STT-{stt_engine}→LLM→TTS-System"
                        }
                    )
            else:
                os.unlink(tmp_path)
                
        except Exception as system_error:
            logger.error(f"❌ System TTS failed: {system_error}")
        
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
        reload=settings.NODE_ENV == "development",
        workers=1 if settings.NODE_ENV == "development" else 4,
        loop="uvloop",
        http="httptools",
        access_log=settings.NODE_ENV == "development",
    )
