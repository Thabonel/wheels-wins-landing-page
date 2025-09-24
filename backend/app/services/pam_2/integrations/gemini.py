"""
PAM 2.0 Google Gemini Integration
Phase 2 Implementation: Google Gemini 1.5 Flash Client
"""

import logging
from typing import Dict, Any, Optional, List
import asyncio
import json
import time

import google.generativeai as genai
from google.generativeai.types import GenerationConfig

from ..core.types import GeminiConfig
from ..core.exceptions import GeminiAPIError
from ..core.config import pam2_settings
from ..tools import ALL_FUNCTIONS, FUNCTION_REGISTRY

logger = logging.getLogger(__name__)

class GeminiClient:
    """
    Google Gemini 1.5 Flash Client
    Handles AI conversations with Google's Gemini model
    """

    def __init__(self, config: Optional[GeminiConfig] = None):
        self.config = config or pam2_settings.get_gemini_config()
        self.model_name = self.config.model
        self.api_key = self.config.api_key
        self.temperature = self.config.temperature
        self.max_tokens = self.config.max_tokens

        # Gemini client (Phase 2 implementation)
        self._client = None
        self._model = None

        logger.info(f"GeminiClient initialized with model: {self.model_name}")

    async def initialize(self):
        """
        Initialize Gemini client with function calling support
        Phase 2 implementation
        """

        try:
            # Configure Gemini with API key
            genai.configure(api_key=self.api_key)

            # Initialize model with function calling tools
            self._model = genai.GenerativeModel(
                model_name=self.model_name,
                tools=ALL_FUNCTIONS,
                system_instruction=self._get_system_instruction()
            )

            self._client = genai  # Set client reference

            # Test connection with a simple query
            test_response = self._model.generate_content("Hello PAM")
            if test_response:
                logger.info("Gemini client initialized successfully with function calling")
            else:
                raise GeminiAPIError("Empty response from Gemini API")

        except Exception as e:
            logger.error(f"Failed to initialize Gemini client: {e}")
            raise GeminiAPIError(f"Gemini initialization failed: {str(e)}")

    async def generate_response(
        self,
        prompt: str,
        conversation_history: Optional[List[Dict[str, str]]] = None,
        system_prompt: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Generate AI response using Gemini 1.5 Flash

        Args:
            prompt: User prompt
            conversation_history: Previous conversation messages
            system_prompt: System-level instructions

        Returns:
            Dictionary with response and metadata
        """

        try:
            # Phase 1: Return placeholder response
            if not self._client:
                return await self._generate_placeholder_response(prompt, conversation_history)

            # Phase 2: Implement actual Gemini API call
            return await self._call_gemini_api(prompt, conversation_history, system_prompt)

        except Exception as e:
            logger.error(f"Error generating Gemini response: {e}")
            raise GeminiAPIError(
                message=f"Failed to generate response: {str(e)}",
                details={"prompt_length": len(prompt)}
            )

    async def _generate_placeholder_response(
        self,
        prompt: str,
        conversation_history: Optional[List[Dict[str, str]]] = None
    ) -> Dict[str, Any]:
        """Generate placeholder response for Phase 1"""

        # Simulate processing time
        await asyncio.sleep(0.1)

        # Context-aware placeholder responses
        prompt_lower = prompt.lower()

        if any(word in prompt_lower for word in ["trip", "travel", "vacation"]):
            response = "I'd love to help you plan your trip! I can assist with destinations, budgets, and itineraries. What specifically would you like to know?"
        elif any(word in prompt_lower for word in ["budget", "money", "expense"]):
            response = "Let me help you with your financial planning! I can track expenses, suggest savings strategies, and help you set budgets. What's your main financial goal?"
        elif any(word in prompt_lower for word in ["save", "savings", "goal"]):
            response = "Great to see you're focused on saving! I can help you set realistic savings goals and track your progress. What are you saving for?"
        else:
            response = f"I understand you're asking about: {prompt[:50]}{'...' if len(prompt) > 50 else ''}. I'm here to help with travel planning, budgeting, and savings goals!"

        return {
            "response": response,
            "model": self.model_name,
            "tokens_used": len(prompt.split()) * 1.5,  # Rough estimate
            "response_time_ms": 100,
            "is_placeholder": True,
            "conversation_context": len(conversation_history) if conversation_history else 0
        }

    async def _call_gemini_api(
        self,
        prompt: str,
        conversation_history: Optional[List[Dict[str, str]]] = None,
        system_prompt: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Call actual Gemini API with function calling support
        Phase 2 implementation
        """

        try:
            start_time = time.time()

            # Format conversation for Gemini
            formatted_messages = self._format_conversation_for_gemini(
                prompt, conversation_history, system_prompt
            )

            # Configure generation parameters
            generation_config = GenerationConfig(
                temperature=self.temperature,
                max_output_tokens=self.max_tokens,
                candidate_count=1,
            )

            # Generate response with function calling
            response = self._model.generate_content(
                formatted_messages,
                generation_config=generation_config
            )

            response_time = int((time.time() - start_time) * 1000)

            # Handle function calls if present
            final_response = await self._handle_function_calls(response)

            return {
                "response": final_response,
                "model": self.model_name,
                "tokens_used": getattr(response.usage_metadata, 'total_token_count', 0) if hasattr(response, 'usage_metadata') else 0,
                "response_time_ms": response_time,
                "is_placeholder": False,
                "function_calls_made": len(response.candidates[0].content.parts) > 1 if response.candidates else False
            }

        except Exception as e:
            logger.error(f"Gemini API call failed: {e}")
            raise GeminiAPIError(f"Gemini API call failed: {str(e)}")

    def _format_conversation_for_gemini(
        self,
        current_prompt: str,
        conversation_history: Optional[List[Dict[str, str]]] = None,
        system_prompt: Optional[str] = None
    ) -> str:
        """
        Format conversation for Gemini API
        Phase 2 implementation
        """

        # PAM 2.0 system prompt
        default_system_prompt = """
        You are PAM, the intelligent AI assistant for Wheels & Wins - a travel planning and financial wellness platform.

        Your personality:
        - Helpful, friendly, and knowledgeable
        - Focus on travel planning and financial wellness
        - Provide practical, actionable advice
        - Be concise but thorough

        Your capabilities:
        - Travel planning and destination recommendations
        - Budget creation and expense tracking
        - Savings goal setting and financial advice
        - Trip cost estimation and optimization

        Guidelines:
        - Always prioritize user safety and financial responsibility
        - Suggest realistic budgets and savings goals
        - Encourage smart financial habits
        - Be supportive of travel dreams while promoting financial wellness
        """

        formatted_prompt = system_prompt or default_system_prompt

        # Add conversation history
        if conversation_history:
            formatted_prompt += "\n\nConversation History:\n"
            for msg in conversation_history[-10:]:  # Last 10 messages
                role = msg.get("role", "user")
                content = msg.get("content", "")
                formatted_prompt += f"{role}: {content}\n"

        # Add current prompt
        formatted_prompt += f"\nUser: {current_prompt}\nPAM:"

        return formatted_prompt

    def _get_system_instruction(self) -> str:
        """
        Get system instruction for Gemini model
        """
        return """
You are PAM, the intelligent AI assistant for Wheels & Wins - a travel planning and financial wellness platform.

Your personality:
- Helpful, friendly, and knowledgeable about travel and finance
- Focus on travel planning, budgeting, and financial wellness
- Provide practical, actionable advice
- Be conversational but concise

Your capabilities:
- Get real-time weather information for destinations
- Provide detailed destination information and cultural tips
- Estimate trip costs and create budget breakdowns
- Suggest personalized itineraries for trips
- Help with financial planning and savings goals

Use the available functions when users ask about:
- Weather conditions for travel planning
- Destination information, costs, or travel advice
- Trip planning and itinerary suggestions
- Budget estimation for trips

Always prioritize user safety and financial responsibility in your advice.
"""

    async def _handle_function_calls(self, response) -> str:
        """
        Handle function calls in Gemini response
        """
        try:
            # Check if response contains function calls
            if not response.candidates:
                return "I apologize, but I couldn't generate a proper response. Please try again."

            candidate = response.candidates[0]

            # If no function calls, return text response
            if not hasattr(candidate.content, 'parts') or len(candidate.content.parts) == 1:
                return candidate.content.text if hasattr(candidate.content, 'text') else str(candidate.content)

            # Process function calls
            function_results = []
            text_parts = []

            for part in candidate.content.parts:
                if hasattr(part, 'function_call'):
                    # Execute function call
                    func_name = part.function_call.name
                    func_args = dict(part.function_call.args)

                    if func_name in FUNCTION_REGISTRY:
                        try:
                            result = await FUNCTION_REGISTRY[func_name](**func_args)
                            function_results.append({"function": func_name, "result": result})
                            logger.info(f"Function {func_name} executed successfully")
                        except Exception as e:
                            logger.error(f"Function {func_name} failed: {e}")
                            function_results.append({"function": func_name, "error": str(e)})
                    else:
                        logger.error(f"Unknown function: {func_name}")
                        function_results.append({"function": func_name, "error": "Function not found"})

                elif hasattr(part, 'text'):
                    text_parts.append(part.text)

            # If we have function results, generate a follow-up response
            if function_results:
                return await self._generate_follow_up_response(text_parts, function_results)
            else:
                return ' '.join(text_parts) if text_parts else "I'm here to help! What would you like to know about travel or financial planning?"

        except Exception as e:
            logger.error(f"Error handling function calls: {e}")
            return "I encountered an issue while processing your request. Please try rephrasing your question."

    async def _generate_follow_up_response(self, text_parts: List[str], function_results: List[Dict]) -> str:
        """
        Generate a natural response incorporating function call results
        """
        try:
            # Create a prompt with function results for follow-up
            follow_up_prompt = "Based on this information:\n\n"

            for result in function_results:
                if "error" not in result:
                    follow_up_prompt += f"{result['function']} result: {json.dumps(result['result'], indent=2)}\n\n"
                else:
                    follow_up_prompt += f"{result['function']} error: {result['error']}\n\n"

            follow_up_prompt += "Please provide a helpful, conversational response to the user incorporating this information."

            # Generate follow-up response
            follow_up_response = self._model.generate_content(
                follow_up_prompt,
                generation_config=GenerationConfig(temperature=0.7, max_output_tokens=500)
            )

            return follow_up_response.text if hasattr(follow_up_response, 'text') else str(follow_up_response)

        except Exception as e:
            logger.error(f"Error generating follow-up response: {e}")

            # Fallback: format function results manually
            response_parts = []
            for result in function_results:
                if "error" not in result:
                    if result['function'] == 'get_weather':
                        data = result['result']
                        response_parts.append(
                            f"The weather in {data.get('location', 'your location')} is currently "
                            f"{data.get('temperature', 'N/A')} {data.get('unit', '')} with {data.get('description', 'unknown conditions')}."
                        )
                    elif result['function'] == 'get_destination_info':
                        data = result['result']
                        response_parts.append(
                            f"Here's information about {data.get('name', 'your destination')}: "
                            f"Best time to visit is {data.get('best_time_to_visit', 'year-round')}."
                        )

            return " ".join(response_parts) if response_parts else "I found some information, but had trouble formatting the response. Please try again."

    async def check_api_health(self) -> Dict[str, Any]:
        """Check Gemini API health and connectivity"""

        health_status = {
            "service": "gemini_client",
            "api_key_configured": bool(self.api_key),
            "model": self.model_name,
            "client_initialized": self._client is not None
        }

        # Phase 2: Add actual API connectivity test
        if self._client:
            try:
                # Test API call
                test_response = await self.generate_response("Health check")
                health_status["api_accessible"] = True
                health_status["test_response_time_ms"] = test_response.get("response_time_ms", 0)
            except Exception as e:
                health_status["api_accessible"] = False
                health_status["error"] = str(e)
        else:
            health_status["api_accessible"] = False
            health_status["status"] = "not_initialized"

        return health_status

    def get_usage_stats(self) -> Dict[str, Any]:
        """Get API usage statistics"""

        # Phase 2: Implement usage tracking
        return {
            "total_requests": 0,
            "total_tokens": 0,
            "average_response_time_ms": 0,
            "error_rate": 0.0,
            "implementation": "pending_phase_2"
        }

# Factory function
def create_gemini_client(config: Optional[GeminiConfig] = None) -> GeminiClient:
    """Create and initialize Gemini client"""
    return GeminiClient(config)