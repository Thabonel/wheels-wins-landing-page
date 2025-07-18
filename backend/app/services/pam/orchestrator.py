"""
PAM Orchestrator - Main coordination service
Manages conversation flow, node routing, and memory integration.
Enhanced with AI agent observability.
"""
import uuid
from typing import Dict, List, Any, Optional
from datetime import datetime
import logging

from app.models.domain.pam import (
    PamMemory, PamIntent, PamContext, 
    PamResponse, IntentType, MemoryType
)
from app.services.database import get_database_service
from app.services.cache import cache_service
from app.services.pam.nodes.wins_node import wins_node
from app.services.pam.nodes.wheels_node import wheels_node
from app.services.pam.nodes.social_node import social_node
from app.services.pam.nodes.you_node import you_node
from app.services.pam.nodes.shop_node import shop_node
from app.services.pam.nodes.admin_node import admin_node
from app.services.pam.nodes.memory_node import MemoryNode
from app.services.pam.intelligent_conversation import IntelligentConversationService
from app.services.analytics.analytics import PamAnalytics, AnalyticsEvent, EventType
from app.core.route_intelligence import RouteIntelligence
from app.services.pam.context_manager import ContextManager
from app.observability import observe_agent, observe_llm_call
from app.observability.monitor import global_monitor

# Optional web search import
try:
    from app.services.search.web_search import web_search_service
    WEB_SEARCH_AVAILABLE = True
except ImportError:
    web_search_service = None
    WEB_SEARCH_AVAILABLE = False

# Optional screenshot analysis import
try:
    from app.services.vision.screenshot_analyzer import screenshot_analyzer
    SCREENSHOT_ANALYSIS_AVAILABLE = True
except ImportError:
    screenshot_analyzer = None
    SCREENSHOT_ANALYSIS_AVAILABLE = False

logger = logging.getLogger(__name__)

