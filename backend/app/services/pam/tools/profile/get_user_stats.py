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
from pydantic import ValidationError as PydanticValidationError

from app.integrations.supabase import get_supabase_client
from app.services.pam.schemas.profile import GetUserStatsInput
from app.services.pam.tools.exceptions import (
    ValidationError,
    DatabaseError,
    ResourceNotFoundError,
)
from app.services.pam.tools.utils import (
    validate_uuid,
    safe_db_select,
)

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

    Raises:
        ValidationError: Invalid input parameters
        DatabaseError: Database operation failed
    """
    try:
        validate_uuid(user_id, "user_id")

        try:
            period = kwargs.get("period", "all_time")
            validated = GetUserStatsInput(
                user_id=user_id,
                period=period
            )
        except PydanticValidationError as e:
            error_msg = e.errors()[0]['msg']
            raise ValidationError(
                f"Invalid input: {error_msg}",
                context={"validation_errors": e.errors()}
            )

        stats = {}

        expenses_data = await safe_db_select(
            "expenses",
            columns="amount",
            filters={"user_id": validated.user_id}
        )

        total_expenses = sum(
            expense["amount"] for expense in (expenses_data or [])
        )
        expense_count = len(expenses_data or [])

        stats["budget"] = {
            "total_expenses": round(total_expenses, 2),
            "expense_count": expense_count,
            "avg_expense": round(total_expenses / expense_count, 2) if expense_count > 0 else 0
        }

        trips_data = await safe_db_select(
            "user_trips",
            columns="*",
            filters={"user_id": validated.user_id}
        )

        trip_count = len(trips_data or [])
        total_miles = sum(
            trip.get("distance_miles", 0) for trip in (trips_data or [])
        )

        stats["trips"] = {
            "trip_count": trip_count,
            "total_miles": round(total_miles, 2),
            "avg_miles_per_trip": round(total_miles / trip_count, 2) if trip_count > 0 else 0
        }

        posts_data = await safe_db_select(
            "posts",
            columns="*",
            filters={"user_id": validated.user_id}
        )

        post_count = len(posts_data or [])
        total_likes = sum(
            post.get("likes_count", 0) for post in (posts_data or [])
        )

        stats["social"] = {
            "post_count": post_count,
            "total_likes": total_likes,
            "avg_likes_per_post": round(total_likes / post_count, 2) if post_count > 0 else 0
        }

        profile_data = await safe_db_select(
            "profiles",
            columns="created_at",
            filters={"id": validated.user_id}
        )

        if profile_data:
            created_at = datetime.fromisoformat(profile_data[0]["created_at"].replace("Z", "+00:00"))
            days_member = (datetime.now(created_at.tzinfo) - created_at).days

            stats["account"] = {
                "member_since": profile_data[0]["created_at"],
                "days_as_member": days_member
            }

        logger.info(f"Retrieved stats for user {validated.user_id}")

        return {
            "success": True,
            "stats": stats,
            "message": "User statistics retrieved successfully"
        }

    except ValidationError:
        raise
    except DatabaseError:
        raise
    except Exception as e:
        logger.error(
            f"Unexpected error getting user stats",
            extra={"user_id": user_id},
            exc_info=True
        )
        raise DatabaseError(
            "Failed to retrieve user statistics",
            context={"user_id": user_id, "error": str(e)}
        )
