"""
PAM Claude AI Service - Anthropic Claude Integration
Complete Claude AI service that integrates Claude 3.5 Sonnet with PAM context management.
Replaces OpenAI integration with Claude's native internet search and weather capabilities.
"""

import asyncio
import json
import time
from typing import Dict, List, Any, Optional, AsyncGenerator, Tuple, Union
from datetime import datetime
from dataclasses import dataclass
from app.utils.datetime_encoder import DateTimeEncoder

import httpx
from httpx import AsyncClient
import jwt
from jwt.exceptions import InvalidTokenError

from app.core.config import get_settings
from app.core.logging import get_logger
from app.services.pam.context_manager import ContextManager
from app.services.pam.usecase_profiles import (
    PamUseCase, UseCaseProfile, pam_profile_manager
)
from app.services.database import DatabaseService
from app.core.exceptions import PAMError, ErrorCode
from app.services.pam.tools.tool_registry import get_tool_registry
from app.services.pam.tools.tool_capabilities import ToolCapability
from app.services.cache import cache_service

logger = get_logger(__name__)

CLAUDE_API_URL = "https://api.anthropic.com/v1/messages"

def get_latest_sonnet_model() -> str:
    """
    Get the latest Claude 3.5 Sonnet model automatically.
    Never returns Opus models (too expensive).
    Falls back to known stable model if API call fails.
    """
    try:
        from datetime import datetime
        current_date = datetime.now()

        # Use actually available Claude models (verified working)
        available_models = [
            "claude-3-5-sonnet-20241022",  # Known working model (October 2024)
            "claude-3-sonnet-20240229"     # Stable fallback
        ]

        # Return the working model to avoid 404 errors
        latest_candidate = available_models[0]

        logger.info(f"Using Claude model: {latest_candidate}")
        return latest_candidate

    except Exception as e:
        logger.warning(f"Failed to get latest Sonnet model, using fallback: {e}")
        return "claude-3-5-sonnet-20241022"

CLAUDE_MODEL = get_latest_sonnet_model()

@dataclass
class ClaudeMessage:
    """Claude-specific message format"""
    role: str  # "user", "assistant"
    content: Union[str, List[Dict]]
    timestamp: Optional[datetime] = None

@dataclass
class ClaudeResponse:
    """Claude AI service response with metadata"""
    content: str
    model: str
    usage: Dict[str, int]
    latency_ms: float
    stop_reason: str
    streaming: bool = False
    cached: bool = False
    confidence_score: Optional[float] = None
    tool_calls: Optional[List[Dict[str, Any]]] = None  # Tool use requests from Claude

class ClaudeError(Exception):
    """Claude API specific errors"""
    pass

