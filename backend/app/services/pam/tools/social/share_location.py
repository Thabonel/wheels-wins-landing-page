"""Share Location Tool for PAM

Share current location or favorite spots with the community

Example usage:
- "Share my current location"
- "Share this campground with friends"
"""

import logging
from typing import Any, Dict, Optional
from datetime import datetime

from app.integrations.supabase import get_supabase_client

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
        if not location_name:
            return {
                "success": False,
                "error": "Location name is required"
            }

        if latitude is None or longitude is None:
            return {
                "success": False,
                "error": "Latitude and longitude are required"
            }

        supabase = get_supabase_client()

        # Build location share data
        location_data = {
            "user_id": user_id,
            "location_name": location_name,
            "latitude": latitude,
            "longitude": longitude,
            "description": description,
            "is_public": is_public,
            "created_at": datetime.now().isoformat()
        }

        # Save to database
        response = supabase.table("shared_locations").insert(location_data).execute()

        if response.data:
            shared_location = response.data[0]
            logger.info(f"User {user_id} shared location: {location_name}")

            return {
                "success": True,
                "location": shared_location,
                "message": f"Shared location '{location_name}'" +
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
