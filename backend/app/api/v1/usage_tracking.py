"""
Usage Tracking API Endpoints

Provides visibility into production usage data for safe code cleanup.
Part of: ENTERPRISE_DEAD_CODE_REMOVAL_PLAN.md
"""

from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse
from datetime import datetime
from app.middleware.usage_tracker import get_usage_stats, REDIS_AVAILABLE
import logging

router = APIRouter()
logger = logging.getLogger(__name__)


@router.get("/health")
async def usage_tracking_health():
    """Check if usage tracking is operational"""
    return {
        "status": "healthy" if REDIS_AVAILABLE else "degraded",
        "redis_available": REDIS_AVAILABLE,
        "tracking_enabled": REDIS_AVAILABLE,
        "monitoring_period": "October 8-22, 2025",
        "purpose": "Safe dead code removal",
        "timestamp": datetime.utcnow().isoformat()
    }


@router.get("/stats")
async def get_usage_statistics(days: int = 14):
    """
    Get endpoint usage statistics for the past N days.

    Args:
        days: Number of days to look back (default: 14)

    Returns:
        Usage statistics including call counts and last used timestamps
    """
    if not REDIS_AVAILABLE:
        raise HTTPException(
            status_code=503,
            detail="Usage tracking not available - Redis not connected"
        )

    if days < 1 or days > 90:
        raise HTTPException(
            status_code=400,
            detail="Days must be between 1 and 90"
        )

    try:
        stats = get_usage_stats(days=days)
        return stats
    except Exception as e:
        logger.error(f"Failed to get usage stats: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to retrieve usage statistics: {str(e)}"
        )


@router.get("/unused")
async def get_potentially_unused_endpoints(days: int = 14):
    """
    Cross-reference Knip results with production usage to find truly unused endpoints.

    Args:
        days: Number of days to check usage (default: 14)

    Returns:
        List of endpoints that Knip flagged AND have zero production usage
    """
    if not REDIS_AVAILABLE:
        raise HTTPException(
            status_code=503,
            detail="Usage tracking not available - Redis not connected"
        )

    try:
        # Get production usage stats
        usage_stats = get_usage_stats(days=days)

        # This is a placeholder - in Week 3 we'll combine with Knip results
        return {
            "analysis_period_days": days,
            "redis_available": REDIS_AVAILABLE,
            "endpoints_with_usage": len(usage_stats.get("stats", {})),
            "note": "Full analysis will be available after 2-week monitoring period",
            "next_analysis_date": "2025-10-22",
            "timestamp": datetime.utcnow().isoformat()
        }

    except Exception as e:
        logger.error(f"Failed to analyze unused endpoints: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to analyze unused endpoints: {str(e)}"
        )
