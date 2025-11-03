"""Plan Trip Tool for PAM

Multi-stop route planning with budget constraints

Example usage:
- "Plan a trip from Phoenix to Seattle under $2000"
- "Create a route from LA to New York with 3 stops"
"""

import logging
from typing import Any, Dict, Optional, List
from datetime import datetime

from app.integrations.supabase import get_supabase_client

logger = logging.getLogger(__name__)


async def plan_trip(
    user_id: str,
    origin: str,
    destination: str,
    budget: Optional[float] = None,
    stops: Optional[List[str]] = None,
    start_date: Optional[str] = None,
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

    Returns:
        Dict with trip plan details
    """
    try:
        # Validate inputs
        if not origin or not destination:
            return {
                "success": False,
                "error": "Both origin and destination are required"
            }

        supabase = get_supabase_client()

        # Parse start date or use today
        if start_date:
            try:
                trip_start = datetime.fromisoformat(start_date.replace('Z', '+00:00'))
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
            estimated_distance = 100.0 * (len(stops) + 1) if stops else 300.0
            estimated_gas = 150.00 * (len(stops) + 1) if stops else 150.00
            estimated_lodging = 100.00 * (len(stops) + 2) if stops else 200.00
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
            "user_id": user_id,
            "title": f"Trip from {origin} to {destination}",
            "description": f"Planned trip with {len(stops) if stops else 0} stops",
            "start_date": trip_start.date().isoformat(),
            "total_budget": float(budget) if budget else None,
            "status": "planning",
            "trip_type": "road_trip",
            "metadata": {
                "origin": origin,
                "destination": destination,
                "stops": stops or [],
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

            budget_status = "within_budget" if not budget or estimated_total <= budget else "over_budget"

            logger.info(f"Created trip plan: {trip['id']} for user {user_id} (route source: {trip_data['metadata']['route_source']})")

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
                "message": f"Planned trip from {origin} to {destination}" +
                          (f" with {len(stops)} stops" if stops else "") +
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
