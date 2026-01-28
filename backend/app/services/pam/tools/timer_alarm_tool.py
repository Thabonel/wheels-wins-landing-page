"""Timer and Alarm Tool for PAM

Allows PAM to set timers and alarms via natural language commands.

Example usage:
- "Set a timer for 10 minutes"
- "Set an alarm for 3pm"
- "Remind me in 30 seconds"
- "Wake me up at 7:00 AM tomorrow"
"""

import logging
import re
from datetime import datetime, timedelta
from typing import Any, Dict, Optional, List
from zoneinfo import ZoneInfo

from .base_tool import BaseTool, ToolResult
from .tool_capabilities import ToolCapability
from app.services.pam.tools.exceptions import (
    ValidationError,
    DatabaseError,
    ResourceNotFoundError,
)
from app.services.pam.tools.utils import validate_uuid

logger = logging.getLogger(__name__)


def parse_duration_to_seconds(duration_str: str) -> Optional[int]:
    """
    Parse a duration string into seconds.

    Supports formats like:
    - "10 minutes", "10 min", "10m"
    - "1 hour", "2 hours", "1h"
    - "30 seconds", "30 sec", "30s"
    - "1 hour 30 minutes"
    - Plain numbers (interpreted as minutes by default)

    Returns:
        Number of seconds, or None if parsing fails
    """
    if not duration_str:
        return None

    duration_str = duration_str.lower().strip()
    total_seconds = 0

    # Pattern for hours
    hours_match = re.search(r'(\d+(?:\.\d+)?)\s*(?:hours?|hrs?|h)\b', duration_str)
    if hours_match:
        total_seconds += int(float(hours_match.group(1)) * 3600)

    # Pattern for minutes
    minutes_match = re.search(r'(\d+(?:\.\d+)?)\s*(?:minutes?|mins?|m)\b', duration_str)
    if minutes_match:
        total_seconds += int(float(minutes_match.group(1)) * 60)

    # Pattern for seconds
    seconds_match = re.search(r'(\d+(?:\.\d+)?)\s*(?:seconds?|secs?|s)\b', duration_str)
    if seconds_match:
        total_seconds += int(float(seconds_match.group(1)))

    # If nothing matched but we have a plain number, treat as minutes
    if total_seconds == 0:
        plain_number = re.match(r'^(\d+(?:\.\d+)?)$', duration_str)
        if plain_number:
            total_seconds = int(float(plain_number.group(1)) * 60)

    return total_seconds if total_seconds > 0 else None


