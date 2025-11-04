"""Get User Stats Tool for PAM

View usage statistics and activity summary

Example usage:
- "Show me my stats"
- "How much have I saved this year?"

Amendment #4: Input validation with Pydantic models
"""

import logging
from typing import Any, Dict
from datetime import datetime, timedelta
from pydantic import ValidationError

from app.integrations.supabase import get_supabase_client
from app.services.pam.schemas.profile import GetUserStatsInput

logger = logging.getLogger(__name__)


async def get_user_stats(
    user_id: str,
    **kwargs
) -> Dict[str, Any]:
    """
    Get user statistics and activity summary

    Args:
        user_id: UUID of the user

    Returns:
        Dict with user statistics
    """
    try:
        # Validate inputs using Pydantic schema
        try:
            period = kwargs.get("period", "all_time")
            validated = GetUserStatsInput(
                user_id=user_id,
                period=period
            )
        except ValidationError as e:
            # Extract first error message for user-friendly response
            error_msg = e.errors()[0]['msg']
            return {
                "success": False,
                "error": f"Invalid input: {error_msg}"
            }

        supabase = get_supabase_client()

        # Get various stats
        stats = {}

        # Budget stats
        budget_response = supabase.table("expenses").select(
            "amount"
        ).eq("user_id", validated.user_id).execute()

        total_expenses = sum(
            expense["amount"] for expense in (budget_response.data or [])
        )
        expense_count = len(budget_response.data or [])

        stats["budget"] = {
            "total_expenses": round(total_expenses, 2),
            "expense_count": expense_count,
            "avg_expense": round(total_expenses / expense_count, 2) if expense_count > 0 else 0
        }

        # Trip stats (schema uses user_trips, not trips)
        trip_response = supabase.table("user_trips").select("*").eq(
            "user_id", validated.user_id
        ).execute()

        trip_count = len(trip_response.data or [])
        total_miles = sum(
            trip.get("distance_miles", 0) for trip in (trip_response.data or [])
        )

        stats["trips"] = {
            "trip_count": trip_count,
            "total_miles": round(total_miles, 2),
            "avg_miles_per_trip": round(total_miles / trip_count, 2) if trip_count > 0 else 0
        }

        # Social stats
        posts_response = supabase.table("posts").select("*").eq(
            "user_id", validated.user_id
        ).execute()

        post_count = len(posts_response.data or [])
        total_likes = sum(
            post.get("likes_count", 0) for post in (posts_response.data or [])
        )

        stats["social"] = {
            "post_count": post_count,
            "total_likes": total_likes,
            "avg_likes_per_post": round(total_likes / post_count, 2) if post_count > 0 else 0
        }

        # Account stats
        profile_response = supabase.table("profiles").select(
            "created_at"
        ).eq("id", validated.user_id).execute()

        if profile_response.data:
            created_at = datetime.fromisoformat(profile_response.data[0]["created_at"].replace("Z", "+00:00"))
            days_member = (datetime.now(created_at.tzinfo) - created_at).days

            stats["account"] = {
                "member_since": profile_response.data[0]["created_at"],
                "days_as_member": days_member
            }

        logger.info(f"Retrieved stats for user {validated.user_id}")

        return {
            "success": True,
            "stats": stats,
            "message": "User statistics retrieved successfully"
        }

    except Exception as e:
        logger.error(f"Error getting user stats: {e}", exc_info=True)
        return {
            "success": False,
            "error": str(e)
        }
