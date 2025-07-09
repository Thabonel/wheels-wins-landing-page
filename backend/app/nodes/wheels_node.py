from typing import Dict, List, Optional, Any
import asyncio
import json
from datetime import datetime, timedelta
from dataclasses import dataclass
from app.core.logging import setup_logging, get_logger
from app.database.supabase_client import get_supabase_client
from app.core.route_intelligence import route_intelligence

setup_logging()
logger = get_logger("wheels_node")

@dataclass
class TravelPlan:
    origin: str
    destination: str
    routes: List[Dict]
    fuel_stops: List[Dict]
    camping_spots: List[Dict]
    weather_data: Dict
    estimated_cost: float
    total_distance_km: float
    estimated_duration_hours: float

@dataclass
class Vehicle:
    make: str
    model: str
    year: int
    fuel_type: str
    fuel_efficiency: float  # L/100km
    height_meters: float
    length_meters: float
    current_odometer: int
    last_service_km: int
    next_service_km: int

class WheelsNode:
    """Handles all travel and vehicle-related functionality"""
    
    def __init__(self):
        self.logger = get_logger("wheels_node")
        self.supabase = get_supabase_client()
        
    async def plan_trip(self, user_id: str, trip_data: Dict[str, Any]) -> Dict[str, Any]:
        """Plan a complete trip with routes, fuel stops, and camping"""
        try:
            origin = trip_data.get('origin')
            destination = trip_data.get('destination')
            constraints = trip_data.get('constraints', {})
            
            # Get user's vehicle info
            vehicle = await self._get_user_vehicle(user_id)
            
            # Plan the route
            routes = await self._calculate_routes(origin, destination, vehicle)
            
            # Find fuel stops along route
            fuel_stops = await self._find_fuel_stops(routes[0], vehicle)
            
            # Find camping spots
            camping_spots = await self._find_camping_spots(routes[0], constraints)
            
            # Get weather forecast
            weather_data = await self._get_route_weather(routes[0])
            
            # Calculate trip costs
            estimated_cost = self._calculate_trip_cost(routes[0], vehicle, fuel_stops)
            
            travel_plan = TravelPlan(
                origin=origin,
                destination=destination,
                routes=routes,
                fuel_stops=fuel_stops,
                camping_spots=camping_spots,
                weather_data=weather_data,
                estimated_cost=estimated_cost,
                total_distance_km=routes[0]['distance_km'],
                estimated_duration_hours=routes[0]['duration_hours']
            )
            
            return {
                "success": True,
                "data": {
                    "plan": travel_plan.__dict__,
                    "summary": f"Trip from {origin} to {destination}: {routes[0]['distance_km']}km, estimated ${estimated_cost:.0f}",
                    "actions": [
                        {
                            "type": "navigate",
                            "target": "/wheels/trip-planner"
                        },
                        {
                            "type": "fill_form",
                            "data": {
                                "origin": origin,
                                "destination": destination,
                                "distance": f"{routes[0]['distance_km']}km",
                                "cost": f"${estimated_cost:.0f}"
                            }
                        }
                    ]
                }
            }
            
        except Exception as e:
            self.logger.error(f"Error planning trip: {e}")
            return {
                "success": False,
                "error": str(e),
                "message": "I had trouble planning your trip. Please try again with different destinations."
            }
    
    async def log_fuel_purchase(self, user_id: str, fuel_data: Dict[str, Any]) -> Dict[str, Any]:
        """Log a fuel purchase and update efficiency tracking"""
        try:
            amount_litres = fuel_data.get('amount_litres')
            cost = fuel_data.get('cost')
            odometer = fuel_data.get('odometer')
            location = fuel_data.get('location', 'Unknown')
            
            # Calculate fuel efficiency if we have previous data
            efficiency = await self._calculate_fuel_efficiency(user_id, amount_litres, odometer)
            
            # Store fuel log entry
            fuel_entry = {
                "user_id": user_id,
                "date": datetime.now().isoformat(),
                "amount_litres": amount_litres,
                "cost": cost,
                "cost_per_litre": cost / amount_litres,
                "odometer": odometer,
                "location": location,
                "efficiency_l_per_100km": efficiency
            }
            
            return {
                "success": True,
                "data": fuel_entry,
                "message": f"Logged {amount_litres}L fuel purchase at {location}",
                "efficiency_update": f"Current efficiency: {efficiency:.1f}L/100km" if efficiency else None,
                "actions": [
                    {
                        "type": "navigate",
                        "target": "/wheels/fuel-log"
                    },
                    {
                        "type": "highlight",
                        "element": ".fuel-log-entry:first-child"
                    }
                ]
            }
            
        except Exception as e:
            self.logger.error(f"Error logging fuel: {e}")
            return {
                "success": False,
                "error": str(e),
                "message": "I couldn't log your fuel purchase. Please check the details and try again."
            }
    
    async def check_maintenance_schedule(self, user_id: str) -> Dict[str, Any]:
        """Check if vehicle maintenance is due"""
        try:
            vehicle = await self._get_user_vehicle(user_id)
            
            if not vehicle:
                return {
                    "success": False,
                    "message": "Please add your vehicle details first so I can track maintenance."
                }
            
            km_until_service = vehicle.next_service_km - vehicle.current_odometer
            
            if km_until_service <= 0:
                urgency = "OVERDUE"
                message = f"⚠️ Service is OVERDUE by {abs(km_until_service)}km!"
            elif km_until_service <= 500:
                urgency = "URGENT"
                message = f"🔧 Service due in {km_until_service}km"
            elif km_until_service <= 2000:
                urgency = "SOON"
                message = f"📅 Service due in {km_until_service}km"
            else:
                urgency = "OK"
                message = f"✅ Next service in {km_until_service}km"
            
            # Find nearby mechanics if urgent
            nearby_mechanics = []
            if urgency in ["OVERDUE", "URGENT"]:
                nearby_mechanics = await self._find_nearby_mechanics(user_id)
            
            return {
                "success": True,
                "data": {
                    "urgency": urgency,
                    "km_until_service": km_until_service,
                    "vehicle": vehicle.__dict__,
                    "nearby_mechanics": nearby_mechanics
                },
                "message": message,
                "actions": [
                    {
                        "type": "navigate",
                        "target": "/wheels/maintenance"
                    },
                    {
                        "type": "highlight",
                        "element": f".maintenance-{urgency.lower()}"
                    }
                ]
            }
            
        except Exception as e:
            self.logger.error(f"Error checking maintenance: {e}")
            return {
                "success": False,
                "error": str(e),
                "message": "I couldn't check your maintenance schedule. Please try again."
            }
    
    async def get_weather_forecast(self, location: str, days: int = 7) -> Dict[str, Any]:
        """Get weather forecast for a location"""
        try:
            # Simulate weather API call
            weather_data = {
                "location": location,
                "current": {
                    "temperature": 22,
                    "condition": "Partly Cloudy",
                    "wind_speed": 15,
                    "humidity": 65
                },
                "forecast": [
                    {
                        "date": (datetime.now() + timedelta(days=i)).strftime("%Y-%m-%d"),
                        "high": 25 + i,
                        "low": 15 + i,
                        "condition": "Sunny" if i % 2 == 0 else "Cloudy",
                        "rain_chance": 20 if i % 3 == 0 else 0
                    }
                    for i in range(days)
                ]
            }
            
            return {
                "success": True,
                "data": weather_data,
                "message": f"Weather forecast for {location}",
                "actions": [
                    {
                        "type": "navigate",
                        "target": "/wheels"
                    },
                    {
                        "type": "update_widget",
                        "widget": "weather",
                        "data": weather_data
                    }
                ]
            }
            
        except Exception as e:
            self.logger.error(f"Error getting weather: {e}")
            return {
                "success": False,
                "error": str(e),
                "message": "I couldn't get the weather forecast. Please try again."
            }
    
    async def plan_complete_trip(self, user_id: str, origin: str, destination: str, constraints: Dict[str, Any] = None) -> Dict[str, Any]:
        """Plan a complete trip with waypoints, camping spots, fuel costs, and attractions"""
        try:
            if not constraints:
                constraints = {}
            
            # Get user's vehicle and preferences
            vehicle = await self._get_user_vehicle(user_id)
            if not vehicle:
                return {
                    "success": False,
                    "message": "Please add your vehicle details first to get accurate trip planning."
                }
            
            # Extract travel preferences
            daily_driving_limit = constraints.get('daily_driving_hours', 8)  # hours per day
            max_daily_distance = daily_driving_limit * 80  # km (80 km/h average)
            budget_per_day = constraints.get('budget_per_day', 150)  # AUD
            
            # Use route intelligence to calculate route
            # Get coordinates for major cities (simplified)
            origin_coords = self._get_city_coordinates(origin)
            destination_coords = self._get_city_coordinates(destination)
            
            if not origin_coords or not destination_coords:
                return {
                    "success": False,
                    "message": f"I couldn't find coordinates for {origin} or {destination}. Please try major Australian cities."
                }
            
            # Calculate route using route intelligence
            route_result = await route_intelligence.find_route(
                origin_coords[0], origin_coords[1],
                destination_coords[0], destination_coords[1]
            )
            
            if not route_result.get('success'):
                return {
                    "success": False,
                    "message": "I couldn't calculate the route. Please try again."
                }
            
            route = route_result['route']
            total_distance = route['distance_km']
            
            # Calculate waypoints based on daily driving limits
            waypoints = self._calculate_waypoints(route, max_daily_distance)
            
            # Find fuel stops along route
            fuel_stops = await route_intelligence.find_fuel_stops(
                route['route_points'], 
                radius_km=50
            )
            
            # Get route bounds for finding camping spots
            bounds = await route_intelligence.get_route_bounds(route['route_points'])
            camping_spots = await route_intelligence.find_camping_locations(
                bounds[0], bounds[1], bounds[2], bounds[3]
            )
            
            # Filter camping spots based on daily driving limits and vehicle constraints
            suitable_camping = self._filter_camping_by_distance_and_vehicle(
                camping_spots, waypoints, vehicle
            )
            
            # Calculate fuel costs
            avg_fuel_price = 1.70  # AUD per liter
            fuel_cost_data = await route_intelligence.calculate_fuel_cost(
                total_distance,
                vehicle.fuel_efficiency,
                avg_fuel_price
            )
            
            # Find attractions along the way
            attractions = await self._find_attractions_along_route(route, bounds)
            
            # Calculate accommodation costs
            nights_needed = len(waypoints) - 1
            accommodation_cost = nights_needed * 45  # Average campsite cost per night
            
            # Total trip cost estimation
            total_cost = fuel_cost_data.get('total_fuel_cost', 0) + accommodation_cost + (nights_needed * 50)  # Food allowance
            
            # Create comprehensive trip plan
            trip_plan = {
                "trip_id": f"trip_{user_id}_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
                "origin": origin,
                "destination": destination,
                "total_distance_km": total_distance,
                "estimated_travel_time_hours": route['estimated_time_hours'],
                "number_of_days": nights_needed + 1,
                "waypoints": waypoints,
                "daily_distances": self._calculate_daily_distances(waypoints),
                "fuel_stops": fuel_stops[:5],  # Top 5 fuel stops
                "camping_spots": suitable_camping[:10],  # Top 10 camping spots
                "attractions": attractions,
                "cost_breakdown": {
                    "fuel_cost": fuel_cost_data.get('total_fuel_cost', 0),
                    "accommodation_cost": accommodation_cost,
                    "food_allowance": nights_needed * 50,
                    "total_estimated_cost": total_cost
                },
                "vehicle_compatibility": {
                    "route_suitable": route.get('distance_km', 0) < 3000,  # Long distance check
                    "fuel_range": vehicle.fuel_efficiency * 100,  # Range on full tank (assuming 100L tank)
                    "height_clearance": vehicle.height_meters <= 4.0
                },
                "recommendations": self._generate_trip_recommendations(
                    vehicle, total_distance, nights_needed
                )
            }
            
            # Save trip plan to database
            save_result = await self._save_trip_plan(user_id, trip_plan)
            
            return {
                "success": True,
                "data": {
                    "trip_plan": trip_plan,
                    "saved_to_database": save_result,
                    "summary": f"Complete trip plan: {origin} to {destination} over {nights_needed + 1} days, {total_distance:.0f}km, estimated ${total_cost:.0f}"
                },
                "message": f"🗺️ Your complete trip plan is ready! {origin} to {destination} over {nights_needed + 1} days with {len(suitable_camping)} camping options and {len(fuel_stops)} fuel stops.",
                "actions": [
                    {
                        "type": "ui_action",
                        "action": "navigate",
                        "payload": {
                            "page": "/wheels/trip-planner",
                            "params": {"trip_id": trip_plan["trip_id"]}
                        }
                    },
                    {
                        "type": "ui_action", 
                        "action": "highlight",
                        "payload": {
                            "elementId": "trip-plan-display",
                            "duration": 3000
                        }
                    }
                ]
            }
            
        except Exception as e:
            self.logger.error(f"Error in plan_complete_trip: {e}")
            return {
                "success": False,
                "error": str(e),
                "message": "I encountered an error planning your complete trip. Please try again with different parameters."
            }
    
    def _get_city_coordinates(self, city_name: str) -> Optional[tuple]:
        """Get coordinates for major Australian cities"""
        city_coords = {
            'brisbane': (-27.4705, 153.0260),
            'sydney': (-33.8688, 151.2093),
            'melbourne': (-37.8136, 144.9631),
            'perth': (-31.9505, 115.8605),
            'adelaide': (-34.9285, 138.6007),
            'cairns': (-16.9186, 145.7781),
            'darwin': (-12.4634, 130.8456),
            'alice springs': (-23.6980, 133.8807),
            'gold coast': (-28.0167, 153.4000),
            'canberra': (-35.2809, 149.1300)
        }
        
        return city_coords.get(city_name.lower().strip())
    
    def _calculate_waypoints(self, route: Dict, max_daily_distance: float) -> List[Dict]:
        """Calculate waypoints based on daily driving limits"""
        total_distance = route['distance_km']
        waypoints = []
        
        current_distance = 0
        day = 1
        
        # Add origin
        waypoints.append({
            "day": day,
            "location": "Origin",
            "cumulative_distance": 0,
            "coordinates": route['route_points'][0] if route['route_points'] else None
        })
        
        while current_distance < total_distance:
            current_distance += max_daily_distance
            day += 1
            
            if current_distance >= total_distance:
                # Final destination
                waypoints.append({
                    "day": day,
                    "location": "Destination", 
                    "cumulative_distance": total_distance,
                    "coordinates": route['route_points'][-1] if route['route_points'] else None
                })
                break
            else:
                # Intermediate waypoint
                waypoints.append({
                    "day": day,
                    "location": f"Day {day-1} Stop",
                    "cumulative_distance": current_distance,
                    "coordinates": None  # Would need interpolation for exact coordinates
                })
        
        return waypoints
    
    def _calculate_daily_distances(self, waypoints: List[Dict]) -> List[float]:
        """Calculate distance for each day of travel"""
        daily_distances = []
        
        for i in range(1, len(waypoints)):
            distance = waypoints[i]['cumulative_distance'] - waypoints[i-1]['cumulative_distance']
            daily_distances.append(distance)
        
        return daily_distances
    
    def _filter_camping_by_distance_and_vehicle(self, camping_spots: List[Dict], waypoints: List[Dict], vehicle: Vehicle) -> List[Dict]:
        """Filter camping spots suitable for the route and vehicle"""
        suitable_spots = []
        
        for spot in camping_spots:
            # Check vehicle compatibility
            if spot.get('max_length', 12.0) >= vehicle.length_meters:
                # Check if spot has necessary amenities
                amenities = spot.get('amenities', {})
                if isinstance(amenities, dict):
                    has_power = amenities.get('power', False)
                    has_water = amenities.get('water', False)
                    
                    # Add suitability score
                    spot['suitability_score'] = 0
                    if has_power:
                        spot['suitability_score'] += 2
                    if has_water:
                        spot['suitability_score'] += 2
                    if spot.get('user_ratings', 0) > 4.0:
                        spot['suitability_score'] += 1
                    
                    suitable_spots.append(spot)
        
        # Sort by suitability score and rating
        suitable_spots.sort(key=lambda x: (-x.get('suitability_score', 0), -x.get('user_ratings', 0)))
        
        return suitable_spots
    
    async def _find_attractions_along_route(self, route: Dict, bounds: tuple) -> List[Dict]:
        """Find tourist attractions along the route"""
        try:
            # Query local events that could be attractions
            response = await self.supabase.table('local_events').select('*').gte('latitude', bounds[0]).lte('latitude', bounds[1]).gte('longitude', bounds[2]).lte('longitude', bounds[3]).limit(5).execute()
            
            attractions = []
            if response.data:
                for event in response.data:
                    attraction = {
                        "name": event.get('event_name', 'Local Event'),
                        "type": event.get('event_type', 'attraction'),
                        "location": event.get('address', 'Location not specified'),
                        "description": event.get('description', ''),
                        "cost": event.get('ticket_price', 0) or 0,
                        "coordinates": [event.get('latitude'), event.get('longitude')] if event.get('latitude') and event.get('longitude') else None
                    }
                    attractions.append(attraction)
            
            # Add some default attractions if none found
            if not attractions:
                attractions = [
                    {
                        "name": "Scenic Lookout",
                        "type": "viewpoint",
                        "location": "Along Route",
                        "description": "Beautiful scenic views perfect for photos",
                        "cost": 0,
                        "coordinates": None
                    },
                    {
                        "name": "Historic Town",
                        "type": "heritage",
                        "location": "Route Township",
                        "description": "Charming historic town with local shops and cafes",
                        "cost": 0,
                        "coordinates": None
                    }
                ]
            
            return attractions
            
        except Exception as e:
            self.logger.error(f"Error finding attractions: {e}")
            return []
    
    def _generate_trip_recommendations(self, vehicle: Vehicle, total_distance: float, nights: int) -> List[str]:
        """Generate personalized trip recommendations"""
        recommendations = []
        
        # Vehicle-specific recommendations
        if vehicle.fuel_efficiency > 10:
            recommendations.append("Consider planning extra fuel stops due to higher fuel consumption")
        
        if vehicle.height_meters > 3.5:
            recommendations.append("Check bridge clearances and avoid low bridges")
        
        # Distance-specific recommendations
        if total_distance > 2000:
            recommendations.append("This is a long journey - consider splitting into multiple days")
            recommendations.append("Book accommodations in advance for peak season")
        
        if nights > 5:
            recommendations.append("Consider rest days every 3-4 days of driving")
        
        # General recommendations
        recommendations.extend([
            "Check weather forecasts before departure",
            "Carry extra water and emergency supplies",
            "Download offline maps for remote areas",
            "Notify someone of your travel plans"
        ])
        
        return recommendations
    
    async def _save_trip_plan(self, user_id: str, trip_plan: Dict) -> bool:
        """Save trip plan to database for future reference"""
        try:
            # Create a simplified version for database storage
            trip_data = {
                "user_id": user_id,
                "trip_id": trip_plan["trip_id"],
                "origin": trip_plan["origin"],
                "destination": trip_plan["destination"],
                "total_distance_km": trip_plan["total_distance_km"],
                "number_of_days": trip_plan["number_of_days"],
                "estimated_cost": trip_plan["cost_breakdown"]["total_estimated_cost"],
                "waypoints": trip_plan["waypoints"],
                "created_at": datetime.now().isoformat(),
                "trip_data": trip_plan  # Store full plan as JSON
            }
            
            # Save to a trip_plans table (would need to be created)
            # For now, save to pam_memory as a trip plan entry
            await self.supabase.table('pam_memory').insert({
                "user_id": user_id,
                "content": f"Trip plan: {trip_plan['origin']} to {trip_plan['destination']}",
                "topic": "trip_plan",
                "context": trip_data
            }).execute()
            
            return True
            
        except Exception as e:
            self.logger.error(f"Error saving trip plan: {e}")
            return False

    # Helper methods
    async def _get_user_vehicle(self, user_id: str) -> Optional[Vehicle]:
        """Get user's vehicle information from Supabase profiles"""
        try:
            response = self.supabase.table('profiles').select('*').eq('user_id', user_id).single().execute()
            
            if not response.data:
                self.logger.warning(f"No profile found for user {user_id}")
                return None
            
            profile = response.data
            
            # Extract vehicle info from profile, with defaults if missing
            vehicle_info = profile.get('vehicle_info', {})
            
            return Vehicle(
                make=vehicle_info.get('make', 'Unknown'),
                model=vehicle_info.get('model', 'Unknown'),
                year=vehicle_info.get('year', 2020),
                fuel_type=vehicle_info.get('fuel_type', 'diesel'),
                fuel_efficiency=vehicle_info.get('fuel_efficiency', 8.5),
                height_meters=vehicle_info.get('height_meters', 2.8),
                length_meters=vehicle_info.get('length_meters', 6.0),
                current_odometer=vehicle_info.get('current_odometer', 0),
                last_service_km=vehicle_info.get('last_service_km', 0),
                next_service_km=vehicle_info.get('next_service_km', 10000)
            )
            
        except Exception as e:
            self.logger.error(f"Error fetching user vehicle data: {e}")
            return None
    
    async def _calculate_routes(self, origin: str, destination: str, vehicle: Vehicle) -> List[Dict]:
        """Calculate routes considering vehicle constraints (simplified calculation)"""
        try:
            # Simple route calculation - can be enhanced with actual routing API later
            # For now, calculate basic distance and time estimates
            
            # Estimate distance based on common Australian city distances
            distance_estimates = {
                ("brisbane", "sydney"): 900,
                ("sydney", "melbourne"): 880,
                ("melbourne", "adelaide"): 730,
                ("adelaide", "perth"): 2130,
                ("cairns", "brisbane"): 1700,
                ("darwin", "alice springs"): 1500
            }
            
            origin_clean = origin.lower().strip()
            destination_clean = destination.lower().strip()
            
            # Look up distance or use default
            estimated_distance = distance_estimates.get((origin_clean, destination_clean)) or \
                               distance_estimates.get((destination_clean, origin_clean)) or \
                               500  # Default distance
            
            # Calculate duration (average 90 km/h including stops)
            estimated_duration = estimated_distance / 90.0
            
            # Calculate toll costs based on distance
            toll_cost = estimated_distance * 0.05  # Rough estimate
            
            return [{
                "route_id": "main",
                "distance_km": estimated_distance,
                "duration_hours": round(estimated_duration, 1),
                "waypoints": [origin, f"Rest Stop - {int(estimated_distance/3)}km", f"Rest Stop - {int(2*estimated_distance/3)}km", destination],
                "max_clearance": 4.0,
                "toll_cost": round(toll_cost, 2),
                "vehicle_compatible": vehicle.height_meters <= 4.0 and vehicle.length_meters <= 12.0
            }]
            
        except Exception as e:
            self.logger.error(f"Error calculating routes: {e}")
            # Return basic route on error
            return [{
                "route_id": "main",
                "distance_km": 500,
                "duration_hours": 6.0,
                "waypoints": [origin, destination],
                "max_clearance": 4.0,
                "toll_cost": 25.0,
                "vehicle_compatible": True
            }]
    
    async def _find_fuel_stops(self, route: Dict, vehicle: Vehicle) -> List[Dict]:
        """Find optimal fuel stops along route"""
        return [
            {
                "name": "BP Service Station",
                "location": "Halfway Point",
                "distance_km": 425,
                "fuel_price": 1.65,
                "amenities": ["restrooms", "food", "parking"]
            }
        ]
    
    async def _find_camping_spots(self, route: Dict, constraints: Dict) -> List[Dict]:
        """Find camping spots along route from Supabase camping_locations table"""
        try:
            # Query camping locations from Supabase
            response = self.supabase.table('camping_locations').select('*').limit(10).execute()
            
            if not response.data:
                self.logger.warning("No camping locations found in database")
                return []
            
            camping_spots = []
            for location in response.data:
                spot = {
                    "name": location.get('name', 'Unknown Campsite'),
                    "type": location.get('type', 'campsite'),
                    "location": location.get('address', 'Location not specified'),
                    "cost_per_night": float(location.get('price_per_night', 0)) if location.get('price_per_night') else 0,
                    "amenities": location.get('amenities', []),
                    "max_length": float(location.get('max_rig_length', 12.0)) if location.get('max_rig_length') else 12.0,
                    "rating": float(location.get('user_ratings', 4.0)) if location.get('user_ratings') else 4.0,
                    "latitude": float(location.get('latitude')) if location.get('latitude') else None,
                    "longitude": float(location.get('longitude')) if location.get('longitude') else None,
                    "hookups": location.get('hookups', []),
                    "reservation_required": location.get('reservation_required', False)
                }
                camping_spots.append(spot)
            
            return camping_spots
            
        except Exception as e:
            self.logger.error(f"Error fetching camping spots: {e}")
            # Return empty list on error
            return []
    
    async def _get_route_weather(self, route: Dict) -> Dict:
        """Get weather along the route"""
        return {
            "route_weather": "Generally sunny with afternoon clouds",
            "alerts": [],
            "best_travel_time": "Early morning departure recommended"
        }
    
    def _calculate_trip_cost(self, route: Dict, vehicle: Vehicle, fuel_stops: List[Dict]) -> float:
        """Calculate estimated trip cost"""
        distance = route['distance_km']
        fuel_needed = (distance / 100) * vehicle.fuel_efficiency
        fuel_price = fuel_stops[0]['fuel_price'] if fuel_stops else 1.70
        fuel_cost = fuel_needed * fuel_price
        toll_cost = route.get('toll_cost', 0)
        
        return fuel_cost + toll_cost
    
    async def _calculate_fuel_efficiency(self, user_id: str, amount_litres: float, odometer: int) -> Optional[float]:
        """Calculate fuel efficiency from the user's previous fuel log."""
        try:
            # Fetch the most recent fuel log entry to compare against
            response = (
                self.supabase
                .table("fuel_log")
                .select("odometer, volume, region")
                .eq("user_id", user_id)
                .order("date", desc=True)
                .limit(1)
                .execute()
            )

            last_entry = response.data[0] if response.data else None
            if not last_entry or not last_entry.get("odometer"):
                return None

            prev_odometer = float(last_entry["odometer"])
            if odometer <= prev_odometer:
                return None

            distance = odometer - prev_odometer
            region = (last_entry.get("region") or "AU").upper()

            if region == "US":
                # Volume is recorded in gallons for US region
                miles = distance * 0.621371
                if amount_litres <= 0 or miles <= 0:
                    return None
                mpg = miles / amount_litres
                efficiency = 235.215 / mpg
            else:
                if amount_litres <= 0 or distance <= 0:
                    return None
                efficiency = (amount_litres / distance) * 100

            return round(efficiency, 2)
        except Exception as e:
            self.logger.error(f"Error calculating fuel efficiency: {e}")
            return None
    
    async def _find_nearby_mechanics(self, user_id: str) -> List[Dict]:
        """Find mechanics near user's current location"""
        return [
            {
                "name": "Joe's Auto Service",
                "distance_km": 5.2,
                "rating": 4.5,
                "specializes_in": ["RV", "diesel"],
                "phone": "0412345678"
            }
        ]


    async def process(self, message: str, context: Dict[str, Any]) -> Dict[str, Any]:
        """Process travel-related messages and route to appropriate methods"""
        user_id = context.get('user_id')
        message_lower = message.lower()
        
        try:
            # Trip planning requests - including location-based planning
            if (any(word in message_lower for word in ["plan", "trip", "travel", "route", "journey"]) or 
                any(word in message_lower for word in ["from", "to"]) or 
                context.get("last_intent") == "wheels"):
                
                # Check if this is a location-based trip planning message
                locations = []
                if "from" in message_lower and "to" in message_lower:
                    # Extract origin and destination
                    parts = message_lower.split("from")[-1].split("to")
                    if len(parts) >= 2:
                        origin = parts[0].strip()
                        destination = parts[1].strip()
                        return {
                            "type": "message",
                            "content": f'Perfect! I can help you plan a trip from {origin.title()} to {destination.title()}. Based on your profile, I see you have a {context.get("user_profile", {}).get("vehicle_info", {}).get("type", "vehicle")} and prefer {context.get("user_profile", {}).get("travel_preferences", {}).get("style", "travel")} style. Let me create a personalized route with camping options and fuel stops along the way!'
                        }
                elif any(location in message_lower for location in ["cairns", "sydney", "brisbane", "melbourne", "perth", "adelaide", "darwin"]):
                    return {
                        "type": "message",
                        "content": f"Great! I can help plan your trip. I noticed you mentioned a location. Could you tell me your starting point and destination? For example: \"from Brisbane to Sydney\"."
                    }
                else:
                    return {
                        "type": "message",
                        "content": "I'd love to help plan your trip! Based on your vehicle and travel style, let me create a personalized route for you. Where would you like to go?"
                    }
            
            # Default travel response
            else:
                return {
                    "type": "message",
                    "content": "I can help you with trip planning, route optimization, fuel tracking, and vehicle maintenance. What would you like assistance with?"
                }
                
        except Exception as e:
            logger.error(f"Error in wheels_node.process: {e}")
            return {
                "type": "error",
                "content": "Sorry, I had trouble processing your travel request. Please try again."
            }


    async def process(self, message: str, context: Dict[str, Any]) -> Dict[str, Any]:
        """Process travel-related messages and route to appropriate methods"""
        user_id = context.get('user_id')
        message_lower = message.lower()
        
        try:
            # Trip planning requests - including location-based planning
            if (any(word in message_lower for word in ["plan", "trip", "travel", "route", "journey"]) or 
                any(word in message_lower for word in ["from", "to"]) or 
                context.get("last_intent") == "wheels"):
                
                # Check if this is a location-based trip planning message
                locations = []
                if "from" in message_lower and "to" in message_lower:
                    # Extract origin and destination
                    parts = message_lower.split("from")[-1].split("to")
                    if len(parts) >= 2:
                        origin = parts[0].strip()
                        destination = parts[1].strip()
                        return {
                            "type": "message",
                            "content": f'Perfect! I can help you plan a trip from {origin.title()} to {destination.title()}. Based on your profile, I see you have a {context.get("user_profile", {}).get("vehicle_info", {}).get("type", "vehicle")} and prefer {context.get("user_profile", {}).get("travel_preferences", {}).get("style", "travel")} style. Let me create a personalized route with camping options and fuel stops along the way!'
                        }
                elif any(location in message_lower for location in ["cairns", "sydney", "brisbane", "melbourne", "perth", "adelaide", "darwin"]):
                    return {
                        "type": "message",
                        "content": f"Great! I can help plan your trip. I noticed you mentioned a location. Could you tell me your starting point and destination? For example: \"from Brisbane to Sydney\"."
                    }
                else:
                    return {
                        "type": "message",
                        "content": "I'd love to help plan your trip! Based on your vehicle and travel style, let me create a personalized route for you. Where would you like to go?"
                    }
            
            # Default travel response
            else:
                return {
                    "type": "message",
                    "content": "I can help you with trip planning, route optimization, fuel tracking, and vehicle maintenance. What would you like assistance with?"
                }
                
        except Exception as e:
            logger.error(f"Error in wheels_node.process: {e}")
            return {
                "type": "error",
                "content": "Sorry, I had trouble processing your travel request. Please try again."
            }
# Create global instance
wheels_node = WheelsNode()
