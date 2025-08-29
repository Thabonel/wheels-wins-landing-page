"""
Proactive Discovery Service
Continuously scans route ahead for interesting stops and opportunities using existing infrastructure
"""

import asyncio
import json
import time
from typing import Dict, List, Any, Optional, Tuple
from datetime import datetime, timedelta
from dataclasses import dataclass, asdict
import math

from app.core.config import get_settings
from app.core.logging import get_logger
# Lazy imports to avoid circular dependencies

logger = get_logger(__name__)
settings = get_settings()

@dataclass
class ProactiveDiscovery:
    """A proactive discovery/suggestion"""
    id: str
    message: str
    location: Dict[str, Any]
    discovery_type: str  # poi, fuel, weather, traffic, scenic, food, camping
    priority: str = "normal"  # low, normal, high, urgent
    estimated_arrival: Optional[datetime] = None
    distance_miles: Optional[float] = None
    user_relevance_score: float = 0.5
    expires_at: Optional[datetime] = None
    metadata: Dict[str, Any] = None
    
    def __post_init__(self):
        if self.metadata is None:
            self.metadata = {}

@dataclass
class RouteContext:
    """Current route and travel context"""
    user_id: str
    current_location: Dict[str, Any]
    destination: Optional[Dict[str, Any]] = None
    route_coordinates: List[Tuple[float, float]] = None
    current_speed_mph: float = 0.0
    estimated_arrival: Optional[datetime] = None
    driving_status: str = "driving"  # driving, parked, passenger
    
    def __post_init__(self):
        if self.route_coordinates is None:
            self.route_coordinates = []

