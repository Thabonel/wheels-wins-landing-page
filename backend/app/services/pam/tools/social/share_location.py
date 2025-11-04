"""Share Location Tool for PAM

Share current location or favorite spots with the community

Example usage:
- "Share my current location"
- "Share this campground with friends"

Amendment #4: Input validation with Pydantic models
"""

import logging
from typing import Any, Dict, Optional
from datetime import datetime
from pydantic import ValidationError

from app.integrations.supabase import get_supabase_client
from app.services.pam.schemas.social import ShareLocationInput

logger = logging.getLogger(__name__)


async def share_location(
    user_id: str,
    location_name: str,
    latitude: float,
    longitude: float,
    description: Optional[str] = None,
    is_public: Optional[bool] = True,
    **kwargs
) -> Dict[str, Any]:
    """
    Share location with community

    Args:
        user_id: UUID of the user
        location_name: Name of the location
        latitude: Location latitude
        longitude: Location longitude
        description: Optional description
        is_public: Whether location is publicly visible (default: True)

    Returns:
        Dict with shared location details
    """
    try:
        # Validate inputs using Pydantic schema
        try:
            # Map is_public to share_with enum
            share_with = "public" if is_public else "friends"
            share_duration_hours = kwargs.get("share_duration_hours", 24)

            validated = ShareLocationInput(
                user_id=user_id,
                location_name=location_name,
                latitude=latitude,
                longitude=longitude,
                share_duration_hours=share_duration_hours,
                share_with=share_with
            )
        except ValidationError as e:
            # Extract first error message for user-friendly response
            error_msg = e.errors()[0]['msg']
            return {
                "success": False,
                "error": f"Invalid input: {error_msg}"
            }

        supabase = get_supabase_client()

        # Build location share data
        location_data = {
            "user_id": validated.user_id,
            "location_name": validated.location_name,
            "latitude": validated.latitude,
            "longitude": validated.longitude,
            "description": description,
            "is_public": is_public,
            "share_with": validated.share_with,
            "share_duration_hours": validated.share_duration_hours,
            "created_at": datetime.now().isoformat()
        }

        # Save to database
        response = supabase.table("shared_locations").insert(location_data).execute()

        if response.data:
            shared_location = response.data[0]
            logger.info(f"User {validated.user_id} shared location: {validated.location_name}")

            return {
                "success": True,
                "location": shared_location,
                "message": f"Shared location '{validated.location_name}'" +
                          (" publicly" if is_public else " privately")
            }
        else:
            logger.error(f"Failed to share location: {response}")
            return {
                "success": False,
                "error": "Failed to share location"
            }

    except Exception as e:
        logger.error(f"Error sharing location: {e}", exc_info=True)
        return {
            "success": False,
            "error": str(e)
        }
