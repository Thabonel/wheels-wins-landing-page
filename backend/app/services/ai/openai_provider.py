"""
OpenAI Provider Implementation
Supports GPT-5.1 Instant and GPT-5.1 Thinking models
"""

import time
from typing import List, Dict, Any, AsyncGenerator, Optional, Tuple
from openai import AsyncOpenAI, OpenAIError
import logging

from .provider_interface import (
    AIProviderInterface, AIMessage, AIResponse, AICapability,
    AIProviderStatus, ProviderConfig
)
from app.config.ai_providers import (
    OPENAI_MODEL,
    OPENAI_MAX_COMPLETION_TOKENS,
    OPENAI_TEMPERATURE,
    OPENAI_THINKING_MODEL,
    validate_model,
)

logger = logging.getLogger(__name__)


class OpenAIProvider(AIProviderInterface):
    """OpenAI API provider implementation"""
    
    def __init__(self, config: ProviderConfig):
        # Set default OpenAI capabilities
        # Check for both empty and default-only (CHAT) capabilities
        if not config.capabilities or config.capabilities == [AICapability.CHAT]:
            config.capabilities = [
                AICapability.CHAT,
                AICapability.STREAMING,
                AICapability.FUNCTION_CALLING,
                AICapability.VISION,
                AICapability.EMBEDDINGS,
                AICapability.AUDIO
            ]
        
        # Set default model - GPT-5.1 Instant (Nov 2025 release)
        if not config.default_model:
            config.default_model = OPENAI_MODEL  # gpt-5.1-instant

        # Validate model is not deprecated
        validate_model(config.default_model, "openai")

        # Set token limits - GPT-5.1 capabilities
        config.max_context_window = 256000  # GPT-5.1: 256K context
        config.max_tokens_per_request = OPENAI_MAX_COMPLETION_TOKENS  # 4096 output

        # Set costs - GPT-5.1 Instant pricing
        config.cost_per_1k_input_tokens = 0.00125  # $1.25/M tokens
        config.cost_per_1k_output_tokens = 0.01    # $10/M tokens
        
        super().__init__(config)
        self.client = None
    
    async def initialize(self) -> bool:
        """Initialize OpenAI client"""
        try:
            self.client = AsyncOpenAI(api_key=self.config.api_key)
            # Test the connection
            status, message = await self.health_check()
            if status == AIProviderStatus.HEALTHY:
                return True

            # If health check failed with GPT-5, try falling back to GPT-4
            if "gpt-5" in self.config.default_model:
                logger.warning(f"GPT-5.1 unavailable, falling back to gpt-4-turbo")
                self.config.default_model = "gpt-4-turbo"
                status, message = await self.health_check()
                return status == AIProviderStatus.HEALTHY

            return False
        except Exception as e:
            logger.error(f"Failed to initialize OpenAI provider: {e}")
            self._status = AIProviderStatus.UNHEALTHY
            return False
    
    def _get_model_with_fallback(self, model: Optional[str] = None) -> str:
        """Get model with GPT-5 fallback to GPT-4"""
        requested_model = model or self.config.default_model
        
        # If GPT-5 requested, check availability
        if "gpt-5" in requested_model:
            try:
                # Try a quick test to see if GPT-5 is available
                # In production, this would be cached
                return "gpt-5"
            except:
                logger.info("GPT-5 not available, falling back to GPT-4-turbo")
                return "gpt-4-turbo-preview"
        
        return requested_model
    
    async def complete(
        self,
        messages: List[AIMessage],
        model: Optional[str] = None,
        temperature: float = 0.7,
        max_tokens: Optional[int] = None,
        **kwargs
    ) -> AIResponse:
        """Generate a completion using OpenAI"""
        if not self.client:
            raise RuntimeError("OpenAI client not initialized")
        
        start_time = time.time()
        
        try:
            # Convert messages to OpenAI Chat Completions format (fallback)
            openai_messages = []
            system_message = None
            
            for msg in messages:
                if msg.role == "system":
                    system_message = msg.content
                else:
                    openai_messages.append(msg.to_openai_format())
            
            # Add system message if present
            if system_message:
                openai_messages.insert(0, {"role": "system", "content": system_message})

            # ----- TOOL HANDLING -----
            # Convert "functions" to "tools" for OpenAI's newer Chat Completions API
            # Newer models (GPT-5.1) use "tools" parameter, not "functions"
            tools = kwargs.pop("tools", None)
            functions = kwargs.pop("functions", None)

            # If functions provided, convert to tools format
            if functions and not tools:
                tools = self._convert_functions_to_tools(functions)
                logger.info(f"🔄 Converted {len(functions)} functions to tools format for OpenAI")

            # Add tools to kwargs if present
            if tools:
                kwargs["tools"] = tools
                logger.info(f"🔧 Passing {len(tools)} tools to OpenAI API")
            # ----- END TOOL HANDLING -----

            # Use Chat Completions API for all models (GPT-5.1 uses max_completion_tokens)
            actual_model = model or self.config.default_model

            # For GPT-5.1 models, use max_completion_tokens parameter
            if "gpt-5" in actual_model:
                response = await self.client.chat.completions.create(
                    model=actual_model,
                    messages=openai_messages,
                    temperature=temperature,
                    max_completion_tokens=max_tokens or self.config.max_tokens_per_request,
                    **kwargs
                )
            else:
                # For older models (if any), use max_tokens
                response = await self.client.chat.completions.create(
                    model=actual_model,
                    messages=openai_messages,
                    temperature=temperature,
                    max_tokens=max_tokens or self.config.max_tokens_per_request,
                    **kwargs
                )
            
            # Calculate latency
            latency_ms = (time.time() - start_time) * 1000
            
            # Record success
            self.record_success(latency_ms)
            
            # Build response
            message_payload = response.choices[0].message

            function_calls = None
            if hasattr(message_payload, "function_calls") and message_payload.function_calls:
                function_calls = [
                    self._serialize_function_call(call)
                    for call in message_payload.function_calls
                ]
            elif hasattr(message_payload, "tool_calls") and message_payload.tool_calls:
                function_calls = [
                    self._serialize_tool_call(call)
                    for call in message_payload.tool_calls
                ]
            elif hasattr(message_payload, "function_call") and message_payload.function_call:
                function_calls = [
                    {
                        "id": getattr(message_payload.function_call, "id", None),
                        "type": "function",
                        "function": {
                            "name": getattr(message_payload.function_call, "name", None),
                            "arguments": getattr(message_payload.function_call, "arguments", None)
                        }
                    }
                ]

            return AIResponse(
                content=message_payload.content,
                model=response.model,
                provider="openai",
                usage={
                    "prompt_tokens": response.usage.prompt_tokens,
                    "completion_tokens": response.usage.completion_tokens,
                    "total_tokens": response.usage.total_tokens
                },
                latency_ms=latency_ms,
                finish_reason=response.choices[0].finish_reason,
                function_calls=function_calls
            )
            
        except OpenAIError as e:
            # Handle 404 errors for GPT-5 by falling back to GPT-4
            if "404" in str(e) and "gpt-5" in actual_model:
                logger.warning(f"GPT-5 model not found (404), falling back to gpt-4-turbo")
                self.config.default_model = "gpt-4-turbo"
                # Retry with GPT-4
                return await self.complete(messages, model="gpt-4-turbo", temperature=temperature, max_tokens=max_tokens, **kwargs)

            self.record_failure(e)
            logger.error(f"OpenAI API error: {e}")
            raise
        except Exception as e:
            self.record_failure(e)
            logger.error(f"Unexpected error in OpenAI completion: {e}")
            raise

    def _convert_functions_to_tools(self, functions: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Convert OpenAI functions format to tools format.

        Functions format (old):
        {
            "name": "...",
            "description": "...",
            "parameters": {...}
        }

        Tools format (new):
        {
            "type": "function",
            "function": {
                "name": "...",
                "description": "...",
                "parameters": {...}
            }
        }

        Args:
            functions: List of functions in old format

        Returns:
            List of tools in new format
        """
        tools = []
        for func in functions:
            # Check if already in tools format
            if "type" in func and func["type"] == "function" and "function" in func:
                tools.append(func)
                continue

            # Convert from functions format to tools format
            tool = {
                "type": "function",
                "function": {
                    "name": func.get("name"),
                    "description": func.get("description", ""),
                    "parameters": func.get("parameters", {"type": "object", "properties": {}})
                }
            }
            tools.append(tool)

        return tools

    def _extract_function_payload(self, function_payload: Any) -> Dict[str, Any]:
        """Normalize OpenAI function payloads into a consistent dictionary."""
        if function_payload is None:
            return {"name": None, "arguments": None}

        if isinstance(function_payload, dict):
            return {
                "name": function_payload.get("name"),
                "arguments": function_payload.get("arguments")
            }

        if hasattr(function_payload, "model_dump"):
            dumped = function_payload.model_dump()
            return {
                "name": dumped.get("name"),
                "arguments": dumped.get("arguments")
            }

        return {
            "name": getattr(function_payload, "name", None),
            "arguments": getattr(function_payload, "arguments", None)
        }

    def _serialize_function_call(self, call: Any) -> Dict[str, Any]:
        """Serialize OpenAI function call payloads for downstream tooling."""
        if hasattr(call, "model_dump"):
            data = call.model_dump()
            if "function" in data:
                data["function"] = self._extract_function_payload(data["function"])
            else:
                data["function"] = self._extract_function_payload(call)
            data.setdefault("type", "function")
            return data

        return {
            "id": getattr(call, "id", None),
            "type": getattr(call, "type", "function"),
            "function": self._extract_function_payload(getattr(call, "function", call))
        }

    def _serialize_tool_call(self, call: Any) -> Dict[str, Any]:
        """Serialize OpenAI tool call payloads into function-call compatible dictionaries."""
        if hasattr(call, "model_dump"):
            data = call.model_dump()
            data.setdefault("type", getattr(call, "type", "tool"))
            if "function" in data:
                data["function"] = self._extract_function_payload(data["function"])
            return data

        return {
            "id": getattr(call, "id", None),
            "type": getattr(call, "type", "tool"),
            "function": self._extract_function_payload(getattr(call, "function", None))
        }

    async def stream(
        self,
        messages: List[AIMessage],
        model: Optional[str] = None,
        temperature: float = 0.7,
        max_tokens: Optional[int] = None,
        **kwargs
    ) -> AsyncGenerator[str, None]:
        """Stream a completion from OpenAI"""
        if not self.client:
            raise RuntimeError("OpenAI client not initialized")
        
        start_time = time.time()
        
        try:
            # Convert messages to OpenAI format
            openai_messages = []
            system_message = None
            
            for msg in messages:
                if msg.role == "system":
                    system_message = msg.content
                else:
                    openai_messages.append(msg.to_openai_format())
            
            # Add system message if present
            if system_message:
                openai_messages.insert(0, {"role": "system", "content": system_message})
            
            # Create the stream
            stream = await self.client.chat.completions.create(
                model=model or self.config.default_model,
                messages=openai_messages,
                temperature=temperature,
                max_tokens=max_tokens or self.config.max_tokens_per_request,
                stream=True,
                **kwargs
            )
            
            # Stream the response
            first_chunk = True
            async for chunk in stream:
                if first_chunk:
                    # Record time to first token
                    latency_ms = (time.time() - start_time) * 1000
                    self.record_success(latency_ms)
                    first_chunk = False
                
                if chunk.choices[0].delta.content:
                    yield chunk.choices[0].delta.content
                    
        except OpenAIError as e:
            self.record_failure(e)
            logger.error(f"OpenAI streaming error: {e}")
            raise
        except Exception as e:
            self.record_failure(e)
            logger.error(f"Unexpected error in OpenAI streaming: {e}")
            raise
    
    async def health_check(self) -> Tuple[AIProviderStatus, Optional[str]]:
        """Check OpenAI API health"""
        try:
            # Simple test call
            response = await self.client.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=[{"role": "user", "content": "test"}],
                max_tokens=1,
                timeout=10.0
            )
            
            self._status = AIProviderStatus.HEALTHY
            self._last_health_check = time.time()
            return AIProviderStatus.HEALTHY, "OpenAI API is responding"
            
        except Exception as e:
            self._status = AIProviderStatus.UNHEALTHY
            self._last_health_check = time.time()
            return AIProviderStatus.UNHEALTHY, f"OpenAI API error: {str(e)}"
    
    async def cleanup(self) -> None:
        """Cleanup OpenAI client"""
        if self.client:
            await self.client.close()
            self.client = None
