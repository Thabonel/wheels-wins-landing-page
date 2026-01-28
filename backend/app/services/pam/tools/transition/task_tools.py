"""
PAM Transition Task Tools

CRUD operations for transition checklist tasks.
"""

import logging
from typing import Dict, Any, Optional, List
from datetime import datetime
import uuid

from app.core.database import get_supabase_client
from app.services.pam.tools.exceptions import (
    ValidationError,
    DatabaseError,
    ResourceNotFoundError,
)
from app.services.pam.tools.utils import (
    validate_uuid,
    validate_positive_number,
    safe_db_insert,
    safe_db_update,
)

logger = logging.getLogger(__name__)

# Valid categories and priorities
VALID_CATEGORIES = ["financial", "vehicle", "life", "downsizing", "equipment", "legal", "social", "custom"]
VALID_PRIORITIES = ["critical", "high", "medium", "low"]
VALID_STATUSES = ["pending", "in_progress", "completed", "overdue"]


async def get_transition_tasks(
    user_id: str,
    category: Optional[str] = None,
    status: Optional[str] = None,
    priority: Optional[str] = None,
    limit: int = 20
) -> Dict[str, Any]:
    """
    List transition tasks with optional filtering.

    Args:
        user_id: The user's ID
        category: Filter by category (financial, vehicle, life, downsizing, equipment, legal, social, custom)
        status: Filter by status (pending, in_progress, completed, overdue)
        priority: Filter by priority (critical, high, medium, low)
        limit: Maximum number of tasks to return

    Returns:
        Dict with list of tasks and summary stats

    Raises:
        ValidationError: Invalid input parameters
        DatabaseError: Database operation failed

    Example:
        User: "What tasks do I have left?"
        User: "Show me my critical tasks"
        User: "What financial tasks are pending?"
    """
    try:
        validate_uuid(user_id, "user_id")

        if limit and limit > 0:
            validate_positive_number(limit, "limit")
        else:
            limit = 20

        supabase = get_supabase_client()

        # Build query
        query = supabase.table("transition_tasks")\
            .select("*")\
            .eq("user_id", user_id)

        # Apply filters
        if category and category in VALID_CATEGORIES:
            query = query.eq("category", category)

        if priority and priority in VALID_PRIORITIES:
            query = query.eq("priority", priority)

        if status:
            if status == "completed":
                query = query.eq("is_completed", True)
            elif status in ["pending", "in_progress"]:
                query = query.eq("is_completed", False)
            # "overdue" handled in post-processing

        # Order by priority and creation date
        query = query.order("priority", desc=False)\
            .order("created_at", desc=True)\
            .limit(limit)

        result = query.execute()
        tasks = result.data or []

        # Get departure date for overdue calculation
        profile_result = supabase.table("transition_profiles")\
            .select("departure_date")\
            .eq("user_id", user_id)\
            .maybeSingle()\
            .execute()

        days_until_departure = None
        if profile_result.data and profile_result.data.get("departure_date"):
            from datetime import date
            departure = datetime.fromisoformat(
                profile_result.data["departure_date"].replace("Z", "+00:00")
            ).date()
            days_until_departure = (departure - date.today()).days

        # Process tasks and identify overdue
        processed_tasks = []
        for task in tasks:
            task_status = "completed" if task.get("is_completed") else "pending"

            # Check if overdue
            if not task.get("is_completed") and days_until_departure is not None:
                if task.get("days_before_departure") and task["days_before_departure"] > days_until_departure:
                    task_status = "overdue"

            task["status"] = task_status
            processed_tasks.append(task)

        # Filter by overdue status if requested
        if status == "overdue":
            processed_tasks = [t for t in processed_tasks if t["status"] == "overdue"]

        # Build summary
        all_tasks_result = supabase.table("transition_tasks")\
            .select("category, priority, is_completed")\
            .eq("user_id", user_id)\
            .execute()

        all_tasks = all_tasks_result.data or []

        by_category = {}
        by_priority = {}
        for t in all_tasks:
            cat = t.get("category", "custom")
            pri = t.get("priority", "medium")
            by_category[cat] = by_category.get(cat, 0) + 1
            by_priority[pri] = by_priority.get(pri, 0) + 1

        return {
            "success": True,
            "tasks": processed_tasks,
            "count": len(processed_tasks),
            "filters_applied": {
                "category": category,
                "status": status,
                "priority": priority
            },
            "summary": {
                "total": len(all_tasks),
                "completed": len([t for t in all_tasks if t.get("is_completed")]),
                "by_category": by_category,
                "by_priority": by_priority
            }
        }

    except ValidationError:
        raise
    except DatabaseError:
        raise
    except Exception as e:
        logger.error(
            f"Unexpected error getting transition tasks",
            extra={"user_id": user_id, "category": category},
            exc_info=True
        )
        raise DatabaseError(
            "Failed to retrieve transition tasks",
            context={"user_id": user_id, "error": str(e)}
        )


