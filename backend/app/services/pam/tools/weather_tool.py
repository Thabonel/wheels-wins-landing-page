"""
Weather API Integration Tool for PAM
Provides weather forecasts, alerts, and trip weather planning
"""

import asyncio
import json
from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass
from datetime import datetime, timedelta
import aiohttp
from functools import lru_cache
import hashlib

from app.core.config import get_settings
from app.core.logging import get_logger
from app.services.pam.tools.base_tool import BaseTool, ToolResult, ToolCapability

logger = get_logger(__name__)
settings = get_settings()


@dataclass
class WeatherInfo:
    """Weather information for a location"""
    location: str
    temperature: float
    feels_like: float
    conditions: str
    wind_speed: float
    wind_direction: str
    humidity: int
    visibility_miles: float
    uv_index: int
    precipitation_chance: int


@dataclass
class WeatherForecast:
    """Extended weather forecast"""
    date: datetime
    high_temp: float
    low_temp: float
    conditions: str
    precipitation_chance: int
    wind_speed: float
    rv_travel_rating: str  # "Excellent", "Good", "Fair", "Poor", "Dangerous"


@dataclass
class WeatherAlert:
    """Weather alert/warning"""
    type: str
    severity: str
    headline: str
    description: str
    start_time: datetime
    end_time: datetime


