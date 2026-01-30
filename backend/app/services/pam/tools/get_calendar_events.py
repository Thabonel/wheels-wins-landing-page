"""Get Calendar Events Tool for PAM

Allows PAM to read and retrieve the user's existing calendar events.
This fills the critical functional gap identified in the PAM audit.

Example usage:
- "What are my upcoming appointments?"
- "Show me my calendar for next week"
- "What do I have scheduled tomorrow?"

Following TDD - minimal implementation to pass tests.
"""

import logging
from datetime import datetime, timezone
from typing import Any, Dict, Optional, List, TYPE_CHECKING
from uuid import UUID

from app.services.pam.tools.exceptions import (
    ValidationError,
    DatabaseError,
)
from app.services.pam.tools.utils import (
    validate_uuid,
    safe_db_select,
)

logger = logging.getLogger(__name__)

# Import Client only for type checking to avoid runtime import failures
if TYPE_CHECKING:
    from supabase import Client

from .base_tool import BaseTool, ToolResult, ToolCapability


async def get_calendar_events(
    user_id: str,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    event_type: Optional[str] = None,
    include_past: bool = False,
    limit: int = 100,
    **kwargs
) -> Dict[str, Any]:
    """
    Get calendar events for the user

    Args:
        user_id: UUID of the user
        start_date: Start date filter in ISO format (optional)
        end_date: End date filter in ISO format (optional)
        event_type: Filter by event type (optional)
        include_past: Include past events (default: False, only upcoming)
        limit: Maximum number of events to return (default: 100)

    Returns:
        Dict with events list and success status

    Raises:
        ValidationError: Invalid input parameters
        DatabaseError: Database operation failed
    """
    try:
        validate_uuid(user_id, "user_id")

        # Build simple filters for safe_db_select
        filters = {"user_id": user_id}

        if event_type:
            filters["event_type"] = event_type

        # Validate date formats if provided and store parsed values
        start_dt = None
        end_dt = None

        if start_date:
            try:
                start_dt = datetime.fromisoformat(start_date.replace('Z', '+00:00'))
            except ValueError:
                raise ValidationError(f"Invalid start_date format: {start_date}")

        if end_date:
            try:
                end_dt = datetime.fromisoformat(end_date.replace('Z', '+00:00'))
            except ValueError:
                raise ValidationError(f"Invalid end_date format: {end_date}")

        # Execute query - safe_db_select doesn't support complex queries
        # so we'll get all events for user and filter in Python for now
        events = await safe_db_select(
            "calendar_events",
            filters,
            user_id
        )

        # Apply date filtering in Python (since safe_db_select is limited)
        if not include_past:
            now = datetime.now(timezone.utc)
            events = [e for e in events if e.get('end_date') and datetime.fromisoformat(e['end_date'].replace('Z', '+00:00')) >= now]

        if start_dt:
            events = [e for e in events if e.get('start_date') and datetime.fromisoformat(e['start_date'].replace('Z', '+00:00')) >= start_dt]

        if end_dt:
            events = [e for e in events if e.get('end_date') and datetime.fromisoformat(e['end_date'].replace('Z', '+00:00')) <= end_dt]

        # Sort by start_date and limit results
        events.sort(key=lambda e: e.get('start_date', ''))
        if limit:
            events = events[:limit]

        # Format response
        if not events:
            return {
                "success": True,
                "events": [],
                "message": f"No events found for user {user_id}",
                "count": 0
            }

        logger.info(f"Retrieved {len(events)} calendar events for user {user_id}")

        return {
            "success": True,
            "events": events,
            "message": f"Found {len(events)} events",
            "count": len(events)
        }

    except ValidationError as e:
        return {
            "success": False,
            "error": str(e),
            "events": [],
            "count": 0
        }
    except DatabaseError as e:
        return {
            "success": False,
            "error": str(e),
            "events": [],
            "count": 0
        }
    except Exception as e:
        logger.error(
            f"Unexpected error retrieving calendar events",
            extra={"user_id": user_id},
            exc_info=True
        )
        return {
            "success": False,
            "error": f"Failed to retrieve calendar events: {str(e)}",
            "events": [],
            "count": 0
        }


class GetCalendarEventsTool(BaseTool):
    """Tool for retrieving calendar events"""

    def __init__(self, user_jwt: Optional[str] = None):
        super().__init__(
            tool_name="get_calendar_events",
            description=(
                "Get calendar events for the user. "
                "Use this when the user asks about their schedule, appointments, or calendar. "
                "Returns upcoming events by default, with options to filter by date range or event type."
            ),
            capabilities=[
                ToolCapability.READ,
            ],
            user_jwt=user_jwt
        )

    async def execute(self, user_id: str, parameters: Dict[str, Any] = None) -> ToolResult:
        """Execute the calendar events retrieval"""

        if not parameters:
            parameters = {}

        try:
            result = await get_calendar_events(user_id=user_id, **parameters)

            if result.get("success"):
                return self._create_success_result(
                    data=result["events"],
                    metadata={
                        "message": result["message"],
                        "count": result["count"]
                    }
                )
            else:
                return self._create_error_result(result.get("error", "Unknown error"))

        except ValidationError as e:
            return self._create_error_result(str(e))
        except DatabaseError as e:
            return self._create_error_result(str(e))
        except Exception as e:
            logger.error(f"Unexpected error in GetCalendarEventsTool: {e}", exc_info=True)
            return self._create_error_result(f"Failed to retrieve events: {str(e)}")