async def create_transition_task(
    user_id: str,
    title: str,
    category: str,
    priority: str = "medium",
    description: Optional[str] = None,
    days_before_departure: Optional[int] = None,
    subtasks: Optional[List[str]] = None
) -> Dict[str, Any]:
    """
    Create a new transition task.

    Args:
        user_id: The user's ID
        title: Task title
        category: Task category (financial, vehicle, life, downsizing, equipment, legal, social, custom)
        priority: Task priority (critical, high, medium, low)
        description: Detailed description
        days_before_departure: Days before departure this should be completed
        subtasks: List of subtask descriptions

    Returns:
        Dict with created task details

    Raises:
        ValidationError: Invalid input parameters
        ResourceNotFoundError: Transition profile not found
        DatabaseError: Database operation failed

    Example:
        User: "Add 'buy solar panels' to my equipment checklist"
        User: "Create a task to sell the car, high priority"
        User: "Add 'cancel gym membership' to my life tasks"
    """
    try:
        validate_uuid(user_id, "user_id")

        # Validate inputs
        if category not in VALID_CATEGORIES:
            raise ValidationError(
                f"Invalid category. Must be one of: {', '.join(VALID_CATEGORIES)}",
                context={"category": category, "valid_categories": VALID_CATEGORIES}
            )

        if priority not in VALID_PRIORITIES:
            priority = "medium"

        if days_before_departure is not None:
            validate_positive_number(days_before_departure, "days_before_departure")

        supabase = get_supabase_client()

        # Get user's transition profile
        profile_result = supabase.table("transition_profiles")\
            .select("id")\
            .eq("user_id", user_id)\
            .maybeSingle()\
            .execute()

        if not profile_result.data:
            raise ResourceNotFoundError(
                "No transition plan found. Start one at /transition in the app first.",
                context={"user_id": user_id}
            )

        profile_id = profile_result.data["id"]

        # Build checklist items from subtasks
        checklist_items = []
        if subtasks:
            for subtask in subtasks:
                checklist_items.append({
                    "id": str(uuid.uuid4()),
                    "text": subtask,
                    "is_completed": False
                })

        # Create task
        task_data = {
            "profile_id": profile_id,
            "user_id": user_id,
            "title": title,
            "description": description,
            "category": category,
            "priority": priority,
            "is_system_task": False,
            "is_completed": False,
            "days_before_departure": days_before_departure,
            "checklist_items": checklist_items,
            "depends_on_task_ids": [],
            "blocks_task_ids": []
        }

        task = await safe_db_insert("transition_tasks", task_data, user_id)

        logger.info(f"Created transition task '{title}' for user {user_id}")

        return {
            "success": True,
            "task": task,
            "message": f"Added '{title}' to your {category} tasks with {priority} priority."
        }

    except ValidationError:
        raise
    except ResourceNotFoundError:
        raise
    except DatabaseError:
        raise
    except Exception as e:
        logger.error(
            f"Unexpected error creating transition task",
            extra={"user_id": user_id, "title": title},
            exc_info=True
        )
        raise DatabaseError(
            "Failed to create transition task",
            context={"user_id": user_id, "title": title, "error": str(e)}
        )


async def update_transition_task(
    user_id: str,
    task_id: str,
    title: Optional[str] = None,
    description: Optional[str] = None,
    priority: Optional[str] = None,
    category: Optional[str] = None,
    days_before_departure: Optional[int] = None
) -> Dict[str, Any]:
    """
    Update an existing transition task.

    Args:
        user_id: The user's ID
        task_id: ID of the task to update
        title: New title
        description: New description
        priority: New priority (critical, high, medium, low)
        category: New category
        days_before_departure: New days before departure

    Returns:
        Dict with updated task details

    Raises:
        ValidationError: Invalid input parameters
        ResourceNotFoundError: Task not found
        DatabaseError: Database operation failed

    Example:
        User: "Change the priority of my solar panel task to critical"
        User: "Update the description of task X"
    """
    try:
        validate_uuid(user_id, "user_id")
        validate_uuid(task_id, "task_id")

        if priority and priority not in VALID_PRIORITIES:
            raise ValidationError(
                f"Invalid priority. Must be one of: {', '.join(VALID_PRIORITIES)}",
                context={"priority": priority, "valid_priorities": VALID_PRIORITIES}
            )

        if category and category not in VALID_CATEGORIES:
            raise ValidationError(
                f"Invalid category. Must be one of: {', '.join(VALID_CATEGORIES)}",
                context={"category": category, "valid_categories": VALID_CATEGORIES}
            )

        if days_before_departure is not None:
            validate_positive_number(days_before_departure, "days_before_departure")

        supabase = get_supabase_client()

        # Verify task belongs to user
        existing = supabase.table("transition_tasks")\
            .select("*")\
            .eq("id", task_id)\
            .eq("user_id", user_id)\
            .maybeSingle()\
            .execute()

        if not existing.data:
            raise ResourceNotFoundError(
                "Task not found or you don't have permission to update it.",
                context={"user_id": user_id, "task_id": task_id}
            )

        # Build update data
        update_data = {"updated_at": datetime.utcnow().isoformat()}

        if title:
            update_data["title"] = title
        if description is not None:
            update_data["description"] = description
        if priority:
            update_data["priority"] = priority
        if category:
            update_data["category"] = category
        if days_before_departure is not None:
            update_data["days_before_departure"] = days_before_departure

        if not update_data or update_data == {"updated_at": datetime.utcnow().isoformat()}:
            raise ValidationError(
                "No updates provided",
                context={"user_id": user_id, "task_id": task_id}
            )

        updated_task = await safe_db_update("transition_tasks", task_id, update_data, user_id)

        logger.info(f"Updated transition task {task_id} for user {user_id}")

        return {
            "success": True,
            "task": updated_task,
            "message": f"Updated task '{updated_task['title']}'."
        }

    except ValidationError:
        raise
    except ResourceNotFoundError:
        raise
    except DatabaseError:
        raise
    except Exception as e:
        logger.error(
            f"Unexpected error updating transition task",
            extra={"user_id": user_id, "task_id": task_id},
            exc_info=True
        )
        raise DatabaseError(
            "Failed to update transition task",
            context={"user_id": user_id, "task_id": task_id, "error": str(e)}
        )


