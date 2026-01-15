"""Plan Trip Tool for PAM

Multi-stop route planning with budget constraints

Example usage:
- "Plan a trip from Phoenix to Seattle under $2000"
- "Create a route from LA to New York with 3 stops"

Amendment #4: Input validation with Pydantic models
Amendment #5: Return map_action for Grok-style map visualization
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

logger = logging.getLogger(__name__)
settings = get_settings()


async def geocode_location(address: str) -> Optional[Tuple[float, float]]:
    """
    Geocode an address to coordinates using Mapbox API
    Returns (longitude, latitude) for Mapbox format, or None if failed
    """
    # Get Mapbox token from settings
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
        params = {"access_token": mapbox_token, "limit": 1}

        async with aiohttp.ClientSession() as session:
            async with session.get(url, params=params, timeout=aiohttp.ClientTimeout(total=10)) as response:
                if response.status == 200:
                    data = await response.json()
                    if data["features"]:
                        coords = data["features"][0]["geometry"]["coordinates"]
                        return (coords[0], coords[1])  # [lng, lat] - Mapbox format

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
    """
    try:
        # Validate inputs using Pydantic schema
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
            # Extract first error message for user-friendly response
            error_msg = e.errors()[0]['msg']
            return {
                "success": False,
                "error": f"Invalid input: {error_msg}"
            }

        supabase = get_supabase_client()

        # Parse start date or use today
        if validated.start_date:
            try:
                trip_start = datetime.fromisoformat(validated.start_date.replace('Z', '+00:00'))
            except ValueError:
                trip_start = datetime.now()
        else:
            trip_start = datetime.now()

        # NOTE: For best results, PAM orchestrator should:
        # 1. Call mapbox_navigator to get actual route data
        # 2. Pass route data to this function via kwargs["route_data"]
        # 3. This function saves the plan to database with accurate data

        # Extract route data from mapbox_navigator if provided
        route_data = kwargs.get("route_data", {})
        distance_miles = route_data.get("distance_miles")
        duration_hours = route_data.get("duration_hours")
        fuel_gallons = route_data.get("fuel_gallons")
        estimated_gas_cost = route_data.get("estimated_cost")

        # Fallback to simplified estimates if no route data provided
        if not route_data:
            # Simplified estimate: ~100 miles per stop
            estimated_distance = 100.0 * (len(validated.stops) + 1) if validated.stops else 300.0
            estimated_gas = 150.00 * (len(validated.stops) + 1) if validated.stops else 150.00
            estimated_lodging = 100.00 * (len(validated.stops) + 2) if validated.stops else 200.00
        else:
            # Use mapbox_navigator data
            estimated_distance = distance_miles
            estimated_gas = estimated_gas_cost if estimated_gas_cost else 0.0
            # Estimate lodging: $100/night * number of travel days
            estimated_days = int(duration_hours / 8) if duration_hours else 2
            estimated_lodging = 100.00 * max(estimated_days, 1)

        estimated_total = estimated_gas + estimated_lodging

        # Build trip plan data for user_trips table
        # Schema: user_trips has total_budget, not budget
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

        # Save trip to database (correct table name: user_trips)
        response = supabase.table("user_trips").insert(trip_data).execute()

        if response.data:
            trip = response.data[0]

            budget_status = "within_budget" if not validated.budget or estimated_total <= validated.budget else "over_budget"

            logger.info(f"Created trip plan: {trip['id']} for user {validated.user_id} (route source: {trip_data['metadata']['route_source']})")

            # Build map_action for Grok-style map visualization
            # Geocode all locations to get coordinates
            waypoints = []

            # Origin
            origin_coords = await geocode_location(validated.origin)
            if origin_coords:
                waypoints.append({
                    "name": validated.origin,
                    "coordinates": list(origin_coords),  # [lng, lat]
                    "type": "origin",
                    "description": "Starting point"
                })

            # Intermediate stops
            if validated.stops:
                for stop in validated.stops:
                    stop_coords = await geocode_location(stop)
                    if stop_coords:
                        waypoints.append({
                            "name": stop,
                            "coordinates": list(stop_coords),  # [lng, lat]
                            "type": "waypoint",
                            "description": "Stop along route"
                        })

            # Destination
            dest_coords = await geocode_location(validated.destination)
            if dest_coords:
                waypoints.append({
                    "name": validated.destination,
                    "coordinates": list(dest_coords),  # [lng, lat]
                    "type": "destination",
                    "description": "Final destination"
                })

            # Build map_action only if we have valid waypoints
            map_action = None
            if len(waypoints) >= 2:  # Need at least origin and destination
                map_action = {
                    "type": "REPLACE_ROUTE",
                    "waypoints": waypoints,
                    "metadata": {
                        "totalDistance": estimated_distance * 1609.34 if estimated_distance else None,  # Convert miles to meters
                        "totalDuration": duration_hours * 3600 if duration_hours else None,  # Convert hours to seconds
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
        else:
            logger.error(f"Failed to create trip: {response}")
            return {
                "success": False,
                "error": "Failed to create trip plan"
            }

    except Exception as e:
        logger.error(f"Error planning trip: {e}", exc_info=True)
        return {
            "success": False,
            "error": str(e)
        }
