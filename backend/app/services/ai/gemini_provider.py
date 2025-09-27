"""
Google Gemini Provider Implementation
Supports Gemini Flash, Pro, and other Google AI models
Optimized for speed and cost-efficiency
"""

import time
import json
from typing import List, Dict, Any, AsyncGenerator, Optional, Tuple
import logging

from .provider_interface import (
    AIProviderInterface, AIMessage, AIResponse, AICapability,
    AIProviderStatus, ProviderConfig
)
from .gemini_function_calling import get_gemini_function_handler

logger = logging.getLogger(__name__)

# Safe import of Google Generative AI
try:
    import google.generativeai as genai
    from google.generativeai import GenerativeModel
    from google.generativeai.types import HarmCategory, HarmBlockThreshold
    GEMINI_AVAILABLE = True
except ImportError:
    logger.warning("Google Generative AI package not installed. Gemini provider will be unavailable.")
    GEMINI_AVAILABLE = False
    genai = None
    GenerativeModel = None


class GeminiProvider(AIProviderInterface):
    """Google Gemini API provider implementation optimized for Flash model"""

    def __init__(self, config: ProviderConfig):
        # Check if Gemini is available
        if not GEMINI_AVAILABLE:
            raise RuntimeError("Google Generative AI package is not installed. Install with: pip install google-generativeai")

        # Set default Gemini capabilities
        if not config.capabilities:
            config.capabilities = [
                AICapability.CHAT,
                AICapability.STREAMING,
                AICapability.VISION,
                AICapability.LONG_CONTEXT,
                AICapability.FAST_RESPONSE,  # Gemini Flash is optimized for speed
                AICapability.FUNCTION_CALLING  # Function calling support
            ]

        # Set default model - Gemini Flash for optimal speed/cost ratio
        if not config.default_model:
            config.default_model = "gemini-1.5-flash"  # Latest Flash model

        # Set token limits - Gemini 1.5 capabilities
        config.max_context_window = 1048576  # Gemini 1.5: 1M context window
        config.max_tokens_per_request = 8192   # Gemini: 8K max output

        # Set costs - Gemini Flash pricing (very cost-effective)
        config.cost_per_1k_input_tokens = 0.000075   # $0.075/M input tokens (Flash)
        config.cost_per_1k_output_tokens = 0.0003    # $0.30/M output tokens (Flash)

        super().__init__(config)
        self.model = None
        self.function_handler = None  # Initialize function calling handler
        self.generation_config = {
            "temperature": 0.7,
            "top_p": 0.8,
            "top_k": 40,
            "max_output_tokens": 8192,
            "response_mime_type": "text/plain",
        }

        # Safety settings - balanced for travel assistant
        self.safety_settings = {
            HarmCategory.HARM_CATEGORY_HATE_SPEECH: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
            HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
            HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
            HarmCategory.HARM_CATEGORY_HARASSMENT: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
        }

    async def initialize(self) -> bool:
        """Initialize Gemini client"""
        if not GEMINI_AVAILABLE:
            self._status = AIProviderStatus.UNHEALTHY
            return False

        try:
            # Configure the Gemini API
            genai.configure(api_key=self.config.api_key)

            # Initialize the model
            model_name = self.config.default_model
            self.model = GenerativeModel(
                model_name=model_name,
                generation_config=self.generation_config,
                safety_settings=self.safety_settings
            )

            # Initialize function calling handler (will be set up later with tool registry)
            self.function_handler = None

            # Test the connection
            status, message = await self.health_check()
            return status == AIProviderStatus.HEALTHY

        except Exception as e:
            logger.error(f"Failed to initialize Gemini provider: {e}")
            self._status = AIProviderStatus.UNHEALTHY
            return False

    def _get_model_with_fallback(self, model: Optional[str] = None) -> str:
        """Get model with Flash fallback options"""
        requested_model = model or self.config.default_model

        # Gemini model hierarchy (Flash first for speed/cost)
        fallback_models = [
            "gemini-1.5-flash",      # Primary: fastest and cheapest
            "gemini-1.5-pro",       # Fallback: more capable but slower
            "gemini-pro",           # Legacy fallback
        ]

        # If specific model requested, try it first
        if requested_model not in fallback_models:
            fallback_models.insert(0, requested_model)

        return fallback_models[0]  # Return primary model for now

    async def complete(
        self,
        messages: List[AIMessage],
        model: Optional[str] = None,
        temperature: float = 0.7,
        max_tokens: Optional[int] = None,
        tools: Optional[List[Dict[str, Any]]] = None,
        user_id: Optional[str] = None,
        **kwargs
    ) -> AIResponse:
        """Generate a completion using Gemini"""
        if not self.model:
            raise RuntimeError("Gemini client not initialized")

        start_time = time.time()

        try:
            # Convert messages to Gemini format
            conversation_parts = []
            system_instruction = None

            for msg in messages:
                if msg.role == "system":
                    system_instruction = msg.content
                elif msg.role == "user":
                    conversation_parts.append({"role": "user", "parts": [msg.content]})
                elif msg.role == "assistant":
                    conversation_parts.append({"role": "model", "parts": [msg.content]})

            # Convert messages to the format expected by function handler
            message_dicts = [{"role": msg.role, "content": msg.content} for msg in messages]

            # Update generation config if parameters provided
            generation_config = self.generation_config.copy()
            generation_config["temperature"] = temperature
            if max_tokens:
                generation_config["max_output_tokens"] = min(max_tokens, 8192)

            # Handle function calling if tools provided
            gemini_tools = None
            function_results = []

            if tools and self.function_handler and user_id:
                try:
                    # Convert OpenAI tools to Gemini format
                    gemini_tools = self.function_handler.convert_openai_tools_to_gemini(tools)
                    logger.info(f"🔧 Converted {len(tools)} tools for function calling")
                except Exception as e:
                    logger.error(f"❌ Failed to convert tools: {e}")
                    gemini_tools = None

            # Create model instance with updated config
            model_name = self._get_model_with_fallback(model)
            current_model = GenerativeModel(
                model_name=model_name,
                generation_config=generation_config,
                safety_settings=self.safety_settings,
                system_instruction=system_instruction
            )

            # Generate response with or without function calling
            if gemini_tools and self.function_handler and user_id:
                # Use function calling handler for complex conversation
                try:
                    response_text, function_results = await self.function_handler.handle_function_calling_conversation(
                        model=current_model,
                        messages=message_dicts,
                        tools=gemini_tools,
                        user_id=user_id
                    )

                    # Create a mock response object for compatibility
                    class MockResponse:
                        def __init__(self, text):
                            self.text = text
                            self.usage_metadata = None
                            self.candidates = []

                    response = MockResponse(response_text)
                    logger.info(f"✅ Function calling completed with {len(function_results)} function calls")

                except Exception as e:
                    logger.error(f"❌ Function calling failed, falling back to regular chat: {e}")
                    # Fall back to regular generation
                    if len(conversation_parts) == 1 and conversation_parts[0]["role"] == "user":
                        response = current_model.generate_content(conversation_parts[0]["parts"][0])
                    else:
                        chat = current_model.start_chat(history=conversation_parts[:-1])
                        last_message = conversation_parts[-1]["parts"][0]
                        response = chat.send_message(last_message)
            else:
                # Regular generation without function calling
                if len(conversation_parts) == 0:
                    # Handle case with only system message
                    response = current_model.generate_content("")
                elif len(conversation_parts) == 1 and conversation_parts[0]["role"] == "user":
                    # Single user message
                    response = current_model.generate_content(conversation_parts[0]["parts"][0])
                else:
                    # Multi-turn conversation
                    chat = current_model.start_chat(history=conversation_parts[:-1])
                    last_message = conversation_parts[-1]["parts"][0]
                    response = chat.send_message(last_message)

            # Calculate latency
            end_time = time.time()
            latency_ms = (end_time - start_time) * 1000

            # Extract usage information
            usage = {
                "prompt_tokens": response.usage_metadata.prompt_token_count if hasattr(response, 'usage_metadata') else 0,
                "completion_tokens": response.usage_metadata.candidates_token_count if hasattr(response, 'usage_metadata') else 0,
                "total_tokens": response.usage_metadata.total_token_count if hasattr(response, 'usage_metadata') else 0
            }

            # Get finish reason
            finish_reason = None
            if hasattr(response, 'candidates') and response.candidates:
                candidate = response.candidates[0]
                if hasattr(candidate, 'finish_reason'):
                    finish_reason = str(candidate.finish_reason)

            # Convert function results to format expected by AIResponse
            function_calls_data = None
            if function_results:
                function_calls_data = [
                    {
                        "name": result.function_name,
                        "success": result.success,
                        "result": result.result,
                        "error": result.error,
                        "execution_time_ms": result.execution_time_ms
                    }
                    for result in function_results
                ]

            return AIResponse(
                content=response.text,
                model=model_name,
                provider="gemini",
                usage=usage,
                latency_ms=latency_ms,
                finish_reason=finish_reason,
                function_calls=function_calls_data,
                cached=False  # Gemini doesn't expose cache info
            )

        except Exception as e:
            logger.error(f"Gemini completion failed: {e}")
            # Return error response
            end_time = time.time()
            latency_ms = (end_time - start_time) * 1000

            raise RuntimeError(f"Gemini completion failed: {str(e)}")

    async def complete_stream(
        self,
        messages: List[AIMessage],
        model: Optional[str] = None,
        temperature: float = 0.7,
        max_tokens: Optional[int] = None,
        **kwargs
    ) -> AsyncGenerator[str, None]:
        """Generate a streaming completion using Gemini"""
        if not self.model:
            raise RuntimeError("Gemini client not initialized")

        try:
            # Convert messages (similar to complete method)
            conversation_parts = []
            system_instruction = None

            for msg in messages:
                if msg.role == "system":
                    system_instruction = msg.content
                elif msg.role == "user":
                    conversation_parts.append({"role": "user", "parts": [msg.content]})
                elif msg.role == "assistant":
                    conversation_parts.append({"role": "model", "parts": [msg.content]})

            # Update generation config
            generation_config = self.generation_config.copy()
            generation_config["temperature"] = temperature
            if max_tokens:
                generation_config["max_output_tokens"] = min(max_tokens, 8192)

            # Create model instance
            model_name = self._get_model_with_fallback(model)
            current_model = GenerativeModel(
                model_name=model_name,
                generation_config=generation_config,
                safety_settings=self.safety_settings,
                system_instruction=system_instruction
            )

            # Generate streaming response
            if len(conversation_parts) == 1 and conversation_parts[0]["role"] == "user":
                # Single user message
                response_stream = current_model.generate_content(
                    conversation_parts[0]["parts"][0],
                    stream=True
                )
            else:
                # Multi-turn conversation
                chat = current_model.start_chat(history=conversation_parts[:-1])
                last_message = conversation_parts[-1]["parts"][0]
                response_stream = chat.send_message(last_message, stream=True)

            # Yield streaming chunks
            for chunk in response_stream:
                if hasattr(chunk, 'text') and chunk.text:
                    yield chunk.text

        except Exception as e:
            logger.error(f"Gemini streaming failed: {e}")
            yield f"Error: {str(e)}"

    async def health_check(self) -> Tuple[AIProviderStatus, str]:
        """Check if Gemini service is healthy"""
        if not GEMINI_AVAILABLE:
            return AIProviderStatus.UNHEALTHY, "Gemini package not installed"

        if not self.model:
            return AIProviderStatus.UNHEALTHY, "Gemini model not initialized"

        try:
            # Simple test request
            test_response = self.model.generate_content("Hello")
            if test_response.text:
                self._status = AIProviderStatus.HEALTHY
                return AIProviderStatus.HEALTHY, "Gemini service is healthy"
            else:
                self._status = AIProviderStatus.DEGRADED
                return AIProviderStatus.DEGRADED, "Gemini returned empty response"

        except Exception as e:
            self._status = AIProviderStatus.UNHEALTHY
            return AIProviderStatus.UNHEALTHY, f"Gemini health check failed: {str(e)}"

    async def get_embeddings(self, texts: List[str], model: Optional[str] = None) -> List[List[float]]:
        """Get embeddings for texts using Gemini (not directly supported)"""
        # Gemini doesn't have a dedicated embeddings API like OpenAI
        # This would need to be implemented using text-embedding models
        raise NotImplementedError("Embeddings not supported by Gemini provider yet")

    def get_supported_models(self) -> List[str]:
        """Get list of supported Gemini models"""
        return [
            "gemini-1.5-flash",     # Primary: fastest and cheapest
            "gemini-1.5-pro",      # More capable but slower/more expensive
            "gemini-pro",          # Legacy model
            "gemini-pro-vision",   # Vision capabilities (legacy)
        ]

    def estimate_cost(
        self,
        input_tokens: int,
        output_tokens: int,
        model: Optional[str] = None
    ) -> float:
        """Estimate cost for token usage"""
        model_name = model or self.config.default_model

        # Gemini Flash pricing (very cost-effective)
        if "flash" in model_name.lower():
            input_cost = (input_tokens / 1000) * 0.000075   # $0.075 per 1M tokens
            output_cost = (output_tokens / 1000) * 0.0003   # $0.30 per 1M tokens
        elif "pro" in model_name.lower():
            # Gemini Pro pricing
            input_cost = (input_tokens / 1000) * 0.00125    # $1.25 per 1M tokens
            output_cost = (output_tokens / 1000) * 0.005    # $5 per 1M tokens
        else:
            # Default to Flash pricing
            input_cost = (input_tokens / 1000) * 0.000075
            output_cost = (output_tokens / 1000) * 0.0003

        return input_cost + output_cost

    def set_tool_registry(self, tool_registry):
        """Set up function calling with tool registry"""
        try:
            self.function_handler = get_gemini_function_handler(tool_registry=tool_registry)
            logger.info("✅ Gemini function calling handler initialized with tool registry")
        except Exception as e:
            logger.warning(f"⚠️ Function calling handler failed to initialize: {e}")
            self.function_handler = None