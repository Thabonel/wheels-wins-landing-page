"""
Route Intelligence Module
Handles route planning, fuel stops, and camping location recommendations
"""

import math
import asyncio
from typing import List, Dict, Optional, Tuple
from app.database.supabase_client import get_supabase_client
import httpx


class RouteIntelligence:
    def __init__(self):
        self.supabase = get_supabase_client()
    
    async def find_route(self, start_lat: float, start_lon: float, end_lat: float, end_lon: float) -> Dict:
        """
        Find route between two points using a simple routing service
        Returns route information including distance and estimated travel time
        """
        try:
            # Calculate straight-line distance as fallback
            distance_km = self._calculate_distance(start_lat, start_lon, end_lat, end_lon)
            
            # Simple route calculation (can be enhanced with real routing service)
            route_data = {
                "start_coordinates": [start_lat, start_lon],
                "end_coordinates": [end_lat, end_lon],
                "distance_km": distance_km,
                "estimated_time_hours": distance_km / 80,  # Assuming 80km/h average speed
                "route_points": [
                    [start_lat, start_lon],
                    [end_lat, end_lon]
                ]
            }
            
            return {
                "success": True,
                "route": route_data
            }
            
        except Exception as e:
            return {
                "success": False,
                "error": f"Route calculation failed: {str(e)}"
            }
    
    async def find_fuel_stops(self, route_points: List[List[float]], radius_km: float = 50) -> List[Dict]:
        """
        Find fuel stations along a route within specified radius
        """
        try:
            fuel_stops = []
            
            for point in route_points:
                lat, lon = point[0], point[1]
                
                # Query fuel stations within radius
                response = await self.supabase.from_("fuel_stations").select("*").execute()
                
                if response.data:
                    for station in response.data:
                        station_lat = float(station['latitude'])
                        station_lon = float(station['longitude'])
                        
                        # Calculate distance from route point
                        distance = self._calculate_distance(lat, lon, station_lat, station_lon)
                        
                        if distance <= radius_km:
                            station_info = {
                                "id": station['id'],
                                "name": station['station_name'],
                                "brand": station.get('brand'),
                                "address": station['address'],
                                "latitude": station_lat,
                                "longitude": station_lon,
                                "distance_from_route": distance,
                                "diesel_price": station.get('diesel_price'),
                                "regular_price": station.get('regular_price'),
                                "premium_price": station.get('premium_price'),
                                "rv_friendly": station.get('rv_friendly', False),
                                "amenities": station.get('amenities', {}),
                                "user_ratings": station.get('user_ratings')
                            }
                            fuel_stops.append(station_info)
            
            # Remove duplicates and sort by distance
            unique_stops = {stop['id']: stop for stop in fuel_stops}.values()
            sorted_stops = sorted(unique_stops, key=lambda x: x['distance_from_route'])
            
            return sorted_stops[:10]  # Return top 10 closest stops
            
        except Exception as e:
            print(f"Error finding fuel stops: {str(e)}")
            return []
    
    async def find_camping_locations(self, min_lat: float, max_lat: float, min_lon: float, max_lon: float) -> List[Dict]:
        """
        Find camping locations within geographic bounds
        """
        try:
            response = await self.supabase.from_("camping_locations").select("*").gte("latitude", min_lat).lte("latitude", max_lat).gte("longitude", min_lon).lte("longitude", max_lon).execute()
            
            camping_spots = []
            
            if response.data:
                for location in response.data:
                    camping_info = {
                        "id": location['id'],
                        "name": location['name'],
                        "type": location['type'],
                        "address": location.get('address'),
                        "latitude": float(location['latitude']),
                        "longitude": float(location['longitude']),
                        "price_per_night": location.get('price_per_night'),
                        "reservation_required": location.get('reservation_required', False),
                        "reservation_link": location.get('reservation_link'),
                        "max_rig_length": location.get('max_rig_length'),
                        "amenities": location.get('amenities', {}),
                        "hookups": location.get('hookups', {}),
                        "user_ratings": location.get('user_ratings'),
                        "reviews_summary": location.get('reviews_summary'),
                        "seasonal_info": location.get('seasonal_info', {})
                    }
                    camping_spots.append(camping_info)
            
            # Sort by user ratings (highest first)
            camping_spots.sort(key=lambda x: x.get('user_ratings', 0), reverse=True)
            
            return camping_spots
            
        except Exception as e:
            print(f"Error finding camping locations: {str(e)}")
            return []
    
    async def calculate_fuel_cost(self, distance_km: float, fuel_efficiency_l_per_100km: float, fuel_price_per_liter: float) -> Dict:
        """
        Calculate fuel cost for a given distance based on vehicle efficiency
        """
        try:
            # Calculate fuel consumption
            fuel_needed_liters = (distance_km / 100) * fuel_efficiency_l_per_100km
            
            # Calculate total cost
            total_fuel_cost = fuel_needed_liters * fuel_price_per_liter
            
            return {
                "distance_km": distance_km,
                "fuel_efficiency_l_per_100km": fuel_efficiency_l_per_100km,
                "fuel_price_per_liter": fuel_price_per_liter,
                "fuel_needed_liters": round(fuel_needed_liters, 2),
                "total_fuel_cost": round(total_fuel_cost, 2),
                "cost_per_km": round(total_fuel_cost / distance_km, 3) if distance_km > 0 else 0
            }
            
        except Exception as e:
            return {
                "error": f"Fuel cost calculation failed: {str(e)}"
            }
    
    def _calculate_distance(self, lat1: float, lon1: float, lat2: float, lon2: float) -> float:
        """
        Calculate the great circle distance between two points on Earth (in kilometers)
        """
        # Convert latitude and longitude from degrees to radians
        lat1, lon1, lat2, lon2 = map(math.radians, [lat1, lon1, lat2, lon2])
        
        # Haversine formula
        dlat = lat2 - lat1
        dlon = lon2 - lon1
        a = math.sin(dlat/2)**2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon/2)**2
        c = 2 * math.asin(math.sqrt(a))
        
        # Radius of Earth in kilometers
        r = 6371
        
        return c * r
    
    async def get_route_bounds(self, route_points: List[List[float]], buffer_km: float = 25) -> Tuple[float, float, float, float]:
        """
        Calculate bounding box for route with buffer for searching nearby locations
        """
        try:
            lats = [point[0] for point in route_points]
            lons = [point[1] for point in route_points]
            
            min_lat = min(lats)
            max_lat = max(lats)
            min_lon = min(lons)
            max_lon = max(lons)
            
            # Add buffer (approximate conversion: 1 degree ≈ 111 km)
            buffer_degrees = buffer_km / 111
            
            return (
                min_lat - buffer_degrees,
                max_lat + buffer_degrees,
                min_lon - buffer_degrees,
                max_lon + buffer_degrees
            )
            
        except Exception as e:
            print(f"Error calculating route bounds: {str(e)}")
            return (0, 0, 0, 0)


# Global instance
route_intelligence = RouteIntelligence()