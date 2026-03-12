"""Find Cheap Gas Tool for PAM

Locate cheapest gas stations near a location or along a route.
Automatically tracks savings when cheaper gas is found.
"""

import logging
from typing import Any, Dict, Optional, List
import os
from pydantic import ValidationError
from supabase import create_client, Client
from app.services.external.eia_gas_prices import get_fuel_price_for_region, get_nearby_fuel_stations
from app.services.pam.schemas.trip import FindCheapGasInput
from app.services.pam.tools.budget.auto_track_savings import record_potential_savings
from app.services.pam.tools.exceptions import (
    ValidationError as CustomValidationError,
    DatabaseError,
)
from app.services.pam.tools.utils import (
    validate_uuid,
    validate_positive_number,
    safe_db_select,
)

logger = logging.getLogger(__name__)

DEFAULT_SEARCH_RADIUS_MILES = 25
US_PRICE_VARIATION = 0.20
INTERNATIONAL_PRICE_VARIATION = 0.05
MAX_RESULTS_RETURNED = 10
AVERAGE_TANK_SIZE_GALLONS = 25.0
AVERAGE_TANK_SIZE_LITERS = 95.0
MINIMUM_SAVINGS_THRESHOLD = 2.0


async def _geocode_location(location: str) -> Optional[Dict[str, float]]:
    """
    Geocode a location string to lat/lng coordinates using Mapbox.
    Returns None if geocoding fails.
    """
    try:
        import os
        mapbox_token = os.getenv("MAPBOX_API_KEY") or os.getenv("MAPBOX_TOKEN") or os.getenv("VITE_MAPBOX_TOKEN")
        if not mapbox_token:
            logger.warning("No Mapbox token available for geocoding")
            return None

        from urllib.parse import quote_plus
        import httpx

        query = quote_plus(location)
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(
                f"https://api.mapbox.com/geocoding/v5/mapbox.places/{query}.json",
                params={
                    "access_token": mapbox_token,
                    "limit": 1,
                    "country": "AU"
                }
            )
            response.raise_for_status()
            data = response.json()

        if data.get("features"):
            lon, lat = data["features"][0]["center"]
            logger.info(f"Geocoded '{location}' to ({lat}, {lon})")
            return {"latitude": lat, "longitude": lon}

        logger.warning(f"Could not geocode location: {location}")
        return None

    except Exception as e:
        logger.warning(f"Geocoding failed for '{location}': {e}")
        return None


