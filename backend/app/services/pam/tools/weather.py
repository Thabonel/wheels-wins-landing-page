"""
Weather function tools for PAM
OpenMeteo API integration (100% FREE, no API key required!)

Created: October 2025
Restored from pam_2 backup for Amendment #3
Cost savings: ~$40/month vs OpenWeather
"""

import logging
import aiohttp
from typing import Dict, Any, Optional, Tuple

logger = logging.getLogger(__name__)

async def get_weather(
    location: str,
    units: str = "metric"  # metric, imperial, kelvin
) -> Dict[str, Any]:
    """
    Get current weather information using FREE OpenMeteo API (No API key required!)

    Args:
        location: City name (e.g., "Paris, France") or "latitude,longitude" format
        units: Temperature units (metric, imperial, kelvin)

    Returns:
        Real weather data including temperature, description, humidity, etc.
    """

    try:
        # Try to parse as coordinates first
        if "," in location and len(location.split(",")) == 2:
            parts = location.split(",")
            try:
                lat, lon = map(float, parts)
            except ValueError:
                # Not coordinates, treat as city name
                lat, lon = await _get_coordinates_for_city(location)
                if lat is None:
                    return {
                        "error": f"Could not find location: {location}",
                        "suggestion": "Try a major city like 'New York', 'Paris', 'Tokyo', or use coordinates",
                        "location": location
                    }
        else:
            # Single word or city name without comma
            lat, lon = await _get_coordinates_for_city(location)
            if lat is None:
                return {
                    "error": f"Could not find location: {location}",
                    "suggestion": "Try adding country (e.g., 'Paris, France') or use coordinates",
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

async def _get_coordinates_for_city(city_name: str) -> Tuple[Optional[float], Optional[float]]:
    """
    Get coordinates for a city name using free geocoding service
    Returns (latitude, longitude) or (None, None) if not found
    """
    try:
        # Use Nominatim (OpenStreetMap) geocoding - completely free!
        url = "https://nominatim.openstreetmap.org/search"
        headers = {
            "User-Agent": "PAM-RV-Assistant/2.0"  # Required by Nominatim
        }
        params = {
            "q": city_name,
            "format": "json",
            "limit": 1
        }

        async with aiohttp.ClientSession() as session:
            async with session.get(url, params=params, headers=headers) as response:
                if response.status != 200:
                    logger.error(f"Geocoding failed for {city_name}: HTTP {response.status}")
                    return None, None

                data = await response.json()

                if data and len(data) > 0:
                    result = data[0]
                    lat = float(result["lat"])
                    lon = float(result["lon"])
                    logger.info(f"Found coordinates for {city_name}: {lat}, {lon}")
                    return lat, lon
                else:
                    logger.warning(f"No coordinates found for {city_name}")

                    # Try some common city coordinates as fallback
                    common_cities = {
                        "new york": (40.7128, -74.0060),
                        "nyc": (40.7128, -74.0060),
                        "los angeles": (34.0522, -118.2437),
                        "la": (34.0522, -118.2437),
                        "chicago": (41.8781, -87.6298),
                        "houston": (29.7604, -95.3698),
                        "phoenix": (33.4484, -112.0740),
                        "philadelphia": (39.9526, -75.1652),
                        "san antonio": (29.4241, -98.4936),
                        "san diego": (32.7157, -117.1611),
                        "dallas": (32.7767, -96.7970),
                        "austin": (30.2672, -97.7431),
                        "san francisco": (37.7749, -122.4194),
                        "sf": (37.7749, -122.4194),
                        "seattle": (47.6062, -122.3321),
                        "denver": (39.7392, -104.9903),
                        "boston": (42.3601, -71.0589),
                        "miami": (25.7617, -80.1918),
                        "atlanta": (33.7490, -84.3880),
                        "las vegas": (36.1699, -115.1398),
                        "portland": (45.5152, -122.6784),
                        "paris": (48.8566, 2.3522),
                        "london": (51.5074, -0.1278),
                        "tokyo": (35.6762, 139.6503),
                        "beijing": (39.9042, 116.4074),
                        "moscow": (55.7558, 37.6173),
                        "sydney": (33.8688, 151.2093),
                        "toronto": (43.6532, -79.3832),
                        "mexico city": (19.4326, -99.1332),
                        "berlin": (52.5200, 13.4050),
                        "rome": (41.9028, 12.4964),
                        "madrid": (40.4168, -3.7038),
                        "dubai": (25.2048, 55.2708),
                        "singapore": (1.3521, 103.8198)
                    }

                    # Check if it's a known common city
                    city_lower = city_name.lower().split(",")[0].strip()
                    if city_lower in common_cities:
                        lat, lon = common_cities[city_lower]
                        logger.info(f"Using fallback coordinates for {city_name}: {lat}, {lon}")
                        return lat, lon

                    return None, None

    except Exception as e:
        logger.error(f"Error getting coordinates for {city_name}: {e}")
        return None, None

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
        location: City name (e.g., "Paris, France") or "latitude,longitude" format
        days: Number of forecast days (1-7 recommended for free tier)
        units: Temperature units

    Returns:
        Real multi-day weather forecast data
    """

    try:
        # Try to parse as coordinates first
        if "," in location and len(location.split(",")) == 2:
            parts = location.split(",")
            try:
                lat, lon = map(float, parts)
            except ValueError:
                # Not coordinates, treat as city name
                lat, lon = await _get_coordinates_for_city(location)
                if lat is None:
                    return {
                        "error": f"Could not find location: {location}",
                        "suggestion": "Try a major city like 'New York', 'Paris', 'Tokyo', or use coordinates",
                        "location": location
                    }
        else:
            # Single word or city name without comma
            lat, lon = await _get_coordinates_for_city(location)
            if lat is None:
                return {
                    "error": f"Could not find location: {location}",
                    "suggestion": "Try adding country (e.g., 'Paris, France') or use coordinates",
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
