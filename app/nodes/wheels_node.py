from typing import Dict, List, Optional, Any
import asyncio
import json
from datetime import datetime, timedelta
from dataclasses import dataclass
from app.core.logging import setup_logging
from app.database.supabase_client import get_supabase_client

logger = setup_logging("wheels_node")

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
        self.logger = setup_logging("wheels_node")
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
        """Calculate fuel efficiency from recent fills"""
        # TODO: Get previous fuel entries and calculate efficiency
        return 8.2  # Simulated efficiency
    
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
                            "content": f"Perfect! I can help you plan a trip from {origin.title()} to {destination.title()}. Based on your profile, I see you have a {context.get("user_profile", {}).get("vehicle_info", {}).get("type", "vehicle")} and prefer {context.get("user_profile", {}).get("travel_preferences", {}).get("style", "travel")} style. Let me create a personalized route with camping options and fuel stops along the way!"
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
                            "content": f"Perfect! I can help you plan a trip from {origin.title()} to {destination.title()}. Based on your profile, I see you have a {context.get("user_profile", {}).get("vehicle_info", {}).get("type", "vehicle")} and prefer {context.get("user_profile", {}).get("travel_preferences", {}).get("style", "travel")} style. Let me create a personalized route with camping options and fuel stops along the way!"
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
