"""
PAM Transition Progress Tools

Get overall transition readiness and summary statistics.
"""

import logging
from typing import Dict, Any
from datetime import datetime, date

from app.core.database import get_supabase_client
from app.services.pam.tools.exceptions import (
    ValidationError,
    DatabaseError,
    ResourceNotFoundError,
)
from app.services.pam.tools.utils import (
    validate_uuid,
)

logger = logging.getLogger(__name__)


async def get_transition_progress(user_id: str) -> Dict[str, Any]:
    """
    Get overall transition readiness score and summary.

    Returns a comprehensive overview of the user's transition progress including:
    - Readiness score (0-100%)
    - Days until departure
    - Task completion stats
    - Equipment status
    - Financial readiness

    Args:
        user_id: The user's ID

    Returns:
        Dict with transition progress summary

    Raises:
        ValidationError: Invalid input parameters
        ResourceNotFoundError: Transition profile not found
        DatabaseError: Database operation failed

    Example:
        User: "How ready am I for departure?"
        User: "What's my transition progress?"
        User: "Am I on track for my RV launch?"
    """
    try:
        validate_uuid(user_id, "user_id")

        supabase = get_supabase_client()

        # Get transition profile
        profile_result = supabase.table("transition_profiles")\
            .select("*")\
            .eq("user_id", user_id)\
            .maybeSingle()\
            .execute()

        if not profile_result.data:
            raise ResourceNotFoundError(
                "No transition plan found. Start one at /transition in the app.",
                context={"user_id": user_id, "has_profile": False}
            )

        profile = profile_result.data

        # Calculate days until departure
        days_until = None
        if profile.get("departure_date"):
            departure = datetime.fromisoformat(profile["departure_date"].replace("Z", "+00:00"))
            if isinstance(departure, datetime):
                departure = departure.date()
            today = date.today()
            days_until = (departure - today).days

        # Get task statistics
        tasks_result = supabase.table("transition_tasks")\
            .select("id, is_completed, priority, category, days_before_departure")\
            .eq("user_id", user_id)\
            .execute()

        tasks = tasks_result.data or []
        total_tasks = len(tasks)
        completed_tasks = len([t for t in tasks if t.get("is_completed")])
        critical_incomplete = len([t for t in tasks if t.get("priority") == "critical" and not t.get("is_completed")])

        # Calculate overdue tasks
        overdue_tasks = 0
        if days_until is not None:
            for task in tasks:
                if not task.get("is_completed") and task.get("days_before_departure"):
                    if task["days_before_departure"] > days_until:
                        overdue_tasks += 1

        # Get financial bucket stats
        financial_result = supabase.table("transition_financial")\
            .select("bucket_type, estimated_amount, current_amount")\
            .eq("user_id", user_id)\
            .execute()

        financials = financial_result.data or []
        total_estimated = sum(f.get("estimated_amount", 0) or 0 for f in financials)
        total_funded = sum(f.get("current_amount", 0) or 0 for f in financials)
        financial_readiness = round((total_funded / total_estimated * 100) if total_estimated > 0 else 0)

        # Get equipment stats (if table exists)
        equipment_stats = {"total_items": 0, "purchased": 0, "total_cost": 0, "spent": 0}
        try:
            equip_result = supabase.table("transition_equipment")\
                .select("id, is_acquired, estimated_cost, actual_cost")\
                .eq("user_id", user_id)\
                .execute()

            equipment = equip_result.data or []
            equipment_stats = {
                "total_items": len(equipment),
                "purchased": len([e for e in equipment if e.get("is_acquired")]),
                "total_cost": sum(e.get("estimated_cost", 0) or 0 for e in equipment),
                "spent": sum(e.get("actual_cost", 0) or 0 for e in equipment if e.get("is_acquired"))
            }
        except Exception as e:
            logger.debug(f"Equipment table not available: {e}")

        # Calculate overall readiness score
        # Weighted: 50% tasks, 30% financial, 20% equipment
        task_readiness = (completed_tasks / total_tasks * 100) if total_tasks > 0 else 0
        equip_readiness = (equipment_stats["purchased"] / equipment_stats["total_items"] * 100) if equipment_stats["total_items"] > 0 else 100

        readiness_score = round(
            (task_readiness * 0.5) +
            (financial_readiness * 0.3) +
            (equip_readiness * 0.2)
        )

        return {
            "success": True,
            "has_profile": True,
            "readiness_score": readiness_score,
            "departure_date": profile.get("departure_date"),
            "days_until_departure": days_until,
            "current_phase": profile.get("current_phase"),
            "transition_type": profile.get("transition_type"),
            "tasks": {
                "total": total_tasks,
                "completed": completed_tasks,
                "remaining": total_tasks - completed_tasks,
                "overdue": overdue_tasks,
                "critical_incomplete": critical_incomplete,
                "completion_percentage": round(task_readiness)
            },
            "financial": {
                "total_estimated": total_estimated,
                "total_funded": total_funded,
                "readiness_percentage": financial_readiness
            },
            "equipment": equipment_stats,
            "message": _build_progress_message(
                readiness_score, days_until, total_tasks, completed_tasks,
                overdue_tasks, critical_incomplete
            )
        }

    except ValidationError:
        raise
    except ResourceNotFoundError:
        raise
    except DatabaseError:
        raise
    except Exception as e:
        logger.error(
            f"Unexpected error getting transition progress",
            extra={"user_id": user_id},
            exc_info=True
        )
        raise DatabaseError(
            "Failed to retrieve transition progress",
            context={"user_id": user_id, "error": str(e)}
        )


def _build_progress_message(
    readiness: int,
    days_until: int | None,
    total_tasks: int,
    completed: int,
    overdue: int,
    critical: int
) -> str:
    """Build a human-friendly progress message."""
    parts = []

    # Readiness summary
    if readiness >= 80:
        parts.append(f"You're at {readiness}% readiness - looking great!")
    elif readiness >= 50:
        parts.append(f"You're at {readiness}% readiness - making good progress.")
    else:
        parts.append(f"You're at {readiness}% readiness - let's pick up the pace!")

    # Days until departure
    if days_until is not None:
        if days_until > 0:
            parts.append(f"{days_until} days until departure.")
        elif days_until == 0:
            parts.append("Today is departure day!")
        else:
            parts.append(f"You're {abs(days_until)} days into your journey!")

    # Task summary
    remaining = total_tasks - completed
    if remaining > 0:
        parts.append(f"{completed} of {total_tasks} tasks completed, {remaining} remaining.")
    else:
        parts.append(f"All {total_tasks} tasks completed!")

    # Warnings
    if critical > 0:
        parts.append(f"Warning: {critical} critical tasks still incomplete.")
    if overdue > 0:
        parts.append(f"Heads up: {overdue} tasks are overdue.")

    return " ".join(parts)
