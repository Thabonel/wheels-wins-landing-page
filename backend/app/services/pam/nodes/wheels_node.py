
"""
Wheels Node - Travel planning and route management
"""

import logging
from typing import Dict, List, Any, Optional
from datetime import datetime, date

from app.models.domain.pam import PamResponse, PamContext, PamMemory
from app.services.pam.nodes.base_node import BaseNode
from app.services.database import DatabaseService
from app.services.cache import CacheService
from app.core.exceptions import ValidationError, DatabaseError
from pydantic import BaseModel, Field

logger = logging.getLogger("pam.wheels_node")

class TripPlanRequest(BaseModel):
    origin: str = Field(..., min_length=1)
    destination: str = Field(..., min_length=1)
    start_date: Optional[date] = None

class RouteRequest(BaseModel):
    origin: str = Field(..., min_length=1)
    destination: str = Field(..., min_length=1)

class WheelsNode(BaseNode):
    """Node for handling travel and route planning"""
    
    def __init__(self):
        super().__init__("wheels")
        self.db_service = DatabaseService()
        self.cache_service = CacheService()
    
    async def process(self, message: str, intent: Any, context: PamContext, 
                     memories: List[PamMemory]) -> PamResponse:
        """Process wheels-related requests"""
        start_time = datetime.now()
        
        try:
            # Input validation
            if not message or not message.strip():
                raise ValidationError("Message cannot be empty")
            
            action = getattr(intent, 'action', None)
            if action:
                action = action.value if hasattr(action, 'value') else str(action)
            else:
                action = 'view'
            
            self.logger.info(f"Processing wheels request with action: {action}")
            
            if action == 'plan':
                response = await self._handle_route_planning(message, context)
            elif action == 'track':
                response = await self._handle_travel_tracking(message, context)
            else:
                response = await self._handle_view_travel(message, context)
            
            # Performance logging
            processing_time = (datetime.now() - start_time).total_seconds() * 1000
            self.logger.info(f"Wheels node processed request in {processing_time:.2f}ms")
            
            self._log_processing(message, response)
            return response
                
        except ValidationError as e:
            logger.error(f"Validation error in wheels node: {str(e)}")
            return self._create_error_response(f"Invalid input: {str(e)}")
        except DatabaseError as e:
            logger.error(f"Database error in wheels node: {str(e)}")
            return self._create_error_response("I had trouble accessing your travel data. Please try again.")
        except Exception as e:
            logger.error(f"Wheels node processing failed: {str(e)}")
            return self._create_error_response("I had trouble with your travel request. Please try again.")
    
    async def _handle_route_planning(self, message: str, context: PamContext) -> PamResponse:
        """Handle route planning request with real data"""
        try:
            user_id = context.user_id
            if not user_id:
                raise ValidationError("User ID is required for route planning")
            
            # Get user's recent trips and favorite destinations
            cache_key = f"recent_trips:{user_id}"
            cached_trips = await self.cache_service.get(cache_key)
            
            if not cached_trips:
                recent_trips = await self.db_service.get_recent_trips(user_id, limit=3)
                await self.cache_service.set(cache_key, [trip.model_dump() for trip in recent_trips], ttl=600)
            else:
                recent_trips = cached_trips
            
            # Get popular camping locations
            popular_locations = await self.db_service.get_popular_camping_locations(limit=4)
            
            suggestions = [
                "Plan trip to Yellowstone",
                "Find campgrounds nearby",
                "Route to Grand Canyon", 
                "Show fuel stops"
            ]
            
            # Add suggestions based on user's travel history
            if recent_trips:
                for trip in recent_trips[:2]:
                    destination = trip.get('destination', {}).get('name', '')
                    if destination:
                        suggestions.append(f"Return to {destination}")
            
            # Add popular destinations
            if popular_locations:
                for location in popular_locations[:2]:
                    suggestions.append(f"Visit {location.get('name', 'popular spot')}")
            
            return PamResponse(
                content="I'll help you plan your route! Where would you like to go?",
                intent=None,
                confidence=0.9,
                suggestions=suggestions,
                actions=[
                    {"type": "navigate", "target": "/wheels", "label": "Open Route Planner"}
                ],
                requires_followup=True,
                context_updates={"route_planning_started": True},
                voice_enabled=True
            )
            
        except Exception as e:
            logger.error(f"Error in route planning: {str(e)}")
            return self._create_error_response("I had trouble accessing your travel data.")
    
    async def _handle_travel_tracking(self, message: str, context: PamContext) -> PamResponse:
        """Handle travel tracking request with real data"""
        try:
            user_id = context.user_id
            if not user_id:
                raise ValidationError("User ID is required for travel tracking")
            
            # Get recent fuel logs and maintenance records
            recent_fuel = await self.db_service.get_recent_fuel_logs(user_id, limit=3)
            maintenance_due = await self.db_service.get_maintenance_due(user_id)
            
            suggestions = [
                "Log fuel stop",
                "Record mileage",
                "Add campground review",
                "Note maintenance needed"
            ]
            
            # Add contextual suggestions based on data
            if recent_fuel:
                last_fuel = recent_fuel[0]
                suggestions.append(f"Update from {last_fuel.location}")
            
            if maintenance_due:
                next_maintenance = maintenance_due[0]
                suggestions.append(f"Schedule {next_maintenance.task}")
            
            return PamResponse(
                content="Let's track your travel! What would you like to log?",
                intent=None,
                confidence=0.9,
                suggestions=suggestions,
                actions=[
                    {"type": "navigate", "target": "/wheels", "label": "Travel Log"}
                ],
                requires_followup=True,
                context_updates={"travel_tracking_started": True},
                voice_enabled=True
            )
            
        except Exception as e:
            logger.error(f"Error in travel tracking: {str(e)}")
            return self._create_error_response("I had trouble accessing your tracking data.")
    
    async def _handle_view_travel(self, message: str, context: PamContext) -> PamResponse:
        """Handle travel overview request with real data"""
        try:
            user_id = context.user_id
            if not user_id:
                return PamResponse(
                    content="I need you to be logged in to show your travel overview.",
                    intent=None,
                    confidence=0.8,
                    suggestions=["Log in to view travel data"],
                    actions=[],
                    requires_followup=False,
                    context_updates={},
                    voice_enabled=True
                )
            
            # Get real travel data
            cache_key = f"travel_overview:{user_id}"
            cached_data = await self.cache_service.get(cache_key)
            
            if not cached_data:
                active_trips = await self.db_service.get_active_trips(user_id)
                next_trip = await self.db_service.get_next_planned_trip(user_id)
                
                travel_data = {
                    'active_trips': len(active_trips),
                    'next_destination': next_trip.destination.name if next_trip and next_trip.destination else None
                }
                await self.cache_service.set(cache_key, travel_data, ttl=300)
            else:
                travel_data = cached_data
            
            # Build content based on real data
            content = "Here's your travel overview:\n"
            
            if travel_data.get('active_trips', 0) > 0:
                content += f"• Active trips: {travel_data['active_trips']}\n"
                if travel_data.get('next_destination'):
                    content += f"• Next destination: {travel_data['next_destination']}"
                else:
                    content += "• Next destination: Check your planned trips"
            else:
                content += "No active travel plans. Ready to plan your next adventure?"
            
            suggestions = [
                "Plan new trip",
                "View travel history",
                "Find campgrounds",
                "Check vehicle maintenance"
            ]
            
            return PamResponse(
                content=content,
                intent=None,
                confidence=0.8,
                suggestions=suggestions,
                actions=[
                    {"type": "navigate", "target": "/wheels", "label": "Travel Dashboard"}
                ],
                requires_followup=False,
                context_updates={},
                voice_enabled=True
            )
            
        except Exception as e:
            logger.error(f"Error in travel overview: {str(e)}")
            return self._create_error_response("I had trouble accessing your travel data.")

# Create singleton instance
wheels_node = WheelsNode()