def parse_alarm_time(time_str: str, context: Dict[str, Any] = None) -> Optional[datetime]:
    """
    Parse an alarm time string into a datetime.

    Supports formats like:
    - "3pm", "3:00 PM", "15:00"
    - "tomorrow at 7am"
    - ISO format: "2024-01-15T15:00:00"

    Returns:
        datetime object (timezone-aware), or None if parsing fails
    """
    if not time_str:
        return None

    time_str = time_str.strip()

    # Detect user timezone from context
    user_tz = ZoneInfo('UTC')
    if context and 'timezone' in context:
        try:
            user_tz = ZoneInfo(context['timezone'])
        except Exception:
            pass

    now = datetime.now(user_tz)

    # Try ISO format first
    try:
        dt = datetime.fromisoformat(time_str.replace('Z', '+00:00'))
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=user_tz)
        return dt
    except ValueError:
        pass

    # Check for "tomorrow" modifier
    tomorrow = False
    if 'tomorrow' in time_str.lower():
        tomorrow = True
        time_str = re.sub(r'\btomorrow\b', '', time_str, flags=re.IGNORECASE).strip()
        time_str = re.sub(r'\bat\b', '', time_str, flags=re.IGNORECASE).strip()

    # Parse time patterns like "3pm", "3:00 PM", "15:00"
    time_patterns = [
        (r'(\d{1,2}):(\d{2})\s*(am|pm)', '%I:%M %p'),
        (r'(\d{1,2})\s*(am|pm)', '%I %p'),
        (r'(\d{1,2}):(\d{2})', '%H:%M'),
    ]

    for pattern, _ in time_patterns:
        match = re.search(pattern, time_str, re.IGNORECASE)
        if match:
            try:
                # Reconstruct time string for parsing
                matched_time = match.group(0)

                # Handle 12-hour format
                if 'am' in matched_time.lower() or 'pm' in matched_time.lower():
                    # Normalize to "HH:MM AM/PM" format
                    parts = re.match(r'(\d{1,2})(?::(\d{2}))?\s*(am|pm)', matched_time, re.IGNORECASE)
                    if parts:
                        hour = int(parts.group(1))
                        minute = int(parts.group(2)) if parts.group(2) else 0
                        meridiem = parts.group(3).upper()

                        if meridiem == 'PM' and hour != 12:
                            hour += 12
                        elif meridiem == 'AM' and hour == 12:
                            hour = 0

                        dt = now.replace(hour=hour, minute=minute, second=0, microsecond=0)
                else:
                    # 24-hour format
                    parts = re.match(r'(\d{1,2}):(\d{2})', matched_time)
                    if parts:
                        hour = int(parts.group(1))
                        minute = int(parts.group(2))
                        dt = now.replace(hour=hour, minute=minute, second=0, microsecond=0)
                    else:
                        continue

                if tomorrow:
                    dt = dt + timedelta(days=1)
                elif dt <= now:
                    # If time is in the past, assume tomorrow
                    dt = dt + timedelta(days=1)

                return dt

            except Exception as e:
                logger.warning(f"Failed to parse time '{matched_time}': {e}")
                continue

    return None


