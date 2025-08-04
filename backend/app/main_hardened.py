"""
PAM Backend Main Application - Hardened Version
This version uses import guards to prevent cascading failures from module import errors.
PAM remains functional even if other services fail to load.
"""

import asyncio
import os
from contextlib import asynccontextmanager
from datetime import datetime
from fastapi import FastAPI, Request, UploadFile, File, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, Response
from starlette.middleware.base import BaseHTTPMiddleware

# Import the import guard system
from app.core.import_guard import import_guard, safe_import_router, require_module

# Import critical components that MUST load
from app.core.database_pool import db_pool
from app.services.cache_service import cache_service
from app.core.websocket_manager import manager as websocket_manager
from app.core.middleware import setup_middleware
from app.core.monitoring_middleware import MonitoringMiddleware
from app.core.cors_config import cors_config
from app.core.logging import setup_logging, get_logger

# Import configuration and validation
from app.core.config import settings
from app.core.environment_validator import validate_environment

setup_logging()
logger = get_logger(__name__)

# CRITICAL IMPORTS - These must succeed or the app won't start
# PAM is considered critical and gets special treatment
critical_modules = [
    "app.api.v1.health",    # Health checks are critical
    "app.api.v1.pam",       # PAM is critical - must always work
    "app.api.v1.auth",      # Authentication is critical
]

# Register critical modules first
logger.info("🚀 Loading critical modules...")
try:
    import_guard.register_critical_modules(critical_modules)
    
    # Import critical modules directly for use
    from app.api.v1 import health, pam, auth
    
    logger.info("✅ All critical modules loaded successfully")
except Exception as e:
    logger.error(f"❌ Critical module loading failed: {e}")
    raise SystemExit(f"Cannot start application - critical modules failed: {e}")

# NON-CRITICAL IMPORTS - These can fail without crashing the app
# We'll use the import guard to load these safely
logger.info("🔄 Loading non-critical modules...")

# Import services that might fail
from app.services.monitoring_service import monitoring_service
from app.services.sentry_service import sentry_service

# Use safe imports for all non-critical modules
wins_router = safe_import_router("app.api.v1.wins")
wheels_router = safe_import_router("app.api.v1.wheels")
social_router = safe_import_router("app.api.v1.social")
monitoring_router = safe_import_router("app.api.v1.monitoring")
receipts_router = safe_import_router("app.api.v1.receipts")
subscription_router = safe_import_router("app.api.v1.subscription")
support_router = safe_import_router("app.api.v1.support")
admin_router = safe_import_router("app.api.v1.admin")
tts_router = safe_import_router("app.api.v1.tts")
search_router = safe_import_router("app.api.v1.search")
vision_router = safe_import_router("app.api.v1.vision")
voice_router = safe_import_router("app.api.v1.voice")
voice_conversation_router = safe_import_router("app.api.v1.voice_conversation")
profiles_router = safe_import_router("app.api.v1.profiles")
products_router = safe_import_router("app.api.v1.products")
orders_router = safe_import_router("app.api.v1.orders")
maintenance_router = safe_import_router("app.api.v1.maintenance")
custom_routes_router = safe_import_router("app.api.v1.custom_routes")
mapbox_router = safe_import_router("app.api.v1.mapbox")
user_settings_router = safe_import_router("app.api.v1.user_settings")
onboarding_router = safe_import_router("app.api.v1.onboarding")
performance_router = safe_import_router("app.api.v1.performance")

# Problem modules that have caused issues
camping_router = safe_import_router("app.api.v1.camping")
youtube_scraper_router = safe_import_router("app.api.v1.youtube_scraper")

# Additional routers that might exist
observability_router = safe_import_router("app.api.v1.observability")
voice_streaming_router = safe_import_router("app.api.v1.voice_streaming")
websocket_router = safe_import_router("app.api.websocket")
actions_router = safe_import_router("app.api.actions")
stripe_webhooks_router = safe_import_router("app.webhooks.stripe_webhooks")

