"""
PAM Orchestrator - Main coordination service
Manages conversation flow, node routing, and memory integration.
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
from app.services.analytics.analytics import Analytics
from app.core.route_intelligence import RouteIntelligence
from app.services.pam.context_manager import ContextManager

logger = logging.getLogger(__name__)

class PamOrchestrator:
    """Main PAM orchestration service"""
    
    def __init__(self):
        self.conversation_service = IntelligentConversationService()
        self.route_intelligence = RouteIntelligence()
        self.context_manager = ContextManager()
        self.analytics = Analytics()
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
        self.database_service = await get_database_service()
        await self.conversation_service.initialize()
        
        # Initialize analytics service
        await self.analytics.initialize()
        logger.info("Analytics service initialized")
        
        # Initialize all nodes
        for node_name, node in self.nodes.items():
            if hasattr(node, 'initialize'):
                await node.initialize()
                logger.info(f"Initialized {node_name} node")
        
        logger.info("PAM Orchestrator initialized")
    
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
            await self.analytics.track_event(
                event_type="user_message",
                user_id=user_id,
                session_id=session_id,
                metadata={"message_length": len(message)}
            )
            
            # Get or create conversation context using context manager
            conversation_context = await self._get_enhanced_context(user_id, session_id, context)
            
            # Analyze intent
            intent_analysis = await self._analyze_intent(message, conversation_context)
            
            # Track intent detection
            await self.analytics.track_event(
                event_type="intent_detected",
                user_id=user_id,
                session_id=session_id,
                metadata={
                    "intent": intent_analysis.intent_type.value,
                    "confidence": intent_analysis.confidence
                }
            )
            
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
            await self.analytics.track_event(
                event_type="pam_response",
                user_id=user_id,
                session_id=session_id,
                metadata={
                    "response_time_ms": response_time,
                    "confidence": node_response.confidence,
                    "node_used": self._get_node_from_intent(intent_analysis.intent_type)
                }
            )
            
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
                aggregation="average"
            )
            
            return node_response
            
        except Exception as e:
            logger.error(f"Error processing message: {e}")
            
            # Track error
            await self.analytics.track_event(
                event_type="error_occurred",
                user_id=user_id,
                session_id=session_id,
                metadata={"error": str(e), "context": "message_processing"}
            )
            
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
        enhanced_data = self.context_manager.enhance_context({
            "user_id": user_id,
            "session_id": session_id,
            "base_context": base_context.dict(),
            "additional_context": additional_context or {}
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
        await self.analytics.track_event(
            event_type="node_execution",
            user_id=user_id,
            metadata={"node": target_node, "intent": intent.value}
        )
        
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
            await self.analytics.track_event(
                event_type="error_occurred",
                user_id=user_id,
                metadata={"error": str(e), "node": target_node, "context": "node_execution"}
            )
            
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
