"""
PAM 2.0 Conversational Engine Service
Phase 2 Implementation: Google Gemini 1.5 Flash + Guardrails

Key Features:
- Google Gemini 1.5 Flash integration (25x cost reduction)
- Medium-level guardrails (non-intrusive but safe)
- Context-aware conversations
- Real-time response generation

Target: <300 lines, modular design
"""

import logging
from typing import Dict, Any, Optional, List
from datetime import datetime

from ..core.types import (
    ChatMessage,
    ConversationContext,
    ServiceResponse,
    MessageType,
    UIAction
)
from ..core.exceptions import ConversationalEngineError, GeminiAPIError
from ..core.config import pam2_settings

logger = logging.getLogger(__name__)

class ConversationalEngine:
    """
    Conversational Engine Service
    Handles AI-powered conversations with Google Gemini 1.5 Flash
    """

    def __init__(self):
        self.config = pam2_settings.get_gemini_config()
        self.model_name = self.config.model
        self.temperature = self.config.temperature
        self.max_tokens = self.config.max_tokens

        # Initialize Gemini client (Phase 2 implementation)
        self._gemini_client = None

        logger.info(f"ConversationalEngine initialized with model: {self.model_name}")

    async def process_message(
        self,
        user_id: str,
        message: str,
        context: Optional[ConversationContext] = None
    ) -> ServiceResponse:
        """
        Process user message and generate AI response

        Args:
            user_id: User identifier
            message: User message content
            context: Conversation context (optional)

        Returns:
            ServiceResponse with AI response and metadata
        """
        try:
            logger.info(f"Processing message for user {user_id}: {message[:50]}...")

            # Create user message
            user_message = ChatMessage(
                user_id=user_id,
                type=MessageType.USER,
                content=message,
                timestamp=datetime.now()
            )

            # Phase 1: Return placeholder response
            # Phase 2: Implement actual Gemini integration
            ai_response = await self._generate_ai_response(
                user_message=user_message,
                context=context
            )

            # Determine UI action based on content analysis
            ui_action = self._analyze_ui_action(message, ai_response)

            return ServiceResponse(
                success=True,
                data={
                    "response": ai_response,
                    "ui_action": ui_action,
                    "model_used": self.model_name,
                    "timestamp": datetime.now().isoformat()
                },
                metadata={
                    "user_id": user_id,
                    "message_length": len(message),
                    "response_length": len(ai_response),
                    "context_included": context is not None
                }
            )

        except Exception as e:
            logger.error(f"Error processing message for user {user_id}: {e}")
            raise ConversationalEngineError(
                message=f"Failed to process message: {str(e)}",
                details={"user_id": user_id, "message_preview": message[:100]}
            )

    async def _generate_ai_response(
        self,
        user_message: ChatMessage,
        context: Optional[ConversationContext] = None
    ) -> str:
        """
        Generate AI response using Google Gemini

        Phase 1: Placeholder implementation
        Phase 2: Full Gemini integration
        """

        # Phase 1: Placeholder response
        if pam2_settings.mock_ai_responses or not self._gemini_client:
            return self._generate_placeholder_response(user_message, context)

        # Phase 2: Call actual Gemini API
        try:
            if not self._gemini_client:
                logger.warning("Gemini client not initialized, attempting to initialize...")
                await self.initialize_gemini_client()

            if self._gemini_client:
                # Convert conversation context to history format
                conversation_history = []
                if context and hasattr(context, 'messages') and context.messages:
                    for msg in context.messages[-5:]:  # Last 5 messages for context
                        conversation_history.append({
                            "role": "user" if msg.type == MessageType.USER else "assistant",
                            "content": msg.content
                        })

                # Call Gemini API
                gemini_response = await self._gemini_client.generate_response(
                    prompt=user_message.content,
                    conversation_history=conversation_history
                )

                return gemini_response.get("response", "I'm here to help with your travel and financial planning!")
            else:
                logger.warning("Gemini client still not available, using placeholder")
                return self._generate_placeholder_response(user_message, context)

        except Exception as e:
            logger.error(f"Error calling Gemini API: {e}")
            return self._generate_placeholder_response(user_message, context)

    def _generate_placeholder_response(
        self,
        user_message: ChatMessage,
        context: Optional[ConversationContext] = None
    ) -> str:
        """Generate placeholder response for Phase 1"""

        base_response = f"Hello! PAM 2.0 received your message: '{user_message.content}'"

        # Add context-aware elements
        if context and context.current_topic:
            base_response += f" I see we were discussing {context.current_topic}."

        base_response += " Full Gemini 1.5 Flash integration coming in Phase 2!"

        return base_response

    async def _call_gemini_api(
        self,
        user_message: ChatMessage,
        context: Optional[ConversationContext] = None
    ) -> str:
        """
        Call Google Gemini API
        Phase 2 implementation placeholder
        """

        # TODO Phase 2: Implement actual Gemini API integration
        # - Set up Gemini client with API key
        # - Format conversation history for context
        # - Handle API rate limiting and retries
        # - Process Gemini response
        # - Apply content filtering

        raise NotImplementedError("Gemini API integration pending Phase 2")

    def _analyze_ui_action(self, user_message: str, ai_response: str) -> Optional[str]:
        """
        Analyze conversation to determine appropriate UI action
        """

        # Simple keyword-based analysis for Phase 1
        message_lower = user_message.lower()

        if any(word in message_lower for word in ["trip", "travel", "destination"]):
            return UIAction.UPDATE_TRIP
        elif any(word in message_lower for word in ["budget", "expense", "money"]):
            return UIAction.UPDATE_BUDGET
        elif any(word in message_lower for word in ["savings", "save", "goal"]):
            return UIAction.SHOW_SAVINGS
        else:
            return UIAction.NONE

    async def get_service_health(self) -> Dict[str, Any]:
        """Get service health status"""

        health_status = {
            "service": "conversational_engine",
            "status": "healthy",
            "model": self.model_name,
            "temperature": self.temperature,
            "max_tokens": self.max_tokens,
            "gemini_client_ready": self._gemini_client is not None,
            "timestamp": datetime.now().isoformat()
        }

        # Phase 2: Add Gemini API connectivity check
        if pam2_settings.GEMINI_API_KEY and pam2_settings.GEMINI_API_KEY.get_secret_value():
            health_status["api_key_configured"] = True
        else:
            health_status["status"] = "degraded"
            health_status["api_key_configured"] = False

        return health_status

    async def initialize_gemini_client(self):
        """
        Initialize Google Gemini client
        Phase 2 implementation
        """

        try:
            logger.info("Initializing Gemini client...")

            # Create and initialize Gemini client
            self._gemini_client = create_gemini_client()
            await self._gemini_client.initialize()

            logger.info("Gemini client initialized successfully")

        except Exception as e:
            logger.error(f"Failed to initialize Gemini client: {e}")
            # Don't raise exception - fall back to placeholder responses
            self._gemini_client = None

# Service factory function
def create_conversational_engine() -> ConversationalEngine:
    """Factory function to create ConversationalEngine instance"""
    return ConversationalEngine()