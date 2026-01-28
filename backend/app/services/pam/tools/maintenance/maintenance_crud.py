"""
PAM Maintenance CRUD Tools

Create, update, and delete maintenance records.
"""

import logging
from typing import Dict, Any, Optional
from datetime import datetime, date

from app.core.database import get_supabase_client
from app.services.pam.tools.exceptions import (
    ValidationError,
    DatabaseError,
    ResourceNotFoundError,
)
from app.services.pam.tools.utils import (
    validate_uuid,
    validate_positive_number,
    validate_date_format,
    safe_db_insert,
    safe_db_update,
    safe_db_delete,
    safe_db_select,
)

logger = logging.getLogger(__name__)

MAX_FUZZY_MATCHES_DISPLAY = 5


async def create_maintenance_record(
    user_id: str,
    task: str,
    service_date: str,
    mileage: Optional[int] = None,
    notes: Optional[str] = None,
    cost: Optional[float] = None
) -> Dict[str, Any]:
    """
    Create a new maintenance record.

    Can be used to schedule future maintenance or log completed service.

    Args:
        user_id: The user's ID
        task: Description of maintenance task (e.g., 'Oil change', 'Tire rotation')
        service_date: Service date (YYYY-MM-DD) - future for scheduled, past for completed
        mileage: Vehicle mileage at service
        notes: Additional notes
        cost: Cost of service

    Returns:
        Dict with created record details

    Raises:
        ValidationError: Invalid input parameters
        DatabaseError: Database operation failed

    Example:
        User: "Schedule an oil change for February 15th"
        User: "I just got my tires rotated today"
        User: "Remind me to change the oil at 45000 miles"
    """
    try:
        validate_uuid(user_id, "user_id")
        validate_date_format(service_date, "service_date")

        if not task or not task.strip():
            raise ValidationError(
                "Task description is required",
                context={"task": task}
            )

        if mileage is not None:
            validate_positive_number(mileage, "mileage")

        if cost is not None:
            validate_positive_number(cost, "cost")

        parsed_date = datetime.strptime(service_date, "%Y-%m-%d").date()

        record_data = {
            "user_id": user_id,
            "task": task.strip(),
            "date": service_date,
            "mileage": mileage or 0,
        }

        if notes:
            record_data["notes"] = notes.strip()
        if cost:
            record_data["cost"] = cost

        record = await safe_db_insert("maintenance_records", record_data, user_id)

        is_future = parsed_date > date.today()
        action = "Scheduled" if is_future else "Logged"

        logger.info(f"{action} maintenance '{task}' for user {user_id}")

        message = f"{action} {task} for {service_date}"
        if mileage:
            message += f" at {mileage:,} miles"
        if cost:
            message += f" (${cost:.2f})"
        if is_future:
            days_until = (parsed_date - date.today()).days
            message += f". That's {days_until} days from now."

        return {
            "success": True,
            "record_id": record.get("id"),
            "record": record,
            "is_scheduled": is_future,
            "calendar_event_suggested": is_future,
            "message": message
        }

    except ValidationError:
        raise
    except DatabaseError:
        raise
    except Exception as e:
        logger.error(
            f"Unexpected error creating maintenance record",
            extra={"user_id": user_id, "task": task},
            exc_info=True
        )
        raise DatabaseError(
            "Failed to create maintenance record",
            context={"user_id": user_id, "task": task, "error": str(e)}
        )


