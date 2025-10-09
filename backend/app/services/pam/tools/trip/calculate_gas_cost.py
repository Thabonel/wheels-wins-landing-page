"""Calculate Gas Cost Tool for PAM

Estimate fuel costs for a trip based on distance and vehicle MPG

Example usage:
- "How much will gas cost for 500 miles?"
- "Calculate fuel cost from LA to Vegas"
"""

import logging
from typing import Any, Dict, Optional
import os
from supabase import create_client, Client

logger = logging.getLogger(__name__)


async def calculate_gas_cost(
    user_id: str,
    distance_miles: float,
    mpg: Optional[float] = None,
    gas_price: Optional[float] = None,
    **kwargs
) -> Dict[str, Any]:
    """
    Calculate estimated gas cost for a trip

    Args:
        user_id: UUID of the user
        distance_miles: Trip distance in miles
        mpg: Vehicle miles per gallon (uses stored vehicle data if not provided)
        gas_price: Price per gallon (default: $3.50)

    Returns:
        Dict with gas cost estimate
    """
    try:
        # Validate distance
        if distance_miles <= 0:
            return {
                "success": False,
                "error": "Distance must be positive"
            }

        # If MPG not provided, try to get from user's primary vehicle
        if mpg is None:
            try:
                supabase: Client = create_client(
                    os.getenv("SUPABASE_URL"),
                    os.getenv("SUPABASE_SERVICE_ROLE_KEY")
                )

                vehicle_response = supabase.table("vehicles").select("fuel_consumption_mpg, name").eq("user_id", user_id).eq("is_primary", True).single().execute()

                if vehicle_response.data and vehicle_response.data.get("fuel_consumption_mpg"):
                    mpg = float(vehicle_response.data["fuel_consumption_mpg"])
                    vehicle_name = vehicle_response.data.get("name", "your vehicle")
                    logger.info(f"Using stored fuel consumption: {mpg} MPG from {vehicle_name}")
                else:
                    mpg = 10.0  # Fallback to RV default
                    logger.info(f"No stored fuel consumption found, using default: {mpg} MPG")
            except Exception as e:
                logger.warning(f"Could not fetch vehicle fuel consumption: {e}")
                mpg = 10.0  # Fallback to RV default

        gas_price = gas_price or 3.50  # National average

        # Calculate gallons needed
        gallons_needed = distance_miles / mpg

        # Calculate total cost
        total_cost = gallons_needed * gas_price

        # Calculate cost per mile
        cost_per_mile = total_cost / distance_miles

        logger.info(f"Calculated gas cost: ${total_cost:.2f} for {distance_miles} miles for user {user_id}")

        return {
            "success": True,
            "distance_miles": distance_miles,
            "mpg": mpg,
            "gas_price_per_gallon": gas_price,
            "gallons_needed": round(gallons_needed, 2),
            "total_cost": round(total_cost, 2),
            "cost_per_mile": round(cost_per_mile, 2),
            "message": f"Estimated gas cost: ${total_cost:.2f} for {distance_miles} miles ({gallons_needed:.1f} gallons at {mpg} MPG)"
        }

    except Exception as e:
        logger.error(f"Error calculating gas cost: {e}", exc_info=True)
        return {
            "success": False,
            "error": str(e)
        }
