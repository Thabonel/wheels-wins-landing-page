"""Plan Trip Tool for PAM

Multi-stop route planning with budget constraints
"""

import logging
import aiohttp
import asyncio
from typing import Any, Dict, Optional, List, Tuple
from datetime import datetime
from pydantic import ValidationError

from app.integrations.supabase import get_supabase_client
from app.services.pam.schemas.trip import PlanTripInput
from app.core.config import get_settings
from app.services.pam.tools.exceptions import (
    ValidationError as CustomValidationError,
    DatabaseError,
)
from app.services.pam.tools.utils import (
    validate_uuid,
    validate_positive_number,
    validate_date_format,
    safe_db_insert,
)

logger = logging.getLogger(__name__)
settings = get_settings()

GEOCODING_TIMEOUT_SECONDS = 10
GEOCODING_RESULT_LIMIT = 1
ESTIMATED_DISTANCE_PER_STOP_MILES = 100.0
DEFAULT_TRIP_DISTANCE_MILES = 300.0
ESTIMATED_GAS_COST_PER_STOP = 150.00
DEFAULT_GAS_COST = 150.00
LODGING_COST_PER_NIGHT = 100.00
BASE_LODGING_NIGHTS = 2
HOURS_DRIVING_PER_DAY = 8
MINIMUM_WAYPOINTS_FOR_MAP = 2
MILES_TO_METERS = 1609.34
HOURS_TO_SECONDS = 3600


async def geocode_location(address: str) -> Optional[Tuple[float, float]]:
    token_sources = ['MAPBOX_SECRET_TOKEN', 'VITE_MAPBOX_TOKEN', 'VITE_MAPBOX_PUBLIC_TOKEN']
    mapbox_token = None

    for token_name in token_sources:
        token = getattr(settings, token_name, None)
        if token:
            if hasattr(token, 'get_secret_value'):
                token = token.get_secret_value()
            if token:
                mapbox_token = token
                break

    if not mapbox_token:
        logger.warning("No Mapbox token available for geocoding")
        return None

    try:
        url = f"https://api.mapbox.com/geocoding/v5/mapbox.places/{address}.json"
        params = {"access_token": mapbox_token, "limit": GEOCODING_RESULT_LIMIT}

        async with aiohttp.ClientSession() as session:
            async with session.get(url, params=params, timeout=aiohttp.ClientTimeout(total=GEOCODING_TIMEOUT_SECONDS)) as response:
                if response.status == 200:
                    data = await response.json()
                    if data["features"]:
                        coords = data["features"][0]["geometry"]["coordinates"]
                        return (coords[0], coords[1])

        logger.warning(f"Could not geocode address: {address}")
        return None

    except Exception as e:
        logger.error(f"Geocoding error for {address}: {e}")
        return None


