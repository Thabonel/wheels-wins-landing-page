
"""
Production Monitoring API Endpoints
Comprehensive monitoring endpoints for production debugging and observability.
"""

from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import PlainTextResponse
from pydantic import BaseModel
import time

from app.services.monitoring_service import get_monitoring_service, MonitoringService
from app.services.sentry_service import get_sentry_service, SentryService
from app.monitoring.production_monitor import get_production_monitor, ProductionMonitor
# Memory optimizer removed - was consuming more memory than it saved
import gc
import psutil
from app.core.logging import get_logger

logger = get_logger(__name__)
router = APIRouter()

# Simple in-memory cache for health responses
_health_cache = {
    "response": None,
    "timestamp": 0,
    "ttl": 5  # Cache for 5 seconds
}


class HealthResponse(BaseModel):
    """Health check response model."""
    status: str
    timestamp: str
    uptime_seconds: float
    environment: str
    version: str
    system_health: Dict[str, Any]


class ErrorSummaryResponse(BaseModel):
    """Error summary response model."""
    total_errors: int
    error_rate_5min: int
    error_rate_1hour: int
    common_errors: List[Dict[str, Any]]
    recent_errors: List[Dict[str, Any]]


class PerformanceSummaryResponse(BaseModel):
    """Performance summary response model."""
    avg_response_time_5min: float
    avg_response_time_1hour: float
    slow_endpoints: List[Dict[str, Any]]
    request_volume_5min: int
    status_code_distribution: Dict[str, int]


# Original monitoring endpoints
@router.get("/metrics", response_class=PlainTextResponse)
async def get_prometheus_metrics(monitoring: MonitoringService = Depends(get_monitoring_service)):
    """Get Prometheus metrics"""
    try:
        monitoring.update_system_metrics()
        return monitoring.get_metrics()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get metrics: {str(e)}")


@router.get("/health/metrics")
async def get_health_metrics(monitoring: MonitoringService = Depends(get_monitoring_service)):
    """Get health check metrics in JSON format"""
    try:
        return monitoring.get_health_metrics()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get health metrics: {str(e)}")


# Fast health check endpoint for load balancers
@router.get("/health/fast")
async def get_fast_health_status():
    """Ultra-fast health check endpoint without system metrics for load balancers."""
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "service": "pam-backend",
        "version": "2.0.0"
    }


# Enhanced production monitoring endpoints
@router.get("/health", response_model=HealthResponse)
async def get_health_status(monitor: ProductionMonitor = Depends(get_production_monitor)):
    """Get comprehensive system health status with caching for performance."""
    # Check cache first
    now = time.time()
    if _health_cache["response"] and (now - _health_cache["timestamp"]) < _health_cache["ttl"]:
        logger.debug("📦 Returning cached health response")
        return _health_cache["response"]
    
    try:
        # Measure health check time
        start_time = time.time()
        
        health = await monitor.get_system_health()
        
        # Determine overall status
        status = "healthy"
        if health.error_rate_5min > 5:
            status = "degraded"
        if health.error_rate_5min > 20 or health.memory_percent > 90 or health.cpu_percent > 90:
            status = "unhealthy"
        
        response = HealthResponse(
            status=status,
            timestamp=datetime.utcnow().isoformat(),
            uptime_seconds=health.uptime_seconds,
            environment="production",
            version="2.0.0",
            system_health={
                "cpu_percent": health.cpu_percent,
                "memory_usage_mb": health.memory_usage_mb,
                "memory_percent": health.memory_percent,
                "disk_usage_percent": health.disk_usage_percent,
                "active_connections": health.active_connections,
                "error_rate_5min": health.error_rate_5min,
                "avg_response_time_5min": health.avg_response_time_5min
            }
        )
        
        # Cache the response
        _health_cache["response"] = response
        _health_cache["timestamp"] = now
        
        # Log health check duration
        duration_ms = (time.time() - start_time) * 1000
        logger.debug(f"⏱️ Health check completed in {duration_ms:.2f}ms")
        
        return response
        
    except Exception as e:
        logger.error(f"Error getting health status: {e}")
        raise HTTPException(status_code=500, detail="Unable to retrieve health status")


