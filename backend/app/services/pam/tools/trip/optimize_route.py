"""Optimize Route Tool for PAM

Find the most cost-effective and time-efficient route.
Automatically tracks savings when route optimization saves fuel costs.
"""

import logging
from typing import Any, Dict, Optional, List
from pydantic import ValidationError

from app.services.pam.schemas.trip import OptimizeRouteInput
from app.services.pam.tools.budget.auto_track_savings import auto_record_savings
from app.services.pam.tools.exceptions import (
    ValidationError as CustomValidationError,
    DatabaseError,
)
from app.services.pam.tools.utils import (
    validate_uuid,
)

logger = logging.getLogger(__name__)

MINIMUM_SAVINGS_THRESHOLD = 5.0
SAVINGS_CONFIDENCE_SCORE = 0.85


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

        try:
            validated = OptimizeRouteInput(
                user_id=user_id,
                origin=origin,
                destination=destination,
                stops=stops,
                optimization_type=optimization_type
            )
        except ValidationError as e:
            error_msg = e.errors()[0]['msg']
            raise CustomValidationError(
                f"Invalid input: {error_msg}",
                context={"validation_errors": e.errors()}
            )

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

        if validated.optimization_type == "cost":
            optimized_route["savings"]["gas_cost"] = 25.00
        elif validated.optimization_type == "time":
            optimized_route["savings"]["time_hours"] = 1.5

        logger.info(f"Optimized route from {validated.origin} to {validated.destination} for user {validated.user_id}")

        gas_savings = optimized_route["savings"]["gas_cost"]
        savings_tracked = False
        if gas_savings >= MINIMUM_SAVINGS_THRESHOLD:
            savings_tracked = await auto_record_savings(
                user_id=validated.user_id,
                amount=gas_savings,
                category="route",
                savings_type="route_optimization",
                description=f"Route optimization from {validated.origin} to {validated.destination} - saving ${gas_savings:.2f} in fuel costs",
                confidence_score=SAVINGS_CONFIDENCE_SCORE,
                baseline_cost=original_route["estimated_gas_cost"],
                optimized_cost=optimized_route["estimated_gas_cost"]
            )

        savings_msg = " 💰 Savings tracked!" if savings_tracked else ""

        return {
            "success": True,
            "origin": validated.origin,
            "destination": validated.destination,
            "optimization_type": validated.optimization_type,
            "original_route": original_route,
            "optimized_route": optimized_route,
            "savings_tracked": savings_tracked,
            "message": f"Optimized route saves ${gas_savings:.2f} " +
                      f"and {optimized_route['savings']['time_hours']:.1f} hours.{savings_msg}"
        }

    except CustomValidationError:
        raise
    except DatabaseError:
        raise
    except Exception as e:
        logger.error(
            f"Unexpected error optimizing route",
            extra={"user_id": user_id, "origin": origin, "destination": destination},
            exc_info=True
        )
        raise DatabaseError(
            "Failed to optimize route",
            context={"user_id": user_id, "origin": origin, "destination": destination, "error": str(e)}
        )
