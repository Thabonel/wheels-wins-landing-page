"""
Admin API endpoints for AI Agent Observability
Integrated with existing admin authentication system
"""

from fastapi import APIRouter, HTTPException, Depends, Response
from typing import Dict, Any, Optional
import logging

from app.observability.config import observability
from app.observability.monitor import global_monitor
from app.core.config import get_settings
from app.api.deps import verify_supabase_jwt_token

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/observability", tags=["observability"])

def verify_admin_access(jwt_payload: Dict[str, Any] = Depends(verify_supabase_jwt_token)):
    """Verify admin access using JWT token"""
    # Handle OPTIONS requests - allow them to pass through for CORS
    if jwt_payload.get('method') == 'OPTIONS':
        return jwt_payload
    
    user_role = jwt_payload.get('role', '')
    app_metadata = jwt_payload.get('app_metadata', {})
    
    # Check if user has admin role
    if user_role != 'admin' and app_metadata.get('role') != 'admin':
        raise HTTPException(status_code=403, detail="Admin access required")
    
    return jwt_payload

@router.options("/status")
async def options_observability_status():
    """Handle CORS preflight for status endpoint"""
    return Response(
        content="",
        status_code=200,
        headers={
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, Authorization",
            "Access-Control-Max-Age": "3600",
        }
    )

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

@router.options("/health")
async def options_observability_health():
    """Handle CORS preflight for health endpoint"""
    return Response(
        content="",
        status_code=200,
        headers={
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, Authorization",
            "Access-Control-Max-Age": "3600",
        }
    )

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

@router.options("/initialize")
async def options_initialize_observability():
    """Handle CORS preflight for initialize endpoint"""
    return Response(
        content="",
        status_code=200,
        headers={
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, Authorization",
            "Access-Control-Max-Age": "3600",
        }
    )

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

@router.options("/reset-metrics")
async def options_reset_observability_metrics():
    """Handle CORS preflight for reset-metrics endpoint"""
    return Response(
        content="",
        status_code=200,
        headers={
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, Authorization",
            "Access-Control-Max-Age": "3600",
        }
    )

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

@router.options("/metrics")
async def options_detailed_metrics():
    """Handle CORS preflight for metrics endpoint"""
    return Response(
        content="",
        status_code=200,
        headers={
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, Authorization",
            "Access-Control-Max-Age": "3600",
        }
    )

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

