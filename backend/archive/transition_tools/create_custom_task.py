"""
PAM Tool: Create Custom Task

Allows users to add custom tasks to their transition checklist via conversation.
"""

from typing import Dict, Any, Optional
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


async def create_custom_task(
    user_id: str,
    title: str,
    category: str = "custom",
    priority: str = "medium",
    description: Optional[str] = None,
    target_date: Optional[str] = None,
    milestone_id: Optional[str] = None
) -> Dict[str, Any]:
    """
    Create a custom task in the user's transition checklist.

    Args:
        user_id: The user's UUID
        title: Task title
        category: Task category (financial, vehicle, life, downsizing, equipment, legal, social, custom)
        priority: Task priority (low, medium, high, critical)
        description: Optional task description
        target_date: Optional target completion date (ISO format)
        milestone_id: Optional milestone association

    Returns:
        Dictionary containing:
        - task: The created task
        - success: Success status
        - message: Human-readable confirmation
    """
    try:
        # Validate inputs
        valid_categories = ["financial", "vehicle", "life", "downsizing", "equipment", "legal", "social", "custom"]
        valid_priorities = ["low", "medium", "high", "critical"]

        if category not in valid_categories:
            return {
                "success": False,
                "message": f"Invalid category. Must be one of: {', '.join(valid_categories)}"
            }

        if priority not in valid_priorities:
            return {
                "success": False,
                "message": f"Invalid priority. Must be one of: {', '.join(valid_priorities)}"
            }

        # Fetch transition profile
        profile_response = supabase.table("transition_profiles").select("*").eq("user_id", user_id).maybe_single().execute()

        if not profile_response.data:
            return {
                "success": False,
                "message": "No transition profile found. Please create a transition profile first."
            }

        profile = profile_response.data

        # Create task data
        task_data = {
            "profile_id": profile["id"],
            "user_id": user_id,
            "title": title,
            "category": category,
            "priority": priority,
            "description": description,
            "target_date": target_date,
            "milestone_id": milestone_id,
            "is_completed": False,
            "is_system_task": False,
            "checklist_items": []
        }

        # Insert task
        task_response = supabase.table("transition_tasks").insert(task_data).select().single().execute()

        created_task = task_response.data

        # Format response message
        priority_emojis = {
            "critical": "🔴",
            "high": "🟠",
            "medium": "🟡",
            "low": "🟢"
        }

        message = f"{priority_emojis.get(priority, '📝')} Added task: '{title}'"
        if target_date:
            target_dt = datetime.fromisoformat(target_date).date()
            days_until = (target_dt - date.today()).days
            if days_until > 0:
                message += f" (due in {days_until} days)"
            elif days_until == 0:
                message += " (due today!)"
            else:
                message += f" (overdue by {abs(days_until)} days)"

        message += f" to your {category} checklist."

        return {
            "success": True,
            "task": {
                "id": created_task["id"],
                "title": created_task["title"],
                "category": created_task["category"],
                "priority": created_task["priority"],
                "description": created_task["description"],
                "target_date": created_task.get("target_date"),
                "is_completed": False
            },
            "message": message
        }

    except Exception as e:
        logger.error(f"Error creating custom task: {str(e)}")
        return {
            "success": False,
            "message": f"Error creating task: {str(e)}"
        }
