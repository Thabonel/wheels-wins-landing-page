"""
PAM Transition Launch Week Tools

Tools for the final 7-day countdown before departure.
"""

import logging
from typing import Dict, Any, Optional
from datetime import datetime, date, timedelta

from app.core.database import get_supabase_client
from app.services.pam.tools.exceptions import (
    ValidationError,
    DatabaseError,
    ResourceNotFoundError,
)
from app.services.pam.tools.utils import (
    validate_uuid,
    safe_db_insert,
    safe_db_update,
)

logger = logging.getLogger(__name__)

LAUNCH_WEEK_DAYS = 7


async def get_launch_week_status(user_id: str) -> Dict[str, Any]:
    """
    Get the 7-day launch week countdown status.

    Shows tasks organized by day (Day -7 through Day 0) with completion status.

    Args:
        user_id: The user's ID

    Returns:
        Dict with launch week tasks and progress

    Raises:
        ValidationError: Invalid input parameters
        ResourceNotFoundError: Transition profile or departure date not found
        DatabaseError: Database operation failed

    Example:
        User: "What's my launch week status?"
        User: "How's my departure countdown going?"
        User: "What do I need to do before launch?"
    """
    try:
        validate_uuid(user_id, "user_id")

        supabase = get_supabase_client()

        # Get user's departure date
        profile_result = supabase.table("transition_profiles")\
            .select("id, departure_date")\
            .eq("user_id", user_id)\
            .maybeSingle()\
            .execute()

        if not profile_result.data:
            raise ResourceNotFoundError(
                "No transition plan found. Start one at /transition in the app first.",
                context={"user_id": user_id}
            )

        profile = profile_result.data
        departure_date_str = profile.get("departure_date")

        if not departure_date_str:
            raise ValidationError(
                "No departure date set. Please set your departure date first.",
                context={"user_id": user_id}
            )

        departure_date = datetime.fromisoformat(departure_date_str.replace("Z", "+00:00")).date()
        today = date.today()
        days_until = (departure_date - today).days

        in_launch_week = days_until <= LAUNCH_WEEK_DAYS

        system_tasks_result = supabase.table("launch_week_tasks")\
            .select("*")\
            .order("day_offset")\
            .execute()

        system_tasks = system_tasks_result.data or []

        user_tasks_result = supabase.table("user_launch_tasks")\
            .select("task_id, completed, completed_at, notes")\
            .eq("user_id", user_id)\
            .execute()

        user_completions = {t["task_id"]: t for t in (user_tasks_result.data or [])}

        tasks_by_day = {}
        total_tasks = 0
        completed_tasks = 0
        critical_incomplete = 0

        for task in system_tasks:
            day_offset = task.get("day_offset", 0)
            day_key = f"day_{day_offset}" if day_offset <= 0 else f"day_+{day_offset}"

            if day_key not in tasks_by_day:
                tasks_by_day[day_key] = {
                    "day_offset": day_offset,
                    "date": (departure_date + timedelta(days=day_offset)).isoformat() if in_launch_week else None,
                    "tasks": []
                }

            task_id = task["id"]
            user_status = user_completions.get(task_id, {})
            is_completed = user_status.get("completed", False)

            tasks_by_day[day_key]["tasks"].append({
                "id": task_id,
                "task": task.get("task"),
                "is_critical": task.get("is_critical", False),
                "completed": is_completed,
                "completed_at": user_status.get("completed_at"),
                "notes": user_status.get("notes")
            })

            total_tasks += 1
            if is_completed:
                completed_tasks += 1
            elif task.get("is_critical"):
                critical_incomplete += 1

        completion_percentage = round((completed_tasks / total_tasks * 100) if total_tasks > 0 else 0)

        if not in_launch_week:
            message = f"Launch week starts in {days_until - LAUNCH_WEEK_DAYS} days. You have {total_tasks} tasks to complete during launch week."
        elif days_until > 0:
            message = f"You're in launch week! {days_until} days until departure. {completed_tasks}/{total_tasks} tasks complete ({completion_percentage}%)."
            if critical_incomplete > 0:
                message += f" Warning: {critical_incomplete} critical tasks still need attention!"
        elif days_until == 0:
            message = f"Today is departure day! {completed_tasks}/{total_tasks} tasks complete."
        else:
            message = f"You departed {abs(days_until)} days ago! {completed_tasks}/{total_tasks} launch tasks were completed."

        return {
            "success": True,
            "departure_date": departure_date.isoformat(),
            "days_until_departure": days_until,
            "in_launch_week": in_launch_week,
            "tasks_by_day": tasks_by_day,
            "stats": {
                "total_tasks": total_tasks,
                "completed": completed_tasks,
                "remaining": total_tasks - completed_tasks,
                "critical_incomplete": critical_incomplete,
                "completion_percentage": completion_percentage
            },
            "message": message
        }

    except ValidationError:
        raise
    except ResourceNotFoundError:
        raise
    except DatabaseError:
        raise
    except Exception as e:
        logger.error(
            f"Unexpected error getting launch week status",
            extra={"user_id": user_id},
            exc_info=True
        )
        raise DatabaseError(
            "Failed to retrieve launch week status",
            context={"user_id": user_id, "error": str(e)}
        )


