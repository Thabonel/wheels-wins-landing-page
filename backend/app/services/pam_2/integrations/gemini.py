"""
PAM 2.0 Google Gemini Integration
Phase 2 Implementation: Google Gemini 1.5 Flash Client
"""

import logging
from typing import Dict, Any, Optional, List
import asyncio
import time

from ..core.types import GeminiConfig
from ..core.exceptions import GeminiAPIError
from ..core.config import pam2_settings

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
        """Initialize Gemini client"""

        try:
            import google.generativeai as genai

            # Configure API key
            genai.configure(api_key=self.api_key)

            # Initialize model
            self._model = genai.GenerativeModel(
                model_name=self.model_name,
                generation_config={
                    "temperature": self.temperature,
                    "max_output_tokens": self.max_tokens,
                    "top_p": 0.8,
                    "top_k": 40
                }
            )

            # Store client reference
            self._client = genai

            # Test connection
            test_response = await self._model.generate_content_async("Hello")
            logger.info(
                "Gemini client initialized successfully: %s...",
                (test_response.text or "(no text)")[:50]
            )

        except Exception as e:
            raise GeminiAPIError(f"Failed to initialize Gemini client: {e}")

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
        """Call actual Gemini API"""

        start_time = time.time()

        try:
            # Format conversation for Gemini
            formatted_prompt = self._format_conversation_for_gemini(
                prompt, conversation_history, system_prompt
            )

            # Generate response with timeout
            response = await asyncio.wait_for(
                self._model.generate_content_async(formatted_prompt),
                timeout=self.config.timeout_seconds
            )

            response_time_ms = int((time.time() - start_time) * 1000)

            # Extract response text
            response_text = (
                response.text
                if getattr(response, "text", None)
                else "I apologize, but I couldn't generate a response. Please try again."
            )

            # Get usage metadata if available
            tokens_used = 0
            usage_metadata = getattr(response, "usage_metadata", None)
            if usage_metadata:
                tokens_used = getattr(usage_metadata, "total_token_count", 0) or 0

            safety_ratings: List[Dict[str, Any]] = []
            candidates = getattr(response, "candidates", None)
            if candidates:
                first_candidate = candidates[0]

                if isinstance(first_candidate, dict):
                    safety_ratings = first_candidate.get("safety_ratings", []) or []
                else:
                    candidate_safety = getattr(first_candidate, "safety_ratings", None)
                    if candidate_safety:
                        serialized_ratings = []
                        for rating in candidate_safety:
                            if isinstance(rating, dict):
                                serialized_ratings.append(rating)
                            else:
                                to_dict = getattr(rating, "to_dict", None)
                                if callable(to_dict):
                                    serialized_ratings.append(to_dict())
                                else:
                                    serialized_ratings.append(
                                        getattr(rating, "__dict__", {})
                                    )
                        safety_ratings = serialized_ratings

            return {
                "response": response_text,
                "model": self.model_name,
                "tokens_used": tokens_used,
                "response_time_ms": response_time_ms,
                "is_placeholder": False,
                "safety_ratings": safety_ratings,
            }

        except asyncio.TimeoutError:
            raise GeminiAPIError("Gemini API request timed out")
        except Exception as e:
            response_time_ms = int((time.time() - start_time) * 1000)
            logger.error(f"Gemini API error (took {response_time_ms}ms): {e}")
            raise GeminiAPIError(f"Gemini API call failed: {e}")

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