# Log import status
import_status = import_guard.get_status()
logger.info(f"📊 Module loading complete: {import_status['total_loaded']} loaded, {import_status['total_failed']} failed")
if import_status['failed']:
    logger.warning(f"⚠️ Failed modules: {', '.join(import_status['failed'])}")

# Configuration validation
def validate_configuration():
    """Validate critical configuration settings"""
    validation_errors = []
    
    required_settings = [
        ("SUPABASE_URL", getattr(settings, 'SUPABASE_URL', None)),
        ("SUPABASE_KEY", getattr(settings, 'SUPABASE_KEY', None)),
        ("SECRET_KEY", getattr(settings, 'SECRET_KEY', None)),
    ]
    
    for setting_name, setting_value in required_settings:
        if not setting_value:
            validation_errors.append(f"Missing required setting: {setting_name}")
    
    if validation_errors:
        logger.error("❌ Configuration validation failed:")
        for error in validation_errors:
            logger.error(f"   - {error}")
        # Don't crash - PAM might still work with defaults
        logger.warning("⚠️ Continuing with configuration errors - some features may be limited")
    else:
        logger.info("✅ Configuration validation passed")

try:
    validate_configuration()
except Exception as env_error:
    logger.error(f"❌ Configuration validation error: {env_error}")
    logger.warning("⚠️ Continuing despite configuration errors")

