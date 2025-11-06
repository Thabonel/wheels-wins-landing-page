"""Get Weather Forecast Tool for PAM

Get weather conditions along a route or at a location using FREE OpenMeteo API

Example usage:
- "What's the weather in Denver next week?"
- "Show weather along my route to Portland"

AMENDMENT #3: Uses OpenMeteo (free, no API key required)
Amendment #4: Input validation with Pydantic models
"""

import logging
from typing import Any, Dict, Optional
from pydantic import ValidationError

from app.services.pam.schemas.trip import GetWeatherForecastInput

logger = logging.getLogger(__name__)


async def get_weather_forecast(
    user_id: str,
    location: str,
    days: Optional[int] = 7,
    **kwargs
) -> Dict[str, Any]:
    """
    Get weather forecast for a location using FREE OpenMeteo API

    Args:
        user_id: UUID of the user
        location: Location for weather forecast
        days: Number of days to forecast (default: 7, max: 7 for free tier)

    Returns:
        Dict with weather forecast data from OpenMeteo
    """
    try:
        # Validate inputs using Pydantic schema
        try:
            validated = GetWeatherForecastInput(
                user_id=user_id,
                location=location,
                days=days
            )
        except ValidationError as e:
            # Extract first error message for user-friendly response
            error_msg = e.errors()[0]['msg']
            return {
                "success": False,
                "error": f"Invalid input: {error_msg}"
            }

        # Import the actual working weather API function
        from app.services.pam.tools.weather import get_weather_forecast as weather_api_call

        # Call the working OpenMeteo API function directly (FREE - no API key required!)
        result = await weather_api_call(location=validated.location, days=validated.days)

        # Transform result to standard PAM tool format
        if "error" in result:
            # Error case from weather API
            return {
                "success": False,
                "error": result.get("error"),
                "location": result.get("location"),
                "suggestion": result.get("suggestion", "")
            }
        else:
            # Success case - add success field to existing data
            return {
                "success": True,
                **result  # Spread operator to include all weather data
            }

    except Exception as e:
        logger.error(f"Error getting weather forecast from OpenMeteo: {e}", exc_info=True)
        return {
            "success": False,
            "error": str(e),
            "message": "Unable to fetch weather data. Please try again."
        }
