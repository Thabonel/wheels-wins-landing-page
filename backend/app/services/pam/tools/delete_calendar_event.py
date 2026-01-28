"""Calendar Event Deletion Tool for PAM

Allows PAM to delete calendar events through natural language.

Example usage:
- "Delete my dentist appointment"
- "Cancel the meeting on Friday"
- "Remove the oil change reminder"

Amendment #1: Refactored to use exception hierarchy and utility functions
"""

import logging
from typing import Any, Dict
from supabase import Client

from app.services.pam.tools.exceptions import (
    ValidationError,
    DatabaseError,
    ResourceNotFoundError,
)
from app.services.pam.tools.utils import (
    validate_uuid,
    safe_db_delete,
)

logger = logging.getLogger(__name__)


async def delete_calendar_event(
    user_id: str,
    event_id: str,
    **kwargs
) -> Dict[str, Any]:
    """
    Delete a calendar event for the user

    Args:
        user_id: UUID of the user (for authorization)
        event_id: UUID of the event to delete

    Returns:
        Dict with success status and message

    Raises:
        ValidationError: Invalid input parameters
        ResourceNotFoundError: Event not found
        DatabaseError: Database operation failed
    """
    try:
        # Validate inputs
        validate_uuid(user_id, "user_id")
        validate_uuid(event_id, "event_id")

        from app.database.supabase_client import get_supabase_service
        supabase: Client = get_supabase_service()

        # Verify the event exists and belongs to the user
        existing_response = supabase.table("calendar_events")\
            .select("title")\
            .eq("id", event_id)\
            .eq("user_id", user_id)\
            .maybeSingle()\
            .execute()

        if not existing_response.data:
            raise ResourceNotFoundError(
                "Calendar event not found or you don't have permission to delete it",
                context={"user_id": user_id, "event_id": event_id}
            )

        event_title = existing_response.data["title"]

        # Use safe database delete
        await safe_db_delete("calendar_events", event_id, user_id)

        logger.info(f"Deleted calendar event: {event_id} ({event_title}) for user {user_id}")

        return {
            "success": True,
            "message": f"Successfully deleted '{event_title}' from your calendar"
        }

    except ValidationError:
        raise
    except ResourceNotFoundError:
        raise
    except DatabaseError:
        raise
    except Exception as e:
        logger.error(
            f"Unexpected error deleting calendar event",
            extra={"user_id": user_id, "event_id": event_id},
            exc_info=True
        )
        raise DatabaseError(
            "Failed to delete calendar event",
            context={"user_id": user_id, "event_id": event_id, "error": str(e)}
        )