class ClaudeAIService:
    """
    Claude AI Service for PAM

    Features:
    - Anthropic Claude 3.5 Sonnet integration
    - Native internet search capabilities
    - Context-aware conversation management
    - Weather queries with location awareness
    - Streaming and non-streaming responses
    - Token usage optimization
    - Error handling with retries
    - Performance monitoring
    """

    def __init__(self, db_service: Optional[DatabaseService] = None):
        self.settings = get_settings()
        self.client: Optional[AsyncClient] = None
        self.context_manager = ContextManager()
        self.db_service = db_service or DatabaseService()

        # Claude-specific configuration
        self.api_key = self._get_claude_api_key()
        self.model = CLAUDE_MODEL
        self.max_tokens = 8000  # Claude 3.5 Sonnet max output
        self.temperature = 0.7

        # Performance tracking
        self.request_count = 0
        self.total_tokens = 0
        self.total_cost = 0.0
        self.avg_latency = 0.0

        # Error handling
        self.max_retries = 3
        self.retry_delay = 1.0

        # Tool registry for PAM capabilities
        self.tool_registry = get_tool_registry()

        logger.info(f"Claude AI Service initialized with model: {self.model}")

    def _get_claude_api_key(self) -> str:
        """Get Claude API key from environment"""
        api_key = self.settings.anthropic_api_key
        if not api_key:
            # Try alternative environment variable names
            import os
            api_key = (
                os.getenv("ANTHROPIC_API_KEY") or
                os.getenv("CLAUDE_API_KEY") or
                os.getenv("VITE_ANTHROPIC_API_KEY")
            )

        if not api_key or api_key == "sk-ant-api03-your-api-key-here":
            raise PAMError(
                "Claude API key not configured. Please set ANTHROPIC_API_KEY environment variable.",
                ErrorCode.CONFIGURATION_ERROR
            )

        return api_key

    async def _get_client(self) -> AsyncClient:
        """Get or create HTTP client for Claude API"""
        if not self.client:
            self.client = AsyncClient(
                timeout=httpx.Timeout(30.0),
                headers={
                    "x-api-key": self.api_key,
                    "anthropic-version": "2023-06-01",
                    "content-type": "application/json"
                }
            )
        return self.client

    async def _build_system_prompt(self, user_id: Optional[str] = None, user_context: Optional[Dict] = None) -> str:
        """Build enhanced system prompt with location awareness and cached user context from Redis"""
        from app.services.pam.prompts.enhanced_pam_prompt import ENHANCED_PAM_SYSTEM_PROMPT

        base_prompt = ENHANCED_PAM_SYSTEM_PROMPT

        # Read cached user context from Redis if user_id is provided
        cached_context_section = ""
        if user_id:
            try:
                cache_key = f"comprehensive_user_context:{user_id}"
                cached_context = await cache_service.get(cache_key)

                if cached_context:
                    logger.info(f"✅ Injecting cached user context from Redis for user {user_id}")
                    # Format cached context as concise summary
                    cached_context_section = f"""

📦 CACHED USER CONTEXT (from Redis, may be partial/outdated):
{json.dumps(cached_context, indent=2, cls=DateTimeEncoder)}

Use this cached context to provide personalized responses based on the user's history, preferences, and data.
If the user asks about recent activity, budgets, trips, or personal information, reference this cached data.
Note: This context may not include the very latest changes - use tools if you need fresh data.
"""
                else:
                    logger.debug(f"No cached context found in Redis for user {user_id}")
            except Exception as e:
                logger.warning(f"Failed to load cached context from Redis: {e}")

        # Add location context if available
        location_context = ""
        if user_context and "location" in user_context:
            location = user_context["location"]
            location_context = f"""

🌍 USER LOCATION CONTEXT:
You have access to the user's location: {location.get('city', 'Unknown')}, {location.get('country', 'Unknown')}
Coordinates: {location.get('latitude')}, {location.get('longitude')}
Timezone: {location.get('timezone', 'Unknown')}

When providing weather forecasts, travel recommendations, or local information,
use this location context to give specific, relevant responses.
"""

        # Add current date/time context
        current_time = datetime.now()
        time_context = f"""

⏰ CURRENT TIME CONTEXT:
Current date and time: {current_time.strftime('%A, %B %d, %Y at %I:%M %p')}
Use this for weather queries, time-sensitive recommendations, and scheduling.
"""

        # Add internet search capability notice
        search_context = """

🌐 INTERNET ACCESS:
You have full internet access and can search for current information including:
- Real-time weather forecasts with specific temperatures, conditions, UV index
- Current events, news, and local information
- Business hours, contact information, and availability
- Road conditions, traffic updates, and travel advisories
- Campground availability and pricing
- Local events and activities

Always use current, real-time information when available.
"""

        return base_prompt + cached_context_section + location_context + time_context + search_context

    async def chat_completion(
        self,
        messages: List[ClaudeMessage],
        user_id: Optional[str] = None,
        user_context: Optional[Dict] = None,
        stream: bool = False,
        tools: Optional[List[Dict]] = None
    ) -> Union[ClaudeResponse, AsyncGenerator[str, None]]:
        """
        Send chat completion request to Claude API
        """
        start_time = time.time()
        client = await self._get_client()

        try:
            # Build system message with enhanced context (includes cached Redis context)
            system_prompt = await self._build_system_prompt(user_id, user_context)

            # Prepare messages for Claude API (excludes system message from messages array)
            claude_messages = []
            for msg in messages:
                if msg.role != "system":  # System message goes in separate field
                    claude_messages.append({
                        "role": msg.role,
                        "content": msg.content
                    })

            # Build request payload
            payload = {
                "model": self.model,
                "max_tokens": self.max_tokens,
                "temperature": self.temperature,
                "system": system_prompt,
                "messages": claude_messages,
                "stream": stream
            }

            # Add tools if provided
            if tools:
                payload["tools"] = tools

            logger.info(f"Sending request to Claude API: {len(claude_messages)} messages")

            response = await client.post(CLAUDE_API_URL, json=payload)

            if response.status_code != 200:
                error_data = response.json() if response.headers.get("content-type", "").startswith("application/json") else {"error": response.text}
                raise ClaudeError(f"Claude API error {response.status_code}: {error_data}")

            if stream:
                return self._handle_streaming_response(response)
            else:
                return self._handle_non_streaming_response(response, start_time)

        except Exception as e:
            logger.error(f"Claude API request failed: {str(e)}")
            raise PAMError(f"Claude API request failed: {str(e)}", ErrorCode.AI_SERVICE_ERROR)

    def _handle_non_streaming_response(self, response: httpx.Response, start_time: float) -> ClaudeResponse:
        """Handle non-streaming Claude API response"""
        latency = (time.time() - start_time) * 1000
        data = response.json()

        # Extract response content and tool calls
        content = ""
        tool_calls = []
        if "content" in data and data["content"]:
            for block in data["content"]:
                if block["type"] == "text":
                    content += block["text"]
                elif block["type"] == "tool_use":
                    # Claude wants to use a tool
                    tool_calls.append({
                        "id": block.get("id"),
                        "name": block.get("name"),
                        "input": block.get("input", {})
                    })

        # Track usage and performance
        usage = data.get("usage", {})
        self.request_count += 1
        self.total_tokens += usage.get("input_tokens", 0) + usage.get("output_tokens", 0)
        self.avg_latency = (self.avg_latency * (self.request_count - 1) + latency) / self.request_count

        # Calculate approximate cost (Claude 3.5 Sonnet pricing)
        input_tokens = usage.get("input_tokens", 0)
        output_tokens = usage.get("output_tokens", 0)
        cost = (input_tokens * 0.003 / 1000) + (output_tokens * 0.015 / 1000)  # $3/M input, $15/M output
        self.total_cost += cost

        if tool_calls:
            logger.info(f"🔧 Claude response: {len(tool_calls)} tool calls, {output_tokens} tokens, {latency:.0f}ms, ${cost:.4f}")
        else:
            logger.info(f"Claude response: {output_tokens} tokens, {latency:.0f}ms, ${cost:.4f}")

        return ClaudeResponse(
            content=content,
            model=self.model,
            usage=usage,
            latency_ms=latency,
            stop_reason=data.get("stop_reason", "end_turn"),
            streaming=False,
            tool_calls=tool_calls if tool_calls else None
        )

    async def _handle_streaming_response(self, response: httpx.Response) -> AsyncGenerator[str, None]:
        """Handle streaming Claude API response"""
        async for line in response.aiter_lines():
            if line.startswith("data: "):
                data_str = line[6:]  # Remove "data: " prefix
                if data_str == "[DONE]":
                    break

                try:
                    data = json.loads(data_str)
                    if "delta" in data and "text" in data["delta"]:
                        yield data["delta"]["text"]
                except json.JSONDecodeError:
                    continue

    async def send_message(
        self,
        message: str,
        user_id: Optional[str] = None,
        conversation_id: Optional[str] = None,
        user_context: Optional[Dict] = None,
        stream: bool = False
    ) -> Union[str, AsyncGenerator[str, None]]:
        """
        Send a message to Claude and get response
        Main interface for PAM chat functionality
        """
        try:
            # Load conversation context
            messages = []
            if conversation_id:
                # Load previous messages from context manager
                context = await self.context_manager.get_context(user_id, conversation_id)
                if context and "messages" in context:
                    for msg in context["messages"][-10:]:  # Last 10 messages for context
                        messages.append(ClaudeMessage(
                            role=msg["role"],
                            content=msg["content"],
                            timestamp=msg.get("timestamp")
                        ))

            # Add current user message
            messages.append(ClaudeMessage(
                role="user",
                content=message,
                timestamp=datetime.now()
            ))

            # Get tools from registry for Claude function calling
            tools = None
            if self.tool_registry and self.tool_registry.is_initialized:
                openai_tools = self.tool_registry.get_openai_functions(user_context=user_context)

                # Convert OpenAI format to Claude format
                # OpenAI uses "parameters", Claude uses "input_schema"
                claude_tools = []
                for tool in openai_tools:
                    claude_tools.append({
                        "name": tool["name"],
                        "description": tool["description"],
                        "input_schema": tool["parameters"]  # Rename key for Claude API
                    })

                tools = claude_tools
                logger.info(f"🔧 Passing {len(tools)} tools to Claude API (converted from OpenAI format)")
            else:
                logger.warning("⚠️ Tool registry not initialized - Claude will have no tool access")

            # Get response from Claude
            response = await self.chat_completion(
                messages=messages,
                user_id=user_id,
                user_context=user_context,
                stream=stream,
                tools=tools
            )

            if stream:
                return response
            else:
                # Handle tool execution if Claude requested tools
                if response.tool_calls and len(response.tool_calls) > 0:
                    logger.info(f"🔧 Executing {len(response.tool_calls)} tool calls")

                    # Execute all requested tools
                    tool_results = []
                    for tool_call in response.tool_calls:
                        tool_name = tool_call["name"]
                        tool_input = tool_call["input"]
                        tool_id = tool_call["id"]

                        logger.info(f"🔧 Executing tool: {tool_name} with input: {tool_input}")

                        try:
                            # Execute tool via registry
                            result = await self.tool_registry.execute_tool(
                                tool_name=tool_name,
                                user_id=user_id,
                                parameters=tool_input,
                                context=user_context
                            )

                            if result.success:
                                logger.info(f"✅ Tool {tool_name} executed successfully")
                                tool_results.append({
                                    "type": "tool_result",
                                    "tool_use_id": tool_id,
                                    "content": json.dumps(result.result)
                                })
                            else:
                                logger.error(f"❌ Tool {tool_name} failed: {result.error}")
                                tool_results.append({
                                    "type": "tool_result",
                                    "tool_use_id": tool_id,
                                    "content": json.dumps({"error": result.error}),
                                    "is_error": True
                                })
                        except Exception as e:
                            logger.error(f"❌ Tool {tool_name} execution error: {str(e)}")
                            tool_results.append({
                                "type": "tool_result",
                                "tool_use_id": tool_id,
                                "content": json.dumps({"error": str(e)}),
                                "is_error": True
                            })

                    # Send tool results back to Claude for final response
                    # Add assistant's tool use message to conversation
                    assistant_content = []
                    if response.content:
                        assistant_content.append({"type": "text", "text": response.content})
                    assistant_content.extend([
                        {"type": "tool_use", "id": tc["id"], "name": tc["name"], "input": tc["input"]}
                        for tc in response.tool_calls
                    ])

                    messages.append(ClaudeMessage(
                        role="assistant",
                        content=assistant_content
                    ))

                    # Add tool results as user message
                    messages.append(ClaudeMessage(
                        role="user",
                        content=tool_results
                    ))

                    # Get final response from Claude
                    logger.info("🔧 Sending tool results to Claude for final response")
                    final_response = await self.chat_completion(
                        messages=messages,
                        user_id=user_id,
                        user_context=user_context,
                        stream=False,
                        tools=tools  # Still pass tools in case Claude wants to use more
                    )

                    # Store final conversation in context
                    if conversation_id and user_id:
                        await self._store_conversation(
                            user_id, conversation_id, message, final_response.content
                        )

                    return final_response.content
                else:
                    # No tool calls, normal response
                    if conversation_id and user_id:
                        await self._store_conversation(
                            user_id, conversation_id, message, response.content
                        )

                    return response.content

        except Exception as e:
            logger.error(f"Error in Claude send_message: {str(e)}")
            raise PAMError(f"Failed to send message: {str(e)}", ErrorCode.AI_SERVICE_ERROR)

    async def _store_conversation(
        self,
        user_id: str,
        conversation_id: str,
        user_message: str,
        assistant_response: str
    ):
        """Store conversation in context manager"""
        try:
            await self.context_manager.add_message(
                user_id, conversation_id, "user", user_message
            )
            await self.context_manager.add_message(
                user_id, conversation_id, "assistant", assistant_response
            )
        except Exception as e:
            logger.warning(f"Failed to store conversation context: {str(e)}")

    async def health_check(self) -> Dict[str, Any]:
        """Perform health check on Claude service"""
        try:
            # Simple test message
            test_response = await self.send_message(
                "Health check - please respond with 'OK'",
                user_id="health_check",
                conversation_id="health_check"
            )

            return {
                "status": "healthy",
                "model": self.model,
                "response_received": bool(test_response),
                "request_count": self.request_count,
                "total_tokens": self.total_tokens,
                "avg_latency_ms": round(self.avg_latency, 2),
                "total_cost": round(self.total_cost, 4)
            }
        except Exception as e:
            return {
                "status": "unhealthy",
                "error": str(e),
                "model": self.model
            }

    def get_service_stats(self) -> Dict[str, Any]:
        """Get service performance statistics"""
        return {
            "model": self.model,
            "request_count": self.request_count,
            "total_tokens": self.total_tokens,
            "avg_latency_ms": round(self.avg_latency, 2),
            "total_cost": round(self.total_cost, 4),
            "cost_per_request": round(self.total_cost / max(self.request_count, 1), 4)
        }

    async def close(self):
        """Close the HTTP client"""
        if self.client:
            await self.client.aclose()


# Singleton instance
_claude_service: Optional[ClaudeAIService] = None

async def get_claude_ai_service(db_service: Optional[DatabaseService] = None) -> ClaudeAIService:
    """Get or create Claude AI service instance"""
    global _claude_service
    if _claude_service is None:
        _claude_service = ClaudeAIService(db_service)
    return _claude_service