"""
PersonalizedPamAgent - Unified AI agent with profile-aware context

This replaces all competing PAM implementations with a single, 
profile-aware agent that maintains user context and provides
personalized responses based on vehicle preferences and travel history.

Based on proven patterns from Claude Projects, LangChain agents, and OpenAI Assistants.
"""

import asyncio
import logging
from typing import Dict, List, Any, Optional
from datetime import datetime
from dataclasses import dataclass
from enum import Enum

from app.services.pam.tools.load_user_profile import LoadUserProfileTool
from app.services.pam.core import get_pam
from app.core.travel_domain.vehicle_capability_mapper import VehicleCapabilityMapper
from app.core.travel_domain.travel_mode_detector import TravelModeDetector
from app.core.travel_domain.travel_response_personalizer import TravelResponsePersonalizer

logger = logging.getLogger(__name__)


class ConversationMode(Enum):
    """Conversation modes based on user context"""
    RV_TRAVEL = "rv_travel"          # User owns overland-capable vehicle
    GENERAL_TRAVEL = "general_travel" # Standard travel recommendations
    BUDGET_FOCUSED = "budget_focused" # Money-saving priorities
    LUXURY_FOCUSED = "luxury_focused" # Comfort/convenience priorities
    ACCESSIBILITY = "accessibility"   # Special accessibility needs


@dataclass
class UserContext:
    """Complete user context for personalized responses"""
    user_id: str
    profile: Dict[str, Any]
    vehicle_info: Dict[str, Any]
    travel_preferences: Dict[str, Any]
    conversation_history: List[Dict[str, Any]]
    conversation_mode: ConversationMode
    
    # Dynamic properties
    is_rv_traveler: bool
    vehicle_capabilities: Dict[str, Any]
    preferred_transport_modes: List[str]


