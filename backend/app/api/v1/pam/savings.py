"""
PAM Savings API - Track and celebrate money saved by PAM

Endpoints:
- GET /api/v1/pam/savings/monthly - Get monthly savings total
- GET /api/v1/pam/savings/events - Get recent savings events
- GET /api/v1/pam/savings/celebrate - Check if celebration triggered

Date: October 1, 2025
"""

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import logging
from datetime import datetime, timedelta

from app.api.deps import verify_supabase_jwt_token
from app.integrations.supabase import get_supabase_client

router = APIRouter()
logger = logging.getLogger(__name__)


class SavingsEvent(BaseModel):
    """Savings event model"""
    id: str
    amount_saved: float
    category: str
    description: Optional[str]
    event_type: str
    created_at: str


class MonthlySavingsResponse(BaseModel):
    """Monthly savings summary"""
    total_savings: float
    savings_count: int
    subscription_cost: float
    savings_shortfall: float
    percentage_achieved: float
    guarantee_met: bool
    billing_period_start: str
    billing_period_end: str


@router.get("/monthly", response_model=MonthlySavingsResponse)
async def get_monthly_savings(
    current_user: dict = Depends(verify_supabase_jwt_token)
):
    """
    Get monthly savings total for current user

    This is what powers the PamSavingsSummaryCard on the frontend.
    """
    try:
        user_id = current_user.get("sub")
        supabase = get_supabase_client()

        # Get current month start/end
        now = datetime.now()
        month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

        # Get all savings events for current month
        response = supabase.table("pam_savings_events").select("*").eq("user_id", user_id).gte("created_at", month_start.isoformat()).execute()

        savings_events = response.data if response.data else []

        # Calculate total savings
        total_savings = sum(float(event.get("amount_saved", 0)) for event in savings_events)

        # Subscription cost (for guarantee check)
        subscription_cost = 14.00  # $14/month for PAM

        # Calculate metrics
        savings_shortfall = max(0, subscription_cost - total_savings)
        percentage_achieved = (total_savings / subscription_cost * 100) if subscription_cost > 0 else 0
        guarantee_met = total_savings >= 10.00  # Celebration threshold

        logger.info(f"Monthly savings for user {user_id}: ${total_savings:.2f}")

        return MonthlySavingsResponse(
            total_savings=total_savings,
            savings_count=len(savings_events),
            subscription_cost=subscription_cost,
            savings_shortfall=savings_shortfall,
            percentage_achieved=percentage_achieved,
            guarantee_met=guarantee_met,
            billing_period_start=month_start.isoformat(),
            billing_period_end=now.isoformat()
        )

    except Exception as e:
        logger.error(f"Error getting monthly savings: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail="Failed to get monthly savings"
        )


@router.get("/events", response_model=List[SavingsEvent])
async def get_savings_events(
    limit: int = 10,
    days: int = 30,
    current_user: dict = Depends(verify_supabase_jwt_token)
):
    """
    Get recent savings events for current user

    Args:
        limit: Maximum number of events to return
        days: Number of days to look back
    """
    try:
        user_id = current_user.get("sub")
        supabase = get_supabase_client()

        # Calculate date range
        start_date = datetime.now() - timedelta(days=days)

        # Get savings events
        response = supabase.table("pam_savings_events").select("*").eq("user_id", user_id).gte("created_at", start_date.isoformat()).order("created_at", desc=True).limit(limit).execute()

        events = response.data if response.data else []

        logger.info(f"Retrieved {len(events)} savings events for user {user_id}")

        return events

    except Exception as e:
        logger.error(f"Error getting savings events: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail="Failed to get savings events"
        )


@router.get("/celebrate")
async def check_celebration(
    current_user: dict = Depends(verify_supabase_jwt_token)
):
    """
    Check if user has hit celebration threshold ($10+ saved this month)

    Returns flag for frontend to trigger confetti animation.
    """
    try:
        user_id = current_user.get("sub")
        supabase = get_supabase_client()

        # Get current month start
        month_start = datetime.now().replace(day=1, hour=0, minute=0, second=0, microsecond=0)

        # Get monthly total
        response = supabase.table("pam_savings_events").select("amount_saved").eq("user_id", user_id).gte("created_at", month_start.isoformat()).execute()

        total_savings = sum(float(event.get("amount_saved", 0)) for event in response.data) if response.data else 0

        # Celebration threshold
        celebration_threshold = 10.00
        should_celebrate = total_savings >= celebration_threshold

        return {
            "should_celebrate": should_celebrate,
            "total_savings": total_savings,
            "threshold": celebration_threshold,
            "message": f"PAM saved you ${total_savings:.2f} this month!" if should_celebrate else None
        }

    except Exception as e:
        logger.error(f"Error checking celebration: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail="Failed to check celebration status"
        )


@router.get("/guarantee-status")
async def get_guarantee_status(
    month: Optional[str] = None,
    current_user: dict = Depends(verify_supabase_jwt_token)
):
    """
    Get guarantee status for current billing period

    This endpoint is called by PamSavingsSummaryCard component.
    Returns whether the user has saved enough to meet their subscription cost.
    """
    try:
        user_id = current_user.get("sub")
        supabase = get_supabase_client()

        # Parse month or use current
        if month:
            month_start = datetime.fromisoformat(month.replace('Z', '+00:00'))
        else:
            now = datetime.now()
            month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

        # Calculate end of month
        if month_start.month == 12:
            month_end = month_start.replace(year=month_start.year + 1, month=1)
        else:
            month_end = month_start.replace(month=month_start.month + 1)

        # Get all savings events for the month
        response = supabase.table("pam_savings_events").select("*").eq("user_id", user_id).gte("created_at", month_start.isoformat()).lt("created_at", month_end.isoformat()).execute()

        savings_events = response.data if response.data else []
        total_savings = sum(float(event.get("amount_saved", 0)) for event in savings_events)

        # Subscription cost
        subscription_cost = 14.00  # AU$14/month for PAM

        # Calculate metrics
        guarantee_met = total_savings >= subscription_cost
        savings_shortfall = max(0, subscription_cost - total_savings)
        percentage_achieved = min(100, (total_savings / subscription_cost * 100)) if subscription_cost > 0 else 0

        logger.info(f"Guarantee status for user {user_id}: ${total_savings:.2f} saved, guarantee_met={guarantee_met}")

        return {
            "guarantee_status": {
                "guarantee_met": guarantee_met,
                "total_savings": total_savings,
                "subscription_cost": subscription_cost,
                "savings_shortfall": savings_shortfall,
                "savings_events_count": len(savings_events),
                "billing_period_start": month_start.isoformat(),
                "billing_period_end": month_end.isoformat(),
                "percentage_achieved": percentage_achieved
            }
        }

    except Exception as e:
        logger.error(f"Error getting guarantee status: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail="Failed to get guarantee status"
        )


@router.get("/recent", response_model=List[SavingsEvent])
async def get_recent_savings(
    limit: int = 10,
    current_user: dict = Depends(verify_supabase_jwt_token)
):
    """
    Get recent savings events for current user

    Alias for /events endpoint with default 30-day lookback.
    Called by PamSavingsSummaryCard component.
    """
    return await get_savings_events(limit=limit, days=30, current_user=current_user)
