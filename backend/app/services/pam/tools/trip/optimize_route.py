"""Optimize Route Tool for PAM

Find the most cost-effective and time-efficient route

Example usage:
- "Optimize my route to save money"
- "Find the fastest way to Seattle"

Amendment #4: Input validation with Pydantic models
"""

import logging
from typing import Any, Dict, Optional, List
from pydantic import ValidationError

from app.services.pam.schemas.trip import OptimizeRouteInput

logger = logging.getLogger(__name__)


async def optimize_route(
    user_id: str,
    origin: str,
    destination: str,
    stops: Optional[List[str]] = None,
    optimization_type: Optional[str] = "balanced",
    **kwargs
) -> Dict[str, Any]:
    """
    Optimize route for cost and time

    Args:
        user_id: UUID of the user
        origin: Starting location
        destination: End location
        stops: Optional intermediate stops
        optimization_type: Type of optimization (cost, time, balanced)

    Returns:
        Dict with optimized route details
    """
    try:
        # Validate inputs using Pydantic schema
        try:
            validated = OptimizeRouteInput(
                user_id=user_id,
                origin=origin,
                destination=destination,
                stops=stops,
                optimization_type=optimization_type
            )
        except ValidationError as e:
            # Extract first error message for user-friendly response
            error_msg = e.errors()[0]['msg']
            return {
                "success": False,
                "error": f"Invalid input: {error_msg}"
            }

        # In production, this would use Mapbox Optimization API
        # with real-time traffic and gas price data

        # Mock optimization results
        original_route = {
            "distance_miles": 1000,
            "duration_hours": 15.5,
            "estimated_gas_cost": 350.00
        }

        optimized_route = {
            "distance_miles": 950,
            "duration_hours": 14.8,
            "estimated_gas_cost": 332.50,
            "savings": {
                "distance": 50,
                "time_hours": 0.7,
                "gas_cost": 17.50
            }
        }

        # Adjust based on optimization type
        if validated.optimization_type == "cost":
            optimized_route["savings"]["gas_cost"] = 25.00
        elif validated.optimization_type == "time":
            optimized_route["savings"]["time_hours"] = 1.5

        logger.info(f"Optimized route from {validated.origin} to {validated.destination} for user {validated.user_id}")

        return {
            "success": True,
            "origin": validated.origin,
            "destination": validated.destination,
            "optimization_type": validated.optimization_type,
            "original_route": original_route,
            "optimized_route": optimized_route,
            "message": f"Optimized route saves ${optimized_route['savings']['gas_cost']:.2f} " +
                      f"and {optimized_route['savings']['time_hours']:.1f} hours"
        }

    except Exception as e:
        logger.error(f"Error optimizing route: {e}", exc_info=True)
        return {
            "success": False,
            "error": str(e)
        }
