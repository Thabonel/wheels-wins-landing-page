"""
Performance Monitoring API
Endpoints for system performance monitoring and optimization
"""

from datetime import datetime
from typing import Dict, Any
from fastapi import APIRouter, HTTPException, Depends, Query
from fastapi.responses import JSONResponse

from app.api.deps import verify_supabase_jwt_token
from app.services.performance_monitor import performance_monitor
from app.core.websocket_manager import manager as websocket_manager
from app.core.logging import get_logger

logger = get_logger(__name__)
router = APIRouter()

@router.get("/performance/status")
async def get_performance_status():
    """Get current system performance status - public endpoint for health checks"""
    try:
        # Simple test endpoint first
        return {
            "timestamp": datetime.utcnow().isoformat(),
            "status": "healthy",
            "message": "Performance monitoring API is accessible",
            "version": "1.0.0"
        }
        
    except Exception as e:
        logger.error(f"❌ Error getting performance status: {e}")
        raise HTTPException(status_code=500, detail="Performance monitoring unavailable")

@router.get("/performance/report")
async def get_performance_report(
    hours: int = Query(default=24, ge=1, le=168, description="Hours of history to include"),
    current_user: dict = Depends(verify_supabase_jwt_token)
):
    """Get detailed performance report - requires authentication"""
    try:
        # Check if user has admin privileges for detailed reports
        user_role = current_user.get("role", "user")
        if user_role not in ["admin", "developer"]:
            # Return limited report for regular users
            snapshot = await performance_monitor.capture_performance_snapshot()
            return {
                "timestamp": snapshot.timestamp.isoformat(),
                "memory_usage_percent": round(snapshot.memory.memory_percent, 1),
                "status": "limited_access",
                "message": "Detailed performance reports require admin access"
            }
            
        report = await performance_monitor.get_performance_report(hours=hours)
        return report
        
    except Exception as e:
        logger.error(f"❌ Error generating performance report: {e}")
        raise HTTPException(status_code=500, detail="Failed to generate performance report")

