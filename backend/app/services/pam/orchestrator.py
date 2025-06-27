
"""
PAM Orchestrator - Main coordination service
Manages conversation flow, node routing, and memory integration.
"""

import asyncio
import json
import uuid
from typing import Dict, List, Any, Optional, Tuple
from datetime import datetime

from backend.app.core.logging import setup_logging
from backend.app.models.domain.pam import (
    PamMessage, PamConversation, PamMemory, PamIntent, PamContext, 
    PamResponse, IntentType, MemoryType, ConversationStatus
)
from backend.app.services.database import get_database_service
from backend.app.services.cache_service import cache_service
from backend.app.services.pam.nodes.wins_node import wins_node
from backend.app.services.pam.nodes.wheels_node import wheels_node
from backend.app.services.pam.nodes.social_node import social_node
from backend.app.services.pam.nodes.you_node import you_node
from backend.app.services.pam.nodes.memory_node import MemoryNode
from backend.app.services.pam.intelligent_conversation import IntelligentConversation

logger = setup_logging()

class PamOrchestrator:
    """Main PAM orchestration service"""
    
    def __init__(self):
        self.conversation_service = IntelligentConversation()
        self.memory_node = MemoryNode()
        self.nodes = {
            'wins': wins_node,
            'wheels': wheels_node,
            'social': social_node,
            'you': you_node,
            'memory': self.memory_node
        }
        self.database_service = None
    
    async def initialize(self):
        """Initialize orchestrator and dependencies"""
        self.database_service = await get_database_service()
        await self.conversation_service.initialize()
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
            
            # Get or create conversation context
            conversation_context = await self._get_conversation_context(user_id, session_id)
            
            # Analyze intent
            intent_analysis = await self._analyze_intent(message, conversation_context)
            
            # Route to appropriate node
            node_response = await self._route_to_node(
                intent_analysis.intent_type,
                user_id,
                message,
                conversation_context,
                intent_analysis
            )
            
            # Store conversation memory
            response_time = int((datetime.now() - start_time).total_seconds() * 1000)
            await self._store_conversation_memory(
                user_id, session_id, message, node_response, 
                intent_analysis, response_time
            )
            
            # Update conversation context
            await self._update_conversation_context(user_id, session_id, intent_analysis.intent_type)
            
            return node_response
            
        except Exception as e:
            logger.error(f"Error processing message: {e}")
            return PamResponse(
                content="I'm having trouble processing your request right now. Please try again.",
                confidence=0.0,
                requires_followup=False
            )
    
    async def _get_conversation_context(self, user_id: str, session_id: str) -> PamContext:
        """Get conversation context from cache and database"""
        # Try cache first
        cache_key = f"context:{user_id}:{session_id}"
        cached_context = await cache_service.get(cache_key)
        
        if cached_context:
            return PamContext(**cached_context)
        
        # Build context from database
        recent_conversations = await self.database_service.get_conversation_context(user_id)
        user_preferences = await self.database_service.get_user_preferences(user_id)
        
        context = PamContext(
            user_id=user_id,
            preferences=user_preferences,
            conversation_history=[conv['user_message'] for conv in recent_conversations[-5:]],
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
            
            return PamIntent(
                intent_type=IntentType(analysis.get('intent', 'general_chat')),
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
    
    async def _route_to_node(
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
            IntentType.GENERAL_CHAT: 'you',
            IntentType.EMERGENCY_HELP: 'you'
        }
        
        target_node = node_mapping.get(intent, 'you')
        
        # Prepare node input
        node_input = {
            'user_id': user_id,
            'message': message,
            'intent': intent.value,
            'confidence': intent_analysis.confidence,
            'entities': intent_analysis.entities,
            'context': context.dict(),
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
        memory_data = {
            'user_message': user_message,
            'pam_response': pam_response.content,
            'detected_intent': intent_analysis.intent_type.value,
            'intent_confidence': intent_analysis.confidence,
            'context_used': intent_analysis.context_triggers,
            'entities_extracted': intent_analysis.entities,
            'node_used': self._get_node_from_intent(intent_analysis.intent_type),
            'response_time_ms': response_time_ms
        }
        
        await self.database_service.store_conversation(user_id, session_id, memory_data)
        
        # Also store as memory for future context
        if intent_analysis.confidence > 0.7:  # High confidence interactions
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
    
    async def _update_conversation_context(self, user_id: str, session_id: str, intent: IntentType):
        """Update conversation context with latest interaction"""
        cache_key = f"context:{user_id}:{session_id}"
        context = await cache_service.get(cache_key)
        
        if context:
            # Update with latest intent
            context['conversation_history'].append(intent.value)
            context['timestamp'] = datetime.now().isoformat()
            
            # Keep only last 10 interactions
            if len(context['conversation_history']) > 10:
                context['conversation_history'] = context['conversation_history'][-10:]
            
            await cache_service.set(cache_key, context, ttl=300)
    
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
            IntentType.GENERAL_CHAT: 'you',
            IntentType.EMERGENCY_HELP: 'you'
        }
        
        return node_mapping.get(intent, 'you')
    
    async def get_conversation_history(self, user_id: str, limit: int = 20) -> List[Dict[str, Any]]:
        """Get conversation history for user"""
        return await self.database_service.get_conversation_context(user_id, limit)
    
    async def get_user_memories(self, user_id: str, memory_type: MemoryType = None) -> List[Dict[str, Any]]:
        """Get user memories"""
        return await self.database_service.get_user_memories(user_id, memory_type)
    
    async def store_user_memory(self, memory: PamMemory) -> str:
        """Store user memory"""
        return await self.database_service.store_memory(memory)

# Global orchestrator instance
orchestrator = PamOrchestrator()

async def get_orchestrator() -> PamOrchestrator:
    """Get orchestrator instance"""
    if not orchestrator.database_service:
        await orchestrator.initialize()
    return orchestrator
