
"""
Health Check Endpoints
Basic health monitoring and system status endpoints.
"""

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import JSONResponse
from typing import Dict, Any
import asyncio
from datetime import datetime

from backend.app.core.config import settings
from backend.app.services.database import get_database_service
from backend.app.services.cache_service import cache_service

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
        db_service = await get_database_service()
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
        db_service = await get_database_service()
        await db_service.execute_query("SELECT 1")
        await cache_service.get("readiness_check")
        
        return {"status": "ready"}
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Service not ready: {str(e)}")

@router.get("/health/live")
async def liveness_check():
    """Kubernetes liveness probe"""
    return {"status": "alive", "timestamp": datetime.utcnow().isoformat()}
