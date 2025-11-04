"""Find Cheap Gas Tool for PAM

Locate cheapest gas stations near a location or along a route

Example usage:
- "Find cheap gas near me"
- "Show cheapest gas stations along I-5"

Amendment #4: Input validation with Pydantic models
"""

import logging
from typing import Any, Dict, Optional, List
import os
from pydantic import ValidationError
from supabase import create_client, Client
from app.services.external.eia_gas_prices import get_fuel_price_for_region
from app.services.pam.schemas.trip import FindCheapGasInput

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
        # Validate inputs using Pydantic schema
        try:
            validated = FindCheapGasInput(
                user_id=user_id,
                location=location,
                radius_miles=radius_miles,
                fuel_type=fuel_type
            )
        except ValidationError as e:
            # Extract first error message for user-friendly response
            error_msg = e.errors()[0]['msg']
            return {
                "success": False,
                "error": f"Invalid input: {error_msg}"
            }

        # Detect user's region and get regional fuel price
        region = await _detect_user_region(validated.user_id)
        fuel_price_data = await get_fuel_price_for_region(region, validated.fuel_type.value)  # ✅ Extract enum value

        base_price = fuel_price_data["price"]
        currency = fuel_price_data["currency"]
        unit = fuel_price_data["unit"]

        logger.info(
            f"Using {region} fuel price for {validated.fuel_type.value}: "  # ✅ Extract enum value
            f"{base_price:.2f} {currency}/{unit} "
            f"(source: {fuel_price_data['source']})"
        )

        # Generate mock station data with realistic price variations
        # Variation amounts scale with region (smaller for per-liter pricing)
        variation = 0.20 if region == "US" else 0.05  # 20¢/gal vs 5¢/L

        # Region-specific station names
        station_names = {
            "US": ["Shell", "Chevron", "Exxon", "Circle K", "76"],
            "CA": ["Petro-Canada", "Shell", "Esso", "Husky", "Canadian Tire Gas+"],
            "AU": ["Shell", "BP", "Caltex", "7-Eleven", "Coles Express"],
            "UK": ["BP", "Shell", "Esso", "Tesco", "Sainsbury's"],
            "NZ": ["Z Energy", "BP", "Mobil", "Caltex", "Gull"],
            "EU": ["Shell", "BP", "Total", "Esso", "Q8"]
        }
        stations = station_names.get(region, station_names["US"])

        # In production, integrate with paid API (GasBuddy, Gas Guru) for actual station data
        mock_stations = [
            {
                "name": f"{stations[0]} Station",
                "address": "123 Main St",
                "price": round(base_price - (variation * 0.75), 2),
                "distance_miles": 2.1,
                "has_diesel": True
            },
            {
                "name": stations[1],
                "address": "456 Oak Ave",
                "price": round(base_price - (variation * 0.40), 2),
                "distance_miles": 3.5,
                "has_diesel": True
            },
            {
                "name": stations[2],
                "address": "789 Pine Rd",
                "price": round(base_price + (variation * 0.25), 2),
                "distance_miles": 5.2,
                "has_diesel": False
            },
            {
                "name": stations[3],
                "address": "321 Elm St",
                "price": round(base_price - variation, 2),  # Cheapest
                "distance_miles": 8.1,
                "has_diesel": True
            },
            {
                "name": stations[4],
                "address": "654 Maple Dr",
                "price": round(base_price + (variation * 0.60), 2),
                "distance_miles": 4.3,
                "has_diesel": False
            }
        ]

        # Sort by price
        sorted_stations = sorted(mock_stations, key=lambda x: x["price"])

        # Filter by fuel type if diesel
        if validated.fuel_type.value == "diesel":  # ✅ Extract enum value
            sorted_stations = [s for s in sorted_stations if s.get("has_diesel", False)]

        cheapest_price = sorted_stations[0]["price"] if sorted_stations else None

        logger.info(f"Found {len(sorted_stations)} gas stations near {validated.location} for user {validated.user_id}")

        # Build region-aware message
        price_source = {
            "US": "U.S. Energy Information Administration (EIA)",
            "CA": "Natural Resources Canada (NRCan)",
            "AU": "NSW Government Fuel API",
            "UK": "UK Government Fuel Price Data",
            "NZ": "NZ Ministry of Business, Innovation and Employment",
            "EU": "European fuel price data"
        }.get(region, "regional fuel data")

        if cheapest_price:
            message = (
                f"Based on current {region} averages ({base_price:.2f} {currency}/{unit} from {price_source}), "
                f"the cheapest {validated.fuel_type.value} should be around {cheapest_price:.2f} {currency}/{unit} near {validated.location}. "  # ✅ Extract enum value
                f"I've listed {len(sorted_stations)} representative stations below. "
                f"Note: For real-time station-specific prices, check local apps or websites."
            )
        else:
            message = f"No {validated.fuel_type.value} stations found"  # ✅ Extract enum value

        return {
            "success": True,
            "location": validated.location,
            "radius_miles": validated.radius_miles,
            "fuel_type": validated.fuel_type.value,  # ✅ Extract enum value
            "region": region,
            "regional_average": base_price,
            "currency": currency,
            "unit": unit,
            "stations_found": len(sorted_stations),
            "cheapest_price": cheapest_price,
            "stations": sorted_stations[:10],  # Top 10
            "message": message,
            "note": f"Prices are representative estimates based on {price_source}. For real-time prices, check local fuel price apps."
        }

    except Exception as e:
        logger.error(f"Error finding cheap gas: {e}", exc_info=True)
        return {
            "success": False,
            "error": str(e)
        }
