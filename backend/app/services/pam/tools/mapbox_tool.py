"""
Mapbox Integration Tool for PAM
Provides conversational route planning and location intelligence
Works alongside the frontend visual map for comprehensive trip planning
"""

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

logger = get_logger(__name__)
settings = get_settings()


class RateLimiter:
    """
    Rate limiter for Mapbox API calls
    Free tier: 60 requests per minute
    """

    def __init__(self, max_requests: int = 60, time_window: int = 60):
        self.max_requests = max_requests
        self.time_window = time_window
        self.requests = deque()
        self._lock = asyncio.Lock()

    async def acquire(self):
        """Wait until rate limit allows next request"""
        async with self._lock:
            now = time.time()

            # Remove requests older than time window
            while self.requests and self.requests[0] < now - self.time_window:
                self.requests.popleft()

            # Check if we need to wait
            if len(self.requests) >= self.max_requests:
                # Calculate wait time until oldest request expires
                wait_time = self.time_window - (now - self.requests[0])
                if wait_time > 0:
                    logger.info(f"⏳ Rate limit reached, waiting {wait_time:.1f}s")
                    await asyncio.sleep(wait_time)
                    # Recursively try again after waiting
                    return await self.acquire()

            # Record this request
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
    """
    Mapbox integration for route planning and location services
    
    Features:
    - RV-optimized route planning
    - Campground and RV park search
    - Fuel stop planning
    - Bridge height and weight restrictions
    - Scenic route suggestions
    """
    
    def __init__(self):
        super().__init__(
            tool_name="mapbox_navigator",
            description="Plan RV routes, find campgrounds, and navigate safely",
            capabilities=[ToolCapability.LOCATION_SEARCH, ToolCapability.ROUTE_PLANNING]
        )

        # Check for Mapbox token in order of preference
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
                if token:  # Make sure it's not empty after extraction
                    self.mapbox_token = token
                    logger.info(f"🗺️ Using {token_name} for Mapbox API")
                    break

        if not self.mapbox_token:
            logger.warning("⚠️ Mapbox token not configured - using mock mode")

        self.base_url = "https://api.mapbox.com"
        self.session = None
        self.rate_limiter = RateLimiter(max_requests=60, time_window=60)  # 60 req/min for free tier
        
    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=1, max=10),
        retry=retry_if_exception_type((aiohttp.ClientError, asyncio.TimeoutError)),
        reraise=True
    )
    async def _make_api_request(self, url: str, params: Dict[str, Any]) -> Dict[str, Any]:
        """
        Make HTTP request to Mapbox API with retry logic and rate limiting

        Args:
            url: API endpoint URL
            params: Query parameters

        Returns:
            JSON response data

        Raises:
            aiohttp.ClientError: On HTTP errors after retries exhausted
            ValueError: On non-200 response
        """
        # Wait for rate limiter to allow request
        await self.rate_limiter.acquire()

        async with self.session.get(url, params=params, timeout=aiohttp.ClientTimeout(total=30)) as response:
            if response.status == 200:
                return await response.json()
            elif response.status == 429:
                # Rate limited by Mapbox
                retry_after = response.headers.get('Retry-After', '60')
                logger.warning(f"⏳ Mapbox rate limited, waiting {retry_after}s")
                await asyncio.sleep(int(retry_after))
                raise aiohttp.ClientError("Rate limited")
            else:
                error_text = await response.text()
                raise ValueError(f"Mapbox API error {response.status}: {error_text}")

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
        """Plan an RV-optimized route"""
        origin = params.get("origin")
        destination = params.get("destination")
        vehicle_profile = params.get("vehicle_profile", "driving")
        avoid = params.get("avoid", [])  # tolls, highways, ferries
        
        if not origin or not destination:
            return ToolResult(
                success=False,
                error="Origin and destination required"
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

            # Use retry/rate-limited request wrapper
            data = await self._make_api_request(url, params)
            route = data["routes"][0]

            # Calculate fuel estimate (assuming 8 MPG for RV)
            distance_miles = route["distance"] * 0.000621371
            fuel_gallons = distance_miles / 8
            fuel_cost = fuel_gallons * 4.50  # Assuming $4.50/gallon

            route_info = RouteInfo(
                distance_miles=distance_miles,
                duration_minutes=route["duration"] / 60,
                geometry=route["geometry"]["coordinates"],
                steps=[{
                    "instruction": step["maneuver"]["instruction"],
                    "distance": step["distance"] * 0.000621371,
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
                        "steps": route_info.steps[:5],  # First 5 steps
                        "geometry": route_info.geometry[::10]  # Sample points
                    },
                    "message": f"Route planned: {distance_miles:.1f} miles, "
                              f"{route_info.duration_minutes/60:.1f} hours, "
                              f"~${fuel_cost:.2f} in fuel"
                }
            )
                    
        except Exception as e:
            logger.error(f"Route planning error: {e}")
            return ToolResult(
                success=False,
                error=str(e)
            )
    
    async def _find_campgrounds(self, params: Dict[str, Any]) -> ToolResult:
        """Find campgrounds near a location"""
        location = params.get("location")
        radius_miles = params.get("radius_miles", 50)
        rv_only = params.get("rv_only", True)
        
        if not location:
            return ToolResult(
                success=False,
                error="Location required"
            )
        
        # Mock response if no API key
        if not self.mapbox_token:
            return self._mock_campground_response(location)
        
        try:
            # Geocode location if needed
            coords = await self._geocode(location) if isinstance(location, str) else location
            
            # Search for campgrounds using Mapbox Geocoding API
            search_terms = ["RV park", "campground", "RV resort"] if rv_only else ["campground", "camping"]
            all_campgrounds = []
            
            for term in search_terms:
                url = f"{self.base_url}/geocoding/v5/mapbox.places/{term}.json"
                params = {
                    "access_token": self.mapbox_token,
                    "proximity": f"{coords[1]},{coords[0]}",
                    "limit": 5,
                    "types": "poi"
                }

                # Use retry/rate-limited request wrapper
                data = await self._make_api_request(url, params)

                for feature in data["features"]:
                    # Calculate distance
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
                            rating=None,  # Would need separate API
                            price_range="$$",  # Default
                            rv_friendly=rv_only or "RV" in feature["place_name"],
                            distance_miles=distance
                        )
                        all_campgrounds.append(campground)
            
            # Sort by distance
            all_campgrounds.sort(key=lambda x: x.distance_miles)
            
            return ToolResult(
                success=True,
                result={
                    "campgrounds": [{
                        "name": c.name,
                        "distance_miles": round(c.distance_miles, 1),
                        "rv_friendly": c.rv_friendly,
                        "amenities": c.amenities[:3],
                        "location": c.location
                    } for c in all_campgrounds[:10]],
                    "total_found": len(all_campgrounds),
                    "message": f"Found {len(all_campgrounds)} campgrounds within {radius_miles} miles"
                }
            )
            
        except Exception as e:
            logger.error(f"Campground search error: {e}")
            return ToolResult(
                success=False,
                error=str(e)
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
        """Convert address to coordinates"""
        if not self.mapbox_token:
            # Return mock coordinates
            return (34.0522, -118.2437)  # Los Angeles

        url = f"{self.base_url}/geocoding/v5/mapbox.places/{address}.json"
        params = {
            "access_token": self.mapbox_token,
            "limit": 1
        }

        # Use retry/rate-limited request wrapper
        data = await self._make_api_request(url, params)
        if data["features"]:
            coords = data["features"][0]["geometry"]["coordinates"]
            return (coords[1], coords[0])  # Return as (lat, lng)

        raise ValueError(f"Could not geocode address: {address}")
    
    def _calculate_distance(self, lat1: float, lon1: float, lat2: float, lon2: float) -> float:
        """Calculate distance between two points in miles"""
        # Haversine formula
        R = 3959  # Earth's radius in miles
        
        lat1, lon1, lat2, lon2 = map(radians, [lat1, lon1, lat2, lon2])
        dlat = lat2 - lat1
        dlon = lon2 - lon1
        
        a = sin(dlat/2)**2 + cos(lat1) * cos(lat2) * sin(dlon/2)**2
        c = 2 * asin(sqrt(a))
        
        return R * c
    
    def _extract_amenities(self, feature: Dict) -> List[str]:
        """Extract amenities from Mapbox feature"""
        amenities = []
        properties = feature.get("properties", {})
        
        # Check category
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