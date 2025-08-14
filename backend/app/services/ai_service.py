"""
PAM AI Service - Complete OpenAI Integration
Comprehensive AI service that integrates OpenAI GPT models with PAM context management.
"""

import asyncio
import json
import time
from typing import Dict, List, Any, Optional, AsyncGenerator, Tuple, Union
from datetime import datetime
from dataclasses import dataclass

from openai import AsyncOpenAI, OpenAIError
import jwt
from jwt.exceptions import InvalidTokenError

from app.core.config import get_settings
from app.core.logging import get_logger
from app.core.ai_models_config import (
    OpenAIModels, ModelPurpose, 
    get_latest_model, get_model_with_fallbacks
)
from app.services.pam.context_manager import ContextManager
from app.services.pam.usecase_profiles import (
    PamUseCase, UseCaseProfile, pam_profile_manager
)
from app.services.pam.mcp.models.context_manager import ContextManager as MCPContextManager
from app.services.database import DatabaseService
from app.core.exceptions import PAMError, ErrorCode
from app.services.pam.tools.tool_registry import get_tool_registry, ToolCapability

logger = get_logger(__name__)


@dataclass
class AIMessage:
    """Standardized AI message format"""
    role: str  # "system", "user", "assistant", "function"
    content: str
    name: Optional[str] = None
    function_call: Optional[Dict] = None
    timestamp: Optional[datetime] = None


@dataclass
class AIResponse:
    """AI service response with metadata"""
    content: str
    model: str
    usage: Dict[str, int]
    latency_ms: float
    finish_reason: str
    function_calls: Optional[List[Dict]] = None
    streaming: bool = False
    cached: bool = False
    confidence_score: Optional[float] = None


