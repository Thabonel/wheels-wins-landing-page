"""
Performance Health Check API
Endpoints for monitoring the optimized backend performance components.
"""

from fastapi import APIRouter, HTTPException, Depends
from typing import Dict, Any
from datetime import datetime

from app.core.logging import get_logger
from app.monitoring.integration_manager import get_integration_manager
from app.api.deps import verify_supabase_jwt_token

logger = get_logger(__name__)
router = APIRouter(prefix="/performance", tags=["performance"])


@router.get("/health")
async def get_performance_health():
    """
    Get comprehensive health status of optimized performance components.
    
    Returns detailed status of:
    - Memory optimization service
    - Enhanced monitoring system
    - Integration manager
    - Overall system health
    """
    try:
        integration_manager = await get_integration_manager()
        health_status = await integration_manager.get_health_status()
        
        return {
            "status": "success",
            "timestamp": datetime.utcnow().isoformat(),
            "health": health_status
        }
        
    except Exception as e:
        logger.error(f"❌ Performance health check failed: {e}")
        raise HTTPException(status_code=500, detail=f"Health check failed: {str(e)}")


@router.get("/metrics")
async def get_performance_metrics():
    """
    Get comprehensive performance metrics from all optimized components.
    
    Returns:
    - Memory optimization statistics
    - Monitoring system metrics
    - Alert information
    - Historical performance data
    """
    try:
        integration_manager = await get_integration_manager()
        metrics = await integration_manager.get_performance_metrics()
        
        return {
            "status": "success",
            "timestamp": datetime.utcnow().isoformat(),
            "metrics": metrics
        }
        
    except Exception as e:
        logger.error(f"❌ Performance metrics collection failed: {e}")
        raise HTTPException(status_code=500, detail=f"Metrics collection failed: {str(e)}")


@router.post("/optimize")
async def trigger_manual_optimization():
    """
    Trigger manual system optimization.
    
    This endpoint allows administrators to manually trigger:
    - Memory cleanup and optimization
    - Cache clearing
    - Garbage collection
    - System resource cleanup
    """
    try:
        integration_manager = await get_integration_manager()
        success = await integration_manager.optimize_system()
        
        if success:
            return {
                "status": "success",
                "message": "Manual system optimization completed successfully",
                "timestamp": datetime.utcnow().isoformat()
            }
        else:
            raise HTTPException(
                status_code=503, 
                detail="System optimization failed or components not available"
            )
            
    except Exception as e:
        logger.error(f"❌ Manual optimization failed: {e}")
        raise HTTPException(status_code=500, detail=f"Optimization failed: {str(e)}")


@router.put("/thresholds")
async def update_monitoring_thresholds(
    thresholds: Dict[str, Dict[str, float]]
):
    """
    Update monitoring thresholds dynamically.
    
    Args:
        thresholds: Dictionary mapping metric names to threshold levels
        
    Example payload:
    {
        "memory_usage": {
            "warning": 75.0,
            "error": 85.0,
            "critical": 95.0
        },
        "cpu_usage": {
            "warning": 80.0,
            "error": 90.0,
            "critical": 95.0
        }
    }
    """
    try:
        integration_manager = await get_integration_manager()
        success = await integration_manager.update_monitoring_thresholds(thresholds)
        
        if success:
            return {
                "status": "success",
                "message": f"Updated monitoring thresholds for {len(thresholds)} metrics",
                "updated_metrics": list(thresholds.keys()),
                "timestamp": datetime.utcnow().isoformat()
            }
        else:
            raise HTTPException(
                status_code=503,
                detail="Threshold update failed or monitoring service not available"
            )
            
    except Exception as e:
        logger.error(f"❌ Threshold update failed: {e}")
        raise HTTPException(status_code=500, detail=f"Threshold update failed: {str(e)}")


@router.get("/alerts")
async def get_active_alerts():
    """
    Get current active alerts from the monitoring system.
    
    Returns:
    - Active alerts with details
    - Recent alert history
    - Alert statistics
    """
    try:
        integration_manager = await get_integration_manager()
        
        if 'monitoring' not in integration_manager.services:
            raise HTTPException(status_code=503, detail="Monitoring service not available")
            
        monitoring = integration_manager.services['monitoring']
        monitoring_status = await monitoring.get_monitoring_status()
        
        return {
            "status": "success",
            "timestamp": datetime.utcnow().isoformat(),
            "alerts": {
                "active": monitoring_status.get("active_alerts", []),
                "recent": monitoring_status.get("recent_alerts", []),
                "summary": monitoring_status.get("system_status", {})
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Alert retrieval failed: {e}")
        raise HTTPException(status_code=500, detail=f"Alert retrieval failed: {str(e)}")


@router.get("/memory-analysis")
async def get_memory_analysis():
    """
    Get detailed memory analysis and optimization statistics.
    
    Returns:
    - Current memory usage patterns
    - Optimization history
    - Memory leak detection results
    - Cleanup performance metrics
    """
    try:
        integration_manager = await get_integration_manager()
        
        if 'memory_manager' not in integration_manager.services:
            raise HTTPException(status_code=503, detail="Memory manager not available")
            
        memory_manager = integration_manager.services['memory_manager']
        memory_stats = await memory_manager.get_optimization_stats()
        
        return {
            "status": "success",
            "timestamp": datetime.utcnow().isoformat(),
            "memory_analysis": memory_stats
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Memory analysis failed: {e}")
        raise HTTPException(status_code=500, detail=f"Memory analysis failed: {str(e)}")


@router.get("/system-info")
async def get_system_info():
    """
    Get comprehensive system information for performance analysis.
    
    Returns:
    - System specifications
    - Current resource usage
    - Performance baselines
    - Configuration details
    """
    try:
        import psutil
        import gc
        
        # System information
        memory = psutil.virtual_memory()
        cpu_info = {
            "count": psutil.cpu_count(),
            "percent": psutil.cpu_percent(interval=1)
        }
        disk = psutil.disk_usage('/')
        
        # Process information
        process = psutil.Process()
        process_info = {
            "memory_mb": process.memory_info().rss / (1024**2),
            "memory_percent": process.memory_percent(),
            "cpu_percent": process.cpu_percent(),
            "threads": process.num_threads()
        }
        
        # Python/GC information
        gc_info = {
            "thresholds": gc.get_threshold(),
            "counts": gc.get_count(),
            "stats": gc.get_stats()
        }
        
        return {
            "status": "success",
            "timestamp": datetime.utcnow().isoformat(),
            "system_info": {
                "memory": {
                    "total_gb": memory.total / (1024**3),
                    "available_gb": memory.available / (1024**3),
                    "used_percent": memory.percent
                },
                "cpu": cpu_info,
                "disk": {
                    "total_gb": disk.total / (1024**3),
                    "free_gb": disk.free / (1024**3),
                    "used_percent": (disk.used / disk.total) * 100
                },
                "process": process_info,
                "garbage_collection": gc_info
            }
        }
        
    except Exception as e:
        logger.error(f"❌ System info collection failed: {e}")
        raise HTTPException(status_code=500, detail=f"System info collection failed: {str(e)}")