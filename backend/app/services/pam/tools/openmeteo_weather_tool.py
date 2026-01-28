"""OpenMeteo Weather Tool - Free weather API integration (no API key required)."""

import logging
from typing import Dict, Any, Optional
from datetime import datetime

from app.services.pam.tools.base_tool import BaseTool
from app.services.pam.tools.tool_capabilities import ToolCapability
from app.services.pam.tools.exceptions import (
    ValidationError,
    ExternalAPIError,
)

from app.services.pam.tools.weather import get_weather, get_weather_forecast

logger = logging.getLogger(__name__)

MAX_ROUTE_POINTS = 10
RV_WIND_SPEED_DANGEROUS = 30
RV_WIND_SPEED_POOR = 25
RV_WIND_SPEED_FAIR = 15
RV_WIND_SPEED_GOOD = 10
TEMP_EXTREME_HIGH = 100
TEMP_EXTREME_LOW = 10


class OpenMeteoWeatherTool(BaseTool):
    """Weather tool using OpenMeteo API (free, no API key required)."""

    def __init__(self):
        super().__init__(
            tool_name="weather_advisor",
            description="Get weather forecasts and RV travel conditions using OpenMeteo API"
        )
        self.capabilities = [ToolCapability.WEATHER]

    async def initialize(self):
        """Initialize the weather tool."""
        try:
            logger.info("🌤️ OpenMeteo weather tool initializing...")

            test_result = await get_weather(
                location="Phoenix, AZ",
                units="imperial"
            )

            if 'error' not in test_result:
                logger.info("✅ OpenMeteo weather tool initialized successfully")
                self.is_initialized = True
            else:
                logger.warning(f"⚠️ OpenMeteo test failed: {test_result.get('error')}")
                self.is_initialized = False

        except Exception as e:
            logger.error(f"❌ OpenMeteo weather tool initialization failed: {e}")
            self.is_initialized = False

    async def execute(self, user_id: str, params: Dict[str, Any], context: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Execute weather tool actions."""
        try:
            action = params.get("action", "get_current")
            location = params.get("location")

            if not location and context and context.get("user_location"):
                user_loc = context["user_location"]
                if isinstance(user_loc, dict):
                    if user_loc.get("city") and user_loc.get("region"):
                        location = f"{user_loc['city']}, {user_loc['region']}"
                        logger.info(f"📍 Using user location from context: {location}")
                    elif user_loc.get("lat") and user_loc.get("lng"):
                        location = f"{user_loc['lat']},{user_loc['lng']}"
                        logger.info(f"📍 Using user coordinates from context: {location}")

            if not location:
                raise ValidationError(
                    "Location is required for weather queries. Please provide a location or enable location services.",
                    context={"user_id": user_id, "action": action}
                )

            units = params.get("units", "imperial")

            logger.info(f"🌤️ Weather request: {action} for {location}")

            if action == "get_current":
                result = await self._get_current_weather(location, units)
            elif action == "get_forecast":
                days = params.get("days", 5)
                result = await self._get_forecast(location, days, units)
            elif action == "check_travel_conditions":
                result = await self._check_travel_conditions(location, units, params)
            elif action == "get_route_weather":
                route_points = params.get("route_points", [location])
                result = await self._get_route_weather(route_points, units)
            else:
                raise ValidationError(
                    f"Unknown weather action: {action}",
                    context={"action": action, "valid_actions": ["get_current", "get_forecast", "check_travel_conditions", "get_route_weather"]}
                )

            return {
                "success": True,
                "data": result,
                "error": None
            }

        except ValidationError:
            raise
        except ExternalAPIError:
            raise
        except Exception as e:
            logger.error(
                f"Unexpected weather tool execution error",
                extra={"user_id": user_id, "action": params.get("action")},
                exc_info=True
            )
            raise ExternalAPIError(
                "Failed to execute weather tool",
                context={"user_id": user_id, "action": params.get("action"), "error": str(e)}
            )

    async def _get_current_weather(self, location: str, units: str) -> Dict[str, Any]:
        """Get current weather conditions"""
        return await get_weather(location=location, units=units)

    async def _get_forecast(self, location: str, days: int, units: str) -> Dict[str, Any]:
        """Get multi-day weather forecast."""
        return await get_weather_forecast(
            location=location,
            days=min(days, 7),
            units=units
        )

    async def _check_travel_conditions(
        self,
        location: str,
        units: str,
        params: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Check RV travel conditions based on weather."""
        current = await get_weather(location=location, units=units)

        if 'error' in current:
            return current

        wind_speed_str = current.get('wind_speed', '0 mph')
        wind_speed = float(wind_speed_str.split()[0])

        description = current.get('description', '').lower()
        temperature = current.get('temperature', 70)

        travel_rating = self._assess_rv_travel_safety(
            wind_speed=wind_speed,
            conditions=description,
            temperature=temperature
        )

        advisory = current.get('travel_advisory', '')

        return {
            "location": location,
            "current_weather": current,
            "travel_rating": travel_rating,
            "advisory": advisory,
            "safe_to_travel": travel_rating in ["Excellent", "Good", "Fair"],
            "recommendations": self._get_travel_recommendations(
                travel_rating,
                wind_speed,
                description
            )
        }

    def _assess_rv_travel_safety(
        self,
        wind_speed: float,
        conditions: str,
        temperature: float
    ) -> str:
        """Assess RV travel safety: Excellent, Good, Fair, Poor, or Dangerous."""
        if wind_speed > RV_WIND_SPEED_DANGEROUS:
            return "Dangerous"
        elif wind_speed > RV_WIND_SPEED_POOR:
            return "Poor"
        elif wind_speed > RV_WIND_SPEED_FAIR:
            return "Fair"

        severe_keywords = ['storm', 'thunderstorm', 'heavy', 'tornado', 'hurricane']
        if any(keyword in conditions for keyword in severe_keywords):
            return "Dangerous"

        moderate_keywords = ['rain', 'snow', 'fog', 'drizzle']
        if any(keyword in conditions for keyword in moderate_keywords):
            return "Fair"

        if temperature > TEMP_EXTREME_HIGH or temperature < TEMP_EXTREME_LOW:
            return "Fair"

        if wind_speed <= RV_WIND_SPEED_GOOD:
            return "Excellent"
        else:
            return "Good"

    def _get_travel_recommendations(
        self,
        travel_rating: str,
        wind_speed: float,
        conditions: str
    ) -> list:
        """Generate travel recommendations based on conditions"""
        recommendations = []

        if travel_rating == "Dangerous":
            recommendations.append("⚠️ Avoid travel if possible - dangerous conditions for RVs")
            if wind_speed > 30:
                recommendations.append("🌬️ High winds: Find safe parking and wait for conditions to improve")

        elif travel_rating == "Poor":
            recommendations.append("⚠️ Travel not recommended - conditions challenging for RVs")
            if wind_speed > 25:
                recommendations.append("🌬️ Strong winds: Reduce speed and avoid high-profile areas")

        elif travel_rating == "Fair":
            recommendations.append("⚠️ Proceed with caution")
            if 'rain' in conditions or 'snow' in conditions:
                recommendations.append("🌧️ Wet conditions: Increase following distance")
            if wind_speed > 15:
                recommendations.append("🌬️ Moderate winds: Maintain firm grip on steering")

        elif travel_rating == "Good":
            recommendations.append("✅ Good conditions for travel")
            recommendations.append("🚐 Monitor weather updates during your trip")

        else:  # Excellent
            recommendations.append("✅ Excellent conditions for RV travel")
            recommendations.append("🌤️ Enjoy your journey!")

        return recommendations

    async def _get_route_weather(
        self,
        route_points: list,
        units: str
    ) -> Dict[str, Any]:
        """Get weather along a route (limited to first 10 points)."""
        route_weather = []

        for point in route_points[:MAX_ROUTE_POINTS]:
            weather = await get_weather(location=point, units=units)

            if 'error' not in weather:
                route_weather.append({
                    "location": point,
                    "weather": weather,
                    "safe_for_rv": self._assess_rv_travel_safety(
                        wind_speed=float(weather.get('wind_speed', '0 mph').split()[0]),
                        conditions=weather.get('description', '').lower(),
                        temperature=weather.get('temperature', 70)
                    )
                })

        if not route_weather:
            return {
                "error": "Could not retrieve weather for route points",
                "route_points": route_points
            }

        hazards = [
            point for point in route_weather
            if point['safe_for_rv'] in ['Dangerous', 'Poor']
        ]

        return {
            "route_weather": route_weather,
            "total_points": len(route_weather),
            "hazardous_sections": hazards,
            "overall_safety": "Safe" if not hazards else "Caution Required",
            "data_source": "OpenMeteo (European Weather Service)"
        }
