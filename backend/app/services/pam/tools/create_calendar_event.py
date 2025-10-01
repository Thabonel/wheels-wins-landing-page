"""Calendar Event Creation Tool for PAM

Allows PAM to add events to the user's calendar through natural language.

Example usage:
- "Add a doctor appointment to my calendar for next Tuesday at 2pm"
- "Schedule a trip to Yosemite from July 15-20"
- "Remind me about oil change next month"
"""

import logging
from datetime import datetime, timedelta
from typing import Any, Dict, Optional
from uuid import UUID

from supabase import Client

from .base_tool import BaseTool, ToolResult, ToolCapability

logger = logging.getLogger(__name__)


async def create_calendar_event(
    user_id: str,
    title: str,
    start_date: str,  # ISO format: "2025-09-30T14:00:00Z"
    end_date: Optional[str] = None,
    description: Optional[str] = None,
    event_type: str = "personal",
    all_day: bool = False,
    location_name: Optional[str] = None,
    reminder_minutes: Optional[list] = None,
    color: str = "#3b82f6",
    **kwargs
) -> Dict[str, Any]:
    """
    Create a calendar event for the user

    Args:
        user_id: UUID of the user
        title: Event title (required)
        start_date: Start date/time in ISO format (required)
        end_date: End date/time in ISO format (optional)
        description: Event description (optional)
        event_type: Type of event - personal, trip, maintenance, meeting, reminder, birthday, holiday
        all_day: Whether this is an all-day event
        location_name: Location name (optional)
        reminder_minutes: Array of reminder times in minutes before event [15, 60, 1440]
        color: Color hex code for calendar display

    Returns:
        Dict with created event details
    """
    from app.integrations.supabase import get_supabase_client

    try:
        # Get Supabase client
        supabase: Client = get_supabase_client()

        # Validate event_type
        valid_types = ['personal', 'trip', 'maintenance', 'meeting', 'reminder', 'birthday', 'holiday']
        if event_type not in valid_types:
            event_type = 'personal'

        # Parse dates
        start_dt = datetime.fromisoformat(start_date.replace('Z', '+00:00'))

        # If no end date provided, default to 1 hour after start (unless all_day)
        if not end_date:
            if all_day:
                end_dt = start_dt.replace(hour=23, minute=59, second=59)
            else:
                end_dt = start_dt + timedelta(hours=1)
        else:
            end_dt = datetime.fromisoformat(end_date.replace('Z', '+00:00'))

        # Default reminders: 15 minutes before
        if reminder_minutes is None:
            reminder_minutes = [15]

        # Build event data
        event_data = {
            "user_id": user_id,
            "title": title,
            "description": description,
            "start_date": start_dt.isoformat(),
            "end_date": end_dt.isoformat(),
            "all_day": all_day,
            "event_type": event_type,
            "location_name": location_name,
            "reminder_minutes": reminder_minutes,
            "color": color,
            "is_private": True,  # Default to private
        }

        # Insert into database
        response = supabase.table("calendar_events").insert(event_data).execute()

        if response.data:
            event = response.data[0]
            logger.info(f"Created calendar event: {event['id']} for user {user_id}")

            return {
                "success": True,
                "event": event,
                "message": f"Successfully added '{title}' to your calendar"
            }
        else:
            logger.error(f"Failed to create calendar event: {response}")
            return {
                "success": False,
                "error": "Failed to create calendar event"
            }

    except Exception as e:
        logger.error(f"Error creating calendar event: {e}", exc_info=True)
        return {
            "success": False,
            "error": str(e)
        }


class CreateCalendarEventTool(BaseTool):
    """Tool for creating calendar events"""

    def __init__(self, user_jwt: Optional[str] = None):
        super().__init__(
            tool_name="create_calendar_event",
            description=(
                "Create a calendar event for the user. "
                "Use this when the user asks to add, schedule, or create calendar events. "
                "Supports various event types: personal, trip, maintenance, meeting, reminder, birthday, holiday."
            ),
            capabilities=[
                ToolCapability.ACTION,  # This is an action tool
                ToolCapability.WRITE,   # It writes data
            ],
            user_jwt=user_jwt
        )

    async def execute(self, user_id: str, parameters: Dict[str, Any] = None) -> ToolResult:
        """Execute the calendar event creation"""

        if not parameters:
            return self._create_error_result("No parameters provided")

        # Required parameters
        if "title" not in parameters:
            return self._create_error_result("Missing required parameter: title")
        if "start_date" not in parameters:
            return self._create_error_result("Missing required parameter: start_date")

        # Create the event
        result = await create_calendar_event(user_id=user_id, **parameters)

        if result.get("success"):
            return self._create_success_result(
                data=result["event"],
                metadata={
                    "message": result["message"],
                    "event_id": result["event"]["id"]
                }
            )
        else:
            return self._create_error_result(result.get("error", "Unknown error"))