async def create_timer_or_alarm(
    user_id: str,
    timer_type: str,
    duration_seconds: Optional[int] = None,
    alarm_time: Optional[str] = None,
    label: Optional[str] = None,
    context: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """
    Create a timer or alarm for the user.

    Args:
        user_id: UUID of the user
        timer_type: 'timer' or 'alarm'
        duration_seconds: Duration in seconds (for timers)
        alarm_time: Absolute time (for alarms) - ISO format or parseable string
        label: Optional label for the timer/alarm
        context: Optional context with timezone info

    Returns:
        Dict with created timer/alarm details

    Raises:
        ValidationError: Invalid parameters
        DatabaseError: Database operation failed
    """
    from app.database.supabase_client import get_supabase_service

    try:
        validate_uuid(user_id, "user_id")

        if timer_type not in ['timer', 'alarm']:
            raise ValidationError(
                f"Invalid type: {timer_type}. Must be 'timer' or 'alarm'",
                context={"timer_type": timer_type}
            )
        supabase = get_supabase_service()

        # Detect user timezone
        user_tz = ZoneInfo('UTC')
        user_tz_str = 'UTC'
        if context and 'timezone' in context:
            try:
                user_tz = ZoneInfo(context['timezone'])
                user_tz_str = context['timezone']
            except Exception:
                pass

        now = datetime.now(user_tz)

        # Calculate scheduled_time based on type
        if timer_type == 'timer':
            if not duration_seconds or duration_seconds <= 0:
                raise ValidationError(
                    "Timer duration must be positive",
                    context={"duration_seconds": duration_seconds}
                )

            scheduled_time = now + timedelta(seconds=duration_seconds)

            # Generate default label if not provided
            if not label:
                if duration_seconds < 60:
                    label = f"{duration_seconds} second timer"
                elif duration_seconds < 3600:
                    minutes = duration_seconds // 60
                    label = f"{minutes} minute timer"
                else:
                    hours = duration_seconds // 3600
                    remaining_mins = (duration_seconds % 3600) // 60
                    if remaining_mins > 0:
                        label = f"{hours}h {remaining_mins}m timer"
                    else:
                        label = f"{hours} hour timer"

        elif timer_type == 'alarm':
            if not alarm_time:
                raise ValidationError(
                    "Alarm time is required",
                    context={"timer_type": timer_type}
                )

            parsed_time = parse_alarm_time(alarm_time, context)
            if not parsed_time:
                raise ValidationError(
                    f"Could not parse alarm time: {alarm_time}",
                    context={"alarm_time": alarm_time}
                )

            scheduled_time = parsed_time
            duration_seconds = int((scheduled_time - now).total_seconds())

            # Generate default label if not provided
            if not label:
                label = f"Alarm for {scheduled_time.strftime('%I:%M %p')}"

        # Validate scheduled time is in the future
        if scheduled_time <= now:
            raise ValidationError(
                "Scheduled time must be in the future",
                context={"scheduled_time": scheduled_time.isoformat(), "now": now.isoformat()}
            )

        # Build timer/alarm data
        timer_data = {
            "user_id": user_id,
            "type": timer_type,
            "label": label,
            "duration_seconds": duration_seconds,
            "scheduled_time": scheduled_time.isoformat(),
            "status": "active",
            "notification_sent": False,
        }

        # Insert into database
        response = supabase.table("timers_and_alarms").insert(timer_data).execute()

        if response.data:
            timer = response.data[0]
            logger.info(f"Created {timer_type}: {timer['id']} for user {user_id}, expires at {scheduled_time.isoformat()}")

            # Calculate time until expiration for response
            time_until = scheduled_time - now
            if time_until.total_seconds() < 60:
                time_str = f"{int(time_until.total_seconds())} seconds"
            elif time_until.total_seconds() < 3600:
                time_str = f"{int(time_until.total_seconds() // 60)} minutes"
            else:
                hours = int(time_until.total_seconds() // 3600)
                mins = int((time_until.total_seconds() % 3600) // 60)
                if mins > 0:
                    time_str = f"{hours} hours and {mins} minutes"
                else:
                    time_str = f"{hours} hours"

            return {
                "success": True,
                "timer": timer,
                "message": f"I've set a {timer_type} for {time_str}. I'll notify you when it's done!",
                "expires_at": scheduled_time.isoformat(),
                "time_until": time_str
            }
        else:
            logger.error(f"Failed to create {timer_type}: {response}")
            raise DatabaseError(
                f"Failed to create {timer_type}",
                context={"user_id": user_id, "timer_type": timer_type}
            )

    except ValidationError:
        raise
    except DatabaseError:
        raise
    except Exception as e:
        logger.error(
            f"Unexpected error creating {timer_type}",
            extra={"user_id": user_id, "timer_type": timer_type},
            exc_info=True
        )
        raise DatabaseError(
            f"Failed to create {timer_type}",
            context={"user_id": user_id, "timer_type": timer_type, "error": str(e)}
        )


async def list_active_timers(user_id: str) -> Dict[str, Any]:
    """List all active timers and alarms for a user.

    Raises:
        ValidationError: Invalid user_id
        DatabaseError: Database operation failed
    """
    from app.database.supabase_client import get_supabase_service

    try:
        validate_uuid(user_id, "user_id")
        supabase = get_supabase_service()

        response = supabase.table("timers_and_alarms").select("*").eq(
            "user_id", user_id
        ).eq(
            "status", "active"
        ).order("scheduled_time").execute()

        return {
            "success": True,
            "timers": response.data or [],
            "count": len(response.data or [])
        }

    except ValidationError:
        raise
    except Exception as e:
        logger.error(
            f"Unexpected error listing timers",
            extra={"user_id": user_id},
            exc_info=True
        )
        raise DatabaseError(
            "Failed to list timers",
            context={"user_id": user_id, "error": str(e)}
        )


async def cancel_timer(user_id: str, timer_id: str) -> Dict[str, Any]:
    """Cancel a timer or alarm.

    Raises:
        ValidationError: Invalid parameters
        ResourceNotFoundError: Timer not found
        DatabaseError: Database operation failed
    """
    from app.database.supabase_client import get_supabase_service

    try:
        validate_uuid(user_id, "user_id")
        validate_uuid(timer_id, "timer_id")
        supabase = get_supabase_service()

        # Update timer status to cancelled
        response = supabase.table("timers_and_alarms").update({
            "status": "cancelled"
        }).eq("id", timer_id).eq("user_id", user_id).execute()

        if response.data:
            timer = response.data[0]
            return {
                "success": True,
                "message": f"Cancelled: {timer.get('label', 'Timer')}",
                "timer": timer
            }
        else:
            raise ResourceNotFoundError(
                "Timer not found or already cancelled",
                context={"user_id": user_id, "timer_id": timer_id}
            )

    except ValidationError:
        raise
    except ResourceNotFoundError:
        raise
    except Exception as e:
        logger.error(
            f"Unexpected error cancelling timer",
            extra={"user_id": user_id, "timer_id": timer_id},
            exc_info=True
        )
        raise DatabaseError(
            "Failed to cancel timer",
            context={"user_id": user_id, "timer_id": timer_id, "error": str(e)}
        )


class TimerAlarmTool(BaseTool):
    """Tool for setting timers and alarms via PAM."""

    def __init__(self, user_jwt: Optional[str] = None):
        super().__init__(
            tool_name="set_timer_or_alarm",
            description=(
                "Set a timer or alarm for the user. Use this when the user asks to: "
                "set a timer (e.g., 'set a timer for 10 minutes'), "
                "set an alarm (e.g., 'set an alarm for 3pm'), "
                "remind them in a specific time (e.g., 'remind me in 30 minutes'), "
                "or wake them up at a time. "
                "Also supports listing active timers and cancelling timers."
            ),
            capabilities=[
                ToolCapability.ACTION,
                ToolCapability.WRITE,
            ],
            user_jwt=user_jwt
        )

    async def execute(
        self,
        user_id: str,
        parameters: Dict[str, Any] = None,
        context: Dict[str, Any] = None
    ) -> ToolResult:
        """Execute timer/alarm operations."""

        if not parameters:
            return self._create_error_result("No parameters provided")

        action = parameters.get("action", "create")

        if action == "create":
            # Determine type: timer or alarm
            timer_type = parameters.get("type", "timer")

            if timer_type == "timer":
                # Parse duration
                duration = parameters.get("duration")
                duration_seconds = parameters.get("duration_seconds")

                if duration and not duration_seconds:
                    duration_seconds = parse_duration_to_seconds(str(duration))

                if not duration_seconds:
                    return self._create_error_result(
                        "Could not parse timer duration. Please specify like '10 minutes' or '1 hour'."
                    )

                result = await create_timer_or_alarm(
                    user_id=user_id,
                    timer_type="timer",
                    duration_seconds=duration_seconds,
                    label=parameters.get("label"),
                    context=context or parameters.get("context", {})
                )

            elif timer_type == "alarm":
                alarm_time = parameters.get("alarm_time") or parameters.get("time")

                if not alarm_time:
                    return self._create_error_result(
                        "Please specify when the alarm should go off (e.g., '3pm' or '7:00 AM')."
                    )

                result = await create_timer_or_alarm(
                    user_id=user_id,
                    timer_type="alarm",
                    alarm_time=alarm_time,
                    label=parameters.get("label"),
                    context=context or parameters.get("context", {})
                )

            else:
                return self._create_error_result(
                    f"Unknown type: {timer_type}. Use 'timer' or 'alarm'."
                )

        elif action == "list":
            result = await list_active_timers(user_id)

        elif action == "cancel":
            timer_id = parameters.get("timer_id")
            if not timer_id:
                return self._create_error_result("Please specify which timer to cancel.")
            result = await cancel_timer(user_id, timer_id)

        else:
            return self._create_error_result(
                f"Unknown action: {action}. Use 'create', 'list', or 'cancel'."
            )

        if result.get("success"):
            return self._create_success_result(
                data=result,
                metadata={
                    "message": result.get("message", "Operation completed"),
                    "timer_id": result.get("timer", {}).get("id") if result.get("timer") else None
                }
            )
        else:
            return self._create_error_result(result.get("error", "Unknown error"))
