"""
PAM Tool: Get Priority Tasks

Returns high-priority incomplete tasks from the user's transition checklist,
sorted by priority and due date.
"""

from typing import Dict, Any, List
from datetime import datetime, date
from supabase import create_client
import os
import logging

logger = logging.getLogger(__name__)

# Initialize Supabase client
supabase = create_client(
    os.getenv("SUPABASE_URL", ""),
    os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
)


async def get_priority_tasks(
    user_id: str,
    limit: int = 10,
    priority_level: str = "high"
) -> Dict[str, Any]:
    """
    Get high-priority incomplete tasks for the user's transition.

    Args:
        user_id: The user's UUID
        limit: Maximum number of tasks to return (default: 10)
        priority_level: Minimum priority level ("critical", "high", "medium", "low")

    Returns:
        Dictionary containing:
        - tasks: List of priority tasks
        - count: Number of priority tasks
        - message: Human-readable summary
        - success: Success status
    """
    try:
        # Fetch transition profile
        profile_response = supabase.table("transition_profiles").select("id").eq("user_id", user_id).maybe_single().execute()

        if not profile_response.data:
            return {
                "success": False,
                "message": "No transition profile found.",
                "tasks": [],
                "count": 0
            }

        profile_id = profile_response.data["id"]

        # Define priority order
        priority_order = {"critical": 4, "high": 3, "medium": 2, "low": 1}
        min_priority = priority_order.get(priority_level, 3)

        # Fetch incomplete tasks
        tasks_response = (
            supabase.table("transition_tasks")
            .select("*")
            .eq("profile_id", profile_id)
            .eq("is_completed", False)
            .execute()
        )

        all_tasks = tasks_response.data or []

        # Filter by priority and sort
        priority_tasks = [
            task for task in all_tasks
            if priority_order.get(task["priority"], 0) >= min_priority
        ]

        # Sort by priority (highest first), then by target date
        priority_tasks.sort(
            key=lambda x: (
                -priority_order.get(x["priority"], 0),
                x.get("target_date") or "9999-12-31"
            )
        )

        # Limit results
        priority_tasks = priority_tasks[:limit]

        # Format tasks for response
        formatted_tasks = []
        for task in priority_tasks:
            task_info = {
                "id": task["id"],
                "title": task["title"],
                "category": task["category"],
                "priority": task["priority"],
                "description": task.get("description"),
                "target_date": task.get("target_date"),
                "milestone_id": task.get("milestone_id")
            }

            # Calculate days until target date if available
            if task.get("target_date"):
                target_date = datetime.fromisoformat(task["target_date"]).date()
                days_until = (target_date - date.today()).days
                task_info["days_until_target"] = days_until

                if days_until < 0:
                    task_info["status"] = "overdue"
                elif days_until <= 7:
                    task_info["status"] = "due_soon"
                else:
                    task_info["status"] = "upcoming"

            formatted_tasks.append(task_info)

        # Generate summary message
        if not formatted_tasks:
            message = "Great job! You don't have any high-priority tasks at the moment."
        else:
            overdue = sum(1 for t in formatted_tasks if t.get("status") == "overdue")
            due_soon = sum(1 for t in formatted_tasks if t.get("status") == "due_soon")

            message = f"You have {len(formatted_tasks)} priority tasks. "
            if overdue > 0:
                message += f"{overdue} are overdue. "
            if due_soon > 0:
                message += f"{due_soon} are due within 7 days. "

            message += f"\n\nTop priority: {formatted_tasks[0]['title']}"

        return {
            "success": True,
            "tasks": formatted_tasks,
            "count": len(formatted_tasks),
            "message": message
        }

    except Exception as e:
        logger.error(f"Error getting priority tasks: {str(e)}")
        return {
            "success": False,
            "message": f"Error retrieving priority tasks: {str(e)}",
            "tasks": [],
            "count": 0
        }
