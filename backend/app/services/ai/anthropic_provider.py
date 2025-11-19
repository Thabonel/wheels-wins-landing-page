"""
Anthropic Claude Provider Implementation
Supports Claude Sonnet 4.5 with native MCP support
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
from app.config.ai_providers import (
    ANTHROPIC_MODEL,
    ANTHROPIC_MAX_TOKENS,
    ANTHROPIC_TEMPERATURE,
    validate_model,
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
    """Anthropic Claude API provider implementation with native MCP support"""
    
    def __init__(self, config: ProviderConfig):
        # Check if Anthropic is available
        if not ANTHROPIC_AVAILABLE:
            raise RuntimeError("Anthropic package is not installed. Install with: pip install anthropic")
        
        # Set default Claude capabilities
        # Check for both empty and default-only (CHAT) capabilities
        if not config.capabilities or config.capabilities == [AICapability.CHAT]:
            config.capabilities = [
                AICapability.CHAT,
                AICapability.STREAMING,
                AICapability.VISION,
                AICapability.LONG_CONTEXT,
                AICapability.FAST_RESPONSE,
                AICapability.FUNCTION_CALLING  # Native MCP support
            ]
        
        # Set default model - Claude Sonnet 4.5 (Sept 2025 release)
        if not config.default_model:
            config.default_model = ANTHROPIC_MODEL  # claude-sonnet-4-5-20250929

        # Validate model is not deprecated
        validate_model(config.default_model, "anthropic")

        # Set token limits - Claude Sonnet 4.5 capabilities
        config.max_context_window = 200000  # Claude Sonnet 4.5: 200K context
        config.max_tokens_per_request = ANTHROPIC_MAX_TOKENS  # 4096 max output

        # Set costs - Claude Sonnet 4.5 pricing
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
            
            # ----- TOOL HANDLING (PAM tools + Mapbox) -----
            # Get Mapbox MCP tools
            mapbox_tools = mapbox_mcp_tools.get_tool_definitions() or []
            
            # Collect any additional tools passed in (e.g. PAM tools from orchestrator)
            # Support both "tools" (Claude format) and "functions" (OpenAI format) for compatibility
            extra_tools = kwargs.pop("tools", None)
            if not extra_tools:
                # Fallback to "functions" parameter (OpenAI format)
                extra_tools = kwargs.pop("functions", None)
                if extra_tools:
                    logger.info("🔄 Converting 'functions' parameter to 'tools' for Claude compatibility")
            extra_tools = extra_tools or []

            # Convert OpenAI format to Claude format if needed
            if extra_tools:
                extra_tools = self._convert_openai_to_claude_format(extra_tools)
            
            # Check if tools should be enabled (remove from kwargs to avoid passing to API)
            enable_tools = kwargs.pop("enable_tools", True)
            
            # Combine tools into a single list
            combined_tools: List[Dict[str, Any]] = []
            if extra_tools:
                combined_tools.extend(extra_tools)
            if mapbox_tools:
                combined_tools.extend(mapbox_tools)
            # ----- END TOOL HANDLING -----
            
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
            if combined_tools and enable_tools:
                api_params["tools"] = combined_tools
                logger.info(
                    f"🔧 Added {len(combined_tools)} tools to Claude "
                    f"({len(extra_tools)} app tools, {len(mapbox_tools)} Mapbox tools)"
                )

                # DIAGNOSTIC: Log tool names to verify weather_advisor is present
                tool_names = [t.get('name', 'unnamed') for t in combined_tools]
                logger.info(f"📋 Tool names in payload: {tool_names}")

                # DIAGNOSTIC: Log full schema of weather_advisor if found
                weather_tool = next((t for t in combined_tools if 'weather' in t.get('name', '').lower()), None)
                if weather_tool:
                    import json
                    logger.info(f"🌤️ Weather tool schema: {json.dumps(weather_tool, indent=2)}")
                else:
                    logger.warning("⚠️ No weather tool found in payload despite registration")
            else:
                logger.warning(f"⚠️ CRITICAL: Tool list is EMPTY (combined_tools={len(combined_tools) if combined_tools else 0}, enable_tools={enable_tools})")

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

    def _convert_openai_to_claude_format(self, tools: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Convert OpenAI tool format to Claude tool format.

        OpenAI format uses 'parameters', Claude uses 'input_schema'.
        Also handles OpenAI's nested 'function' structure.

        Args:
            tools: List of tools in OpenAI format

        Returns:
            List of tools in Claude format
        """
        claude_tools = []

        for tool in tools:
            # Check if already in Claude format (has 'input_schema')
            if "input_schema" in tool:
                claude_tools.append(tool)
                continue

            # Handle OpenAI nested function structure
            if "type" in tool and tool["type"] == "function" and "function" in tool:
                func_def = tool["function"]
                claude_tool = {
                    "name": func_def.get("name"),
                    "description": func_def.get("description", ""),
                    "input_schema": func_def.get("parameters", {"type": "object", "properties": {}})
                }
                claude_tools.append(claude_tool)
            # Handle flat OpenAI format with 'parameters'
            elif "parameters" in tool:
                claude_tool = {
                    "name": tool.get("name"),
                    "description": tool.get("description", ""),
                    "input_schema": tool["parameters"]
                }
                claude_tools.append(claude_tool)
            else:
                # Unknown format, log warning and skip
                logger.warning(f"⚠️ Unknown tool format, skipping: {tool.get('name', 'unknown')}")

        logger.info(f"🔄 Converted {len(claude_tools)} tools from OpenAI to Claude format")
        return claude_tools

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
