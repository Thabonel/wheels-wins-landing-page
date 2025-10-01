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

        # Build trip plan data
        trip_data = {
            "user_id": user_id,
            "origin": origin,
            "destination": destination,
            "budget": float(budget) if budget else None,
            "stops": stops or [],
            "start_date": trip_start.isoformat(),
            "created_at": datetime.now().isoformat(),
            "status": "planned"
        }

        # Save trip to database
        response = supabase.table("trips").insert(trip_data).execute()

        if response.data:
            trip = response.data[0]

            # Calculate estimated costs (simplified)
            estimated_gas = 150.00 * (len(stops) + 1) if stops else 150.00
            estimated_lodging = 100.00 * (len(stops) + 2) if stops else 200.00
            estimated_total = estimated_gas + estimated_lodging

            budget_status = "within_budget" if not budget or estimated_total <= budget else "over_budget"

            logger.info(f"Created trip plan: {trip['id']} for user {user_id}")

            return {
                "success": True,
                "trip": trip,
                "estimates": {
                    "gas": estimated_gas,
                    "lodging": estimated_lodging,
                    "total": estimated_total,
                    "budget_status": budget_status
                },
                "message": f"Planned trip from {origin} to {destination}" +
                          (f" with {len(stops)} stops" if stops else "") +
                          (f" (${estimated_total:.2f} estimated)" if budget else "")
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
