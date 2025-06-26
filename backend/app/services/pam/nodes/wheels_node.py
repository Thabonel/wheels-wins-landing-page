
"""
Wheels Node - Travel planning and route management
"""

import logging
from typing import Dict, List, Any
from datetime import datetime

from app.models.domain.pam import PamResponse, PamContext, PamMemory
from app.services.pam.nodes.base_node import BaseNode

logger = logging.getLogger("pam.wheels_node")

class WheelsNode(BaseNode):
    """Node for handling travel and route planning"""
    
    def __init__(self):
        super().__init__("wheels")
    
    async def process(self, message: str, intent: Any, context: PamContext, 
                     memories: List[PamMemory]) -> PamResponse:
        """Process wheels-related requests"""
        try:
            action = intent.action.value if hasattr(intent, 'action') else 'view'
            
            if action == 'plan':
                return await self._handle_route_planning(message, context)
            elif action == 'track':
                return await self._handle_travel_tracking(message, context)
            else:
                return await self._handle_view_travel(message, context)
                
        except Exception as e:
            logger.error(f"Wheels node processing failed: {str(e)}")
            return self._create_error_response("I had trouble with your travel request. Please try again.")
    
    async def _handle_route_planning(self, message: str, context: PamContext) -> PamResponse:
        """Handle route planning request"""
        return PamResponse(
            content="I'll help you plan your route! Where would you like to go?",
            intent=None,
            confidence=0.9,
            suggestions=[
                "Plan trip to Yellowstone",
                "Find campgrounds nearby",
                "Route to Grand Canyon",
                "Show fuel stops"
            ],
            actions=[
                {"type": "navigate", "target": "/wheels", "label": "Open Route Planner"}
            ],
            requires_followup=True,
            context_updates={"route_planning_started": True},
            voice_enabled=True
        )
    
    async def _handle_travel_tracking(self, message: str, context: PamContext) -> PamResponse:
        """Handle travel tracking request"""
        return PamResponse(
            content="Let's track your travel! What would you like to log?",
            intent=None,
            confidence=0.9,
            suggestions=[
                "Log fuel stop",
                "Record mileage",
                "Add campground review",
                "Note maintenance needed"
            ],
            actions=[
                {"type": "navigate", "target": "/wheels", "label": "Travel Log"}
            ],
            requires_followup=True,
            context_updates={"travel_tracking_started": True},
            voice_enabled=True
        )
    
    async def _handle_view_travel(self, message: str, context: PamContext) -> PamResponse:
        """Handle travel overview request"""
        travel_plans = context.travel_plans or {}
        
        content = "Here's your travel overview:\n"
        if travel_plans:
            content += f"• Active trips: {travel_plans.get('active_trips', 0)}\n"
            content += f"• Next destination: {travel_plans.get('next_destination', 'None planned')}"
        else:
            content += "No active travel plans. Ready to plan your next adventure?"
        
        return PamResponse(
            content=content,
            intent=None,
            confidence=0.8,
            suggestions=[
                "Plan new trip",
                "View travel history",
                "Find campgrounds",
                "Check vehicle maintenance"
            ],
            actions=[
                {"type": "navigate", "target": "/wheels", "label": "Travel Dashboard"}
            ],
            requires_followup=False,
            context_updates={},
            voice_enabled=True
        )

# Create singleton instance
wheels_node = WheelsNode()
