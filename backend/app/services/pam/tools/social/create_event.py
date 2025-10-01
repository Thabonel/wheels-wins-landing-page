"""Create Event Tool for PAM

Plan community meetups and gatherings

Example usage:
- "Create a meetup event at Yellowstone next weekend"
- "Plan a campfire gathering for Saturday night"
"""

import logging
from typing import Any, Dict, Optional
from datetime import datetime

from app.integrations.supabase import get_supabase_client

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
        if not title or not description or not event_date or not location:
            return {
                "success": False,
                "error": "Title, description, date, and location are required"
            }

        supabase = get_supabase_client()

        # Build event data
        event_data = {
            "creator_id": user_id,
            "title": title,
            "description": description,
            "event_date": event_date,
            "location": location,
            "latitude": latitude,
            "longitude": longitude,
            "max_attendees": max_attendees,
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
                "user_id": user_id,
                "status": "attending",
                "created_at": datetime.now().isoformat()
            }
            supabase.table("event_attendees").insert(attendee_data).execute()

            logger.info(f"Created event '{title}' for user {user_id}")

            return {
                "success": True,
                "event": event,
                "message": f"Event '{title}' created successfully at {location}"
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
