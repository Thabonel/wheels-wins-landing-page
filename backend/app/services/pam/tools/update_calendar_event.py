"""Calendar Event Update Tool for PAM

Allows PAM to modify existing calendar events through natural language.

Example usage:
- "Move my dentist appointment to 3pm"
- "Change the location of my meeting to downtown office"
- "Update the oil change reminder for next week"

Amendment #1: Refactored to use exception hierarchy and utility functions
"""

import logging
from datetime import datetime
from typing import Any, Dict, Optional
from supabase import Client

from app.services.pam.tools.exceptions import (
    ValidationError,
    DatabaseError,
    ResourceNotFoundError,
)
from app.services.pam.tools.utils import (
    validate_uuid,
    validate_date_format,
    safe_db_update,
    safe_db_select,
)

logger = logging.getLogger(__name__)


async def update_calendar_event(
    user_id: str,
    event_id: str,
    title: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    description: Optional[str] = None,
    event_type: Optional[str] = None,
    all_day: Optional[bool] = None,
    location_name: Optional[str] = None,
    reminder_minutes: Optional[int] = None,
    color: Optional[str] = None,
    **kwargs
) -> Dict[str, Any]:
    """
    Update an existing calendar event for the user

    Args:
        user_id: UUID of the user (for authorization)
        event_id: UUID of the event to update
        title: New event title (optional)
        start_date: New start date/time in ISO format (optional)
        end_date: New end date/time in ISO format (optional)
        description: New event description (optional)
        event_type: New event type - reminder, trip, booking, maintenance, inspection (optional)
        all_day: Whether this is an all-day event (optional)
        location_name: New location name (optional)
        reminder_minutes: New reminder time in minutes before event (optional)
        color: New color hex code for calendar display (optional)

    Returns:
        Dict with updated event details

    Raises:
        ValidationError: Invalid input parameters
        ResourceNotFoundError: Event not found
        DatabaseError: Database operation failed
    """
    try:
        # Validate inputs
        validate_uuid(user_id, "user_id")
        validate_uuid(event_id, "event_id")

        if start_date:
            validate_date_format(start_date, "start_date")
        if end_date:
            validate_date_format(end_date, "end_date")

        from app.database.supabase_client import get_supabase_service
        supabase: Client = get_supabase_service()

        # Verify the event exists and belongs to the user
        existing_response = supabase.table("calendar_events")\
            .select("*")\
            .eq("id", event_id)\
            .eq("user_id", user_id)\
            .maybeSingle()\
            .execute()

        if not existing_response.data:
            raise ResourceNotFoundError(
                "Calendar event not found or you don't have permission to modify it",
                context={"user_id": user_id, "event_id": event_id}
            )

        # Build update data (only include fields that were provided)
        update_data = {}

        if title is not None:
            update_data["title"] = title

        if start_date is not None:
            start_dt = datetime.fromisoformat(start_date.replace('Z', '+00:00'))
            update_data["start_date"] = start_dt.isoformat()

        if end_date is not None:
            end_dt = datetime.fromisoformat(end_date.replace('Z', '+00:00'))
            update_data["end_date"] = end_dt.isoformat()

        if description is not None:
            update_data["description"] = description

        if event_type is not None:
            valid_types = ['reminder', 'trip', 'booking', 'maintenance', 'inspection']
            if event_type not in valid_types:
                raise ValidationError(
                    f"Invalid event_type. Must be one of: {', '.join(valid_types)}",
                    context={"event_type": event_type, "valid_types": valid_types}
                )
            update_data["event_type"] = event_type

        if all_day is not None:
            update_data["all_day"] = all_day

        if location_name is not None:
            update_data["location_name"] = location_name

        if reminder_minutes is not None:
            update_data["reminder_minutes"] = [reminder_minutes] if isinstance(reminder_minutes, int) else reminder_minutes

        if color is not None:
            update_data["color"] = color

        if not update_data:
            raise ValidationError(
                "No updates provided",
                context={"user_id": user_id, "event_id": event_id}
            )

        # Add updated_at timestamp
        update_data["updated_at"] = datetime.utcnow().isoformat()

        # Use safe database update
        event = await safe_db_update("calendar_events", event_id, update_data, user_id)

        logger.info(f"Updated calendar event: {event['id']} for user {user_id}")

        return {
            "success": True,
            "event": event,
            "message": f"Successfully updated '{event['title']}'"
        }

    except ValidationError:
        raise
    except ResourceNotFoundError:
        raise
    except DatabaseError:
        raise
    except Exception as e:
        logger.error(
            f"Unexpected error updating calendar event",
            extra={"user_id": user_id, "event_id": event_id},
            exc_info=True
        )
        raise DatabaseError(
            "Failed to update calendar event",
            context={"user_id": user_id, "event_id": event_id, "error": str(e)}
        )
