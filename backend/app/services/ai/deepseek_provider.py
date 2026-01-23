"""
DeepSeek V3 Provider Implementation
Cost-effective AI for free-tier users - OpenAI-compatible API
API Docs: https://api-docs.deepseek.com/
"""

import time
from typing import List, Dict, Any, AsyncGenerator, Optional, Tuple
import logging

from .provider_interface import (
    AIProviderInterface, AIMessage, AIResponse, AICapability,
    AIProviderStatus, ProviderConfig
)

logger = logging.getLogger(__name__)

# Safe import of OpenAI SDK (DeepSeek uses OpenAI-compatible API)
try:
    from openai import AsyncOpenAI, OpenAIError
    OPENAI_SDK_AVAILABLE = True
except ImportError:
    logger.warning("OpenAI package not installed. DeepSeek provider will be unavailable.")
    OPENAI_SDK_AVAILABLE = False
    AsyncOpenAI = None
    OpenAIError = Exception


class DeepSeekProvider(AIProviderInterface):
    """
    DeepSeek V3 provider - OpenAI-compatible API for free-tier users

    Cost comparison (per 1M tokens):
    - DeepSeek V3: US$0.27 input / US$1.10 output
    - Claude Sonnet 4.5: US$3.00 input / US$15.00 output
    - Savings: ~90% reduction

    Features:
    - 64K context window
    - Function calling support
    - Streaming support
    - Prefix caching (90% discount on cache hits)
    """

    BASE_URL = "https://api.deepseek.com"
    DEFAULT_MODEL = "deepseek-chat"

    def __init__(self, config: ProviderConfig):
        if not OPENAI_SDK_AVAILABLE:
            raise RuntimeError(
                "OpenAI package is not installed. DeepSeek uses OpenAI-compatible API. "
                "Install with: pip install openai"
            )

        # Set default DeepSeek capabilities
        if not config.capabilities or config.capabilities == [AICapability.CHAT]:
            config.capabilities = [
                AICapability.CHAT,
                AICapability.STREAMING,
                AICapability.FUNCTION_CALLING,
                AICapability.LONG_CONTEXT,
            ]

        # Set default model
        if not config.default_model:
            config.default_model = self.DEFAULT_MODEL

        # Set token limits - DeepSeek V3 capabilities
        config.max_context_window = 65536  # 64K context
        config.max_tokens_per_request = 8192  # Max output tokens

        # Set costs - DeepSeek V3 pricing (per 1K tokens)
        # Pricing: US$0.27/1M input, US$1.10/1M output
        config.cost_per_1k_input_tokens = 0.00027   # US$0.27/1M = US$0.00027/1K
        config.cost_per_1k_output_tokens = 0.0011   # US$1.10/1M = US$0.0011/1K

        super().__init__(config)
        self.client = None

    async def initialize(self) -> bool:
        """Initialize DeepSeek client using OpenAI SDK with custom base URL"""
        if not OPENAI_SDK_AVAILABLE:
            self._status = AIProviderStatus.UNHEALTHY
            return False

        try:
            self.client = AsyncOpenAI(
                api_key=self.config.api_key,
                base_url=self.BASE_URL
            )

            # Test the connection
            status, message = await self.health_check()
            return status == AIProviderStatus.HEALTHY

        except Exception as e:
            logger.error(f"Failed to initialize DeepSeek provider: {e}")
            self._status = AIProviderStatus.UNHEALTHY
            return False

    async def complete(
        self,
        messages: List[AIMessage],
        model: Optional[str] = None,
        temperature: float = 0.7,
        max_tokens: Optional[int] = None,
        **kwargs
    ) -> AIResponse:
        """Generate a completion using DeepSeek"""
        if not self.client:
            raise RuntimeError("DeepSeek client not initialized")

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

            # Tool handling - convert functions to tools format
            tools = kwargs.pop("tools", None)
            functions = kwargs.pop("functions", None)

            if functions and not tools:
                tools = self._convert_functions_to_tools(functions)
                logger.info(f"Converted {len(functions)} functions to tools format for DeepSeek")

            # Build API parameters
            api_params = {
                "model": model or self.config.default_model,
                "messages": openai_messages,
                "temperature": temperature,
                "max_tokens": max_tokens or self.config.max_tokens_per_request,
            }

            # Add tools if present
            if tools:
                api_params["tools"] = tools
                logger.info(f"Passing {len(tools)} tools to DeepSeek API")

            # Make the API call
            response = await self.client.chat.completions.create(**api_params)

            # Calculate latency
            latency_ms = (time.time() - start_time) * 1000

            # Record success
            self.record_success(latency_ms)

            # Extract function calls if present
            function_calls = None
            message_payload = response.choices[0].message

            if hasattr(message_payload, "tool_calls") and message_payload.tool_calls:
                function_calls = [
                    self._serialize_tool_call(call)
                    for call in message_payload.tool_calls
                ]

            # Build response
            return AIResponse(
                content=message_payload.content or "",
                model=response.model,
                provider="deepseek",
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
            self.record_failure(e)
            logger.error(f"DeepSeek API error: {e}")
            raise
        except Exception as e:
            self.record_failure(e)
            logger.error(f"Unexpected error in DeepSeek completion: {e}")
            raise

    def _convert_functions_to_tools(self, functions: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Convert OpenAI functions format to tools format"""
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

    def _serialize_tool_call(self, call: Any) -> Dict[str, Any]:
        """Serialize tool call into function-call compatible dictionary"""
        if hasattr(call, "model_dump"):
            data = call.model_dump()
            data.setdefault("type", getattr(call, "type", "function"))
            return data

        # Manual serialization
        func = getattr(call, "function", None)
        return {
            "id": getattr(call, "id", None),
            "type": getattr(call, "type", "function"),
            "function": {
                "name": getattr(func, "name", None) if func else None,
                "arguments": getattr(func, "arguments", None) if func else None
            }
        }

    async def stream(
        self,
        messages: List[AIMessage],
        model: Optional[str] = None,
        temperature: float = 0.7,
        max_tokens: Optional[int] = None,
        **kwargs
    ) -> AsyncGenerator[str, None]:
        """Stream a completion from DeepSeek"""
        if not self.client:
            raise RuntimeError("DeepSeek client not initialized")

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
                stream=True
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
            logger.error(f"DeepSeek streaming error: {e}")
            raise
        except Exception as e:
            self.record_failure(e)
            logger.error(f"Unexpected error in DeepSeek streaming: {e}")
            raise

    async def health_check(self) -> Tuple[AIProviderStatus, Optional[str]]:
        """Check DeepSeek API health"""
        if not OPENAI_SDK_AVAILABLE:
            return AIProviderStatus.UNHEALTHY, "OpenAI package not installed"

        if not self.client:
            return AIProviderStatus.UNHEALTHY, "Client not initialized"

        try:
            # Simple test call with minimal tokens
            response = await self.client.chat.completions.create(
                model=self.DEFAULT_MODEL,
                messages=[{"role": "user", "content": "hi"}],
                max_tokens=1,
                timeout=10.0
            )

            self._status = AIProviderStatus.HEALTHY
            self._last_health_check = time.time()
            return AIProviderStatus.HEALTHY, "DeepSeek API is responding"

        except Exception as e:
            self._status = AIProviderStatus.UNHEALTHY
            self._last_health_check = time.time()
            return AIProviderStatus.UNHEALTHY, f"DeepSeek API error: {str(e)}"

    async def cleanup(self) -> None:
        """Cleanup DeepSeek client"""
        if self.client:
            await self.client.close()
            self.client = None
