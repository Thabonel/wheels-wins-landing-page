"""
Anthropic Claude Provider Implementation
Supports Claude 3.5 Sonnet, Haiku, and Opus models with native MCP support
Enhanced with Mapbox location intelligence for travel planning
"""

import time
from typing import List, Dict, Any, AsyncGenerator, Optional, Tuple
import logging

from .provider_interface import (
    AIProviderInterface, AIMessage, AIResponse, AICapability,
    AIProviderStatus, ProviderConfig
)
from .mapbox_mcp_tools import mapbox_mcp_tools

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
    """Anthropic Claude API provider implementation with native MCP support"""
    
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
                AICapability.FAST_RESPONSE,
                AICapability.FUNCTION_CALLING  # Native MCP support
            ]
        
        # Set default model - Claude 3.5 Sonnet ONLY (never Opus for cost reasons)
        if not config.default_model:
            config.default_model = "claude-3-5-sonnet-20241022"
        
        # Set token limits - Claude 3.5 capabilities
        config.max_context_window = 200000  # Claude 3.5: 200K context
        config.max_tokens_per_request = 8192  # Claude 3.5: 8K max output
        
        # Set costs - Claude 3.5 Sonnet pricing
        config.cost_per_1k_input_tokens = 0.003   # $3/M input tokens
        config.cost_per_1k_output_tokens = 0.015  # $15/M output tokens
        
        super().__init__(config)
        self.client = None
        self.mcp_servers = []  # List of connected MCP servers for native integration
    
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
    
    def add_mcp_server(self, server_url: str, tools: List[str] = None):
        """Add an MCP server for native tool access in PAM conversations"""
        self.mcp_servers.append({
            "url": server_url,
            "tools": tools or []
        })
        logger.info(f"Added MCP server for PAM: {server_url}")
    
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
            
            # Get available tools (Mapbox MCP tools)
            available_tools = mapbox_mcp_tools.get_tool_definitions()
            
            # Prepare API call parameters
            api_params = {
                "model": model or self.config.default_model,
                "messages": anthropic_messages,
                "system": system_message if system_message else "You are PAM, a helpful AI assistant for travel planning.",
                "temperature": temperature,
                "max_tokens": max_tokens or self.config.max_tokens_per_request,
                **kwargs
            }
            
            # Add tools if available and not explicitly disabled
            if available_tools and kwargs.get('enable_tools', True):
                api_params["tools"] = available_tools
                logger.debug(f"🗺️ Added {len(available_tools)} Mapbox tools to Claude")
            
            # Make the API call
            response = await self.client.messages.create(**api_params)
            
            # Calculate latency
            latency_ms = (time.time() - start_time) * 1000
            
            # Record success
            self.record_success(latency_ms)
            
            # Handle tool calls if present
            if response.stop_reason == "tool_use":
                response = await self._handle_tool_calls(response, anthropic_messages, api_params)
            
            # Extract content (handle both text and tool call responses)
            content = ""
            if response.content:
                for content_block in response.content:
                    if hasattr(content_block, 'text'):
                        content += content_block.text
                    elif hasattr(content_block, 'type') and content_block.type == 'text':
                        content += content_block.text
            
            # Build response
            return AIResponse(
                content=content,
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
    
    async def _handle_tool_calls(self, response, messages: List[Dict], api_params: Dict) -> Any:
        """Handle tool calls from Claude and execute Mapbox tools"""
        try:
            # Build tool result messages
            tool_results = []
            
            for content_block in response.content:
                if hasattr(content_block, 'type') and content_block.type == 'tool_use':
                    tool_name = content_block.name
                    tool_input = content_block.input
                    tool_use_id = content_block.id
                    
                    logger.info(f"🗺️ Executing Mapbox tool: {tool_name}")
                    logger.debug(f"Tool input: {tool_input}")
                    
                    # Execute the Mapbox tool
                    result = await mapbox_mcp_tools.execute_tool(tool_name, tool_input)
                    
                    if result.success:
                        logger.info(f"✅ Tool {tool_name} executed successfully")
                        tool_results.append({
                            "type": "tool_result",
                            "tool_use_id": tool_use_id,
                            "content": str(result.data)
                        })
                    else:
                        logger.error(f"❌ Tool {tool_name} failed: {result.error}")
                        tool_results.append({
                            "type": "tool_result", 
                            "tool_use_id": tool_use_id,
                            "content": f"Tool execution failed: {result.error}",
                            "is_error": True
                        })
            
            # Continue conversation with tool results
            if tool_results:
                # Add Claude's tool use message to history
                messages.append({
                    "role": "assistant",
                    "content": response.content
                })
                
                # Add tool results message
                messages.append({
                    "role": "user", 
                    "content": tool_results
                })
                
                # Get Claude's response to the tool results
                api_params["messages"] = messages
                final_response = await self.client.messages.create(**api_params)
                return final_response
            
            return response
            
        except Exception as e:
            logger.error(f"❌ Error handling tool calls: {e}")
            return response
    
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