@router.post("/performance/optimize")
async def optimize_performance(
    current_user: dict = Depends(verify_supabase_jwt_token)
):
    """Trigger memory optimization - admin only"""
    try:
        # Check admin privileges
        user_role = current_user.get("role", "user")
        if user_role not in ["admin", "developer"]:
            raise HTTPException(status_code=403, detail="Memory optimization requires admin access")
            
        logger.info(f"🧹 Manual memory optimization triggered by user: {current_user.get('user_id')}")
        
        # Capture before state
        before_snapshot = await performance_monitor.capture_performance_snapshot()
        before_memory = before_snapshot.memory.memory_percent
        
        # Perform optimization
        await performance_monitor.optimize_memory_usage()
        
        # Capture after state
        after_snapshot = await performance_monitor.capture_performance_snapshot()
        after_memory = after_snapshot.memory.memory_percent
        
        memory_freed = before_memory - after_memory
        
        return {
            "timestamp": datetime.utcnow().isoformat(),
            "optimization_completed": True,
            "memory_before_percent": round(before_memory, 1),
            "memory_after_percent": round(after_memory, 1),
            "memory_freed_percent": round(memory_freed, 1),
            "message": f"Memory optimization completed: freed {memory_freed:.1f}% memory"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error performing memory optimization: {e}")
        raise HTTPException(status_code=500, detail="Memory optimization failed")

@router.get("/performance/monitoring/start")
async def start_performance_monitoring(
    interval: int = Query(default=60, ge=30, le=300, description="Monitoring interval in seconds"),
    current_user: dict = Depends(verify_supabase_jwt_token)
):
    """Start continuous performance monitoring - admin only"""
    try:
        # Check admin privileges
        user_role = current_user.get("role", "user")
        if user_role not in ["admin", "developer"]:
            raise HTTPException(status_code=403, detail="Performance monitoring control requires admin access")
            
        await performance_monitor.start_monitoring(interval_seconds=interval)
        
        return {
            "timestamp": datetime.utcnow().isoformat(),
            "monitoring_started": True,
            "interval_seconds": interval,
            "message": f"Performance monitoring started with {interval}s interval"
        }
        
    except Exception as e:
        logger.error(f"❌ Error starting performance monitoring: {e}")
        raise HTTPException(status_code=500, detail="Failed to start performance monitoring")

@router.get("/performance/monitoring/stop")
async def stop_performance_monitoring(
    current_user: dict = Depends(verify_supabase_jwt_token)
):
    """Stop continuous performance monitoring - admin only"""
    try:
        # Check admin privileges
        user_role = current_user.get("role", "user")
        if user_role not in ["admin", "developer"]:
            raise HTTPException(status_code=403, detail="Performance monitoring control requires admin access")
            
        await performance_monitor.stop_monitoring()
        
        return {
            "timestamp": datetime.utcnow().isoformat(),
            "monitoring_stopped": True,
            "message": "Performance monitoring stopped"
        }
        
    except Exception as e:
        logger.error(f"❌ Error stopping performance monitoring: {e}")
        raise HTTPException(status_code=500, detail="Failed to stop performance monitoring")

@router.get("/performance/memory/analysis")
async def get_memory_analysis(
    current_user: dict = Depends(verify_supabase_jwt_token)
):
    """Get detailed memory usage analysis - admin only"""
    try:
        # Check admin privileges
        user_role = current_user.get("role", "user")
        if user_role not in ["admin", "developer"]:
            raise HTTPException(status_code=403, detail="Memory analysis requires admin access")
            
        snapshot = await performance_monitor.capture_performance_snapshot()
        
        # Additional memory analysis
        import gc
        import sys
        
        # Object type analysis
        type_counts = {}
        total_size = 0
        
        for obj in gc.get_objects():
            obj_type = type(obj).__name__
            obj_size = sys.getsizeof(obj)
            
            if obj_type not in type_counts:
                type_counts[obj_type] = {"count": 0, "total_size_mb": 0}
            
            type_counts[obj_type]["count"] += 1
            type_counts[obj_type]["total_size_mb"] += obj_size / (1024 * 1024)
            total_size += obj_size
            
        # Sort by total size
        top_types_by_size = sorted(
            type_counts.items(),
            key=lambda x: x[1]["total_size_mb"],
            reverse=True
        )[:10]
        
        # Sort by count
        top_types_by_count = sorted(
            type_counts.items(),
            key=lambda x: x[1]["count"],
            reverse=True
        )[:10]
        
        analysis = {
            "timestamp": snapshot.timestamp.isoformat(),
            "system_memory": {
                "total_mb": round(snapshot.memory.total_memory_mb, 1),
                "used_mb": round(snapshot.memory.used_memory_mb, 1),
                "available_mb": round(snapshot.memory.available_memory_mb, 1),
                "usage_percent": round(snapshot.memory.memory_percent, 1)
            },
            "process_memory": {
                "rss_mb": round(snapshot.memory.process_memory_mb, 1),
                "process_percent": round(snapshot.memory.process_memory_percent, 1)
            },
            "python_objects": {
                "total_objects": snapshot.python_object_count,
                "total_size_mb": round(total_size / (1024 * 1024), 1),
                "garbage_objects": len(gc.garbage),
                "top_types_by_size": [
                    {
                        "type": obj_type,
                        "count": data["count"],
                        "total_size_mb": round(data["total_size_mb"], 2)
                    }
                    for obj_type, data in top_types_by_size
                ],
                "top_types_by_count": [
                    {
                        "type": obj_type,
                        "count": data["count"],
                        "total_size_mb": round(data["total_size_mb"], 2)
                    }
                    for obj_type, data in top_types_by_count
                ]
            },
            "garbage_collection": snapshot.garbage_collection_stats,
            "recommendations": performance_monitor.optimization_recommendations[-5:]
        }
        
        return analysis
        
    except Exception as e:
        logger.error(f"❌ Error generating memory analysis: {e}")
        raise HTTPException(status_code=500, detail="Memory analysis failed")

@router.get("/performance/websockets")
async def get_websocket_stats(
    current_user: dict = Depends(verify_supabase_jwt_token)
):
    """Get WebSocket connection statistics - admin only"""
    try:
        # Check admin privileges
        user_role = current_user.get("role", "user")
        if user_role not in ["admin", "developer"]:
            raise HTTPException(status_code=403, detail="WebSocket monitoring requires admin access")
            
        stats = await websocket_manager.get_connection_stats()
        
        return {
            "timestamp": datetime.utcnow().isoformat(),
            "websocket_stats": stats,
            "heartbeat_config": {
                "heartbeat_interval": websocket_manager.heartbeat_interval,
                "connection_timeout": websocket_manager.connection_timeout,
                "monitoring_active": websocket_manager.heartbeat_task is not None and not websocket_manager.heartbeat_task.done()
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error getting WebSocket stats: {e}")
        raise HTTPException(status_code=500, detail="WebSocket stats retrieval failed")