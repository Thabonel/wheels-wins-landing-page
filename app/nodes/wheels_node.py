from typing import Dict, List, Optional, Any
import asyncio
import json
from datetime import datetime, timedelta
from dataclasses import dataclass
from app.core.logging import setup_logging

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
        """Get user's vehicle information"""
        # TODO: Replace with actual Supabase query
        return Vehicle(
            make="Ford",
            model="Transit",
            year=2020,
            fuel_type="diesel",
            fuel_efficiency=8.5,
            height_meters=2.8,
            length_meters=6.0,
            current_odometer=45000,
            last_service_km=40000,
            next_service_km=50000
        )
    
    async def _calculate_routes(self, origin: str, destination: str, vehicle: Vehicle) -> List[Dict]:
        """Calculate routes considering vehicle constraints"""
        # Simulate route calculation
        return [{
            "route_id": "main",
            "distance_km": 850,
            "duration_hours": 9.5,
            "waypoints": [origin, "Rest Stop 1", "Rest Stop 2", destination],
            "max_clearance": 4.0,
            "toll_cost": 45.0
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
        """Find camping spots along route"""
        return [
            {
                "name": "Riverside Free Camp",
                "type": "free_camp",
                "location": "River Road",
                "cost_per_night": 0,
                "amenities": ["toilets", "water", "dump_point"],
                "max_length": 12.0,
                "rating": 4.2
            }
        ]
    
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
            # Trip planning requests
            if any(word in message_lower for word in ['plan', 'trip', 'travel', 'route', 'journey']):
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
