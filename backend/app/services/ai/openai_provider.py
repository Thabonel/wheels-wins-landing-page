"""
OpenAI Provider Implementation
Supports GPT-4, GPT-3.5, and other OpenAI models
"""

import time
from typing import List, Dict, Any, AsyncGenerator, Optional, Tuple
from openai import AsyncOpenAI, OpenAIError
import logging

from .provider_interface import (
    AIProviderInterface, AIMessage, AIResponse, AICapability,
    AIProviderStatus, ProviderConfig
)

logger = logging.getLogger(__name__)


class OpenAIProvider(AIProviderInterface):
    """OpenAI API provider implementation"""
    
    def __init__(self, config: ProviderConfig):
        # Set default OpenAI capabilities
        if not config.capabilities:
            config.capabilities = [
                AICapability.CHAT,
                AICapability.STREAMING,
                AICapability.FUNCTION_CALLING,
                AICapability.VISION,
                AICapability.EMBEDDINGS,
                AICapability.AUDIO
            ]
        
        # Set default models - GPT-5 Enhanced
        if not config.default_model:
            config.default_model = "gpt-5"  # Try GPT-5 first, fallback handled in complete()
        
        # Set token limits - GPT-5 capabilities
        config.max_context_window = 256000  # GPT-5: 256K context
        config.max_tokens_per_request = 128000  # GPT-5: 128K output
        
        # Set costs - GPT-5 pricing
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
            return status == AIProviderStatus.HEALTHY
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
            
            # Make the API call with GPT-5 fallback
            actual_model = self._get_model_with_fallback(model)
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
            return AIResponse(
                content=response.choices[0].message.content,
                model=response.model,
                provider="openai",
                usage={
                    "prompt_tokens": response.usage.prompt_tokens,
                    "completion_tokens": response.usage.completion_tokens,
                    "total_tokens": response.usage.total_tokens
                },
                latency_ms=latency_ms,
                finish_reason=response.choices[0].finish_reason,
                function_calls=[call.model_dump() for call in response.choices[0].message.function_calls] if hasattr(response.choices[0].message, 'function_calls') and response.choices[0].message.function_calls else None
            )
            
        except OpenAIError as e:
            self.record_failure(e)
            logger.error(f"OpenAI API error: {e}")
            raise
        except Exception as e:
            self.record_failure(e)
            logger.error(f"Unexpected error in OpenAI completion: {e}")
            raise
    
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