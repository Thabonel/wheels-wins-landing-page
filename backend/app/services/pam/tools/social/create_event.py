"""Create Event Tool for PAM

Plan community meetups and gatherings

Example usage:
- "Create a meetup event at Yellowstone next weekend"
- "Plan a campfire gathering for Saturday night"
"""

import logging
from typing import Any, Dict, Optional
from datetime import datetime
from pydantic import ValidationError as PydanticValidationError

from app.integrations.supabase import get_supabase_client
from app.services.pam.schemas.social import CreateEventInput
from app.services.pam.tools.exceptions import (
    ValidationError,
    DatabaseError,
)
from app.services.pam.tools.utils import (
    validate_uuid,
    validate_required,
    validate_date_format,
    safe_db_insert,
)

logger = logging.getLogger(__name__)


async def create_event(
    user_id: str,
    title: str,
    description: str,
    event_date: str,
    location: str,
    latitude: Optional[float] = None,
    longitude: Optional[float] = None,
    max_attendees: Optional[int] = None,
    **kwargs
) -> Dict[str, Any]:
    """
    Create a community event

    Args:
        user_id: UUID of the event creator
        title: Event title
        description: Event description
        event_date: Event date/time in ISO format
        location: Event location name
        latitude: Optional location latitude
        longitude: Optional location longitude
        max_attendees: Optional maximum number of attendees

    Returns:
        Dict with created event details

    Raises:
        ValidationError: Invalid input parameters
        DatabaseError: Database operation failed
    """
    try:
        validate_uuid(user_id, "user_id")
        validate_required(title, "title")
        validate_required(description, "description")
        validate_required(event_date, "event_date")
        validate_required(location, "location")
        validate_date_format(event_date, "event_date")

        try:
            is_public = kwargs.get("is_public", True)

            validated = CreateEventInput(
                user_id=user_id,
                title=title,
                description=description,
                event_date=event_date,
                location=location,
                latitude=latitude,
                longitude=longitude,
                max_attendees=max_attendees,
                is_public=is_public
            )
        except PydanticValidationError as e:
            error_msg = e.errors()[0]['msg']
            raise ValidationError(
                f"Invalid input: {error_msg}",
                context={"field": e.errors()[0]['loc'][0], "error": error_msg}
            )

        event_data = {
            "creator_id": validated.user_id,
            "title": validated.title,
            "description": validated.description,
            "event_date": validated.event_date,
            "location": validated.location,
            "latitude": validated.latitude,
            "longitude": validated.longitude,
            "max_attendees": validated.max_attendees,
            "is_public": validated.is_public,
            "attendee_count": 1,
            "created_at": datetime.now().isoformat(),
            "status": "upcoming"
        }

        event = await safe_db_insert("events", event_data, user_id)

        attendee_data = {
            "event_id": event["id"],
            "user_id": validated.user_id,
            "status": "attending",
            "created_at": datetime.now().isoformat()
        }

        supabase = get_supabase_client()
        supabase.table("event_attendees").insert(attendee_data).execute()

        logger.info(f"Created event '{validated.title}' for user {validated.user_id}")

        return {
            "success": True,
            "event": event,
            "message": f"Event '{validated.title}' created successfully at {validated.location}"
        }

    except ValidationError:
        raise
    except DatabaseError:
        raise
    except Exception as e:
        logger.error(
            f"Unexpected error creating event",
            extra={"user_id": user_id, "title": title},
            exc_info=True
        )
        raise DatabaseError(
            "Failed to create event",
            context={"user_id": user_id, "title": title, "error": str(e)}
        )
