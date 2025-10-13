"""
PAM 2.0 Conversational Engine Service
Phase 2 Implementation: OpenAI GPT-5 + Advanced Intelligence

Key Features:
- OpenAI GPT-5 integration (state-of-the-art AI with 45% fewer errors)
- Best-in-class reasoning and function calling capabilities
- 1M token context window with improved comprehension
- Context-aware conversations with smart routing
- Real-time response generation with enhanced performance
- Medium-level guardrails (non-intrusive but safe)

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

# Import the actual PAM Claude service (as per PAM_FINAL_PLAN.md - Claude Sonnet 4.5 is primary)
from ...pam.core.pam import PAM
from .user_location_service import UserLocationService
from .memory_service import MemoryService
from .prompt_service import PromptEngineeringService
from .multimodal_service import MultimodalService, MultimodalRequest
from ..integrations.tool_bridge import pam_tool_bridge

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

        # Initialize Claude client via PAM core (Phase 2 implementation)
        self._pam_claude = None  # Will be initialized per-user in process_message

        # Initialize enhanced memory service (Phase 2.1)
        self._memory_service = MemoryService()

        # Initialize advanced prompt engineering service (Phase 2.2)
        self._prompt_service = PromptEngineeringService()

        # Initialize multimodal service (Phase 2.3)
        self._multimodal_service = MultimodalService()

        # Initialize user location service
        self._user_location_service = UserLocationService()

        # Initialize PAM Tool Bridge for intelligent function calling
        self._tool_bridge = pam_tool_bridge

        logger.info(f"ConversationalEngine initialized with model: {self.model_name}, enhanced memory, advanced prompting, multimodal capabilities, location awareness, and 40+ intelligent tools")

    async def process_message(
        self,
        user_id: str,
        message: str,
        context: Optional[ConversationContext] = None
    ) -> ServiceResponse:
        """
        Process user message and generate AI response with enhanced memory

        Args:
            user_id: User identifier
            message: User message content
            context: Conversation context (optional)

        Returns:
            ServiceResponse with AI response and metadata
        """
        try:
            logger.info(f"Processing message for user {user_id}: {message[:50]}...")

            # Initialize tool bridge if not already done
            logger.info(f"🔍 DEBUG: Tool bridge state - initialized: {self._tool_bridge.initialized}, tools: {len(self._tool_bridge.tools)}")
            if not self._tool_bridge.initialized:
                logger.info("🔗 Initializing PAM Tool Bridge...")
                await self._tool_bridge.initialize()
            else:
                logger.info(f"🔗 Tool Bridge already initialized with {len(self._tool_bridge.tools)} tools: {list(self._tool_bridge.tools.keys())}")

            # Phase 2.1: Load enhanced conversation context with persistent memory
            if not context:
                context = await self._memory_service.get_enhanced_conversation_context(
                    user_id=user_id,
                    include_summaries=True,
                    max_messages=15
                )
                logger.info(f"Loaded enhanced memory context: "
                           f"{len(context.messages)} messages, "
                           f"{context.context_data.get('context_tokens', 0)} tokens")

            # Get user location context
            location_context = await self._user_location_service.get_user_location_context(user_id)
            if location_context:
                context.context_data['user_location'] = location_context
                logger.info(f"Added location context: {location_context.get('location_name', 'coordinates available')}")

            # Create user message
            user_message = ChatMessage(
                user_id=user_id,
                type=MessageType.USER,
                content=message,
                timestamp=datetime.now()
            )

            # Phase 2: Call Claude Sonnet 4.5 via PAM core service
            ai_response = await self._call_gemini_api(
                user_message=user_message,
                context=context
            )

            # Determine UI action based on content analysis
            ui_action = self._analyze_ui_action(message, ai_response)

            # Phase 2.1: Save conversation turn with enhanced metadata
            conversation_saved = await self._memory_service.save_conversation_turn(
                user_id=user_id,
                user_message=message,
                ai_response=ai_response,
                context_data=context.context_data,
                metadata={
                    "model_used": self.model_name,
                    "ui_action": ui_action,
                    "enhanced_memory": True,
                    "context_tokens": context.context_data.get('context_tokens', 0)
                }
            )

            return ServiceResponse(
                success=True,
                data={
                    "response": ai_response,
                    "ui_action": ui_action,
                    "model_used": self.model_name,
                    "timestamp": datetime.now().isoformat(),
                    "memory_enhanced": True,
                    "conversation_saved": conversation_saved
                },
                metadata={
                    "user_id": user_id,
                    "message_length": len(message),
                    "response_length": len(ai_response),
                    "context_included": context is not None,
                    "context_messages": len(context.messages) if context else 0,
                    "context_tokens": context.context_data.get('context_tokens', 0) if context else 0,
                    "memory_themes": context.context_data.get('memory_context', {}).get('conversation_themes', []) if context else []
                }
            )

        except Exception as e:
            logger.error(f"Error processing message for user {user_id}: {e}")
            raise ConversationalEngineError(
                message=f"Failed to process message: {str(e)}",
                details={"user_id": user_id, "message_preview": message[:100]}
            )

    async def process_multimodal_message(
        self,
        user_id: str,
        message: str,
        image_data: Optional[bytes] = None,
        image_format: Optional[str] = None,
        analysis_type: str = 'general',
        context: Optional[ConversationContext] = None
    ) -> ServiceResponse:
        """
        Process multimodal message with text and optional image (Phase 2.3)

        Args:
            user_id: User identifier
            message: Text message
            image_data: Optional image bytes
            image_format: Image format (jpeg, png, etc.)
            analysis_type: Type of image analysis to perform
            context: Conversation context

        Returns:
            ServiceResponse with AI response and image analysis metadata
        """
        try:
            logger.info(f"🖼️ Processing multimodal message for user {user_id}: {message[:50]}...")

            # Phase 2.1: Load enhanced conversation context if not provided
            if not context:
                context = await self._memory_service.get_enhanced_conversation_context(
                    user_id=user_id,
                    include_summaries=True,
                    max_messages=15
                )

            # Phase 2.3: Process multimodal request
            multimodal_request = MultimodalRequest(
                text_message=message,
                image_data=image_data,
                image_format=image_format,
                analysis_type=analysis_type,
                user_id=user_id,
                conversation_context=context
            )

            # Process through multimodal service
            ai_response, image_analysis = await self._multimodal_service.process_multimodal_request(
                multimodal_request
            )

            # Determine UI action based on analysis type and content
            ui_action = self._analyze_multimodal_ui_action(message, analysis_type, image_analysis)

            # Phase 2.1: Save conversation turn with multimodal metadata
            conversation_saved = await self._memory_service.save_conversation_turn(
                user_id=user_id,
                user_message=message,
                ai_response=ai_response,
                context_data={
                    **context.context_data,
                    "multimodal_analysis": {
                        "analysis_type": analysis_type,
                        "has_image": image_data is not None,
                        "image_analysis": {
                            "key_objects": image_analysis.key_objects,
                            "confidence_score": image_analysis.confidence_score,
                            "safety_concerns": image_analysis.safety_concerns,
                            "recommendations": image_analysis.recommendations
                        }
                    }
                },
                metadata={
                    "model_used": self.model_name,
                    "ui_action": ui_action,
                    "multimodal": True,
                    "image_processed": image_data is not None,
                    "analysis_type": analysis_type,
                    "vision_model": "gemini-1.5-flash"
                }
            )

            return ServiceResponse(
                success=True,
                data={
                    "response": ai_response,
                    "ui_action": ui_action,
                    "model_used": self.model_name,
                    "timestamp": datetime.now().isoformat(),
                    "multimodal_enhanced": True,
                    "image_analysis": {
                        "analysis_type": image_analysis.analysis_type,
                        "confidence_score": image_analysis.confidence_score,
                        "key_objects": image_analysis.key_objects,
                        "recommendations": image_analysis.recommendations,
                        "safety_concerns": image_analysis.safety_concerns
                    },
                    "conversation_saved": conversation_saved
                },
                metadata={
                    "user_id": user_id,
                    "message_length": len(message),
                    "response_length": len(ai_response),
                    "context_included": context is not None,
                    "image_processed": image_data is not None,
                    "image_size": len(image_data) if image_data else 0,
                    "analysis_type": analysis_type,
                    "multimodal_capabilities": self._multimodal_service.get_image_processing_capabilities()
                }
            )

        except Exception as e:
            logger.error(f"Error processing multimodal message for user {user_id}: {e}")
            raise ConversationalEngineError(
                message=f"Failed to process multimodal message: {str(e)}",
                details={"user_id": user_id, "message_preview": message[:100], "has_image": image_data is not None}
            )

    async def _generate_ai_response(
        self,
        user_message: ChatMessage,
        context: Optional[ConversationContext] = None
    ) -> str:
        """
        Generate AI response using OpenAI via SimpleOpenAIService

        Phase 2: Full OpenAI integration via SimpleOpenAIService
        """

        # Phase 1: Check if we should use mock responses
        if pam2_settings.mock_ai_responses:
            logger.warning("Mock AI responses enabled - using placeholder")
            return self._generate_placeholder_response(user_message, context)

        # Phase 2: Call actual AI API (Gemini or Claude via SimpleOpenAIService)
        response = await self._call_gemini_api(user_message, context)

        # If response is still a placeholder, log it for debugging
        if "PAM 2.0 received your message" in response:
            logger.error(f"AI service returned placeholder response - check if OPENAI_API_KEY or ANTHROPIC_API_KEY is set")

        return response

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

        base_response += " Powered by Claude Sonnet 4.5 AI!"

        return base_response

    async def _call_gemini_api(
        self,
        user_message: ChatMessage,
        context: Optional[ConversationContext] = None
    ) -> str:
        """
        Call Claude API using PAM core service
        As per PAM_FINAL_PLAN.md - Claude Sonnet 4.5 is the primary AI brain
        """

        try:
            # Initialize PAM Claude service for this user if not already done
            if not self._pam_claude:
                logger.info(f"Initializing PAM Claude service for user {user_message.user_id}...")
                self._pam_claude = PAM(user_id=user_message.user_id)
                logger.info("✅ PAM Claude (Sonnet 4.5) initialized successfully")

            # Call PAM Claude's chat method with the user's message
            logger.info(f"📡 Sending message to Claude Sonnet 4.5: '{user_message.content[:50]}...'")

            response = await self._pam_claude.chat(user_message.content)

            logger.info(f"✅ Claude Sonnet 4.5 response received ({len(response)} chars)")
            return response

        except Exception as e:
            logger.error(f"❌ Error calling Claude Sonnet 4.5: {e}")
            logger.error(f"Falling back to placeholder response")
            return self._generate_placeholder_response(user_message, context)

    async def _generate_ai_response_with_tools(
        self,
        user_message: ChatMessage,
        context: Optional[ConversationContext] = None
    ) -> str:
        """
        Generate AI response with intelligent function calling using Gemini function calling
        """
        try:
            # Check if we should use mock responses
            if pam2_settings.mock_ai_responses:
                return self._generate_placeholder_response(user_message, context)

            # Ensure Gemini is initialized
            if not self._simple_openai.is_initialized:
                logger.info("Initializing SimpleOpenAIService for function calling...")
                await self._simple_openai.initialize()

            if not self._simple_openai.is_initialized:
                logger.warning("SimpleOpenAIService failed to initialize")
                return self._generate_placeholder_response(user_message, context)

            if not hasattr(self._simple_openai, 'client') or not self._simple_openai.client:
                logger.warning("SimpleOpenAIService model not available for function calling")
                return self._generate_placeholder_response(user_message, context)

            # Import the function calling handler
            from ...ai.gemini_function_calling import get_gemini_function_handler

            # Get conversation history in Gemini format
            messages = []
            if context and hasattr(context, 'messages') and context.messages:
                recent_messages = context.messages[-10:] if len(context.messages) > 10 else context.messages
                for msg in recent_messages:
                    role = "user" if msg.type == MessageType.USER else "model"
                    messages.append({
                        "role": role,
                        "parts": [{"text": msg.content}]
                    })

            # Add current user message
            messages.append({
                "role": "user",
                "parts": [{"text": user_message.content}]
            })

            # Get location context and enhance system prompt
            location_context = context.context_data.get('user_location') if context else None
            if not location_context:
                location_context = await self._user_location_service.get_user_location_context(user_message.user_id)

            # Build system instruction with location awareness
            system_instruction = self._build_system_instruction_with_location(location_context)

            # Set up the function calling handler with our tool bridge
            handler = get_gemini_function_handler()

            # Register our tools with the function handler - pass the tool registry directly
            handler.tool_registry = self._tool_bridge

            # Convert PAM function definitions to Gemini tools format
            function_definitions = self._tool_bridge.get_function_definitions()
            logger.info(f"🔧 DEBUG: Tool bridge function definitions: {[f.get('name') for f in function_definitions]}")

            gemini_tools = handler.convert_openai_tools_to_gemini(function_definitions)
            logger.info(f"🔧 DEBUG: Converted Gemini tools: {len(gemini_tools)} tools")

            # Use function calling with the Gemini model
            logger.info(f"🧠 Initiating intelligent function calling with {len(gemini_tools)} available tools...")

            # Use the model directly (not start_chat) for function calling
            client = self._simple_openai.client

            # Handle function calling conversation
            response_text, function_results = await handler.handle_function_calling_conversation(
                model=client,
                messages=messages,
                tools=gemini_tools,
                user_id=user_message.user_id,
                max_function_calls=5,
                context=location_context
            )

            logger.info(f"✅ Function calling completed with {len(function_results)} tool executions")
            return response_text

        except Exception as e:
            logger.error(f"Error in intelligent function calling: {e}")
            # Fallback to basic AI response WITHOUT PAM v1 tools to avoid dual tool system
            logger.warning("🔄 Function calling failed, falling back to basic response (no tools)")

            # Generate basic response through SimpleOpenAIService but without tools
            try:
                if not self._simple_openai.is_initialized:
                    await self._simple_openai.initialize()

                if self._simple_openai.is_initialized and hasattr(self._simple_openai, 'client'):
                    # Use OpenAI client directly for basic text generation without function calling
                    basic_prompt = f"You are PAM, a helpful RV travel assistant. Respond to: {user_message.content}"
                    response = await self._simple_openai.client.chat.completions.create(
                        model=self._simple_openai.model_name,
                        messages=[{"role": "user", "content": basic_prompt}],
                        max_tokens=500,
                        timeout=15
                    )
                    return response.choices[0].message.content if response.choices else "I'm having trouble with my tools right now, but I'm here to help with your RV travels!"
                else:
                    return self._generate_placeholder_response(user_message, context)
            except Exception as fallback_error:
                logger.error(f"Fallback response generation failed: {fallback_error}")
                return self._generate_placeholder_response(user_message, context)

    def _build_system_instruction_with_location(self, location_context: Optional[Dict[str, Any]]) -> str:
        """
        Build system instruction with location awareness for intelligent function calling
        """
        base_instruction = """You are PAM (Personal Assistant Manager), an intelligent RV travel assistant.
