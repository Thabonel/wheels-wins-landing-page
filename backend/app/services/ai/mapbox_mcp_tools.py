"""
Mapbox MCP Tools for PAM - Native Claude Integration
Provides location intelligence directly to Claude 3.5 Sonnet through tool calling
Based on successful UnimogCommunityHub Barry AI implementation
"""

import aiohttp
import json
import logging
from typing import Dict, List, Any, Optional, Union
from dataclasses import dataclass
from urllib.parse import quote_plus

from app.core.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()


@dataclass
class MapboxToolResult:
    """Result from a Mapbox tool execution"""
    success: bool
    data: Optional[Dict[str, Any]] = None
    error: Optional[str] = None
    tool_used: Optional[str] = None


class MapboxMCPTools:
    """
    Mapbox MCP Tools for PAM AI Assistant
    
    Provides Claude 3.5 Sonnet with native access to:
    - Geocoding (address ↔ coordinate conversion)  
    - POI Search (find RV parks, mechanics, fuel stations)
    - Directions (RV-optimized routing with traffic)
    - Static Maps (visual route/location images)
    """
    
    def __init__(self):
        # Try multiple token sources (public token for API calls, secret for advanced features)
        self.mapbox_token = (
            getattr(settings, 'MAPBOX_SECRET_TOKEN', None) or
            getattr(settings, 'VITE_MAPBOX_PUBLIC_TOKEN', None) or 
            getattr(settings, 'VITE_MAPBOX_TOKEN', None)
        )
        
        # Handle SecretStr type
        if hasattr(self.mapbox_token, 'get_secret_value'):
            self.mapbox_token = self.mapbox_token.get_secret_value()
        
        if not self.mapbox_token:
            logger.warning("⚠️ Mapbox token not configured - Mapbox MCP tools will be disabled")
        
        # Mapbox API endpoints
        self.geocoding_url = 'https://api.mapbox.com/geocoding/v5/mapbox.places'
        self.directions_url = 'https://api.mapbox.com/directions/v5/mapbox'
        self.static_url = 'https://api.mapbox.com/styles/v1/mapbox/streets-v11/static'
    
    def get_tool_definitions(self) -> List[Dict[str, Any]]:
        """Get Claude-compatible tool definitions for native MCP integration"""
        if not self.mapbox_token:
            return []
        
        return [
            {
                "name": "mapbox_geocoding",
                "description": "Convert addresses to coordinates or vice versa. Essential for trip planning and location queries.",
                "input_schema": {
                    "type": "object",
                    "properties": {
                        "query": {
                            "type": "string",
                            "description": "Address, place name, or location to geocode (e.g., 'Yellowstone National Park', '123 Main St, Denver CO')"
                        },
                        "longitude": {
                            "type": "number",
                            "description": "Longitude for reverse geocoding (coordinates to address)"
                        },
                        "latitude": {
                            "type": "number", 
                            "description": "Latitude for reverse geocoding (coordinates to address)"
                        },
                        "limit": {
                            "type": "number",
                            "description": "Maximum number of results (default: 5)",
                            "default": 5
                        }
                    },
                    "oneOf": [
                        {"required": ["query"]},
                        {"required": ["longitude", "latitude"]}
                    ]
                }
            },
            {
                "name": "mapbox_search_poi",
                "description": "Search for points of interest like RV parks, mechanics, fuel stations, attractions near locations.",
                "input_schema": {
                    "type": "object",
                    "properties": {
                        "query": {
                            "type": "string",
                            "description": "Search term (e.g., 'RV park', 'truck stop', 'mechanic', 'campground', 'diesel fuel')"
                        },
                        "longitude": {
                            "type": "number",
                            "description": "Center longitude for proximity search"
                        },
                        "latitude": {
                            "type": "number",
                            "description": "Center latitude for proximity search"
                        },
                        "radius": {
                            "type": "number",
                            "description": "Search radius in meters (default: 50000 = 50km)",
                            "default": 50000
                        },
                        "limit": {
                            "type": "number",
                            "description": "Maximum results (default: 10)",
                            "default": 10
                        }
                    },
                    "required": ["query", "longitude", "latitude"]
                }
            },
            {
                "name": "mapbox_directions", 
                "description": "Get turn-by-turn directions and route information. Supports RV-appropriate routing.",
                "input_schema": {
                    "type": "object",
                    "properties": {
                        "origin": {
                            "type": "string",
                            "description": "Starting location (address or coordinates as 'lng,lat')"
                        },
                        "destination": {
                            "type": "string", 
                            "description": "Ending location (address or coordinates as 'lng,lat')"
                        },
                        "profile": {
                            "type": "string",
                            "enum": ["driving", "driving-traffic", "walking", "cycling"],
                            "description": "Routing profile (default: driving-traffic for real-time)",
                            "default": "driving-traffic"
                        },
                        "alternatives": {
                            "type": "boolean",
                            "description": "Include alternative routes (default: true)",
                            "default": true
                        },
                        "waypoints": {
                            "type": "array",
                            "items": {"type": "string"},
                            "description": "Optional intermediate stops"
                        }
                    },
                    "required": ["origin", "destination"]
                }
            },
            {
                "name": "mapbox_static_map",
                "description": "Generate visual map images showing locations, routes, or areas of interest.",
                "input_schema": {
                    "type": "object", 
                    "properties": {
                        "longitude": {
                            "type": "number",
                            "description": "Map center longitude"
                        },
                        "latitude": {
                            "type": "number",
                            "description": "Map center latitude"  
                        },
                        "zoom": {
                            "type": "number",
                            "description": "Zoom level 1-22 (default: 12)",
                            "minimum": 1,
                            "maximum": 22,
                            "default": 12
                        },
                        "width": {
                            "type": "number",
                            "description": "Image width in pixels (default: 600)",
                            "default": 600
                        },
                        "height": {
                            "type": "number",
                            "description": "Image height in pixels (default: 400)",
                            "default": 400
                        },
                        "markers": {
                            "type": "array",
                            "items": {
                                "type": "object",
                                "properties": {
                                    "longitude": {"type": "number"},
                                    "latitude": {"type": "number"}, 
                                    "color": {"type": "string", "default": "red"},
                                    "size": {"type": "string", "enum": ["small", "medium", "large"], "default": "medium"},
                                    "label": {"type": "string", "description": "Optional marker label"}
                                },
                                "required": ["longitude", "latitude"]
                            },
                            "description": "Markers to display on the map"
                        }
                    },
                    "required": ["longitude", "latitude"]
                }
            }
        ]
    
    async def execute_tool(self, tool_name: str, parameters: Dict[str, Any]) -> MapboxToolResult:
        """Execute a Mapbox tool and return structured result"""
        if not self.mapbox_token:
            return MapboxToolResult(
                success=False,
                error="Mapbox access token not configured",
                tool_used=tool_name
            )
        
        try:
            if tool_name == "mapbox_geocoding":
                return await self._geocoding(parameters)
            elif tool_name == "mapbox_search_poi":
                return await self._search_poi(parameters)
            elif tool_name == "mapbox_directions":
                return await self._directions(parameters)
            elif tool_name == "mapbox_static_map":
                return await self._static_map(parameters)
            else:
                return MapboxToolResult(
                    success=False,
                    error=f"Unknown tool: {tool_name}",
                    tool_used=tool_name
                )
        
        except Exception as e:
            logger.error(f"❌ Mapbox tool {tool_name} failed: {e}")
            return MapboxToolResult(
                success=False,
                error=str(e),
                tool_used=tool_name
            )
    
    async def _geocoding(self, params: Dict[str, Any]) -> MapboxToolResult:
        """Handle geocoding requests (address ↔ coordinates)"""
        async with aiohttp.ClientSession() as session:
            if 'query' in params:
                # Forward geocoding (address to coordinates)
                query = quote_plus(params['query'])
                limit = params.get('limit', 5)
                url = f"{self.geocoding_url}/{query}.json"
                
                async with session.get(url, params={
                    'access_token': self.mapbox_token,
                    'limit': limit,
                    'types': 'place,postcode,address,poi'
                }) as response:
                    if response.status == 200:
                        data = await response.json()
                        return MapboxToolResult(
                            success=True,
                            data={
                                'type': 'forward_geocoding',
                                'query': params['query'],
                                'features': data.get('features', []),
                                'count': len(data.get('features', []))
                            },
                            tool_used="mapbox_geocoding"
                        )
                    else:
                        error_text = await response.text()
                        return MapboxToolResult(
                            success=False,
                            error=f"Geocoding failed: {response.status} {error_text}",
                            tool_used="mapbox_geocoding"
                        )
            
            elif 'longitude' in params and 'latitude' in params:
                # Reverse geocoding (coordinates to address)
                lng, lat = params['longitude'], params['latitude'] 
                url = f"{self.geocoding_url}/{lng},{lat}.json"
                
                async with session.get(url, params={
                    'access_token': self.mapbox_token,
                    'types': 'place,postcode,address,poi'
                }) as response:
                    if response.status == 200:
                        data = await response.json()
                        return MapboxToolResult(
                            success=True,
                            data={
                                'type': 'reverse_geocoding',
                                'coordinates': [lng, lat],
                                'features': data.get('features', []),
                                'count': len(data.get('features', []))
                            },
                            tool_used="mapbox_geocoding"
                        )
                    else:
                        error_text = await response.text()
                        return MapboxToolResult(
                            success=False,
                            error=f"Reverse geocoding failed: {response.status} {error_text}",
                            tool_used="mapbox_geocoding"
                        )
            
            else:
                return MapboxToolResult(
                    success=False,
                    error="Either 'query' or 'longitude'+'latitude' required",
                    tool_used="mapbox_geocoding"
                )
    
    async def _search_poi(self, params: Dict[str, Any]) -> MapboxToolResult:
        """Search for points of interest near a location"""
        async with aiohttp.ClientSession() as session:
            query = quote_plus(params['query'])
            lng, lat = params['longitude'], params['latitude']
            radius = params.get('radius', 50000)  # 50km default
            limit = params.get('limit', 10)
            
            # Create bounding box from center point and radius
            # Rough conversion: 1 degree ≈ 111km
            degree_radius = radius / 111000
            bbox = f"{lng - degree_radius},{lat - degree_radius},{lng + degree_radius},{lat + degree_radius}"
            
            url = f"{self.geocoding_url}/{query}.json"
            
            async with session.get(url, params={
                'access_token': self.mapbox_token,
                'proximity': f"{lng},{lat}",
                'bbox': bbox,
                'limit': limit,
                'types': 'poi,place,address'
            }) as response:
                if response.status == 200:
                    data = await response.json()
                    return MapboxToolResult(
                        success=True,
                        data={
                            'type': 'poi_search',
                            'query': params['query'],
                            'center': [lng, lat],
                            'radius_meters': radius,
                            'features': data.get('features', []),
                            'count': len(data.get('features', []))
                        },
                        tool_used="mapbox_search_poi"
                    )
                else:
                    error_text = await response.text()
                    return MapboxToolResult(
                        success=False,
                        error=f"POI search failed: {response.status} {error_text}",
                        tool_used="mapbox_search_poi"
                    )
    
    async def _directions(self, params: Dict[str, Any]) -> MapboxToolResult:
        """Get turn-by-turn directions between locations"""
        async with aiohttp.ClientSession() as session:
            profile = params.get('profile', 'driving-traffic')
            alternatives = params.get('alternatives', True)
            
            # Build coordinates string
            coords = f"{params['origin']};{params['destination']}"
            if 'waypoints' in params and params['waypoints']:
                waypoints = ';'.join(params['waypoints'])
                coords = f"{params['origin']};{waypoints};{params['destination']}"
            
            url = f"{self.directions_url}/{profile}/{coords}"
            
            async with session.get(url, params={
                'access_token': self.mapbox_token,
                'alternatives': str(alternatives).lower(),
                'geometries': 'geojson',
                'steps': 'true',
                'overview': 'full'
            }) as response:
                if response.status == 200:
                    data = await response.json()
                    return MapboxToolResult(
                        success=True,
                        data={
                            'type': 'directions',
                            'origin': params['origin'],
                            'destination': params['destination'],
                            'profile': profile,
                            'routes': data.get('routes', []),
                            'waypoints': data.get('waypoints', [])
                        },
                        tool_used="mapbox_directions"
                    )
                else:
                    error_text = await response.text()
                    return MapboxToolResult(
                        success=False,
                        error=f"Directions failed: {response.status} {error_text}",
                        tool_used="mapbox_directions"
                    )
    
    async def _static_map(self, params: Dict[str, Any]) -> MapboxToolResult:
        """Generate static map image URL"""
        lng, lat = params['longitude'], params['latitude']
        zoom = params.get('zoom', 12)
        width = params.get('width', 600)  
        height = params.get('height', 400)
        
        # Build map URL
        map_url = f"{self.static_url}/{lng},{lat},{zoom}/{width}x{height}"
        
        # Add markers if provided
        if 'markers' in params and params['markers']:
            marker_strs = []
            for marker in params['markers']:
                m_lng, m_lat = marker['longitude'], marker['latitude']
                color = marker.get('color', 'red')
                size = marker.get('size', 'medium')
                
                marker_str = f"pin-{size[0]}-{color}({m_lng},{m_lat})"
                if 'label' in marker:
                    marker_str = f"pin-{size[0]}-{color}+{marker['label']}({m_lng},{m_lat})"
                
                marker_strs.append(marker_str)
            
            if marker_strs:
                markers_param = ','.join(marker_strs)
                map_url += f"/{markers_param}"
        
        # Add access token
        map_url += f"?access_token={self.mapbox_token}"
        
        return MapboxToolResult(
            success=True,
            data={
                'type': 'static_map',
                'center': [lng, lat],
                'zoom': zoom,
                'dimensions': [width, height],
                'map_url': map_url,
                'marker_count': len(params.get('markers', []))
            },
            tool_used="mapbox_static_map"
        )


# Global instance for PAM integration
mapbox_mcp_tools = MapboxMCPTools()