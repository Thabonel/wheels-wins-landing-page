# app/core/simple_pam_service.py
"""
SimplePamService - Enhanced AI integration for PAM chat functionality
Uses the new comprehensive AIService for improved context management,
streaming support, and robust error handling.
"""

import json
import uuid
from typing import Dict, List, Any, Optional, Union, AsyncGenerator
from datetime import datetime
import asyncio
from app.core.config import settings
from app.core.logging import get_logger
from app.services.database import get_database_service
from app.services.ai_service import get_ai_service, AIService, AIResponse
from app.services.cache_manager import get_cache_manager, CacheStrategy, cached
from app.services.pam.enhanced_orchestrator import get_enhanced_orchestrator, ResponseMode

logger = get_logger("simple_pam")

# Weather tool integrated with Unified Orchestrator for direct responses
WEATHER_TOOL_AVAILABLE = True
logger.info("Weather queries handled by WeatherTool for direct, concise responses")

class PAMServiceError(Exception):
    """Exception raised when PAM service encounters errors"""
    pass

class SimplePamService:
    """
    Enhanced PAM service using the comprehensive AIService
    
    Features:
    - Advanced context management
    - Streaming and non-streaming responses
    - Circuit breaker error handling
    - Token optimization
    - Cost tracking
    - Performance monitoring
    """
    
    def __init__(self):
        # Initialize the enhanced orchestrator for comprehensive functionality
        self.enhanced_orchestrator = None
        self.orchestrator_initialized = False
        
        # Weather tool now integrated with Unified Orchestrator
        self.weather_tool = None
        
        # Initialize the AI service with database connection (fallback)
        try:
            self.db_service = get_database_service()
            self.ai_service = get_ai_service(self.db_service)
            logger.info("SimplePamService initialized with enhanced AI service")
            
            # Initialize enhanced orchestrator asynchronously
            asyncio.create_task(self._initialize_orchestrator())
            
        except Exception as e:
            logger.error(f"Failed to initialize AI service: {str(e)}")
            raise PAMServiceError(f"Failed to initialize AI service: {str(e)}")
        
        # Initialize cache manager
        self.cache_manager = None
        asyncio.create_task(self._initialize_cache())
        
        self.max_retries = 3
        self.retry_delay = 1  # seconds
        
        # Initialize PAM tools - now integrated with Enhanced Orchestrator
        self.tools_registry = {}
        self.tools_initialized = False
    
    async def health_check(self) -> Dict[str, Any]:
        """Perform comprehensive health check on PAM service"""
        try:
            # Get AI service statistics
            ai_stats = self.ai_service.get_service_stats()
            
            # Test AI service connectivity
            test_response = await self.ai_service.process_message(
                message="health check",
                user_context={"user_id": "health_check"},
                max_tokens=10
            )
            
            service_healthy = ai_stats["service_health"] == "healthy"
            
            # Get tool registry stats from AIService
            tool_stats = {}
            if self.ai_service.tool_registry:
                tool_stats = self.ai_service.tool_registry.get_tool_stats()
            
            return {
                "status": "healthy" if service_healthy else "degraded",
                "ai_service": ai_stats,
                "function_calling": {
                    "enabled": ai_stats.get("function_calling_enabled", False),
                    "tool_registry_available": ai_stats.get("tool_registry_available", False),
                    "function_calls_made": ai_stats.get("function_calls_made", 0),
                    "success_rate": ai_stats.get("function_call_success_rate", 0.0)
                },
                "tools": tool_stats,
                "test_response_length": len(test_response.content if isinstance(test_response, AIResponse) else "0"),
                "timestamp": datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            logger.error(f"PAM health check failed: {str(e)}")
            return {
                "status": "unhealthy",
                "error": str(e),
                "ai_service": "unavailable",
                "timestamp": datetime.utcnow().isoformat()
            }
    
    async def _initialize_cache(self):
        """Initialize cache manager asynchronously"""
        try:
            self.cache_manager = await get_cache_manager()
            logger.info("✅ Cache manager initialized successfully")
            
            # Pre-warm cache with common queries
            await self._warm_cache_with_common_queries()
        except Exception as e:
            logger.error(f"Failed to initialize cache manager: {str(e)}")
            self.cache_manager = None
    
    async def _initialize_orchestrator(self):
        """Initialize enhanced orchestrator with tool registry"""
        try:
            logger.info("🚀 Initializing Enhanced Orchestrator for SimplePamService...")
            self.enhanced_orchestrator = await get_enhanced_orchestrator()
            self.orchestrator_initialized = True
            logger.info("✅ Enhanced Orchestrator initialized successfully with tool registry")
        except Exception as e:
            logger.error(f"❌ Failed to initialize enhanced orchestrator: {e}")
            # Service falls back to AI service without orchestrator
    
    async def _warm_cache_with_common_queries(self):
        """Pre-warm cache with commonly asked questions"""
        common_queries = [
            {
                "message": "help",
                "user_id": "system",
                "response": {
                    "content": "I'm PAM, your personal AI assistant! I can help you with:\n• 🌤️ Weather information\n• 🗺️ Trip planning (when needed)\n• 💰 Budget management\n• 📍 Local information\n• 💬 General assistance\n• ❓ Answering questions\n\nWhat can I help you with today?",
                    "actions": []
                },
                "ttl": 3600  # Cache for 1 hour
            },
            {
                "message": "what can you do",
                "user_id": "system",
                "response": {
                    "content": "I'm PAM, your AI travel companion! Here's how I can assist you:\n\n🗺️ **Trip Planning**: Create custom routes, find scenic drives, calculate distances\n🏕️ **Campgrounds**: Find RV parks, check amenities, read reviews\n🌤️ **Weather & Roads**: Real-time conditions, hazard alerts, seasonal advice\n🎯 **Attractions**: Discover local points of interest, events, hidden gems\n🛠️ **RV Support**: Maintenance tips, troubleshooting, service locations\n💰 **Budgeting**: Track expenses, find deals, estimate costs\n👥 **Community**: Connect with other RVers, share experiences\n\nJust ask me anything about your RV adventure!",
                    "actions": []
                },
                "ttl": 3600
            }
        ]
        
        if self.cache_manager:
            warmed_count = await self.cache_manager.warm_cache(common_queries)
            logger.info(f"Pre-warmed cache with {warmed_count} common queries")
    
    def is_healthy(self) -> bool:
        """Check if service is healthy"""
        try:
            ai_stats = self.ai_service.get_service_stats()
            cache_healthy = self.cache_manager is not None if hasattr(self, 'cache_manager') else True
            return ai_stats["service_health"] == "healthy" and cache_healthy
        except:
            return False
    
    async def initialize_tools(self):
        """Initialize PAM tools for enhanced functionality with robust error handling"""
        if self.tools_initialized:
            return
            
        logger.info("🛠️ Initializing PAM tools...")
        self.tools_registry = {}
        tools_success_count = 0
        
        # Initialize Google Places tool
        try:
            from app.services.pam.tools import google_places_tool
            logger.info("🔍 Initializing Google Places tool...")
            await google_places_tool.initialize()
            
            if google_places_tool.initialized:
                self.tools_registry['google_places'] = google_places_tool
                tools_success_count += 1
                logger.info("✅ Google Places tool initialized successfully")
            else:
                logger.warning("⚠️ Google Places tool initialized but not fully functional")
                # Still register it - it can provide mock data
                self.tools_registry['google_places'] = google_places_tool
                
        except Exception as e:
            logger.error(f"❌ Failed to initialize Google Places tool: {e}")
        
        # Initialize Web Scraper tool
        try:
            from app.services.pam.tools import webscraper_tool
            logger.info("🌐 Initializing Web Scraper tool...")
            await webscraper_tool.initialize()
            
            if webscraper_tool.initialized:
                self.tools_registry['webscraper'] = webscraper_tool
                tools_success_count += 1
                logger.info("✅ Web Scraper tool initialized successfully")
            else:
                logger.warning("⚠️ Web Scraper tool initialized but not fully functional")
                # Still register it for graceful error handling
                self.tools_registry['webscraper'] = webscraper_tool
                
        except Exception as e:
            logger.error(f"❌ Failed to initialize Web Scraper tool: {e}")
        
        # Set initialization status
        self.tools_initialized = len(self.tools_registry) > 0
        
        if self.tools_initialized:
            logger.info(f"✅ PAM tools initialization complete: {tools_success_count} tools active, {len(self.tools_registry)} tools registered")
        else:
            logger.warning("⚠️ No PAM tools could be initialized - continuing with base intelligence only")
            # Don't break the service - PAM can still work with base intelligence
    
    def _needs_location(self, message: str) -> bool:
        """Check if message requires location context"""
        location_patterns = [
            'weather', 'forecast', 'rain', 'temperature', 'sunny', 'cloudy', 'snow',
            'nearby', 'around me', 'close to me', 'near me',
            'directions', 'route', 'navigate', 'drive', 'trip',
            'local', 'restaurant', 'hotel', 'gas station', 'rv park', 'campground',
            'traffic', 'road conditions'
        ]
        message_lower = message.lower()
        return any(pattern in message_lower for pattern in location_patterns)
    
    async def get_response(
        self, 
        message: str, 
        context: Dict[str, Any],
        conversation_history: Optional[List[Dict]] = None,
        stream: bool = False
    ) -> Union[str, Dict[str, Any]]:
        """
        Get PAM's response to a user message using enhanced AI service
        
        Args:
            message: The user's message
            context: User context including user_id, session_id, etc.
            conversation_history: Previous conversation messages
            stream: Whether to return streaming response
            
        Returns:
            String response (non-streaming) or dict with response and metadata (streaming)
        """
        user_id = context.get("user_id", "anonymous")
        session_id = context.get("session_id", str(uuid.uuid4()))
        start_time = datetime.utcnow()
        
        logger.info(f"🤖 [Enhanced] SimplePamService.get_response called!")
        logger.info(f"  - Message: '{message[:100]}{'...' if len(message) > 100 else ''}'")
        logger.info(f"  - User ID: {user_id}")
        logger.info(f"  - Session ID: {session_id}")
        logger.info(f"  - Stream: {stream}")
        logger.info(f"  - Context keys: {list(context.keys())}")
        logger.info(f"  - Conversation history length: {len(conversation_history) if conversation_history else 0}")
        
        # Validate input
        if not message or message.strip() == "":
            logger.warning(f"❌ Empty message provided to SimplePamService")
            return "I didn't receive your message. Could you please try again?"
        
        # Initialize tools if not already done
        if not self.tools_initialized:
            logger.info(f"🛠️ Initializing PAM tools...")
            await self.initialize_tools()
        
        try:
            # Check if this is a location-requiring query
            message_lower = message.lower()
            needs_location = self._needs_location(message)
            
            # Weather queries now handled by enhanced orchestrator with ChatGPT + user context
            # (Removed weather tool - simplified to use ChatGPT with location context)
            if False:  # Disabled old weather tool logic
                logger.info(f"🌤️ Weather query detected, using WeatherTool")
                try:
                    # Smart location extraction - use context first, never ask for permission
                    user_location = None
                    
                    # 1. Check WebSocket connection context (stored on init)
                    if context.get("user_location"):
                        loc = context["user_location"]
                        if isinstance(loc, dict):
                            lat = loc.get('latitude', loc.get('lat'))
                            lon = loc.get('longitude', loc.get('lon', loc.get('lng')))
                            if lat and lon:
                                user_location = f"{lat},{lon}"
                                logger.info(f"📍 Using location from connection context: {user_location}")
                        elif isinstance(loc, str):
                            user_location = loc
                            logger.info(f"📍 Using location string from context: {user_location}")
                    
                    # 2. Check userLocation in context (from frontend)
                    if not user_location and context.get("userLocation"):
                        loc = context["userLocation"]
                        if isinstance(loc, dict):
                            lat = loc.get('latitude', loc.get('lat'))
                            lon = loc.get('longitude', loc.get('lon', loc.get('lng')))
                            if lat and lon:
                                user_location = f"{lat},{lon}"
                                logger.info(f"📍 Using location from userLocation: {user_location}")
                    
                    # 3. Try to extract location from message itself
                    if not user_location:
                        # Look for city names or location mentions in the message
                        if " in " in message_lower:
                            location_part = message_lower.split(" in ", 1)[1]
                            # Clean up the location string
                            location_words = location_part.split()
                            if location_words:
                                # Take first 2-3 words as location (city name)
                                potential_location = " ".join(location_words[:3]).rstrip("?.,!;")
                                if len(potential_location) > 2:  # Basic validation
                                    user_location = potential_location
                                    logger.info(f"📍 Extracted location from message: {user_location}")
                    
                    # 4. Use default location if still none (never ask for permission)
                    if not user_location:
                        # Use a sensible default (US geographic center)
                        user_location = "39.8283,-98.5795"  # Geographic center of USA
                        logger.info(f"📍 Using default US location for weather")
                    
                    # Always provide weather data - never ask for location
                    if "tomorrow" in message_lower or "week" in message_lower or "forecast" in message_lower:
                        days = 7 if "week" in message_lower else 3
                        weather_result = await self.weather_tool.execute(
                            action="get_forecast",
                            parameters={
                                "location": user_location,
                                "days": days
                            }
                        )
                    else:
                        weather_result = await self.weather_tool.execute(
                            action="get_current",
                            parameters={
                                "location": user_location
                            }
                        )
                    
                    if weather_result.success:
                        weather_data = weather_result.data
                        
                        # Handle forecast responses
                        if "forecast" in weather_result.data:
                            forecast = weather_data["forecast"]
                            location_name = weather_data.get('location', 'your area')
                            
                            if "week" in message_lower and len(forecast) > 1:
                                # Week forecast
                                response = f"Here's the weather forecast for {location_name} this week:\n\n"
                                for i, day in enumerate(forecast[:7]):
                                    response += f"• {day.get('date', 'Day ' + str(i+1))}: "
                                    response += f"{day.get('conditions', 'N/A')}, "
                                    response += f"High {day.get('high', 'N/A')}, Low {day.get('low', 'N/A')}"
                                    if day.get('rain_chance', '0%') != '0%':
                                        response += f", {day.get('rain_chance')} chance of rain"
                                    response += "\n"
                                # Neutral weather summary without RV bias
                            elif "tomorrow" in message_lower and len(forecast) > 0:
                                # Tomorrow's forecast
                                tomorrow = forecast[0]
                                response = f"Tomorrow in {location_name}: {tomorrow.get('conditions', 'N/A')} "
                                response += f"with a high of {tomorrow.get('high', 'N/A')} and low of {tomorrow.get('low', 'N/A')}. "
                                if tomorrow.get('rain_chance', '0%') != '0%':
                                    response += f"There's a {tomorrow.get('rain_chance')} chance of rain. "
                                # Provide neutral weather information
                            else:
                                # General forecast
                                response = f"Weather forecast for {location_name}:\n"
                                for i, day in enumerate(forecast[:3]):
                                    response += f"• {day.get('date', 'Day ' + str(i+1))}: "
                                    response += f"{day.get('conditions', 'N/A')}, "
                                    response += f"High {day.get('high', 'N/A')}, Low {day.get('low', 'N/A')}\n"
                        else:
                            # Current weather
                            current = weather_data.get('current', weather_data)
                            location_name = current.get('location', 'your area')
                            response = f"Currently in {location_name}: "
                            response += f"{current.get('temperature', 'N/A')} with {current.get('conditions', 'N/A')}. "
                            response += f"Wind: {current.get('wind', 'N/A')}. "
                            # Neutral weather response without travel assumptions
                        
                        logger.info(f"✅ Weather response generated successfully")
                        return response
                        
                except Exception as e:
                    logger.error(f"❌ Weather tool failed: {e}")
                    # Provide a helpful response without asking for location
                    return "I'm having trouble accessing weather data right now. You can check weather.com or your favorite weather app for the latest conditions."
            
            # Prepare enhanced context with conversation history
            enhanced_context = context.copy()
            
            # Add conversation history to context if provided
            if conversation_history:
                enhanced_context["conversation_history"] = conversation_history[-10:]  # Keep last 10 messages
            
            # Load comprehensive user data if not anonymous
            if user_id != "anonymous":
                try:
                    # Get additional context from database
                    user_context = await self.ai_service.get_conversation_context(
                        user_id=user_id,
                        session_id=session_id,
                        limit=5
                    )
                    
                    if user_context.get("messages"):
                        enhanced_context["db_conversation_history"] = user_context["messages"]
                        logger.info(f"📚 Loaded {len(user_context['messages'])} messages from database")
                        
                except Exception as e:
                    logger.warning(f"⚠️ Could not load database context: {e}")
            
            # Use enhanced orchestrator if available, otherwise AI service
            if self.orchestrator_initialized and self.enhanced_orchestrator:
                logger.info(f"🚀 Using Enhanced Orchestrator with tool registry (stream={stream})")
                
                # Use enhanced orchestrator for comprehensive response with tools
                orchestrator_response = await self.enhanced_orchestrator.process_message(
                    user_id=user_id,
                    message=message,
                    session_id=session_id,
                    context=enhanced_context,
                    response_mode=ResponseMode.ADAPTIVE
                )
                
                # Extract response content
                response_text = orchestrator_response.get("content", "")
                
                # Log tool usage if any
                if orchestrator_response.get("capabilities_used"):
                    logger.info(f"🔧 Tools used: {', '.join(orchestrator_response['capabilities_used'])}")
                
                # Save conversation if not anonymous
                if user_id != "anonymous":
                    try:
                        await self.ai_service.save_conversation(
                            user_id=user_id,
                            session_id=session_id,
                            user_message=message,
                            ai_response=response_text,
                            intent=self._extract_intent(message),
                            context_used=enhanced_context
                        )
                        logger.info(f"💾 Conversation saved to database")
                    except Exception as e:
                        logger.warning(f"⚠️ Could not save conversation: {e}")
                
                logger.info(f"✅ Orchestrator response: {len(response_text)} chars, "
                          f"processing_time: {orchestrator_response.get('processing_time_ms', 0)}ms")
                
                return response_text
                
            else:
                # Fallback to AI service
                logger.info(f"🧠 Calling enhanced AI service (stream={stream})")
                
                if stream:
                    # For streaming responses, we need to handle differently
                    return await self._handle_streaming_response(message, enhanced_context, session_id, user_id)
                else:
                    # Non-streaming response
                    # Extract use_case from context if present
                    use_case = enhanced_context.get("use_case")
                    ai_response = await self.ai_service.process_message(
                        message=message,
                        user_context=enhanced_context,
                        temperature=0.7,
                        max_tokens=2048,
                        stream=False,
                        use_case=use_case
                    )
                
                if isinstance(ai_response, AIResponse):
                    response_text = ai_response.content
                    
                    # Save conversation to database
                    if user_id != "anonymous":
                        try:
                            await self.ai_service.save_conversation(
                                user_id=user_id,
                                session_id=session_id,
                                user_message=message,
                                ai_response=response_text,
                                intent=self._extract_intent(message),
                                context_used=enhanced_context
                            )
                            logger.info(f"💾 Conversation saved to database")
                        except Exception as e:
                            logger.warning(f"⚠️ Could not save conversation: {e}")
                    
                    logger.info(f"✅ AI service response: {len(response_text)} chars, "
                              f"latency: {ai_response.latency_ms:.1f}ms, "
                              f"model: {ai_response.model}")
                    
                    return response_text
                else:
                    logger.error(f"❌ Unexpected response type from AI service: {type(ai_response)}")
                    return "I'm having trouble processing your request. Please try again."
                    
        except Exception as e:
            logger.error(f"❌ Enhanced AI service failed: {str(e)}")
            return self._get_error_response(message, str(e))
    
    async def _handle_streaming_response(
        self,
        message: str,
        enhanced_context: Dict[str, Any],
        session_id: str,
        user_id: str
    ) -> Dict[str, Any]:
        """Handle streaming AI response"""
        try:
            # Get streaming response from AI service
            # Extract use_case from context if present
            use_case = enhanced_context.get("use_case")
            response_stream = await self.ai_service.process_message(
                message=message,
                user_context=enhanced_context,
                temperature=0.7,
                max_tokens=2048,
                stream=True,
                use_case=use_case
            )
            
            # Return the stream wrapped in response metadata
            return {
                "type": "stream",
                "stream": response_stream,
                "user_id": user_id,
                "session_id": session_id,
                "message": message,
                "timestamp": datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            logger.error(f"❌ Streaming response failed: {str(e)}")
            return {
                "type": "error",
                "error": str(e),
                "fallback_response": self._get_error_response(message, str(e))
            }
    
    def _extract_intent(self, message: str) -> str:
        """Extract intent from user message"""
        message_lower = message.lower()
        
        # Intent mapping based on keywords
        intent_keywords = {
            "location": ["where", "location", "address", "directions", "route", "map"],
            "travel": ["trip", "travel", "journey", "drive", "visit", "go to"],
            "weather": ["weather", "forecast", "temperature", "rain", "sunny"],
            "accommodation": ["hotel", "motel", "camping", "campground", "stay", "sleep"],
            "food": ["restaurant", "food", "eat", "meal", "hungry", "coffee"],
            "fuel": ["gas", "fuel", "petrol", "refill", "station"],
            "entertainment": ["fun", "activity", "entertainment", "attraction", "sightseeing"],
            "help": ["help", "assist", "support", "how", "what", "explain"]
        }
        
        for intent, keywords in intent_keywords.items():
            if any(keyword in message_lower for keyword in keywords):
                return intent
        
        return "general"
    
    def _get_error_response(self, original_message: str, error: str) -> str:
        """Generate helpful error response"""
        message_lower = original_message.lower()
        
        # Context-aware error responses
        if "location" in message_lower or "where" in message_lower:
            return "I'm having trouble accessing location services right now. Could you be more specific about the area you're asking about?"
        elif "weather" in message_lower:
            # This should rarely be reached now that we have WeatherTool
            return "I'd love to check the weather for you! Could you share your location or tell me which city you're interested in?"
        elif "route" in message_lower or "directions" in message_lower:
            return "I'm unable to provide routing information right now. You might want to use your GPS navigation app for directions."
        else:
            return "AI service is temporarily unavailable. Core app features remain functional. Please try again shortly."
    
    async def process_message(
        self,
        user_id: str,
        message: str,
        session_id: Optional[str] = None,
        context: Optional[Dict[str, Any]] = None,
        use_case: Optional[Any] = None  # Accept PamUseCase
    ) -> Dict[str, Any]:
        """
        Process a message and return structured response with caching
        Compatible with existing PAM API endpoints
        """
        session_id = session_id or str(uuid.uuid4())
        context = context or {}
        context["user_id"] = user_id
        context["session_id"] = session_id
        
        # Check cache first (if available and not streaming)
        if self.cache_manager and not context.get("streaming", False):
            try:
                cached_response = await self.cache_manager.get(
                    message=message,
                    user_id=user_id,
                    context=context
                )
                
                if cached_response:
                    logger.info(f"Cache hit for user {user_id}: {message[:50]}...")
                    # Add cache indicator to response
                    cached_response["cached"] = True
                    cached_response["cache_timestamp"] = datetime.utcnow().isoformat()
                    return cached_response
                    
            except Exception as cache_error:
                logger.warning(f"Cache lookup failed: {str(cache_error)}")
                # Continue without cache
        
        try:
            # Pass use_case to get_response
            if use_case:
                context["use_case"] = use_case
            response = await self.get_response(message, context)
            
            if isinstance(response, dict) and response.get("type") == "stream":
                # Don't cache streaming responses
                return {
                    "content": "Streaming response",
                    "actions": [],
                    "streaming": True,
                    "stream": response["stream"],
                    "cached": False
                }
            else:
                result = {
                    "content": response if isinstance(response, str) else str(response),
                    "actions": [],
                    "streaming": False,
                    "cached": False
                }
                
                # Cache the successful response
                if self.cache_manager and result.get("content"):
                    try:
                        # Determine TTL based on message type
                        ttl = self._determine_cache_ttl(message, result)
                        
                        await self.cache_manager.set(
                            message=message,
                            user_id=user_id,
                            response=result,
                            context=context,
                            ttl=ttl,
                            cache_strategy=CacheStrategy.INTELLIGENT
                        )
                        logger.debug(f"Cached response for user {user_id} (TTL: {ttl}s)")
                        
                    except Exception as cache_error:
                        logger.warning(f"Failed to cache response: {str(cache_error)}")
                        # Continue without caching
                
                return result
                
        except Exception as e:
            logger.error(f"Error processing message: {str(e)}")
            error_response = {
                "content": self._get_error_response(message, str(e)),
                "actions": [{"type": "error", "content": str(e)}],
                "streaming": False,
                "cached": False
            }
            
            # Don't cache error responses
            return error_response
    
    def _determine_cache_ttl(self, message: str, response: Dict[str, Any]) -> int:
        """Determine appropriate cache TTL based on message type"""
        message_lower = message.lower()
        
        # Long TTL for static information
        if any(word in message_lower for word in ["help", "what can you do", "about", "features"]):
            return 3600  # 1 hour
        
        # Medium TTL for general travel info
        elif any(word in message_lower for word in ["campground", "rv park", "attraction", "route"]):
            return 600  # 10 minutes
        
        # Short TTL for dynamic information
        elif any(word in message_lower for word in ["weather", "traffic", "current", "now", "today"]):
            return 60  # 1 minute
        
        # Default TTL
        else:
            return 300  # 5 minutes


# Create global service instance
simple_pam_service = SimplePamService()
