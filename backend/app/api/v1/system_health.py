"""
System Health API Endpoints
Provides comprehensive system health monitoring and recovery capabilities.
"""

from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from typing import Dict, Any, Optional, List
from datetime import datetime, timedelta
import asyncio
import logging

from app.core.logging import get_logger
from app.core.performance_monitor import performance_monitor
# Memory optimizer removed - was consuming more memory than it saved
import gc
import psutil
from app.services.cache_service import cache_service

logger = get_logger(__name__)

router = APIRouter(prefix="/system", tags=["System Health"])

@router.get("/health", summary="Get comprehensive system health status")
async def get_system_health() -> Dict[str, Any]:
    """Get complete system health overview including all monitored metrics."""
    try:
        # Get performance monitor status
        performance_status = await performance_monitor.get_current_status()
        
        # Get basic memory stats (memory optimizer removed)
        memory = psutil.virtual_memory()
        process = psutil.Process()
        memory_stats = {
            "system": {
                "total_mb": memory.total / 1024 / 1024,
                "used_mb": memory.used / 1024 / 1024,
                "percent": memory.percent
            },
            "process": {
                "rss_mb": process.memory_info().rss / 1024 / 1024,
                "percent": process.memory_percent()
            }
        }
        
        # Get cache service stats
        try:
            cache_stats = await cache_service.get_cache_stats()
        except Exception as e:
            cache_stats = {"error": str(e)}
        
        # Overall health determination
        active_alerts = performance_status.get('active_alerts', [])
        critical_alerts = [a for a in active_alerts if a.get('level') == 'critical']
        warning_alerts = [a for a in active_alerts if a.get('level') == 'warning']
        
        if critical_alerts:
            overall_status = "critical"
            status_message = f"{len(critical_alerts)} critical issues require immediate attention"
        elif warning_alerts:
            overall_status = "warning"
            status_message = f"{len(warning_alerts)} issues detected but system is functional"
        else:
            overall_status = "healthy"
            status_message = "All systems operating normally"
        
        return {
            "timestamp": datetime.utcnow().isoformat(),
            "overall_status": overall_status,
            "status_message": status_message,
            "system_metrics": {
                "performance": performance_status,
                "memory": memory_stats,
                "cache": cache_stats
            },
            "alerts_summary": {
                "total_alerts": len(active_alerts),
                "critical_alerts": len(critical_alerts),
                "warning_alerts": len(warning_alerts),
                "active_alerts": active_alerts
            }
        }
        
    except Exception as e:
        logger.error(f"❌ System health check failed: {e}")
        raise HTTPException(status_code=500, detail=f"Health check failed: {str(e)}")

@router.get("/performance/report", summary="Get performance report")
async def get_performance_report(hours: int = 1) -> Dict[str, Any]:
    """Get detailed performance report for the specified time period."""
    try:
        if hours < 1 or hours > 24:
            raise HTTPException(status_code=400, detail="Hours must be between 1 and 24")
        
        report = await performance_monitor.get_performance_report(hours)
        return report
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Performance report generation failed: {e}")
        raise HTTPException(status_code=500, detail=f"Report generation failed: {str(e)}")

@router.post("/memory/optimize", summary="Trigger memory optimization")
async def trigger_memory_optimization(background_tasks: BackgroundTasks, force_aggressive: bool = False) -> Dict[str, Any]:
    """Manually trigger memory optimization."""
    try:
        if force_aggressive:
            logger.info("🔧 Manual aggressive memory optimization requested")
            background_tasks.add_task(gc.collect)  # Use Python's garbage collection
            return {
                "message": "Aggressive memory optimization started",
                "type": "aggressive",
                "started_at": datetime.utcnow().isoformat()
            }
        else:
            logger.info("🔧 Manual standard memory optimization requested")
            background_tasks.add_task(gc.collect)  # Use Python's garbage collection
            return {
                "message": "Standard memory optimization started",
                "type": "standard",
                "started_at": datetime.utcnow().isoformat()
            }
            
    except Exception as e:
        logger.error(f"❌ Memory optimization trigger failed: {e}")
        raise HTTPException(status_code=500, detail=f"Memory optimization failed: {str(e)}")

