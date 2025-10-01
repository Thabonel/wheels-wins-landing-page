"""Get Weather Forecast Tool for PAM

Get weather conditions along a route or at a location

Example usage:
- "What's the weather in Denver next week?"
- "Show weather along my route to Portland"
"""

import logging
from typing import Any, Dict, Optional
from datetime import datetime, timedelta
import os

logger = logging.getLogger(__name__)


async def get_weather_forecast(
    user_id: str,
    location: str,
    days: Optional[int] = 7,
    **kwargs
) -> Dict[str, Any]:
    """
    Get weather forecast for a location

    Args:
        user_id: UUID of the user
        location: Location for weather forecast
        days: Number of days to forecast (default: 7)

    Returns:
        Dict with weather forecast data
    """
    try:
        if not location:
            return {
                "success": False,
                "error": "Location is required"
            }

        # Validate days
        days = max(1, min(days, 14))  # Limit to 1-14 days

        # In production, this would call OpenWeather API
        # For now, return mock data structure
        api_key = os.getenv("OPENWEATHER_API_KEY")

        if not api_key:
            logger.warning("OpenWeather API key not configured")
            return {
                "success": False,
                "error": "Weather API not configured"
            }

        # Mock forecast structure (replace with actual API call)
        forecast_days = []
        for day_offset in range(days):
            forecast_date = datetime.now() + timedelta(days=day_offset)
            forecast_days.append({
                "date": forecast_date.strftime("%Y-%m-%d"),
                "temp_high": 75,
                "temp_low": 55,
                "conditions": "Partly Cloudy",
                "precipitation_chance": 20,
                "wind_speed": 10
            })

        logger.info(f"Retrieved {days}-day forecast for {location} for user {user_id}")

        return {
            "success": True,
            "location": location,
            "forecast_days": days,
            "forecast": forecast_days,
            "message": f"{days}-day weather forecast for {location}"
        }

    except Exception as e:
        logger.error(f"Error getting weather forecast: {e}", exc_info=True)
        return {
            "success": False,
            "error": str(e)
        }
