"""Get Road Conditions Tool for PAM

Check road conditions, closures, and traffic along a route

Example usage:
- "What are the road conditions to Yellowstone?"
- "Check for road closures on I-80"

Amendment #4: Input validation with Pydantic models
"""

import logging
from typing import Any, Dict, Optional
from pydantic import ValidationError

from app.services.pam.schemas.trip import GetRoadConditionsInput

logger = logging.getLogger(__name__)


async def get_road_conditions(
    user_id: str,
    location: str,
    route: Optional[str] = None,
    **kwargs
) -> Dict[str, Any]:
    """
    Get current road conditions and alerts

    Args:
        user_id: UUID of the user
        location: Location or route to check
        route: Optional specific route number (e.g., "I-80")

    Returns:
        Dict with road condition data
    """
    try:
        # Validate inputs using Pydantic schema
        try:
            validated = GetRoadConditionsInput(
                user_id=user_id,
                route=location,  # Map location parameter to route field
                start_location=kwargs.get('start_location'),
                end_location=kwargs.get('end_location')
            )
        except ValidationError as e:
            # Extract first error message for user-friendly response
            error_msg = e.errors()[0]['msg']
            return {
                "success": False,
                "error": f"Invalid input: {error_msg}"
            }

        # In production, integrate with:
        # - State DOT APIs
        # - Mapbox Traffic API
        # - Weather.gov alerts

        # Mock road conditions
        conditions = {
            "overall_status": "fair",
            "alerts": [
                {
                    "type": "construction",
                    "severity": "moderate",
                    "description": "Lane closure on I-80 eastbound near mile marker 125",
                    "start_time": "2025-10-01T06:00:00Z",
                    "end_time": "2025-10-01T18:00:00Z"
                }
            ],
            "weather_impacts": {
                "visibility": "good",
                "road_surface": "dry",
                "hazards": []
            },
            "traffic_level": "moderate"
        }

        alert_count = len(conditions["alerts"])

        logger.info(f"Retrieved road conditions for {validated.route} for user {validated.user_id}")

        return {
            "success": True,
            "route": validated.route,
            "start_location": validated.start_location,
            "end_location": validated.end_location,
            "conditions": conditions,
            "alert_count": alert_count,
            "message": f"Road conditions for {validated.route}: {conditions['overall_status']}" +
                      (f" ({alert_count} alerts)" if alert_count > 0 else " (no alerts)")
        }

    except Exception as e:
        logger.error(f"Error getting road conditions: {e}", exc_info=True)
        return {
            "success": False,
            "error": str(e)
        }
