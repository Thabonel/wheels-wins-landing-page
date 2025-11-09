"""
OpenMeteo Weather Tool - FREE Weather API Integration
100% free weather data via OpenMeteo (European Weather Service)
No API key required!

Created: October 8, 2025
Replaces: weather_tool.py (expensive OpenWeatherMap API)
Cost savings: ~$40/month
"""

import logging
from typing import Dict, Any, Optional
from datetime import datetime

from app.services.pam.tools.base_tool import BaseTool
from app.services.pam.tools.tool_capabilities import ToolCapability

# Import the working OpenMeteo functions (AMENDMENT #3: Restored from backup, now in PAM tools)
from app.services.pam.tools.weather import get_weather, get_weather_forecast

logger = logging.getLogger(__name__)


class OpenMeteoWeatherTool(BaseTool):
    """
    Weather tool using FREE OpenMeteo API (no API key required!)

    Features:
    - Current weather conditions
    - 7-day forecasts
    - Free geocoding via Nominatim
    - RV travel condition ratings
    - Unlimited free usage
    - European Weather Service data quality

    Actions:
    - get_current: Get current weather for a location
    - get_forecast: Get multi-day weather forecast
    - check_travel_conditions: Assess RV travel safety
    """

    def __init__(self):
        super().__init__(
            tool_name="weather_advisor",
            description="Get weather forecasts and RV travel conditions using FREE OpenMeteo API"
        )
        self.capabilities = [ToolCapability.WEATHER]

    async def initialize(self):
        """Initialize the weather tool (no API key needed!)"""
        try:
            logger.info("🌤️ OpenMeteo weather tool initializing (FREE API - no key required)...")

            # Test the API with a simple call
            test_result = await get_weather(
                location="Phoenix, AZ",
                units="imperial"
            )

            if 'error' not in test_result:
                logger.info("✅ OpenMeteo weather tool initialized successfully (FREE)")
                self.is_initialized = True
            else:
                logger.warning(f"⚠️ OpenMeteo test failed: {test_result.get('error')}")
                self.is_initialized = False

        except Exception as e:
            logger.error(f"❌ OpenMeteo weather tool initialization failed: {e}")
            self.is_initialized = False

    async def execute(self, user_id: str, params: Dict[str, Any], context: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        Execute weather tool actions

        Args:
            user_id: User ID for context
            params: Action parameters
            context: Optional execution context

        Returns:
            Weather data or error
        """
        try:
            action = params.get("action", "get_current")
            location = params.get("location")

            # Auto-inject user location from context if not provided
            if not location and context and context.get("user_location"):
                user_loc = context["user_location"]
                if isinstance(user_loc, dict):
                    # Use city, region if available
                    if user_loc.get("city") and user_loc.get("region"):
                        location = f"{user_loc['city']}, {user_loc['region']}"
                        logger.info(f"📍 Using user location from context: {location}")
                    # Or use lat/lng
                    elif user_loc.get("lat") and user_loc.get("lng"):
                        location = f"{user_loc['lat']},{user_loc['lng']}"
                        logger.info(f"📍 Using user coordinates from context: {location}")

            if not location:
                return {
                    "success": False,
                    "error": "Location is required for weather queries. Please provide a location or enable location services.",
                    "data": None
                }

            # Determine units (imperial for US, metric for others)
            units = params.get("units", "imperial")

            logger.info(f"🌤️ Weather request: {action} for {location}")

            # Execute action
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
                return {
                    "success": False,
                    "error": f"Unknown weather action: {action}",
                    "data": None
                }

            # Check if result has error
            if 'error' in result:
                return {
                    "success": False,
                    "error": result['error'],
                    "data": None
                }

            return {
                "success": True,
                "data": result,
                "error": None
            }

        except Exception as e:
            logger.error(f"❌ Weather tool execution error: {e}")
            return {
                "success": False,
                "error": str(e),
                "data": None
            }

    async def _get_current_weather(self, location: str, units: str) -> Dict[str, Any]:
        """Get current weather conditions"""
        return await get_weather(location=location, units=units)

    async def _get_forecast(self, location: str, days: int, units: str) -> Dict[str, Any]:
        """Get multi-day weather forecast"""
        return await get_weather_forecast(
            location=location,
            days=min(days, 7),  # OpenMeteo supports up to 7 days free
            units=units
        )

    async def _check_travel_conditions(
        self,
        location: str,
        units: str,
        params: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Check RV travel conditions based on weather

        Returns travel safety rating and recommendations
        """
        # Get current weather and forecast
        current = await get_weather(location=location, units=units)

        if 'error' in current:
            return current

        # Extract weather conditions
        wind_speed_str = current.get('wind_speed', '0 mph')
        wind_speed = float(wind_speed_str.split()[0])  # Extract number from "X mph"

        description = current.get('description', '').lower()
        temperature = current.get('temperature', 70)

        # Assess RV travel conditions
        travel_rating = self._assess_rv_travel_safety(
            wind_speed=wind_speed,
            conditions=description,
            temperature=temperature
        )

        # Build travel advisory
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
        """
        Assess RV travel safety based on weather conditions

        Returns: Excellent, Good, Fair, Poor, or Dangerous
        """
        # Wind speed is critical for RVs
        if wind_speed > 30:
            return "Dangerous"
        elif wind_speed > 25:
            return "Poor"
        elif wind_speed > 15:
            return "Fair"

        # Check for severe weather
        severe_keywords = ['storm', 'thunderstorm', 'heavy', 'tornado', 'hurricane']
        if any(keyword in conditions for keyword in severe_keywords):
            return "Dangerous"

        # Check for moderate weather
        moderate_keywords = ['rain', 'snow', 'fog', 'drizzle']
        if any(keyword in conditions for keyword in moderate_keywords):
            return "Fair"

        # Check temperature extremes
        if temperature > 100 or temperature < 10:
            return "Fair"

        # Good conditions
        if wind_speed <= 10:
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
        """
        Get weather along a route

        Args:
            route_points: List of locations along the route
            units: Temperature units

        Returns:
            Weather data for each point along the route
        """
        route_weather = []

        for point in route_points[:10]:  # Limit to 10 points
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

        # Identify hazardous sections
        hazards = [
            point for point in route_weather
            if point['safe_for_rv'] in ['Dangerous', 'Poor']
        ]

        return {
            "route_weather": route_weather,
            "total_points": len(route_weather),
            "hazardous_sections": hazards,
            "overall_safety": "Safe" if not hazards else "Caution Required",
            "data_source": "OpenMeteo (European Weather Service) - FREE!"
        }