class WeatherTool(BaseTool):
    """
    Weather integration for trip planning and safety
    
    Features:
    - Current weather conditions
    - 7-day forecasts
    - Severe weather alerts
    - RV travel conditions assessment
    - Route weather planning
    - Smart caching for improved performance
    """
    
    def __init__(self):
        super().__init__(
            tool_name="weather_advisor",
            description="Get weather forecasts, alerts, and RV travel conditions",
            capabilities=[ToolCapability.WEATHER]
        )
        
        # Try to get weather API key (OpenWeatherMap as primary)
        self.api_key = getattr(settings, 'OPENWEATHER_API_KEY', None)
        if self.api_key and hasattr(self.api_key, 'get_secret_value'):
            self.api_key = self.api_key.get_secret_value()
        
        if not self.api_key:
            logger.warning("⚠️ Weather API key not configured - using mock mode")
        
        self.base_url = "https://api.openweathermap.org/data/2.5"
        self.session = None
        
        # Cache configuration
        self._cache: Dict[str, Tuple[Any, datetime]] = {}
        self._cache_ttl = {
            'current': timedelta(minutes=1),    # Current weather cached for 1 minute
            'forecast': timedelta(minutes=10),  # Forecast cached for 10 minutes
            'alerts': timedelta(minutes=5)      # Alerts cached for 5 minutes
        }
        
    async def initialize(self) -> bool:
        """Initialize the weather tool"""
        try:
            if not self.api_key:
                logger.info("🌤️ Weather tool initialized in mock mode")
                return True
                
            self.session = aiohttp.ClientSession()
            
            # Test the API connection
            test_url = f"{self.base_url}/weather"
            async with self.session.get(
                test_url,
                params={"q": "London", "appid": self.api_key}
            ) as response:
                if response.status == 200:
                    logger.info("✅ Weather API connected successfully")
                    return True
                else:
                    logger.warning(f"⚠️ Weather API test failed: {response.status}")
                    return False
                    
        except Exception as e:
            logger.error(f"❌ Failed to initialize weather tool: {e}")
            return False
    
    async def execute(self, action: str, parameters: Dict[str, Any]) -> ToolResult:
        """Execute a weather tool action"""
        try:
            if action == "get_current":
                return await self._get_current_weather(parameters)
            elif action == "get_forecast":
                return await self._get_forecast(parameters)
            elif action == "get_alerts":
                return await self._get_weather_alerts(parameters)
            elif action == "check_travel_conditions":
                return await self._check_travel_conditions(parameters)
            elif action == "get_route_weather":
                return await self._get_route_weather(parameters)
            else:
                return ToolResult(
                    success=False,
                    error=f"Unknown action: {action}"
                )
                
        except Exception as e:
            logger.error(f"❌ Weather tool execution error: {e}")
            return ToolResult(
                success=False,
                error=str(e)
            )
    
    def _get_cache_key(self, operation: str, params: Dict[str, Any]) -> str:
        """Generate cache key for weather operation"""
        # Create a stable hash of the parameters
        param_str = json.dumps(params, sort_keys=True)
        hash_obj = hashlib.md5(f"{operation}:{param_str}".encode())
        return hash_obj.hexdigest()
    
    def _get_cached_result(self, cache_key: str, cache_type: str) -> Optional[ToolResult]:
        """Get cached result if still valid"""
        if cache_key in self._cache:
            result, timestamp = self._cache[cache_key]
            age = datetime.now() - timestamp
            ttl = self._cache_ttl.get(cache_type, timedelta(minutes=5))
            
            if age < ttl:
                logger.info(f"✅ Cache hit for {cache_type} (age: {age.seconds}s)")
                return result
            else:
                # Remove expired cache entry
                del self._cache[cache_key]
        return None
    
    def _cache_result(self, cache_key: str, result: ToolResult):
        """Cache a weather result"""
        self._cache[cache_key] = (result, datetime.now())
        # Limit cache size to prevent memory issues
        if len(self._cache) > 100:
            # Remove oldest entries
            sorted_cache = sorted(self._cache.items(), key=lambda x: x[1][1])
            for key, _ in sorted_cache[:20]:  # Remove 20 oldest
                del self._cache[key]
    
    async def _get_current_weather(self, params: Dict[str, Any]) -> ToolResult:
        """Get current weather for a location with caching"""
        location = params.get("location")
        
        if not location:
            return ToolResult(
                success=False,
                error="Location required"
            )
        
        # Check cache first
        cache_key = self._get_cache_key("current", params)
        cached = self._get_cached_result(cache_key, "current")
        if cached:
            return cached
        
        # Mock response if no API key
        if not self.api_key:
            result = self._mock_current_weather(location)
            self._cache_result(cache_key, result)
            return result
        
        try:
            # Handle coordinates or city name
            if isinstance(location, (list, tuple)):
                params_dict = {
                    "lat": location[0],
                    "lon": location[1],
                    "appid": self.api_key,
                    "units": "imperial"
                }
            else:
                params_dict = {
                    "q": location,
                    "appid": self.api_key,
                    "units": "imperial"
                }
            
            url = f"{self.base_url}/weather"
            async with self.session.get(url, params=params_dict) as response:
                if response.status == 200:
                    data = await response.json()
                    
                    weather = WeatherInfo(
                        location=data["name"],
                        temperature=data["main"]["temp"],
                        feels_like=data["main"]["feels_like"],
                        conditions=data["weather"][0]["description"].title(),
                        wind_speed=data["wind"]["speed"],
                        wind_direction=self._degrees_to_direction(data["wind"].get("deg", 0)),
                        humidity=data["main"]["humidity"],
                        visibility_miles=data.get("visibility", 10000) / 1609.34,
                        uv_index=0,  # Would need separate API call
                        precipitation_chance=data.get("pop", 0) * 100 if "pop" in data else 0
                    )
                    
                    # Assess RV travel conditions
                    travel_rating = self._assess_rv_conditions(
                        wind_speed=weather.wind_speed,
                        visibility=weather.visibility_miles,
                        conditions=weather.conditions
                    )
                    
                    result = ToolResult(
                        success=True,
                        result={
                            "current": {
                                "location": weather.location,
                                "temperature": f"{weather.temperature}°F",
                                "feels_like": f"{weather.feels_like}°F",
                                "conditions": weather.conditions,
                                "wind": f"{weather.wind_speed} mph {weather.wind_direction}",
                                "humidity": f"{weather.humidity}%",
                                "visibility": f"{weather.visibility_miles:.1f} miles",
                                "rv_travel_rating": travel_rating
                            },
                            "message": f"Current weather in {weather.location}: "
                                      f"{weather.temperature}°F, {weather.conditions}, "
                                      f"RV travel conditions: {travel_rating}"
                        }
                    )
                    self._cache_result(cache_key, result)
                    return result
                else:
                    return ToolResult(
                        success=False,
                        error=f"Weather API error: {response.status}"
                    )
                    
        except Exception as e:
            logger.error(f"Current weather error: {e}")
            return ToolResult(
                success=False,
                error=str(e)
            )
    
    async def _get_forecast(self, params: Dict[str, Any]) -> ToolResult:
        """Get weather forecast for a location with caching"""
        location = params.get("location")
        days = params.get("days", 5)
        
        if not location:
            return ToolResult(
                success=False,
                error="Location required"
            )
        
        # Check cache first
        cache_key = self._get_cache_key("forecast", params)
        cached = self._get_cached_result(cache_key, "forecast")
        if cached:
            return cached
        
        # Mock response if no API key
        if not self.api_key:
            result = self._mock_forecast(location, days)
            self._cache_result(cache_key, result)
            return result
        
        try:
            # Handle coordinates or city name
            if isinstance(location, (list, tuple)):
                params_dict = {
                    "lat": location[0],
                    "lon": location[1],
                    "appid": self.api_key,
                    "units": "imperial",
                    "cnt": days * 8  # 8 forecasts per day (3-hour intervals)
                }
            else:
                params_dict = {
                    "q": location,
                    "appid": self.api_key,
                    "units": "imperial",
                    "cnt": days * 8
                }
            
            url = f"{self.base_url}/forecast"
            async with self.session.get(url, params=params_dict) as response:
                if response.status == 200:
                    data = await response.json()
                    
                    # Process forecast data into daily summaries
                    daily_forecasts = self._process_forecast_data(data["list"])
                    
                    result = ToolResult(
                        success=True,
                        result={
                            "forecast": [{
                                "date": f.date.strftime("%Y-%m-%d"),
                                "high": f"{f.high_temp}°F",
                                "low": f"{f.low_temp}°F",
                                "conditions": f.conditions,
                                "rain_chance": f"{f.precipitation_chance}%",
                                "wind": f"{f.wind_speed} mph",
                                "rv_rating": f.rv_travel_rating
                            } for f in daily_forecasts[:days]],
                            "location": data["city"]["name"],
                            "message": f"{days}-day forecast for {data['city']['name']}"
                        }
                    )
                    self._cache_result(cache_key, result)
                    return result
                else:
                    return ToolResult(
                        success=False,
                        error=f"Weather API error: {response.status}"
                    )
                    
        except Exception as e:
            logger.error(f"Forecast error: {e}")
            return ToolResult(
                success=False,
                error=str(e)
            )
    
    async def _get_weather_alerts(self, params: Dict[str, Any]) -> ToolResult:
        """Get weather alerts for a location"""
        location = params.get("location")
        
        # Mock alerts for now (would need NWS API for real alerts)
        return ToolResult(
            success=True,
            result={
                "alerts": [
                    {
                        "type": "Wind Advisory",
                        "severity": "Moderate",
                        "headline": "High winds expected",
                        "description": "Winds 25-35 mph with gusts up to 50 mph. "
                                      "RV travel not recommended.",
                        "start": datetime.now().isoformat(),
                        "end": (datetime.now() + timedelta(hours=12)).isoformat()
                    }
                ] if location else [],
                "message": "1 weather alert active" if location else "No active alerts"
            }
        )
    
    async def _check_travel_conditions(self, params: Dict[str, Any]) -> ToolResult:
        """Check if conditions are suitable for RV travel"""
        location = params.get("location")
        departure_time = params.get("departure_time")
        vehicle_type = params.get("vehicle_type", "Class A RV")
        
        # Get current weather
        weather_result = await self._get_current_weather({"location": location})
        
        if not weather_result.success:
            return weather_result
        
        current = weather_result.result["current"]
        rating = current["rv_travel_rating"]
        
        # Provide detailed recommendations
        recommendations = []
        warnings = []
        
        # Parse wind speed
        wind_speed = float(current["wind"].split()[0])
        
        if wind_speed > 25:
            warnings.append("⚠️ High winds - consider delaying travel")
        elif wind_speed > 15:
            recommendations.append("🌬️ Moderate winds - drive with caution")
        
        # Check visibility
        visibility = float(current["visibility"].split()[0])
        if visibility < 2:
            warnings.append("⚠️ Poor visibility - not safe for RV travel")
        elif visibility < 5:
            recommendations.append("🌫️ Reduced visibility - use headlights")
        
        # Check conditions
        conditions = current["conditions"].lower()
        if any(word in conditions for word in ["storm", "severe", "tornado"]):
            warnings.append("⛈️ Severe weather - do not travel")
        elif any(word in conditions for word in ["rain", "snow", "sleet"]):
            recommendations.append("🌧️ Precipitation - reduce speed, increase following distance")
        
        return ToolResult(
            success=True,
            result={
                "travel_rating": rating,
                "safe_to_travel": len(warnings) == 0,
                "warnings": warnings,
                "recommendations": recommendations,
                "current_conditions": current,
                "message": f"RV travel conditions: {rating}. "
                          f"{'Safe to travel' if len(warnings) == 0 else 'Travel not recommended'}"
            }
        )
    
    async def _get_route_weather(self, params: Dict[str, Any]) -> ToolResult:
        """Get weather along a route"""
        route_points = params.get("route_points", [])
        departure_time = params.get("departure_time")
        
        if not route_points:
            return ToolResult(
                success=False,
                error="Route points required"
            )
        
        # Get weather for key points along route
        route_weather = []
        for i, point in enumerate(route_points[:5]):  # Max 5 points
            weather_result = await self._get_current_weather({"location": point})
            if weather_result.success:
                route_weather.append({
                    "point": i + 1,
                    "location": weather_result.result["current"]["location"],
                    "conditions": weather_result.result["current"]["conditions"],
                    "temperature": weather_result.result["current"]["temperature"],
                    "rv_rating": weather_result.result["current"]["rv_travel_rating"]
                })
        
        # Determine overall route conditions
        ratings = [w["rv_rating"] for w in route_weather]
        if "Dangerous" in ratings:
            overall = "Dangerous - Travel not recommended"
        elif "Poor" in ratings:
            overall = "Poor - Use extreme caution"
        elif "Fair" in ratings:
            overall = "Fair - Some challenging conditions"
        elif "Good" in ratings:
            overall = "Good - Minor weather concerns"
        else:
            overall = "Excellent - Ideal travel conditions"
        
        return ToolResult(
            success=True,
            result={
                "route_weather": route_weather,
                "overall_rating": overall,
                "message": f"Weather checked for {len(route_weather)} points. Overall: {overall}"
            }
        )
    
    def _assess_rv_conditions(self, wind_speed: float, visibility: float, conditions: str) -> str:
        """Assess RV travel conditions based on weather"""
        conditions_lower = conditions.lower()
        
        # Dangerous conditions
        if wind_speed > 30:
            return "Dangerous"
        if visibility < 1:
            return "Dangerous"
        if any(word in conditions_lower for word in ["tornado", "hurricane", "blizzard"]):
            return "Dangerous"
        
        # Poor conditions
        if wind_speed > 25:
            return "Poor"
        if visibility < 3:
            return "Poor"
        if any(word in conditions_lower for word in ["storm", "heavy snow", "ice"]):
            return "Poor"
        
        # Fair conditions
        if wind_speed > 15:
            return "Fair"
        if visibility < 5:
            return "Fair"
        if any(word in conditions_lower for word in ["rain", "snow", "fog"]):
            return "Fair"
        
        # Good conditions
        if wind_speed > 10:
            return "Good"
        if any(word in conditions_lower for word in ["cloudy", "overcast"]):
            return "Good"
        
        # Excellent conditions
        return "Excellent"
    
    def _degrees_to_direction(self, degrees: float) -> str:
        """Convert wind degrees to direction"""
        directions = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE",
                     "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"]
        index = round(degrees / 22.5) % 16
        return directions[index]
    
    def _process_forecast_data(self, forecast_list: List[Dict]) -> List[WeatherForecast]:
        """Process raw forecast data into daily summaries"""
        daily_data = {}
        
        for item in forecast_list:
            date = datetime.fromtimestamp(item["dt"]).date()
            date_str = date.isoformat()
            
            if date_str not in daily_data:
                daily_data[date_str] = {
                    "temps": [],
                    "conditions": [],
                    "rain_chances": [],
                    "wind_speeds": [],
                    "date": date
                }
            
            daily_data[date_str]["temps"].append(item["main"]["temp"])
            daily_data[date_str]["conditions"].append(item["weather"][0]["description"])
            daily_data[date_str]["rain_chances"].append(item.get("pop", 0) * 100)
            daily_data[date_str]["wind_speeds"].append(item["wind"]["speed"])
        
        # Create daily forecasts
        forecasts = []
        for date_str, data in daily_data.items():
            # Get most common condition
            conditions = max(set(data["conditions"]), key=data["conditions"].count)
            
            forecast = WeatherForecast(
                date=data["date"],
                high_temp=max(data["temps"]),
                low_temp=min(data["temps"]),
                conditions=conditions.title(),
                precipitation_chance=int(max(data["rain_chances"])),
                wind_speed=max(data["wind_speeds"]),
                rv_travel_rating=self._assess_rv_conditions(
                    max(data["wind_speeds"]),
                    10,  # Default visibility
                    conditions
                )
            )
            forecasts.append(forecast)
        
        return sorted(forecasts, key=lambda x: x.date)
    
    def _mock_current_weather(self, location: str) -> ToolResult:
        """Mock current weather when no API key"""
        return ToolResult(
            success=True,
            result={
                "current": {
                    "location": location,
                    "temperature": "72°F",
                    "feels_like": "70°F",
                    "conditions": "Partly Cloudy",
                    "wind": "8 mph NW",
                    "humidity": "45%",
                    "visibility": "10.0 miles",
                    "rv_travel_rating": "Excellent"
                },
                "message": f"Mock weather for {location}: 72°F, Partly Cloudy, RV travel: Excellent"
            }
        )
    
    def _mock_forecast(self, location: str, days: int) -> ToolResult:
        """Mock forecast when no API key"""
        mock_days = []
        for i in range(days):
            date = datetime.now().date() + timedelta(days=i)
            mock_days.append({
                "date": date.isoformat(),
                "high": f"{75 + i}°F",
                "low": f"{55 + i}°F",
                "conditions": ["Sunny", "Partly Cloudy", "Cloudy", "Light Rain", "Clear"][i % 5],
                "rain_chance": f"{i * 10}%",
                "wind": f"{10 + i} mph",
                "rv_rating": ["Excellent", "Good", "Good", "Fair", "Excellent"][i % 5]
            })
        
        return ToolResult(
            success=True,
            result={
                "forecast": mock_days,
                "location": location,
                "message": f"Mock {days}-day forecast for {location}"
            }
        )
    
    async def cleanup(self):
        """Cleanup resources"""
        if self.session:
            await self.session.close()
    
    def get_function_schema(self) -> Dict[str, Any]:
        """Get OpenAI function calling schema"""
        return {
            "name": self.name,
            "description": self.description,
            "parameters": {
                "type": "object",
                "properties": {
                    "action": {
                        "type": "string",
                        "enum": ["get_current", "get_forecast", "get_alerts", 
                                "check_travel_conditions", "get_route_weather"],
                        "description": "The weather action to perform"
                    },
                    "parameters": {
                        "type": "object",
                        "description": "Action-specific parameters"
                    }
                },
                "required": ["action", "parameters"]
            }
        }