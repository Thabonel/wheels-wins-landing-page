"""
Weather function tools for PAM 2.0
Google Gemini function calling integration with REAL OpenMeteo API (Free!)
"""

import logging
import aiohttp
from typing import Dict, Any, Optional

logger = logging.getLogger(__name__)

async def get_weather(
    location: str,
    units: str = "metric"  # metric, imperial, kelvin
) -> Dict[str, Any]:
    """
    Get current weather information using FREE OpenMeteo API (No API key required!)

    Args:
        location: "latitude,longitude" format
        units: Temperature units (metric, imperial, kelvin)

    Returns:
        Real weather data including temperature, description, humidity, etc.
    """

    try:
        # Parse coordinates from location string
        if "," in location and len(location.split(",")) == 2:
            try:
                lat, lon = map(float, location.split(","))
            except ValueError:
                return {
                    "error": f"Invalid coordinates format. Use 'latitude,longitude' (e.g., '37.7749,-122.4194')",
                    "location": location
                }
        else:
            return {
                "error": f"Please provide coordinates in 'latitude,longitude' format. City name lookup not implemented yet.",
                "location": location
            }

        # Call OpenMeteo API (completely free, no API key needed!)
        url = "https://api.open-meteo.com/v1/forecast"
        params = {
            "latitude": lat,
            "longitude": lon,
            "current_weather": "true",
            "hourly": "relativehumidity_2m,visibility,windgusts_10m",
            "forecast_days": 1
        }

        # Convert units for OpenMeteo
        if units == "imperial":
            params["temperature_unit"] = "fahrenheit"
            params["windspeed_unit"] = "mph"

        async with aiohttp.ClientSession() as session:
            async with session.get(url, params=params) as response:
                if response.status != 200:
                    return {
                        "error": f"Weather service unavailable (HTTP {response.status})",
                        "location": location
                    }

                data = await response.json()

        # Extract current weather
        current = data.get("current_weather", {})
        if not current:
            return {
                "error": "No current weather data available",
                "location": location
            }

        # Convert weather code to description
        weather_code = current.get("weathercode", 0)
        description = _get_weather_description(weather_code)

        # Get additional data from hourly (first hour = current)
        hourly = data.get("hourly", {})
        humidity = hourly.get("relativehumidity_2m", [0])[0] if hourly.get("relativehumidity_2m") else None
        visibility = hourly.get("visibility", [10])[0] if hourly.get("visibility") else 10  # km
        wind_gusts = hourly.get("windgusts_10m", [0])[0] if hourly.get("windgusts_10m") else None

        # Format response
        unit_symbol = "°F" if units == "imperial" else "°C"
        wind_unit = "mph" if units == "imperial" else "km/h"

        return {
            "location": f"{lat:.4f}, {lon:.4f}",
            "temperature": current.get("temperature", 0),
            "unit": unit_symbol,
            "description": description,
            "humidity": f"{humidity}%" if humidity else "N/A",
            "wind_speed": f"{current.get('windspeed', 0)} {wind_unit}",
            "wind_direction": f"{current.get('winddirection', 0)}°",
            "visibility": f"{visibility} km",
            "is_day": "Day" if current.get("is_day") else "Night",
            "travel_advisory": f"Current conditions: {description}. Wind speed: {current.get('windspeed', 0)} {wind_unit}. Drive safely!",
            "data_source": "OpenMeteo (European Weather Service)"
        }

    except Exception as e:
        logger.error(f"Error getting weather for {location}: {e}")
        return {
            "error": f"Unable to retrieve weather data: {str(e)}",
            "location": location
        }

def _get_weather_description(code: int) -> str:
    """Convert WMO weather codes to descriptions"""
    weather_codes = {
        0: "Clear sky",
        1: "Mainly clear", 2: "Partly cloudy", 3: "Overcast",
        45: "Foggy", 48: "Depositing rime fog",
        51: "Light drizzle", 53: "Moderate drizzle", 55: "Dense drizzle",
        56: "Light freezing drizzle", 57: "Dense freezing drizzle",
        61: "Slight rain", 63: "Moderate rain", 65: "Heavy rain",
        66: "Light freezing rain", 67: "Heavy freezing rain",
        71: "Slight snow", 73: "Moderate snow", 75: "Heavy snow",
        77: "Snow grains",
        80: "Slight rain showers", 81: "Moderate rain showers", 82: "Violent rain showers",
        85: "Slight snow showers", 86: "Heavy snow showers",
        95: "Thunderstorm", 96: "Thunderstorm with slight hail", 99: "Thunderstorm with heavy hail"
    }
    return weather_codes.get(code, f"Unknown weather (code {code})")

