"""Mapbox Integration Tool for PAM - Route planning and location intelligence."""

import asyncio
import json
import time
from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass
from collections import deque
import aiohttp
from math import radians, cos, sin, asin, sqrt
from tenacity import (
    retry,
    stop_after_attempt,
    wait_exponential,
    retry_if_exception_type,
    RetryError
)

from app.core.config import get_settings
from app.core.logging import get_logger
from app.services.pam.tools.base_tool import BaseTool, ToolResult, ToolCapability
from app.services.pam.tools.exceptions import (
    ValidationError,
    ExternalAPIError,
)

logger = get_logger(__name__)
settings = get_settings()

MAPBOX_RATE_LIMIT = 60
RATE_LIMIT_WINDOW_SECONDS = 60
API_RETRY_MAX_ATTEMPTS = 3
API_TIMEOUT_SECONDS = 30
METERS_TO_MILES = 0.000621371
RV_FUEL_EFFICIENCY_MPG = 8
DEFAULT_FUEL_PRICE_PER_GALLON = 4.50
EARTH_RADIUS_MILES = 3959
DESCRIPTION_PREVIEW_LENGTH = 200
ROUTE_STEP_SAMPLE_LIMIT = 5
ROUTE_GEOMETRY_SAMPLE_INTERVAL = 10
CAMPGROUND_SEARCH_LIMIT = 5
CAMPGROUND_AMENITY_PREVIEW_LIMIT = 3
CAMPGROUND_RESULT_LIMIT = 10
FORECAST_DAYS_PREVIEW = 3


class RateLimiter:
    """Rate limiter for Mapbox API calls (free tier: 60 requests/minute)."""

    def __init__(self, max_requests: int = MAPBOX_RATE_LIMIT, time_window: int = RATE_LIMIT_WINDOW_SECONDS):
        self.max_requests = max_requests
        self.time_window = time_window
        self.requests = deque()
        self._lock = asyncio.Lock()

    async def acquire(self):
        """Wait until rate limit allows next request."""
        async with self._lock:
            now = time.time()

            while self.requests and self.requests[0] < now - self.time_window:
                self.requests.popleft()

            if len(self.requests) >= self.max_requests:
                wait_time = self.time_window - (now - self.requests[0])
                if wait_time > 0:
                    logger.info(f"⏳ Rate limit reached, waiting {wait_time:.1f}s")
                    await asyncio.sleep(wait_time)
                    return await self.acquire()

            self.requests.append(now)
            return True


@dataclass
class RouteInfo:
    """Route information from Mapbox"""
    distance_miles: float
    duration_minutes: float
    geometry: List[List[float]]  # List of [lng, lat] coordinates
    steps: List[Dict[str, Any]]
    fuel_estimate_gallons: float
    estimated_cost: float


@dataclass
class CampgroundInfo:
    """Campground information"""
    name: str
    location: Tuple[float, float]  # (lat, lng)
    amenities: List[str]
    rating: Optional[float]
    price_range: Optional[str]
    rv_friendly: bool
    distance_miles: Optional[float]


