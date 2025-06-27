"""
WHEELS Node - Agentic Travel & Vehicle Management
Handles trip planning, vehicle maintenance, fuel tracking with full AI integration.
"""

import json
from typing import Dict, Any, List, Optional
from datetime import datetime, date, timedelta
from decimal import Decimal
import logging
import re
from dataclasses import dataclass

from backend.app.services.database import get_database_service
from backend.app.models.domain.pam import PamResponse
from backend.app.services.pam.nodes.base_node import BaseNode
from backend.app.services.pam.intelligent_conversation import IntelligentConversationService
from app.core.database import get_supabase_client

logger = logging.getLogger(__name__)

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

class WheelsNode(BaseNode):
    """Agentic WHEELS node for intelligent travel and vehicle management"""
    
    def __init__(self):
        super().__init__("wheels")
        self.database_service = None
        self.ai_service = IntelligentConversationService()
        self.supabase = get_supabase_client()
    
    async def initialize(self):
        """Initialize WHEELS node"""
        self.database_service = await get_database_service()
        logger.info("Agentic WHEELS node initialized")
    
    async def process(self, input_data: Dict[str, Any]) -> PamResponse:
        """Process travel requests with full AI intelligence"""
        if not self.database_service:
            await self.initialize()
        
        user_id = input_data.get('user_id')
        message = input_data.get('message', '')
        conversation_history = input_data.get('conversation_history', [])
        user_context = input_data.get('user_context', {})
        
        try:
            # Get comprehensive travel context for AI
            travel_context = await self._get_travel_context(user_id)
            
            # Build AI context with travel data
            ai_context = {
                **user_context,
                'travel_data': travel_context,
                'domain': 'travel_and_vehicle_management',
                'capabilities': [
                    'trip_planning', 'route_optimization', 'fuel_tracking',
                    'vehicle_maintenance', 'camping_recommendations', 'weather_forecasts',
                    'cost_estimation', 'attraction_discovery'
                ]
            }
            
            # Check if this requires a travel action
            action_result = await self._detect_and_execute_travel_action(
                user_id, message, travel_context
            )
            
            if action_result:
                # Action was performed, get updated travel context
                travel_context = await self._get_travel_context(user_id)
                ai_context['travel_data'] = travel_context
                ai_context['action_performed'] = action_result
            
            # Generate intelligent response using AI
            ai_response = await self.ai_service.generate_response(
                message=message,
                context=ai_context,
                conversation_history=conversation_history,
                system_prompt=self._get_travel_system_prompt()
            )
            
            # Generate contextual suggestions
            suggestions = await self._generate_smart_suggestions(
                user_id, message, travel_context, action_result
            )
            
            return PamResponse(
                content=ai_response,
                confidence=0.9,
                suggestions=suggestions,
                requires_followup=False,
                metadata={
                    'travel_action': action_result.get('action') if action_result else None,
                    'vehicle_status': travel_context.get('vehicle_summary', {}),
                    'trip_recommendations': travel_context.get('trip_suggestions', [])
                }
            )
            
        except Exception as e:
            logger.error(f"WHEELS node processing error: {e}")
            return await self._generate_error_response(message)
    
    async def _get_travel_context(self, user_id: str) -> Dict[str, Any]:
        """Get comprehensive travel context for AI"""
        try:
            context = {}
            
            # Vehicle information
            vehicle = await self._get_user_vehicle(user_id)
            if vehicle:
                context['vehicle_summary'] = {
                    'make_model': f"{vehicle.make} {vehicle.model}",
                    'fuel_efficiency': vehicle.fuel_efficiency,
                    'maintenance_due_km': vehicle.next_service_km - vehicle.current_odometer,
                    'height': vehicle.height_meters,
                    'length': vehicle.length_meters
                }
            
            # Recent fuel purchases
            fuel_query = """
                SELECT date, amount_litres, cost, location, efficiency_l_per_100km
                FROM fuel_log 
                WHERE user_id = $1 
                ORDER BY date DESC 
                LIMIT 5
            """
            context['recent_fuel'] = await self.database_service.execute_query(
                fuel_query, user_id, cache_key=f"fuel_context:{user_id}", cache_ttl=300
            )
            
            # Recent trips
            trips_query = """
                SELECT origin, destination, total_distance_km, estimated_cost, created_at
                FROM trip_plans 
                WHERE user_id = $1 
                ORDER BY created_at DESC 
                LIMIT 3
            """
            context['recent_trips'] = await self.database_service.execute_query(
                trips_query, user_id, cache_key=f"trips_context:{user_id}", cache_ttl=600
            )
            
            # Travel preferences
            prefs_query = """
                SELECT travel_style, daily_budget, preferred_camping_type, 
                       max_driving_hours, fuel_budget_per_month
                FROM user_travel_preferences 
                WHERE user_id = $1
            """
            context['travel_preferences'] = await self.database_service.execute_single(
                prefs_query, user_id, cache_key=f"travel_prefs:{user_id}", cache_ttl=1800
            )
            
            return context
            
        except Exception as e:
            logger.error(f"Error getting travel context: {e}")
            return {}
    
    async def _detect_and_execute_travel_action(
        self, user_id: str, message: str, travel_context: Dict[str, Any]
    ) -> Optional[Dict[str, Any]]:
        """Detect and execute travel actions from natural language"""
        message_lower = message.lower()
        
        try:
            # Trip planning detection
            if 'from' in message_lower and 'to' in message_lower:
                return await self._plan_trip_from_message(user_id, message)
            
            # Fuel logging detection
            fuel_keywords = ['filled up', 'fuel', 'gas', 'diesel', 'litres', 'tank']
            if any(keyword in message_lower for keyword in fuel_keywords):
                return await self._log_fuel_from_message(user_id, message)
            
            # Maintenance check detection
            maintenance_keywords = ['service', 'maintenance', 'oil change', 'check up']
            if any(keyword in message_lower for keyword in maintenance_keywords):
                return await self._check_maintenance_from_message(user_id, message)
            
            return None
            
        except Exception as e:
            logger.error(f"Error executing travel action: {e}")
            return None
    
    def _get_travel_system_prompt(self) -> str:
        """Get specialized system prompt for travel conversations"""
        return """You are PAM (Personal Assistant & Motivator), a friendly AI assistant specializing in RV travel and vehicle management. You help users plan trips, track fuel, maintain vehicles, and discover amazing destinations across Australia.

Key capabilities:
- Plan detailed trip routes with camping spots and fuel stops
- Track vehicle maintenance and fuel efficiency
- Recommend attractions and scenic routes
- Provide weather forecasts and travel tips
- Calculate trip costs and optimize routes

Communication style:
- Enthusiastic and encouraging about travel adventures
- Use travel emojis appropriately (🚐, 🛣️, ⛽, 🏕️, 🌤️)
- Provide specific, actionable travel advice
- Share local knowledge and hidden gems
- Be supportive about vehicle issues

When provided with travel_data context:
- Reference their vehicle specifications and capabilities
- Mention upcoming maintenance needs if relevant
- Suggest routes based on their travel history
- Provide personalized recommendations based on preferences

Always be helpful, encouraging, and focused on safe, enjoyable RV travel experiences."""

    # Original backend functions preserved, plus new functions from app/nodes/wheels_node.py
    
    # Trip Planning Functions (from app/nodes/wheels_node.py)
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
            logger.error(f"Error planning trip: {e}")
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
            logger.error(f"Error logging fuel: {e}")
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
            logger.error(f"Error checking maintenance: {e}")
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
            logger.error(f"Error getting weather: {e}")
            return {
                "success": False,
                "error": str(e),
                "message": "I couldn't get the weather forecast. Please try again."
            }
    
    # Complete trip planning function
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
            
            # Calculate basic route
            total_distance = self._estimate_distance(origin_coords, destination_coords)
            
            # Calculate waypoints based on daily driving limits
            waypoints = self._calculate_waypoints_simple(origin, destination, total_distance, max_daily_distance)
            
            # Find camping spots
            camping_spots = await self._find_camping_spots_simple(origin, destination)
            
            # Find attractions along route
            attractions = await self._find_attractions_along_route_simple(origin, destination)
            
            # Calculate fuel costs
            avg_fuel_price = 1.70  # AUD per liter
            fuel_needed = (total_distance / 100) * vehicle.fuel_efficiency
            fuel_cost = fuel_needed * avg_fuel_price
            
            # Calculate accommodation costs
            nights_needed = len(waypoints) - 1
            accommodation_cost = nights_needed * 45  # Average campsite cost per night
            
            # Total trip cost estimation
            total_cost = fuel_cost + accommodation_cost + (nights_needed * 50)  # Food allowance
            
            # Create comprehensive trip plan
            trip_plan = {
                "trip_id": f"trip_{user_id}_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
                "origin": origin,
                "destination": destination,
                "total_distance_km": total_distance,
                "estimated_travel_time_hours": total_distance / 80,
                "number_of_days": nights_needed + 1,
                "waypoints": waypoints,
                "camping_spots": camping_spots,
                "attractions": attractions,
                "cost_breakdown": {
                    "fuel_cost": fuel_cost,
                    "accommodation_cost": accommodation_cost,
                    "food_allowance": nights_needed * 50,
                    "total_estimated_cost": total_cost
                },
                "vehicle_compatibility": {
                    "route_suitable": total_distance < 3000,
                    "fuel_range": vehicle.fuel_efficiency * 100,
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
                "message": f"🗺️ Your complete trip plan is ready! {origin} to {destination} over {nights_needed + 1} days with {len(camping_spots)} camping options.",
                "actions": [
                    {
                        "type": "ui_action",
                        "action": "navigate",
                        "payload": {
                            "page": "/wheels/trip-planner",
                            "params": {"trip_id": trip_plan["trip_id"]}
                        }
                    }
                ]
            }
            
        except Exception as e:
            logger.error(f"Error in plan_complete_trip: {e}")
            return {
                "success": False,
                "error": str(e),
                "message": "I encountered an error planning your complete trip. Please try again with different parameters."
            }

    # Helper methods from app/nodes/wheels_node.py
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

    def _estimate_distance(self, origin_coords: tuple, destination_coords: tuple) -> float:
        """Estimate distance between two coordinate points"""
        # Simple distance estimation (not accounting for earth curvature)
        lat_diff = abs(origin_coords[0] - destination_coords[0])
        lng_diff = abs(origin_coords[1] - destination_coords[1])
        return ((lat_diff ** 2 + lng_diff ** 2) ** 0.5) * 111  # Rough km conversion

    def _calculate_waypoints_simple(self, origin: str, destination: str, total_distance: float, max_daily_distance: float) -> List[Dict]:
        """Calculate waypoints based on daily driving limits"""
        waypoints = []
        current_distance = 0
        day = 1
        
        # Add origin
        waypoints.append({
            "day": day,
            "location": origin,
            "cumulative_distance": 0
        })
        
        while current_distance < total_distance:
            current_distance += max_daily_distance
            day += 1
            
            if current_distance >= total_distance:
                waypoints.append({
                    "day": day,
                    "location": destination,
                    "cumulative_distance": total_distance
                })
                break
            else:
                waypoints.append({
                    "day": day,
                    "location": f"Day {day-1} Stop",
                    "cumulative_distance": current_distance
                })
        
        return waypoints

    async def _find_camping_spots_simple(self, origin: str, destination: str) -> List[Dict]:
        """Find camping spots between origin and destination"""
        try:
            response = self.supabase.table('camping_locations').select('*').limit(5).execute()
            
            camping_spots = []
            if response.data:
                for location in response.data:
                    spot = {
                        "name": location.get('name', 'Unknown Campsite'),
                        "type": location.get('type', 'campsite'),
                        "location": location.get('address', 'Location not specified'),
                        "cost_per_night": float(location.get('price_per_night', 0)) if location.get('price_per_night') else 0,
                        "amenities": location.get('amenities', []),
                        "rating": float(location.get('user_ratings', 4.0)) if location.get('user_ratings') else 4.0
                    }
                    camping_spots.append(spot)
            
            return camping_spots
            
        except Exception as e:
            logger.error(f"Error fetching camping spots: {e}")
            return []

    async def _find_attractions_along_route_simple(self, origin: str, destination: str) -> List[Dict]:
        """Find tourist attractions along the route"""
        return [
            {
                "name": "Scenic Lookout",
                "type": "viewpoint",
                "location": "Along Route",
                "description": "Beautiful scenic views perfect for photos",
                "cost": 0
            },
            {
                "name": "Historic Town",
                "type": "heritage",
                "location": "Route Township",
                "description": "Charming historic town with local shops and cafes",
                "cost": 0
            }
        ]

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
                "trip_data": trip_plan
            }
            
            await self.supabase.table('pam_memory').insert({
                "user_id": user_id,
                "content": f"Trip plan: {trip_plan['origin']} to {trip_plan['destination']}",
                "topic": "trip_plan",
                "context": trip_data
            }).execute()
            
            return True
            
        except Exception as e:
            logger.error(f"Error saving trip plan: {e}")
            return False

    # Vehicle and helper methods
    async def _get_user_vehicle(self, user_id: str) -> Optional[Vehicle]:
        """Get user's vehicle information from Supabase profiles"""
        try:
            response = self.supabase.table('profiles').select('*').eq('user_id', user_id).single().execute()
            
            if not response.data:
                logger.warning(f"No profile found for user {user_id}")
                return None
            
            profile = response.data
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
            logger.error(f"Error fetching user vehicle data: {e}")
            return None
    
    async def _calculate_routes(self, origin: str, destination: str, vehicle: Vehicle) -> List[Dict]:
        """Calculate routes considering vehicle constraints"""
        try:
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
            
            estimated_distance = distance_estimates.get((origin_clean, destination_clean)) or \
                               distance_estimates.get((destination_clean, origin_clean)) or \
                               500
            
            estimated_duration = estimated_distance / 90.0
            toll_cost = estimated_distance * 0.05
            
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
            logger.error(f"Error calculating routes: {e}")
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
            response = self.supabase.table('camping_locations').select('*').limit(10).execute()
            
            if not response.data:
                logger.warning("No camping locations found in database")
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
            logger.error(f"Error fetching camping spots: {e}")
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

    # Action detection helpers
    async def _plan_trip_from_message(self, user_id: str, message: str) -> Dict[str, Any]:
        """Extract trip planning request from message"""
        try:
            parts = message.lower().split("from")[-1].split("to")
            if len(parts) >= 2:
                origin = parts[0].strip()
                destination = parts[1].strip()
                
                trip_result = await self.plan_trip(user_id, {
                    'origin': origin,
                    'destination': destination,
                    'constraints': {}
                })
                
                if trip_result['success']:
                    return {
                        'action': 'trip_planned',
                        'origin': origin,
                        'destination': destination,
                        'distance': trip_result['data']['plan']['total_distance_km']
                    }
            
        except Exception as e:
            logger.error(f"Error planning trip from message: {e}")
        
        return None

    async def _log_fuel_from_message(self, user_id: str, message: str) -> Dict[str, Any]:
        """Extract fuel logging request from message"""
        try:
            # Extract numbers from message
            import re
            numbers = re.findall(r'\d+(?:\.\d+)?', message)
            
            if numbers:
                # Assume first number is litres, second is cost
                amount_litres = float(numbers[0])
                cost = float(numbers[1]) if len(numbers) > 1 else amount_litres * 1.70
                
                fuel_result = await self.log_fuel_purchase(user_id, {
                    'amount_litres': amount_litres,
                    'cost': cost,
                    'odometer': 50000,  # Default odometer
                    'location': 'Service Station'
                })
                
                if fuel_result['success']:
                    return {
                        'action': 'fuel_logged',
                        'amount_litres': amount_litres,
                        'cost': cost
                    }
            
        except Exception as e:
            logger.error(f"Error logging fuel from message: {e}")
        
        return None

    async def _check_maintenance_from_message(self, user_id: str, message: str) -> Dict[str, Any]:
        """Check maintenance status from message"""
        try:
            maintenance_result = await self.check_maintenance_schedule(user_id)
            
            if maintenance_result['success']:
                return {
                    'action': 'maintenance_checked',
                    'urgency': maintenance_result['data']['urgency'],
                    'km_until_service': maintenance_result['data']['km_until_service']
                }
            
        except Exception as e:
            logger.error(f"Error checking maintenance from message: {e}")
        
        return None

    async def _generate_smart_suggestions(
        self, user_id: str, message: str, travel_context: Dict[str, Any], 
        action_result: Optional[Dict[str, Any]]
    ) -> List[str]:
        """Generate contextual suggestions based on travel state"""
        suggestions = []
        
        try:
            # Post-action suggestions
            if action_result:
                action = action_result['action']
                if action == 'trip_planned':
                    suggestions = [
                        "Show camping spots",
                        "Check weather forecast",
                        "Get fuel cost estimate"
                    ]
                elif action == 'fuel_logged':
                    suggestions = [
                        "Check fuel efficiency",
                        "View fuel spending",
                        "Plan next fuel stop"
                    ]
                elif action == 'maintenance_checked':
                    suggestions = [
                        "Find nearby mechanics",
                        "Book service appointment",
                        "Check maintenance history"
                    ]
            else:
                # Context-based suggestions
                vehicle_summary = travel_context.get('vehicle_summary', {})
                
                if vehicle_summary.get('maintenance_due_km', 1000) < 500:
                    suggestions.extend([
                        "Check maintenance schedule",
                        "Find nearby mechanics",
                        "Book service appointment"
                    ])
                
                # Always include general options
                suggestions.extend([
                    "Plan a trip",
                    "Log fuel purchase",
                    "Check weather",
                    "Find camping spots"
                ])
            
            # Remove duplicates and limit to 4
            return list(dict.fromkeys(suggestions))[:4]
            
        except Exception as e:
            logger.error(f"Error generating suggestions: {e}")
            return [
                "Plan a trip",
                "Log fuel purchase", 
                "Check maintenance",
                "Get weather forecast"
            ]

    async def _generate_error_response(self, message: str) -> PamResponse:
        """Generate friendly error response"""
        return PamResponse(
            content="I'm having a small hiccup with your travel data right now. Let me try that again in just a moment! In the meantime, I can still help you with trip planning or answer questions about RV travel. 🚐",
            confidence=0.5,
            suggestions=[
                "Try asking again",
                "Plan a trip",
                "Get travel tips",
                "Check weather"
            ],
            requires_followup=True
        )

# Global WHEELS node instance
wheels_node = WheelsNode()
