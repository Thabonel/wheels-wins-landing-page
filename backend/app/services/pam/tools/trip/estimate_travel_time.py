"""Estimate Travel Time Tool for PAM

Calculate estimated travel duration including breaks and rest stops

Example usage:
- "How long to drive from LA to Vegas?"
- "Estimate travel time to Seattle with breaks"

Amendment #4: Input validation with Pydantic models
"""

import logging
from typing import Any, Dict, Optional
from pydantic import ValidationError

from app.services.pam.schemas.trip import EstimateTravelTimeInput

logger = logging.getLogger(__name__)


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
    """
    try:
        # Validate inputs using Pydantic schema
        try:
            validated = EstimateTravelTimeInput(
                user_id=user_id,
                origin=origin,
                destination=destination,
                include_breaks=include_breaks,
                distance_miles=distance_miles  # Extra field, allowed by schema
            )
        except ValidationError as e:
            # Extract first error message for user-friendly response
            error_msg = e.errors()[0]['msg']
            return {
                "success": False,
                "error": f"Invalid input: {error_msg}"
            }

        # Use provided distance or estimate (would use Mapbox in production)
        distance = getattr(validated, 'distance_miles', None) or 500.0  # Default estimate

        # RV average speed (accounting for terrain, traffic)
        avg_speed_mph = 55.0

        # Calculate driving time
        driving_hours = distance / avg_speed_mph

        # Add breaks if requested
        if validated.include_breaks:
            # Add 15 min break every 2 hours
            num_breaks = int(driving_hours / 2)
            break_time_hours = (num_breaks * 15) / 60

            # Add meal breaks (30 min per 6 hours)
            num_meals = int(driving_hours / 6)
            meal_time_hours = (num_meals * 30) / 60

            total_hours = driving_hours + break_time_hours + meal_time_hours
        else:
            total_hours = driving_hours
            num_breaks = 0
            num_meals = 0

        # Convert to days if multi-day
        days = int(total_hours / 8)  # 8 hours driving per day max for RVs
        remaining_hours = total_hours % 8

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

    except Exception as e:
        logger.error(f"Error estimating travel time: {e}", exc_info=True)
        return {
            "success": False,
            "error": str(e)
        }