@router.get("/errors", response_model=ErrorSummaryResponse)
async def get_error_summary(
    hours: int = Query(1, ge=1, le=24, description="Hours to look back for errors"),
    monitor: ProductionMonitor = Depends(get_production_monitor)
):
    """Get comprehensive error analysis for production debugging."""
    try:
        now = datetime.utcnow()
        lookback_time = now - timedelta(hours=hours)
        five_min_ago = now - timedelta(minutes=5)
        
        # Filter errors by time
        all_errors = [
            e for e in monitor.error_buffer
            if datetime.fromisoformat(e.timestamp.replace('Z', '+00:00')) > lookback_time
        ]
        
        errors_5min = [
            e for e in monitor.error_buffer
            if datetime.fromisoformat(e.timestamp.replace('Z', '+00:00')) > five_min_ago
        ]
        
        # Calculate error statistics
        total_errors = len(all_errors)
        error_rate_5min = len(errors_5min)
        error_rate_1hour = len([
            e for e in monitor.error_buffer
            if datetime.fromisoformat(e.timestamp.replace('Z', '+00:00')) > (now - timedelta(hours=1))
        ])
        
        # Group errors by type
        error_types = {}
        for error in all_errors:
            error_type = error.error_type
            if error_type not in error_types:
                error_types[error_type] = {
                    "type": error_type,
                    "count": 0,
                    "endpoints": set(),
                    "latest_message": "",
                    "latest_timestamp": ""
                }
            error_types[error_type]["count"] += 1
            if error.endpoint:
                error_types[error_type]["endpoints"].add(error.endpoint)
            error_types[error_type]["latest_message"] = error.error_message
            error_types[error_type]["latest_timestamp"] = error.timestamp
        
        # Convert to list and sort by count
        common_errors = sorted(
            [
                {
                    "type": data["type"],
                    "count": data["count"],
                    "endpoints": list(data["endpoints"]),
                    "latest_message": data["latest_message"],
                    "latest_timestamp": data["latest_timestamp"]
                }
                for data in error_types.values()
            ],
            key=lambda x: x["count"],
            reverse=True
        )[:10]  # Top 10
        
        # Recent errors (last 10)
        recent_errors = [
            {
                "timestamp": e.timestamp,
                "type": e.error_type,
                "message": e.error_message,
                "endpoint": e.endpoint,
                "method": e.method,
                "user_id": e.user_id,
                "request_id": e.request_id
            }
            for e in sorted(all_errors, key=lambda x: x.timestamp, reverse=True)[:10]
        ]
        
        return ErrorSummaryResponse(
            total_errors=total_errors,
            error_rate_5min=error_rate_5min,
            error_rate_1hour=error_rate_1hour,
            common_errors=common_errors,
            recent_errors=recent_errors
        )
        
    except Exception as e:
        logger.error(f"Error getting error summary: {e}")
        raise HTTPException(status_code=500, detail="Unable to retrieve error summary")


