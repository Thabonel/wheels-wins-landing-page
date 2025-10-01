"""Find Cheap Gas Tool for PAM

Locate cheapest gas stations near a location or along a route

Example usage:
- "Find cheap gas near me"
- "Show cheapest gas stations along I-5"
"""

import logging
from typing import Any, Dict, Optional, List

logger = logging.getLogger(__name__)


async def find_cheap_gas(
    user_id: str,
    location: str,
    radius_miles: Optional[int] = 25,
    fuel_type: Optional[str] = "regular",
    **kwargs
) -> Dict[str, Any]:
    """
    Find cheapest gas stations near a location

    Args:
        user_id: UUID of the user
        location: Location to search near
        radius_miles: Search radius in miles (default: 25)
        fuel_type: Type of fuel (regular, diesel, premium)

    Returns:
        Dict with gas station listings sorted by price
    """
    try:
        if not location:
            return {
                "success": False,
                "error": "Location is required"
            }

        # Validate fuel type
        valid_fuel_types = ["regular", "diesel", "premium"]
        if fuel_type not in valid_fuel_types:
            fuel_type = "regular"

        # In production, integrate with GasBuddy or similar API
        # For now, return mock data structure
        mock_stations = [
            {
                "name": "Shell Station",
                "address": "123 Main St",
                "price": 3.45,
                "distance_miles": 2.1,
                "has_diesel": True
            },
            {
                "name": "Chevron",
                "address": "456 Oak Ave",
                "price": 3.49,
                "distance_miles": 3.5,
                "has_diesel": True
            },
            {
                "name": "Exxon",
                "address": "789 Pine Rd",
                "price": 3.52,
                "distance_miles": 5.2,
                "has_diesel": False
            }
        ]

        # Sort by price
        sorted_stations = sorted(mock_stations, key=lambda x: x["price"])

        # Filter by fuel type if diesel
        if fuel_type == "diesel":
            sorted_stations = [s for s in sorted_stations if s.get("has_diesel", False)]

        cheapest_price = sorted_stations[0]["price"] if sorted_stations else None

        logger.info(f"Found {len(sorted_stations)} gas stations near {location} for user {user_id}")

        return {
            "success": True,
            "location": location,
            "radius_miles": radius_miles,
            "fuel_type": fuel_type,
            "stations_found": len(sorted_stations),
            "cheapest_price": cheapest_price,
            "stations": sorted_stations[:10],  # Top 10
            "message": f"Cheapest {fuel_type} gas: ${cheapest_price}/gal near {location}" if cheapest_price else f"No {fuel_type} stations found"
        }

    except Exception as e:
        logger.error(f"Error finding cheap gas: {e}", exc_info=True)
        return {
            "success": False,
            "error": str(e)
        }