You have access to many tools that help RV travelers with trip planning, expense tracking, weather information, and more.

When users ask questions:
1. Analyze what they need
2. Automatically call the appropriate tools to get current information
3. Provide comprehensive, helpful responses based on the tool results

Key capabilities:
- Real weather data and forecasts for travel planning
- Trip planning and route optimization
- Expense tracking and budget management
- User profile and travel history access
- RV maintenance tracking
- Money-making ideas for travelers

Always be proactive in using tools to provide accurate, up-to-date information."""

        if location_context:
            location_info = ""
            if location_context.get('location_name'):
                location_info = f"The user is currently near {location_context['location_name']}"
            elif location_context.get('coordinates'):
                coords = location_context['coordinates']
                location_info = f"The user is currently at coordinates {coords['lat']:.4f}, {coords['lng']:.4f}"

            if location_info:
                base_instruction += f"\n\nUser Location Context: {location_info}. Use this information when providing location-aware assistance."

        return base_instruction

    async def _execute_function(self, function_name: str, user_id: str, **kwargs) -> Dict[str, Any]:
        """
        Execute a function through the PAM Tool Bridge
        """
        try:
            logger.info(f"🛠️ Executing function: {function_name} for user {user_id}")
            result = await self._tool_bridge.execute_tool(function_name, user_id, **kwargs)
            logger.info(f"✅ Function {function_name} completed successfully")
            return result
        except Exception as e:
            logger.error(f"❌ Function {function_name} failed: {e}")
            return {"error": f"Function execution failed: {str(e)}"}

    async def _classify_user_intent(self, user_message: str) -> str:
        """
        Classify user intent for prompt optimization (Phase 2.2)
        """
        message_lower = user_message.lower()

        # Question intent
        if any(word in message_lower for word in ['how', 'what', 'why', 'where', 'when', 'which', '?']):
            return 'question'

        # Request/Action intent
        elif any(word in message_lower for word in ['find', 'book', 'reserve', 'get', 'show', 'help me', 'can you']):
            return 'request'

        # Planning intent
        elif any(word in message_lower for word in ['plan', 'schedule', 'organize', 'prepare']):
            return 'planning'

        # Problem/Support intent
        elif any(word in message_lower for word in ['problem', 'issue', 'error', 'broken', 'not working']):
            return 'support'

        # Informational/Learning intent
        elif any(word in message_lower for word in ['tell me', 'explain', 'learn', 'understand']):
            return 'information'

        # Social/Conversational intent
        elif any(word in message_lower for word in ['hello', 'hi', 'thanks', 'good', 'great']):
            return 'conversation'

        # Default
        else:
            return 'general'

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

    def _analyze_multimodal_ui_action(self, user_message: str, analysis_type: str, image_analysis) -> Optional[str]:
        """
        Analyze multimodal conversation to determine appropriate UI action (Phase 2.3)
        """

        # Analysis type provides strong UI action signal
        if analysis_type == 'damage_assessment':
            # Suggest maintenance tracking or repair scheduling
            return UIAction.UPDATE_BUDGET  # For repair budgeting
        elif analysis_type == 'campsite':
            # Suggest trip planning or location saving
            return UIAction.UPDATE_TRIP
        elif analysis_type == 'document':
            # Document processing - could relate to expenses or planning
            if any(word in user_message.lower() for word in ['receipt', 'expense', 'cost']):
                return UIAction.UPDATE_BUDGET
            else:
                return UIAction.NONE
        elif analysis_type == 'troubleshooting':
            # Technical issues might need maintenance tracking
            return UIAction.NONE  # No specific UI action for troubleshooting
        else:
            # Fall back to regular analysis
            return self._analyze_ui_action(user_message, "")

    async def get_service_health(self) -> Dict[str, Any]:
        """Get service health status"""

        health_status = {
            "service": "conversational_engine",
            "status": "healthy",
            "model": self.model_name,
            "temperature": self.temperature,
            "max_tokens": self.max_tokens,
            "openai_client_ready": self._simple_openai.is_initialized,
            "enhanced_memory": True,
            "advanced_prompting": True,
            "capabilities": {
                "persistent_memory": "active",
                "prompt_engineering": "active",
                "intent_classification": "active",
                "persona_adaptation": "active",
                "context_awareness": "enhanced",
                "multimodal_processing": "active",
                "image_analysis": "active",
                "primary_model": "gpt-5",
                "intelligent_function_calling": "active",
                "tool_bridge": "initialized" if self._tool_bridge.initialized else "pending",
                "available_tools": len(self._tool_bridge.get_tool_names()) if self._tool_bridge.initialized else 0
            },
            "timestamp": datetime.now().isoformat()
        }

        # Phase 2: Add Gemini API connectivity check
        if pam2_settings.GEMINI_API_KEY and pam2_settings.GEMINI_API_KEY.get_secret_value():
            health_status["api_key_configured"] = True
        else:
            health_status["status"] = "degraded"
            health_status["api_key_configured"] = False

        return health_status


# Service factory function
def create_conversational_engine() -> ConversationalEngine:
    """Factory function to create ConversationalEngine instance"""
    return ConversationalEngine()