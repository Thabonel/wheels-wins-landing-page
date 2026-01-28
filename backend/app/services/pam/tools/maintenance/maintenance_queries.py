"""
PAM Maintenance Query Tools

Get maintenance schedule and history.
"""

import logging
from typing import Dict, Any, Optional
from datetime import datetime, date

from app.core.database import get_supabase_client
from app.services.pam.tools.exceptions import (
    ValidationError,
    DatabaseError,
)
from app.services.pam.tools.utils import (
    validate_uuid,
)

logger = logging.getLogger(__name__)

DEFAULT_QUERY_LIMIT = 10
MIN_QUERY_LIMIT = 1
MAX_QUERY_LIMIT = 100


async def get_maintenance_schedule(
    user_id: str,
    status: str = "all",
    limit: int = DEFAULT_QUERY_LIMIT
) -> Dict[str, Any]:
    """
    View upcoming and overdue maintenance.

    Args:
        user_id: The user's ID
        status: Filter by status ('all', 'upcoming', 'overdue')
        limit: Maximum records to return

    Returns:
        Dict with upcoming and overdue maintenance items

    Raises:
        ValidationError: Invalid input parameters
        DatabaseError: Database operation failed

    Example:
        User: "When is my next service due?"
        User: "What maintenance is overdue?"
        User: "Show my maintenance schedule"
    """
    try:
        validate_uuid(user_id, "user_id")

        valid_statuses = ["all", "upcoming", "overdue"]
        if status not in valid_statuses:
            raise ValidationError(
                f"Invalid status. Must be one of: {', '.join(valid_statuses)}",
                context={"status": status, "valid_statuses": valid_statuses}
            )

        if limit < MIN_QUERY_LIMIT or limit > MAX_QUERY_LIMIT:
            raise ValidationError(
                f"Limit must be between {MIN_QUERY_LIMIT} and {MAX_QUERY_LIMIT}",
                context={"limit": limit}
            )

        supabase = get_supabase_client()

        result = supabase.table("maintenance_records")\
            .select("*")\
            .eq("user_id", user_id)\
            .order("date", desc=False)\
            .execute()

        records = result.data or []

        if not records:
            return {
                "success": True,
                "upcoming": [],
                "overdue": [],
                "message": "No maintenance records found. Would you like to schedule some?"
            }

        today = date.today()
        upcoming = []
        overdue = []

        for record in records:
            record_date = datetime.strptime(record["date"], "%Y-%m-%d").date()

            if record_date >= today:
                days_until = (record_date - today).days
                upcoming.append({
                    "id": record["id"],
                    "task": record["task"],
                    "date": record["date"],
                    "mileage": record.get("mileage"),
                    "days_until": days_until,
                    "status": "upcoming"
                })
            else:
                days_overdue = (today - record_date).days
                overdue.append({
                    "id": record["id"],
                    "task": record["task"],
                    "date": record["date"],
                    "mileage": record.get("mileage"),
                    "days_overdue": days_overdue,
                    "status": "overdue"
                })

        if status == "upcoming":
            overdue = []
        elif status == "overdue":
            upcoming = []

        upcoming = upcoming[:limit]
        overdue = overdue[:limit]

        message_parts = []

        if upcoming:
            next_item = upcoming[0]
            if next_item["days_until"] == 0:
                message_parts.append(f"Today: {next_item['task']}")
            elif next_item["days_until"] == 1:
                message_parts.append(f"Tomorrow: {next_item['task']}")
            else:
                message_parts.append(f"Next service: {next_item['task']} in {next_item['days_until']} days ({next_item['date']})")

            if len(upcoming) > 1:
                message_parts.append(f"{len(upcoming) - 1} more upcoming.")
        else:
            message_parts.append("No upcoming maintenance scheduled.")

        if overdue:
            if len(overdue) == 1:
                item = overdue[0]
                message_parts.append(f"Warning: {item['task']} is {item['days_overdue']} days overdue!")
            else:
                message_parts.append(f"Warning: {len(overdue)} items are overdue!")

        return {
            "success": True,
            "upcoming": upcoming,
            "overdue": overdue,
            "summary": {
                "upcoming_count": len(upcoming),
                "overdue_count": len(overdue),
                "next_service_date": upcoming[0]["date"] if upcoming else None,
                "next_service_task": upcoming[0]["task"] if upcoming else None
            },
            "message": " ".join(message_parts)
        }

    except ValidationError:
        raise
    except DatabaseError:
        raise
    except Exception as e:
        logger.error(
            f"Unexpected error getting maintenance schedule",
            extra={"user_id": user_id, "status": status},
            exc_info=True
        )
        raise DatabaseError(
            "Failed to retrieve maintenance schedule",
            context={"user_id": user_id, "status": status, "error": str(e)}
        )


