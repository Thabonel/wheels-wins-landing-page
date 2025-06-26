
"""
You Node - Personal profile and settings management
"""

import logging
from typing import Dict, List, Any
from datetime import datetime

from app.models.domain.pam import PamResponse, PamContext, PamMemory
from app.services.pam.nodes.base_node import BaseNode

logger = logging.getLogger("pam.you_node")

class YouNode(BaseNode):
    """Node for handling personal profile and settings"""
    
    def __init__(self):
        super().__init__("you")
    
    async def process(self, message: str, intent: Any, context: PamContext, 
                     memories: List[PamMemory]) -> PamResponse:
        """Process you-related requests"""
        try:
            return await self._handle_profile_request(message, context)
                
        except Exception as e:
            logger.error(f"You node processing failed: {str(e)}")
            return self._create_error_response("I had trouble with your profile request. Please try again.")
    
    async def _handle_profile_request(self, message: str, context: PamContext) -> PamResponse:
        """Handle profile and settings requests"""
        preferences = context.preferences or {}
        
        content = "Here are your personal settings:\n"
        if preferences:
            content += f"• Travel style: {preferences.get('travel_style', 'Not set')}\n"
            content += f"• Budget categories: {len(preferences.get('budget_categories', []))} configured"
        else:
            content += "Your profile needs some setup. Let's personalize your experience!"
        
        return PamResponse(
            content=content,
            intent=None,
            confidence=0.8,
            suggestions=[
                "Update travel preferences",
                "Modify budget categories",
                "Set vehicle information",
                "Configure notifications"
            ],
            actions=[
                {"type": "navigate", "target": "/you", "label": "Edit Profile"}
            ],
            requires_followup=False,
            context_updates={},
            voice_enabled=True
        )

# Create singleton instance
you_node = YouNode()
