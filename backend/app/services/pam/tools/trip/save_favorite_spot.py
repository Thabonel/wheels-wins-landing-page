"""Save Favorite Spot Tool for PAM

Bookmark locations for future reference

Example usage:
- "Save this campground as a favorite"
- "Bookmark this restaurant for later"

Amendment #4: Input validation with Pydantic models
"""

import logging
from typing import Any, Dict, Optional
from datetime import datetime
from pydantic import ValidationError

from app.integrations.supabase import get_supabase_client
from app.services.pam.schemas.trip import SaveFavoriteSpotInput

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
        # Validate inputs using Pydantic schema
        try:
            validated = SaveFavoriteSpotInput(
                user_id=user_id,
                name=location_name,  # Map location_name to name
                location=location_address,  # Map location_address to location
                category=category,
                notes=notes,
                rating=rating
            )
        except ValidationError as e:
            # Extract first error message for user-friendly response
            error_msg = e.errors()[0]['msg']
            return {
                "success": False,
                "error": f"Invalid input: {error_msg}"
            }

        supabase = get_supabase_client()

        # Build favorite data
        favorite_data = {
            "user_id": validated.user_id,
            "location_name": validated.name,
            "location_address": validated.location,
            "category": validated.category.value,  # ✅ Extract enum value
            "notes": validated.notes,
            "rating": validated.rating,
            "created_at": datetime.now().isoformat()
        }

        # Save to database
        response = supabase.table("favorite_locations").insert(favorite_data).execute()

        if response.data:
            favorite = response.data[0]
            logger.info(f"Saved favorite location: {validated.name} for user {validated.user_id}")

            return {
                "success": True,
                "favorite": favorite,
                "message": f"Saved '{validated.name}' to your favorites" +
                          (f" ({validated.category})" if validated.category != "general" else "")
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