class ProactiveDiscoveryService:
    """Manages proactive discovery and suggestions for voice conversations"""
    
    def __init__(self):
        self.active_routes: Dict[str, RouteContext] = {}
        self.pending_discoveries: Dict[str, List[ProactiveDiscovery]] = {}
        self.delivered_discoveries: Dict[str, List[str]] = {}  # Track what we've already mentioned
        self.scan_interval = 30  # seconds
        self.max_discovery_distance = 50  # miles
        self.is_running = False
    
    async def initialize(self):
        """Initialize the proactive discovery service"""
        try:
            logger.info("🔍 Initializing Proactive Discovery Service...")
            
            # Start background scanning
            self.is_running = True
            asyncio.create_task(self._continuous_route_scanning())
            
            logger.info("✅ Proactive Discovery Service initialized")
            return True
            
        except Exception as e:
            logger.error(f"❌ Failed to initialize Proactive Discovery Service: {e}")
            return False
    
    async def start_route_monitoring(
        self,
        user_id: str,
        current_location: Dict[str, Any],
        destination: Optional[Dict[str, Any]] = None,
        route_coordinates: Optional[List[Tuple[float, float]]] = None
    ) -> str:
        """Start monitoring a route for proactive discoveries"""
        try:
            route_id = f"route_{user_id}_{int(time.time())}"
            
            route_context = RouteContext(
                user_id=user_id,
                current_location=current_location,
                destination=destination,
                route_coordinates=route_coordinates or []
            )
            
            self.active_routes[route_id] = route_context
            self.pending_discoveries[route_id] = []
            self.delivered_discoveries[route_id] = []
            
            # Perform initial scan
            await self._scan_route_for_discoveries(route_id)
            
            logger.info(f"🔍 Started route monitoring for user {user_id}: {route_id}")
            return route_id
            
        except Exception as e:
            logger.error(f"❌ Failed to start route monitoring: {e}")
            raise
    
    async def update_location(
        self,
        route_id: str,
        current_location: Dict[str, Any],
        speed_mph: Optional[float] = None
    ):
        """Update current location and trigger discoveries"""
        route_context = self.active_routes.get(route_id)
        if not route_context:
            return
        
        route_context.current_location = current_location
        if speed_mph is not None:
            route_context.current_speed_mph = speed_mph
        
        # Check if we need to rescan
        await self._scan_route_for_discoveries(route_id)
    
    async def get_pending_discoveries(
        self,
        route_id: str,
        max_count: int = 3,
        min_priority: str = "normal"
    ) -> List[ProactiveDiscovery]:
        """Get pending discoveries for a route"""
        discoveries = self.pending_discoveries.get(route_id, [])
        
        # Filter by priority
        priority_order = {"low": 0, "normal": 1, "high": 2, "urgent": 3}
        min_level = priority_order.get(min_priority, 1)
        
        filtered = [
            d for d in discoveries 
            if priority_order.get(d.priority, 1) >= min_level
        ]
        
        # Sort by priority and relevance
        filtered.sort(key=lambda x: (
            -priority_order.get(x.priority, 1),
            -x.user_relevance_score,
            x.distance_miles or 999
        ))
        
        return filtered[:max_count]
    
    async def mark_discovery_delivered(self, route_id: str, discovery_id: str):
        """Mark a discovery as delivered to avoid repeating it"""
        if route_id in self.delivered_discoveries:
            self.delivered_discoveries[route_id].append(discovery_id)
        
        # Remove from pending
        if route_id in self.pending_discoveries:
            self.pending_discoveries[route_id] = [
                d for d in self.pending_discoveries[route_id] 
                if d.id != discovery_id
            ]
    
    async def stop_route_monitoring(self, route_id: str):
        """Stop monitoring a route"""
        if route_id in self.active_routes:
            del self.active_routes[route_id]
        if route_id in self.pending_discoveries:
            del self.pending_discoveries[route_id]
        if route_id in self.delivered_discoveries:
            del self.delivered_discoveries[route_id]
        
        logger.info(f"🔍 Stopped route monitoring: {route_id}")
    
    async def _continuous_route_scanning(self):
        """Background task to continuously scan routes"""
        while self.is_running:
            try:
                for route_id in list(self.active_routes.keys()):
                    await self._scan_route_for_discoveries(route_id)
                
                await asyncio.sleep(self.scan_interval)
                
            except Exception as e:
                logger.error(f"❌ Error in continuous route scanning: {e}")
                await asyncio.sleep(60)  # Wait before retrying
    
    async def _scan_route_for_discoveries(self, route_id: str):
        """Scan a specific route for new discoveries"""
        try:
            route_context = self.active_routes.get(route_id)
            if not route_context:
                return
            
            current_lat = route_context.current_location.get("lat", 0)
            current_lng = route_context.current_location.get("lng", 0)
            
            # Get user preferences from Graph RAG (if available)
            try:
                user_preferences = await self._get_user_travel_preferences(route_context.user_id)
            except ImportError:
                user_preferences = {"interests": [], "budget_range": "medium"}
            
            # Scan ahead on route
            discoveries = []
            
            # Scan for POIs using existing web scraping service
            poi_discoveries = await self._scan_for_pois(
                current_lat, current_lng, route_context, user_preferences
            )
            discoveries.extend(poi_discoveries)
            
            # Scan for fuel/service stops
            fuel_discoveries = await self._scan_for_fuel_stops(
                current_lat, current_lng, route_context
            )
            discoveries.extend(fuel_discoveries)
            
            # Scan for weather alerts
            weather_discoveries = await self._scan_for_weather_alerts(
                current_lat, current_lng, route_context
            )
            discoveries.extend(weather_discoveries)
            
            # Add new discoveries to pending list
            existing_ids = {d.id for d in self.pending_discoveries.get(route_id, [])}
            delivered_ids = set(self.delivered_discoveries.get(route_id, []))
            
            new_discoveries = [
                d for d in discoveries 
                if d.id not in existing_ids and d.id not in delivered_ids
            ]
            
            if new_discoveries:
                if route_id not in self.pending_discoveries:
                    self.pending_discoveries[route_id] = []
                
                self.pending_discoveries[route_id].extend(new_discoveries)
                
                logger.debug(f"🔍 Found {len(new_discoveries)} new discoveries for {route_id}")
            
        except Exception as e:
            logger.error(f"❌ Error scanning route {route_id}: {e}")
    
    async def _scan_for_pois(
        self,
        lat: float,
        lng: float,
        route_context: RouteContext,
        user_preferences: Dict[str, Any]
    ) -> List[ProactiveDiscovery]:
        """Scan for points of interest using existing knowledge tools"""
        discoveries = []
        
        try:
            # Use existing web scraping service (lazy import)
            try:
                from app.core.orchestrator import orchestrator
                
                # Get POIs near current location
                poi_query = f"interesting places near {lat},{lng}"
                
                # Use existing knowledge tool to search
                knowledge_results = await orchestrator.knowledge_tool.search_location_info(
                    query=poi_query,
                    location={"lat": lat, "lng": lng}
                )
            except ImportError:
                # Fallback - return empty results if orchestrator not available
                knowledge_results = {"results": []}
            
            if knowledge_results and knowledge_results.get("results"):
                for poi in knowledge_results["results"][:5]:  # Limit to top 5
                    # Calculate relevance based on user preferences
                    relevance_score = await self._calculate_poi_relevance(poi, user_preferences)
                    
                    if relevance_score > 0.3:  # Only suggest relevant POIs
                        discovery_id = f"poi_{poi.get('name', 'unknown').replace(' ', '_')}_{int(time.time())}"
                        
                        # Create discovery message
                        distance = self._calculate_distance(
                            lat, lng,
                            poi.get("location", {}).get("lat", lat),
                            poi.get("location", {}).get("lng", lng)
                        )
                        
                        message = await self._create_poi_message(poi, distance, user_preferences)
                        
                        discovery = ProactiveDiscovery(
                            id=discovery_id,
                            message=message,
                            location=poi.get("location", {"lat": lat, "lng": lng}),
                            discovery_type="poi",
                            priority="normal",
                            distance_miles=distance,
                            user_relevance_score=relevance_score,
                            metadata={"poi_data": poi}
                        )
                        
                        discoveries.append(discovery)
            
        except Exception as e:
            logger.error(f"❌ Error scanning for POIs: {e}")
        
        return discoveries
    
    async def _scan_for_fuel_stops(
        self,
        lat: float,
        lng: float,
        route_context: RouteContext
    ) -> List[ProactiveDiscovery]:
        """Scan for fuel and service stops"""
        discoveries = []
        
        try:
            # Use existing knowledge tools to find fuel stops (lazy import)
            try:
                from app.core.orchestrator import orchestrator
                fuel_query = f"gas stations near {lat},{lng}"
                fuel_results = await orchestrator.knowledge_tool.search_location_info(
                    query=fuel_query,
                    location={"lat": lat, "lng": lng}
                )
            except ImportError:
                fuel_results = {"results": []}
            
            if fuel_results and fuel_results.get("results"):
                # Find the best fuel stop (closest with good prices)
                best_fuel_stop = fuel_results["results"][0]  # Simplified selection
                
                distance = self._calculate_distance(
                    lat, lng,
                    best_fuel_stop.get("location", {}).get("lat", lat),
                    best_fuel_stop.get("location", {}).get("lng", lng)
                )
                
                if distance < 25:  # Within 25 miles
                    discovery_id = f"fuel_{best_fuel_stop.get('name', 'station').replace(' ', '_')}_{int(time.time())}"
                    
                    message = f"There's a fuel stop coming up in {distance:.1f} miles - {best_fuel_stop.get('name', 'Gas station')}"
                    
                    discovery = ProactiveDiscovery(
                        id=discovery_id,
                        message=message,
                        location=best_fuel_stop.get("location", {"lat": lat, "lng": lng}),
                        discovery_type="fuel",
                        priority="normal",
                        distance_miles=distance,
                        user_relevance_score=0.7,  # Fuel is generally relevant
                        metadata={"fuel_data": best_fuel_stop}
                    )
                    
                    discoveries.append(discovery)
            
        except Exception as e:
            logger.error(f"❌ Error scanning for fuel stops: {e}")
        
        return discoveries
    
    async def _scan_for_weather_alerts(
        self,
        lat: float,
        lng: float,
        route_context: RouteContext
    ) -> List[ProactiveDiscovery]:
        """Scan for weather alerts along route"""
        discoveries = []
        
        try:
            # Use existing weather service (lazy import)
            try:
                from app.core.orchestrator import orchestrator
                weather_info = await orchestrator.knowledge_tool.get_weather_info(
                    location={"lat": lat, "lng": lng}
                )
            except ImportError:
                weather_info = {"alerts": []}
            
            if weather_info and weather_info.get("alerts"):
                for alert in weather_info["alerts"]:
                    if alert.get("severity") in ["moderate", "severe", "extreme"]:
                        discovery_id = f"weather_{alert.get('event', 'alert').replace(' ', '_')}_{int(time.time())}"
                        
                        priority = "high" if alert.get("severity") == "severe" else "urgent" if alert.get("severity") == "extreme" else "normal"
                        
                        message = f"Weather alert ahead: {alert.get('headline', 'Weather advisory in effect')}"
                        
                        discovery = ProactiveDiscovery(
                            id=discovery_id,
                            message=message,
                            location={"lat": lat, "lng": lng},
                            discovery_type="weather",
                            priority=priority,
                            distance_miles=0,  # Current location
                            user_relevance_score=0.9,  # Weather is highly relevant
                            metadata={"weather_alert": alert}
                        )
                        
                        discoveries.append(discovery)
            
        except Exception as e:
            logger.error(f"❌ Error scanning for weather alerts: {e}")
        
        return discoveries
    
    async def _get_user_travel_preferences(self, user_id: str) -> Dict[str, Any]:
        """Get user travel preferences from Graph RAG"""
        try:
            # Use existing Graph RAG to get user context (lazy import)
            try:
                from app.services.knowledge.graph_store import graph_store
                from app.services.knowledge.graph_models import GraphContextBuilder
                
                context_builder = GraphContextBuilder(graph_store)
                user_context = await context_builder.build_user_context(user_id, context_depth=2)
            except ImportError:
                # Fallback if graph services not available
                user_context = {"organized_context": {}}
            
            # Extract preferences from user's graph context
            preferences = {
                "interests": [],
                "budget_range": "medium",
                "travel_style": "casual",
                "vehicle_type": "unknown"
            }
            
            organized_context = user_context.get("organized_context", {})
            
            # Extract vehicle info
            vehicles = organized_context.get("Vehicle", [])
            if vehicles:
                vehicle = vehicles[0]
                vehicle_props = vehicle.get("properties", {})
                preferences["vehicle_type"] = vehicle_props.get("type", "unknown")
            
            # Extract trip patterns for interests
            trips = organized_context.get("Trip", [])
            locations = organized_context.get("Location", [])
            
            # Infer interests from location types
            location_types = []
            for location in locations:
                loc_type = location.get("properties", {}).get("type")
                if loc_type:
                    location_types.append(loc_type)
            
            preferences["interests"] = list(set(location_types))
            
            return preferences
            
        except Exception as e:
            logger.error(f"❌ Error getting user preferences: {e}")
            return {"interests": [], "budget_range": "medium", "travel_style": "casual"}
    
    async def _calculate_poi_relevance(self, poi: Dict[str, Any], user_preferences: Dict[str, Any]) -> float:
        """Calculate how relevant a POI is to the user"""
        relevance_score = 0.3  # Base relevance
        
        poi_type = poi.get("type", "").lower()
        poi_tags = poi.get("tags", [])
        
        # Match against user interests
        user_interests = [interest.lower() for interest in user_preferences.get("interests", [])]
        
        for interest in user_interests:
            if interest in poi_type or any(interest in tag.lower() for tag in poi_tags):
                relevance_score += 0.3
        
        # Boost for highly rated places
        rating = poi.get("rating", 0)
        if rating >= 4.0:
            relevance_score += 0.2
        elif rating >= 3.5:
            relevance_score += 0.1
        
        # Vehicle-specific relevance
        vehicle_type = user_preferences.get("vehicle_type", "").lower()
        if "rv" in vehicle_type or "motorhome" in vehicle_type:
            # Boost RV-friendly places
            rv_keywords = ["rv", "motorhome", "big rig", "parking"]
            if any(keyword in poi.get("description", "").lower() for keyword in rv_keywords):
                relevance_score += 0.2
        
        return min(relevance_score, 1.0)  # Cap at 1.0
    
    async def _create_poi_message(self, poi: Dict[str, Any], distance: float, user_preferences: Dict[str, Any]) -> str:
        """Create a natural message about a POI"""
        name = poi.get("name", "an interesting place")
        poi_type = poi.get("type", "attraction")
        
        # Create distance description
        if distance < 1:
            distance_desc = "just ahead"
        elif distance < 5:
            distance_desc = f"in {distance:.1f} miles"
        else:
            distance_desc = f"about {distance:.0f} miles ahead"
        
        # Create contextual message
        messages = [
            f"There's {name} {distance_desc} - looks like a great {poi_type}",
            f"Coming up {distance_desc}, there's {name} if you're interested in {poi_type}s",
            f"I spotted {name} {distance_desc} - perfect for a quick stop"
        ]
        
        # Add rating if available
        rating = poi.get("rating")
        if rating and rating >= 4.0:
            messages.append(f"{name} is {distance_desc} and has excellent reviews ({rating}/5 stars)")
        
        return messages[0]  # Return first message for simplicity
    
    def _calculate_distance(self, lat1: float, lng1: float, lat2: float, lng2: float) -> float:
        """Calculate distance between two points in miles"""
        try:
            # Haversine formula
            R = 3959  # Earth's radius in miles
            
            lat1_rad = math.radians(lat1)
            lat2_rad = math.radians(lat2)
            delta_lat = math.radians(lat2 - lat1)
            delta_lng = math.radians(lng2 - lng1)
            
            a = (math.sin(delta_lat / 2) ** 2 +
                 math.cos(lat1_rad) * math.cos(lat2_rad) *
                 math.sin(delta_lng / 2) ** 2)
            
            c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
            distance = R * c
            
            return distance
            
        except Exception:
            return 0.0

# Global proactive discovery service instance
proactive_discovery_service = ProactiveDiscoveryService()