# app/core/simple_pam_service.py
"""
SimplePamService - Direct OpenAI integration for PAM chat functionality
Replaces the complex ActionPlanner/IntelligentConversationHandler architecture
with a streamlined, reliable implementation.
"""

import json
import uuid
from typing import Dict, List, Any, Optional
from datetime import datetime
import asyncio
from openai import AsyncOpenAI
from app.core.config import settings
from app.core.logging import get_logger
from app.services.database import get_database_service

logger = get_logger("simple_pam")

class PAMServiceError(Exception):
    """Exception raised when PAM service encounters errors"""
    pass

class SimplePamService:
    """Simplified PAM service with direct OpenAI integration and robust error handling"""
    
    def __init__(self):
        # Validate configuration before initializing
        if not settings.OPENAI_API_KEY:
            logger.error("OPENAI_API_KEY environment variable is missing")
            raise PAMServiceError(
                "OpenAI API key is required for PAM service. "
                "Please set OPENAI_API_KEY environment variable."
            )
        
        if not settings.OPENAI_API_KEY.startswith('sk-'):
            logger.error("OPENAI_API_KEY appears to be invalid format")
            raise PAMServiceError(
                "OpenAI API key appears to be invalid. "
                "API keys should start with 'sk-'."
            )
        
        try:
            self.client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
            logger.info("SimplePamService initialized successfully with OpenAI")
        except Exception as e:
            logger.error(f"Failed to initialize OpenAI client: {str(e)}")
            raise PAMServiceError(f"Failed to initialize OpenAI client: {str(e)}")
        
        self.max_retries = 3
        self.retry_delay = 1  # seconds
        self._service_healthy = True
        
        # Initialize PAM tools
        self.tools_registry = {}
        self.tools_initialized = False
    
    async def health_check(self) -> Dict[str, Any]:
        """Perform health check on PAM service"""
        try:
            # Simple test call to verify OpenAI connectivity
            response = await self.client.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=[{"role": "user", "content": "test"}],
                max_tokens=1,
                timeout=10.0
            )
            
            self._service_healthy = True
            return {
                "status": "healthy",
                "openai_api": "connected",
                "model": "gpt-3.5-turbo",
                "timestamp": datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            self._service_healthy = False
            logger.error(f"PAM health check failed: {str(e)}")
            return {
                "status": "unhealthy",
                "error": str(e),
                "openai_api": "disconnected",
                "timestamp": datetime.utcnow().isoformat()
            }
    
    def is_healthy(self) -> bool:
        """Check if service is healthy"""
        return self._service_healthy
    
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
    
    async def get_response(
        self, 
        message: str, 
        context: Dict[str, Any],
        conversation_history: Optional[List[Dict]] = None
    ) -> str:
        """
        Get PAM's response to a user message with robust error handling and tool integration
        
        Args:
            message: The user's message
            context: User context including user_id, session_id, etc.
            conversation_history: Previous conversation messages
            
        Returns:
            PAM's response as a string
        """
        user_id = context.get("user_id", "anonymous")
        # Generate a proper UUID for session_id if not provided
        session_id = context.get("session_id", str(uuid.uuid4()))
        input_type = context.get("input_type", "text")
        start_time = datetime.utcnow()
        
        logger.info(f"🤖 [DEBUG] SimplePamService.get_response called!")
        logger.info(f"  - Message: '{message}'")
        logger.info(f"  - User ID: {user_id}")
        logger.info(f"  - Session ID: {session_id}")
        logger.info(f"  - Context keys: {list(context.keys())}")
        logger.info(f"  - Conversation history length: {len(conversation_history) if conversation_history else 0}")
        
        # Validate input
        if not message or message.strip() == "":
            logger.warning(f"❌ [DEBUG] Empty message provided to SimplePamService")
            return "I didn't receive your message. Could you please try again?"
        
        # Initialize tools if not already done - CRITICAL FOR LOCATION INTELLIGENCE
        if not self.tools_initialized:
            logger.info(f"🛠️ [DEBUG] Initializing PAM tools for location intelligence...")
            await self.initialize_tools()
            if self.tools_initialized:
                logger.info(f"✅ [DEBUG] PAM tools initialized successfully - Google Places API available")
            else:
                logger.warning(f"⚠️ [DEBUG] PAM tools initialization failed - location queries may not work optimally")
        
        # Load comprehensive user data across all app sections
        comprehensive_data = {}
        if user_id != "anonymous":
            try:
                db_service = get_database_service()
                
                # Load complete user context - PAM's full knowledge base
                comprehensive_data = await db_service.get_comprehensive_user_context(user_id)
                
                # Add specialized insights
                financial_insights = await db_service.get_financial_travel_insights(user_id)
                social_connections = await db_service.get_social_travel_connections(user_id)
                
                comprehensive_data.update({
                    "financial_insights": financial_insights,
                    "social_connections": social_connections,
                    "has_data": True
                })
                
                logger.info(f"📊 Loaded comprehensive data for user {user_id}: "
                          f"{comprehensive_data.get('activity_summary', {})}")
                          
            except Exception as e:
                logger.warning(f"⚠️ Could not load comprehensive data for user {user_id}: {e}")
                comprehensive_data = {"has_data": False, "error": "Could not load user data"}
        
        # Build the conversation messages for OpenAI - INTELLIGENT TOOL USAGE VIA FUNCTION CALLING
        messages = self._build_conversation_messages(message, context, conversation_history, comprehensive_data)
        
        # Try to get response with retries - OpenAI will intelligently decide when to use tools
        response_text = None
        error_message = None
        intent = self._extract_intent(message)
        confidence_score = 0.85  # Higher confidence with function calling
        tools_used = []  # Will be populated by function calls if any
        
        for attempt in range(self.max_retries):
            try:
                logger.info(f"🧠 OpenAI call attempt {attempt + 1} with intelligent function calling enabled")
                response_text = await self._call_openai(messages, context)  # Pass context for function calling
                logger.info(f"✅ OpenAI response received on attempt {attempt + 1}")
                break
                
            except Exception as e:
                logger.error(f"❌ OpenAI call failed (attempt {attempt + 1}/{self.max_retries}): {str(e)}")
                error_message = str(e)
                
                if attempt < self.max_retries - 1:
                    await asyncio.sleep(self.retry_delay * (attempt + 1))
                else:
                    # All retries failed, return a helpful error response
                    response_text = self._get_error_response(message, str(e))
        
        # Calculate response time
        end_time = datetime.utcnow()
        response_time_ms = int((end_time - start_time).total_seconds() * 1000)
        
        # Log the interaction to database for analytics
        await self._log_interaction(
            user_id=user_id,
            session_id=session_id,
            message=message,
            response=response_text,
            intent=intent,
            confidence_score=confidence_score,
            response_time_ms=response_time_ms,
            input_type=input_type,
            tools_used=tools_used,
            error_message=error_message,
            metadata=context
        )
        
        # Return both response text and context (which may contain visual_action)
        return {
            "response": response_text,
            "context": context
        }
    
    async def _call_openai(self, messages: List[Dict[str, str]], context: Dict[str, Any] = None) -> str:
        """Make the AI API call using the AI Orchestrator with automatic failover"""
        
        try:
            # Use the AI Orchestrator for intelligent provider selection
            from app.services.ai.ai_orchestrator import ai_orchestrator, AIMessage, AICapability
            
            # Initialize orchestrator if needed
            if not ai_orchestrator._initialized:
                await ai_orchestrator.initialize()
            
            # Convert messages to AIMessage format
            ai_messages = []
            for msg in messages:
                ai_messages.append(AIMessage(
                    role=msg.get("role", "user"),
                    content=msg.get("content", "")
                ))
            
            # Define available functions for OpenAI to use intelligently
            functions = []
            
            # Add location-based functions if tools are initialized and user has location context
            if self.tools_initialized and context and context.get('user_location'):
                functions.extend([
                    {
                        "name": "search_nearby_places",
                        "description": "Search for places, locations, geographical features, businesses, or points of interest near the user's current location. Use this for ANY location-based query, including distances, directions, 'next town', 'mountains nearby', 'restaurants around here', etc. No keyword restrictions - understand natural language.",
                        "parameters": {
                            "type": "object",
                            "properties": {
                                "query": {
                                    "type": "string",
                                    "description": "Natural language description of what the user is looking for. Examples: 'mountains nearby', 'next town', 'how far to closest city', 'coffee shops', 'scenic lookouts', 'camping near here'"
                                },
                                "place_type": {
                                    "type": "string",
                                    "enum": ["restaurant", "lodging", "tourist_attraction", "gas_station", "locality", "natural_feature", "campground", "point_of_interest", "establishment"],
                                    "description": "Type of place: locality=towns/cities, natural_feature=mountains/hills/geographical features, restaurant=food places, tourist_attraction=attractions/sights, point_of_interest=general points of interest"
                                },
                                "radius_km": {
                                    "type": "number",
                                    "description": "Search radius in kilometers. Use 10-20 for towns/cities, 5-10 for restaurants/businesses, 20-50 for geographical features",
                                    "default": 10
                                }
                            },
                            "required": ["query", "place_type"]
                        }
                    }
                ])
            
            # Always add web search function if tools are initialized
            if self.tools_initialized:
                functions.append({
                    "name": "search_web_information", 
                    "description": "Search the web for current information, news, weather, or data about any topic. Use when user needs up-to-date information, current events, or wants to 'look up' something.",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "query": {
                                "type": "string",
                                "description": "What to search for on the web (e.g., 'weather forecast Brisbane', 'camping tips', 'current fuel prices')"
                            }
                        },
                        "required": ["query"]
                    }
                })
            
            # Add visual action functions for UI control
            functions.extend([
                {
                    "name": "book_calendar_appointment",
                    "description": "Book an appointment, meeting, or calendar event. Use when user wants to schedule something, meet someone, or add to calendar.",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "person": {
                                "type": "string",
                                "description": "Person to meet with (if mentioned)"
                            },
                            "title": {
                                "type": "string", 
                                "description": "Event title/description"
                            },
                            "date": {
                                "type": "string",
                                "description": "Date (e.g., 'tomorrow', '2025-08-09', 'next Monday')"
                            },
                            "time": {
                                "type": "string",
                                "description": "Time (e.g., '2pm', '14:00', 'noon', '12')"
                            },
                            "location": {
                                "type": "string",
                                "description": "Location if mentioned"
                            }
                        },
                        "required": ["date", "time"]
                    }
                },
                {
                    "name": "log_expense",
                    "description": "Log an expense, purchase, or money spent. Use when user mentions spending money, buying something, or tracking expenses.",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "amount": {
                                "type": "number",
                                "description": "Amount spent (numeric value)"
                            },
                            "category": {
                                "type": "string",
                                "enum": ["fuel", "food", "maintenance", "camping", "entertainment", "supplies", "other"],
                                "description": "Expense category"
                            },
                            "description": {
                                "type": "string",
                                "description": "What was purchased or expense description"
                            },
                            "date": {
                                "type": "string",
                                "description": "Date of expense (default: today)"
                            }
                        },
                        "required": ["amount", "category"]
                    }
                },
                {
                    "name": "navigate_to_page",
                    "description": "Navigate to a specific page or section of the application. Use when user wants to go to, open, or view a specific area.",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "page": {
                                "type": "string",
                                "enum": ["dashboard", "wheels", "wins", "social", "shop", "you", "profile"],
                                "description": "Page to navigate to"
                            },
                            "section": {
                                "type": "string",
                                "description": "Specific section within the page (optional)"
                            }
                        },
                        "required": ["page"]
                    }
                }
            ])
            
            # Get response from the best available provider
            logger.info(f"🧠 AI call via orchestrator with {len(functions)} functions available")
            
            # Build kwargs for the call
            kwargs = {
                "temperature": 0.7,
                "max_tokens": 1000 if functions else 500
            }
            
            # Add functions if available (only OpenAI supports this currently)
            if functions:
                kwargs["functions"] = functions
                kwargs["function_call"] = "auto"
                required_capabilities = {AICapability.FUNCTION_CALLING}
            else:
                required_capabilities = set()
            
            # Call the orchestrator
            response = await ai_orchestrator.complete(
                messages=ai_messages,
                required_capabilities=required_capabilities,
                **kwargs
            )
            
            logger.info(f"✅ AI response received from {response.provider}")
            
            # Handle function calls if present
            if response.function_calls:
                logger.info(f"🛠️ AI requested function call: {response.function_calls[0]['name']}")
                function_result = await self._handle_function_call(response.function_calls[0], context)
                
                # Track tool usage for analytics
                if hasattr(context, 'tools_used'):
                    context['tools_used'].append(response.function_calls[0]['name'])
                
                return function_result
            
            return response.content
            
        except Exception as e:
            logger.error(f"AI orchestrator call failed: {str(e)}")
            # Fall back to direct OpenAI if orchestrator fails
            try:
                logger.info("Falling back to direct OpenAI call")
                response = await self.client.chat.completions.create(
                    model="gpt-3.5-turbo",
                    messages=messages,
                    temperature=0.7,
                    max_tokens=500,
                    timeout=30
                )
                return response.choices[0].message.content
            except Exception as fallback_e:
                logger.error(f"Direct OpenAI fallback also failed: {str(fallback_e)}")
                raise
    
    async def _handle_function_call(self, function_call, context: Dict[str, Any]) -> str:
        """Handle OpenAI function calls by executing the appropriate PAM tools with progress communication"""
        import json
        
        function_name = function_call.name
        function_args = json.loads(function_call.arguments)
        query = function_args.get('query', 'information')
        
        logger.info(f"🛠️ Executing function: {function_name} with args: {function_args}")
        
        try:
            if function_name == "search_nearby_places":
                # Communicate research start
                logger.info(f"🔍 Starting location search for: {query}")
                
                # Use Google Places tool
                if 'google_places' in self.tools_registry:
                    tool_params = {
                        'action': 'nearby_search',
                        'location': context.get('user_location'),
                        'place_type': function_args.get('place_type', 'point_of_interest'),
                        'radius': function_args.get('radius_km', 5) * 1000,  # Convert to meters
                        'keyword': function_args.get('query'),
                        'min_rating': 3.0
                    }
                    
                    user_id = context.get('user_id', 'anonymous')
                    logger.info(f"🔍 Executing Google Places search for: {query}")
                    result = await self.tools_registry['google_places'].execute(user_id, tool_params)
                    
                    if result and result.get('success'):
                        places_count = len(result.get('data', {}).get('places', []))
                        is_mock_data = 'mock' in result.get('data', {}).get('note', '').lower()
                        
                        if is_mock_data:
                            logger.info(f"📍 Providing location guidance for: {query} (API not configured)")
                        else:
                            logger.info(f"🌍 Found {places_count} live results for: {query}")
                        
                        return self._format_places_response(result, function_args.get('query'))
                    else:
                        return f"I searched for {function_args.get('query')} near your location, but couldn't find specific results. This might be a remote area or the location services might be temporarily unavailable."
                else:
                    return f"🔍 I'm searching for {query} near your location, but my location database is currently initializing. Please give me a moment and try again - I should have access to real-time location data shortly!"
                
            elif function_name == "search_web_information":
                # Communicate research start with ETA
                research_message = f"🔍 Let me research {query} for you. I'm searching the web now - this usually takes 10-30 seconds for comprehensive results. I'll get back to you shortly!"
                
                logger.info(f"🌐 Starting web search for: {query}")
                
                # Use web scraper tool  
                if 'webscraper' in self.tools_registry:
                    tool_params = {
                        'action': 'search',
                        'query': function_args.get('query'),
                        'max_results': 5
                    }
                    
                    user_id = context.get('user_id', 'anonymous') 
                    result = await self.tools_registry['webscraper'].execute(user_id, tool_params)
                    
                    if result and result.get('success'):
                        return self._format_web_response(result, function_args.get('query'))
                    else:
                        return f"🔍 I tried to research {query} for you, but my web research tools are currently offline. I can provide general guidance based on my knowledge - would that help, or would you prefer to try again in a few minutes when my research capabilities are back online?"
                else:
                    return f"🔍 I'd love to research {query} for you! My web research tools are currently initializing. This should only take a minute - please try asking me again shortly and I'll be able to provide you with up-to-date information from multiple sources."
            
            elif function_name == "book_calendar_appointment":
                # Handle calendar appointment booking
                logger.info(f"📅 Booking appointment with args: {function_args}")
                
                # Parse the date and time with dateutil for flexibility
                from dateutil import parser as date_parser
                from datetime import datetime, timedelta
                
                date_str = function_args.get('date', 'today')
                time_str = function_args.get('time', '09:00')
                
                # Handle relative dates
                if date_str.lower() == 'tomorrow':
                    date_str = (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%d")
                elif date_str.lower() == 'today':
                    date_str = datetime.now().strftime("%Y-%m-%d")
                else:
                    try:
                        parsed_date = date_parser.parse(date_str)
                        date_str = parsed_date.strftime("%Y-%m-%d")
                    except:
                        date_str = datetime.now().strftime("%Y-%m-%d")
                
                # Normalize time format
                if time_str.lower() in ['noon', 'midday']:
                    time_str = '12:00'
                elif time_str.isdigit():
                    hour = int(time_str)
                    time_str = f"{hour}:00" if hour < 12 else f"{hour}:00"
                
                # Create visual action for frontend
                person = function_args.get('person', '')
                title = function_args.get('title', f"Meeting with {person}" if person else "Appointment")
                
                # Store visual action in context for WebSocket to send
                if 'visual_action' not in context:
                    context['visual_action'] = {
                        "type": "visual_action",
                        "action": {
                            "action": "book_appointment",
                            "parameters": {
                                "person": person,
                                "title": title,
                                "date": date_str,
                                "time": time_str,
                                "location": function_args.get('location', '')
                            }
                        }
                    }
                
                # Return confirmation message
                if person:
                    return f"📅 I'll book an appointment with {person} for {date_str} at {time_str}. Opening your calendar now..."
                else:
                    return f"📅 I'll add '{title}' to your calendar for {date_str} at {time_str}. Opening your calendar now..."
            
            elif function_name == "log_expense":
                # Handle expense logging
                logger.info(f"💰 Logging expense with args: {function_args}")
                
                amount = function_args.get('amount', 0)
                category = function_args.get('category', 'other')
                description = function_args.get('description', f"{category} expense")
                
                # Store visual action in context
                if 'visual_action' not in context:
                    context['visual_action'] = {
                        "type": "visual_action",
                        "action": {
                            "action": "log_expense",
                            "parameters": {
                                "amount": amount,
                                "category": category,
                                "description": description
                            }
                        }
                    }
                
                return f"💰 I'll log your ${amount:.2f} {category} expense. Opening the expense tracker now..."
            
            elif function_name == "navigate_to_page":
                # Handle page navigation
                logger.info(f"🧭 Navigating to page with args: {function_args}")
                
                page = function_args.get('page', 'dashboard')
                section = function_args.get('section', '')
                
                # Map page names to routes
                page_routes = {
                    'dashboard': '/you',
                    'you': '/you',
                    'wheels': '/wheels',
                    'wins': '/wins',
                    'social': '/social',
                    'shop': '/shop',
                    'profile': '/profile'
                }
                
                route = page_routes.get(page, '/you')
                
                # Store visual action in context
                if 'visual_action' not in context:
                    context['visual_action'] = {
                        "type": "visual_action",
                        "action": {
                            "action": "navigate",
                            "parameters": {
                                "route": route,
                                "section": section
                            }
                        }
                    }
                
                page_display = page.capitalize()
                if section:
                    return f"🧭 Navigating to the {page_display} page, {section} section..."
                else:
                    return f"🧭 Navigating to the {page_display} page..."
            
            return f"I understand you're asking about {query}, but I'm currently setting up my research tools. Please try again in a moment and I'll be able to provide comprehensive information!"
            
        except Exception as e:
            logger.error(f"❌ Function call execution error: {e}")
            return f"🔍 I encountered a technical issue while researching {query}. My research tools might be temporarily unavailable - please try again in a few minutes, or I can provide general guidance based on my existing knowledge if that would help!"
    
    def _format_places_response(self, result: Dict[str, Any], query: str) -> str:
        """Format Google Places results into a natural response"""
        data = result.get('data', {})
        places = data.get('places', [])
        
        if not places:
            return f"I searched for {query} near your location but didn't find any specific results. This might be a remote area, or the places might be outside my search radius."
        
        # Determine response style based on query type
        if any(word in query.lower() for word in ['town', 'city', 'next town', 'how far']):
            response = f"Here are the nearest towns/cities I found:\n\n"
        elif any(word in query.lower() for word in ['mountain', 'hill', 'peak', 'geographical']):
            response = f"Here are the geographical features I found nearby:\n\n"
        else:
            response = f"I found several places matching '{query}' near your location:\n\n"
        
        for i, place in enumerate(places[:5], 1):
            name = place.get('name', 'Unknown')
            rating = place.get('rating', 0)
            distance_km = place.get('distance_km', 0)
            address = place.get('address', '')
            
            response += f"{i}. **{name}**"
            
            if rating and rating > 0:
                response += f" ({rating}⭐)"
            
            if distance_km and distance_km > 0:
                response += f" - {distance_km:.1f}km away"
            
            if address:
                response += f"\n   📍 {address}"
            
            response += "\n\n"
        
        # Add helpful follow-up based on query type
        if any(word in query.lower() for word in ['town', 'city', 'how far']):
            response += "Would you like directions to any of these locations, or do you need information about facilities in these towns?"
        else:
            response += "Would you like more details about any of these places, such as contact information or reviews?"
        
        return response
    
    def _format_web_response(self, result: Dict[str, Any], query: str) -> str:
        """Format web search results into a natural response"""
        data = result.get('data', {})
        
        if 'results' in data and data['results']:
            response = f"Here's what I found about {query}:\n\n"
            for item in data['results'][:3]:
                if isinstance(item, dict) and 'title' in item:
                    response += f"• {item['title']}\n"
                    if 'snippet' in item:
                        response += f"  {item['snippet']}\n"
            return response
        else:
            return f"I searched for information about {query} but couldn't find specific results right now."
    
    # REMOVED: Old keyword-based tool processing - now using OpenAI function calling
    # This allows PAM to understand natural language and decide intelligently when to use tools
    # instead of being restricted to specific trigger words.
    
    # REMOVED: Old keyword/pattern extraction methods - OpenAI function calling handles parameter extraction
    # OpenAI now intelligently determines what the user is asking for and extracts parameters accordingly

    def _build_conversation_messages(
        self, 
        message: str, 
        context: Dict[str, Any],
        conversation_history: Optional[List[Dict]] = None,
        comprehensive_data: Optional[Dict[str, Any]] = None
    ) -> List[Dict[str, str]]:
        """Build the messages array for OpenAI"""
        
        # Build comprehensive user information for system message
        user_info = ""
        if comprehensive_data and comprehensive_data.get("has_data"):
            activity_summary = comprehensive_data.get("activity_summary", {})
            travel_data = comprehensive_data.get("travel", {})
            financial_data = comprehensive_data.get("financial", {})
            social_data = comprehensive_data.get("social", {})
            shopping_data = comprehensive_data.get("shopping", {})
            calendar_data = comprehensive_data.get("calendar", {})
            financial_insights = comprehensive_data.get("financial_insights", {})
            social_connections = comprehensive_data.get("social_connections", {})
            
            user_info = f"""

**COMPLETE USER PROFILE & ACTIVITY ACROSS ALL SECTIONS:**

**ACTIVITY SUMMARY:**
• Total trips: {activity_summary.get('total_trips', 0)}
• Total expenses tracked: {activity_summary.get('total_expenses', 0)}
• Social activity score: {activity_summary.get('total_social_activity', 0)}
• Total purchases: {activity_summary.get('total_purchases', 0)}

**🚐 WHEELS (Travel & Vehicles):**
Recent trips: {travel_data.get('trip_count', 0)}"""
            
            recent_trips = travel_data.get("recent_trips", [])
            for i, trip in enumerate(recent_trips[:3], 1):
                origin = trip.get("origin", {}).get("name", "Unknown") if trip.get("origin") else "Unknown"
                destination = trip.get("destination", {}).get("name", "Unknown") if trip.get("destination") else "Unknown"
                user_info += f"\n• Trip {i}: {trip.get('name', 'Untitled')} - From {origin} to {destination}"
                if trip.get("waypoints"):
                    user_info += f" ({len(trip['waypoints'])} stops)"
            
            user_info += f"""

**💰 WINS (Financial Management):**
• Total expenses: ${financial_data.get('total_expenses', 0):.2f}
• Total budget: ${financial_data.get('total_budget', 0):.2f}
• Travel expenses (6mo): ${financial_insights.get('total_travel_expenses', 0):.2f}
• Average trip cost: ${financial_insights.get('average_trip_cost', 0):.2f}
• Budget adherence: {financial_insights.get('budget_adherence', 0):.1f}%
• Top expense category: {financial_insights.get('most_expensive_category', 'N/A')}

**👥 SOCIAL (Community & Groups):**
• Groups joined: {len(social_data.get('groups', []))}
• Recent posts: {len(social_data.get('posts', []))}
• Social score: {social_data.get('social_score', 0)}
• Travel-social connections: {social_connections.get('travel_social_score', 0)}"""
            
            if social_data.get('groups'):
                user_info += "\n• Active in groups: " + ", ".join([g.get('name', 'Unnamed') for g in social_data['groups'][:3]])
            
            user_info += f"""

**🛒 SHOP (Purchases & Wishlists):**
• Total spent: ${shopping_data.get('total_spent', 0):.2f}
• Purchase history: {len(shopping_data.get('purchase_history', []))} items
• Wishlist items: {len(shopping_data.get('wishlists', []))}

**📅 YOU (Calendar & Personal):**
• Upcoming events: {len(calendar_data.get('upcoming_events', []))}"""
            
            if calendar_data.get('upcoming_events'):
                next_event = calendar_data['upcoming_events'][0]
                user_info += f"\n• Next event: {next_event.get('title', 'Untitled')} on {next_event.get('start_date', 'TBD')}"

        # System message defining PAM's personality and capabilities
        system_message = {
            "role": "system",
            "content": """You are PAM (Personal AI Manager), a friendly and helpful AI assistant for the Wheels and Wins platform. 
You help mature travelers (Grey Nomads) with:

🚐 **Wheels** - Travel planning, route suggestions, camping spots, 4WD tracks, vehicle maintenance
💰 **Wins** - Budget tracking, expense management, financial planning  
👥 **Social** - Connecting with other travelers, finding groups and events
👤 **You** - Personal settings, calendar, reminders
🛒 **Shop** - Finding deals on travel gear and supplies

**🌍 LOCATION & TIMEZONE CONTEXT:**
- User location: {user_location}
- Server time: {server_time} UTC
- User timezone note: {user_timezone_note}

**CRITICAL LOCATION INTELLIGENCE:**
- When user asks "how far to next town" - Use their location to provide specific distances and town names
- When user asks "mountains nearby" - Use location to identify specific mountain ranges and RV-accessible routes
- When user asks about weather - Reference their specific location and local timezone
- If location missing, ALWAYS ask: "Could you share your current location so I can provide specific local information?"

Guidelines:
- Be warm, friendly, and conversational
- Provide practical, actionable advice
- Remember users are traveling in RVs/caravans
- Focus on Australian travel context
- Have knowledge of popular 4WD tracks like the Avon Track in Gippsland, Victoria
- Keep responses concise but helpful
- Use emojis to make responses more engaging
- If unsure, ask clarifying questions
- IMPORTANT: You have COMPLETE access to the user's data across ALL app sections and can provide intelligent, personalized assistance
- You can correlate data across sections (e.g., link trip expenses to budgets, suggest social groups based on travel, etc.)
- Provide proactive suggestions based on user patterns and preferences
- You can help users manage their entire travel lifestyle - from planning to budgeting to socializing

**ENHANCED CAPABILITIES WITH TOOLS:**
- 🔍 **Google Places Search**: Can find restaurants, attractions, accommodation, gas stations near any location
- 🌐 **Web Scraping**: Can search the web and scrape real-time information from websites
- 📍 **Location-Based Services**: Can provide location-specific recommendations and information
- 🗺️ **Real-Time Data**: Access to current information about places, weather, and local conditions

TOOL USAGE EXAMPLES:
- "Find restaurants near me" → Uses Google Places to search for nearby restaurants
- "What attractions are in Brisbane" → Uses Google Places for tourist attractions  
- "Search web for camping tips" → Uses webscraper to find relevant information
- "Get information from this website: [URL]" → Scrapes specific website content

{user_info}

**INTELLIGENT TOOL USAGE:**
- Use functions when users ask location-based questions (nearby places, distances, geographical features)  
- Use web search when users need current information or want to look something up
- Natural language understanding - no keyword restrictions
- Examples that should trigger tools:
  • "What towns are near here?" → search_nearby_places with place_type: locality
  • "Find mountains around me" → search_nearby_places with place_type: natural_feature  
  • "How far to the next town?" → search_nearby_places with place_type: locality
  • "Search the web for camping tips" → search_web_information
  • "Are there any peaks nearby?" → search_nearby_places with place_type: natural_feature

Current timestamp: {current_time}
User context: {user_context}""".format(
                user_info=user_info,
                user_location=context.get('user_location', 'LOCATION NOT PROVIDED - Ask user for their current location'),
                server_time=datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S'),
                user_timezone_note=context.get('user_timezone_note', 'TIMEZONE UNKNOWN - Ask user for their local date/time'),
                current_time=datetime.utcnow().isoformat(),
                user_context=json.dumps({
                    "user_id": context.get("user_id"),
                    "session_id": context.get("session_id"),
                    "location": context.get("user_location", "Unknown"),
                    "connection_type": context.get("connection_type", "unknown")
                })
            )
        }
        
        messages = [system_message]
        
        # Add conversation history if available (last 5 messages)
        if conversation_history:
            for msg in conversation_history[-5:]:
                role = "user" if msg.get("role") == "user" else "assistant"
                content = msg.get("content", "")
                if content:
                    messages.append({"role": role, "content": content})
        
        # Add the current user message
        messages.append({"role": "user", "content": message})
        
        return messages
    
    def _format_tool_results(self, tool_result: Dict[str, Any]) -> str:
        """Format tool results for inclusion in the system message"""
        if not tool_result or not tool_result.get('success'):
            return ""
        
        data = tool_result.get('data', {})
        
        # Format Google Places results
        if 'places' in data:
            places = data['places'][:5]  # Limit to first 5 results
            formatted = "**🔍 GOOGLE PLACES SEARCH RESULTS:**\n"
            
            for i, place in enumerate(places, 1):
                formatted += f"\n{i}. **{place.get('name', 'Unknown')}**\n"
                formatted += f"   • Rating: {place.get('rating', 'N/A')}/5 ⭐\n"
                formatted += f"   • Address: {place.get('address', 'Not available')}\n"
                formatted += f"   • Distance: {place.get('distance_km', 'N/A')}km away\n"
                
                if place.get('price_level'):
                    formatted += f"   • Price: {place.get('price_level')}\n"
                if place.get('phone'):
                    formatted += f"   • Phone: {place.get('phone')}\n"
                if place.get('website'):
                    formatted += f"   • Website: {place.get('website')}\n"
            
            return formatted
            
        # Format webscraper results
        elif 'scraped_data' in data:
            scraped = data['scraped_data']
            formatted = "**🌐 WEB SCRAPING RESULTS:**\n"
            
            if scraped.get('title'):
                formatted += f"\n**Title:** {scraped['title']}\n"
            if scraped.get('content'):
                content = scraped['content'][:500]  # Limit content
                formatted += f"**Content:** {content}{'...' if len(scraped['content']) > 500 else ''}\n"
            if scraped.get('links'):
                formatted += f"**Related Links:** {len(scraped['links'])} links found\n"
            
            return formatted
            
        # Format location-based scraping results
        elif 'results' in data:
            results = data['results']
            formatted = "**🌍 LOCATION-BASED DATA:**\n"
            
            for category, category_data in results.items():
                if isinstance(category_data, dict) and category_data.get('data'):
                    items = category_data['data'][:3]  # First 3 items per category
                    formatted += f"\n**{category.title()}:**\n"
                    
                    for item in items:
                        name = item.get('name', 'Unknown')
                        rating = item.get('rating', 'N/A')
                        address = item.get('address', 'Not available')
                        formatted += f"• {name} (Rating: {rating}) - {address}\n"
            
            return formatted
        
        return "**🔧 TOOL DATA:** Tool executed successfully with results available for analysis."
    
    def _get_error_response(self, message: str, error: str) -> str:
        """Generate a helpful error response when OpenAI fails"""
        message_lower = message.lower()
        
        # Provide context-aware fallback responses
        if any(word in message_lower for word in ["hello", "hi", "hey", "g'day"]):
            return "👋 G'day! I'm PAM, your travel companion. I'm having a bit of trouble with my connection right now, but I'm here to help with travel planning, budgets, and connecting with other nomads. What can I help you with today?"
        
        elif any(word in message_lower for word in ["trip", "travel", "route", "drive", "camping"]):
            return "🚐 I'd love to help plan your trip! While I'm having some technical difficulties, here are some popular routes:\n• Brisbane to Cairns via the coast\n• Melbourne to Adelaide via the Great Ocean Road\n• Sydney to Byron Bay\n\nTry asking me again in a moment, and I'll provide more detailed suggestions!"
        
        elif any(word in message_lower for word in ["budget", "expense", "money", "cost", "spend"]):
            return "💰 I can help you track expenses and manage your travel budget! Common categories include:\n• Fuel costs\n• Campsite fees\n• Food & groceries\n• Vehicle maintenance\n\nI'm having connection issues right now, but try again shortly and I'll help you set up your budget tracking!"
        
        elif any(word in message_lower for word in ["help", "what can you do", "features"]):
            return "🌟 I'm PAM, here to help with:\n\n🚐 **Travel** - Route planning, campsite recommendations\n💰 **Budget** - Expense tracking, financial planning\n👥 **Social** - Connect with other travelers\n🛠️ **Vehicle** - Maintenance reminders\n\nI'm experiencing some technical issues, but these features will be fully available once I'm back online!"
        
        else:
            return f"🔧 I'm experiencing some technical difficulties right now, but I'm here to help with your travel needs! I can assist with trip planning, budget tracking, and connecting with other travelers. Please try again in a moment, and I'll be able to provide more detailed assistance."
    
    async def process_message(
        self,
        user_id: str,
        message: str,
        session_id: Optional[str] = None,
        context: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Process a message and return a structured response
        Compatible with the existing PAM response format
        """
        # Build complete context
        full_context = {
            "user_id": user_id,
            "session_id": session_id or str(uuid.uuid4()),
            **(context or {})
        }
        
        # ROBUST MEMORY: Load stored conversation history if not provided
        if not full_context.get("conversation_history") and user_id != "anonymous":
            try:
                db_service = get_database_service()
                stored_conversation = await db_service.get_conversation_context(user_id, limit=5)
                if stored_conversation:
                    # Convert database format to OpenAI format
                    full_context["conversation_history"] = [
                        {
                            "role": msg.get("role", "user"),
                            "content": msg.get("content", "")
                        }
                        for msg in stored_conversation
                        if msg.get("content")
                    ]
                    logger.info(f"📚 Loaded {len(full_context['conversation_history'])} stored messages for user {user_id}")
            except Exception as e:
                logger.warning(f"⚠️ Could not load stored conversation history: {e}")
                # Continue without stored history - don't break the conversation
        
        # Get the response
        response_content = await self.get_response(message, full_context)
        
        # Detect intent and generate UI actions
        intent = self._detect_simple_intent(message)
        ui_actions = self._generate_ui_actions(message, intent, response_content)
        
        # Handle calendar events - actually create them in the database with verification
        calendar_action_result = None
        if intent == "calendar" and any(word in message.lower() for word in ["appointment", "meeting", "schedule", "calendar", "flying", "flight"]):
            event_data = self._extract_calendar_event(message)
            if event_data:
                try:
                    # Create the actual calendar event in the database
                    success = await self.create_calendar_event_for_user(user_id, {
                        'title': event_data.get('title', 'New Event'),
                        'description': f"Created by PAM from: {message}",
                        'start_date': f"{event_data.get('date')}T{event_data.get('time', '09:00')}:00",
                        'end_date': f"{event_data.get('date')}T{event_data.get('time', '10:00')}:00",  # Default 1 hour duration
                        'location': '',
                        'event_type': 'personal',
                        'reminder_minutes': 60  # 1 hour reminder
                    })
                    
                    if success:
                        # VERIFY the event was actually created by checking the database
                        try:
                            db_service = get_database_service()
                            # Check for events created in the last 5 minutes with matching title
                            from datetime import datetime, timedelta
                            recent_time = (datetime.now() - timedelta(minutes=5)).isoformat()
                            
                            verification_result = db_service.client.table('calendar_events').select('*').eq('user_id', user_id).gte('created_at', recent_time).execute()
                            
                            if verification_result.data and any(event.get('title', '').lower() in event_data.get('title', '').lower() for event in verification_result.data):
                                calendar_action_result = "✅ VERIFIED: Calendar event successfully created"
                                logger.info(f"✅ VERIFIED: Calendar event created for user {user_id}")
                            else:
                                calendar_action_result = "❌ FAILED: Event creation reported success but could not verify in database"
                                logger.error(f"❌ VERIFICATION FAILED: Event not found in database for user {user_id}")
                        except Exception as ve:
                            calendar_action_result = "⚠️ UNCERTAIN: Event may have been created but verification failed"
                            logger.warning(f"⚠️ Could not verify calendar event creation: {ve}")
                    else:
                        calendar_action_result = "❌ FAILED: Calendar event creation failed"
                        logger.warning(f"⚠️ Failed to create calendar event for user {user_id}")
                        
                except Exception as e:
                    calendar_action_result = f"❌ ERROR: Calendar event creation failed with error: {str(e)}"
                    logger.error(f"❌ Error creating calendar event for user {user_id}: {e}")
                
                # Update response content to reflect actual result
                if calendar_action_result:
                    if "VERIFIED" in calendar_action_result:
                        # Success - enhance the positive response
                        response_content = response_content.replace(
                            "I'll add", "I have successfully added"
                        ).replace(
                            "I can", "I have"
                        ) + f"\n\n{calendar_action_result}"
                    else:
                        # Failure - be honest about it
                        response_content = f"I attempted to create the calendar event '{event_data.get('title', 'your event')}', but {calendar_action_result.split(': ', 1)[1] if ': ' in calendar_action_result else calendar_action_result}. Please try creating the event manually in your calendar app, or let me try again."
        
        # ROBUST MEMORY: Store conversation to database for persistence
        if user_id != "anonymous":
            try:
                db_service = get_database_service()
                memory_data = {
                    "user_message": message,
                    "assistant_response": response_content,
                    "intent": intent,
                    "confidence": 0.8,
                    "context": {
                        "session_id": session_id,
                        "ui_actions": ui_actions,
                        "timestamp": full_context.get("timestamp")
                    }
                }
                
                success = await db_service.store_conversation(user_id, session_id or str(uuid.uuid4()), memory_data)
                if success:
                    logger.info(f"💾 Stored conversation for user {user_id}")
                else:
                    logger.warning(f"⚠️ Failed to store conversation for user {user_id}")
                    
            except Exception as e:
                logger.warning(f"⚠️ Could not store conversation: {e}")
                # Continue - don't break the response if storage fails
        
        # Return in the expected format
        return {
            "content": response_content,
            "intent": intent,
            "confidence": 0.8,
            "suggestions": self._get_suggestions(message),
            "actions": ui_actions,
            "requires_followup": "?" in response_content,
            "context_updates": {},
            "voice_enabled": False
        }
    
    def _detect_simple_intent(self, message: str) -> str:
        """Enhanced intent detection with UI action support"""
        message_lower = message.lower()
        
        # Trip planning keywords
        if any(word in message_lower for word in ["trip", "travel", "route", "camping", "plan a trip", "from", "to"]):
            return "wheels"
        # Calendar/scheduling keywords  
        elif any(word in message_lower for word in ["appointment", "meeting", "schedule", "calendar", "remind", "book"]):
            return "calendar"
        # Budget/financial keywords
        elif any(word in message_lower for word in ["budget", "expense", "money", "cost", "spent", "track"]):
            return "wins"
        elif any(word in message_lower for word in ["group", "meet", "social", "community"]):
            return "social"
        elif any(word in message_lower for word in ["profile", "setting", "preference"]):
            return "you"
        elif any(word in message_lower for word in ["buy", "shop", "product", "deal"]):
            return "shop"
        else:
            return "general"
    
    def _get_suggestions(self, message: str) -> List[str]:
        """Generate relevant suggestions based on the message"""
        message_lower = message.lower()
        suggestions = []
        
        if "travel" in message_lower or "trip" in message_lower:
            suggestions = [
                "Find camping spots nearby",
                "Check weather forecast",
                "Calculate fuel costs"
            ]
        elif "budget" in message_lower or "expense" in message_lower:
            suggestions = [
                "Add new expense",
                "View spending summary",
                "Set budget alerts"
            ]
        
        return suggestions[:3]  # Return max 3 suggestions
    
    def _generate_ui_actions(self, message: str, intent: str, response_content: str) -> List[Dict[str, Any]]:
        """Generate UI actions based on message intent and content"""
        actions = []
        message_lower = message.lower()
        
        # Trip planning actions
        if intent == "wheels" and any(word in message_lower for word in ["plan", "trip", "from", "to", "route"]):
            # Extract locations if possible (simple regex)
            import re
            
            # Look for "from X to Y" pattern
            from_to_pattern = r'from\s+([^,]+?)\s+to\s+([^,\.!?]+)'
            match = re.search(from_to_pattern, message_lower)
            
            if match:
                origin = match.group(1).strip().title()
                destination = match.group(2).strip().title()
                
                actions.extend([
                    {
                        "type": "navigate",
                        "target": "/wheels",
                        "params": {"view": "trip-planner"}
                    },
                    {
                        "type": "display_route",
                        "payload": {
                            "origin": {"name": origin},
                            "destination": {"name": destination},
                            "message": f"Route from {origin} to {destination}"
                        }
                    }
                ])
            else:
                # Just navigate to trip planner
                actions.append({
                    "type": "navigate", 
                    "target": "/wheels",
                    "params": {"view": "trip-planner"}
                })
        
        # Calendar/appointment actions
        elif intent == "calendar" and any(word in message_lower for word in ["appointment", "meeting", "schedule"]):
            # Try to extract date/time info
            event_data = self._extract_calendar_event(message)
            
            if event_data:
                actions.extend([
                    {
                        "type": "navigate",
                        "target": "/you",
                        "params": {"view": "calendar"}
                    },
                    {
                        "type": "add_calendar_event",
                        "payload": event_data
                    }
                ])
            else:
                actions.append({
                    "type": "navigate",
                    "target": "/you", 
                    "params": {"view": "calendar"}
                })
        
        # Budget/expense actions
        elif intent == "wins" and any(word in message_lower for word in ["spent", "expense", "cost"]):
            # Try to extract expense amount
            expense_data = self._extract_expense_data(message)
            
            if expense_data:
                actions.extend([
                    {
                        "type": "navigate",
                        "target": "/wins",
                        "params": {"view": "expenses"}
                    },
                    {
                        "type": "add_expense",
                        "payload": expense_data
                    }
                ])
            else:
                actions.append({
                    "type": "navigate",
                    "target": "/wins"
                })
        
        return actions
    
    def _extract_calendar_event(self, message: str) -> Optional[Dict[str, Any]]:
        """Extract calendar event details from message"""
        import re
        from datetime import datetime, timedelta
        
        message_lower = message.lower()
        
        # Simple event extraction
        event_data = {}
        
        # Extract event title (enhanced heuristic)
        title_patterns = [
            r'(?:schedule|book|add)\s+(?:a\s+)?(.+?)(?:\s+for|\s+at|\s+on|\s+tomorrow|\s+today|$)',
            r'(?:meeting|appointment)\s+(?:with\s+)?(.+?)(?:\s+at|\s+on|\s+tomorrow|\s+today|$)',
            r'(?:flying|flight)\s+to\s+(.+?)(?:\s+on|\s+at|$)',  # Handle "flying to Brisbane"
            r'i\s+am\s+(.+?)(?:\s+on|\s+at|$)',  # Handle "I am flying to Brisbane"
        ]
        
        for pattern in title_patterns:
            match = re.search(pattern, message_lower)
            if match:
                title = match.group(1).strip()
                if 'flying' in message_lower or 'flight' in message_lower:
                    event_data['title'] = f"Flight to {title.title()}"
                else:
                    event_data['title'] = title.title()
                break
        
        if not event_data.get('title'):
            if 'flying' in message_lower or 'flight' in message_lower:
                event_data['title'] = "Flight"
            else:
                event_data['title'] = "Appointment"
        
        # Extract time (enhanced patterns)
        time_patterns = [
            r'at\s+(\d{1,2})(?:[.:](\d{2}))?\s*(am|pm)',  # "at 9.30am" or "at 9:30am"
            r'(\d{1,2})(?:[.:](\d{2}))?\s*(am|pm)',       # "9.30am" or "9:30am"
            r'at\s+(\d{1,2})(?:[.:](\d{2}))?',            # "at 9.30" or "at 9:30"
            r'(\d{1,2})(?:[.:](\d{2}))?(?:\s+o\'?clock)?', # "9.30" or "9 o'clock"
        ]
        
        for pattern in time_patterns:
            match = re.search(pattern, message_lower)
            if match:
                hour = int(match.group(1))
                minute = int(match.group(2)) if match.group(2) else 0
                ampm = match.group(3)
                
                if ampm == 'pm' and hour != 12:
                    hour += 12
                elif ampm == 'am' and hour == 12:
                    hour = 0
                
                event_data['time'] = f"{hour:02d}:{minute:02d}"
                break
        
        # Extract date (enhanced patterns)
        if 'tomorrow' in message_lower:
            event_data['date'] = (datetime.now() + timedelta(days=1)).strftime('%Y-%m-%d')
        elif 'today' in message_lower:
            event_data['date'] = datetime.now().strftime('%Y-%m-%d')
        else:
            # Look for specific dates like "on the 26th", "26th", "on 26th"
            date_patterns = [
                r'on\s+the\s+(\d{1,2})(?:st|nd|rd|th)?',
                r'on\s+(\d{1,2})(?:st|nd|rd|th)?',
                r'(\d{1,2})(?:st|nd|rd|th)',
            ]
            
            for pattern in date_patterns:
                match = re.search(pattern, message_lower)
                if match:
                    day = int(match.group(1))
                    current_date = datetime.now()
                    
                    # Assume current month, but if the day has passed, use next month
                    if day < current_date.day:
                        # Next month
                        if current_date.month == 12:
                            target_date = current_date.replace(year=current_date.year + 1, month=1, day=day)
                        else:
                            target_date = current_date.replace(month=current_date.month + 1, day=day)
                    else:
                        # This month
                        target_date = current_date.replace(day=day)
                    
                    event_data['date'] = target_date.strftime('%Y-%m-%d')
                    break
            
            # If no specific date found, default to tomorrow
            if not event_data.get('date'):
                event_data['date'] = (datetime.now() + timedelta(days=1)).strftime('%Y-%m-%d')
        
        return event_data if event_data.get('title') else None
    
    def _extract_expense_data(self, message: str) -> Optional[Dict[str, Any]]:
        """Extract expense details from message"""
        import re
        
        # Extract amount
        amount_patterns = [
            r'\$(\d+(?:\.\d{2})?)',
            r'(\d+)\s*dollars?',
            r'(\d+(?:\.\d{2})?)\s*\$'
        ]
        
        amount = None
        for pattern in amount_patterns:
            match = re.search(pattern, message)
            if match:
                amount = float(match.group(1))
                break
        
        if not amount:
            return None
        
        # Extract category (basic heuristic)
        category_keywords = {
            'fuel': ['fuel', 'gas', 'petrol', 'diesel'],
            'food': ['food', 'restaurant', 'grocery', 'meal', 'lunch', 'dinner'],
            'accommodation': ['hotel', 'motel', 'camping', 'campsite', 'accommodation'],
            'maintenance': ['repair', 'service', 'maintenance', 'mechanic'],
            'entertainment': ['movie', 'show', 'attraction', 'park', 'entertainment']
        }
        
        category = 'general'
        message_lower = message.lower()
        
        for cat, keywords in category_keywords.items():
            if any(keyword in message_lower for keyword in keywords):
                category = cat
                break
        
        return {
            'amount': amount,
            'category': category,
            'description': f"Expense: ${amount:.2f} for {category}",
            'date': datetime.now().strftime('%Y-%m-%d')
        }
    
    # Comprehensive PAM Action Methods - Enable PAM to interact with ALL pages
    async def create_social_post_for_user(self, user_id: str, content: str, group_id: str = None) -> bool:
        """Allow PAM to create social posts for users with verification"""
        try:
            db_service = get_database_service()
            success = await db_service.create_social_post(user_id, content, 'text', group_id)
            
            if success:
                logger.info(f"📱 PAM created social post for user {user_id}")
                
                # ACTION VERIFICATION: Check if post was actually created
                try:
                    from datetime import datetime, timedelta
                    recent_time = (datetime.now() - timedelta(minutes=5)).isoformat()
                    
                    verification = db_service.client.table('social_posts').select('*').eq('user_id', user_id).gte('created_at', recent_time).execute()
                    if verification.data and any(post.get('content', '').lower() in content.lower() for post in verification.data):
                        logger.info(f"✅ VERIFIED: Social post successfully created")
                        return True
                    else:
                        logger.error(f"❌ VERIFICATION FAILED: Social post not found in database")
                        return False
                except Exception as ve:
                    logger.warning(f"⚠️ Could not verify social post creation: {ve}")
                    return success  # Return original result if verification fails
            return success
        except Exception as e:
            logger.error(f"❌ Error creating social post via PAM: {e}")
            return False
    
    async def add_to_user_wishlist(self, user_id: str, product_id: str, product_name: str, price: float, notes: str = '') -> bool:
        """Allow PAM to add items to user's wishlist with verification"""
        try:
            db_service = get_database_service()
            success = await db_service.add_to_wishlist(user_id, product_id, product_name, price, notes=notes)
            
            if success:
                logger.info(f"🛒 PAM added item to wishlist for user {user_id}")
                
                # ACTION VERIFICATION: Check if item was actually added
                try:
                    verification = db_service.client.table('wishlists').select('*').eq('user_id', user_id).eq('product_name', product_name).execute()
                    if verification.data:
                        logger.info(f"✅ VERIFIED: Wishlist item '{product_name}' successfully added")
                        return True
                    else:
                        logger.error(f"❌ VERIFICATION FAILED: Wishlist item '{product_name}' not found in database")
                        return False
                except Exception as ve:
                    logger.warning(f"⚠️ Could not verify wishlist addition: {ve}")
                    return success  # Return original result if verification fails
            return success
        except Exception as e:
            logger.error(f"❌ Error adding to wishlist via PAM: {e}")
            return False
    
    async def create_calendar_event_for_user(self, user_id: str, event_data: Dict[str, Any]) -> bool:
        """Allow PAM to create calendar events for users"""
        try:
            db_service = get_database_service()
            success = await db_service.create_calendar_event(user_id, event_data)
            
            if success:
                logger.info(f"📅 PAM created calendar event for user {user_id}")
            return success
        except Exception as e:
            logger.error(f"❌ Error creating calendar event via PAM: {e}")
            return False
    
    async def join_social_group_for_user(self, user_id: str, group_id: str) -> bool:
        """Allow PAM to help users join social groups with verification"""
        try:
            db_service = get_database_service()
            success = await db_service.join_social_group(user_id, group_id)
            
            if success:
                logger.info(f"👥 PAM helped user {user_id} join social group {group_id}")
                
                # ACTION VERIFICATION: Check if user was actually added to group
                try:
                    verification = db_service.client.table('group_memberships').select('*').eq('user_id', user_id).eq('group_id', group_id).execute()
                    if verification.data:
                        logger.info(f"✅ VERIFIED: User {user_id} successfully joined group {group_id}")
                        return True
                    else:
                        logger.error(f"❌ VERIFICATION FAILED: Group membership not found in database")
                        return False
                except Exception as ve:
                    logger.warning(f"⚠️ Could not verify group membership: {ve}")
                    return success  # Return original result if verification fails
            return success
        except Exception as e:
            logger.error(f"❌ Error joining social group via PAM: {e}")
            return False
    
    async def get_trip_expense_correlation(self, user_id: str, trip_id: str) -> Dict[str, Any]:
        """Get detailed correlation between a trip and related expenses"""
        try:
            db_service = get_database_service()
            correlation = await db_service.correlate_trip_expenses(user_id, trip_id)
            
            if correlation:
                logger.info(f"📊 PAM analyzed trip-expense correlation for user {user_id}")
            return correlation
        except Exception as e:
            logger.error(f"❌ Error getting trip expense correlation via PAM: {e}")
            return {}
    
    async def get_user_financial_insights(self, user_id: str) -> Dict[str, Any]:
        """Get comprehensive financial insights for intelligent advice"""
        try:
            db_service = get_database_service()
            insights = await db_service.get_financial_travel_insights(user_id)
            
            if insights:
                logger.info(f"💰 PAM analyzed financial insights for user {user_id}")
            return insights
        except Exception as e:
            logger.error(f"❌ Error getting financial insights via PAM: {e}")
            return {}
    
    async def update_user_trip(self, user_id: str, trip_id: str, updates: Dict[str, Any]) -> bool:
        """Update a user's trip with verification - can be called by PAM when users request trip modifications"""
        try:
            db_service = get_database_service()
            
            # Get original trip data for verification
            original_trip = await db_service.get_trip_details(trip_id)
            if not original_trip or original_trip.get('created_by') != user_id:
                logger.warning(f"🚫 User {user_id} not authorized to update trip {trip_id}")
                return False
            
            success = await db_service.update_trip(trip_id, user_id, updates)
            
            if success:
                logger.info(f"🔄 PAM updated trip {trip_id} for user {user_id}")
                
                # ACTION VERIFICATION: Check if updates were actually applied
                try:
                    updated_trip = await db_service.get_trip_details(trip_id)
                    if updated_trip:
                        # Check if at least one update was applied
                        verification_passed = False
                        for key, value in updates.items():
                            if updated_trip.get(key) == value:
                                verification_passed = True
                                break
                        
                        if verification_passed:
                            logger.info(f"✅ VERIFIED: Trip {trip_id} successfully updated")
                            return True
                        else:
                            logger.error(f"❌ VERIFICATION FAILED: Trip updates not found in database")
                            return False
                    else:
                        logger.error(f"❌ VERIFICATION FAILED: Could not retrieve updated trip")
                        return False
                except Exception as ve:
                    logger.warning(f"⚠️ Could not verify trip update: {ve}")
                    return success  # Return original result if verification fails
            else:
                logger.warning(f"⚠️ PAM failed to update trip {trip_id} for user {user_id}")
            
            return success
        except Exception as e:
            logger.error(f"❌ Error updating trip via PAM: {e}")
            return False
    
    async def get_trip_details_for_user(self, user_id: str, trip_id: str) -> Dict[str, Any]:
        """Get detailed trip information - can be called by PAM when users ask about specific trips"""
        try:
            db_service = get_database_service()
            trip = await db_service.get_trip_details(trip_id)
            
            # Ensure user owns the trip for security
            if trip and trip.get('created_by') == user_id:
                logger.info(f"📋 PAM retrieved trip details for {trip_id}")
                return trip
            else:
                logger.warning(f"🚫 User {user_id} not authorized to access trip {trip_id}")
                return {}
        except Exception as e:
            logger.error(f"❌ Error retrieving trip details via PAM: {e}")
            return {}
    
    async def cleanup(self):
        """Clean up PAM service resources"""
        try:
            # Clean up tools
            if self.tools_initialized and self.tools_registry:
                for tool_name, tool in self.tools_registry.items():
                    try:
                        if hasattr(tool, 'close'):
                            await tool.close()
                        logger.info(f"🧹 Cleaned up {tool_name} tool")
                    except Exception as e:
                        logger.warning(f"⚠️ Error cleaning up {tool_name} tool: {e}")
                
                self.tools_registry.clear()
                self.tools_initialized = False
            
            logger.info("🧹 PAM service cleanup completed")
            
        except Exception as e:
            logger.error(f"❌ Error during PAM service cleanup: {e}")

    def _extract_intent(self, message: str) -> str:
        """Extract intent from user message for analytics"""
        message_lower = message.lower()
        
        # Travel planning intent
        if any(word in message_lower for word in ['trip', 'travel', 'route', 'destination', 'campground', 'park', 'track', '4wd', 'offroad']):
            return 'travel_planning'
        
        # Financial intent
        elif any(word in message_lower for word in ['budget', 'money', 'expense', 'cost', 'price', 'fuel', 'gas']):
            return 'financial_planning'
        
        # Location/places intent
        elif any(word in message_lower for word in ['near', 'restaurant', 'food', 'attraction', 'hotel', 'accommodation']):
            return 'location_search'
        
        # Weather intent
        elif any(word in message_lower for word in ['weather', 'temperature', 'rain', 'forecast', 'climate']):
            return 'weather_inquiry'
        
        # Vehicle/maintenance intent
        elif any(word in message_lower for word in ['vehicle', 'rv', 'maintenance', 'repair', 'tire', 'engine']):
            return 'vehicle_maintenance'
        
        # Social intent
        elif any(word in message_lower for word in ['friend', 'group', 'community', 'meet', 'social']):
            return 'social_interaction'
        
        # Information/web search intent
        elif any(word in message_lower for word in ['search', 'find', 'information', 'look up', 'what is']):
            return 'information_search'
        
        # General chat/greeting intent
        elif any(word in message_lower for word in ['hello', 'hi', 'hey', 'thanks', 'thank you', 'help']):
            return 'general_chat'
        
        else:
            return 'unknown'

    def _calculate_confidence(self, message: str, tool_result: Optional[Dict] = None) -> float:
        """Calculate confidence score for the response"""
        base_confidence = 0.75  # Base confidence for all responses
        
        # Increase confidence if tools were successfully used
        if tool_result and tool_result.get('success', False):
            base_confidence += 0.15
        
        # Increase confidence for specific keywords
        message_lower = message.lower()
        if any(word in message_lower for word in ['campground', 'restaurant', 'park', 'weather']):
            base_confidence += 0.1
        
        # Cap at 0.95 to account for uncertainty
        return min(base_confidence, 0.95)

    async def _log_interaction(
        self,
        user_id: str,
        session_id: str,
        message: str,
        response: str,
        intent: str,
        confidence_score: float,
        response_time_ms: int,
        input_type: str,
        tools_used: List[str],
        error_message: Optional[str] = None,
        metadata: Optional[Dict] = None
    ):
        """Log the interaction to the database for analytics"""
        try:
            # Only log for authenticated users
            if user_id == "anonymous":
                return
                
            from app.database.supabase_client import get_supabase_service
            
            # Prepare log data
            log_data = {
                'user_id': user_id,
                'session_id': session_id,
                'message': message[:1000],  # Truncate long messages
                'response': response[:2000] if response else '',  # Truncate long responses
                'intent': intent,
                'confidence_score': confidence_score,
                'response_time_ms': response_time_ms,
                'input_type': input_type,
                'tools_used': tools_used,
                'error_message': error_message,
                'metadata': metadata or {}
            }
            
            # Get Supabase SERVICE ROLE client for agent_logs operations
            # This bypasses RLS policies and allows backend logging
            supabase = get_supabase_service()
            result = supabase.table('agent_logs').insert(log_data).execute()
            
            if result.data:
                logger.info(f"📊 Logged interaction for user {user_id} with intent '{intent}'")
            else:
                logger.warning(f"⚠️ Failed to log interaction for user {user_id}")
                
        except Exception as e:
            # Don't let logging errors break the main functionality
            logger.warning(f"⚠️ Error logging interaction: {e}")


# Create a singleton instance
simple_pam_service = SimplePamService()