async def plan_trip(
    user_id: str,
    origin: str,
    destination: str,
    budget: Optional[float] = None,
    stops: Optional[List[str]] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    **kwargs
) -> Dict[str, Any]:
    """
    Plan a multi-stop trip with budget constraints

    Args:
        user_id: UUID of the user
        origin: Starting location (address or coordinates)
        destination: End location (address or coordinates)
        budget: Optional budget limit in USD
        stops: Optional list of intermediate stops
        start_date: Optional start date in ISO format
        end_date: Optional end date in ISO format

    Returns:
        Dict with trip plan details

    Raises:
        ValidationError: Invalid input parameters
        DatabaseError: Database operation failed
    """
    try:
        validate_uuid(user_id, "user_id")

        if not origin or not origin.strip():
            raise CustomValidationError(
                "Origin location is required",
                context={"field": "origin"}
            )

        if not destination or not destination.strip():
            raise CustomValidationError(
                "Destination location is required",
                context={"field": "destination"}
            )

        if budget is not None:
            validate_positive_number(budget, "budget")

        if start_date:
            validate_date_format(start_date, "start_date")

        if end_date:
            validate_date_format(end_date, "end_date")

        try:
            validated = PlanTripInput(
                user_id=user_id,
                origin=origin,
                destination=destination,
                budget=budget,
                stops=stops,
                start_date=start_date,
                end_date=end_date
            )
        except ValidationError as e:
            error_msg = e.errors()[0]['msg']
            raise CustomValidationError(
                f"Invalid input: {error_msg}",
                context={"validation_errors": e.errors()}
            )

        supabase = get_supabase_client()

        if validated.start_date:
            try:
                trip_start = datetime.fromisoformat(validated.start_date.replace('Z', '+00:00'))
            except ValueError:
                trip_start = datetime.now()
        else:
            trip_start = datetime.now()

        route_data = kwargs.get("route_data", {})
        distance_miles = route_data.get("distance_miles")
        duration_hours = route_data.get("duration_hours")
        fuel_gallons = route_data.get("fuel_gallons")
        estimated_gas_cost = route_data.get("estimated_cost")

        if not route_data:
            estimated_distance = ESTIMATED_DISTANCE_PER_STOP_MILES * (len(validated.stops) + 1) if validated.stops else DEFAULT_TRIP_DISTANCE_MILES
            estimated_gas = ESTIMATED_GAS_COST_PER_STOP * (len(validated.stops) + 1) if validated.stops else DEFAULT_GAS_COST
            estimated_lodging = LODGING_COST_PER_NIGHT * (len(validated.stops) + BASE_LODGING_NIGHTS) if validated.stops else LODGING_COST_PER_NIGHT * BASE_LODGING_NIGHTS
        else:
            estimated_distance = distance_miles
            estimated_gas = estimated_gas_cost if estimated_gas_cost else 0.0
            estimated_days = int(duration_hours / HOURS_DRIVING_PER_DAY) if duration_hours else BASE_LODGING_NIGHTS
            estimated_lodging = LODGING_COST_PER_NIGHT * max(estimated_days, 1)

        estimated_total = estimated_gas + estimated_lodging

        trip_data = {
            "user_id": validated.user_id,
            "title": f"Trip from {validated.origin} to {validated.destination}",
            "description": f"Planned trip with {len(validated.stops) if validated.stops else 0} stops",
            "start_date": trip_start.date().isoformat(),
            "total_budget": float(validated.budget) if validated.budget else None,
            "status": "planning",
            "trip_type": "road_trip",
            "metadata": {
                "origin": validated.origin,
                "destination": validated.destination,
                "stops": validated.stops or [],
                "distance_miles": estimated_distance,
                "duration_hours": duration_hours,
                "fuel_gallons": fuel_gallons,
                "created_by": "pam_ai",
                "route_source": "mapbox_navigator" if route_data else "estimated"
            }
        }

        trip = await safe_db_insert("user_trips", trip_data, user_id)

        if trip:

            budget_status = "within_budget" if not validated.budget or estimated_total <= validated.budget else "over_budget"

            logger.info(f"Created trip plan: {trip['id']} for user {validated.user_id} (route source: {trip_data['metadata']['route_source']})")

            waypoints = []

            origin_coords = await geocode_location(validated.origin)
            if origin_coords:
                waypoints.append({
                    "name": validated.origin,
                    "coordinates": list(origin_coords),
                    "type": "origin",
                    "description": "Starting point"
                })

            if validated.stops:
                for stop in validated.stops:
                    stop_coords = await geocode_location(stop)
                    if stop_coords:
                        waypoints.append({
                            "name": stop,
                            "coordinates": list(stop_coords),
                            "type": "waypoint",
                            "description": "Stop along route"
                        })

            dest_coords = await geocode_location(validated.destination)
            if dest_coords:
                waypoints.append({
                    "name": validated.destination,
                    "coordinates": list(dest_coords),
                    "type": "destination",
                    "description": "Final destination"
                })

            map_action = None
            if len(waypoints) >= MINIMUM_WAYPOINTS_FOR_MAP:
                map_action = {
                    "type": "REPLACE_ROUTE",
                    "waypoints": waypoints,
                    "metadata": {
                        "totalDistance": estimated_distance * MILES_TO_METERS if estimated_distance else None,
                        "totalDuration": duration_hours * HOURS_TO_SECONDS if duration_hours else None,
                        "estimatedFuelCost": estimated_gas,
                        "sourceTool": "plan_trip"
                    }
                }
                logger.info(f"Generated map_action with {len(waypoints)} waypoints for trip {trip['id']}")

            return {
                "success": True,
                "trip": trip,
                "estimates": {
                    "gas": estimated_gas,
                    "lodging": estimated_lodging,
                    "total": estimated_total,
                    "budget_status": budget_status,
                    "distance_miles": estimated_distance,
                    "duration_hours": duration_hours
                },
                "map_action": map_action,
                "message": f"Planned trip from {validated.origin} to {validated.destination}" +
                          (f" with {len(validated.stops)} stops" if validated.stops else "") +
                          (f" (${estimated_total:.2f} estimated, {estimated_distance:.0f} miles)" if estimated_distance else "")
            }
    except CustomValidationError:
        raise
    except DatabaseError:
        raise
    except Exception as e:
        logger.error(
            f"Unexpected error planning trip",
            extra={"user_id": user_id, "origin": origin, "destination": destination},
            exc_info=True
        )
        raise DatabaseError(
            "Failed to plan trip",
            context={"user_id": user_id, "origin": origin, "destination": destination, "error": str(e)}
        )