class AIService:
    """
    Comprehensive AI Service for PAM
    
    Features:
    - OpenAI GPT integration with fallback models
    - Context-aware conversation management  
    - Streaming and non-streaming responses
    - Token usage optimization
    - Cost tracking and budgets
    - Error handling with circuit breakers
    - Performance monitoring
    """
    
    def __init__(self, db_service: Optional[DatabaseService] = None):
        self.settings = get_settings()
        self.client: Optional[AsyncOpenAI] = None
        self.context_manager = ContextManager()
        self.mcp_context_manager = MCPContextManager(db_service)
        self.db_service = db_service or DatabaseService()
        
        # Tool registry for function calling
        self.tool_registry = None
        self.function_calling_enabled = True
        
        # Configuration - use centralized model config
        self.default_model = get_latest_model(ModelPurpose.GENERAL)
        self.fallback_models = get_model_with_fallbacks(ModelPurpose.GENERAL)
        self.max_tokens = 4096
        self.temperature = 0.7
        self.max_context_length = 128000  # GPT-4 context window
        
        # Performance tracking
        self.request_count = 0
        self.total_cost = 0.0
        self.avg_latency = 0.0
        self.error_count = 0
        self.function_calls_made = 0
        self.successful_function_calls = 0
        
        # Circuit breaker for error handling
        self.circuit_breaker_failures = 0
        self.circuit_breaker_threshold = 5
        self.circuit_breaker_timeout = 300  # 5 minutes
        self.circuit_breaker_last_failure = 0
        
        # Initialize the service
        asyncio.create_task(self.initialize())
    
    async def initialize(self) -> bool:
        """Initialize the AI service with OpenAI client"""
        try:
            # Check if OpenAI API key is available
            if not self.settings.OPENAI_API_KEY:
                logger.warning("OpenAI API key not configured. AI service will be limited.")
                return False
            
            # Initialize OpenAI client
            self.client = AsyncOpenAI(
                api_key=self.settings.OPENAI_API_KEY.get_secret_value(),
                timeout=30.0,
                max_retries=3
            )
            
            # Test the connection
            await self._health_check()
            
            # Initialize tool registry for function calling
            try:
                from app.services.pam.tools.tool_registry import initialize_tool_registry
                self.tool_registry = await initialize_tool_registry()
                logger.info("🛠️ Tool registry initialized for function calling")
            except Exception as e:
                logger.warning(f"⚠️ Could not initialize tool registry: {e}")
                self.function_calling_enabled = False
            
            logger.info("AI service initialized successfully with OpenAI")
            return True
            
        except Exception as e:
            logger.error(f"Failed to initialize AI service: {str(e)}")
            return False
    
    def _is_circuit_breaker_open(self) -> bool:
        """Check if circuit breaker is open due to too many failures"""
        if self.circuit_breaker_failures >= self.circuit_breaker_threshold:
            if time.time() - self.circuit_breaker_last_failure < self.circuit_breaker_timeout:
                return True
            else:
                # Reset circuit breaker after timeout
                self.circuit_breaker_failures = 0
        return False
    
    def _record_success(self, latency_ms: float):
        """Record successful request for monitoring"""
        self.request_count += 1
        self.avg_latency = (self.avg_latency * (self.request_count - 1) + latency_ms) / self.request_count
        self.circuit_breaker_failures = max(0, self.circuit_breaker_failures - 1)  # Gradually recover
    
    def _record_failure(self, error: Exception):
        """Record failed request for circuit breaker"""
        self.error_count += 1
        self.circuit_breaker_failures += 1
        self.circuit_breaker_last_failure = time.time()
        logger.error(f"AI service failure recorded: {str(error)}")
    
    async def _health_check(self) -> bool:
        """Perform a quick health check on OpenAI API"""
        try:
            if not self.client:
                return False
                
            response = await self.client.chat.completions.create(
                model=get_latest_model(ModelPurpose.QUICK),
                messages=[{"role": "user", "content": "test"}],
                max_tokens=1,
                timeout=10.0
            )
            return True
        except Exception as e:
            logger.warning(f"AI service health check failed: {str(e)}")
            return False
    
    def _prepare_context_messages(self, user_context: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Prepare system and context messages for OpenAI"""
        messages = []
        
        # System message with PAM personality and capabilities (context-aware)
        # Get the current message to determine context
        conversation_history = user_context.get("conversation_history", [])
        current_message = ""
        if conversation_history:
            current_message = conversation_history[-1].get("content", "")
        system_prompt = self._build_system_prompt(user_context, current_message)
        messages.append({"role": "system", "content": system_prompt})
        
        # Add conversation history from context (already retrieved above)
        for msg in conversation_history[-10:]:  # Keep last 10 messages for context
            if isinstance(msg, dict):
                messages.append({
                    "role": msg.get("role", "user"),
                    "content": msg.get("content", ""),
                })
        
        return messages
    
    def _classify_query_context(self, message: str) -> str:
        """Classify if the query is RV/travel related or general"""
        rv_keywords = [
            'rv', 'camper', 'motorhome', 'travel', 'trip', 'route', 'camping', 
            'campground', 'park', 'drive', 'fuel', 'hookup', 'boondock', 'road',
            'destination', 'journey', 'vacation', 'explore', 'miles', 'highway'
        ]
        
        message_lower = message.lower()
        for keyword in rv_keywords:
            if keyword in message_lower:
                return "rv_related"
        
        # Check for general queries
        general_indicators = [
            'weather', 'time', 'date', 'calculate', 'convert', 'define',
            'what is', 'how to', 'explain', 'tell me about'
        ]
        
        for indicator in general_indicators:
            if indicator in message_lower:
                return "general"
        
        # Default to minimal context for unclear queries
        return "general"
    
    def _build_system_prompt(self, context: Dict[str, Any], message: str = "") -> str:
        """Build context-aware system prompt for PAM"""
        user_location = context.get("user_location") or context.get("location", {})
        vehicle_info = context.get("vehicle_info", {})
        travel_preferences = context.get("travel_preferences", {})
        
        # Classify the query context
        query_type = self._classify_query_context(message)
        
        # Extract location information
        location_str = "unknown location"
        if isinstance(user_location, dict):
            if user_location.get("address"):
                location_str = user_location["address"]
            elif user_location.get("latitude") and user_location.get("longitude"):
                location_str = f"{user_location['latitude']}, {user_location['longitude']}"
        elif isinstance(user_location, str):
            location_str = user_location
        
        # For general queries, use a minimal prompt
        if query_type == "general":
            system_prompt = f"""You are PAM (Personal AI Manager), a helpful assistant.

CURRENT CONTEXT:
- Current Time: {datetime.utcnow().strftime('%Y-%m-%d %H:%M UTC')}
- User Location: {location_str}

Please provide clear, concise, and helpful responses. Be friendly and professional."""
            return system_prompt
        
        # For RV-related queries, use the full RV context
        # Extract vehicle information
        vehicle_str = "recreational vehicle"
        if isinstance(vehicle_info, dict) and vehicle_info.get("make"):
            vehicle_parts = [vehicle_info.get("make", "")]
            if vehicle_info.get("model"):
                vehicle_parts.append(vehicle_info["model"])
            if vehicle_info.get("year"):
                vehicle_parts.insert(0, str(vehicle_info["year"]))
            vehicle_str = " ".join(vehicle_parts)
        
        system_prompt = f"""You are PAM (Personal AI Manager), the intelligent travel assistant for Wheels & Wins - a platform dedicated to RV and camping enthusiasts.

CURRENT CONTEXT:
- User Location: {location_str}
- Vehicle: {vehicle_str}
- Current Time: {datetime.utcnow().strftime('%Y-%m-%d %H:%M UTC')}

YOUR ROLE:
You help users plan amazing RV trips and camping experiences by providing:

🗺️ TRIP PLANNING:
- Route suggestions optimized for RVs
- Campground and RV park recommendations
- Scenic stops and attractions along routes
- Weather and road condition updates
- Fuel stop planning for large vehicles

💰 COST OPTIMIZATION:
- Budget-friendly camping options
- Fuel-efficient routing
- Discount camping programs (Good Sam, KOA, etc.)
- Free camping opportunities (boondocking)
- Cost comparison between different routes/parks

🏕️ CAMPING EXPERTISE:
- RV-friendly campgrounds with proper amenities
- Campsite selection based on RV size and needs
- Hookup requirements (electric, water, sewer)
- Reservation timing and strategies
- Camping etiquette and best practices

🛡️ SAFETY & REGULATIONS:
- Bridge height and weight restrictions
- Road conditions for large vehicles
- Generator quiet hours and regulations  
- Propane refill locations
- Emergency services along routes

RESPONSE STYLE:
- Be enthusiastic about RV travel and camping
- Use relevant emojis to make responses engaging
- Keep responses concise but comprehensive
- Provide actionable advice with specific details
- Always consider the user's RV size and capabilities
- Focus on creating memorable travel experiences

SPECIAL CAPABILITIES:
- I can access real-time information about campgrounds, weather, and roads
- I can help with route optimization for RVs
- I provide cost-saving tips and budget planning
- I understand RV-specific challenges and solutions

Remember: Every interaction should help the user have a better, safer, and more affordable RV experience!"""

        return system_prompt
    
    async def process_message(
        self,
        message: str,
        user_context: Dict[str, Any],
        model: Optional[str] = None,
        temperature: Optional[float] = None,
        max_tokens: Optional[int] = None,
        stream: bool = False,
        tools: Optional[List[Dict[str, Any]]] = None,
        use_case: Optional[PamUseCase] = None
    ) -> Union[AIResponse, AsyncGenerator[str, None]]:
        """
        Process a user message with full context awareness and use-case profiles
        
        Args:
            message: User's input message
            user_context: User context including location, preferences, history
            model: OpenAI model to use (overrides profile)
            temperature: Response creativity (overrides profile)
            max_tokens: Maximum tokens in response (overrides profile)
            stream: Whether to stream the response
            tools: Available tools for function calling
            use_case: Specific use case for profile selection
            
        Returns:
            AIResponse for non-streaming, AsyncGenerator for streaming
        """
        
        # Check circuit breaker
        if self._is_circuit_breaker_open():
            raise PAMError(
                "AI service temporarily unavailable due to errors",
                ErrorCode.SERVICE_UNAVAILABLE
            )
        
        if not self.client:
            raise PAMError(
                "OpenAI client not initialized",
                ErrorCode.EXTERNAL_SERVICE_ERROR
            )
        
        start_time = time.time()
        
        try:
            # Detect or use provided use case
            if not use_case:
                use_case = pam_profile_manager.detect_use_case(message, user_context)
                logger.debug(f"🎯 Detected use case: {use_case.value}")
            
            # Get profile for use case
            profile = pam_profile_manager.get_profile(use_case)
            
            # Allow runtime overrides from parameters
            if model or temperature is not None or max_tokens:
                override_context = {}
                if model: override_context["model"] = model
                if temperature is not None: override_context["temperature"] = temperature
                if max_tokens: override_context["max_tokens"] = max_tokens
                profile = pam_profile_manager.merge_with_context(profile, override_context)
            
            # Consolidate and validate context
            consolidated_context = self.context_manager.validate_and_enrich_context(user_context)
            consolidated_context["use_case"] = use_case.value
            
            # Prepare messages with profile-specific instructions
            messages = []
            
            # Add profile-specific system instructions
            if profile.system_instructions:
                messages.append({"role": "system", "content": profile.system_instructions})
            else:
                # Fall back to standard system prompt if no profile instructions
                messages.extend(self._prepare_context_messages(consolidated_context))
            
            # Add user message
            messages.append({"role": "user", "content": message})
            
            # Optimize token usage
            messages = self._optimize_token_usage(messages)
            
            # Configure request parameters from profile
            request_params = {
                "model": profile.model,
                "messages": messages,
                "temperature": profile.temperature,
                "max_tokens": profile.max_tokens,
                "top_p": profile.top_p,
            }
            
            # Add stop sequences if defined
            if profile.stop_sequences:
                request_params["stop"] = profile.stop_sequences
            
            # Handle response format
            if profile.response_format.type == "json_schema" and profile.response_format.json_schema:
                request_params["response_format"] = {
                    "type": "json_schema",
                    "json_schema": profile.response_format.json_schema
                }
            
            # Log profile usage for monitoring
            logger.info(f"📊 Using profile: {profile.name} | Model: {profile.model} | Temp: {profile.temperature} | Optimize for: {profile.optimize_for}")
            
            # Handle tools based on profile configuration
            if profile.tools.enabled:
                if tools:
                    # Use provided tools from orchestrator
                    # Filter based on profile's allowed tools if specified
                    if profile.tools.allowed_tools:
                        filtered_tools = [t for t in tools if any(allowed in str(t) for allowed in profile.tools.allowed_tools)]
                        if filtered_tools:
                            request_params["functions"] = filtered_tools
                            request_params["function_call"] = profile.tools.tool_choice
                            logger.debug(f"🔧 Added {len(filtered_tools)} profile-filtered tools")
                    else:
                        request_params["functions"] = tools
                        request_params["function_call"] = profile.tools.tool_choice
                        logger.debug(f"🔧 Added {len(tools)} tools for potential calling")
                elif self.function_calling_enabled and self.tool_registry:
                    # Use default functions from registry
                    functions = self._get_available_functions(consolidated_context)
                    
                    # Filter based on profile's allowed tools
                    if profile.tools.allowed_tools and functions:
                        filtered_functions = [f for f in functions if any(allowed in str(f) for allowed in profile.tools.allowed_tools)]
                        if filtered_functions:
                            request_params["functions"] = filtered_functions
                            request_params["function_call"] = profile.tools.tool_choice
                            logger.debug(f"🔧 Added {len(filtered_functions)} profile-filtered functions")
                    elif functions:
                        request_params["functions"] = functions
                        request_params["function_call"] = profile.tools.tool_choice
                        logger.debug(f"🔧 Added {len(functions)} functions for potential calling")
                
                # Handle force tool if specified
                if profile.tools.force_tool and "functions" in request_params:
                    request_params["function_call"] = {"name": profile.tools.force_tool}
                    logger.debug(f"🎯 Forcing tool: {profile.tools.force_tool}")
            
            if stream:
                return self._stream_response(request_params, start_time)
            else:
                return await self._get_complete_response(request_params, start_time, consolidated_context)
                
        except OpenAIError as e:
            self._record_failure(e)
            
            # Try fallback model
            if model is None or model == self.default_model:
                logger.warning(f"Primary model failed, trying fallback: {str(e)}")
                for fallback_model in self.fallback_models:
                    try:
                        request_params["model"] = fallback_model
                        if stream:
                            return self._stream_response(request_params, start_time)
                        else:
                            return await self._get_complete_response(request_params, start_time)
                    except Exception:
                        continue
            
            raise PAMError(f"OpenAI API error: {str(e)}", ErrorCode.EXTERNAL_SERVICE_ERROR)
        
        except Exception as e:
            self._record_failure(e)
            raise PAMError(f"AI processing error: {str(e)}", ErrorCode.PROCESSING_ERROR)
    
    def _get_available_functions(self, context: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Get available functions based on user context and capabilities"""
        if not self.tool_registry:
            return []
        
        # Determine relevant capabilities based on context
        capabilities = []
        
        # Location-based functions if user has location
        if context.get("user_location") or context.get("location"):
            capabilities.append(ToolCapability.LOCATION_SEARCH)
        
        # Always include web scraping and media search
        capabilities.extend([
            ToolCapability.WEB_SCRAPING,
            ToolCapability.MEDIA_SEARCH
        ])
        
        # Get function definitions from tool registry
        return self.tool_registry.get_openai_functions(capabilities, context)
    
    async def _execute_function_call(
        self, 
        function_call: Dict[str, Any], 
        user_context: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Execute a function call and return the result"""
        function_name = function_call.get("name")
        function_args = function_call.get("arguments", "{}")
        
        if not function_name or not self.tool_registry:
            return {"error": "Invalid function call"}
        
        try:
            # Parse function arguments
            if isinstance(function_args, str):
                import json
                args = json.loads(function_args)
            else:
                args = function_args
                
            # Execute the tool
            user_id = user_context.get("user_id", "anonymous")
            result = await self.tool_registry.execute_tool(
                tool_name=function_name,
                user_id=user_id,
                parameters=args
            )
            
            # Track function call metrics
            self.function_calls_made += 1
            if result.success:
                self.successful_function_calls += 1
                
            logger.info(f"🔧 Function '{function_name}' executed: success={result.success}")
            
            return {
                "success": result.success,
                "result": result.result,
                "error": result.error,
                "execution_time_ms": result.execution_time_ms
            }
            
        except Exception as e:
            logger.error(f"❌ Function execution error: {e}")
            return {"error": f"Function execution failed: {str(e)}"}
    
    async def _get_complete_response(
        self,
        request_params: Dict[str, Any],
        start_time: float,
        user_context: Optional[Dict[str, Any]] = None
    ) -> AIResponse:
        """Get a complete non-streaming response"""
        
        response = await self.client.chat.completions.create(**request_params)
        
        # Handle function calls if present
        message = response.choices[0].message
        function_calls = []
        
        if hasattr(message, 'function_call') and message.function_call and user_context:
            logger.info(f"🔧 Processing function call: {message.function_call.name}")
            
            # Execute the function call
            function_result = await self._execute_function_call(
                {
                    "name": message.function_call.name,
                    "arguments": message.function_call.arguments
                },
                user_context
            )
            
            # Create follow-up request with function result
            function_messages = request_params["messages"].copy()
            function_messages.append({
                "role": "assistant",
                "content": None,
                "function_call": {
                    "name": message.function_call.name,
                    "arguments": message.function_call.arguments
                }
            })
            function_messages.append({
                "role": "function",
                "name": message.function_call.name,
                "content": json.dumps(function_result)
            })
            
            # Make follow-up call without functions to get final response
            follow_up_params = request_params.copy()
            follow_up_params["messages"] = function_messages
            if "functions" in follow_up_params:
                del follow_up_params["functions"]
            if "function_call" in follow_up_params:
                del follow_up_params["function_call"]
            
            # Get final response
            final_response = await self.client.chat.completions.create(**follow_up_params)
            final_message = final_response.choices[0].message
            
            # Use the final response for metrics
            response = final_response
            message = final_message
        
        # Calculate metrics
        latency_ms = (time.time() - start_time) * 1000
        self._record_success(latency_ms)
        
        # Calculate cost (rough estimate)
        prompt_tokens = response.usage.prompt_tokens
        completion_tokens = response.usage.completion_tokens
        estimated_cost = (prompt_tokens * 0.01 + completion_tokens * 0.03) / 1000  # GPT-4 pricing estimate
        self.total_cost += estimated_cost
        
        return AIResponse(
            content=message.content or "",
            model=response.model,
            usage={
                "prompt_tokens": prompt_tokens,
                "completion_tokens": completion_tokens,
                "total_tokens": response.usage.total_tokens
            },
            latency_ms=latency_ms,
            finish_reason=response.choices[0].finish_reason,
            function_calls=function_calls if function_calls else None,
            streaming=False,
            cached=False,
            confidence_score=self._calculate_confidence(response)
        )
    
    async def _stream_response(
        self,
        request_params: Dict[str, Any],
        start_time: float
    ) -> AsyncGenerator[str, None]:
        """Stream response tokens as they arrive"""
        
        request_params["stream"] = True
        
        try:
            stream = await self.client.chat.completions.create(**request_params)
            
            first_token = True
            full_content = ""
            
            async for chunk in stream:
                if chunk.choices[0].delta.content:
                    token = chunk.choices[0].delta.content
                    full_content += token
                    
                    # Record time to first token
                    if first_token:
                        latency_ms = (time.time() - start_time) * 1000
                        self._record_success(latency_ms)
                        first_token = False
                    
                    yield token
                    
        except Exception as e:
            self._record_failure(e)
            raise
    
    def _optimize_token_usage(self, messages: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Optimize token usage by truncating long context if needed"""
        
        # Rough estimation of tokens (1 token ≈ 4 characters)
        total_chars = sum(len(msg.get("content", "")) for msg in messages)
        estimated_tokens = total_chars // 4
        
        # If we're approaching context limit, trim older messages
        if estimated_tokens > self.max_context_length * 0.8:
            # Keep system message and recent messages
            system_messages = [msg for msg in messages if msg.get("role") == "system"]
            user_messages = [msg for msg in messages if msg.get("role") != "system"]
            
            # Keep last N messages that fit in context
            chars_budget = (self.max_context_length * 0.7) * 4  # Leave room for response
            kept_messages = system_messages[:]
            
            for msg in reversed(user_messages):
                msg_chars = len(msg.get("content", ""))
                if chars_budget > msg_chars:
                    kept_messages.insert(-len([m for m in kept_messages if m.get("role") == "system"]), msg)
                    chars_budget -= msg_chars
                else:
                    break
            
            logger.info(f"Optimized context: {len(messages)} -> {len(kept_messages)} messages")
            return kept_messages
        
        return messages
    
    def _calculate_confidence(self, response) -> float:
        """Calculate confidence score based on response characteristics"""
        # Simple heuristic based on response completeness
        if response.choices[0].finish_reason == "stop":
            return 0.9
        elif response.choices[0].finish_reason == "length":
            return 0.7
        else:
            return 0.5
    
    async def get_conversation_context(
        self,
        user_id: str,
        session_id: Optional[str] = None,
        limit: int = 10
    ) -> Dict[str, Any]:
        """Get conversation context from database"""
        return await self.mcp_context_manager.get_user_context(
            user_id=user_id,
            session_id=session_id,
            limit=limit
        )
    
    async def save_conversation(
        self,
        user_id: str,
        session_id: str,
        user_message: str,
        ai_response: str,
        intent: Optional[str] = None,
        context_used: Optional[Dict[str, Any]] = None
    ) -> bool:
        """Save conversation turn to database"""
        return await self.mcp_context_manager.save_memory(
            user_id=user_id,
            session_id=session_id,
            user_message=user_message,
            pam_response=ai_response,
            intent=intent,
            node_used="ai_service",
            context_used=context_used
        )
    
    def get_service_stats(self) -> Dict[str, Any]:
        """Get service performance statistics"""
        function_call_success_rate = 0.0
        if self.function_calls_made > 0:
            function_call_success_rate = self.successful_function_calls / self.function_calls_made
        
        return {
            "requests_processed": self.request_count,
            "average_latency_ms": self.avg_latency,
            "total_cost_usd": self.total_cost,
            "error_count": self.error_count,
            "circuit_breaker_failures": self.circuit_breaker_failures,
            "function_calls_made": self.function_calls_made,
            "successful_function_calls": self.successful_function_calls,
            "function_call_success_rate": function_call_success_rate,
            "function_calling_enabled": self.function_calling_enabled,
            "tool_registry_available": self.tool_registry is not None,
            "service_health": "healthy" if not self._is_circuit_breaker_open() else "degraded",
            "api_configured": self.client is not None
        }
    
    async def cleanup(self):
        """Cleanup resources"""
        if self.client:
            await self.client.close()
            self.client = None


# Global AI service instance
_ai_service_instance = None

def get_ai_service(db_service: Optional[DatabaseService] = None) -> AIService:
    """Get or create the global AI service instance"""
    global _ai_service_instance
    if _ai_service_instance is None:
        _ai_service_instance = AIService(db_service)
    return _ai_service_instance


# Backward compatibility aliases
AIService.process_message.__annotations__['return'] = Union[AIResponse, AsyncGenerator[str, None]]