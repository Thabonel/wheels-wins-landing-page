
"""
Monitoring API Endpoints
Provides metrics and health check endpoints for monitoring systems.
"""

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import PlainTextResponse
from typing import Dict, Any
from app.services.monitoring_service import get_monitoring_service, MonitoringService
from app.services.sentry_service import get_sentry_service, SentryService

router = APIRouter()

@router.get("/metrics", response_class=PlainTextResponse)
async def get_prometheus_metrics(monitoring: MonitoringService = Depends(get_monitoring_service)):
    """Get Prometheus metrics"""
    try:
        # Update system metrics before returning
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

@router.post("/test/error")
async def test_error_tracking(sentry: SentryService = Depends(get_sentry_service)):
    """Test endpoint for error tracking (development only)"""
    try:
        # Simulate an error for testing
        raise ValueError("Test error for monitoring system")
    except Exception as e:
        sentry.capture_exception(e, {"test": True, "endpoint": "/test/error"})
        raise HTTPException(status_code=500, detail="Test error captured")

@router.get("/alerts/status")
async def get_alert_status():
    """Get current alert status"""
    # This would typically integrate with your alerting system
    return {
        "status": "operational",
        "active_alerts": 0,
        "last_check": "2024-01-01T00:00:00Z"
    }