@router.options("/dashboard-data")
async def options_dashboard_data():
    """Handle CORS preflight for dashboard-data endpoint"""
    return Response(
        content="",
        status_code=200,
        headers={
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, Authorization",
            "Access-Control-Max-Age": "3600",
        }
    )

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
                    "anthropic": "https://console.anthropic.com/usage",
                    "langfuse": getattr(observability.settings, 'LANGFUSE_HOST', 'https://cloud.langfuse.com'),
                    "gemini": "https://makersuite.google.com/app/usage",
                    "openai": "https://platform.openai.com/usage"
                }
            }
        }
    except Exception as e:
        logger.error(f"Failed to get dashboard data: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.options("/configuration")
async def options_observability_configuration():
    """Handle CORS preflight for configuration endpoint"""
    return Response(
        content="",
        status_code=200,
        headers={
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, Authorization",
            "Access-Control-Max-Age": "3600",
        }
    )

@router.options("/config")
async def options_observability_config():
    """Handle CORS preflight for public config endpoint"""
    return Response(
        content="",
        status_code=200,
        headers={
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, Authorization",
            "Access-Control-Max-Age": "3600",
        }
    )

@router.get("/config")
async def get_observability_config_public():
    """Get observability configuration status (public endpoint for diagnostics)"""
    try:
        settings = get_settings()
        
        config = {
            "enabled": getattr(settings, 'OBSERVABILITY_ENABLED', False),
            "environment": settings.ENVIRONMENT,
            "platforms": {
                "anthropic": {
                    "configured": bool(settings.ANTHROPIC_API_KEY),
                },
                "langfuse": {
                    "configured": bool(getattr(settings, 'LANGFUSE_SECRET_KEY', None) and getattr(settings, 'LANGFUSE_PUBLIC_KEY', None)),
                    "host": getattr(settings, 'LANGFUSE_HOST', 'https://cloud.langfuse.com'),
                },
                "gemini": {
                    "configured": bool(getattr(settings, 'GEMINI_API_KEY', None)),
                },
                "openai": {
                    "configured": bool(getattr(settings, 'OPENAI_API_KEY', None)),
                }
            }
        }
        
        return {
            "status": "success",
            "data": config
        }
    except Exception as e:
        logger.error(f"Failed to get observability config: {e}")
        return {
            "status": "error",
            "error": str(e),
            "data": {
                "enabled": False,
                "environment": "unknown",
                "platforms": {
                    "anthropic": {"configured": False},
                    "langfuse": {"configured": False},
                    "gemini": {"configured": False},
                    "openai": {"configured": False}
                }
            }
        }

@router.get("/configuration")
async def get_observability_configuration(
    _: Dict[str, Any] = Depends(verify_admin_access)
) -> Dict[str, Any]:
    """Get observability configuration (without sensitive data)"""
    try:
        settings = get_settings()
        
        config = {
            "enabled": getattr(settings, 'OBSERVABILITY_ENABLED', False),
            "environment": settings.ENVIRONMENT,
            "langfuse_host": settings.LANGFUSE_HOST,
            "platforms": {
                "anthropic": {
                    "configured": bool(settings.ANTHROPIC_API_KEY),
                    "key_preview": f"{settings.ANTHROPIC_API_KEY.get_secret_value()[:8]}..." if settings.ANTHROPIC_API_KEY else None
                },
                "langfuse": {
                    "configured": bool(getattr(settings, 'LANGFUSE_SECRET_KEY', None) and getattr(settings, 'LANGFUSE_PUBLIC_KEY', None)),
                    "host": getattr(settings, 'LANGFUSE_HOST', 'https://cloud.langfuse.com'),
                    "public_key_preview": f"{getattr(settings, 'LANGFUSE_PUBLIC_KEY', '')[:8]}..." if getattr(settings, 'LANGFUSE_PUBLIC_KEY', None) else None
                },
                "gemini": {
                    "configured": bool(getattr(settings, 'GEMINI_API_KEY', None)),
                    "key_preview": f"{getattr(settings, 'GEMINI_API_KEY', '')[:8]}..." if getattr(settings, 'GEMINI_API_KEY', None) else None
                },
                "openai": {
                    "configured": bool(getattr(settings, 'OPENAI_API_KEY', None)),
                    "key_preview": f"{settings.OPENAI_API_KEY.get_secret_value()[:8]}..." if getattr(settings, 'OPENAI_API_KEY', None) else None
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

@router.options("/test-connection/{platform}")
async def options_test_platform_connection(platform: str):
    """Handle CORS preflight for test-connection endpoint"""
    return Response(
        content="",
        status_code=200,
        headers={
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, Authorization",
            "Access-Control-Max-Age": "3600",
        }
    )

@router.post("/test-connection/{platform}")
async def test_platform_connection(
    platform: str,
    _: Dict[str, Any] = Depends(verify_admin_access)
) -> Dict[str, Any]:
    """Test connection to a specific observability platform"""
    try:
        if platform not in ["anthropic", "gemini", "langfuse", "openai"]:
            raise HTTPException(status_code=400, detail="Invalid platform")

        if platform == "anthropic":
            # Anthropic is the primary platform - always considered connected if configured
            settings = get_settings()
            if settings.ANTHROPIC_API_KEY:
                result = {"connected": True, "message": "Claude Sonnet 4.5 (Primary AI) - API key configured"}
            else:
                result = {"connected": False, "message": "Anthropic API key not configured"}

        elif platform == "gemini":
            success = observability.initialize_gemini()
            if success:
                # Simple test - just check if client is initialized
                result = {"connected": True, "message": "Gemini client initialized successfully"}
            else:
                result = {"connected": False, "message": "Failed to initialize Gemini client"}

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

        elif platform == "openai":
            settings = get_settings()
            if getattr(settings, 'OPENAI_API_KEY', None):
                result = {"connected": True, "message": "OpenAI API key configured (available as fallback)"}
            else:
                result = {"connected": False, "message": "OpenAI API key not configured"}

        return {
            "status": "success",
            "data": result
        }
        
    except Exception as e:
        logger.error(f"Failed to test {platform} connection: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.options("/performance")
async def options_performance_status():
    """Handle CORS preflight for performance endpoint"""
    return Response(
        content="",
        status_code=200,
        headers={
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, Authorization",
            "Access-Control-Max-Age": "3600",
        }
    )

@router.get("/performance")
async def get_performance_status(
    _: Dict[str, Any] = Depends(verify_admin_access)
) -> Dict[str, Any]:
    """Get comprehensive performance status and optimization results"""
    try:
        from app.core.performance_optimizer import performance_optimizer
        
        # Generate comprehensive performance report
        performance_report = await performance_optimizer.generate_performance_report()
        
        return {
            "status": "success",
            "data": performance_report,
            "message": f"Performance status: {performance_report.get('overall_status', 'unknown')}"
        }
    except Exception as e:
        logger.error(f"Failed to get performance status: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.options("/performance/optimize")
async def options_performance_optimization():
    """Handle CORS preflight for performance/optimize endpoint"""
    return Response(
        content="",
        status_code=200,
        headers={
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, Authorization",
            "Access-Control-Max-Age": "3600",
        }
    )

@router.post("/performance/optimize")
async def trigger_performance_optimization(
    _: Dict[str, Any] = Depends(verify_admin_access)
) -> Dict[str, Any]:
    """Trigger immediate performance optimization"""
    try:
        from app.core.performance_optimizer import performance_optimizer
        
        # Run memory optimization
        memory_result = await performance_optimizer.optimize_memory_usage()
        
        # Run service optimization
        service_result = await performance_optimizer.optimize_service_initialization()
        
        return {
            "status": "success",
            "data": {
                "memory_optimization": memory_result,
                "service_optimization": service_result,
                "timestamp": memory_result.get("timestamp")
            },
            "message": "Performance optimization completed"
        }
    except Exception as e:
        logger.error(f"Failed to trigger performance optimization: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.options("/performance/memory")
async def options_memory_status():
    """Handle CORS preflight for performance/memory endpoint"""
    return Response(
        content="",
        status_code=200,
        headers={
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, Authorization",
            "Access-Control-Max-Age": "3600",
        }
    )

@router.get("/performance/memory")
async def get_memory_status(
    _: Dict[str, Any] = Depends(verify_admin_access)
) -> Dict[str, Any]:
    """Get current memory usage and optimization status"""
    try:
        from app.core.performance_optimizer import performance_optimizer
        
        # Get memory optimization results
        memory_result = await performance_optimizer.optimize_memory_usage()
        
        return {
            "status": "success",
            "data": memory_result,
            "message": f"Memory usage: {memory_result.get('memory_after_mb', 'unknown')}MB"
        }
    except Exception as e:
        logger.error(f"Failed to get memory status: {e}")
        raise HTTPException(status_code=500, detail=str(e))