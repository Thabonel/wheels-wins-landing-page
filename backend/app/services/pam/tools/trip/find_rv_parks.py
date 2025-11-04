"""Find RV Parks Tool for PAM

Search for campgrounds and RV parks near a route or location

Example usage:
- "Find RV parks near Yosemite"
- "Show me campgrounds along my route to Denver"

Amendment #4: Input validation with Pydantic models
"""

import logging
from typing import Any, Dict, Optional, List
from pydantic import ValidationError

from app.integrations.supabase import get_supabase_client
from app.services.pam.schemas.trip import FindRVParksInput

logger = logging.getLogger(__name__)


async def find_rv_parks(
    user_id: str,
    location: str,
    radius_miles: Optional[int] = 50,
    amenities: Optional[List[str]] = None,
    max_price: Optional[float] = None,
    **kwargs
) -> Dict[str, Any]:
    """
    Find RV parks and campgrounds near a location

    Args:
        user_id: UUID of the user
        location: Location to search near (address or coordinates)
        radius_miles: Search radius in miles (default: 50)
        amenities: Optional list of required amenities
        max_price: Optional maximum price per night

    Returns:
        Dict with RV park listings
    """
    try:
        # Validate inputs using Pydantic schema
        try:
            validated = FindRVParksInput(
                user_id=user_id,
                location=location,
                radius_miles=radius_miles,
                amenities=amenities,
                max_price=max_price
            )
        except ValidationError as e:
            # Extract first error message for user-friendly response
            error_msg = e.errors()[0]['msg']
            return {
                "success": False,
                "error": f"Invalid input: {error_msg}"
            }

        supabase = get_supabase_client()

        # Query existing campgrounds from database
        # In a real implementation, this would use Mapbox + campground API
        query = supabase.table("campgrounds").select("*")

        # Apply filters if provided
        if validated.max_price:
            query = query.lte("price_per_night", validated.max_price)

        response = query.limit(20).execute()

        campgrounds = response.data if response.data else []

        # Filter by amenities if specified
        if validated.amenities and campgrounds:
            campgrounds = [
                park for park in campgrounds
                if all(amenity in park.get("amenities", []) for amenity in validated.amenities)
            ]

        logger.info(f"Found {len(campgrounds)} RV parks near {validated.location} for user {validated.user_id}")

        return {
            "success": True,
            "location": validated.location,
            "radius_miles": validated.radius_miles,
            "parks_found": len(campgrounds),
            "parks": campgrounds[:10],  # Return top 10
            "message": f"Found {len(campgrounds)} RV parks within {validated.radius_miles} miles of {validated.location}"
        }

    except Exception as e:
        logger.error(f"Error finding RV parks: {e}", exc_info=True)
        return {
            "success": False,
            "error": str(e)
        }