async def _detect_user_region(user_id: str, location: str = "") -> str:
    """
    Detect user's region from their settings

    Args:
        user_id: User's UUID
        location: Optional location string for fallback detection

    Returns:
        Region code (US, CA, AU, UK, NZ, EU)

    Raises:
        ValidationError: Invalid user_id format
        DatabaseError: Database query failed
    """
    try:
        validate_uuid(user_id, "user_id")

        response = await safe_db_select(
            "user_settings",
            filters={"user_id": user_id},
            columns="regional_preferences",
            single=True
        )

        if response and response.get("regional_preferences"):
            prefs = response["regional_preferences"]

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

        # Second fallback: check user's profile region/timezone
        profile_response = await safe_db_select(
            "profiles",
            filters={"id": user_id},  # profiles table uses 'id' not 'user_id'
            columns="region",
            single=True
        )

        if profile_response and profile_response.get("region"):
            region = profile_response["region"].upper()
            if region in ["AU", "AUSTRALIA"] or "AUSTRALIA" in region:
                return "AU"
            elif region in ["CA", "CANADA"] or "CANADA" in region:
                return "CA"
            elif region in ["UK", "UNITED KINGDOM", "GB"] or any(country in region for country in ["KINGDOM", "ENGLAND", "SCOTLAND", "WALES"]):
                return "UK"
            elif region in ["NZ", "NEW ZEALAND"] or "NEW ZEALAND" in region:
                return "NZ"
            elif region == "US" or any(country in region for country in ["UNITED STATES", "AMERICA"]):
                return "US"

        # Third fallback: detect region from location string
        location_lower = location.lower()
        australian_keywords = [
            # States and territories
            "australia", "new south wales", "nsw", "victoria", "queensland", "tasmania", "western australia",
            "south australia", "northern territory", "act", "australian capital territory",
            # Major cities
            "sydney", "melbourne", "brisbane", "perth", "adelaide", "hobart", "darwin", "canberra",
            # Specific locations mentioned by user
            "croydon park", "gold coast"
        ]
        if any(kw in location_lower for kw in australian_keywords):
            return "AU"
        elif any(kw in location_lower for kw in ["canada", "ontario", "quebec", "british columbia", "alberta"]):
            return "CA"
        elif any(kw in location_lower for kw in ["united kingdom", "england", "scotland", "wales"]):
            return "UK"
        elif any(kw in location_lower for kw in ["new zealand", "auckland", "wellington"]):
            return "NZ"

        return "US"

    except CustomValidationError:
        raise
    except DatabaseError:
        raise
    except Exception as e:
        logger.warning(
            f"Could not detect user region, using default",
            extra={"user_id": user_id, "error": str(e)}
        )
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

    Raises:
        ValidationError: Invalid input parameters
        DatabaseError: Database operation failed
    """
    try:
        validate_uuid(user_id, "user_id")

        if not location or not location.strip():
            raise CustomValidationError(
                "Location is required",
                context={"field": "location"}
            )

        if radius_miles is not None:
            validate_positive_number(radius_miles, "radius_miles")

        try:
            validated = FindCheapGasInput(
                user_id=user_id,
                location=location,
                radius_miles=radius_miles,
                fuel_type=fuel_type
            )
        except ValidationError as e:
            error_msg = e.errors()[0]['msg']
            raise CustomValidationError(
                f"Invalid input: {error_msg}",
                context={"validation_errors": e.errors()}
            )

        region = await _detect_user_region(validated.user_id, validated.location)
        fuel_price_data = await get_fuel_price_for_region(region, validated.fuel_type)

        base_price = fuel_price_data["price"]
        currency = fuel_price_data["currency"]
        unit = fuel_price_data["unit"]

        logger.info(
            f"Using {region} fuel price for {validated.fuel_type}: "
            f"{base_price:.2f} {currency}/{unit} "
            f"(source: {fuel_price_data['source']})"
        )

        variation = US_PRICE_VARIATION if region == "US" else INTERNATIONAL_PRICE_VARIATION

        # Australian users get real station data from NSW FuelCheck
        if region == "AU":
            coords = await _geocode_location(validated.location)

            if coords:
                nearby_data = await get_nearby_fuel_stations(
                    latitude=coords["latitude"],
                    longitude=coords["longitude"],
                    fuel_type=validated.fuel_type,
                    radius=10
                )
                nearby_stations = nearby_data.get("stations", [])
            else:
                nearby_stations = []

            if nearby_stations:
                # Real station data available
                sorted_stations = [
                    {
                        "name": s["name"],
                        "brand": s["brand"],
                        "address": s["address"],
                        "price": s["price"],
                        "has_diesel": True,
                        "last_updated": s.get("last_updated", ""),
                    }
                    for s in nearby_stations[:MAX_RESULTS_RETURNED]
                ]
                cheapest_price = sorted_stations[0]["price"] if sorted_stations else None
                stations_available = True
                recommended_apps = None

                logger.info(
                    f"Returning {len(sorted_stations)} real NSW stations "
                    f"near {validated.location} for user {validated.user_id}"
                )
            else:
                # Fallback: no nearby data, show average pricing
                sorted_stations = []
                cheapest_price = None
                stations_available = False
                recommended_apps = ["NSW FuelCheck", "PetrolSpy"]

                logger.info(
                    f"No nearby station data for {validated.location} - "
                    f"returning NSW average for user {validated.user_id}"
                )

        else:
            # Other regions: Generate representative stations with clear disclaimer
            station_names = {
                "US": ["Shell", "Chevron", "Exxon", "Circle K", "76"],
                "CA": ["Petro-Canada", "Shell", "Esso", "Husky", "Canadian Tire Gas+"],
                "UK": ["BP", "Shell", "Esso", "Tesco", "Sainsbury's"],
                "NZ": ["Z Energy", "BP", "Mobil", "Caltex", "Gull"],
                "EU": ["Shell", "BP", "Total", "Esso", "Q8"]
            }
            stations = station_names.get(region, station_names["US"])

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
                    "price": round(base_price - variation, 2),
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

            sorted_stations = sorted(mock_stations, key=lambda x: x["price"])

            if validated.fuel_type == "diesel":
                sorted_stations = [s for s in sorted_stations if s.get("has_diesel", False)]

            cheapest_price = sorted_stations[0]["price"] if sorted_stations else None
            stations_available = True
            recommended_apps = None

            logger.info(f"Generated {len(sorted_stations)} representative stations near {validated.location} for user {validated.user_id}")

        price_source = {
            "US": "U.S. Energy Information Administration (EIA)",
            "CA": "Natural Resources Canada (NRCan)",
            "AU": "NSW Government Fuel API",
            "UK": "UK Government Fuel Price Data",
            "NZ": "NZ Ministry of Business, Innovation and Employment",
            "EU": "European fuel price data"
        }.get(region, "regional fuel data")

        potential_savings = 0.0
        savings_opportunity_id = None

        # Calculate potential savings differently for AU vs other regions
        if region == "AU":
            estimated_liters = AVERAGE_TANK_SIZE_LITERS

            if stations_available and cheapest_price:
                # Real station data - calculate savings vs average
                price_diff = base_price - cheapest_price if base_price > cheapest_price else 0
                potential_savings = round(price_diff * estimated_liters, 2)

                if potential_savings >= MINIMUM_SAVINGS_THRESHOLD:
                    savings_opportunity_id = await record_potential_savings(
                        user_id=validated.user_id,
                        amount=potential_savings,
                        category="fuel",
                        savings_type="fuel_optimization",
                        description=f"Found cheaper {validated.fuel_type} at {sorted_stations[0]['name']} near {validated.location} - could save {currency}{potential_savings:.2f} vs NSW average",
                        confidence_score=0.90,
                        baseline_cost=base_price * estimated_liters,
                        optimized_cost=cheapest_price * estimated_liters
                    )

                cheapest_station = sorted_stations[0]
                savings_msg = f" You could save {currency}{potential_savings:.2f} per fill-up vs the NSW average!" if potential_savings >= MINIMUM_SAVINGS_THRESHOLD else ""
                message = (
                    f"Found {len(sorted_stations)} {validated.fuel_type} stations near {validated.location}. "
                    f"Cheapest is {cheapest_station['name']} at {cheapest_station['address']} "
                    f"for {currency}{cheapest_price:.3f}/{unit}.{savings_msg} "
                    f"NSW average is {currency}{base_price:.2f}/{unit}."
                )
            else:
                # Fallback average pricing
                price_diff = INTERNATIONAL_PRICE_VARIATION
                potential_savings = round(price_diff * estimated_liters, 2)

                if potential_savings >= MINIMUM_SAVINGS_THRESHOLD:
                    savings_opportunity_id = await record_potential_savings(
                        user_id=validated.user_id,
                        amount=potential_savings,
                        category="fuel",
                        savings_type="fuel_optimization",
                        description=f"Potential fuel savings near {validated.location} vs NSW average",
                        confidence_score=0.60,
                        baseline_cost=base_price * estimated_liters,
                        optimized_cost=(base_price - price_diff) * estimated_liters
                    )

                fuel_type_display = validated.fuel_type
                savings_msg = f" By shopping around, you could save up to {currency}{potential_savings:.2f} per fill-up compared to the average!" if potential_savings >= MINIMUM_SAVINGS_THRESHOLD else ""
                message = (
                    f"The current NSW average {fuel_type_display} price is {currency}{base_price:.2f}/{unit} based on NSW FuelCheck data.{savings_msg} "
                    f"For real-time station prices near {validated.location}, check the NSW FuelCheck app or PetrolSpy."
                )
        else:
            # For other regions: use existing logic with fake stations
            if cheapest_price and base_price > cheapest_price:
                estimated_gallons = AVERAGE_TANK_SIZE_GALLONS if region == "US" else AVERAGE_TANK_SIZE_LITERS
                price_diff = base_price - cheapest_price
                potential_savings = round(price_diff * estimated_gallons, 2)

                if potential_savings >= MINIMUM_SAVINGS_THRESHOLD:
                    cheapest_station = sorted_stations[0]["name"] if sorted_stations else "nearby station"
                    savings_opportunity_id = await record_potential_savings(
                        user_id=validated.user_id,
                        amount=potential_savings,
                        category="fuel",
                        savings_type="fuel_optimization",
                        description=f"Found cheaper gas at {cheapest_station} near {validated.location} - could save {currency}{potential_savings:.2f} vs regional average",
                        confidence_score=0.75,
                        baseline_cost=base_price * estimated_gallons,
                        optimized_cost=cheapest_price * estimated_gallons
                    )

            if cheapest_price:
                savings_msg = f" 💰 Potential savings: {currency}{potential_savings:.2f} per fill-up!" if potential_savings >= MINIMUM_SAVINGS_THRESHOLD else ""
                message = (
                    f"Based on current {region} averages ({base_price:.2f} {currency}/{unit} from {price_source}), "
                    f"the cheapest {validated.fuel_type} should be around {cheapest_price:.2f} {currency}/{unit} near {validated.location}. "
                    f"I've listed {len(sorted_stations)} representative stations below.{savings_msg} "
                    f"Note: These are estimated prices based on regional averages. For real-time prices, check local fuel apps."
                )
            else:
                message = f"No {validated.fuel_type} stations found"

        # Build response with region-specific data
        response = {
            "success": True,
            "location": validated.location,
            "radius_miles": validated.radius_miles,
            "fuel_type": validated.fuel_type,
            "region": region,
            "regional_average": base_price,
            "currency": currency,
            "unit": unit,
            "stations_found": len(sorted_stations),
            "cheapest_price": cheapest_price,
            "stations": sorted_stations[:MAX_RESULTS_RETURNED] if stations_available else [],
            "stations_available": stations_available,
            "potential_savings": potential_savings,
            "savings_opportunity_id": savings_opportunity_id,
            "potential_savings_recorded": bool(savings_opportunity_id),
            "message": message
        }

        # Add region-specific fields
        if region == "AU":
            response["recommended_apps"] = recommended_apps
            response["note"] = f"NSW average pricing from {price_source}. For current station prices, use recommended apps."
        else:
            response["note"] = f"Station prices are estimates based on {price_source}. For real-time prices, check local fuel apps."

        return response

    except CustomValidationError:
        raise
    except DatabaseError:
        raise
    except Exception as e:
        logger.error(
            f"Unexpected error finding cheap gas",
            extra={"user_id": user_id, "location": location},
            exc_info=True
        )
        raise DatabaseError(
            "Failed to find cheap gas",
            context={"user_id": user_id, "location": location, "error": str(e)}
        )