async def get_weather_forecast(
    location: str,
    days: int = 5,
    units: str = "metric"
) -> Dict[str, Any]:
    """
    Get real weather forecast using FREE OpenMeteo API (up to 16 days free!)

    Args:
        location: "latitude,longitude" format
        days: Number of forecast days (1-7 recommended for free tier)
        units: Temperature units

    Returns:
        Real multi-day weather forecast data
    """

    try:
        # Parse coordinates
        if "," in location and len(location.split(",")) == 2:
            try:
                lat, lon = map(float, location.split(","))
            except ValueError:
                return {
                    "error": f"Invalid coordinates format. Use 'latitude,longitude'",
                    "location": location
                }
        else:
            return {
                "error": f"Please provide coordinates in 'latitude,longitude' format",
                "location": location
            }

        # Limit to reasonable forecast days
        forecast_days = min(days, 7)

        # Call OpenMeteo forecast API
        url = "https://api.open-meteo.com/v1/forecast"
        params = {
            "latitude": lat,
            "longitude": lon,
            "daily": "weathercode,temperature_2m_max,temperature_2m_min,precipitation_probability_max,windspeed_10m_max",
            "current_weather": "true",
            "forecast_days": forecast_days
        }

        if units == "imperial":
            params["temperature_unit"] = "fahrenheit"
            params["windspeed_unit"] = "mph"

        async with aiohttp.ClientSession() as session:
            async with session.get(url, params=params) as response:
                if response.status != 200:
                    return {
                        "error": f"Weather forecast service unavailable (HTTP {response.status})",
                        "location": location
                    }

                data = await response.json()

        # Extract daily forecast
        daily = data.get("daily", {})
        if not daily:
            return {
                "error": "No forecast data available",
                "location": location
            }

        # Build forecast days
        forecast = []
        dates = daily.get("time", [])
        max_temps = daily.get("temperature_2m_max", [])
        min_temps = daily.get("temperature_2m_min", [])
        weather_codes = daily.get("weathercode", [])
        precip_probs = daily.get("precipitation_probability_max", [])
        wind_speeds = daily.get("windspeed_10m_max", [])

        unit_symbol = "°F" if units == "imperial" else "°C"
        wind_unit = "mph" if units == "imperial" else "km/h"

        for i in range(len(dates)):
            day_forecast = {
                "day": i + 1,
                "date": dates[i] if i < len(dates) else "",
                "temperature_high": max_temps[i] if i < len(max_temps) else "N/A",
                "temperature_low": min_temps[i] if i < len(min_temps) else "N/A",
                "unit": unit_symbol,
                "description": _get_weather_description(weather_codes[i]) if i < len(weather_codes) else "Unknown",
                "precipitation_chance": f"{precip_probs[i]}%" if i < len(precip_probs) else "N/A",
                "wind_speed_max": f"{wind_speeds[i]} {wind_unit}" if i < len(wind_speeds) else "N/A"
            }
            forecast.append(day_forecast)

        # Build travel recommendations
        travel_notes = []
        for day in forecast[:3]:  # First 3 days
            if "rain" in day["description"].lower() or "storm" in day["description"].lower():
                travel_notes.append(f"Day {day['day']}: Expect {day['description'].lower()} - check road conditions")
            elif "snow" in day["description"].lower():
                travel_notes.append(f"Day {day['day']}: {day['description']} expected - winter driving conditions")

        return {
            "location": f"{lat:.4f}, {lon:.4f}",
            "forecast_days": len(forecast),
            "forecast": forecast,
            "travel_recommendations": travel_notes if travel_notes else ["Good conditions for travel in forecast period"],
            "data_source": "OpenMeteo (European Weather Service) - FREE!",
            "advice": "This is real weather forecast data. Always check current conditions before traveling as weather can change rapidly."
        }

    except Exception as e:
        logger.error(f"Error getting forecast for {location}: {e}")
        return {
            "error": f"Unable to retrieve weather forecast: {str(e)}",
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