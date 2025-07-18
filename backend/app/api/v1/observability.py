"""
Admin API endpoints for AI Agent Observability
Integrated with existing admin authentication system
"""

from fastapi import APIRouter, HTTPException, Depends
from typing import Dict, Any
import logging

from app.observability.config import observability
from app.observability.monitor import global_monitor
from app.core.config import get_settings
from app.api.deps import verify_supabase_jwt_token

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/observability", tags=["observability"])

def verify_admin_access(jwt_payload: Dict[str, Any] = Depends(verify_supabase_jwt_token)):
    """Verify admin access using JWT token"""
    user_role = jwt_payload.get('role', '')
    app_metadata = jwt_payload.get('app_metadata', {})
    
    # Check if user has admin role
    if user_role != 'admin' and app_metadata.get('role') != 'admin':
        raise HTTPException(status_code=403, detail="Admin access required")
    
    return jwt_payload

@router.get("/status")
async def get_observability_status(
    _: Dict[str, Any] = Depends(verify_admin_access)
) -> Dict[str, Any]:
    """Get current observability status"""
    try:
        status = observability.get_status()
        metrics = global_monitor.get_metrics()
        dashboard_summary = global_monitor.get_dashboard_summary()
        
        return {
            "status": "success",
            "data": {
                "configuration": status,
                "metrics": metrics,
                "dashboard_summary": dashboard_summary
            }
        }
    except Exception as e:
        logger.error(f"Failed to get observability status: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/health")
async def get_observability_health(
    _: Dict[str, Any] = Depends(verify_admin_access)
) -> Dict[str, Any]:
    """Health check for observability platforms"""
    try:
        health = global_monitor.health_check()
        return {
            "status": "success",
            "data": health
        }
    except Exception as e:
        logger.error(f"Failed to get observability health: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/initialize")
async def initialize_observability(
    _: Dict[str, Any] = Depends(verify_admin_access)
) -> Dict[str, Any]:
    """Initialize observability platforms"""
    try:
        if not observability.is_enabled():
            raise HTTPException(status_code=400, detail="Observability is disabled in configuration")
        
        observability.initialize_all()
        status = observability.get_status()
        
        return {
            "status": "success",
            "message": "Observability platforms initialized",
            "data": status
        }
    except Exception as e:
        logger.error(f"Failed to initialize observability: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/reset-metrics")
async def reset_observability_metrics(
    _: Dict[str, Any] = Depends(verify_admin_access)
) -> Dict[str, Any]:
    """Reset observability metrics"""
    try:
        global_monitor.reset_metrics()
        return {
            "status": "success",
            "message": "Observability metrics reset"
        }
    except Exception as e:
        logger.error(f"Failed to reset observability metrics: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/metrics")
async def get_detailed_metrics(
    _: Dict[str, Any] = Depends(verify_admin_access)
) -> Dict[str, Any]:
    """Get detailed observability metrics"""
    try:
        metrics = global_monitor.get_metrics()
        return {
            "status": "success",
            "data": metrics
        }
    except Exception as e:
        logger.error(f"Failed to get detailed metrics: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/dashboard-data")
async def get_dashboard_data(
    _: Dict[str, Any] = Depends(verify_admin_access)
) -> Dict[str, Any]:
    """Get data formatted for admin dashboard"""
    try:
        dashboard_summary = global_monitor.get_dashboard_summary()
        detailed_metrics = global_monitor.get_metrics()
        health = global_monitor.health_check()
        
        return {
            "status": "success",
            "data": {
                "summary": dashboard_summary,
                "detailed_metrics": detailed_metrics,
                "health": health,
                "platform_links": {
                    "openai": "https://platform.openai.com/usage",
                    "langfuse": observability.settings.LANGFUSE_HOST,
                    "agentops": "https://app.agentops.ai"
                }
            }
        }
    except Exception as e:
        logger.error(f"Failed to get dashboard data: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/configuration")
async def get_observability_configuration(
    _: Dict[str, Any] = Depends(verify_admin_access)
) -> Dict[str, Any]:
    """Get observability configuration (without sensitive data)"""
    try:
        settings = get_settings()
        
        config = {
            "enabled": settings.OBSERVABILITY_ENABLED,
            "environment": settings.ENVIRONMENT,
            "langfuse_host": settings.LANGFUSE_HOST,
            "platforms": {
                "openai": {
                    "configured": bool(settings.OPENAI_API_KEY),
                    "key_preview": f"{settings.OPENAI_API_KEY[:8]}..." if settings.OPENAI_API_KEY else None
                },
                "langfuse": {
                    "configured": bool(settings.LANGFUSE_SECRET_KEY and settings.LANGFUSE_PUBLIC_KEY),
                    "host": settings.LANGFUSE_HOST,
                    "public_key_preview": f"{settings.LANGFUSE_PUBLIC_KEY[:8]}..." if settings.LANGFUSE_PUBLIC_KEY else None
                },
                "agentops": {
                    "configured": bool(settings.AGENTOPS_API_KEY),
                    "key_preview": f"{settings.AGENTOPS_API_KEY[:8]}..." if settings.AGENTOPS_API_KEY else None
                }
            }
        }
        
        return {
            "status": "success",
            "data": config
        }
    except Exception as e:
        logger.error(f"Failed to get observability configuration: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/test-connection/{platform}")
async def test_platform_connection(
    platform: str,
    _: Dict[str, Any] = Depends(verify_admin_access)
) -> Dict[str, Any]:
    """Test connection to a specific observability platform"""
    try:
        if platform not in ["openai", "langfuse", "agentops"]:
            raise HTTPException(status_code=400, detail="Invalid platform")
        
        if platform == "openai":
            client = observability.initialize_openai()
            if client:
                # Simple test - just check if client is initialized
                result = {"connected": True, "message": "OpenAI client initialized successfully"}
            else:
                result = {"connected": False, "message": "Failed to initialize OpenAI client"}
                
        elif platform == "langfuse":
            client = observability.initialize_langfuse()
            if client:
                # Test Langfuse connection
                try:
                    # Simple connection test - just check if client is initialized and can flush
                    client.flush()
                    result = {"connected": True, "message": "Langfuse connection successful"}
                except Exception as e:
                    result = {"connected": False, "message": f"Langfuse connection failed: {e}"}
            else:
                result = {"connected": False, "message": "Failed to initialize Langfuse client"}
                
        elif platform == "agentops":
            success = observability.initialize_agentops()
            if success:
                result = {"connected": True, "message": "AgentOps initialized successfully"}
            else:
                result = {"connected": False, "message": "Failed to initialize AgentOps"}
        
        return {
            "status": "success",
            "data": result
        }
        
    except Exception as e:
        logger.error(f"Failed to test {platform} connection: {e}")
        raise HTTPException(status_code=500, detail=str(e))