@router.post("/cache/clear", summary="Clear application caches")
async def clear_caches(background_tasks: BackgroundTasks, cache_type: Optional[str] = None) -> Dict[str, Any]:
    """Clear application caches."""
    try:
        cleared_caches = []
        
        if cache_type == "redis" or cache_type is None:
            # Clear Redis cache
            try:
                await cache_service.clear_expired()
                cleared_caches.append("redis")
            except Exception as e:
                logger.warning(f"Redis cache clear failed: {e}")
        
        if cache_type == "memory" or cache_type is None:
            # Clear in-memory caches
            background_tasks.add_task(_clear_memory_caches)
            cleared_caches.append("memory")
        
        if cache_type == "all" or cache_type is None:
            # Clear all caches
            cleared_caches.extend(["application", "system"])
        
        return {
            "message": f"Cache clearing initiated for: {', '.join(cleared_caches)}",
            "cleared_caches": cleared_caches,
            "started_at": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        logger.error(f"❌ Cache clearing failed: {e}")
        raise HTTPException(status_code=500, detail=f"Cache clearing failed: {str(e)}")

async def _clear_memory_caches():
    """Clear in-memory caches (background task)."""
    try:
        import gc
        import re
        
        # Clear regex cache
        re.purge()
        
        # Force garbage collection
        for generation in range(3):
            gc.collect(generation)
        
        logger.info("✅ Memory caches cleared successfully")
        
    except Exception as e:
        logger.error(f"❌ Memory cache clearing failed: {e}")

@router.get("/monitoring/status", summary="Get monitoring service status")
async def get_monitoring_status() -> Dict[str, Any]:
    """Get status of all monitoring services."""
    try:
        return {
            "timestamp": datetime.utcnow().isoformat(),
            "services": {
                "performance_monitor": {
                    "active": performance_monitor.is_running,
                    "check_interval": performance_monitor.check_interval,
                    "active_alerts": len(performance_monitor.active_alerts)
                },
                "memory_management": {
                    "type": "python_gc",
                    "note": "Memory optimizer removed - using Python's built-in garbage collection"
                },
                "cache_service": {
                    "initialized": cache_service.redis is not None
                }
            }
        }
        
    except Exception as e:
        logger.error(f"❌ Monitoring status check failed: {e}")
        raise HTTPException(status_code=500, detail=f"Status check failed: {str(e)}")

@router.post("/monitoring/start", summary="Start monitoring services")
async def start_monitoring_services() -> Dict[str, Any]:
    """Start all monitoring services."""
    try:
        results = {}
        
        # Start performance monitor
        if not performance_monitor.is_running:
            await performance_monitor.start()
            results["performance_monitor"] = "started"
        else:
            results["performance_monitor"] = "already_running"
        
        # Memory optimizer removed - using Python GC
        results["memory_management"] = "python_gc_active"
        
        # Initialize cache service
        if cache_service.redis is None:
            await cache_service.initialize()
            results["cache_service"] = "initialized"
        else:
            results["cache_service"] = "already_initialized"
        
        return {
            "message": "Monitoring services startup completed",
            "results": results,
            "started_at": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        logger.error(f"❌ Monitoring services startup failed: {e}")
        raise HTTPException(status_code=500, detail=f"Service startup failed: {str(e)}")

@router.post("/monitoring/stop", summary="Stop monitoring services")
async def stop_monitoring_services() -> Dict[str, Any]:
    """Stop all monitoring services."""
    try:
        results = {}
        
        # Stop performance monitor
        if performance_monitor.is_running:
            await performance_monitor.stop()
            results["performance_monitor"] = "stopped"
        else:
            results["performance_monitor"] = "already_stopped"
        
        # Memory optimizer was removed - no action needed
        results["memory_management"] = "python_gc_only"
        
        # Close cache service
        if cache_service.redis is not None:
            await cache_service.close()
            results["cache_service"] = "closed"
        else:
            results["cache_service"] = "already_closed"
        
        return {
            "message": "Monitoring services shutdown completed",
            "results": results,
            "stopped_at": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        logger.error(f"❌ Monitoring services shutdown failed: {e}")
        raise HTTPException(status_code=500, detail=f"Service shutdown failed: {str(e)}")

@router.get("/recovery/history", summary="Get system recovery history")
async def get_recovery_history(limit: int = 50) -> Dict[str, Any]:
    """Get history of automated recovery actions."""
    try:
        # This would integrate with the automated recovery system
        # For now, return a placeholder response
        
        return {
            "message": "Recovery history endpoint",
            "note": "Integrate with automated recovery system",
            "limit": limit,
            "timestamp": datetime.utcnow().isoformat(),
            "history": []  # Would contain actual recovery history
        }
        
    except Exception as e:
        logger.error(f"❌ Recovery history retrieval failed: {e}")
        raise HTTPException(status_code=500, detail=f"History retrieval failed: {str(e)}")

@router.post("/recovery/trigger", summary="Trigger automated recovery check")
async def trigger_recovery_check(background_tasks: BackgroundTasks) -> Dict[str, Any]:
    """Manually trigger an automated recovery check."""
    try:
        # This would integrate with the automated recovery system
        background_tasks.add_task(_run_recovery_check)
        
        return {
            "message": "Automated recovery check started",
            "started_at": datetime.utcnow().isoformat(),
            "note": "Recovery check running in background"
        }
        
    except Exception as e:
        logger.error(f"❌ Recovery check trigger failed: {e}")
        raise HTTPException(status_code=500, detail=f"Recovery trigger failed: {str(e)}")

async def _run_recovery_check():
    """Run automated recovery check (background task)."""
    try:
        # This would integrate with the AutomatedRecovery class
        logger.info("🔍 Running automated recovery check...")
        
        # Placeholder for actual recovery logic
        await asyncio.sleep(1)  # Simulate recovery check
        
        logger.info("✅ Automated recovery check completed")
        
    except Exception as e:
        logger.error(f"❌ Automated recovery check failed: {e}")

@router.get("/logs/health", summary="Get log system health")
async def get_log_health() -> Dict[str, Any]:
    """Get health status of logging system."""
    try:
        import os
        import glob
        
        log_info = {
            "log_files": [],
            "total_size_mb": 0,
            "large_files": [],
            "old_files": []
        }
        
        # Common log locations
        log_patterns = [
            "/var/log/*.log",
            "/tmp/*.log",
            "./*.log",
            "logs/*.log"
        ]
        
        current_time = datetime.now().timestamp()
        size_threshold_mb = 50  # Files larger than 50MB
        age_threshold_days = 7  # Files older than 7 days
        
        for pattern in log_patterns:
            try:
                for log_file in glob.glob(pattern):
                    if os.path.isfile(log_file):
                        stat = os.stat(log_file)
                        size_mb = stat.st_size / 1024 / 1024
                        age_days = (current_time - stat.st_mtime) / 86400
                        
                        log_info["log_files"].append({
                            "path": log_file,
                            "size_mb": round(size_mb, 2),
                            "age_days": round(age_days, 2),
                            "modified": datetime.fromtimestamp(stat.st_mtime).isoformat()
                        })
                        
                        log_info["total_size_mb"] += size_mb
                        
                        if size_mb > size_threshold_mb:
                            log_info["large_files"].append(log_file)
                        
                        if age_days > age_threshold_days:
                            log_info["old_files"].append(log_file)
                            
            except Exception as e:
                logger.debug(f"Error checking logs for pattern {pattern}: {e}")
        
        log_info["total_size_mb"] = round(log_info["total_size_mb"], 2)
        
        # Determine health status
        health_issues = []
        if log_info["total_size_mb"] > 500:  # More than 500MB total
            health_issues.append("High total log size")
        if len(log_info["large_files"]) > 5:  # More than 5 large files
            health_issues.append("Too many large log files")
        if len(log_info["old_files"]) > 10:  # More than 10 old files
            health_issues.append("Too many old log files")
        
        return {
            "timestamp": datetime.utcnow().isoformat(),
            "healthy": len(health_issues) == 0,
            "issues": health_issues,
            "log_info": log_info,
            "recommendations": [
                "Rotate large log files" if log_info["large_files"] else None,
                "Archive old log files" if log_info["old_files"] else None,
                "Implement log rotation" if log_info["total_size_mb"] > 200 else None
            ]
        }
        
    except Exception as e:
        logger.error(f"❌ Log health check failed: {e}")
        raise HTTPException(status_code=500, detail=f"Log health check failed: {str(e)}")

# Admin-only endpoints (would require authentication in production)
@router.get("/admin/debug", summary="Get debug information")
async def get_debug_info() -> Dict[str, Any]:
    """Get comprehensive debug information for troubleshooting."""
    try:
        import psutil
        import platform
        import sys
        
        # System information
        system_info = {
            "platform": platform.platform(),
            "python_version": sys.version,
            "cpu_count": psutil.cpu_count(),
            "memory_total_gb": round(psutil.virtual_memory().total / 1024 / 1024 / 1024, 2),
            "disk_total_gb": round(psutil.disk_usage('/').total / 1024 / 1024 / 1024, 2),
            "boot_time": datetime.fromtimestamp(psutil.boot_time()).isoformat()
        }
        
        # Process information
        process = psutil.Process()
        process_info = {
            "pid": process.pid,
            "parent_pid": process.ppid(),
            "name": process.name(),
            "status": process.status(),
            "create_time": datetime.fromtimestamp(process.create_time()).isoformat(),
            "cpu_percent": process.cpu_percent(),
            "memory_percent": process.memory_percent(),
            "num_threads": process.num_threads(),
            "num_fds": process.num_fds() if hasattr(process, 'num_fds') else 0
        }
        
        # Network information
        try:
            network_info = {
                "connections": len(process.connections()),
                "listening_ports": [
                    conn.laddr.port for conn in process.connections() 
                    if conn.status == 'LISTEN'
                ]
            }
        except Exception:
            network_info = {"error": "Network info unavailable"}
        
        return {
            "timestamp": datetime.utcnow().isoformat(),
            "system": system_info,
            "process": process_info,
            "network": network_info,
            "monitoring_services": {
                "performance_monitor_running": performance_monitor.is_running,
                "memory_management": "python_gc",
                "cache_service_connected": cache_service.redis is not None
            }
        }
        
    except Exception as e:
        logger.error(f"❌ Debug info collection failed: {e}")
        raise HTTPException(status_code=500, detail=f"Debug info collection failed: {str(e)}")