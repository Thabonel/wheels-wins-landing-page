"""
Weather function tools for PAM 2.0
Google Gemini function calling integration
"""

import logging
import httpx
from typing import Dict, Any, Optional

logger = logging.getLogger(__name__)

async def get_weather(
    location: str,
    units: str = "metric"  # metric, imperial, kelvin
) -> Dict[str, Any]:
    """
    Get current weather information for a location

    Args:
        location: City name or "latitude,longitude"
        units: Temperature units (metric, imperial, kelvin)

    Returns:
        Weather data including temperature, description, humidity, etc.
    """

    try:
        # Using OpenWeatherMap API (free tier)
        # Note: In production, this should use a configured API key
        api_key = "demo_key"  # Replace with actual API key from config

        # For demo purposes, return mock weather data
        # In production, make actual API call:
        # url = f"https://api.openweathermap.org/data/2.5/weather"
        # params = {"q": location, "appid": api_key, "units": units}
        # async with httpx.AsyncClient() as client:
        #     response = await client.get(url, params=params)
        #     data = response.json()

        # Mock weather data for demo
        mock_weather_data = {
            "location": location,
            "temperature": 22 if units == "metric" else 72,
            "unit": "°C" if units == "metric" else "°F",
            "description": "Partly cloudy with light breeze",
            "humidity": 65,
            "wind_speed": 5.2,
            "visibility": "10 km",
            "uv_index": 6,
            "travel_advisory": "Great weather for outdoor activities and sightseeing!"
        }

        logger.info(f"Weather data retrieved for {location}")
        return mock_weather_data

    except Exception as e:
        logger.error(f"Error getting weather for {location}: {e}")
        return {
            "error": f"Unable to retrieve weather data for {location}",
            "location": location
        }

async def get_weather_forecast(
    location: str,
    days: int = 5,
    units: str = "metric"
) -> Dict[str, Any]:
    """
    Get weather forecast for a location

    Args:
        location: City name or coordinates
        days: Number of days to forecast (1-5)
        units: Temperature units

    Returns:
        Weather forecast data
    """

    try:
        # Mock forecast data for demo
        forecast_days = []
        base_temp = 22 if units == "metric" else 72

        for i in range(min(days, 5)):
            day_data = {
                "day": i + 1,
                "temperature_high": base_temp + (i * 2),
                "temperature_low": base_temp - 5 + i,
                "unit": "°C" if units == "metric" else "°F",
                "description": ["Sunny", "Partly cloudy", "Scattered showers", "Sunny", "Clear skies"][i],
                "precipitation_chance": [10, 30, 70, 5, 0][i]
            }
            forecast_days.append(day_data)

        return {
            "location": location,
            "forecast": forecast_days,
            "travel_recommendation": "Pack light layers and a light rain jacket for day 3"
        }

    except Exception as e:
        logger.error(f"Error getting forecast for {location}: {e}")
        return {
            "error": f"Unable to retrieve forecast data for {location}",
            "location": location
        }

# Function definitions for Gemini function calling
WEATHER_FUNCTIONS = [
    {
        "name": "get_weather",
        "description": "Get current weather information for any location worldwide",
        "parameters": {
            "type": "object",
            "properties": {
                "location": {
                    "type": "string",
                    "description": "City name, country (e.g., 'Paris, France' or 'New York, USA')"
                },
                "units": {
                    "type": "string",
                    "description": "Temperature units",
                    "enum": ["metric", "imperial", "kelvin"],
                    "default": "metric"
                }
            },
            "required": ["location"]
        }
    },
    {
        "name": "get_weather_forecast",
        "description": "Get weather forecast for travel planning (up to 5 days)",
        "parameters": {
            "type": "object",
            "properties": {
                "location": {
                    "type": "string",
                    "description": "Destination city and country"
                },
                "days": {
                    "type": "integer",
                    "description": "Number of forecast days (1-5)",
                    "minimum": 1,
                    "maximum": 5,
                    "default": 5
                },
                "units": {
                    "type": "string",
                    "description": "Temperature units",
                    "enum": ["metric", "imperial", "kelvin"],
                    "default": "metric"
                }
            },
            "required": ["location"]
        }
    }
]