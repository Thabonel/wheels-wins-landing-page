"""
Analytics API Endpoints
Usage tracking and optimization decision dashboard
"""

import logging
from typing import List, Dict, Any
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import JSONResponse

from app.models.usage_tracking import UsageDashboard, RetentionMetrics
from app.services.usage_tracking_service import usage_tracking
from app.api.dependencies.auth import require_admin, get_current_user
from app.models.user import User

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/analytics", tags=["analytics"])


@router.get("/dashboard", response_model=UsageDashboard)
async def get_usage_dashboard(admin_user: User = Depends(require_admin)):
    """
    Get usage analytics dashboard

    Shows:
    - Monthly costs
    - User engagement metrics
    - Retention rates
    - Optimization trigger (when to hire engineer)

    **Admin only**
    """
    try:
        dashboard = await usage_tracking.get_usage_dashboard()
        return dashboard

    except Exception as e:
        logger.error(f"❌ Failed to get usage dashboard: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/daily-stats", response_model=List[Dict[str, Any]])
async def get_daily_stats(
    days: int = 30,
    admin_user: User = Depends(require_admin)
):
    """
    Get daily usage statistics

    Args:
        days: Number of days to retrieve (default: 30)

    **Admin only**
    """
    try:
        stats = await usage_tracking.get_daily_stats(days=days)
        return stats

    except Exception as e:
        logger.error(f"❌ Failed to get daily stats: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/retention", response_model=RetentionMetrics)
async def get_retention_metrics(admin_user: User = Depends(require_admin)):
    """
    Get user retention rates (D1, D7, D30)

    **Admin only**
    """
    try:
        retention = await usage_tracking.calculate_retention_rates()
        return retention

    except Exception as e:
        logger.error(f"❌ Failed to get retention metrics: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/user/{user_id}", response_model=Dict[str, Any])
async def get_user_activity(
    user_id: UUID,
    current_user: User = Depends(get_current_user)
):
    """
    Get activity summary for a specific user

    Users can view their own activity.
    Admins can view any user's activity.
    """
    # Check authorization
    is_admin = current_user.role == 'admin'
    is_own_data = str(current_user.id) == str(user_id)

    if not (is_admin or is_own_data):
        raise HTTPException(
            status_code=403,
            detail="Not authorized to view this user's activity"
        )

    try:
        activity = await usage_tracking.get_user_activity(user_id)

        if not activity:
            raise HTTPException(status_code=404, detail="User activity not found")

        return activity

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Failed to get user activity: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/optimization-trigger")
async def check_optimization_trigger(admin_user: User = Depends(require_admin)):
    """
    Check if it's time to optimize (hire engineer)

    Returns simple yes/no with reasoning

    **Admin only**
    """
    try:
        dashboard = await usage_tracking.get_usage_dashboard()

        return {
            "should_optimize": dashboard.optimization_trigger['should_optimize'],
            "reason": dashboard.optimization_trigger['reason'],
            "monthly_cost": float(dashboard.monthly_cost),
            "daily_active_users": dashboard.daily_active_users,
            "estimated_savings": dashboard.optimization_trigger['estimated_savings_per_month'],
            "roi_months": dashboard.optimization_trigger['roi_months'],
            "recommendation": (
                "✅ Time to hire engineer - cost justifies optimization"
                if dashboard.optimization_trigger['should_optimize']
                else "⏳ Keep using OpenAI - wait for more scale"
            )
        }

    except Exception as e:
        logger.error(f"❌ Failed to check optimization trigger: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/track/voice-minute")
async def track_voice_minute_endpoint(
    duration_seconds: float,
    current_user: User = Depends(get_current_user)
):
    """
    Track a voice conversation minute

    Called automatically by PAM voice service
    """
    try:
        from app.services.usage_tracking_service import track_voice_minute

        await track_voice_minute(current_user.id, duration_seconds)

        return {"status": "tracked", "event_type": "voice_minute"}

    except Exception as e:
        logger.error(f"❌ Failed to track voice minute: {e}")
        # Don't fail the request if tracking fails
        return {"status": "error", "message": str(e)}


@router.post("/track/tool-call")
async def track_tool_call_endpoint(
    tool_name: str,
    tokens: int = None,
    current_user: User = Depends(get_current_user)
):
    """
    Track a tool/function call

    Called automatically when PAM executes a tool
    """
    try:
        from app.services.usage_tracking_service import track_tool_call

        await track_tool_call(current_user.id, tool_name, tokens)

        return {"status": "tracked", "event_type": "tool_call"}

    except Exception as e:
        logger.error(f"❌ Failed to track tool call: {e}")
        # Don't fail the request if tracking fails
        return {"status": "error", "message": str(e)}
