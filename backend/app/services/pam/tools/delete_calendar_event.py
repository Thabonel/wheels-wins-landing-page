"""Calendar Event Deletion Tool for PAM

Allows PAM to delete calendar events through natural language.

Example usage:
- "Delete my dentist appointment"
- "Cancel the meeting on Friday"
- "Remove the oil change reminder"
"""

import logging
from typing import Any, Dict
from supabase import Client

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
    """
    from app.database.supabase_client import get_supabase_service

    try:
        # Use service_role client to bypass RLS (PAM is already authenticated)
        supabase: Client = get_supabase_service()

        # First verify the event exists and belongs to the user
        existing_response = supabase.table("calendar_events").select("title").eq("id", event_id).eq("user_id", user_id).execute()

        if not existing_response.data:
            logger.warning(f"Calendar event {event_id} not found for user {user_id}")
            return {
                "success": False,
                "error": f"Calendar event not found or you don't have permission to delete it"
            }

        event_title = existing_response.data[0]["title"]

        # Delete from database
        response = supabase.table("calendar_events").delete().eq("id", event_id).eq("user_id", user_id).execute()

        logger.info(f"Deleted calendar event: {event_id} ({event_title}) for user {user_id}")

        return {
            "success": True,
            "message": f"Successfully deleted '{event_title}' from your calendar"
        }

    except Exception as e:
        logger.error(f"Error deleting calendar event: {e}", exc_info=True)
        return {
            "success": False,
            "error": str(e)
        }