class PamOrchestrator:
    """Main PAM orchestration service"""
    
    def __init__(self):
        self.conversation_service = IntelligentConversationService()
        self.route_intelligence = RouteIntelligence()
        self.context_manager = ContextManager()
        self.analytics = PamAnalytics()
        self.memory_node = MemoryNode()
        self.nodes = {
            'wins': wins_node,
            'wheels': wheels_node,
            'social': social_node,
            'you': you_node,
            'shop': shop_node,
            'admin': admin_node,
            'memory': self.memory_node
        }
        self.database_service = None
    
    async def initialize(self):
        """Initialize orchestrator and dependencies"""
        self.database_service = get_database_service()
        await self.conversation_service.initialize()
        
        # Analytics service initialization (no special setup needed)
        logger.info("Analytics service initialized")
        
        # Initialize all nodes
        for node_name, node in self.nodes.items():
            if hasattr(node, 'initialize'):
                await node.initialize()
                logger.info(f"Initialized {node_name} node")
        
        logger.info("PAM Orchestrator initialized")
    
    @observe_agent(name="pam_process_message", metadata={"agent_type": "pam_orchestrator"})
    async def process_message(
        self, 
        user_id: str, 
        message: str, 
        session_id: str = None,
        context: Dict[str, Any] = None
    ) -> PamResponse:
        """Process incoming message through PAM system"""
        start_time = datetime.now()
        
        try:
            # Ensure session exists
            if not session_id:
                session_id = str(uuid.uuid4())
            
            # Track user message event
            tracking_id = await self.analytics.track_user_message(
                user_id=user_id,
                message=message,
                session_id=session_id
            )
            
            # Get or create conversation context using context manager
            conversation_context = await self._get_enhanced_context(user_id, session_id, context)
            
            # Analyze intent
            intent_analysis = await self._analyze_intent(message, conversation_context)
            
            # Track intent detection
            intent_event = AnalyticsEvent(
                event_type=EventType.INTENT_DETECTED,
                user_id=user_id,
                timestamp=datetime.now(),
                session_id=session_id,
                event_data={
                    "intent": intent_analysis.intent_type.value,
                    "confidence": intent_analysis.confidence
                }
            )
            await self.analytics.track_event(intent_event)
            
            # Check if route planning is needed and use route intelligence
            if intent_analysis.intent_type in [IntentType.ROUTE_PLANNING, IntentType.CAMPGROUND_SEARCH]:
                route_context = await self._enhance_with_route_intelligence(user_id, conversation_context)
                conversation_context.preferences.update(route_context)
            
            # Use AI-first approach: Let intelligent conversation service handle the response
            # with optional node assistance for data retrieval
            node_response = await self._ai_first_response(
                intent_analysis.intent_type,
                user_id,
                message,
                conversation_context,
                intent_analysis
            )
            
            # Calculate response time
            response_time = int((datetime.now() - start_time).total_seconds() * 1000)
            
            # Track PAM response
            response_event = AnalyticsEvent(
                event_type=EventType.PAM_RESPONSE,
                user_id=user_id,
                timestamp=datetime.now(),
                session_id=session_id,
                response_time_ms=response_time,
                event_data={
                    "confidence": node_response.confidence,
                    "node_used": self._get_node_from_intent(intent_analysis.intent_type)
                }
            )
            await self.analytics.track_event(response_event)
            
            # Store conversation memory
            await self._store_conversation_memory(
                user_id, session_id, message, node_response, 
                intent_analysis, response_time
            )
            
            # Update conversation context
            await self._update_conversation_context(user_id, session_id, intent_analysis.intent_type)
            
            # Update analytics metrics
            await self.analytics.update_metric(
                metric_name="average_response_time",
                value=response_time,
                user_id=user_id
            )
            
            return node_response
            
        except Exception as e:
            logger.error(f"Error processing message: {e}")
            
            # Track error
            error_event = AnalyticsEvent(
                event_type=EventType.ERROR_OCCURRED,
                user_id=user_id,
                timestamp=datetime.now(),
                session_id=session_id,
                success=False,
                error_message=str(e),
                event_data={"context": "message_processing"}
            )
            await self.analytics.track_event(error_event)
            
            return PamResponse(
                content="I'm having trouble processing your request right now. Please try again.",
                confidence=0.0,
                requires_followup=False
            )
    
    async def _get_enhanced_context(self, user_id: str, session_id: str, additional_context: Dict[str, Any] = None) -> PamContext:
        """Get enhanced conversation context using context manager"""
        # Get base context
        base_context = await self._get_conversation_context(user_id, session_id)
        
        # Enhance with context manager
        enhanced_data = self.context_manager.validate_and_enrich_context({
            "user_id": user_id,
            "session_id": session_id,
            **base_context.dict(),
            **(additional_context or {})
        })
        
        # Update context with enhanced data
        if enhanced_data.get("enhanced_preferences"):
            base_context.preferences.update(enhanced_data["enhanced_preferences"])
        
        return base_context
    
    async def _enhance_with_route_intelligence(self, user_id: str, context: PamContext) -> Dict[str, Any]:
        """Enhance context with route intelligence data"""
        try:
            # Get user's current location and destination from context
            current_location = context.preferences.get("current_location")
            destination = context.preferences.get("destination")
            
            if current_location and destination:
                # Use route intelligence to get route insights
                route_data = await self.route_intelligence.analyze_route(
                    start_location=current_location,
                    end_location=destination,
                    user_preferences=context.preferences
                )
                
                return {
                    "route_insights": route_data,
                    "nearby_campgrounds": route_data.get("campgrounds", []),
                    "weather_along_route": route_data.get("weather", {}),
                    "fuel_stops": route_data.get("fuel_stops", [])
                }
            
            return {}
            
        except Exception as e:
            logger.error(f"Error enhancing with route intelligence: {e}")
            return {}
    
    async def _get_conversation_context(self, user_id: str, session_id: str) -> PamContext:
        """Get conversation context from cache and database"""
        # Try cache first
        cache_key = f"context:{user_id}:{session_id}"
        cached_context = await cache_service.get(cache_key)
        
        if cached_context:
            return PamContext(**cached_context)
        
        # Build context from database
        try:
            recent_conversations = await self.database_service.get_conversation_context(user_id)
            user_preferences = await self.database_service.get_user_preferences(user_id)
        except Exception as e:
            logger.warning(f"Could not load user context from database: {e}")
            recent_conversations = []
            user_preferences = {}
        
        context = PamContext(
            user_id=user_id,
            preferences=user_preferences or {},
            conversation_history=[conv.get('user_message', '') for conv in recent_conversations[-5:]] if recent_conversations else [],
            timestamp=datetime.now()
        )
        
        # Cache for future use
        await cache_service.set(cache_key, context.dict(), ttl=300)
        
        return context
    
    async def _analyze_intent(self, message: str, context: PamContext) -> PamIntent:
        """Analyze message intent using AI and context"""
        try:
            # Use intelligent conversation service for intent detection
            analysis = await self.conversation_service.analyze_intent(message, context.dict())
            
            # Map string intent to IntentType enum
            intent_str = analysis.get('intent', 'general_chat')
            try:
                intent_type = IntentType(intent_str)
            except ValueError:
                # If intent not in enum, default to general_chat
                intent_type = IntentType.GENERAL_CHAT
            
            return PamIntent(
                intent_type=intent_type,
                confidence=analysis.get('confidence', 0.5),
                entities=analysis.get('entities', {}),
                required_data=analysis.get('required_data', []),
                context_triggers=analysis.get('context_triggers', {})
            )
            
        except Exception as e:
            logger.error(f"Intent analysis error: {e}")
            return PamIntent(
                intent_type=IntentType.GENERAL_CHAT,
                confidence=0.3,
                entities={},
                required_data=[],
                context_triggers={}
            )
    
    def _needs_web_search(self, message: str, intent_analysis: PamIntent) -> bool:
        """Determine if the query needs web search for current information"""
        
        # Keywords that suggest need for internet search
        search_indicators = [
            'search', 'find', 'latest', 'current', 'news', 'today',
            'what is', 'how to', 'where can', 'when does', 'who is',
            'review', 'best', 'top', 'compare', 'vs', 'versus',
            'weather', 'traffic', 'events', 'happening',
            'definition', 'explain', 'meaning', 'tutorial'
        ]
        
        message_lower = message.lower()
        
        # Check for search indicators
        if any(indicator in message_lower for indicator in search_indicators):
            return True
        
        # Check if intent suggests need for current info
        if intent_analysis.intent_type in [
            IntentType.GENERAL_CHAT,
            IntentType.WEATHER_CHECK
        ] and intent_analysis.confidence < 0.7:
            # Low confidence general queries often benefit from web search
            return True
        
        # Check entities for web search needs
        entities = intent_analysis.entities
        if 'search_query' in entities or 'information_request' in entities:
            return True
        
        return False
    
    async def _perform_web_search(
        self,
        query: str,
        context: PamContext,
        search_type: Optional[str] = None
    ) -> Optional[Dict[str, Any]]:
        """Perform web search when PAM needs current information from the internet"""
        
        if not WEB_SEARCH_AVAILABLE:
            logger.warning("⚠️ Web search not available")
            return None
        
        try:
            # Build search context
            search_context = {
                'location': context.location,
                'preferences': context.preferences,
                'time_sensitive': True
            }
            
            # Determine search type based on intent
            if not search_type:
                if any(word in query.lower() for word in ['news', 'latest', 'current', 'today']):
                    search_type = 'news'
                elif any(word in query.lower() for word in ['how to', 'tutorial', 'guide']):
                    search_type = 'how-to'
                elif any(word in query.lower() for word in ['near', 'nearby', 'local']):
                    search_type = 'local'
                elif any(word in query.lower() for word in ['travel', 'trip', 'destination']):
                    search_type = 'travel'
                elif any(word in query.lower() for word in ['review', 'best', 'comparison']):
                    search_type = 'product'
            
            # Perform search
            logger.info(f"🌐 Performing web search for: {query}")
            
            if search_type:
                results = await web_search_service.specialized_search(
                    search_type=search_type,
                    query=query,
                    location=context.location,
                    num_results=5
                )
            else:
                results = await web_search_service.search_with_context(
                    query=query,
                    context=search_context,
                    num_results=5
                )
            
            logger.info(f"✅ Web search returned {len(results.get('results', []))} results")
            return results
            
        except Exception as e:
            logger.error(f"❌ Web search error: {e}")
            return None
    
    async def _ai_first_response(
        self, 
        intent: IntentType, 
        user_id: str, 
        message: str,
        context: PamContext,
        intent_analysis: PamIntent
    ) -> PamResponse:
        """AI-first response generation with optional node data assistance"""
        
        try:
            # Gather relevant data from nodes if needed for this intent
            node_data = await self._gather_node_data(intent, user_id, message, context, intent_analysis)
            
            # Add node data to context for the AI conversation service
            enhanced_context = context.dict()
            if node_data:
                enhanced_context['node_assistance'] = node_data
                enhanced_context['available_data'] = {
                    'routes': node_data.get('routes', []),
                    'camping_spots': node_data.get('camping_spots', []),
                    'fuel_stops': node_data.get('fuel_stops', []),
                    'weather': node_data.get('weather', {}),
                    'user_data': node_data.get('user_data', {})
                }
            
            # Check if we need web search data
            if self._needs_web_search(message, intent_analysis):
                web_results = await self._perform_web_search(message, context)
                if web_results:
                    enhanced_context['web_search_results'] = web_results
                    enhanced_context['has_current_info'] = True
            
            # Let the intelligent conversation service generate the response
            ai_response = await self.conversation_service.generate_response(
                message, 
                enhanced_context
            )
            
            # Convert AI response to PamResponse format
            return PamResponse(
                content=ai_response.get('content', message),
                confidence=0.9,  # High confidence for AI responses
                requires_followup=True,
                suggestions=ai_response.get('suggestions', []),
                actions=ai_response.get('actions', []),
                emotional_insight=ai_response.get('emotional_insight'),
                proactive_items=ai_response.get('proactive_items', [])
            )
            
        except Exception as e:
            logger.error(f"AI-first response generation failed: {e}")
            # Fallback to basic node routing if AI fails
            return await self._route_to_node_backup(intent, user_id, message, context, intent_analysis)

    async def analyze_screenshot(
        self,
        user_id: str,
        image_data: bytes,
        analysis_type: str = "general",
        context: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Analyze a screenshot and provide PAM insights"""
        
        if not SCREENSHOT_ANALYSIS_AVAILABLE:
            logger.warning("⚠️ Screenshot analysis not available")
            return {
                "error": "Screenshot analysis service not available",
                "success": False
            }
        
        try:
            # Track screenshot analysis request
            analysis_event = AnalyticsEvent(
                event_type=EventType.PAM_RESPONSE,  # Using existing event type
                user_id=user_id,
                timestamp=datetime.now(),
                event_data={
                    "action": "screenshot_analysis",
                    "analysis_type": analysis_type,
                    "image_size": len(image_data)
                }
            )
            await self.analytics.track_event(analysis_event)
            
            # Analyze the screenshot
            logger.info(f"🖼️ Analyzing screenshot for user {user_id}")
            analysis_result = await screenshot_analyzer.analyze_screenshot(
                image_data=image_data,
                analysis_type=analysis_type,
                context=context
            )
            
            # Enhance the analysis with PAM-specific insights
            if analysis_result.get("success"):
                pam_insights = analysis_result.get("pam_insights", {})
                
                # Generate contextual response based on analysis
                contextual_response = await self._generate_screenshot_response(
                    analysis_result, 
                    user_id, 
                    context
                )
                
                analysis_result["pam_response"] = contextual_response
                
                logger.info(f"✅ Screenshot analysis completed for user {user_id}")
                
            return analysis_result
            
        except Exception as e:
            logger.error(f"❌ Screenshot analysis error: {e}")
            
            # Track error
            error_event = AnalyticsEvent(
                event_type=EventType.ERROR_OCCURRED,
                user_id=user_id,
                timestamp=datetime.now(),
                success=False,
                error_message=str(e),
                event_data={"context": "screenshot_analysis"}
            )
            await self.analytics.track_event(error_event)
            
            return {
                "error": str(e),
                "success": False,
                "timestamp": datetime.now().isoformat()
            }

    async def _generate_screenshot_response(
        self,
        analysis_result: Dict[str, Any],
        user_id: str,
        context: Optional[Dict[str, Any]] = None
    ) -> str:
        """Generate a contextual PAM response based on screenshot analysis"""
        
        try:
            analysis_type = analysis_result.get("analysis_type", "general")
            pam_insights = analysis_result.get("pam_insights", {})
            
            # Build response based on analysis type
            if analysis_type == "error":
                if analysis_result.get("error_detected"):
                    response = "I can see you're encountering an error. "
                    suggested_actions = pam_insights.get("suggested_actions", [])
                    if suggested_actions:
                        response += f"Here are some steps that might help: {', '.join(suggested_actions[:3])}. "
                    response += "Would you like me to search for more specific solutions?"
                else:
                    response = "I've analyzed your screenshot. It looks like there might be an issue, but I need more context to provide specific help."
                    
            elif analysis_type == "ui":
                response = "I can see the interface you're working with. "
                actionable_items = pam_insights.get("actionable_items", [])
                if actionable_items:
                    response += f"I can help you with: {', '.join(actionable_items[:2])}. "
                response += "What specific part would you like assistance with?"
                
            elif analysis_type == "dashboard":
                response = "I can see your dashboard. "
                if "analytics_dashboard" in analysis_result.get("dashboard_type", ""):
                    response += "The metrics look interesting! Would you like me to help you interpret any specific data points or trends?"
                else:
                    response += "What information are you looking for from this dashboard?"
                    
            else:  # general analysis
                content_type = analysis_result.get("content_type", "unknown")
                if "screenshot" in content_type:
                    response = "I've analyzed your screenshot. "
                    follow_up_questions = pam_insights.get("follow_up_questions", [])
                    if follow_up_questions:
                        response += f"To help you better: {follow_up_questions[0]}"
                    else:
                        response += "How can I assist you with what you're seeing?"
                else:
                    response = "I've reviewed the image you shared. How can I help you with it?"
            
            return response
            
        except Exception as e:
            logger.error(f"Error generating screenshot response: {e}")
            return "I've analyzed your screenshot and I'm ready to help. What would you like to know about it?"

    async def _gather_node_data(
        self, 
        intent: IntentType, 
        user_id: str, 
        message: str,
        context: PamContext,
        intent_analysis: PamIntent
    ) -> Optional[Dict[str, Any]]:
        """Gather data from relevant nodes to assist AI conversation"""
        
        # Only gather data for intents that benefit from node assistance
        if intent not in [IntentType.ROUTE_PLANNING, IntentType.CAMPGROUND_SEARCH, 
                         IntentType.FUEL_PRICES, IntentType.BUDGET_QUERY, IntentType.EXPENSE_LOG]:
            return None
            
        try:
            node_data = {}
            
            # For route planning intents, gather route and location data
            if intent in [IntentType.ROUTE_PLANNING, IntentType.CAMPGROUND_SEARCH]:
                if 'wheels' in self.nodes:
                    try:
                        wheels_data = await self.nodes['wheels'].get_trip_data(user_id, message, context.dict())
                        if wheels_data:
                            node_data.update(wheels_data)
                    except Exception as e:
                        logger.warning(f"Failed to get wheels data: {e}")
            
            # For budget/expense intents, gather financial data
            if intent in [IntentType.BUDGET_QUERY, IntentType.EXPENSE_LOG]:
                if 'wins' in self.nodes:
                    try:
                        wins_data = await self.nodes['wins'].get_financial_data(user_id, context.dict())
                        if wins_data:
                            node_data.update(wins_data)
                    except Exception as e:
                        logger.warning(f"Failed to get wins data: {e}")
            
            return node_data if node_data else None
            
        except Exception as e:
            logger.error(f"Error gathering node data: {e}")
            return None

    async def _route_to_node_backup(
        self, 
        intent: IntentType, 
        user_id: str, 
        message: str,
        context: PamContext,
        intent_analysis: PamIntent
    ) -> PamResponse:
        """Route message to appropriate specialized node"""
        
        # Determine target node based on intent
        node_mapping = {
            IntentType.BUDGET_QUERY: 'wins',
            IntentType.EXPENSE_LOG: 'wins',
            IntentType.INCOME_TRACKING: 'wins',
            IntentType.ROUTE_PLANNING: 'wheels',
            IntentType.CAMPGROUND_SEARCH: 'wheels',
            IntentType.FUEL_PRICES: 'wheels',
            IntentType.WEATHER_CHECK: 'wheels',
            IntentType.MAINTENANCE_REMINDER: 'wheels',
            IntentType.SOCIAL_INTERACTION: 'social',
            IntentType.GENERAL_CHAT: 'you',
            IntentType.EMERGENCY_HELP: 'you'
        }
        
        target_node = node_mapping.get(intent, 'you')
        
        # Track node execution
        execution_event = AnalyticsEvent(
            event_type=EventType.NODE_EXECUTION,
            user_id=user_id,
            timestamp=datetime.now(),
            event_data={"node": target_node, "intent": intent.value}
        )
        await self.analytics.track_event(execution_event)
        
        # Prepare node input with full context
        node_input = {
            'user_id': user_id,
            'message': message,
            'intent': intent.value,
            'confidence': intent_analysis.confidence,
            'entities': intent_analysis.entities,
            'context': context.dict(),
            'conversation_history': context.conversation_history,
            'user_context': context.preferences,
            'required_data': intent_analysis.required_data
        }
        
        try:
            # Call the appropriate node
            if target_node in self.nodes:
                response = await self.nodes[target_node].process(node_input)
                
                # Ensure response is PamResponse format
                if isinstance(response, dict):
                    return PamResponse(**response)
                elif isinstance(response, PamResponse):
                    return response
                else:
                    return PamResponse(
                        content=str(response),
                        confidence=intent_analysis.confidence,
                        requires_followup=False
                    )
            else:
                logger.warning(f"Unknown node: {target_node}")
                return await self._default_response(message, context)
                
        except Exception as e:
            logger.error(f"Node processing error for {target_node}: {e}")
            
            # Track node error
            node_error_event = AnalyticsEvent(
                event_type=EventType.ERROR_OCCURRED,
                user_id=user_id,
                timestamp=datetime.now(),
                success=False,
                error_message=str(e),
                event_data={"node": target_node, "context": "node_execution"}
            )
            await self.analytics.track_event(node_error_event)
            
            return await self._default_response(message, context)
    
    async def _default_response(self, message: str, context: PamContext) -> PamResponse:
        """Generate default response when specialized nodes fail"""
        try:
            # Use general conversation service
            response = await self.conversation_service.generate_response(
                message, 
                context.dict()
            )
            
            return PamResponse(
                content=response.get('content', "I understand you're asking something, but I need a bit more context to help you properly."),
                confidence=0.4,
                suggestions=response.get('suggestions', [
                    "Try asking about your budget or expenses",
                    "Ask about travel routes or camping",
                    "Tell me about your day or goals"
                ]),
                requires_followup=True
            )
            
        except Exception as e:
            logger.error(f"Default response error: {e}")
            return PamResponse(
                content="I'm here to help! You can ask me about your finances, travel plans, or just chat about your RV life.",
                confidence=0.3,
                suggestions=[
                    "How much have I spent this month?",
                    "Find me a campground near here",
                    "What's the weather like ahead?"
                ],
                requires_followup=False
            )
    
    async def _store_conversation_memory(
        self, 
        user_id: str, 
        session_id: str, 
        user_message: str,
        pam_response: PamResponse,
        intent_analysis: PamIntent,
        response_time_ms: int
    ):
        """Store conversation in memory for learning"""
        try:
            memory_data = {
                'user_message': user_message,
                'pam_response': pam_response.content,
                'detected_intent': intent_analysis.intent_type.value,
                'intent_confidence': intent_analysis.confidence,
                'context_used': intent_analysis.context_triggers,
                'entities_extracted': intent_analysis.entities,
                'node_used': self._get_node_from_intent(intent_analysis.intent_type),
                'response_time_ms': response_time_ms,
                'suggestions': pam_response.suggestions,
                'timestamp': datetime.now()
            }
            
            await self.database_service.store_conversation(user_id, session_id, memory_data)
            
            # Also store as memory for future context if high confidence
            if intent_analysis.confidence > 0.7:
                memory = PamMemory(
                    id=str(uuid.uuid4()),
                    user_id=user_id,
                    memory_type=MemoryType.CONVERSATION,
                    content=f"User: {user_message}\nPAM: {pam_response.content}",
                    context=intent_analysis.context_triggers,
                    confidence=intent_analysis.confidence,
                    created_at=datetime.now(),
                    updated_at=datetime.now()
                )
                
                await self.database_service.store_memory(memory)
                
        except Exception as e:
            logger.error(f"Error storing conversation memory: {e}")
    
    async def _update_conversation_context(self, user_id: str, session_id: str, intent: IntentType):
        """Update conversation context with latest interaction"""
        try:
            cache_key = f"context:{user_id}:{session_id}"
            context = await cache_service.get(cache_key)
            
            if context:
                # Update with latest intent
                if 'conversation_history' not in context:
                    context['conversation_history'] = []
                
                context['conversation_history'].append(intent.value)
                context['timestamp'] = datetime.now().isoformat()
                
                # Keep only last 10 interactions
                if len(context['conversation_history']) > 10:
                    context['conversation_history'] = context['conversation_history'][-10:]
                
                await cache_service.set(cache_key, context, ttl=300)
                
        except Exception as e:
            logger.error(f"Error updating conversation context: {e}")
    
    def _get_node_from_intent(self, intent: IntentType) -> str:
        """Map intent to node name"""
        node_mapping = {
            IntentType.BUDGET_QUERY: 'wins',
            IntentType.EXPENSE_LOG: 'wins',
            IntentType.INCOME_TRACKING: 'wins',
            IntentType.ROUTE_PLANNING: 'wheels',
            IntentType.CAMPGROUND_SEARCH: 'wheels',
            IntentType.FUEL_PRICES: 'wheels',
            IntentType.WEATHER_CHECK: 'wheels',
            IntentType.MAINTENANCE_REMINDER: 'wheels',
            IntentType.SOCIAL_INTERACTION: 'social',
            IntentType.GENERAL_CHAT: 'you',
            IntentType.EMERGENCY_HELP: 'you'
        }
        
        return node_mapping.get(intent, 'you')
    
    async def get_conversation_history(self, user_id: str, limit: int = 20) -> List[Dict[str, Any]]:
        """Get conversation history for user"""
        try:
            return await self.database_service.get_conversation_context(user_id, limit)
        except Exception as e:
            logger.error(f"Error getting conversation history: {e}")
            return []
    
    async def get_user_memories(self, user_id: str, memory_type: MemoryType = None) -> List[Dict[str, Any]]:
        """Get user memories"""
        try:
            return await self.database_service.get_user_memories(user_id, memory_type)
        except Exception as e:
            logger.error(f"Error getting user memories: {e}")
            return []
    
    async def store_user_memory(self, memory: PamMemory) -> str:
        """Store user memory"""
        try:
            return await self.database_service.store_memory(memory)
        except Exception as e:
            logger.error(f"Error storing user memory: {e}")
            return ""
    
    async def get_analytics_summary(self, user_id: str, time_range: str = "day") -> Dict[str, Any]:
        """Get analytics summary for user"""
        try:
            return await self.analytics.get_user_summary(user_id, time_range)
        except Exception as e:
            logger.error(f"Error getting analytics summary: {e}")
            return {}

# Backwards compatible class name
PAMOrchestrator = PamOrchestrator

# Global orchestrator instance
orchestrator = PamOrchestrator()

async def get_orchestrator() -> PamOrchestrator:
    """Get orchestrator instance"""
    if not orchestrator.database_service:
        await orchestrator.initialize()
    return orchestrator
