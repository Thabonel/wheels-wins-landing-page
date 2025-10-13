"""Update Vehicle Fuel Consumption Tool for PAM

Store user-provided fuel consumption data for accurate trip cost calculations

Example usage:
- "My truck uses 24 liters per 100km"
- "My RV gets 8 miles per gallon"
- "Update fuel consumption to 12 MPG"
"""

import logging
from typing import Any, Dict, Optional
from datetime import datetime
import os
from supabase import create_client, Client
from .unit_conversion import (
    convert_l_per_100km_to_mpg,
    convert_mpg_to_l_per_100km,
    get_user_unit_preference,
    format_fuel_consumption
)

logger = logging.getLogger(__name__)


async def update_vehicle_fuel_consumption(
    user_id: str,
    mpg: Optional[float] = None,
    l_per_100km: Optional[float] = None,
    vehicle_id: Optional[str] = None,
    **kwargs
) -> Dict[str, Any]:
    """
    Update vehicle fuel consumption data

    Args:
        user_id: UUID of the user
        mpg: Fuel consumption in miles per gallon (optional)
        l_per_100km: Fuel consumption in liters per 100km (optional)
        vehicle_id: Specific vehicle ID (uses primary vehicle if not provided)

    Returns:
        Dict with updated fuel consumption data
    """
    try:
        # Validate input - must provide either MPG or L/100km
        if mpg is None and l_per_100km is None:
            return {
                "success": False,
                "error": "Must provide either MPG or liters per 100km"
            }

        # Initialize Supabase client
        supabase: Client = create_client(
            os.getenv("SUPABASE_URL"),
            os.getenv("SUPABASE_SERVICE_ROLE_KEY")
        )

        # Get vehicle (primary if not specified)
        if vehicle_id:
            vehicle_response = supabase.table("vehicles").select("*").eq("id", vehicle_id).eq("user_id", user_id).single().execute()
        else:
            # Get primary vehicle
            vehicle_response = supabase.table("vehicles").select("*").eq("user_id", user_id).eq("is_primary", True).single().execute()

        if not vehicle_response.data:
            return {
                "success": False,
                "error": "No vehicle found. Please add a vehicle first."
            }

        vehicle = vehicle_response.data

        # Calculate both metrics
        if mpg is not None:
            fuel_mpg = float(mpg)
            fuel_l_per_100km = convert_mpg_to_l_per_100km(fuel_mpg)
        else:
            fuel_l_per_100km = float(l_per_100km)
            fuel_mpg = convert_l_per_100km_to_mpg(fuel_l_per_100km)

        # Update vehicle fuel consumption
        update_data = {
            "fuel_consumption_mpg": fuel_mpg,
            "fuel_consumption_l_per_100km": fuel_l_per_100km,
            "fuel_consumption_source": "user_provided",
            "fuel_consumption_last_updated": datetime.utcnow().isoformat(),
            "fuel_consumption_sample_size": 1  # User provided = 1 sample
        }

        supabase.table("vehicles").update(update_data).eq("id", vehicle["id"]).execute()

        logger.info(f"Updated fuel consumption for vehicle {vehicle['id']}: {fuel_mpg} MPG / {fuel_l_per_100km} L/100km")

        # Get user's unit preference to format response
        unit_system = await get_user_unit_preference(user_id)
        fuel_consumption_str = format_fuel_consumption(fuel_mpg, unit_system)

        return {
            "success": True,
            "vehicle_id": vehicle["id"],
            "vehicle_name": vehicle.get("name", "Your vehicle"),
            "fuel_consumption_mpg": fuel_mpg,
            "fuel_consumption_l_per_100km": fuel_l_per_100km,
            "message": f"Got it! I've recorded that your {vehicle.get('name', 'vehicle')} uses {fuel_consumption_str}. I'll use this for trip cost calculations."
        }

    except ValueError as e:
        logger.error(f"Invalid fuel consumption value: {e}")
        return {
            "success": False,
            "error": str(e)
        }
    except Exception as e:
        logger.error(f"Error updating vehicle fuel consumption: {e}", exc_info=True)
        return {
            "success": False,
            "error": str(e)
        }
