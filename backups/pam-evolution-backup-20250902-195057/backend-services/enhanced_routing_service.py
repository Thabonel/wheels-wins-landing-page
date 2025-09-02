"""
Enhanced Routing Service - Implements all routing types with specific Mapbox profiles and parameters
"""

import os
import httpx
from typing import Dict, List, Tuple, Optional, Any
from enum import Enum
from datetime import datetime
import uuid

from app.models.domain.wheels import RouteType, ManualWaypoint, Location
from app.core.logging import get_logger

logger = get_logger(__name__)


class MapboxProfile(str, Enum):
    """Mapbox routing profiles"""
    DRIVING = "driving"
    DRIVING_TRAFFIC = "driving-traffic"
    CYCLING = "cycling"
    WALKING = "walking"


class EnhancedRoutingService:
    """Enhanced routing service with support for all routing types and manual waypoints"""
    
    def __init__(self):
        self.mapbox_token = os.getenv("MAPBOX_API_KEY") or os.getenv("MAPBOX_TOKEN")
        if not self.mapbox_token:
            raise RuntimeError("Mapbox token not configured")
    
    def get_routing_config(self, route_type: RouteType) -> Dict[str, Any]:
        """Get Mapbox profile and parameters for each route type"""
        configs = {
            RouteType.FASTEST: {
                "profile": MapboxProfile.DRIVING_TRAFFIC,
                "params": {
                    "alternatives": "false",
                    "continue_straight": "false",
                    "optimize": "time",
                    "avoid": "",
                    "exclude": ""
                },
                "description": "Fastest route using traffic data, prioritizes highways"
            },
            
            RouteType.SHORTEST: {
                "profile": MapboxProfile.DRIVING,
                "params": {
                    "alternatives": "false",
                    "continue_straight": "false", 
                    "optimize": "distance",
                    "avoid": "",
                    "exclude": ""
                },
                "description": "Shortest distance route, may use smaller roads"
            },
            
            RouteType.SCENIC: {
                "profile": MapboxProfile.DRIVING,
                "params": {
                    "alternatives": "true",
                    "continue_straight": "false",
                    "optimize": "time",
                    "avoid": "motorway",
                    "exclude": "toll"
                },
                "description": "Scenic route avoiding highways, through beautiful landscapes"
            },
            
            RouteType.OFF_GRID: {
                "profile": MapboxProfile.DRIVING,
                "params": {
                    "alternatives": "true",
                    "continue_straight": "false",
                    "optimize": "distance",
                    "avoid": "motorway,trunk",
                    "exclude": "toll,ferry"
                },
                "description": "Off-grid route using secondary roads, avoiding populated areas"
            },
            
            RouteType.LUXURY: {
                "profile": MapboxProfile.DRIVING,
                "params": {
                    "alternatives": "false",
                    "continue_straight": "false",
                    "optimize": "time",
                    "avoid": "",
                    "exclude": ""
                },
                "description": "Premium route through scenic tourist areas with luxury amenities"
            },
            
            RouteType.MANUAL: {
                "profile": MapboxProfile.DRIVING,
                "params": {
                    "alternatives": "false",
                    "continue_straight": "true",  # Force route through waypoints
                    "optimize": "time",
                    "avoid": "",
                    "exclude": ""
                },
                "description": "Manual route with locked waypoints - route must pass through all clicks"
            }
        }
        
        return configs.get(route_type, configs[RouteType.FASTEST])
    
    async def build_route(
        self,
        origin: Tuple[float, float],
        destination: Tuple[float, float],
        route_type: RouteType,
        waypoints: Optional[List[Tuple[float, float]]] = None,
        manual_waypoints: Optional[List[ManualWaypoint]] = None
    ) -> Dict[str, Any]:
        """Build a route with the specified routing type"""
        
        try:
            # Get routing configuration
            config = self.get_routing_config(route_type)
            
            # Prepare coordinates
            coords = [origin]
            
            # Add manual waypoints in order (for Manual routing)
            if manual_waypoints and route_type == RouteType.MANUAL:
                sorted_waypoints = sorted(manual_waypoints, key=lambda w: w.order)
                for waypoint in sorted_waypoints:
                    coords.append((waypoint.latitude, waypoint.longitude))
            
            # Add regular waypoints
            if waypoints:
                coords.extend(waypoints)
            
            # Add destination
            coords.append(destination)
            
            # Build coordinate string for Mapbox API
            coord_str = ";".join(f"{lon},{lat}" for lat, lon in coords)
            
            # Prepare API parameters
            params = {
                "access_token": self.mapbox_token,
                "geometries": "geojson",
                "overview": "full",
                "steps": "true",  # Include turn-by-turn directions
                "voice_instructions": "true",
                "banner_instructions": "true",
                **config["params"]
            }
            
            # Remove empty parameters
            params = {k: v for k, v in params.items() if v != ""}
            
            # Make API request
            async with httpx.AsyncClient(timeout=30) as client:
                url = f"https://api.mapbox.com/directions/v5/mapbox/{config['profile']}/{coord_str}"
                
                logger.info(f"🗺️ Building {route_type} route: {url}")
                logger.debug(f"Parameters: {params}")
                
                response = await client.get(url, params=params)
                response.raise_for_status()
                
                route_data = response.json()
                
                # Enhance with route type specific data
                if route_data.get("routes"):
                    route_data["route_type"] = route_type
                    route_data["route_config"] = config
                    
                    # Add manual waypoints info for frontend
                    if manual_waypoints:
                        route_data["manual_waypoints"] = [
                            {
                                "id": wp.id,
                                "latitude": wp.latitude,
                                "longitude": wp.longitude,
                                "order": wp.order,
                                "is_locked": wp.is_locked
                            }
                            for wp in manual_waypoints
                        ]
                
                logger.info(f"✅ Successfully built {route_type} route")
                return route_data
                
        except Exception as e:
            logger.error(f"❌ Error building route: {e}")
            raise
    
    async def add_manual_waypoint(
        self,
        latitude: float,
        longitude: float,
        order: int,
        existing_waypoints: List[ManualWaypoint]
    ) -> ManualWaypoint:
        """Add a new manual waypoint from user click"""
        
        waypoint = ManualWaypoint(
            id=str(uuid.uuid4()),
            latitude=latitude,
            longitude=longitude,
            order=order,
            is_locked=True,
            created_at=datetime.utcnow()
        )
        
        logger.info(f"📍 Added manual waypoint at {latitude}, {longitude} (order: {order})")
        return waypoint
    
    async def remove_manual_waypoint(
        self,
        waypoint_id: str,
        existing_waypoints: List[ManualWaypoint]
    ) -> List[ManualWaypoint]:
        """Remove a manual waypoint"""
        
        updated_waypoints = [wp for wp in existing_waypoints if wp.id != waypoint_id]
        
        # Reorder remaining waypoints
        for i, waypoint in enumerate(sorted(updated_waypoints, key=lambda w: w.order)):
            waypoint.order = i
        
        logger.info(f"🗑️ Removed manual waypoint {waypoint_id}")
        return updated_waypoints
    
    def get_poi_filters(self, route_type: RouteType) -> Dict[str, Any]:
        """Get POI filters based on route type"""
        
        filters = {
            RouteType.LUXURY: {
                "min_rating": 4.0,
                "required_amenities": ["wifi", "pool", "full_hookups", "laundry"],
                "price_range": "premium",
                "exclude_types": ["boondocking", "basic_campground"]
            },
            
            RouteType.OFF_GRID: {
                "min_rating": 3.0,
                "required_amenities": [],
                "price_range": "free_to_low",
                "prefer_types": ["boondocking", "wilderness", "national_park"],
                "exclude_types": ["luxury_resort", "rv_park"]
            },
            
            RouteType.SCENIC: {
                "min_rating": 3.5,
                "required_amenities": ["restrooms", "potable_water"],
                "prefer_types": ["scenic_overlook", "national_park", "state_park"],
                "exclude_types": ["urban_campground"]
            },
            
            RouteType.FASTEST: {
                "min_rating": 3.0,
                "required_amenities": ["fuel", "restrooms"],
                "prefer_types": ["highway_rest_stop", "truck_stop", "chain_campground"],
                "max_detour_miles": 5
            },
            
            RouteType.SHORTEST: {
                "min_rating": 2.5,
                "required_amenities": ["restrooms"],
                "max_detour_miles": 2
            },
            
            RouteType.MANUAL: {
                "min_rating": 2.0,
                "required_amenities": [],
                "note": "User controls route - suggest POIs near manual waypoints"
            }
        }
        
        return filters.get(route_type, {"min_rating": 3.0})
    
    async def geocode_location(self, place_name: str) -> Tuple[float, float]:
        """Geocode a location using Mapbox"""
        
        async with httpx.AsyncClient(timeout=15) as client:
            response = await client.get(
                f"https://api.mapbox.com/geocoding/v5/mapbox.places/{place_name}.json",
                params={
                    "access_token": self.mapbox_token,
                    "limit": 1,
                    "country": "AU"  # Focus on Australia
                }
            )
            response.raise_for_status()
            
            data = response.json()
            if data.get("features"):
                lon, lat = data["features"][0]["center"]
                return lat, lon
            else:
                raise ValueError(f"Could not geocode location: {place_name}")


# Create singleton instance
enhanced_routing_service = EnhancedRoutingService()