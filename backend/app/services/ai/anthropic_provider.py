"""
Anthropic Claude Provider Implementation
Supports Claude 3 models with safe import handling
"""

import time
from typing import List, Dict, Any, AsyncGenerator, Optional, Tuple
import logging

from .provider_interface import (
    AIProviderInterface, AIMessage, AIResponse, AICapability,
    AIProviderStatus, ProviderConfig
)

logger = logging.getLogger(__name__)

# Safe import of Anthropic
try:
    import anthropic
    from anthropic import AnthropicError
    ANTHROPIC_AVAILABLE = True
except ImportError:
    logger.warning("Anthropic package not installed. Claude provider will be unavailable.")
    ANTHROPIC_AVAILABLE = False
    anthropic = None
    AnthropicError = Exception  # Fallback for type hints


class AnthropicProvider(AIProviderInterface):
    """Anthropic Claude API provider implementation"""
    
    def __init__(self, config: ProviderConfig):
        # Check if Anthropic is available
        if not ANTHROPIC_AVAILABLE:
            raise RuntimeError("Anthropic package is not installed. Install with: pip install anthropic")
        
        # Set default Claude capabilities
        if not config.capabilities:
            config.capabilities = [
                AICapability.CHAT,
                AICapability.STREAMING,
                AICapability.VISION,
                AICapability.LONG_CONTEXT,
                AICapability.FAST_RESPONSE
            ]
        
        # Set default model
        if not config.default_model:
            config.default_model = "claude-3-opus-20240229"
        
        # Set token limits
        config.max_context_window = 200000  # Claude 3
        config.max_tokens_per_request = 4096
        
        # Set costs (as of 2024)
        config.cost_per_1k_input_tokens = 0.015
        config.cost_per_1k_output_tokens = 0.075
        
        super().__init__(config)
        self.client = None
    
    async def initialize(self) -> bool:
        """Initialize Anthropic client"""
        if not ANTHROPIC_AVAILABLE:
            self._status = AIProviderStatus.UNHEALTHY
            return False
        
        try:
            self.client = anthropic.AsyncAnthropic(api_key=self.config.api_key)
            # Test the connection
            status, message = await self.health_check()
            return status == AIProviderStatus.HEALTHY
        except Exception as e:
            logger.error(f"Failed to initialize Anthropic provider: {e}")
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
        """Generate a completion using Claude"""
        if not self.client:
            raise RuntimeError("Anthropic client not initialized")
        
        start_time = time.time()
        
        try:
            # Convert messages to Anthropic format
            anthropic_messages = []
            system_message = None
            
            for msg in messages:
                if msg.role == "system":
                    system_message = msg.content
                else:
                    formatted = msg.to_anthropic_format()
                    if formatted:
                        anthropic_messages.append(formatted)
            
            # Make the API call
            response = await self.client.messages.create(
                model=model or self.config.default_model,
                messages=anthropic_messages,
                system=system_message if system_message else "You are a helpful AI assistant.",
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
                content=response.content[0].text,
                model=response.model,
                provider="anthropic",
                usage={
                    "prompt_tokens": response.usage.input_tokens,
                    "completion_tokens": response.usage.output_tokens,
                    "total_tokens": response.usage.input_tokens + response.usage.output_tokens
                },
                latency_ms=latency_ms,
                finish_reason=response.stop_reason
            )
            
        except AnthropicError as e:
            self.record_failure(e)
            logger.error(f"Anthropic API error: {e}")
            raise
        except Exception as e:
            self.record_failure(e)
            logger.error(f"Unexpected error in Anthropic completion: {e}")
            raise
    
    async def stream(
        self,
        messages: List[AIMessage],
        model: Optional[str] = None,
        temperature: float = 0.7,
        max_tokens: Optional[int] = None,
        **kwargs
    ) -> AsyncGenerator[str, None]:
        """Stream a completion from Claude"""
        if not self.client:
            raise RuntimeError("Anthropic client not initialized")
        
        start_time = time.time()
        
        try:
            # Convert messages to Anthropic format
            anthropic_messages = []
            system_message = None
            
            for msg in messages:
                if msg.role == "system":
                    system_message = msg.content
                else:
                    formatted = msg.to_anthropic_format()
                    if formatted:
                        anthropic_messages.append(formatted)
            
            # Create the stream
            async with self.client.messages.stream(
                model=model or self.config.default_model,
                messages=anthropic_messages,
                system=system_message if system_message else "You are a helpful AI assistant.",
                temperature=temperature,
                max_tokens=max_tokens or self.config.max_tokens_per_request,
                **kwargs
            ) as stream:
                first_chunk = True
                async for text in stream.text_stream:
                    if first_chunk:
                        # Record time to first token
                        latency_ms = (time.time() - start_time) * 1000
                        self.record_success(latency_ms)
                        first_chunk = False
                    
                    yield text
                    
        except AnthropicError as e:
            self.record_failure(e)
            logger.error(f"Anthropic streaming error: {e}")
            raise
        except Exception as e:
            self.record_failure(e)
            logger.error(f"Unexpected error in Anthropic streaming: {e}")
            raise
    
    async def health_check(self) -> Tuple[AIProviderStatus, Optional[str]]:
        """Check Anthropic API health"""
        if not ANTHROPIC_AVAILABLE:
            return AIProviderStatus.UNHEALTHY, "Anthropic package not installed"
        
        if not self.client:
            return AIProviderStatus.UNHEALTHY, "Client not initialized"
        
        try:
            # Simple test call
            response = await self.client.messages.create(
                model="claude-3-haiku-20240307",  # Fastest model
                messages=[{"role": "user", "content": "test"}],
                max_tokens=1,
                timeout=10.0
            )
            
            self._status = AIProviderStatus.HEALTHY
            self._last_health_check = time.time()
            return AIProviderStatus.HEALTHY, "Anthropic API is responding"
            
        except Exception as e:
            self._status = AIProviderStatus.UNHEALTHY
            self._last_health_check = time.time()
            return AIProviderStatus.UNHEALTHY, f"Anthropic API error: {str(e)}"
    
    async def cleanup(self) -> None:
        """Cleanup Anthropic client"""
        if self.client:
            # Anthropic client doesn't have explicit cleanup
            self.client = None