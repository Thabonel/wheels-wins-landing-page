"""Find Attractions Tool for PAM

Discover points of interest, landmarks, and attractions near a location

Example usage:
- "What attractions are near Yellowstone?"
- "Find things to do in Denver"
"""

import logging
from typing import Any, Dict, Optional, List

logger = logging.getLogger(__name__)


async def find_attractions(
    user_id: str,
    location: str,
    radius_miles: Optional[int] = 50,
    categories: Optional[List[str]] = None,
    **kwargs
) -> Dict[str, Any]:
    """
    Find attractions and points of interest

    Args:
        user_id: UUID of the user
        location: Location to search near
        radius_miles: Search radius in miles (default: 50)
        categories: Optional categories (national_parks, museums, restaurants, etc.)

    Returns:
        Dict with attraction listings
    """
    try:
        if not location:
            return {
                "success": False,
                "error": "Location is required"
            }

        # In production, integrate with:
        # - Google Places API
        # - National Parks API
        # - TripAdvisor API

        # Mock attractions
        all_attractions = [
            {
                "name": "Yellowstone National Park",
                "category": "national_park",
                "rating": 4.8,
                "distance_miles": 15.2,
                "description": "America's first national park",
                "admission_fee": 35.00
            },
            {
                "name": "Old Faithful Inn",
                "category": "landmark",
                "rating": 4.7,
                "distance_miles": 16.5,
                "description": "Historic lodge near Old Faithful geyser",
                "admission_fee": 0.00
            },
            {
                "name": "Yellowstone Lake",
                "category": "nature",
                "rating": 4.6,
                "distance_miles": 20.1,
                "description": "Largest high-elevation lake in North America",
                "admission_fee": 0.00
            }
        ]

        # Filter by categories if provided
        if categories:
            attractions = [
                a for a in all_attractions
                if a["category"] in categories
            ]
        else:
            attractions = all_attractions

        # Sort by rating
        attractions = sorted(attractions, key=lambda x: x["rating"], reverse=True)

        logger.info(f"Found {len(attractions)} attractions near {location} for user {user_id}")

        return {
            "success": True,
            "location": location,
            "radius_miles": radius_miles,
            "categories": categories or ["all"],
            "attractions_found": len(attractions),
            "attractions": attractions[:15],  # Top 15
            "message": f"Found {len(attractions)} attractions within {radius_miles} miles of {location}"
        }

    except Exception as e:
        logger.error(f"Error finding attractions: {e}", exc_info=True)
        return {
            "success": False,
            "error": str(e)
        }