async def update_maintenance_record(
    user_id: str,
    record_id: Optional[int] = None,
    task_name: Optional[str] = None,
    new_task: Optional[str] = None,
    new_date: Optional[str] = None,
    new_mileage: Optional[int] = None,
    notes: Optional[str] = None,
    cost: Optional[float] = None
) -> Dict[str, Any]:
    """
    Update an existing maintenance record.

    Can find record by ID or by task name (fuzzy match).

    Args:
        user_id: The user's ID
        record_id: ID of the record to update
        task_name: Name of the task to update (fuzzy match if ID not provided)
        new_task: New task description
        new_date: New service date (YYYY-MM-DD)
        new_mileage: New mileage
        notes: Additional notes
        cost: Cost of service

    Returns:
        Dict with updated record

    Raises:
        ValidationError: Invalid input parameters or no updates provided
        ResourceNotFoundError: Record not found or multiple matches
        DatabaseError: Database operation failed

    Example:
        User: "Move my oil change to February 20th"
        User: "Update the mileage on my last tire rotation to 44850"
    """
    try:
        validate_uuid(user_id, "user_id")

        if new_date:
            validate_date_format(new_date, "new_date")

        if new_mileage is not None:
            validate_positive_number(new_mileage, "new_mileage")

        if cost is not None:
            validate_positive_number(cost, "cost")

        supabase = get_supabase_client()

        if record_id:
            existing = supabase.table("maintenance_records")\
                .select("*")\
                .eq("id", record_id)\
                .eq("user_id", user_id)\
                .maybeSingle()\
                .execute()
        elif task_name:
            all_records = supabase.table("maintenance_records")\
                .select("*")\
                .eq("user_id", user_id)\
                .execute()

            matching = [
                r for r in (all_records.data or [])
                if task_name.lower() in r.get("task", "").lower()
            ]

            if len(matching) == 0:
                raise ResourceNotFoundError(
                    f"No maintenance record found matching '{task_name}'",
                    context={"user_id": user_id, "task_name": task_name}
                )
            elif len(matching) > 1:
                tasks = [f"{r['task']} ({r['date']})" for r in matching[:MAX_FUZZY_MATCHES_DISPLAY]]
                raise ValidationError(
                    f"Multiple records match '{task_name}'. Please be more specific.",
                    context={
                        "matches": tasks,
                        "count": len(matching)
                    }
                )

            existing = type("Result", (), {"data": matching[0]})()
        else:
            raise ValidationError(
                "Please provide either record_id or task_name",
                context={"record_id": record_id, "task_name": task_name}
            )

        if not existing.data:
            raise ResourceNotFoundError(
                "Maintenance record not found",
                context={"user_id": user_id, "record_id": record_id, "task_name": task_name}
            )

        record = existing.data
        record_id = record["id"]

        update_data = {}
        if new_task:
            update_data["task"] = new_task.strip()
        if new_date:
            update_data["date"] = new_date
        if new_mileage is not None:
            update_data["mileage"] = new_mileage
        if notes is not None:
            update_data["notes"] = notes.strip() if notes else notes
        if cost is not None:
            update_data["cost"] = cost

        if not update_data:
            raise ValidationError(
                "No updates provided",
                context={"user_id": user_id, "record_id": record_id}
            )

        updated = await safe_db_update("maintenance_records", record_id, update_data, user_id)

        logger.info(f"Updated maintenance record {record_id} for user {user_id}")

        return {
            "success": True,
            "record": updated,
            "message": f"Updated {updated['task']} - {updated['date']}."
        }

    except ValidationError:
        raise
    except ResourceNotFoundError:
        raise
    except DatabaseError:
        raise
    except Exception as e:
        logger.error(
            f"Unexpected error updating maintenance record",
            extra={"user_id": user_id, "record_id": record_id, "task_name": task_name},
            exc_info=True
        )
        raise DatabaseError(
            "Failed to update maintenance record",
            context={"user_id": user_id, "record_id": record_id, "error": str(e)}
        )


async def delete_maintenance_record(
    user_id: str,
    record_id: Optional[int] = None,
    task_name: Optional[str] = None,
    confirm: bool = False
) -> Dict[str, Any]:
    """
    Delete a maintenance record.

    Requires confirmation to prevent accidental deletion.

    Args:
        user_id: The user's ID
        record_id: ID of the record to delete
        task_name: Name of the task to delete (fuzzy match)
        confirm: Must be True to actually delete

    Returns:
        Dict with deletion status

    Raises:
        ValidationError: Invalid input or missing confirmation
        ResourceNotFoundError: Record not found or multiple matches
        DatabaseError: Database operation failed

    Example:
        User: "Delete the brake inspection task"
        PAM: (asks for confirmation)
        User: "Yes"
        PAM: "Deleted brake inspection record."
    """
    try:
        validate_uuid(user_id, "user_id")

        supabase = get_supabase_client()

        if record_id:
            existing = supabase.table("maintenance_records")\
                .select("*")\
                .eq("id", record_id)\
                .eq("user_id", user_id)\
                .maybeSingle()\
                .execute()
        elif task_name:
            all_records = supabase.table("maintenance_records")\
                .select("*")\
                .eq("user_id", user_id)\
                .execute()

            matching = [
                r for r in (all_records.data or [])
                if task_name.lower() in r.get("task", "").lower()
            ]

            if len(matching) == 0:
                raise ResourceNotFoundError(
                    f"No maintenance record found matching '{task_name}'",
                    context={"user_id": user_id, "task_name": task_name}
                )
            elif len(matching) > 1:
                tasks = [f"{r['task']} ({r['date']})" for r in matching[:MAX_FUZZY_MATCHES_DISPLAY]]
                raise ValidationError(
                    f"Multiple records match '{task_name}'. Please be more specific.",
                    context={
                        "matches": tasks,
                        "count": len(matching)
                    }
                )

            existing = type("Result", (), {"data": matching[0]})()
        else:
            raise ValidationError(
                "Please provide either record_id or task_name",
                context={"record_id": record_id, "task_name": task_name}
            )

        if not existing.data:
            raise ResourceNotFoundError(
                "Maintenance record not found",
                context={"user_id": user_id, "record_id": record_id, "task_name": task_name}
            )

        record = existing.data
        record_id = record["id"]

        if not confirm:
            raise ValidationError(
                f"Are you sure you want to delete '{record['task']}' scheduled for {record['date']}? This cannot be undone.",
                context={
                    "requires_confirmation": True,
                    "record": record
                }
            )

        await safe_db_delete("maintenance_records", record_id, user_id)

        logger.info(f"Deleted maintenance record {record_id} for user {user_id}")

        return {
            "success": True,
            "deleted_record": record,
            "message": f"Deleted '{record['task']}' maintenance record."
        }

    except ValidationError:
        raise
    except ResourceNotFoundError:
        raise
    except DatabaseError:
        raise
    except Exception as e:
        logger.error(
            f"Unexpected error deleting maintenance record",
            extra={"user_id": user_id, "record_id": record_id, "task_name": task_name},
            exc_info=True
        )
        raise DatabaseError(
            "Failed to delete maintenance record",
            context={"user_id": user_id, "record_id": record_id, "error": str(e)}
        )
