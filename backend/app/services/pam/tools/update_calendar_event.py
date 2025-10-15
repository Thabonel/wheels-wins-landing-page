"""Calendar Event Update Tool for PAM

Allows PAM to modify existing calendar events through natural language.

Example usage:
- "Move my dentist appointment to 3pm"
- "Change the location of my meeting to downtown office"
- "Update the oil change reminder for next week"
"""

import logging
from datetime import datetime
from typing import Any, Dict, Optional
from supabase import Client

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
    """
    from app.integrations.supabase import get_supabase_client

    try:
        # Get Supabase client
        supabase: Client = get_supabase_client()

        # First verify the event exists and belongs to the user
        existing_response = supabase.table("calendar_events").select("*").eq("id", event_id).eq("user_id", user_id).execute()

        if not existing_response.data:
            logger.warning(f"Calendar event {event_id} not found for user {user_id}")
            return {
                "success": False,
                "error": f"Calendar event not found or you don't have permission to modify it"
            }

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
            # Validate event_type
            valid_types = ['reminder', 'trip', 'booking', 'maintenance', 'inspection']
            if event_type not in valid_types:
                logger.warning(f"Invalid event_type '{event_type}', skipping")
            else:
                update_data["event_type"] = event_type

        if all_day is not None:
            update_data["all_day"] = all_day

        if location_name is not None:
            update_data["location_name"] = location_name

        if reminder_minutes is not None:
            update_data["reminder_minutes"] = [reminder_minutes] if isinstance(reminder_minutes, int) else reminder_minutes

        if color is not None:
            update_data["color"] = color

        # Add updated_at timestamp
        update_data["updated_at"] = datetime.utcnow().isoformat()

        # Update in database
        response = supabase.table("calendar_events").update(update_data).eq("id", event_id).eq("user_id", user_id).execute()

        if response.data:
            event = response.data[0]
            logger.info(f"Updated calendar event: {event['id']} for user {user_id}")

            return {
                "success": True,
                "event": event,
                "message": f"Successfully updated '{event['title']}'"
            }
        else:
            logger.error(f"Failed to update calendar event: {response}")
            return {
                "success": False,
                "error": "Failed to update calendar event"
            }

    except Exception as e:
        logger.error(f"Error updating calendar event: {e}", exc_info=True)
        return {
            "success": False,
            "error": str(e)
        }
