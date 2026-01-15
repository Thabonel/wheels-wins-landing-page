"""Calendar Event Creation Tool for PAM

Allows PAM to add events to the user's calendar through natural language.

Example usage:
- "Add a doctor appointment to my calendar for next Tuesday at 2pm"
- "Schedule a trip to Yosemite from July 15-20"
- "Remind me about oil change next month"

Amendment #4: Input validation with Pydantic models
Amendment #5: Timezone-aware event creation with coordinate-based fallback
"""

import logging
from datetime import datetime, timedelta
from typing import Any, Dict, Optional, TYPE_CHECKING, List
from uuid import UUID
from pydantic import ValidationError
from zoneinfo import ZoneInfo

# Initialize logger first (before using it)
logger = logging.getLogger(__name__)

# Coordinate-based timezone detection (fallback)
try:
    from timezonefinder import TimezoneFinder
    TIMEZONE_FINDER_AVAILABLE = True
except ImportError:
    TIMEZONE_FINDER_AVAILABLE = False
    logger.warning("timezonefinder not available - coordinate-based timezone detection disabled")

# Import Client only for type checking to avoid runtime import failures
if TYPE_CHECKING:
    from supabase import Client

from .base_tool import BaseTool, ToolResult, ToolCapability
from app.services.pam.schemas import CreateCalendarEventInput


def detect_user_timezone(context: Dict[str, Any]) -> tuple[ZoneInfo, str, str]:
    """
    Detect user's timezone with multiple fallback strategies

    Strategy:
    1. Try browser-detected timezone (context['timezone'])
    2. Try coordinate-based detection (context['user_location'])
    3. Fall back to UTC

    Returns:
        tuple: (ZoneInfo object, timezone_string, detection_method)
    """
    # Strategy 1: Browser-detected timezone (primary)
    if 'timezone' in context and context['timezone']:
        user_timezone_str = context['timezone']
        try:
            user_timezone = ZoneInfo(user_timezone_str)
            logger.info(f"🌍 Timezone detected from browser: {user_timezone_str}")
            return user_timezone, user_timezone_str, "browser"
        except Exception as e:
            logger.warning(f"Invalid browser timezone '{user_timezone_str}': {e}")

    # Strategy 2: Coordinate-based detection (fallback)
    if TIMEZONE_FINDER_AVAILABLE and 'user_location' in context:
        user_loc = context['user_location']
        lat = user_loc.get('lat')
        lng = user_loc.get('lng')

        if lat and lng:
            try:
                tf = TimezoneFinder()
                timezone_str = tf.timezone_at(lat=lat, lng=lng)
                if timezone_str:
                    user_timezone = ZoneInfo(timezone_str)
                    logger.info(f"🌍 Timezone detected from coordinates ({lat}, {lng}): {timezone_str}")
                    return user_timezone, timezone_str, "coordinates"
            except Exception as e:
                logger.warning(f"Failed to detect timezone from coordinates ({lat}, {lng}): {e}")

    # Strategy 3: UTC fallback
    logger.warning("No timezone detected - falling back to UTC")
    return ZoneInfo('UTC'), 'UTC', "fallback"


