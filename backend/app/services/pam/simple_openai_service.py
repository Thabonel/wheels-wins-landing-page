"""
Simple Direct OpenAI Service
A lightweight, reliable service that directly calls OpenAI API
without any complex orchestrator dependencies.
"""

import json
import logging
from typing import Dict, Any, Optional, List
from datetime import datetime

# Import OpenAI directly - minimal dependencies
try:
    from openai import AsyncOpenAI
    OPENAI_AVAILABLE = True
except ImportError:
    OPENAI_AVAILABLE = False
    AsyncOpenAI = None

from app.core.infra_config import get_infra_settings
from app.services.pam.tools.load_user_profile import LoadUserProfileTool

logger = logging.getLogger(__name__)
infra_settings = get_infra_settings()


class SimpleOpenAIService:
    """
    Simple, reliable OpenAI service with direct API calls.
    No orchestrator, no complex provider abstractions - just works.
    """

    def __init__(self):
        self.client = None
        self.is_initialized = False
        self._api_key = None
        self.model_name = "gpt-5"  # Latest GPT-5 model (August 2025)

    async def initialize(self) -> bool:
        """Initialize the simple OpenAI service"""
        try:
            logger.info("🤖 Initializing Simple OpenAI Service...")

            if not OPENAI_AVAILABLE:
                logger.error("❌ OpenAI package not available (openai)")
                return False

            # Get API key from infra settings
            if hasattr(infra_settings, 'OPENAI_API_KEY') and infra_settings.OPENAI_API_KEY:
                if hasattr(infra_settings.OPENAI_API_KEY, 'get_secret_value'):
                    self._api_key = infra_settings.OPENAI_API_KEY.get_secret_value()
                else:
                    self._api_key = str(infra_settings.OPENAI_API_KEY)

                logger.info(f"🔑 OpenAI API key available: {len(self._api_key)} characters")
            else:
                logger.error("❌ OPENAI_API_KEY not found in infra_settings")
                return False

            # Initialize OpenAI client
            self.client = AsyncOpenAI(api_key=self._api_key)

            # Set model name from settings or use default
            self.model_name = getattr(infra_settings, 'OPENAI_DEFAULT_MODEL', 'gpt-5')

            # Test the client with a simple request
            try:
                test_response = await self.client.chat.completions.create(
                    model=self.model_name,
                    messages=[{"role": "user", "content": "Hello! Just testing the connection."}],
                    max_tokens=50,
                    timeout=10
                )

                if test_response and test_response.choices:
                    logger.info("✅ Simple OpenAI Service initialized successfully")
                    logger.info(f"✅ Test response: {test_response.choices[0].message.content[:50]}...")
                    logger.info(f"✅ Using model: {self.model_name}")
                    self.is_initialized = True
                    return True
                else:
                    logger.error("❌ OpenAI test request failed - no response")
                    return False

            except Exception as test_error:
                # Try fallback to GPT-5 mini if GPT-5 fails
                logger.warning(f"GPT-5 test failed: {test_error}, trying GPT-5 mini fallback...")
                try:
                    self.model_name = "gpt-5-mini"
                    test_response = await self.client.chat.completions.create(
                        model=self.model_name,
                        messages=[{"role": "user", "content": "Hello! Just testing the connection."}],
                        max_tokens=50,
                        timeout=10
                    )

                    if test_response and test_response.choices:
                        logger.info("✅ Simple OpenAI Service initialized with GPT-5 mini fallback")
                        logger.info(f"✅ Test response: {test_response.choices[0].message.content[:50]}...")
                        self.is_initialized = True
                        return True
                    else:
                        logger.error("❌ OpenAI GPT-5 mini fallback also failed")
                        return False

                except Exception as fallback_error:
                    logger.error(f"❌ OpenAI service initialization completely failed: {fallback_error}")
                    return False

        except Exception as e:
            logger.error(f"❌ Simple OpenAI Service initialization failed: {e}")
            return False

    async def generate_response(self, message: str, context: Optional[Dict[str, Any]] = None, user_id: Optional[str] = None, user_jwt: Optional[str] = None, tools: Optional[List[Dict[str, Any]]] = None) -> str:
        """
        Generate a response using OpenAI directly.
        Simple, reliable, no complex orchestration.
        Now includes profile access for personalized responses and function calling support.
        """
        if not self.is_initialized or not self.client:
            return "I'm having trouble connecting to my AI service. Please try again in a moment."

        try:
            # Check if user is asking about their profile/personal information
            profile_data = None
            is_profile_query = self._is_profile_query(message)
            logger.info(f"🔍 PROFILE QUERY DEBUG: Message: '{message}' | Is profile query: {is_profile_query}")
            logger.info(f"🔍 PROFILE QUERY DEBUG: user_id: {user_id} | user_jwt exists: {bool(user_jwt)}")

            if user_id and user_jwt and is_profile_query:
                logger.info(f"🔍 Detected profile query, loading user data for: {user_id}")
                profile_data = await self._load_user_profile(user_id, user_jwt)
            elif is_profile_query:
                logger.warning(f"⚠️ Profile query detected but missing user_id ({user_id}) or JWT ({bool(user_jwt)})")

            # Create enhanced prompt with context and profile data
            enhanced_prompt = self._build_prompt(message, context, profile_data)
            logger.info(f"🔍 PROMPT DEBUG: Enhanced prompt length: {len(enhanced_prompt)} chars")
            logger.info(f"🔍 PROMPT DEBUG: Profile data included: {bool(profile_data and profile_data.get('success'))}")

            logger.info(f"🤖 Generating OpenAI response for: {message[:50]}...")

            # Prepare messages for OpenAI
            messages = [{"role": "user", "content": enhanced_prompt}]

            # Prepare API call parameters
            api_params = {
                "model": self.model_name,
                "messages": messages,
                "temperature": 0.7,
                "max_tokens": 1500,
                "timeout": 30
            }

            # Add tools/functions if provided
            if tools:
                logger.info(f"🔧 Using function calling with {len(tools)} tools...")
                api_params["tools"] = tools
                api_params["tool_choice"] = "auto"

            # Generate response
            response = await self.client.chat.completions.create(**api_params)

            if response and response.choices:
                # Check if the model made function calls
                message_obj = response.choices[0].message

                if hasattr(message_obj, 'tool_calls') and message_obj.tool_calls:
                    logger.info(f"🔧 OpenAI made {len(message_obj.tool_calls)} function calls")
                    # For now, return a message about function calling
                    # In a full implementation, we'd execute the functions and continue the conversation
                    return f"I need to use some tools to help with that. Function calling detected: {len(message_obj.tool_calls)} calls."

                elif message_obj.content:
                    response_text = message_obj.content.strip()
                    logger.info(f"✅ OpenAI response: {response_text[:100]}...")
                    return response_text
                else:
                    logger.warning("⚠️ OpenAI returned empty content")
                    return "I received your message but couldn't generate a proper response. Please try rephrasing your question."
            else:
                logger.warning("⚠️ OpenAI returned no choices")
                return "I'm experiencing technical difficulties. Please try again."

        except Exception as e:
            logger.error(f"❌ OpenAI response generation failed: {e}")
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
            logger.info(f"🔍 BUILD PROMPT DEBUG: Profile exists: {user_profile.get('profile_exists')}")

            if user_profile.get('profile_exists'):
                base_prompt += "\n✅ CURRENT USER PROFILE DATA (use this information to answer questions about the user):\n"

                # Personal details
                personal = user_profile.get('personal_details', {})
                if personal.get('full_name'):
                    base_prompt += f"- Name: {personal['full_name']}\n"
                if personal.get('nickname'):
                    base_prompt += f"- Preferred name: {personal['nickname']}\n"
                if personal.get('region'):
                    base_prompt += f"- Region: {personal['region']}\n"

                # Vehicle information - ALWAYS show if available
                vehicle = user_profile.get('vehicle_info', {})
                logger.info(f"🚐 BUILD PROMPT DEBUG: Vehicle info: {vehicle}")

                if vehicle.get('type') and vehicle.get('make_model_year'):
                    base_prompt += f"- Vehicle: {vehicle['type']} ({vehicle['make_model_year']})\n"
                    if vehicle.get('fuel_type'):
                        base_prompt += f"- Fuel type: {vehicle['fuel_type']}\n"
                    logger.info(f"🚐 BUILD PROMPT DEBUG: Added complete vehicle info to prompt")

                    # Add explicit instruction for vehicle queries
                    if self._is_profile_query(message):
                        base_prompt += f"\n🚗 IMPORTANT: When asked about their vehicle, tell the user they drive a {vehicle['type']} ({vehicle['make_model_year']}) with {vehicle.get('fuel_type', 'unknown')} fuel. Use this exact information from their profile.\n"
                else:
                    logger.warning(f"⚠️ BUILD PROMPT DEBUG: Vehicle data incomplete or missing")
                    # Only show guidance if vehicle data is truly missing
                    if self._is_profile_query(message):
                        base_prompt += "\n⚠️ IMPORTANT: User is asking about their vehicle but vehicle information is incomplete in their profile. Guide them to complete their vehicle setup in the profile section.\n"

                # Travel preferences
                travel = user_profile.get('travel_preferences', {})
                if travel.get('style'):
                    base_prompt += f"- Travel style: {travel['style']}\n"
                if travel.get('camp_types'):
                    base_prompt += f"- Preferred camping: {', '.join(travel['camp_types'])}\n"

                base_prompt += "\n"
            else:
                logger.warning(f"⚠️ BUILD PROMPT DEBUG: Profile exists but profile_exists is False")
                # Handle case where profile exists but is incomplete
                if self._is_profile_query(message):
                    base_prompt += "\n⚠️ IMPORTANT: User is asking about their profile but their profile setup is incomplete. Guide them to complete their profile in the settings.\n"
                    logger.info(f"🔧 BUILD PROMPT DEBUG: Added profile completion guidance to prompt")
        else:
            logger.warning(f"⚠️ BUILD PROMPT DEBUG: No profile data or not successful")
            # Handle case where no profile data is available
            if self._is_profile_query(message):
                base_prompt += "\n❌ PROFILE DATA UNAVAILABLE: User is asking about their profile but no profile data could be loaded. Guide them to set up their profile or contact support if this persists.\n"
                logger.info(f"🔧 BUILD PROMPT DEBUG: Added profile setup guidance for missing data")

        # Add context if available
        if context:
            context_info = []

            # Add user location if available (supports both old and new formats)
            location = context.get('userLocation') or context.get('location')
            if location:
                if location.get('location_name'):
                    # New format from UserLocationService
                    context_info.append(f"User location: {location['location_name']}")
                    logger.info(f"🌍 Added user location to prompt: {location['location_name']}")
                elif location.get('city') or location.get('country'):
                    # Legacy format
                    city = location.get('city', 'Unknown')
                    country = location.get('country', 'Unknown')
                    context_info.append(f"User location: {city}, {country}")
                    logger.info(f"🌍 Added user location to prompt: {city}, {country}")
                elif location.get('coordinates'):
                    # Coordinates only
                    coords = location['coordinates']
                    context_info.append(f"User location: {coords['latitude']}, {coords['longitude']}")
                    logger.info(f"🌍 Added user coordinates to prompt: {coords['latitude']}, {coords['longitude']}")

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
            logger.info(f"🔍 SIMPLE OPENAI DEBUG: Loading profile for user_id: {user_id}")
            profile_tool = LoadUserProfileTool(user_jwt=user_jwt)
            profile_result = await profile_tool.execute(user_id)

            logger.info(f"🔍 SIMPLE OPENAI DEBUG: Profile tool result: {profile_result}")

            # Debug specific vehicle data extraction
            if profile_result and profile_result.get('success'):
                user_data = profile_result.get('data', {})
                vehicle_info = user_data.get('vehicle_info', {})
                logger.info(f"🚐 SIMPLE OPENAI DEBUG: Vehicle info extracted: {vehicle_info}")
                logger.info(f"🚐 SIMPLE OPENAI DEBUG: Has vehicle type: {bool(vehicle_info.get('type'))}")
                logger.info(f"🚐 SIMPLE OPENAI DEBUG: Vehicle type value: {vehicle_info.get('type')}")
                logger.info(f"🚐 SIMPLE OPENAI DEBUG: Make/model: {vehicle_info.get('make_model_year')}")
            else:
                logger.warning(f"⚠️ SIMPLE OPENAI DEBUG: Profile result not successful or empty")

            return profile_result

        except Exception as e:
            logger.error(f"❌ Failed to load user profile: {e}")
            return None

    def get_status(self) -> Dict[str, Any]:
        """Get service status"""
        return {
            "service": "SimpleOpenAIService",
            "initialized": self.is_initialized,
            "openai_available": OPENAI_AVAILABLE,
            "api_key_configured": bool(self._api_key),
            "client_ready": bool(self.client),
            "model": self.model_name,
            "timestamp": datetime.utcnow().isoformat()
        }


# Global instance
simple_openai_service = SimpleOpenAIService()


async def get_simple_openai_service() -> SimpleOpenAIService:
    """Get the simple OpenAI service instance"""
    if not simple_openai_service.is_initialized:
        await simple_openai_service.initialize()
    return simple_openai_service