class PersonalizedPamAgent:
    """
    Unified PAM agent that replaces all competing implementations
    
    Key Features:
    1. Profile-aware system prompt generation
    2. Vehicle-specific travel routing
    3. Persistent conversation context
    4. Intelligent tool selection
    5. Personalized response generation
    """
    
    def __init__(self, user_jwt: str = None):
        # Initialize tools with user JWT for proper database authentication
        self.user_jwt = user_jwt
        self.profile_tool = LoadUserProfileTool(user_jwt=user_jwt)
        self.vehicle_mapper = VehicleCapabilityMapper()
        self.travel_detector = TravelModeDetector()
        self.response_personalizer = TravelResponsePersonalizer()

        # Context cache for conversation persistence
        self.user_contexts: Dict[str, UserContext] = {}

        logger.info(f"🤖 PersonalizedPamAgent initialized {'with user authentication context' if user_jwt else 'with service role fallback'}")
    
    async def process_message(
        self,
        user_id: str,
        message: str,
        session_id: Optional[str] = None,
        additional_context: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Main entry point - processes user message with full personalization
        """
        try:
            # Step 1: Load or get cached user context
            user_context = await self._get_user_context(user_id)
            
            # Step 2: Detect intent and travel mode
            travel_mode = await self.travel_detector.detect_mode(
                message, user_context.vehicle_info
            )
            
            # Step 3: Generate personalized system prompt
            system_prompt = self._build_personalized_prompt(user_context, travel_mode)
            
            # Step 4: Process with AI using personalized context
            ai_response = await self._process_with_ai(
                message, system_prompt, user_context, travel_mode
            )
            
            # Step 5: Personalize response with vehicle context
            personalized_response = await self.response_personalizer.enhance_response(
                ai_response, user_context, travel_mode
            )
            
            # Step 6: Update conversation history
            await self._update_conversation_history(
                user_context, message, personalized_response
            )
            
            logger.info(f"✅ Processed message for {user_id}: {travel_mode.value} mode")
            return personalized_response
            
        except Exception as e:
            logger.error(f"❌ Error processing message for {user_id}: {e}")
            return {
                "content": "I'm having trouble processing your request. Please try again.",
                "error": str(e),
                "success": False
            }
    
    async def _get_user_context(self, user_id: str) -> UserContext:
        """Load or retrieve cached user context"""
        
        # Check cache first
        if user_id in self.user_contexts:
            return self.user_contexts[user_id]
        
        # Load fresh profile
        profile_result = await self.profile_tool.execute(user_id)
        
        if not profile_result.get("success") or not profile_result.get("result", {}).get("profile_exists"):
            # Create minimal context for users without profiles
            return UserContext(
                user_id=user_id,
                profile={},
                vehicle_info={},
                travel_preferences={},
                conversation_history=[],
                conversation_mode=ConversationMode.GENERAL_TRAVEL,
                is_rv_traveler=False,
                vehicle_capabilities={},
                preferred_transport_modes=["flight", "train", "bus"]
            )
        
        profile_data = profile_result["result"]
        vehicle_info = profile_data.get("vehicle_info", {})
        
        # Analyze vehicle capabilities
        vehicle_capabilities = await self.vehicle_mapper.analyze_capabilities(vehicle_info)
        
        # Determine conversation mode
        conversation_mode = self._determine_conversation_mode(profile_data, vehicle_capabilities)
        
        # Build complete context
        user_context = UserContext(
            user_id=user_id,
            profile=profile_data,
            vehicle_info=vehicle_info,
            travel_preferences=profile_data.get("travel_preferences", {}),
            conversation_history=[],
            conversation_mode=conversation_mode,
            is_rv_traveler=vehicle_capabilities.get("is_rv_capable", False),
            vehicle_capabilities=vehicle_capabilities,
            preferred_transport_modes=self._get_preferred_transport_modes(vehicle_capabilities)
        )
        
        # Cache context
        self.user_contexts[user_id] = user_context
        
        logger.info(f"🔄 Loaded user context for {user_id}: {conversation_mode.value} mode")
        return user_context
    
    def _build_personalized_prompt(
        self, 
        user_context: UserContext, 
        travel_mode: str
    ) -> str:
        """
        BUILD PERSONALIZED SYSTEM PROMPT - This is the KEY fix!
        
        This is where profile context gets injected into AI instructions
        """
        
        base_prompt = """You are PAM, a highly personalized travel and lifestyle assistant."""
        
        # CRITICAL: Inject user-specific context
        if user_context.vehicle_info:
            vehicle_type = user_context.vehicle_info.get("type", "unknown")
            vehicle_name = user_context.vehicle_info.get("make_model_year", "")
            
            if user_context.is_rv_traveler:
                base_prompt += f"""
                
IMPORTANT USER CONTEXT:
- User owns a {vehicle_type.upper()} ({vehicle_name})
- This is an overland-capable vehicle suitable for RV/expedition travel
- User prefers overland routes over flights when their vehicle can handle the journey
- For trip planning, prioritize ferry connections and overland routes
- NEVER suggest flights for routes their vehicle can reasonably handle
- Always mention their vehicle when relevant to travel planning
                """
            else:
                base_prompt += f"""
                
IMPORTANT USER CONTEXT:
- User owns a {vehicle_type} ({vehicle_name})
- Consider their vehicle capabilities when making travel recommendations
                """
        
        # Add travel preferences
        if user_context.travel_preferences:
            prefs = user_context.travel_preferences
            base_prompt += f"""
            
USER TRAVEL PREFERENCES:
- Style: {prefs.get('style', 'balanced')}
- Camping: {', '.join(prefs.get('camp_types', []))}
- Daily drive limit: {prefs.get('drive_limit_per_day', 'flexible')}
            """
        
        # Add conversation mode context
        if user_context.conversation_mode == ConversationMode.RV_TRAVEL:
            base_prompt += """
            
RV TRAVEL MODE:
- Focus on overland routes and ferry connections
- Suggest RV parks, camping grounds, and vehicle-friendly accommodations
- Consider fuel stops, vehicle maintenance, and road conditions
- Provide detailed logistics for overland vehicle travel
            """
        
        # Add specific instructions for travel mode
        if travel_mode == "OVERLAND_VEHICLE":
            base_prompt += """
            
OVERLAND VEHICLE TRAVEL DETECTED:
- This user has specifically requested travel planning with their overland vehicle
- Prioritize ferry connections over flights (e.g., for Tasmania travel)
- Provide vehicle-specific routing and accommodation advice
- Include fuel planning, road conditions, and vehicle restrictions
            """
        
        base_prompt += """
        
Respond naturally and conversationally, always considering the user's specific context and vehicle capabilities.
        """
        
        return base_prompt
    
    def _determine_conversation_mode(
        self, 
        profile_data: Dict[str, Any], 
        vehicle_capabilities: Dict[str, Any]
    ) -> ConversationMode:
        """Determine conversation mode based on user profile"""
        
        if vehicle_capabilities.get("is_rv_capable", False):
            return ConversationMode.RV_TRAVEL
        
        if profile_data.get("budget_preferences", {}).get("priority") == "budget":
            return ConversationMode.BUDGET_FOCUSED
        
        if profile_data.get("accessibility_needs"):
            return ConversationMode.ACCESSIBILITY
        
        return ConversationMode.GENERAL_TRAVEL
    
    def _get_preferred_transport_modes(
        self, 
        vehicle_capabilities: Dict[str, Any]
    ) -> List[str]:
        """Get preferred transport modes based on vehicle capabilities"""
        
        modes = []
        
        if vehicle_capabilities.get("is_rv_capable", False):
            modes.extend(["overland", "ferry"])
        
        # Always include other options as alternatives
        modes.extend(["flight", "train", "bus"])
        
        return modes
    
    async def _process_with_ai(
        self,
        message: str,
        system_prompt: str,
        user_context: UserContext,
        travel_mode: str
    ) -> Dict[str, Any]:
        """Process message with PAM (Claude Sonnet 4.5 + 40 tools)"""

        try:
            logger.info(f"🤖 [PAM] Getting PAM instance for user: {user_context.user_id}")

            # Get PAM instance for this user
            pam = await get_pam(user_context.user_id)
            logger.info(f"✅ [PAM] PAM instance created successfully")

            # Use PAM's chat method (has Claude + tools + error handling)
            logger.info(f"📨 [PAM] Calling pam.chat() with message: {message[:50]}...")
            response = await pam.chat(
                message=message,
                context={
                    "travel_mode": travel_mode,
                    "conversation_mode": user_context.conversation_mode.value,
                    "vehicle_info": user_context.vehicle_info
                },
                stream=False
            )

            logger.info(f"✅ [PAM] Response received (length: {len(str(response))})")

            return {
                "content": response,
                "success": True,
                "travel_mode": travel_mode,
                "conversation_mode": user_context.conversation_mode.value
            }
        except Exception as e:
            logger.error(f"❌ [PAM] Error in _process_with_ai: {type(e).__name__}: {e}", exc_info=True)
            logger.error(f"❌ [PAM] user_context.user_id type: {type(user_context.user_id)}")
            logger.error(f"❌ [PAM] user_context.user_id value: {user_context.user_id}")
            return {
                "content": "I'm having trouble processing your request. Please try again.",
                "success": False,
                "error": str(e)
            }
    
    async def _update_conversation_history(
        self,
        user_context: UserContext,
        user_message: str,
        assistant_response: Dict[str, Any]
    ):
        """Update conversation history for context persistence"""
        
        user_context.conversation_history.extend([
            {
                "sender": "user",
                "content": user_message,
                "timestamp": datetime.utcnow().isoformat()
            },
            {
                "sender": "assistant", 
                "content": assistant_response.get("content", ""),
                "timestamp": datetime.utcnow().isoformat()
            }
        ])
        
        # Keep only recent history
        if len(user_context.conversation_history) > 20:
            user_context.conversation_history = user_context.conversation_history[-20:]
    
    async def get_health_status(self) -> Dict[str, Any]:
        """Health check for the unified agent"""
        return {
            "status": "healthy",
            "agent": "PersonalizedPamAgent",
            "cached_users": len(self.user_contexts),
            "timestamp": datetime.utcnow().isoformat()
        }


# Global instance (service role fallback)
personalized_pam_agent = PersonalizedPamAgent()


def create_user_context_pam_agent(user_jwt: str) -> PersonalizedPamAgent:
    """Create a PersonalizedPamAgent with user authentication context"""
    return PersonalizedPamAgent(user_jwt=user_jwt)