class MapboxTool(BaseTool):
    """Mapbox integration for RV route planning and location services."""

    def __init__(self):
        super().__init__(
            tool_name="mapbox_navigator",
            description="Plan RV routes, find campgrounds, and navigate safely",
            capabilities=[ToolCapability.LOCATION_SEARCH, ToolCapability.ROUTE_PLANNING]
        )

        token_sources = [
            'MAPBOX_SECRET_TOKEN',
            'VITE_MAPBOX_TOKEN',
            'VITE_MAPBOX_PUBLIC_TOKEN'
        ]

        self.mapbox_token = None
        for token_name in token_sources:
            token = getattr(settings, token_name, None)
            if token:
                if hasattr(token, 'get_secret_value'):
                    token = token.get_secret_value()
                if token:
                    self.mapbox_token = token
                    logger.info(f"🗺️ Using {token_name} for Mapbox API")
                    break

        if not self.mapbox_token:
            logger.warning("⚠️ Mapbox token not configured - using mock mode")

        self.base_url = "https://api.mapbox.com"
        self.session = None
        self.rate_limiter = RateLimiter(max_requests=MAPBOX_RATE_LIMIT, time_window=RATE_LIMIT_WINDOW_SECONDS)

    @retry(
        stop=stop_after_attempt(API_RETRY_MAX_ATTEMPTS),
        wait=wait_exponential(multiplier=1, min=1, max=10),
        retry=retry_if_exception_type((aiohttp.ClientError, asyncio.TimeoutError)),
        reraise=True
    )
    async def _make_api_request(self, url: str, params: Dict[str, Any]) -> Dict[str, Any]:
        """Make HTTP request to Mapbox API with retry logic and rate limiting."""
        await self.rate_limiter.acquire()

        async with self.session.get(url, params=params, timeout=aiohttp.ClientTimeout(total=API_TIMEOUT_SECONDS)) as response:
            if response.status == 200:
                return await response.json()
            elif response.status == 429:
                # Rate limited by Mapbox
                retry_after = response.headers.get('Retry-After', '60')
                logger.warning(f"⏳ Mapbox rate limited, waiting {retry_after}s")
                await asyncio.sleep(int(retry_after))
                raise ExternalAPIError(
                    "Mapbox rate limit exceeded",
                    context={"api": "Mapbox", "retry_after": retry_after}
                )
            else:
                error_text = await response.text()
                raise ExternalAPIError(
                    f"Mapbox API error",
                    context={
                        "api": "Mapbox",
                        "status_code": response.status,
                        "error": error_text
                    }
                )

    async def initialize(self) -> bool:
        """Initialize the Mapbox tool"""
        try:
            if not self.mapbox_token:
                logger.info("🗺️ Mapbox tool initialized in mock mode")
                return True

            self.session = aiohttp.ClientSession()

            # Test the API connection
            test_url = f"{self.base_url}/geocoding/v5/mapbox.places/test.json"
            try:
                data = await self._make_api_request(test_url, {"access_token": self.mapbox_token})
                logger.info("✅ Mapbox API connected successfully")
                return True
            except Exception as e:
                logger.warning(f"⚠️ Mapbox API test failed: {e}")
                return False

        except Exception as e:
            logger.error(f"❌ Failed to initialize Mapbox tool: {e}")
            return False
    
    async def execute(self, action: str, parameters: Dict[str, Any]) -> ToolResult:
        """Execute a Mapbox tool action"""
        try:
            if action == "plan_route":
                return await self._plan_route(parameters)
            elif action == "find_campgrounds":
                return await self._find_campgrounds(parameters)
            elif action == "find_fuel_stops":
                return await self._find_fuel_stops(parameters)
            elif action == "check_restrictions":
                return await self._check_route_restrictions(parameters)
            elif action == "find_scenic_routes":
                return await self._find_scenic_routes(parameters)
            else:
                return ToolResult(
                    success=False,
                    error=f"Unknown action: {action}"
                )
                
        except Exception as e:
            logger.error(f"❌ Mapbox tool execution error: {e}")
            return ToolResult(
                success=False,
                error=str(e)
            )
    
    async def _plan_route(self, params: Dict[str, Any]) -> ToolResult:
        """Plan an RV-optimized route

        Raises:
            ValidationError: Invalid route parameters
            ExternalAPIError: Mapbox API request failed
        """
        origin = params.get("origin")
        destination = params.get("destination")
        vehicle_profile = params.get("vehicle_profile", "driving")
        avoid = params.get("avoid", [])  # tolls, highways, ferries

        if not origin or not destination:
            raise ValidationError(
                "Origin and destination required for route planning",
                context={"origin": origin, "destination": destination}
            )
        
        # Mock response if no API key
        if not self.mapbox_token:
            return self._mock_route_response(origin, destination)
        
        try:
            # Convert addresses to coordinates if needed
            origin_coords = await self._geocode(origin) if isinstance(origin, str) else origin
            dest_coords = await self._geocode(destination) if isinstance(destination, str) else destination
            
            # Build Mapbox Directions API URL
            coords = f"{origin_coords[1]},{origin_coords[0]};{dest_coords[1]},{dest_coords[0]}"
            url = f"{self.base_url}/directions/v5/mapbox/{vehicle_profile}/{coords}"

            # Add parameters
            params = {
                "access_token": self.mapbox_token,
                "alternatives": "true",
                "geometries": "geojson",
                "steps": "true",
                "overview": "full"
            }

            if avoid:
                params["exclude"] = ",".join(avoid)

            data = await self._make_api_request(url, params)
            route = data["routes"][0]

            distance_miles = route["distance"] * METERS_TO_MILES
            fuel_gallons = distance_miles / RV_FUEL_EFFICIENCY_MPG
            fuel_cost = fuel_gallons * DEFAULT_FUEL_PRICE_PER_GALLON

            route_info = RouteInfo(
                distance_miles=distance_miles,
                duration_minutes=route["duration"] / 60,
                geometry=route["geometry"]["coordinates"],
                steps=[{
                    "instruction": step["maneuver"]["instruction"],
                    "distance": step["distance"] * METERS_TO_MILES,
                    "duration": step["duration"] / 60
                } for step in route["legs"][0]["steps"]],
                fuel_estimate_gallons=fuel_gallons,
                estimated_cost=fuel_cost
            )

            return ToolResult(
                success=True,
                result={
                    "route": {
                        "distance_miles": route_info.distance_miles,
                        "duration_hours": route_info.duration_minutes / 60,
                        "fuel_gallons": route_info.fuel_estimate_gallons,
                        "estimated_cost": route_info.estimated_cost,
                        "steps": route_info.steps[:ROUTE_STEP_SAMPLE_LIMIT],
                        "geometry": route_info.geometry[::ROUTE_GEOMETRY_SAMPLE_INTERVAL]
                    },
                    "message": f"Route planned: {distance_miles:.1f} miles, "
                              f"{route_info.duration_minutes/60:.1f} hours, "
                              f"~${fuel_cost:.2f} in fuel"
                }
            )

        except ValidationError:
            raise
        except ExternalAPIError:
            raise
        except Exception as e:
            logger.error(
                f"Unexpected route planning error",
                extra={"origin": origin, "destination": destination},
                exc_info=True
            )
            raise ExternalAPIError(
                "Failed to plan route",
                context={"origin": origin, "destination": destination, "error": str(e)}
            )
    
    async def _find_campgrounds(self, params: Dict[str, Any]) -> ToolResult:
        """Find campgrounds near a location

        Raises:
            ValidationError: Invalid location parameter
            ExternalAPIError: Mapbox API request failed
        """
        location = params.get("location")
        radius_miles = params.get("radius_miles", 50)
        rv_only = params.get("rv_only", True)

        if not location:
            raise ValidationError(
                "Location required for campground search",
                context={"location": location}
            )
        
        # Mock response if no API key
        if not self.mapbox_token:
            return self._mock_campground_response(location)
        
        try:
            coords = await self._geocode(location) if isinstance(location, str) else location

            search_terms = ["RV park", "campground", "RV resort"] if rv_only else ["campground", "camping"]
            all_campgrounds = []

            for term in search_terms:
                url = f"{self.base_url}/geocoding/v5/mapbox.places/{term}.json"
                params = {
                    "access_token": self.mapbox_token,
                    "proximity": f"{coords[1]},{coords[0]}",
                    "limit": CAMPGROUND_SEARCH_LIMIT,
                    "types": "poi"
                }

                data = await self._make_api_request(url, params)

                for feature in data["features"]:
                    camp_coords = feature["geometry"]["coordinates"]
                    distance = self._calculate_distance(
                        coords[0], coords[1],
                        camp_coords[1], camp_coords[0]
                    )

                    if distance <= radius_miles:
                        campground = CampgroundInfo(
                            name=feature["place_name"].split(",")[0],
                            location=(camp_coords[1], camp_coords[0]),
                            amenities=self._extract_amenities(feature),
                            rating=None,
                            price_range="$$",
                            rv_friendly=rv_only or "RV" in feature["place_name"],
                            distance_miles=distance
                        )
                        all_campgrounds.append(campground)

            all_campgrounds.sort(key=lambda x: x.distance_miles)

            return ToolResult(
                success=True,
                result={
                    "campgrounds": [{
                        "name": c.name,
                        "distance_miles": round(c.distance_miles, 1),
                        "rv_friendly": c.rv_friendly,
                        "amenities": c.amenities[:CAMPGROUND_AMENITY_PREVIEW_LIMIT],
                        "location": c.location
                    } for c in all_campgrounds[:CAMPGROUND_RESULT_LIMIT]],
                    "total_found": len(all_campgrounds),
                    "message": f"Found {len(all_campgrounds)} campgrounds within {radius_miles} miles"
                }
            )

        except ValidationError:
            raise
        except ExternalAPIError:
            raise
        except Exception as e:
            logger.error(
                f"Unexpected campground search error",
                extra={"location": location},
                exc_info=True
            )
            raise ExternalAPIError(
                "Failed to search campgrounds",
                context={"location": location, "error": str(e)}
            )
    
    async def _find_fuel_stops(self, params: Dict[str, Any]) -> ToolResult:
        """Find fuel stops along a route"""
        route = params.get("route")
        max_distance = params.get("max_distance_miles", 200)
        
        # Mock response for now
        return ToolResult(
            success=True,
            result={
                "fuel_stops": [
                    {
                        "name": "Pilot Travel Center",
                        "location": [34.0522, -118.2437],
                        "distance_from_start": 95,
                        "diesel_price": 4.49,
                        "amenities": ["RV lanes", "Dump station", "Propane"]
                    },
                    {
                        "name": "Love's Travel Stop",
                        "location": [35.0522, -117.2437], 
                        "distance_from_start": 185,
                        "diesel_price": 4.39,
                        "amenities": ["RV parking", "Showers", "Laundry"]
                    }
                ],
                "message": "Found 2 RV-friendly fuel stops along route"
            }
        )
    
    async def _check_route_restrictions(self, params: Dict[str, Any]) -> ToolResult:
        """Check for RV restrictions on route"""
        route = params.get("route")
        vehicle_height = params.get("vehicle_height_ft", 12)
        vehicle_weight = params.get("vehicle_weight_lbs", 20000)
        
        # Mock response for restrictions
        return ToolResult(
            success=True,
            result={
                "restrictions": [
                    {
                        "type": "bridge_height",
                        "location": "Mile 45 - Railroad Bridge",
                        "limit": "13'6\"",
                        "safe": vehicle_height < 13.5,
                        "alternate_route": "Exit 44, use frontage road"
                    }
                ],
                "propane_restrictions": [],
                "weight_restrictions": [],
                "message": f"Route checked for {vehicle_height}ft height, {vehicle_weight}lbs weight"
            }
        )
    
    async def _find_scenic_routes(self, params: Dict[str, Any]) -> ToolResult:
        """Find scenic route alternatives"""
        origin = params.get("origin")
        destination = params.get("destination")
        
        # Mock scenic routes
        return ToolResult(
            success=True,
            result={
                "scenic_routes": [
                    {
                        "name": "Pacific Coast Highway",
                        "distance_miles": 450,
                        "duration_hours": 9,
                        "highlights": ["Ocean views", "Redwood forests", "Coastal towns"],
                        "best_season": "Spring/Summer"
                    },
                    {
                        "name": "Mountain Pass Route",
                        "distance_miles": 380,
                        "duration_hours": 7.5,
                        "highlights": ["Mountain vistas", "Alpine lakes", "Wildlife"],
                        "best_season": "Summer/Fall"
                    }
                ],
                "message": "Found 2 scenic route alternatives"
            }
        )
    
    async def _geocode(self, address: str) -> Tuple[float, float]:
        """Convert address to coordinates

        Raises:
            ValidationError: Invalid address
            ExternalAPIError: Geocoding failed
        """
        if not address or not address.strip():
            raise ValidationError(
                "Address is required for geocoding",
                context={"address": address}
            )

        if not self.mapbox_token:
            # Return mock coordinates
            return (34.0522, -118.2437)  # Los Angeles

        url = f"{self.base_url}/geocoding/v5/mapbox.places/{address}.json"
        params = {
            "access_token": self.mapbox_token,
            "limit": 1
        }

        data = await self._make_api_request(url, params)
        if data["features"]:
            coords = data["features"][0]["geometry"]["coordinates"]
            return (coords[1], coords[0])

        raise ValidationError(
            f"Could not geocode address: {address}",
            context={"address": address}
        )

    def _calculate_distance(self, lat1: float, lon1: float, lat2: float, lon2: float) -> float:
        """Calculate distance between two points in miles using Haversine formula."""
        lat1, lon1, lat2, lon2 = map(radians, [lat1, lon1, lat2, lon2])
        dlat = lat2 - lat1
        dlon = lon2 - lon1

        a = sin(dlat/2)**2 + cos(lat1) * cos(lat2) * sin(dlon/2)**2
        c = 2 * asin(sqrt(a))

        return EARTH_RADIUS_MILES * c
    
    def _extract_amenities(self, feature: Dict) -> List[str]:
        """Extract amenities from Mapbox feature based on category data."""
        amenities = []
        properties = feature.get("properties", {})

        if "category" in properties:
            categories = properties["category"].split(", ")
            for cat in categories:
                if "electric" in cat.lower():
                    amenities.append("Electric hookup")
                if "water" in cat.lower():
                    amenities.append("Water hookup")
                if "sewer" in cat.lower():
                    amenities.append("Sewer hookup")
                if "wifi" in cat.lower():
                    amenities.append("WiFi")

        return amenities if amenities else ["Basic amenities"]
    
    def _mock_route_response(self, origin: str, destination: str) -> ToolResult:
        """Mock route response when no API key"""
        return ToolResult(
            success=True,
            result={
                "route": {
                    "distance_miles": 245.3,
                    "duration_hours": 4.5,
                    "fuel_gallons": 30.6,
                    "estimated_cost": 137.70,
                    "steps": [
                        {"instruction": "Head north on I-5", "distance": 45.2, "duration": 50},
                        {"instruction": "Take exit 152 for CA-152", "distance": 12.3, "duration": 15},
                        {"instruction": "Continue on CA-152", "distance": 78.5, "duration": 85},
                    ],
                    "geometry": [[34.05, -118.25], [34.15, -118.35], [34.25, -118.45]]
                },
                "message": f"Mock route from {origin} to {destination}: 245.3 miles, 4.5 hours"
            }
        )
    
    def _mock_campground_response(self, location: str) -> ToolResult:
        """Mock campground response when no API key"""
        return ToolResult(
            success=True,
            result={
                "campgrounds": [
                    {
                        "name": "Pine Ridge RV Resort",
                        "distance_miles": 12.5,
                        "rv_friendly": True,
                        "amenities": ["Full hookups", "Pool", "WiFi"],
                        "location": [34.15, -118.35]
                    },
                    {
                        "name": "Lakeside Campground",
                        "distance_miles": 18.3,
                        "rv_friendly": True,
                        "amenities": ["Electric", "Water", "Dump station"],
                        "location": [34.22, -118.41]
                    },
                    {
                        "name": "Mountain View RV Park",
                        "distance_miles": 25.7,
                        "rv_friendly": True,
                        "amenities": ["Full hookups", "Laundry", "Store"],
                        "location": [34.31, -118.52]
                    }
                ],
                "total_found": 3,
                "message": f"Mock campgrounds near {location}"
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
                        "enum": ["plan_route", "find_campgrounds", "find_fuel_stops", 
                                "check_restrictions", "find_scenic_routes"],
                        "description": "The navigation action to perform"
                    },
                    "parameters": {
                        "type": "object",
                        "description": "Action-specific parameters"
                    }
                },
                "required": ["action", "parameters"]
            }
        }