async def complete_launch_task(
    user_id: str,
    task_id: str,
    notes: Optional[str] = None
) -> Dict[str, Any]:
    """
    Mark a launch week task as complete.

    Args:
        user_id: The user's ID
        task_id: ID of the launch week task to complete
        notes: Optional notes about completion

    Returns:
        Dict with completion status and updated progress

    Raises:
        ValidationError: Invalid input parameters
        ResourceNotFoundError: Launch week task not found
        DatabaseError: Database operation failed

    Example:
        User: "Mark the utilities task as done"
        User: "I've completed disconnecting the water"
        User: "Check off the final walkthrough"
    """
    try:
        validate_uuid(user_id, "user_id")
        validate_uuid(task_id, "task_id")

        supabase = get_supabase_client()

        # Verify the task exists
        task_result = supabase.table("launch_week_tasks")\
            .select("*")\
            .eq("id", task_id)\
            .maybeSingle()\
            .execute()

        if not task_result.data:
            raise ResourceNotFoundError(
                "Launch week task not found.",
                context={"user_id": user_id, "task_id": task_id}
            )

        task = task_result.data

        # Check if already completed
        existing = supabase.table("user_launch_tasks")\
            .select("*")\
            .eq("user_id", user_id)\
            .eq("task_id", task_id)\
            .maybeSingle()\
            .execute()

        if existing.data and existing.data.get("completed"):
            return {
                "success": True,
                "message": f"Task '{task['task']}' was already completed.",
                "already_completed": True
            }

        # Create or update completion record
        completion_data = {
            "user_id": user_id,
            "task_id": task_id,
            "completed": True,
            "completed_at": datetime.utcnow().isoformat(),
            "notes": notes
        }

        if existing.data:
            await safe_db_update("user_launch_tasks", existing.data["id"], completion_data, user_id)
        else:
            await safe_db_insert("user_launch_tasks", completion_data, user_id)

        # Get updated stats
        all_system_tasks = supabase.table("launch_week_tasks")\
            .select("id")\
            .execute()

        all_user_tasks = supabase.table("user_launch_tasks")\
            .select("task_id, completed")\
            .eq("user_id", user_id)\
            .execute()

        total_tasks = len(all_system_tasks.data or [])
        completed_count = len([t for t in (all_user_tasks.data or []) if t.get("completed")])

        logger.info(f"Completed launch week task '{task['task']}' for user {user_id}")

        return {
            "success": True,
            "task": task,
            "stats": {
                "total_tasks": total_tasks,
                "completed": completed_count,
                "remaining": total_tasks - completed_count,
                "completion_percentage": round((completed_count / total_tasks * 100) if total_tasks > 0 else 0)
            },
            "message": f"Completed '{task['task']}'! {completed_count}/{total_tasks} launch week tasks done."
        }

    except ValidationError:
        raise
    except ResourceNotFoundError:
        raise
    except DatabaseError:
        raise
    except Exception as e:
        logger.error(
            f"Unexpected error completing launch task",
            extra={"user_id": user_id, "task_id": task_id},
            exc_info=True
        )
        raise DatabaseError(
            "Failed to complete launch task",
            context={"user_id": user_id, "task_id": task_id, "error": str(e)}
        )
