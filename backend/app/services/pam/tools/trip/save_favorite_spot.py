"""Save Favorite Spot Tool for PAM

Bookmark locations for future reference

Example usage:
- "Save this campground as a favorite"
- "Bookmark this restaurant for later"
"""

import logging
from typing import Any, Dict, Optional
from datetime import datetime

from app.integrations.supabase import get_supabase_client

logger = logging.getLogger(__name__)


async def save_favorite_spot(
    user_id: str,
    location_name: str,
    location_address: str,
    category: Optional[str] = "general",
    notes: Optional[str] = None,
    rating: Optional[int] = None,
    **kwargs
) -> Dict[str, Any]:
    """
    Save a location as a favorite

    Args:
        user_id: UUID of the user
        location_name: Name of the location
        location_address: Address or coordinates
        category: Category (campground, restaurant, attraction, etc.)
        notes: Optional personal notes
        rating: Optional rating (1-5)

    Returns:
        Dict with saved favorite details
    """
    try:
        if not location_name or not location_address:
            return {
                "success": False,
                "error": "Location name and address are required"
            }

        # Validate rating if provided
        if rating is not None:
            rating = max(1, min(rating, 5))

        supabase = get_supabase_client()

        # Build favorite data
        favorite_data = {
            "user_id": user_id,
            "location_name": location_name,
            "location_address": location_address,
            "category": category.lower(),
            "notes": notes,
            "rating": rating,
            "created_at": datetime.now().isoformat()
        }

        # Save to database
        response = supabase.table("favorite_locations").insert(favorite_data).execute()

        if response.data:
            favorite = response.data[0]
            logger.info(f"Saved favorite location: {location_name} for user {user_id}")

            return {
                "success": True,
                "favorite": favorite,
                "message": f"Saved '{location_name}' to your favorites" +
                          (f" ({category})" if category != "general" else "")
            }
        else:
            logger.error(f"Failed to save favorite: {response}")
            return {
                "success": False,
                "error": "Failed to save favorite location"
            }

    except Exception as e:
        logger.error(f"Error saving favorite spot: {e}", exc_info=True)
        return {
            "success": False,
            "error": str(e)
        }
