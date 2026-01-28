"""Estimate Travel Time Tool for PAM

Calculate estimated travel duration including breaks and rest stops
"""

import logging
from typing import Any, Dict, Optional
from pydantic import ValidationError

from app.services.pam.schemas.trip import EstimateTravelTimeInput
from app.services.pam.tools.exceptions import (
    ValidationError as CustomValidationError,
    DatabaseError,
)
from app.services.pam.tools.utils import (
    validate_uuid,
    validate_positive_number,
)

logger = logging.getLogger(__name__)

DEFAULT_DISTANCE_ESTIMATE_MILES = 500.0
RV_AVERAGE_SPEED_MPH = 55.0
BREAK_INTERVAL_HOURS = 2
BREAK_DURATION_MINUTES = 15
MEAL_INTERVAL_HOURS = 6
MEAL_DURATION_MINUTES = 30
MAX_DAILY_DRIVING_HOURS = 8
MINUTES_PER_HOUR = 60


async def estimate_travel_time(
    user_id: str,
    origin: str,
    destination: str,
    distance_miles: Optional[float] = None,
    include_breaks: Optional[bool] = True,
    **kwargs
) -> Dict[str, Any]:
    """
    Estimate travel time with breaks and rest stops

    Args:
        user_id: UUID of the user
        origin: Starting location
        destination: End location
        distance_miles: Optional distance (calculated if not provided)
        include_breaks: Include rest stops and meal breaks (default: True)

    Returns:
        Dict with travel time estimates

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

        if distance_miles is not None:
            validate_positive_number(distance_miles, "distance_miles")

        try:
            validated = EstimateTravelTimeInput(
                user_id=user_id,
                origin=origin,
                destination=destination,
                include_breaks=include_breaks,
                distance_miles=distance_miles
            )
        except ValidationError as e:
            error_msg = e.errors()[0]['msg']
            raise CustomValidationError(
                f"Invalid input: {error_msg}",
                context={"validation_errors": e.errors()}
            )

        distance = getattr(validated, 'distance_miles', None) or DEFAULT_DISTANCE_ESTIMATE_MILES

        driving_hours = distance / RV_AVERAGE_SPEED_MPH

        if validated.include_breaks:
            num_breaks = int(driving_hours / BREAK_INTERVAL_HOURS)
            break_time_hours = (num_breaks * BREAK_DURATION_MINUTES) / MINUTES_PER_HOUR

            num_meals = int(driving_hours / MEAL_INTERVAL_HOURS)
            meal_time_hours = (num_meals * MEAL_DURATION_MINUTES) / MINUTES_PER_HOUR

            total_hours = driving_hours + break_time_hours + meal_time_hours
        else:
            total_hours = driving_hours
            num_breaks = 0
            num_meals = 0

        days = int(total_hours / MAX_DAILY_DRIVING_HOURS)
        remaining_hours = total_hours % MAX_DAILY_DRIVING_HOURS

        logger.info(f"Estimated travel time from {validated.origin} to {validated.destination}: {total_hours:.1f} hours for user {validated.user_id}")

        return {
            "success": True,
            "origin": validated.origin,
            "destination": validated.destination,
            "distance_miles": distance,
            "driving_hours": round(driving_hours, 1),
            "break_hours": round(break_time_hours if validated.include_breaks else 0, 1),
            "meal_hours": round(meal_time_hours if validated.include_breaks else 0, 1),
            "total_hours": round(total_hours, 1),
            "suggested_days": days + (1 if remaining_hours > 0 else 0),
            "breaks_recommended": num_breaks if validated.include_breaks else 0,
            "meals_recommended": num_meals if validated.include_breaks else 0,
            "message": f"Estimated travel time: {int(total_hours)} hours {int((total_hours % 1) * 60)} minutes" +
                      (f" (suggested {days + 1} days with breaks)" if days > 0 else "")
        }

    except CustomValidationError:
        raise
    except DatabaseError:
        raise
    except Exception as e:
        logger.error(
            f"Unexpected error estimating travel time",
            extra={"user_id": user_id, "origin": origin, "destination": destination},
            exc_info=True
        )
        raise DatabaseError(
            "Failed to estimate travel time",
            context={"user_id": user_id, "origin": origin, "destination": destination, "error": str(e)}
        )
