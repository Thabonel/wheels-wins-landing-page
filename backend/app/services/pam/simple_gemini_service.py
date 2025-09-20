"""
Simple Direct Gemini Service
A lightweight, reliable fallback service that directly calls Gemini API
without any complex orchestrator dependencies.
"""

import json
import logging
from typing import Dict, Any, Optional
from datetime import datetime

# Import Gemini directly - minimal dependencies
try:
    import google.generativeai as genai
    GEMINI_AVAILABLE = True
except ImportError:
    GEMINI_AVAILABLE = False
    genai = None

from app.core.infra_config import get_infra_settings
from app.services.pam.tools.load_user_profile import LoadUserProfileTool

logger = logging.getLogger(__name__)
infra_settings = get_infra_settings()


class SimpleGeminiService:
    """
    Simple, reliable Gemini service with direct API calls.
    No orchestrator, no complex provider abstractions - just works.
    """

    def __init__(self):
        self.model = None
        self.is_initialized = False
        self._api_key = None

    async def initialize(self) -> bool:
        """Initialize the simple Gemini service"""
        try:
            logger.info("🧠 Initializing Simple Gemini Service...")

            if not GEMINI_AVAILABLE:
                logger.error("❌ Gemini package not available (google.generativeai)")
                return False

            # Get API key from infra settings
            if hasattr(infra_settings, 'GEMINI_API_KEY') and infra_settings.GEMINI_API_KEY:
                if hasattr(infra_settings.GEMINI_API_KEY, 'get_secret_value'):
                    self._api_key = infra_settings.GEMINI_API_KEY.get_secret_value()
                else:
                    self._api_key = str(infra_settings.GEMINI_API_KEY)

                logger.info(f"🔑 Gemini API key available: {len(self._api_key)} characters")
            else:
                logger.error("❌ GEMINI_API_KEY not found in infra_settings")
                return False

            # Configure Gemini
            genai.configure(api_key=self._api_key)

            # Initialize model
            self.model = genai.GenerativeModel('gemini-1.5-flash')

            # Test the model with a simple request
            test_response = self.model.generate_content("Hello! Just testing the connection.")
            if test_response and test_response.text:
                logger.info("✅ Simple Gemini Service initialized successfully")
                logger.info(f"✅ Test response: {test_response.text[:50]}...")
                self.is_initialized = True
                return True
            else:
                logger.error("❌ Gemini test request failed - no response")
                return False

        except Exception as e:
            logger.error(f"❌ Simple Gemini Service initialization failed: {e}")
            return False

    async def generate_response(self, message: str, context: Optional[Dict[str, Any]] = None, user_id: Optional[str] = None, user_jwt: Optional[str] = None) -> str:
        """
        Generate a response using Gemini directly.
        Simple, reliable, no complex orchestration.
        Now includes profile access for personalized responses.
        """
        if not self.is_initialized or not self.model:
            return "I'm having trouble connecting to my AI service. Please try again in a moment."

        try:
            # Check if user is asking about their profile/personal information
            profile_data = None
            if user_id and user_jwt and self._is_profile_query(message):
                logger.info(f"🔍 Detected profile query, loading user data for: {user_id}")
                profile_data = await self._load_user_profile(user_id, user_jwt)

            # Create enhanced prompt with context and profile data
            enhanced_prompt = self._build_prompt(message, context, profile_data)

            logger.info(f"🤖 Generating Gemini response for: {message[:50]}...")

            # Generate response
            response = self.model.generate_content(enhanced_prompt)

            if response and response.text:
                response_text = response.text.strip()
                logger.info(f"✅ Gemini response: {response_text[:100]}...")
                return response_text
            else:
                logger.warning("⚠️ Gemini returned empty response")
                return "I received your message but couldn't generate a proper response. Please try rephrasing your question."

        except Exception as e:
            logger.error(f"❌ Gemini response generation failed: {e}")
            return f"I'm experiencing technical difficulties: {str(e)[:100]}. Please try again."

    def _build_prompt(self, message: str, context: Optional[Dict[str, Any]] = None, profile_data: Optional[Dict[str, Any]] = None) -> str:
        """Build an enhanced prompt with context and profile information"""

        # Base PAM personality
        base_prompt = """You are PAM (Personal Assistant Manager), a helpful AI assistant for Wheels & Wins, a platform for RV travelers and digital nomads.

Key traits:
- Helpful, friendly, and knowledgeable about RV travel, budgeting, and digital nomad lifestyle
- Provide practical advice for travel planning, expense tracking, and mobile living
- Keep responses concise but informative
- If you don't know something, admit it and suggest alternatives

"""

        # Add user profile information if available
        if profile_data and profile_data.get('success'):
            user_profile = profile_data.get('data', {})
            if user_profile.get('profile_exists'):
                base_prompt += "\nUser Profile Information:\n"

                # Personal details
                personal = user_profile.get('personal_details', {})
                if personal.get('full_name'):
                    base_prompt += f"- Name: {personal['full_name']}\n"
                if personal.get('nickname'):
                    base_prompt += f"- Preferred name: {personal['nickname']}\n"
                if personal.get('region'):
                    base_prompt += f"- Region: {personal['region']}\n"

                # Vehicle information
                vehicle = user_profile.get('vehicle_info', {})
                if vehicle.get('type'):
                    base_prompt += f"- Vehicle: {vehicle['type']}"
                    if vehicle.get('make_model_year'):
                        base_prompt += f" ({vehicle['make_model_year']})"
                    base_prompt += "\n"
                if vehicle.get('fuel_type'):
                    base_prompt += f"- Fuel type: {vehicle['fuel_type']}\n"

                # Travel preferences
                travel = user_profile.get('travel_preferences', {})
                if travel.get('style'):
                    base_prompt += f"- Travel style: {travel['style']}\n"
                if travel.get('camp_types'):
                    base_prompt += f"- Preferred camping: {', '.join(travel['camp_types'])}\n"

                base_prompt += "\n"

        # Add context if available
        if context:
            context_info = []

            # Add user location if available
            if context.get('userLocation'):
                location = context['userLocation']
                context_info.append(f"User location: {location.get('city', 'Unknown')}, {location.get('country', 'Unknown')}")

            # Add environment context
            if context.get('environment'):
                context_info.append(f"Environment: {context['environment']}")

            # Add timestamp
            context_info.append(f"Current time: {datetime.utcnow().isoformat()}")

            if context_info:
                base_prompt += f"Context: {' | '.join(context_info)}\n"

        # Add the user's message
        base_prompt += f"\nUser: {message}\nPAM:"

        return base_prompt

    def _is_profile_query(self, message: str) -> bool:
        """Detect if the user is asking about their profile/personal information"""
        message_lower = message.lower()

        # Profile-related keywords that indicate the user wants personal information
        profile_keywords = [
            'my vehicle', 'my car', 'my rv', 'my motorhome', 'my caravan',
            'what vehicle', 'what car', 'what rv',
            'my profile', 'my information', 'my details',
            'my travel', 'my preferences', 'my budget',
            'what do i', 'who am i', 'about me',
            'my name', 'my region', 'where am i from'
        ]

        return any(keyword in message_lower for keyword in profile_keywords)

    async def _load_user_profile(self, user_id: str, user_jwt: str) -> Optional[Dict[str, Any]]:
        """Load user profile data using the profile tool"""
        try:
            profile_tool = LoadUserProfileTool(user_jwt=user_jwt)
            profile_result = await profile_tool.execute(user_id)

            logger.info(f"🔍 Profile tool result: {profile_result}")
            return profile_result

        except Exception as e:
            logger.error(f"❌ Failed to load user profile: {e}")
            return None

    def get_status(self) -> Dict[str, Any]:
        """Get service status"""
        return {
            "service": "SimpleGeminiService",
            "initialized": self.is_initialized,
            "gemini_available": GEMINI_AVAILABLE,
            "api_key_configured": bool(self._api_key),
            "model_ready": bool(self.model),
            "timestamp": datetime.utcnow().isoformat()
        }


# Global instance
simple_gemini_service = SimpleGeminiService()


async def get_simple_gemini_service() -> SimpleGeminiService:
    """Get the simple Gemini service instance"""
    if not simple_gemini_service.is_initialized:
        await simple_gemini_service.initialize()
    return simple_gemini_service