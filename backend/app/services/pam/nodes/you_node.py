
"""
You Node - Personal profile and settings management
"""

import logging
from typing import Dict, List, Any, Optional
from datetime import datetime

from app.models.domain.pam import PamResponse, PamContext, PamMemory
from app.services.pam.nodes.base_node import BaseNode
from app.services.database import DatabaseService
from app.services.cache import CacheService
from app.core.exceptions import ValidationError, DatabaseError
from pydantic import BaseModel, Field

logger = logging.getLogger("pam.you_node")

class ProfileUpdateRequest(BaseModel):
    field: str = Field(..., min_length=1)
    value: str = Field(..., min_length=1)

class PreferenceRequest(BaseModel):
    category: str = Field(..., min_length=1)
    preferences: Dict[str, Any] = Field(...)

class YouNode(BaseNode):
    """Node for handling personal profile and settings"""
    
    def __init__(self):
        super().__init__("you")
        self.db_service = DatabaseService()
        self.cache_service = CacheService()
    
    async def process(self, message: str, intent: Any, context: PamContext, 
                     memories: List[PamMemory]) -> PamResponse:
        """Process you-related requests"""
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
            
            self.logger.info(f"Processing you request with action: {action}")
            
            if action == 'update':
                response = await self._handle_profile_update(message, context)
            elif action == 'preferences':
                response = await self._handle_preferences(message, context)
            else:
                response = await self._handle_profile_view(message, context)
            
            # Performance logging
            processing_time = (datetime.now() - start_time).total_seconds() * 1000
            self.logger.info(f"You node processed request in {processing_time:.2f}ms")
            
            self._log_processing(message, response)
            return response
                
        except ValidationError as e:
            logger.error(f"Validation error in you node: {str(e)}")
            return self._create_error_response(f"Invalid input: {str(e)}")
        except DatabaseError as e:
            logger.error(f"Database error in you node: {str(e)}")
            return self._create_error_response("I had trouble accessing your profile data. Please try again.")
        except Exception as e:
            logger.error(f"You node processing failed: {str(e)}")
            return self._create_error_response("I had trouble with your profile request. Please try again.")
    
    async def _handle_profile_update(self, message: str, context: PamContext) -> PamResponse:
        """Handle profile update request with real data"""
        try:
            user_id = context.user_id
            if not user_id:
                raise ValidationError("User ID is required for profile updates")
                
            # Get current profile data
            cache_key = f"profile:{user_id}"
            cached_profile = await self.cache_service.get(cache_key)
            
            if not cached_profile:
                profile = await self.db_service.get_user_profile(user_id)
                if profile:
                    await self.cache_service.set(cache_key, profile.model_dump(), ttl=600)
                    profile_data = profile.model_dump()
                else:
                    profile_data = {}
            else:
                profile_data = cached_profile
            
            # Suggest fields that can be updated
            suggestions = [
                "Update travel style",
                "Modify vehicle info",
                "Set budget preferences",
                "Update notification settings"
            ]
            
            # Add suggestions based on current profile completeness
            if not profile_data.get('travel_style'):
                suggestions.insert(0, "Set your travel style")
            if not profile_data.get('vehicle_type'):
                suggestions.insert(1, "Add vehicle information")
                
            return PamResponse(
                content="I can help you update your profile! What would you like to change?",
                intent=None,
                confidence=0.9,
                suggestions=suggestions,
                actions=[
                    {"type": "navigate", "target": "/you", "label": "Edit Profile"}
                ],
                requires_followup=True,
                context_updates={"profile_update_started": True},
                voice_enabled=True
            )
            
        except Exception as e:
            logger.error(f"Error in profile update: {str(e)}")
            return self._create_error_response("I had trouble accessing your profile.")
    
    async def _handle_preferences(self, message: str, context: PamContext) -> PamResponse:
        """Handle preferences request with real data"""
        try:
            user_id = context.user_id
            if not user_id:
                raise ValidationError("User ID is required for preferences")
            
            # Get current preferences
            preferences = await self.db_service.get_user_preferences(user_id)
            
            suggestions = [
                "Set travel preferences",
                "Configure notifications",
                "Privacy settings",
                "App preferences"
            ]
            
            # Add contextual suggestions based on current preferences
            if preferences:
                if not preferences.get('notifications', {}).get('pam_voice_enabled'):
                    suggestions.insert(0, "Enable voice responses")
                if not preferences.get('travel', {}).get('default_radius'):
                    suggestions.insert(1, "Set search radius")
            
            return PamResponse(
                content="Let's customize your preferences! What settings would you like to adjust?",
                intent=None,
                confidence=0.9,
                suggestions=suggestions,
                actions=[
                    {"type": "navigate", "target": "/you", "label": "Preferences"}
                ],
                requires_followup=True,
                context_updates={"preferences_started": True},
                voice_enabled=True
            )
            
        except Exception as e:
            logger.error(f"Error in preferences: {str(e)}")
            return self._create_error_response("I had trouble accessing your preferences.")
    
    async def _handle_profile_view(self, message: str, context: PamContext) -> PamResponse:
        """Handle profile view request with real data"""
        try:
            user_id = context.user_id
            if not user_id:
                return PamResponse(
                    content="I need you to be logged in to show your profile information.",
                    intent=None,
                    confidence=0.8,
                    suggestions=["Log in to view profile"],
                    actions=[],
                    requires_followup=False,
                    context_updates={},
                    voice_enabled=True
                )
            
            # Get real profile data
            cache_key = f"full_profile:{user_id}"
            cached_data = await self.cache_service.get(cache_key)
            
            if not cached_data:
                profile = await self.db_service.get_user_profile(user_id)
                preferences = await self.db_service.get_user_preferences(user_id)
                onboarding = await self.db_service.get_onboarding_data(user_id)
                
                profile_data = {
                    'profile': profile.model_dump() if profile else {},
                    'preferences': preferences or {},
                    'onboarding': onboarding.model_dump() if onboarding else {}
                }
                await self.cache_service.set(cache_key, profile_data, ttl=600)
            else:
                profile_data = cached_data
            
            # Build content based on real data
            content = "Here are your personal settings:\n"
            
            profile = profile_data.get('profile', {})
            onboarding = profile_data.get('onboarding', {})
            preferences = profile_data.get('preferences', {})
            
            if onboarding.get('travel_style'):
                content += f"• Travel style: {onboarding['travel_style']}\n"
            else:
                content += "• Travel style: Not set\n"
                
            if onboarding.get('vehicle_type'):
                content += f"• Vehicle: {onboarding['vehicle_type']}\n"
            else:
                content += "• Vehicle: Not specified\n"
                
            budget_categories = len(preferences.get('budget_categories', []))
            content += f"• Budget categories: {budget_categories} configured"
            
            if not any([onboarding.get('travel_style'), onboarding.get('vehicle_type'), budget_categories > 0]):
                content = "Your profile needs some setup. Let's personalize your experience!"
            
            suggestions = [
                "Update travel preferences",
                "Modify budget categories", 
                "Set vehicle information",
                "Configure notifications"
            ]
            
            return PamResponse(
                content=content,
                intent=None,
                confidence=0.8,
                suggestions=suggestions,
                actions=[
                    {"type": "navigate", "target": "/you", "label": "Edit Profile"}
                ],
                requires_followup=False,
                context_updates={},
                voice_enabled=True
            )
            
        except Exception as e:
            logger.error(f"Error in profile view: {str(e)}")
            return self._create_error_response("I had trouble accessing your profile data.")

# Create singleton instance
you_node = YouNode()
