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
from .unit_conversion import (
    get_user_unit_preference,
    format_gas_cost_response,
    convert_km_to_miles
)
from app.services.external.eia_gas_prices import get_fuel_price_for_region

logger = logging.getLogger(__name__)


async def _detect_user_region(user_id: str) -> str:
    """
    Detect user's region from their settings

    Returns: Region code (US, CA, AU, UK, NZ, EU)
    """
    try:
        supabase: Client = create_client(
            os.getenv("SUPABASE_URL"),
            os.getenv("SUPABASE_SERVICE_ROLE_KEY")
        )

        response = supabase.table("user_settings").select(
            "regional_preferences"
        ).eq("user_id", user_id).single().execute()

        if response.data and response.data.get("regional_preferences"):
            prefs = response.data["regional_preferences"]

            # Detect from currency
            currency = prefs.get("currency", "USD")
            if currency == "CAD":
                return "CA"
            elif currency == "AUD":
                return "AU"
            elif currency == "GBP":
                return "UK"
            elif currency == "NZD":
                return "NZ"
            elif currency == "EUR":
                return "EU"
            else:
                return "US"

        return "US"  # Default

    except Exception as e:
        logger.warning(f"Could not detect user region: {e}")
        return "US"


async def calculate_gas_cost(
    user_id: str,
    distance_miles: Optional[float] = None,
    distance_km: Optional[float] = None,
    mpg: Optional[float] = None,
    gas_price: Optional[float] = None,
    **kwargs
) -> Dict[str, Any]:
    """
    Calculate estimated gas cost for a trip

    Args:
        user_id: UUID of the user
        distance_miles: Trip distance in miles (preferred for internal use)
        distance_km: Trip distance in kilometers (auto-converted to miles)
        mpg: Vehicle miles per gallon (uses stored vehicle data if not provided)
        gas_price: Price per gallon (default: $3.50)

    Returns:
        Dict with gas cost estimate formatted in user's preferred units
    """
    try:
        # Handle distance input (accept either miles or km, convert to miles internally)
        if distance_km is not None:
            distance_miles = convert_km_to_miles(distance_km)
        elif distance_miles is None:
            return {
                "success": False,
                "error": "Must provide either distance_miles or distance_km"
            }

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

        # Get real gas price from regional API if not provided
        if gas_price is None:
            # Detect user's region
            region = await _detect_user_region(user_id)
            fuel_price_data = await get_fuel_price_for_region(region, "regular")

            # Convert to USD per gallon if needed
            if region == "US":
                gas_price = fuel_price_data["price"]  # Already USD/gallon
            else:
                # Convert liters to gallons (1 gallon = 3.78541 liters)
                price_per_gallon = fuel_price_data["price"] * 3.78541
                # Note: This is still in local currency (AUD or EUR)
                # For simplicity, we'll use it as-is for now
                # TODO: Add currency conversion
                gas_price = price_per_gallon

            logger.info(
                f"Using {region} fuel price: {fuel_price_data['price']:.2f} "
                f"{fuel_price_data['currency']}/{fuel_price_data['unit']} "
                f"(source: {fuel_price_data['source']})"
            )

        # Calculate gallons needed
        gallons_needed = distance_miles / mpg

        # Calculate total cost
        total_cost = gallons_needed * gas_price

        # Calculate cost per mile
        cost_per_mile = total_cost / distance_miles

        logger.info(f"Calculated gas cost: ${total_cost:.2f} for {distance_miles} miles for user {user_id}")

        # Get user's unit preference to format response
        unit_system = await get_user_unit_preference(user_id)

        # Format response message in user's preferred units
        message = format_gas_cost_response(
            distance_miles=distance_miles,
            mpg=mpg,
            gallons_needed=gallons_needed,
            total_cost=total_cost,
            unit_system=unit_system,
            gas_price=gas_price
        )

        return {
            "success": True,
            "distance_miles": distance_miles,
            "mpg": mpg,
            "gas_price_per_gallon": gas_price,
            "gallons_needed": round(gallons_needed, 2),
            "total_cost": round(total_cost, 2),
            "cost_per_mile": round(cost_per_mile, 2),
            "message": message
        }

    except Exception as e:
        logger.error(f"Error calculating gas cost: {e}", exc_info=True)
        return {
            "success": False,
            "error": str(e)
        }
