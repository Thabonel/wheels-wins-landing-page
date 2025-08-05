
"""
Health Check Endpoints
Basic health monitoring and system status endpoints.
"""

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import JSONResponse
from typing import Dict, Any
import asyncio
from datetime import datetime

from app.core.config import settings
from app.services.database import get_database_service
from app.services.cache_service import cache_service

router = APIRouter()

@router.get("/health")
async def health_check():
    """Basic health check endpoint"""
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "version": settings.VERSION,
        "environment": settings.ENVIRONMENT
    }

@router.get("/config")
async def get_frontend_config():
    """Get frontend configuration including debug feature flags"""
    return {
        "environment": settings.ENVIRONMENT,
        "debug_features": {
            "enabled": settings.ENABLE_DEBUG_FEATURES and settings.ENVIRONMENT == "development",
            "show_debug_tokens": settings.SHOW_DEBUG_TOKENS and settings.ENVIRONMENT == "development",
            "enable_reasoning_debug": settings.ENABLE_REASONING_DEBUG and settings.ENVIRONMENT == "development",
        },
        "version": settings.VERSION
    }

@router.get("/health/detailed")
async def detailed_health_check():
    """Detailed health check with service status"""
    health_status = {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "version": settings.VERSION,
        "environment": settings.ENVIRONMENT,
        "services": {}
    }
    
    # Check database connectivity
    try:
        db_service = get_database_service()
        await db_service.execute_query("SELECT 1")
        health_status["services"]["database"] = {
            "status": "healthy",
            "response_time_ms": 0  # Would measure actual response time
        }
    except Exception as e:
        health_status["services"]["database"] = {
            "status": "unhealthy",
            "error": str(e)
        }
        health_status["status"] = "degraded"
    
    # Check cache connectivity
    try:
        await cache_service.get("health_check_key")
        health_status["services"]["cache"] = {
            "status": "healthy",
            "response_time_ms": 0
        }
    except Exception as e:
        health_status["services"]["cache"] = {
            "status": "unhealthy", 
            "error": str(e)
        }
        health_status["status"] = "degraded"
    
    return health_status

@router.get("/health/ready")
async def readiness_check():
    """Kubernetes readiness probe"""
    try:
        # Check critical services
        db_service = get_database_service()
        await db_service.execute_query("SELECT 1")
        await cache_service.get("readiness_check")
        
        return {"status": "ready"}
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Service not ready: {str(e)}")

@router.get("/health/live")
async def liveness_check():
    """Kubernetes liveness probe"""
    return {"status": "alive", "timestamp": datetime.utcnow().isoformat()}

@router.get("/health/redis")
async def redis_health_check():
    """Check Redis connectivity and configuration"""
    import os
    from app.core.config import settings
    
    redis_status = {
        "timestamp": datetime.utcnow().isoformat(),
        "configuration": {},
        "connection": {},
        "cache_service": {}
    }
    
    # Check Redis URL configuration
    redis_url_from_settings = getattr(settings, 'REDIS_URL', None)
    redis_url_from_env = os.environ.get('REDIS_URL')
    
    redis_status["configuration"]["settings_redis_url"] = bool(redis_url_from_settings)
    redis_status["configuration"]["env_redis_url"] = bool(redis_url_from_env)
    
    # Mask the URLs for security
    if redis_url_from_settings:
        masked_settings_url = redis_url_from_settings.split('@')[0] + '@***' if '@' in redis_url_from_settings else redis_url_from_settings
        redis_status["configuration"]["settings_url_preview"] = masked_settings_url
    
    if redis_url_from_env:
        masked_env_url = redis_url_from_env.split('@')[0] + '@***' if '@' in redis_url_from_env else redis_url_from_env
        redis_status["configuration"]["env_url_preview"] = masked_env_url
    
    # Check cache service status
    redis_status["cache_service"]["initialized"] = cache_service.redis is not None
    
    # Test Redis connection
    try:
        if cache_service.redis:
            await cache_service.redis.ping()
            redis_status["connection"]["status"] = "connected"
            redis_status["connection"]["ping"] = "successful"
            
            # Get Redis info
            info = await cache_service.redis.info()
            redis_status["connection"]["redis_version"] = info.get("redis_version", "unknown")
            redis_status["connection"]["connected_clients"] = info.get("connected_clients", 0)
            redis_status["connection"]["used_memory_human"] = info.get("used_memory_human", "unknown")
        else:
            redis_status["connection"]["status"] = "not_connected"
            redis_status["connection"]["message"] = "Redis client not initialized"
    except Exception as e:
        redis_status["connection"]["status"] = "error"
        redis_status["connection"]["error"] = f"{type(e).__name__}: {str(e)}"
    
    # Overall status
    redis_status["healthy"] = redis_status["connection"].get("status") == "connected"
    
    return redis_status