@router.get("/performance", response_model=PerformanceSummaryResponse)
async def get_performance_summary(
    hours: int = Query(1, ge=1, le=24, description="Hours to look back for performance data"),
    monitor: ProductionMonitor = Depends(get_production_monitor)
):
    """Get comprehensive performance analysis for production debugging."""
    try:
        now = datetime.utcnow()
        lookback_time = now - timedelta(hours=hours)
        five_min_ago = now - timedelta(minutes=5)
        one_hour_ago = now - timedelta(hours=1)
        
        # Filter performance data by time
        all_performance = [
            p for p in monitor.performance_buffer
            if datetime.fromisoformat(p.timestamp.replace('Z', '+00:00')) > lookback_time
        ]
        
        performance_5min = [
            p for p in monitor.performance_buffer
            if datetime.fromisoformat(p.timestamp.replace('Z', '+00:00')) > five_min_ago
        ]
        
        performance_1hour = [
            p for p in monitor.performance_buffer
            if datetime.fromisoformat(p.timestamp.replace('Z', '+00:00')) > one_hour_ago
        ]
        
        # Calculate average response times
        avg_response_time_5min = (
            sum(p.duration_ms for p in performance_5min) / len(performance_5min)
            if performance_5min else 0
        )
        
        avg_response_time_1hour = (
            sum(p.duration_ms for p in performance_1hour) / len(performance_1hour)
            if performance_1hour else 0
        )
        
        # Group by endpoint for slow endpoint analysis
        endpoint_stats = {}
        for perf in all_performance:
            endpoint = f"{perf.method} {perf.endpoint}"
            if endpoint not in endpoint_stats:
                endpoint_stats[endpoint] = {
                    "endpoint": endpoint,
                    "request_count": 0,
                    "total_duration": 0,
                    "max_duration": 0,
                    "slow_requests": 0
                }
            
            stats = endpoint_stats[endpoint]
            stats["request_count"] += 1
            stats["total_duration"] += perf.duration_ms
            stats["max_duration"] = max(stats["max_duration"], perf.duration_ms)
            if perf.duration_ms > 1000:  # > 1 second
                stats["slow_requests"] += 1
        
        # Calculate averages and sort by slowest
        slow_endpoints = []
        for endpoint, stats in endpoint_stats.items():
            if stats["request_count"] > 0:
                avg_duration = stats["total_duration"] / stats["request_count"]
                slow_endpoints.append({
                    "endpoint": endpoint,
                    "avg_duration_ms": round(avg_duration, 2),
                    "max_duration_ms": round(stats["max_duration"], 2),
                    "request_count": stats["request_count"],
                    "slow_requests": stats["slow_requests"]
                })
        
        slow_endpoints.sort(key=lambda x: x["avg_duration_ms"], reverse=True)
        slow_endpoints = slow_endpoints[:10]  # Top 10 slowest
        
        # Status code distribution
        status_codes = {}
        for perf in performance_5min:
            code = str(perf.status_code)
            status_codes[code] = status_codes.get(code, 0) + 1
        
        return PerformanceSummaryResponse(
            avg_response_time_5min=round(avg_response_time_5min, 2),
            avg_response_time_1hour=round(avg_response_time_1hour, 2),
            slow_endpoints=slow_endpoints,
            request_volume_5min=len(performance_5min),
            status_code_distribution=status_codes
        )
        
    except Exception as e:
        logger.error(f"Error getting performance summary: {e}")
        raise HTTPException(status_code=500, detail="Unable to retrieve performance summary")


@router.get("/debug")
async def get_debug_info(monitor: ProductionMonitor = Depends(get_production_monitor)):
    """Get detailed debug information for production troubleshooting."""
    try:
        return monitor.get_debug_info()
        
    except Exception as e:
        logger.error(f"Error getting debug info: {e}")
        raise HTTPException(status_code=500, detail="Unable to retrieve debug information")


@router.get("/alerts")
async def get_active_alerts(monitor: ProductionMonitor = Depends(get_production_monitor)):
    """Get currently active system alerts for production monitoring."""
    try:
        health = await monitor.get_system_health()
        alerts = []
        
        # Check alert conditions
        if health.error_rate_5min > monitor.alert_thresholds["error_rate_5min"]:
            alerts.append({
                "type": "high_error_rate",
                "severity": "warning" if health.error_rate_5min < 20 else "critical",
                "message": f"High error rate: {health.error_rate_5min} errors in 5 minutes",
                "threshold": monitor.alert_thresholds["error_rate_5min"],
                "current_value": health.error_rate_5min
            })
        
        if health.avg_response_time_5min > monitor.alert_thresholds["avg_response_time_ms"]:
            alerts.append({
                "type": "slow_response_time",
                "severity": "warning",
                "message": f"Slow average response time: {health.avg_response_time_5min:.2f}ms",
                "threshold": monitor.alert_thresholds["avg_response_time_ms"],
                "current_value": health.avg_response_time_5min
            })
        
        if health.memory_percent > monitor.alert_thresholds["memory_usage_percent"]:
            alerts.append({
                "type": "high_memory_usage",
                "severity": "warning" if health.memory_percent < 95 else "critical",
                "message": f"High memory usage: {health.memory_percent:.1f}%",
                "threshold": monitor.alert_thresholds["memory_usage_percent"],
                "current_value": health.memory_percent
            })
        
        if health.cpu_percent > monitor.alert_thresholds["cpu_usage_percent"]:
            alerts.append({
                "type": "high_cpu_usage",
                "severity": "warning",
                "message": f"High CPU usage: {health.cpu_percent:.1f}%",
                "threshold": monitor.alert_thresholds["cpu_usage_percent"],
                "current_value": health.cpu_percent
            })
        
        if health.disk_usage_percent > monitor.alert_thresholds["disk_usage_percent"]:
            alerts.append({
                "type": "high_disk_usage",
                "severity": "critical",
                "message": f"High disk usage: {health.disk_usage_percent:.1f}%",
                "threshold": monitor.alert_thresholds["disk_usage_percent"],
                "current_value": health.disk_usage_percent
            })
        
        return {
            "timestamp": datetime.utcnow().isoformat(),
            "alert_count": len(alerts),
            "alerts": alerts,
            "system_health": {
                "cpu_percent": health.cpu_percent,
                "memory_percent": health.memory_percent,
                "disk_usage_percent": health.disk_usage_percent,
                "error_rate_5min": health.error_rate_5min,
                "avg_response_time_5min": health.avg_response_time_5min
            }
        }
        
    except Exception as e:
        logger.error(f"Error getting alerts: {e}")
        raise HTTPException(status_code=500, detail="Unable to retrieve alerts")