async def get_maintenance_history(
    user_id: str,
    task_type: Optional[str] = None,
    limit: int = DEFAULT_QUERY_LIMIT
) -> Dict[str, Any]:
    """
    View past maintenance records.

    Args:
        user_id: The user's ID
        task_type: Filter by task type (e.g., 'oil change', 'tire')
        limit: Maximum records to return

    Returns:
        Dict with maintenance history

    Raises:
        ValidationError: Invalid input parameters
        DatabaseError: Database operation failed

    Example:
        User: "When did I last change the oil?"
        User: "Show my maintenance history"
        User: "What maintenance have I done this year?"
    """
    try:
        validate_uuid(user_id, "user_id")

        if limit < MIN_QUERY_LIMIT or limit > MAX_QUERY_LIMIT:
            raise ValidationError(
                f"Limit must be between {MIN_QUERY_LIMIT} and {MAX_QUERY_LIMIT}",
                context={"limit": limit}
            )

        supabase = get_supabase_client()

        result = supabase.table("maintenance_records")\
            .select("*")\
            .eq("user_id", user_id)\
            .order("date", desc=True)\
            .execute()

        records = result.data or []

        if not records:
            return {
                "success": True,
                "history": [],
                "message": "No maintenance history found."
            }

        today = date.today()
        history = []

        for record in records:
            record_date = datetime.strptime(record["date"], "%Y-%m-%d").date()

            if record_date <= today:
                if task_type:
                    if task_type.lower() not in record["task"].lower():
                        continue

                days_ago = (today - record_date).days
                history.append({
                    "id": record["id"],
                    "task": record["task"],
                    "date": record["date"],
                    "mileage": record.get("mileage"),
                    "cost": record.get("cost"),
                    "notes": record.get("notes"),
                    "days_ago": days_ago
                })

        history = history[:limit]

        if not history:
            if task_type:
                message = f"No history found for '{task_type}'."
            else:
                message = "No maintenance history found."
        else:
            if task_type:
                last_item = history[0]
                if last_item["days_ago"] == 0:
                    message = f"Your last {task_type} was today"
                elif last_item["days_ago"] == 1:
                    message = f"Your last {task_type} was yesterday"
                else:
                    message = f"Your last {task_type} was {last_item['days_ago']} days ago ({last_item['date']})"

                if last_item.get("mileage"):
                    message += f" at {last_item['mileage']:,} miles"
            else:
                message = f"Found {len(history)} maintenance records."
                if history:
                    recent = history[0]
                    message += f" Most recent: {recent['task']} on {recent['date']}."

        total_cost = sum(r.get("cost", 0) or 0 for r in history)

        return {
            "success": True,
            "history": history,
            "count": len(history),
            "total_cost": total_cost,
            "filter_applied": task_type,
            "message": message
        }

    except ValidationError:
        raise
    except DatabaseError:
        raise
    except Exception as e:
        logger.error(
            f"Unexpected error getting maintenance history",
            extra={"user_id": user_id, "task_type": task_type},
            exc_info=True
        )
        raise DatabaseError(
            "Failed to retrieve maintenance history",
            context={"user_id": user_id, "task_type": task_type, "error": str(e)}
        )
