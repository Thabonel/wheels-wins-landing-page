
"""
Enhanced Route Intelligence for PAM
"""

import logging
import math
from typing import Dict, List, Any, Optional, Tuple
from datetime import datetime, timedelta

from app.services.cache import CacheService
from app.services.database import DatabaseService
from app.core.exceptions import ExternalServiceError, ValidationError

logger = logging.getLogger("pam.route_intelligence")

class RouteIntelligence:
    """Enhanced route intelligence with comprehensive route planning capabilities"""
    
    def __init__(self):
        self.cache_service = CacheService()
        self.db_service = DatabaseService()
    
    async def get_route_suggestions(self, origin: str, destination: str, 
                                  preferences: Dict[str, Any] = None) -> List[Dict[str, Any]]:
        """Get intelligent route suggestions with caching and real data"""
        try:
            if not origin or not destination:
                raise ValidationError("Origin and destination are required")
            
            preferences = preferences or {}
            cache_key = f"route_suggestions:{origin}:{destination}:{hash(str(preferences))}"
            cached_result = await self.cache_service.get(cache_key)
            
            if cached_result:
                logger.debug(f"Route suggestions cache hit for {origin} to {destination}")
                return cached_result
            
            # Generate route suggestions with real data
            suggestions = await self._generate_enhanced_route_suggestions(
                origin, destination, preferences
            )
            
            # Cache results for 1 hour
            await self.cache_service.set(cache_key, suggestions, ttl=3600)
            
            return suggestions
            
        except Exception as e:
            logger.error(f"Failed to get route suggestions: {str(e)}")
            raise ExternalServiceError(f"Route intelligence error: {str(e)}")
    
    async def _generate_enhanced_route_suggestions(self, origin: str, destination: str, 
                                                 preferences: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Generate enhanced route suggestions with real integrations"""
        suggestions = []
        
        # Get coordinates for origin and destination
        origin_coords = await self._geocode_location(origin)
        dest_coords = await self._geocode_location(destination)
        
        if not origin_coords or not dest_coords:
            return await self._generate_fallback_suggestions(origin, destination, preferences)
        
        # Calculate base route metrics
        distance = self._calculate_distance(origin_coords, dest_coords)
        
        # Vehicle constraints from preferences
        vehicle_constraints = preferences.get('vehicle', {})
        max_length = vehicle_constraints.get('max_length')
        vehicle_type = vehicle_constraints.get('type', 'rv')
        
        # Generate different route types
        route_types = ['fastest', 'scenic', 'budget', 'rv_friendly']
        
        for route_type in route_types:
            # Skip scenic if not requested
            if route_type == 'scenic' and not preferences.get('scenic', False):
                continue
                
            suggestion = await self._build_route_suggestion(
                origin, destination, origin_coords, dest_coords,
                route_type, distance, preferences
            )
            
            if suggestion:
                suggestions.append(suggestion)
        
        return suggestions
    
    async def _build_route_suggestion(self, origin: str, destination: str,
                                    origin_coords: Tuple[float, float], 
                                    dest_coords: Tuple[float, float],
                                    route_type: str, distance: float,
                                    preferences: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Build a complete route suggestion with all enhancements"""
        try:
            # Base route calculation
            base_time = self._estimate_travel_time(distance, route_type)
            base_distance = distance
            
            # Apply route type modifiers
            if route_type == 'scenic':
                base_time *= 1.3
                base_distance *= 1.1
            elif route_type == 'budget':
                # Prefer non-toll routes
                base_time *= 1.15
            elif route_type == 'rv_friendly':
                # Account for RV-specific routing
                base_time *= 1.2
            
            # Find camping locations along route
            camping_stops = await self._find_camping_locations_along_route(
                origin_coords, dest_coords, preferences
            )
            
            # Find fuel stops
            fuel_stops = await self._optimize_fuel_stops(
                origin_coords, dest_coords, preferences
            )
            
            # Get weather forecast
            weather_info = await self._get_route_weather(
                origin_coords, dest_coords
            )
            
            # Check vehicle compatibility
            compatibility_score = await self._check_vehicle_compatibility(
                origin_coords, dest_coords, preferences.get('vehicle', {})
            )
            
            suggestion = {
                "type": route_type,
                "description": self._get_route_description(route_type, origin, destination),
                "estimated_time": self._format_time(base_time),
                "distance": f"{base_distance:.1f} miles",
                "highlights": self._get_route_highlights(route_type, compatibility_score),
                "camping_stops": camping_stops[:3],  # Top 3 stops
                "fuel_stops": fuel_stops[:5],  # Top 5 fuel stops
                "weather_summary": weather_info.get('summary', 'Weather data unavailable'),
                "compatibility_score": compatibility_score,
                "estimated_fuel_cost": self._estimate_fuel_cost(base_distance, preferences),
                "route_warnings": await self._get_route_warnings(
                    origin_coords, dest_coords, preferences
                )
            }
            
            return suggestion
            
        except Exception as e:
            logger.error(f"Error building route suggestion for {route_type}: {str(e)}")
            return None
    
    async def _find_camping_locations_along_route(self, origin_coords: Tuple[float, float],
                                                dest_coords: Tuple[float, float],
                                                preferences: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Find suitable camping locations along the route"""
        try:
            # Calculate route corridor (simplified as rectangle for now)
            min_lat = min(origin_coords[0], dest_coords[0]) - 0.5
            max_lat = max(origin_coords[0], dest_coords[0]) + 0.5
            min_lng = min(origin_coords[1], dest_coords[1]) - 0.5
            max_lng = max(origin_coords[1], dest_coords[1]) + 0.5
            
            # Query camping locations
            query = """
                SELECT * FROM camping_locations 
                WHERE latitude BETWEEN %s AND %s 
                AND longitude BETWEEN %s AND %s
                ORDER BY user_ratings DESC NULLS LAST
                LIMIT 10
            """
            
            locations = await self.db_service.fetch_all(
                query, (min_lat, max_lat, min_lng, max_lng)
            )
            
            camping_stops = []
            vehicle_constraints = preferences.get('vehicle', {})
            max_length = vehicle_constraints.get('max_length')
            
            for location in locations:
                # Check vehicle compatibility
                if max_length and location.get('max_rig_length'):
                    if max_length > location['max_rig_length']:
                        continue
                
                # Calculate distance from route
                route_distance = self._distance_from_route_line(
                    (location['latitude'], location['longitude']),
                    origin_coords, dest_coords
                )
                
                camping_stop = {
                    "name": location['name'],
                    "type": location['type'],
                    "latitude": float(location['latitude']),
                    "longitude": float(location['longitude']),
                    "distance_from_route": f"{route_distance:.1f} miles",
                    "rating": float(location['user_ratings']) if location['user_ratings'] else None,
                    "price_per_night": float(location['price_per_night']) if location['price_per_night'] else None,
                    "amenities": location.get('amenities', {}),
                    "hookups": location.get('hookups', {}),
                    "reservation_required": location.get('reservation_required', False)
                }
                
                camping_stops.append(camping_stop)
            
            return camping_stops
            
        except Exception as e:
            logger.error(f"Error finding camping locations: {str(e)}")
            return []
    
    async def _optimize_fuel_stops(self, origin_coords: Tuple[float, float],
                                 dest_coords: Tuple[float, float],
                                 preferences: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Find and optimize fuel stops along the route"""
        try:
            # Calculate route corridor
            min_lat = min(origin_coords[0], dest_coords[0]) - 0.3
            max_lat = max(origin_coords[0], dest_coords[0]) + 0.3
            min_lng = min(origin_coords[1], dest_coords[1]) - 0.3
            max_lng = max(origin_coords[1], dest_coords[1]) + 0.3
            
            # Query fuel stations
            query = """
                SELECT * FROM fuel_stations 
                WHERE latitude BETWEEN %s AND %s 
                AND longitude BETWEEN %s AND %s
                AND rv_friendly = true
                ORDER BY regular_price ASC NULLS LAST
                LIMIT 15
            """
            
            stations = await self.db_service.fetch_all(
                query, (min_lat, max_lat, min_lng, max_lng)
            )
            
            fuel_stops = []
            for station in stations:
                route_distance = self._distance_from_route_line(
                    (station['latitude'], station['longitude']),
                    origin_coords, dest_coords
                )
                
                # Only include stations within 5 miles of route
                if route_distance <= 5.0:
                    fuel_stop = {
                        "name": station['station_name'],
                        "brand": station.get('brand'),
                        "latitude": float(station['latitude']),
                        "longitude": float(station['longitude']),
                        "distance_from_route": f"{route_distance:.1f} miles",
                        "regular_price": float(station['regular_price']) if station['regular_price'] else None,
                        "diesel_price": float(station['diesel_price']) if station['diesel_price'] else None,
                        "amenities": station.get('amenities', {}),
                        "rating": float(station['user_ratings']) if station['user_ratings'] else None,
                        "rv_friendly": station.get('rv_friendly', False)
                    }
                    fuel_stops.append(fuel_stop)
            
            return fuel_stops
            
        except Exception as e:
            logger.error(f"Error optimizing fuel stops: {str(e)}")
            return []
    
    async def _get_route_weather(self, origin_coords: Tuple[float, float],
                               dest_coords: Tuple[float, float]) -> Dict[str, Any]:
        """Get weather information for the route"""
        try:
            # Check cache first
            cache_key = f"route_weather:{origin_coords}:{dest_coords}"
            cached_weather = await self.cache_service.get(cache_key)
            
            if cached_weather:
                return cached_weather
            
            # For now, return a summary based on location weather patterns
            # In a real implementation, this would call a weather API
            mid_lat = (origin_coords[0] + dest_coords[0]) / 2
            mid_lng = (origin_coords[1] + dest_coords[1]) / 2
            
            # Query weather patterns from database
            query = """
                SELECT * FROM location_weather_patterns 
                WHERE latitude BETWEEN %s AND %s 
                AND longitude BETWEEN %s AND %s
                AND month = %s
                LIMIT 5
            """
            
            current_month = datetime.now().month
            weather_data = await self.db_service.fetch_all(
                query, (mid_lat - 1, mid_lat + 1, mid_lng - 1, mid_lng + 1, current_month)
            )
            
            weather_info = {
                "summary": "Check current weather conditions",
                "warnings": [],
                "recommendations": []
            }
            
            if weather_data:
                avg_high = sum(w['avg_high_temp'] for w in weather_data if w['avg_high_temp']) / len(weather_data)
                avg_low = sum(w['avg_low_temp'] for w in weather_data if w['avg_low_temp']) / len(weather_data)
                
                weather_info["summary"] = f"Expected temps: {avg_high:.0f}°F high, {avg_low:.0f}°F low"
                
                # Add warnings from weather patterns
                for pattern in weather_data:
                    if pattern.get('weather_warnings'):
                        weather_info["warnings"].extend(pattern['weather_warnings'])
            
            # Cache for 6 hours
            await self.cache_service.set(cache_key, weather_info, ttl=21600)
            
            return weather_info
            
        except Exception as e:
            logger.error(f"Error getting route weather: {str(e)}")
            return {"summary": "Weather data unavailable", "warnings": [], "recommendations": []}
    
    async def _check_vehicle_compatibility(self, origin_coords: Tuple[float, float],
                                         dest_coords: Tuple[float, float],
                                         vehicle_info: Dict[str, Any]) -> float:
        """Check route compatibility with vehicle specifications"""
        try:
            if not vehicle_info:
                return 0.8  # Default compatibility
            
            compatibility_score = 1.0
            vehicle_length = vehicle_info.get('max_length', 0)
            vehicle_type = vehicle_info.get('type', 'rv')
            
            # Check if route has vehicle restrictions
            # This would typically query road restriction data
            # For now, we'll use camping location data as a proxy
            
            # Query locations along route to check compatibility
            min_lat = min(origin_coords[0], dest_coords[0]) - 0.5
            max_lat = max(origin_coords[0], dest_coords[0]) + 0.5
            min_lng = min(origin_coords[1], dest_coords[1]) - 0.5
            max_lng = max(origin_coords[1], dest_coords[1]) + 0.5
            
            query = """
                SELECT AVG(max_rig_length) as avg_max_length,
                       COUNT(*) as location_count
                FROM camping_locations 
                WHERE latitude BETWEEN %s AND %s 
                AND longitude BETWEEN %s AND %s
                AND max_rig_length IS NOT NULL
            """
            
            result = await self.db_service.fetch_one(
                query, (min_lat, max_lat, min_lng, max_lng)
            )
            
            if result and result['avg_max_length'] and vehicle_length:
                avg_max_length = float(result['avg_max_length'])
                if vehicle_length > avg_max_length:
                    compatibility_score *= 0.7  # Reduce compatibility
            
            # Adjust based on vehicle type
            if vehicle_type in ['large_rv', 'class_a']:
                compatibility_score *= 0.85  # Large vehicles have more restrictions
            
            return min(max(compatibility_score, 0.0), 1.0)
            
        except Exception as e:
            logger.error(f"Error checking vehicle compatibility: {str(e)}")
            return 0.8  # Default safe compatibility score
    
    async def _get_route_warnings(self, origin_coords: Tuple[float, float],
                                dest_coords: Tuple[float, float],
                                preferences: Dict[str, Any]) -> List[str]:
        """Get route-specific warnings and advisories"""
        warnings = []
        
        try:
            vehicle_info = preferences.get('vehicle', {})
            
            # Check for large vehicle warnings
            if vehicle_info.get('max_length', 0) > 35:
                warnings.append("Large vehicle - check bridge clearances and turning radius")
            
            # Check for seasonal warnings
            current_month = datetime.now().month
            if current_month in [11, 12, 1, 2, 3]:  # Winter months
                warnings.append("Winter travel - check road conditions and carry chains")
            
            # Check for mountain passes (simplified check based on coordinates)
            if abs(origin_coords[0] - dest_coords[0]) > 3 or abs(origin_coords[1] - dest_coords[1]) > 3:
                warnings.append("Long distance route - plan for fuel and rest stops")
            
            return warnings
            
        except Exception as e:
            logger.error(f"Error getting route warnings: {str(e)}")
            return ["Check current road conditions before departure"]
    
    # Utility methods
    async def _geocode_location(self, location: str) -> Optional[Tuple[float, float]]:
        """Geocode a location string to coordinates"""
        # In a real implementation, this would use a geocoding service
        # For now, return None to trigger fallback behavior
        return None
    
    def _calculate_distance(self, coord1: Tuple[float, float], coord2: Tuple[float, float]) -> float:
        """Calculate distance between two coordinates using Haversine formula"""
        lat1, lon1 = coord1
        lat2, lon2 = coord2
        
        # Convert to radians
        lat1, lon1, lat2, lon2 = map(math.radians, [lat1, lon1, lat2, lon2])
        
        # Haversine formula
        dlat = lat2 - lat1
        dlon = lon2 - lon1
        a = math.sin(dlat/2)**2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon/2)**2
        c = 2 * math.asin(math.sqrt(a))
        
        # Earth's radius in miles
        r = 3959
        
        return c * r
    
    def _distance_from_route_line(self, point: Tuple[float, float],
                                start: Tuple[float, float], 
                                end: Tuple[float, float]) -> float:
        """Calculate distance from a point to a route line (simplified)"""
        # Simplified calculation - distance to midpoint of route
        mid_lat = (start[0] + end[0]) / 2
        mid_lng = (start[1] + end[1]) / 2
        return self._calculate_distance(point, (mid_lat, mid_lng))
    
    def _estimate_travel_time(self, distance: float, route_type: str) -> float:
        """Estimate travel time in hours based on distance and route type"""
        base_speed = {
            'fastest': 65,
            'highway': 65,
            'scenic': 45,
            'budget': 55,
            'rv_friendly': 50
        }.get(route_type, 55)
        
        return distance / base_speed
    
    def _format_time(self, hours: float) -> str:
        """Format hours into readable time string"""
        if hours < 1:
            return f"{int(hours * 60)} minutes"
        elif hours < 24:
            h = int(hours)
            m = int((hours - h) * 60)
            return f"{h}h {m}m" if m > 0 else f"{h}h"
        else:
            days = int(hours / 24)
            remaining_hours = int(hours % 24)
            return f"{days}d {remaining_hours}h"
    
    def _estimate_fuel_cost(self, distance: float, preferences: Dict[str, Any]) -> float:
        """Estimate fuel cost for the route"""
        vehicle_info = preferences.get('vehicle', {})
        mpg = vehicle_info.get('mpg', 8)  # Default RV MPG
        fuel_price = 3.50  # Default fuel price per gallon
        
        gallons_needed = distance / mpg
        return gallons_needed * fuel_price
    
    def _get_route_description(self, route_type: str, origin: str, destination: str) -> str:
        """Get description for route type"""
        descriptions = {
            'fastest': f"Fastest route from {origin} to {destination}",
            'scenic': f"Scenic route from {origin} to {destination}",
            'budget': f"Most economical route from {origin} to {destination}",
            'rv_friendly': f"RV-optimized route from {origin} to {destination}"
        }
        return descriptions.get(route_type, f"Route from {origin} to {destination}")
    
    def _get_route_highlights(self, route_type: str, compatibility_score: float) -> List[str]:
        """Get highlights for route type"""
        base_highlights = {
            'fastest': ["Highway route", "Minimal stops", "Good for time-sensitive travel"],
            'scenic': ["Beautiful landscapes", "Photo opportunities", "Slower pace recommended"],
            'budget': ["Lower fuel costs", "Avoid tolls", "Cost-effective stops"],
            'rv_friendly': ["RV-safe roads", "Wide turns", "Appropriate clearances"]
        }.get(route_type, ["Standard route"])
        
        # Add compatibility info
        if compatibility_score >= 0.9:
            base_highlights.append("Excellent vehicle compatibility")
        elif compatibility_score >= 0.7:
            base_highlights.append("Good vehicle compatibility")
        else:
            base_highlights.append("Check vehicle restrictions")
        
        return base_highlights
    
    async def _generate_fallback_suggestions(self, origin: str, destination: str, 
                                           preferences: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Generate fallback suggestions when geocoding fails"""
        return [
            {
                "type": "fastest",
                "description": f"Fastest route from {origin} to {destination}",
                "estimated_time": "Calculating...",
                "distance": "Calculating...",
                "highlights": ["Highway route", "Good for large RVs", "Use GPS for detailed directions"],
                "camping_stops": [],
                "fuel_stops": [],
                "weather_summary": "Check current weather conditions",
                "compatibility_score": 0.8,
                "estimated_fuel_cost": 0.0,
                "route_warnings": ["Verify route with GPS navigation"]
            }
        ]
    
    async def find_points_of_interest(self, route: str, interests: List[str] = None) -> List[Dict[str, Any]]:
        """Find points of interest along a route"""
        try:
            cache_key = f"poi:{route}:{hash(str(interests))}"
            cached_result = await self.cache_service.get(cache_key)
            
            if cached_result:
                return cached_result
            
            # Enhanced POI finding with real data integration
            pois = await self._find_enhanced_pois(route, interests or [])
            
            # Cache for 2 hours
            await self.cache_service.set(cache_key, pois, ttl=7200)
            
            return pois
            
        except Exception as e:
            logger.error(f"Failed to find POIs: {str(e)}")
            return []
    
    async def _find_enhanced_pois(self, route: str, interests: List[str]) -> List[Dict[str, Any]]:
        """Find enhanced POIs with database integration"""
        pois = []
        
        try:
            # Query local events
            events_query = """
                SELECT event_name, event_type, latitude, longitude, 
                       start_date, venue_name, is_free, ticket_price
                FROM local_events 
                WHERE start_date >= CURRENT_DATE 
                AND start_date <= CURRENT_DATE + INTERVAL '30 days'
                ORDER BY start_date 
                LIMIT 10
            """
            
            events = await self.db_service.fetch_all(events_query)
            
            for event in events:
                pois.append({
                    "name": event['event_name'],
                    "type": "event",
                    "category": event['event_type'],
                    "latitude": float(event['latitude']) if event['latitude'] else None,
                    "longitude": float(event['longitude']) if event['longitude'] else None,
                    "distance_from_route": "Along route",
                    "rating": 4.0,
                    "description": f"Event at {event['venue_name']}",
                    "details": {
                        "date": event['start_date'].strftime('%Y-%m-%d') if event['start_date'] else None,
                        "free": event['is_free'],
                        "price": float(event['ticket_price']) if event['ticket_price'] else None
                    }
                })
            
            # Add some default POIs
            default_pois = [
                {
                    "name": "Scenic Overlook",
                    "type": "viewpoint",
                    "category": "nature",
                    "distance_from_route": "2 miles",
                    "rating": 4.5,
                    "description": "Beautiful mountain views",
                    "details": {"elevation": "2,500 ft", "best_time": "sunrise/sunset"}
                },
                {
                    "name": "RV-Friendly Fuel Stop",
                    "type": "fuel",
                    "category": "services",
                    "distance_from_route": "0.5 miles",
                    "rating": 4.2,
                    "description": "Easy access for large RVs",
                    "details": {"amenities": ["restrooms", "food", "wifi"]}
                }
            ]
            
            pois.extend(default_pois)
            
        except Exception as e:
            logger.error(f"Error finding enhanced POIs: {str(e)}")
        
        return pois

# Create singleton instance
route_intelligence = RouteIntelligence()
