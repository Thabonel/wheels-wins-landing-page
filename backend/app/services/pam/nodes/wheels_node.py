"""
WHEELS Node - Travel and Route Management
Handles route planning, campground searches, fuel information, and maintenance.
"""

import json
from typing import Dict, Any, List, Optional
from datetime import datetime, date, timedelta
import logging

from backend.app.services.database import get_database_service
from backend.app.models.domain.pam import PamResponse
from backend.app.services.pam.nodes.base_node import BaseNode

logger = logging.getLogger(__name__)

class WheelsNode(BaseNode):
    """WHEELS node for travel and route management"""
    
    def __init__(self):
        super().__init__("wheels")
        self.database_service = None
    
    async def initialize(self):
        """Initialize WHEELS node"""
        self.database_service = await get_database_service()
        logger.info("WHEELS node initialized")
    
    async def process(self, input_data: Dict[str, Any]) -> PamResponse:
        """Process travel-related requests"""
        if not self.database_service:
            await self.initialize()
        
        user_id = input_data.get('user_id')
        message = input_data.get('message', '').lower()
        intent = input_data.get('intent')
        entities = input_data.get('entities', {})
        
        try:
            if 'route' in message or 'drive' in message or 'directions' in message:
                return await self._handle_route_planning(user_id, message, entities)
            elif 'campground' in message or 'camping' in message or 'camp' in message:
                return await self._handle_campground_search(user_id, message, entities)
            elif 'fuel' in message or 'gas' in message or 'diesel' in message:
                return await self._handle_fuel_prices(user_id, message, entities)
            elif 'weather' in message:
                return await self._handle_weather_check(user_id, message, entities)
            elif 'maintenance' in message or 'service' in message or 'repair' in message:
                return await self._handle_maintenance_reminder(user_id, message, entities)
            else:
                return await self._handle_general_travel_query(user_id, message)
                
        except Exception as e:
            logger.error(f"WHEELS node processing error: {e}")
            return PamResponse(
                content="I'm having trouble accessing travel information right now. Please try again in a moment.",
                confidence=0.3,
                requires_followup=True
            )
    
    async def _handle_route_planning(self, user_id: str, message: str, entities: Dict[str, Any]) -> PamResponse:
        """Handle route planning requests"""
        destination = entities.get('destination')
        origin = entities.get('origin')
        
        if not destination:
            return PamResponse(
                content="I'd love to help you plan a route! Where are you headed?",
                confidence=0.7,
                suggestions=[
                    "Plan route to Yellowstone",
                    "Find scenic drive to California",
                    "Show me routes avoiding mountains"
                ],
                requires_followup=True
            )
        
        try:
            # Get user's vehicle info for route optimization
            query = """
                SELECT vehicle_type, fuel_type, preferences 
                FROM onboarding_responses 
                WHERE user_id = $1
            """
            
            user_info = await self.database_service.execute_single(query, user_id)
            
            # Search for relevant routes or attractions
            route_query = """
                SELECT route_name, route_description, distance_miles, estimated_time_hours,
                       difficulty_level, scenic_rating, vehicle_requirements
                FROM offroad_routes 
                WHERE route_description ILIKE $1 
                OR route_name ILIKE $1
                LIMIT 3
            """
            
            routes = await self.database_service.execute_query(
                route_query, f"%{destination}%", 
                cache_key=f"routes:{destination}", cache_ttl=3600
            )
            
            response_parts = [f"🗺️ Here's what I found for routes to {destination}:"]
            
            if routes:
                for route in routes:
                    response_parts.extend([
                        "",
                        f"📍 **{route['route_name']}**",
                        f"📏 Distance: {route['distance_miles']} miles",
                        f"⏱️ Time: {route['estimated_time_hours']} hours",
                        f"⭐ Scenic Rating: {route['scenic_rating']}/5",
                        f"📝 {route['route_description']}"
                    ])
                    
                    if route['difficulty_level']:
                        response_parts.append(f"🚧 Difficulty: {route['difficulty_level']}")
            else:
                response_parts.extend([
                    "",
                    f"I don't have specific route data for {destination} yet, but I can help you with:",
                    "• General driving tips for RVs",
                    "• Campground recommendations along the way", 
                    "• Fuel stop planning",
                    "• Weather considerations"
                ])
            
            # Add RV-specific advice
            if user_info and user_info.get('vehicle_type'):
                vehicle_type = user_info['vehicle_type']
                response_parts.extend([
                    "",
                    f"🚐 RV Tips for your {vehicle_type}:",
                    "• Check bridge heights and weight limits",
                    "• Plan for slower speeds on hills",
                    "• Book reservations ahead at popular destinations"
                ])
            
            return PamResponse(
                content="\n".join(response_parts),
                confidence=0.8,
                suggestions=[
                    f"Find campgrounds near {destination}",
                    "Check weather forecast",
                    "Show fuel stops along the way"
                ],
                requires_followup=False
            )
            
        except Exception as e:
            logger.error(f"Route planning error: {e}")
            return PamResponse(
                content=f"I'd recommend checking your favorite mapping app for the best route to {destination}. Don't forget to filter for RV-friendly roads and check for low bridges!",
                confidence=0.5,
                requires_followup=False
            )
    
    async def _handle_campground_search(self, user_id: str, message: str, entities: Dict[str, Any]) -> PamResponse:
        """Handle campground search requests"""
        location = entities.get('location')
        camp_type = entities.get('camp_type', 'any')
        
        if not location:
            return PamResponse(
                content="I can help you find great campgrounds! What area are you looking for?",
                confidence=0.7,
                suggestions=[
                    "Find campgrounds near me",
                    "Show free camping in Utah",
                    "RV parks with full hookups in Florida"
                ],
                requires_followup=True
            )
        
        try:
            # Search camping locations
            query = """
                SELECT name, type, address, price_per_night, user_ratings,
                       amenities, hookups, max_rig_length, reservation_required
                FROM camping_locations 
                WHERE address ILIKE $1 OR name ILIKE $1
                ORDER BY user_ratings DESC NULLS LAST, price_per_night ASC NULLS LAST
                LIMIT 5
            """
            
            campgrounds = await self.database_service.execute_query(
                query, f"%{location}%",
                cache_key=f"campgrounds:{location}", cache_ttl=1800
            )
            
            if not campgrounds:
                return PamResponse(
                    content=f"I don't have specific campground data for {location} yet. I recommend checking Campendium, iOverlander, or Recreation.gov for the most up-to-date options!",
                    confidence=0.6,
                    suggestions=[
                        "Try searching a nearby city",
                        "Look for state parks in the area",
                        "Check for free camping options"
                    ],
                    requires_followup=True
                )
            
            response_parts = [f"🏕️ Found {len(campgrounds)} campgrounds near {location}:"]
            
            for camp in campgrounds:
                response_parts.extend([
                    "",
                    f"📍 **{camp['name']}** ({camp['type']})",
                    f"📍 {camp['address']}"
                ])
                
                if camp['price_per_night']:
                    response_parts.append(f"💰 ${camp['price_per_night']}/night")
                elif camp['type'] == 'free':
                    response_parts.append("🆓 Free camping!")
                
                if camp['user_ratings']:
                    rating_stars = "⭐" * int(float(camp['user_ratings']))
                    response_parts.append(f"{rating_stars} {camp['user_ratings']}/5")
                
                if camp['max_rig_length']:
                    response_parts.append(f"🚐 Max RV: {camp['max_rig_length']} ft")
                
                if camp['hookups']:
                    hookups = camp['hookups']
                    if isinstance(hookups, dict):
                        hookup_list = [k for k, v in hookups.items() if v]
                        if hookup_list:
                            response_parts.append(f"🔌 Hookups: {', '.join(hookup_list)}")
                
                if camp['reservation_required']:
                    response_parts.append("📞 Reservations required")
            
            return PamResponse(
                content="\n".join(response_parts),
                confidence=0.8,
                suggestions=[
                    "Check availability",
                    "Get directions",
                    "Find more free camping",
                    "Show nearby attractions"
                ],
                requires_followup=False
            )
            
        except Exception as e:
            logger.error(f"Campground search error: {e}")
            return PamResponse(
                content="I recommend checking Campendium or Recreation.gov for campgrounds in that area. They have the most current availability and reviews!",
                confidence=0.5,
                requires_followup=False
            )
    
    async def _handle_fuel_prices(self, user_id: str, message: str, entities: Dict[str, Any]) -> PamResponse:
        """Handle fuel price requests"""
        location = entities.get('location')
        fuel_type = entities.get('fuel_type', 'regular')
        
        try:
            # Get fuel stations data
            query = """
                SELECT station_name, address, regular_price, diesel_price, 
                       premium_price, amenities, rv_friendly
                FROM fuel_stations 
                WHERE address ILIKE $1
                AND (regular_price IS NOT NULL OR diesel_price IS NOT NULL)
                ORDER BY regular_price ASC NULLS LAST
                LIMIT 5
            """
            
            stations = await self.database_service.execute_query(
                query, f"%{location or ''}%",
                cache_key=f"fuel:{location or 'general'}", cache_ttl=1800
            )
            
            if not stations and location:
                return PamResponse(
                    content=f"I don't have current fuel prices for {location}. I recommend using GasBuddy or Waze to find the cheapest stations nearby!",
                    confidence=0.6,
                    suggestions=[
                        "Use GasBuddy app",
                        "Check Pilot/Flying J locations",
                        "Look for Walmart gas stations"
                    ],
                    requires_followup=False
                )
            
            # Provide general fuel saving tips if no specific data
            if not stations:
                return PamResponse(
                    content="""⛽ Here are some fuel-saving tips for RVers:
                    
🏪 **Best Apps for Fuel Prices:**
- GasBuddy - Real-time prices and reviews
- Waze - Navigation with gas prices
- Gas Guru - Price comparison

🚛 **RV-Friendly Stations:**
- Pilot/Flying J - Big rig access
- Love's Travel Centers - RV lanes
- TA/Petro - Truck stops with space

💡 **Money-Saving Tips:**
- Fill up at truck stops (often cheaper diesel)
- Use loyalty programs (MyRewards, Good Sam)
- Avoid highway exit stations
- Drive 60-65 mph for best fuel economy""",
                    confidence=0.7,
                    suggestions=[
                        "Log my fuel purchase",
                        "Track my MPG",
                        "Find RV-friendly gas stations"
                    ],
                    requires_followup=False
                )
            
            response_parts = [f"⛽ Fuel stations near {location}:"]
            
            for station in stations:
                response_parts.extend([
                    "",
                    f"🏪 **{station['station_name']}**",
                    f"📍 {station['address']}"
                ])
                
                prices = []
                if station['regular_price']:
                    prices.append(f"Regular: ${station['regular_price']:.2f}")
                if station['diesel_price']:
                    prices.append(f"Diesel: ${station['diesel_price']:.2f}")
                if station['premium_price']:
                    prices.append(f"Premium: ${station['premium_price']:.2f}")
                
                if prices:
                    response_parts.append(f"💰 {' | '.join(prices)}")
                
                if station['rv_friendly']:
                    response_parts.append("🚐 RV Friendly")
                
                if station['amenities']:
                    amenities = station['amenities']
                    if isinstance(amenities, dict):
                        features = [k for k, v in amenities.items() if v]
                        if features:
                            response_parts.append(f"🛠️ {', '.join(features)}")
            
            return PamResponse(
                content="\n".join(response_parts),
                confidence=0.8,
                suggestions=[
                    "Log fuel purchase",
                    "Get directions",
                    "Find more stations",
                    "Track my fuel expenses"
                ],
                requires_followup=False
            )
            
        except Exception as e:
            logger.error(f"Fuel prices error: {e}")
            return PamResponse(
                content="For the most current fuel prices, I recommend using GasBuddy or checking at truck stops like Pilot/Flying J which are usually RV-friendly!",
                confidence=0.5,
                requires_followup=False
            )
    
    async def _handle_weather_check(self, user_id: str, message: str, entities: Dict[str, Any]) -> PamResponse:
        """Handle weather check requests"""
        location = entities.get('location')
        
        # Since we don't have real-time weather API, provide general guidance
        return PamResponse(
            content=f"""🌤️ For current weather information{f' in {location}' if location else ''}, I recommend:

📱 **Best Weather Apps for RVers:**
- Weather Underground - Detailed forecasts
- NOAA Weather Radar - Official forecasts
- WeatherBug - Real-time conditions
- Dark Sky - Hyper-local predictions

⚠️ **RV Weather Considerations:**
- High wind warnings (30+ mph)
- Severe thunderstorm alerts  
- Temperature extremes affecting propane/batteries
- Road conditions for mountain passes

🌡️ **Seasonal Travel Tips:**
- Summer: Avoid desert areas, seek elevation
- Winter: Watch for freezing temps, pipe protection
- Spring/Fall: Best travel weather in most areas

Would you like tips for weatherproofing your RV or preparing for specific conditions?""",
            confidence=0.7,
            suggestions=[
                "RV winterization tips",
                "Hot weather camping advice", 
                "Preparing for storms",
                "Best travel seasons by region"
            ],
            requires_followup=False
        )
    
    async def _handle_maintenance_reminder(self, user_id: str, message: str, entities: Dict[str, Any]) -> PamResponse:
        """Handle maintenance reminders and tracking"""
        try:
            # Get recent maintenance records
            query = """
                SELECT task, date, mileage, next_due_date, next_due_mileage, cost
                FROM maintenance_records 
                WHERE user_id = $1 
                ORDER BY date DESC 
                LIMIT 10
            """
            
            records = await self.database_service.execute_query(
                query, user_id,
                cache_key=f"maintenance:{user_id}", cache_ttl=3600
            )
            
            current_date = date.today()
            overdue_items = []
            upcoming_items = []
            
            if records:
                for record in records:
                    if record['next_due_date'] and record['next_due_date'] < current_date:
                        overdue_items.append(record)
                    elif record['next_due_date'] and record['next_due_date'] <= current_date + timedelta(days=30):
                        upcoming_items.append(record)
            
            response_parts = ["🔧 **RV Maintenance Status:**"]