async def complete_transition_task(
    user_id: str,
    task_id: Optional[str] = None,
    task_title: Optional[str] = None,
    notes: Optional[str] = None
) -> Dict[str, Any]:
    """
    Mark a transition task as complete.

    Can identify task by ID or by title (fuzzy match).

    Args:
        user_id: The user's ID
        task_id: ID of the task to complete (optional if task_title provided)
        task_title: Title of the task to complete (fuzzy match)
        notes: Completion notes

    Returns:
        Dict with completion status and updated stats

    Raises:
        ValidationError: Invalid input parameters or missing required fields
        ResourceNotFoundError: Task not found
        DatabaseError: Database operation failed

    Example:
        User: "Mark 'sell the couch' as done"
        User: "Complete the solar panel task"
        User: "I finished canceling my gym membership"
    """
    try:
        validate_uuid(user_id, "user_id")

        if task_id:
            validate_uuid(task_id, "task_id")

        if not task_id and not task_title:
            raise ValidationError(
                "Please provide either task_id or task_title.",
                context={"user_id": user_id}
            )
        supabase = get_supabase_client()

        # Find task by ID or title
        if task_id:
            task_result = supabase.table("transition_tasks")\
                .select("*")\
                .eq("id", task_id)\
                .eq("user_id", user_id)\
                .maybeSingle()\
                .execute()
        elif task_title:
            # Search by title (case-insensitive partial match)
            all_tasks = supabase.table("transition_tasks")\
                .select("*")\
                .eq("user_id", user_id)\
                .eq("is_completed", False)\
                .execute()

            matching_tasks = [
                t for t in (all_tasks.data or [])
                if task_title.lower() in t.get("title", "").lower()
            ]

            if len(matching_tasks) == 0:
                raise ResourceNotFoundError(
                    f"No incomplete task found matching '{task_title}'.",
                    context={"user_id": user_id, "task_title": task_title}
                )
            elif len(matching_tasks) > 1:
                titles = [t["title"] for t in matching_tasks[:5]]
                raise ValidationError(
                    f"Multiple tasks match '{task_title}'. Please be more specific. Matches: {titles}",
                    context={"user_id": user_id, "task_title": task_title, "matches": titles}
                )

            task_result = type("Result", (), {"data": matching_tasks[0]})()

        if not task_result.data:
            raise ResourceNotFoundError(
                "Task not found.",
                context={"user_id": user_id, "task_id": task_id}
            )

        task = task_result.data
        task_id = task["id"]

        if task.get("is_completed"):
            return {
                "success": True,
                "message": f"Task '{task['title']}' was already completed.",
                "already_completed": True
            }

        # Mark as complete
        update_data = {
            "is_completed": True,
            "completed_at": datetime.utcnow().isoformat(),
            "updated_at": datetime.utcnow().isoformat()
        }

        result = supabase.table("transition_tasks")\
            .update(update_data)\
            .eq("id", task_id)\
            .execute()

        # Get updated stats
        stats_result = supabase.table("transition_tasks")\
            .select("is_completed")\
            .eq("user_id", user_id)\
            .execute()

        all_tasks = stats_result.data or []
        total = len(all_tasks)
        completed = len([t for t in all_tasks if t.get("is_completed")])

        logger.info(f"Completed transition task '{task['title']}' for user {user_id}")

        return {
            "success": True,
            "task": result.data[0] if result.data else task,
            "message": f"Marked '{task['title']}' as complete! You've now finished {completed} of {total} tasks.",
            "stats": {
                "total": total,
                "completed": completed,
                "remaining": total - completed,
                "completion_percentage": round((completed / total * 100) if total > 0 else 0)
            }
        }

    except ValidationError:
        raise
    except ResourceNotFoundError:
        raise
    except DatabaseError:
        raise
    except Exception as e:
        logger.error(
            f"Unexpected error completing transition task",
            extra={"user_id": user_id, "task_id": task_id, "task_title": task_title},
            exc_info=True
        )
        raise DatabaseError(
            "Failed to complete transition task",
            context={"user_id": user_id, "task_id": task_id, "error": str(e)}
        )
