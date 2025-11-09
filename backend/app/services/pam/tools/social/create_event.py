"""Create Event Tool for PAM

Plan community meetups and gatherings

Example usage:
- "Create a meetup event at Yellowstone next weekend"
- "Plan a campfire gathering for Saturday night"

Amendment #4: Input validation with Pydantic models
"""

import logging
from typing import Any, Dict, Optional
from datetime import datetime
from pydantic import ValidationError

from app.integrations.supabase import get_supabase_client
from app.services.pam.schemas.social import CreateEventInput

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
    """
    try:
        # Validate inputs using Pydantic schema
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
        except ValidationError as e:
            # Extract first error message for user-friendly response
            error_msg = e.errors()[0]['msg']
            return {
                "success": False,
                "error": f"Invalid input: {error_msg}"
            }

        supabase = get_supabase_client()

        # Build event data
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
            "attendee_count": 1,  # Creator is automatically attending
            "created_at": datetime.now().isoformat(),
            "status": "upcoming"
        }

        # Save to database
        response = supabase.table("events").insert(event_data).execute()

        if response.data:
            event = response.data[0]

            # Add creator as attendee
            attendee_data = {
                "event_id": event["id"],
                "user_id": validated.user_id,
                "status": "attending",
                "created_at": datetime.now().isoformat()
            }
            supabase.table("event_attendees").insert(attendee_data).execute()

            logger.info(f"Created event '{validated.title}' for user {validated.user_id}")

            return {
                "success": True,
                "event": event,
                "message": f"Event '{validated.title}' created successfully at {validated.location}"
            }
        else:
            logger.error(f"Failed to create event: {response}")
            return {
                "success": False,
                "error": "Failed to create event"
            }

    except Exception as e:
        logger.error(f"Error creating event: {e}", exc_info=True)
        return {
            "success": False,
            "error": str(e)
        }