@router.post("/test/error")
async def test_error_tracking(
    sentry: SentryService = Depends(get_sentry_service),
    monitor: ProductionMonitor = Depends(get_production_monitor)
):
    """Test endpoint for comprehensive error tracking validation."""
    try:
        # Simulate an error for testing
        raise ValueError("Test error for production monitoring system validation")
        
    except Exception as e:
        # Test both monitoring systems
        sentry.capture_exception(e, {"test": True, "endpoint": "/test/error"})
        monitor.log_error(e, additional_context={"test": True, "purpose": "monitoring_validation"})
        raise HTTPException(status_code=500, detail="Test error captured by both monitoring systems")


@router.get("/alerts/status")
async def get_alert_status(monitor: ProductionMonitor = Depends(get_production_monitor)):
    """Get current alert system status."""
    try:
        health = await monitor.get_system_health()
        active_alerts = 0
        
        # Count active alerts
        if health.error_rate_5min > monitor.alert_thresholds["error_rate_5min"]:
            active_alerts += 1
        if health.avg_response_time_5min > monitor.alert_thresholds["avg_response_time_ms"]:
            active_alerts += 1
        if health.memory_percent > monitor.alert_thresholds["memory_usage_percent"]:
            active_alerts += 1
        if health.cpu_percent > monitor.alert_thresholds["cpu_usage_percent"]:
            active_alerts += 1
        if health.disk_usage_percent > monitor.alert_thresholds["disk_usage_percent"]:
            active_alerts += 1
        
        status = "operational"
        if active_alerts > 0:
            status = "degraded" if active_alerts < 3 else "critical"
        
        return {
            "status": status,
            "active_alerts": active_alerts,
            "monitoring_enabled": monitor.is_monitoring,
            "last_check": datetime.utcnow().isoformat(),
            "uptime_seconds": health.uptime_seconds
        }
        
    except Exception as e:
        logger.error(f"Error getting alert status: {e}")
        return {
            "status": "unknown",
            "active_alerts": -1,
            "monitoring_enabled": False,
            "last_check": datetime.utcnow().isoformat(),
            "error": "Unable to retrieve alert status"
        }


@router.get("/memory")
async def get_memory_statistics():
    """Get basic memory usage statistics (memory optimizer removed)."""
    try:
        memory = psutil.virtual_memory()
        process = psutil.Process()
        
        return {
            "timestamp": datetime.utcnow().isoformat(),
            "system": {
                "total_mb": memory.total / 1024 / 1024,
                "used_mb": memory.used / 1024 / 1024,
                "available_mb": memory.available / 1024 / 1024,
                "percent": memory.percent
            },
            "process": {
                "rss_mb": process.memory_info().rss / 1024 / 1024,
                "percent": process.memory_percent()
            },
            "note": "Memory optimizer removed - using Python's built-in garbage collection"
        }
    except Exception as e:
        logger.error(f"Error getting memory statistics: {e}")
        raise HTTPException(status_code=500, detail="Unable to retrieve memory statistics")


@router.post("/memory/optimize")
async def trigger_memory_optimization():
    """Trigger Python's garbage collection (memory optimizer removed)."""
    try:
        # Use Python's built-in garbage collection
        collected = gc.collect()
        
        # Get updated memory stats
        memory = psutil.virtual_memory()
        process = psutil.Process()
        
        return {
            "message": "Python garbage collection completed",
            "timestamp": datetime.utcnow().isoformat(),
            "objects_collected": collected,
            "memory_stats": {
                "system_percent": memory.percent,
                "process_mb": process.memory_info().rss / 1024 / 1024
            },
            "note": "Memory optimizer removed - using lightweight Python GC instead"
        }
    except Exception as e:
        logger.error(f"Error triggering garbage collection: {e}")
        raise HTTPException(status_code=500, detail="Unable to trigger garbage collection")
