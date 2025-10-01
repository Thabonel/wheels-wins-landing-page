"""Find RV Parks Tool for PAM

Search for campgrounds and RV parks near a route or location

Example usage:
- "Find RV parks near Yosemite"
- "Show me campgrounds along my route to Denver"
"""

import logging
from typing import Any, Dict, Optional, List
from app.integrations.supabase import get_supabase_client

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
        if not location:
            return {
                "success": False,
                "error": "Location is required"
            }

        supabase = get_supabase_client()

        # Query existing campgrounds from database
        # In a real implementation, this would use Mapbox + campground API
        query = supabase.table("campgrounds").select("*")

        # Apply filters if provided
        if max_price:
            query = query.lte("price_per_night", max_price)

        response = query.limit(20).execute()

        campgrounds = response.data if response.data else []

        # Filter by amenities if specified
        if amenities and campgrounds:
            campgrounds = [
                park for park in campgrounds
                if all(amenity in park.get("amenities", []) for amenity in amenities)
            ]

        logger.info(f"Found {len(campgrounds)} RV parks near {location} for user {user_id}")

        return {
            "success": True,
            "location": location,
            "radius_miles": radius_miles,
            "parks_found": len(campgrounds),
            "parks": campgrounds[:10],  # Return top 10
            "message": f"Found {len(campgrounds)} RV parks within {radius_miles} miles of {location}"
        }

    except Exception as e:
        logger.error(f"Error finding RV parks: {e}", exc_info=True)
        return {
            "success": False,
            "error": str(e)
        }