async def create_calendar_event(
    user_id: str,
    title: str,
    start_date: str,
    end_date: Optional[str] = None,
    description: Optional[str] = None,
    event_type: str = "reminder",
    all_day: bool = False,
    location_name: Optional[str] = None,
    reminder_minutes: Optional[List[int]] = None,
    color: str = "#3b82f6",
    is_private: bool = True,
    context: Optional[Dict[str, Any]] = None,
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
        event_type: Type of event - reminder (default), trip, booking, maintenance, inspection
        all_day: Whether this is an all-day event
        location_name: Location name (optional)
        reminder_minutes: Array of reminder times in minutes before event [15, 60, 1440]
        color: Color hex code for calendar display
        is_private: Whether event is private (default: true)
        **kwargs: Additional context (e.g., timezone from user's browser)

    Returns:
        Dict with created event details

    Amendment #4: Pydantic validation for input data
    Amendment #5: Timezone-aware datetime interpretation with fallback strategies
        - Primary: Uses browser-detected timezone (context['timezone'])
        - Fallback: Derives timezone from GPS coordinates (context['user_location'])
        - Last resort: Uses UTC
        - If datetime has no timezone, interprets it in detected timezone
        - Stores in database with proper timezone offset
        - Automatically handles Daylight Saving Time transitions
    """
    # Validate inputs using Pydantic schema
    try:
        validated = CreateCalendarEventInput(
            user_id=user_id,
            title=title,
            start_date=start_date,
            end_date=end_date,
            description=description,
            event_type=event_type,
            all_day=all_day,
            location_name=location_name,
            reminder_minutes=reminder_minutes,
            color=color,
            is_private=is_private
        )
    except ValidationError as e:
        # Extract first error message for user-friendly response
        error_msg = e.errors()[0]['msg']
        return {
            "success": False,
            "error": f"Invalid input: {error_msg}"
        }

    from app.database.supabase_client import get_supabase_service

    try:
        # Get Supabase service client (bypasses RLS for authorized PAM operations)
        # PAM is already authenticated via WebSocket/JWT, so using service_role is safe
        supabase = get_supabase_service()  # Type: Client (imported only for type checking)

        # Detect user's timezone with fallback strategies
        # Use explicit context parameter (passed by PAM when function signature includes 'context')
        ctx = context or kwargs.get('context', {})
        user_timezone, user_timezone_str, detection_method = detect_user_timezone(ctx)

        # Parse dates with timezone awareness
        # If the datetime string has no timezone info, interpret it in user's timezone
        start_dt_raw = validated.start_date.replace('Z', '+00:00')
        start_dt = datetime.fromisoformat(start_dt_raw)

        # If datetime is naive (no timezone), localize it to user's timezone
        if start_dt.tzinfo is None:
            start_dt = datetime.fromisoformat(validated.start_date).replace(tzinfo=user_timezone)
            logger.info(f"Interpreted naive datetime '{validated.start_date}' as {user_timezone_str}: {start_dt.isoformat()}")

        # If no end date provided, default to 1 hour after start (unless all_day)
        if not validated.end_date:
            if validated.all_day:
                end_dt = start_dt.replace(hour=23, minute=59, second=59)
            else:
                end_dt = start_dt + timedelta(hours=1)
        else:
            end_dt_raw = validated.end_date.replace('Z', '+00:00')
            end_dt = datetime.fromisoformat(end_dt_raw)

            # If datetime is naive, localize it to user's timezone
            if end_dt.tzinfo is None:
                end_dt = datetime.fromisoformat(validated.end_date).replace(tzinfo=user_timezone)
                logger.info(f"Interpreted naive datetime '{validated.end_date}' as {user_timezone_str}: {end_dt.isoformat()}")

            # Validate end_date is after start_date
            if end_dt <= start_dt:
                return {
                    "success": False,
                    "error": "Invalid input: end date must be after start date"
                }

        # Default reminders: [15] minutes before (array of integers)
        reminder_list = validated.reminder_minutes if validated.reminder_minutes else [15]

        # Log timezone-aware event creation
        logger.info(f"📅 Creating calendar event")
        logger.info(f"   Title: {validated.title}")
        logger.info(f"   Timezone: {user_timezone_str} (detected via {detection_method})")
        logger.info(f"   Start (user timezone): {start_dt.strftime('%Y-%m-%d %I:%M %p %Z')}")
        logger.info(f"   End (user timezone): {end_dt.strftime('%Y-%m-%d %I:%M %p %Z')}")
        logger.info(f"   Start (UTC): {start_dt.astimezone(ZoneInfo('UTC')).strftime('%Y-%m-%d %I:%M %p %Z')}")
        logger.info(f"   End (UTC): {end_dt.astimezone(ZoneInfo('UTC')).strftime('%Y-%m-%d %I:%M %p %Z')}")

        # Build event data matching actual database schema
        event_data = {
            "user_id": validated.user_id,
            "title": validated.title,
            "description": validated.description,
            "start_date": start_dt.isoformat(),  # TIMESTAMP WITH TIME ZONE
            "end_date": end_dt.isoformat(),  # TIMESTAMP WITH TIME ZONE
            "all_day": validated.all_day,
            "event_type": str(validated.event_type),  # ✅ Convert enum/str to string
            "location_name": validated.location_name,  # TEXT column for location name
            "reminder_minutes": reminder_list,  # Array of integers
            "color": validated.color,
            "is_private": validated.is_private,  # BOOLEAN column
        }

        # Insert into database
        response = supabase.table("calendar_events").insert(event_data).execute()

        if response.data:
            event = response.data[0]
            logger.info(f"Created calendar event: {event['id']} for user {validated.user_id}")

            return {
                "success": True,
                "event": event,
                "message": f"Successfully added '{validated.title}' to your calendar"
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