# Create FastAPI app with lifespan management
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager"""
    logger.info("🚀 Starting PAM Backend (Hardened)")
    
    # Initialize services that can fail gracefully
    try:
        await monitoring_service.initialize()
    except Exception as e:
        logger.warning(f"⚠️ Monitoring service initialization failed: {e}")
    
    try:
        sentry_service.initialize()
    except Exception as e:
        logger.warning(f"⚠️ Sentry service initialization failed: {e}")
    
    # Start critical services
    logger.info("✅ Critical services initialized")
    
    yield
    
    # Cleanup
    logger.info("🛑 Shutting down PAM Backend")
    try:
        await monitoring_service.shutdown()
    except:
        pass  # Ignore shutdown errors

app = FastAPI(
    title="PAM Backend (Hardened)",
    version="2.0.0",
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    lifespan=lifespan
)

# Setup CORS - this is critical for frontend communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_config.allowed_origins,
    allow_credentials=True,
    allow_methods=cors_config.allowed_methods,
    allow_headers=cors_config.allowed_headers,
)

# Additional middleware setup
try:
    setup_middleware(app)
except Exception as e:
    logger.warning(f"⚠️ Middleware setup partially failed: {e}")

# Register CRITICAL routers first - these MUST work
logger.info("📍 Registering critical routes...")
app.include_router(health.router, prefix="/api/v1/health", tags=["Health"])
app.include_router(pam.router, prefix="/api/v1/pam", tags=["PAM - Critical"])
app.include_router(auth.router, prefix="/api/v1/auth", tags=["Authentication"])

# Register non-critical routers - these can fail
logger.info("📍 Registering optional routes...")

# Core features
if wins_router:
    app.include_router(wins_router, prefix="/api/v1/wins", tags=["Wins"])
else:
    logger.warning("⚠️ Wins module not available")

if wheels_router:
    app.include_router(wheels_router, prefix="/api/v1/wheels", tags=["Wheels"])
else:
    logger.warning("⚠️ Wheels module not available")

if social_router:
    app.include_router(social_router, prefix="/api/v1/social", tags=["Social"])
else:
    logger.warning("⚠️ Social module not available")

# Supporting features
if monitoring_router:
    app.include_router(monitoring_router, prefix="/api/v1/monitoring", tags=["Monitoring"])

if receipts_router:
    app.include_router(receipts_router, prefix="/api/v1/receipts", tags=["Receipts"])

if subscription_router:
    app.include_router(subscription_router, prefix="/api/v1/subscription", tags=["Subscription"])

if support_router:
    app.include_router(support_router, prefix="/api/v1/support", tags=["Support"])

if admin_router:
    app.include_router(admin_router, prefix="/api/v1/admin", tags=["Admin"])

# Voice and AI features
if tts_router:
    app.include_router(tts_router, prefix="/api/v1/tts", tags=["Text to Speech"])

if voice_router:
    app.include_router(voice_router, prefix="/api/v1/voice", tags=["Voice"])

if voice_conversation_router:
    app.include_router(voice_conversation_router, prefix="/api/v1/voice/conversation", tags=["Voice Conversation"])

if voice_streaming_router:
    app.include_router(voice_streaming_router, prefix="/api/v1/voice/streaming", tags=["Voice Streaming"])

# Additional features
if search_router:
    app.include_router(search_router, prefix="/api/v1/search", tags=["Search"])

if vision_router:
    app.include_router(vision_router, prefix="/api/v1/vision", tags=["Vision"])

if profiles_router:
    app.include_router(profiles_router, prefix="/api/v1/profiles", tags=["Profiles"])

if products_router:
    app.include_router(products_router, prefix="/api/v1/products", tags=["Products"])

if orders_router:
    app.include_router(orders_router, prefix="/api/v1/orders", tags=["Orders"])

if maintenance_router:
    app.include_router(maintenance_router, prefix="/api/v1/maintenance", tags=["Maintenance"])

if custom_routes_router:
    app.include_router(custom_routes_router, prefix="/api/v1/custom", tags=["Custom Routes"])

if mapbox_router:
    app.include_router(mapbox_router, prefix="/api/v1/mapbox", tags=["Mapbox"])

if user_settings_router:
    app.include_router(user_settings_router, prefix="/api/v1/settings", tags=["User Settings"])

if onboarding_router:
    app.include_router(onboarding_router, prefix="/api/v1/onboarding", tags=["Onboarding"])

if performance_router:
    app.include_router(performance_router, prefix="/api/v1/performance", tags=["Performance"])

# Problem modules - these have caused issues before
if camping_router:
    app.include_router(camping_router, prefix="/api/v1", tags=["Camping Locations"])
else:
    logger.warning("⚠️ Camping module not available - import failed")

if youtube_scraper_router:
    app.include_router(youtube_scraper_router, prefix="/api/v1/youtube", tags=["YouTube Scraper"])
else:
    logger.warning("⚠️ YouTube scraper module not available - import failed")

# System routers
if observability_router:
    app.include_router(observability_router, prefix="/api/v1/observability", tags=["Observability"])

if websocket_router:
    app.include_router(websocket_router, prefix="/api/websocket", tags=["WebSocket"])

if actions_router:
    app.include_router(actions_router, prefix="/api/actions", tags=["Actions"])

if stripe_webhooks_router:
    app.include_router(stripe_webhooks_router, prefix="/webhooks/stripe", tags=["Stripe Webhooks"])

# Root endpoint
@app.get("/")
async def root():
    """Root endpoint with system status"""
    import_status = import_guard.get_status()
    return {
        "service": "PAM Backend (Hardened)",
        "status": "operational",
        "critical_services": {
            "pam": "active",
            "auth": "active",
            "health": "active"
        },
        "modules": {
            "loaded": import_status['total_loaded'],
            "failed": import_status['total_failed'],
            "failed_list": import_status['failed'] if import_status['failed'] else None
        },
        "message": "PAM is operational. Some optional features may be unavailable.",
        "timestamp": datetime.utcnow().isoformat()
    }

# Import status endpoint
@app.get("/api/v1/system/import-status")
async def get_import_status():
    """Get detailed import status for debugging"""
    return import_guard.get_status()

# PAM-specific health check
@app.get("/api/v1/pam/health")
async def pam_health_check():
    """PAM-specific health check"""
    return {
        "status": "healthy",
        "service": "pam",
        "capabilities": ["chat", "websocket", "voice"],
        "timestamp": datetime.utcnow().isoformat()
    }

logger.info(f"✅ PAM Backend started successfully - {import_status['total_loaded']} modules loaded")
if import_status['failed']:
    logger.info(f"⚠️ Running with {import_status['total_failed']} failed modules - PAM remains operational")