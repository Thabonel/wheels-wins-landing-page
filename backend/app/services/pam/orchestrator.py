
"""
PAM Orchestrator - Core orchestration system for Personal AI Manager
"""

from typing import Dict, List, Any, Optional
from enum import Enum
import json
import logging
import time
from datetime import datetime

from app.core.config import settings
from app.services.database import DatabaseService
from app.services.cache import CacheService
from app.core.exceptions import (
    PAMError, ValidationError, ExternalServiceError, 
    CacheError, DatabaseError
)
from app.models.domain.pam import (
    PamMessage, PamConversation, PamMemory, PamIntent, 
    PamContext, PamResponse, IntentType, ConversationStatus
)

# Import node services
from app.services.pam.nodes.wins_node import wins_node
from app.services.pam.nodes.wheels_node import wheels_node
from app.services.pam.nodes.social_node import social_node
from app.services.pam.nodes.you_node import you_node
from app.services.pam.nodes.memory_node import MemoryNode
from app.services.pam.intelligent_conversation import IntelligentConversationHandler

# Import enhanced route intelligence
from app.services.pam.route_intelligence import route_intelligence

# Import scraping function with error handling
try:
    from scraper_service.main import fetch_and_parse
    SCRAPER_AVAILABLE = True
except ImportError as e:
    logging.warning(f"Scraper service not available: {e}")
    SCRAPER_AVAILABLE = False

logger = logging.getLogger("pam.orchestrator")

class Domain(Enum):
    WHEELS = "wheels"
    WINS = "wins"
    SOCIAL = "social"
    YOU = "you"
    SHOP = "shop"
    GENERAL = "general"

class ActionType(Enum):
    VIEW = "view"
    CREATE = "create"
    UPDATE = "update"
    DELETE = "delete"
    NAVIGATE = "navigate"
    HELP = "help"
    PLAN = "plan"
    TRACK = "track"
    ANALYZE = "analyze"

class Intent:
    def __init__(self, domain: Domain, action: ActionType, entities: Dict[str, Any], confidence: float):
        self.domain = domain
        self.action = action
        self.entities = entities
        self.confidence = confidence

class IntentClassifier:
    def __init__(self):
        self.cache_service = CacheService()
        
    async def classify(self, message: str, context: Dict[str, Any] = None) -> Intent:
        """Classify user intent with caching and error handling"""
        start_time = time.time()
        
        try:
            # Check cache first
            cache_key = f"intent_classification:{hash(message)}"
            cached_result = await self.cache_service.get(cache_key)
            
            if cached_result:
                logger.debug(f"Intent classification cache hit for message: {message[:50]}")
                return Intent(**cached_result)
            
            # Perform classification logic
            intent = await self._perform_classification(message, context)
            
            # Cache result
            await self.cache_service.set(
                cache_key, 
                {
                    "domain": intent.domain,
                    "action": intent.action,
                    "entities": intent.entities,
                    "confidence": intent.confidence
                },
                ttl=300  # 5 minutes
            )
            
            processing_time = (time.time() - start_time) * 1000
            logger.info(f"Intent classified in {processing_time:.2f}ms: {intent.domain.value}/{intent.action.value}")
            
            return intent
            
        except Exception as e:
            logger.error(f"Intent classification failed: {str(e)}")
            raise PAMError(f"Failed to classify intent: {str(e)}")
    
    async def _perform_classification(self, message: str, context: Dict[str, Any] = None) -> Intent:
        """Perform the actual intent classification"""
        message_lower = message.lower()
        
        # Budget/financial keywords
        if any(word in message_lower for word in ['budget', 'expense', 'money', 'spend', 'cost', 'income', 'save']):
            if any(word in message_lower for word in ['create', 'new', 'add']):
                return Intent(Domain.WINS, ActionType.CREATE, {"category": "budget"}, 0.8)
            elif any(word in message_lower for word in ['track', 'log', 'record']):
                return Intent(Domain.WINS, ActionType.TRACK, {"category": "expense"}, 0.8)
            else:
                return Intent(Domain.WINS, ActionType.VIEW, {"category": "financial"}, 0.7)
        
        # Travel/route keywords
        if any(word in message_lower for word in ['route', 'trip', 'travel', 'camp', 'drive', 'fuel']):
            if any(word in message_lower for word in ['plan', 'create']):
                return Intent(Domain.WHEELS, ActionType.PLAN, {"category": "route"}, 0.8)
            elif any(word in message_lower for word in ['track', 'log']):
                return Intent(Domain.WHEELS, ActionType.TRACK, {"category": "travel"}, 0.8)
            else:
                return Intent(Domain.WHEELS, ActionType.VIEW, {"category": "travel"}, 0.7)
        
        # Social keywords
        if any(word in message_lower for word in ['group', 'community', 'social', 'meet', 'event']):
            return Intent(Domain.SOCIAL, ActionType.VIEW, {"category": "social"}, 0.7)
        
        # Profile/settings keywords
        if any(word in message_lower for word in ['profile', 'settings', 'preference', 'account']):
            return Intent(Domain.YOU, ActionType.VIEW, {"category": "profile"}, 0.7)
        
        # Default to general conversation
        return Intent(Domain.GENERAL, ActionType.HELP, {"category": "general"}, 0.5)

class PAMOrchestrator:
    """Core orchestrator for Personal AI Manager"""
    
    def __init__(self):
        self.db_service = DatabaseService()
        self.cache_service = CacheService()
        self.intent_classifier = IntentClassifier()
        self.conversation_handler = IntelligentConversationHandler()
        self.memory_node = MemoryNode()
        
        # Node mapping
        self.nodes = {
            Domain.WINS: wins_node,
            Domain.WHEELS: wheels_node,
            Domain.SOCIAL: social_node,
            Domain.YOU: you_node
        }
        
        logger.info("PAM Orchestrator initialized")
    
    async def process_message(self, user_id: str, message: str, conversation_id: Optional[str] = None) -> PamResponse:
        """Process a user message and generate response"""
        start_time = time.time()
        
        try:
            # Load or create conversation context
            context = await self._load_context(user_id, conversation_id)
            
            # Classify intent
            intent = await self.intent_classifier.classify(message, context.model_dump())
            
            # Get relevant memories
            memories = await self._get_relevant_memories(user_id, message, intent)
            
            # Route to appropriate node
            response = await self._route_to_node(intent, message, context, memories)
            
            # Store conversation memory
            await self._store_conversation_memory(user_id, message, response, intent, conversation_id)
            
            # Update context cache
            await self._update_context_cache(user_id, conversation_id, context)
            
            processing_time = (time.time() - start_time) * 1000
            logger.info(f"Message processed in {processing_time:.2f}ms for user {user_id}")
            
            return response
            
        except Exception as e:
            logger.error(f"Message processing failed for user {user_id}: {str(e)}")
            return self._create_error_response(str(e))
    
    async def _load_context(self, user_id: str, conversation_id: Optional[str] = None) -> PamContext:
        """Load user context from cache and database"""
        try:
            # Try cache first
            cache_key = f"user_context:{user_id}:{conversation_id or 'default'}"
            cached_context = await self.cache_service.get(cache_key)
            
            if cached_context:
                return PamContext(**cached_context)
            
            # Load from database
            context_data = await self.db_service.get_user_context(user_id)
            
            context = PamContext(
                user_id=user_id,
                current_location=context_data.get('location'),
                recent_expenses=context_data.get('recent_expenses', []),
                budget_status=context_data.get('budget_status', {}),
                travel_plans=context_data.get('travel_plans', {}),
                vehicle_info=context_data.get('vehicle_info', {}),
                preferences=context_data.get('preferences', {}),
                conversation_history=context_data.get('conversation_history', []),
                timestamp=datetime.utcnow()
            )
            
            return context
            
        except Exception as e:
            logger.error(f"Failed to load context for user {user_id}: {str(e)}")
            # Return minimal context
            return PamContext(
                user_id=user_id,
                timestamp=datetime.utcnow()
            )
    
    async def _get_relevant_memories(self, user_id: str, message: str, intent: Intent) -> List[PamMemory]:
        """Retrieve relevant memories for the current context"""
        try:
            memories = await self.memory_node.search_memories(
                user_id=user_id,
                query=message,
                intent_type=IntentType(intent.domain.value.lower() + "_query"),
                limit=5
            )
            return memories
            
        except Exception as e:
            logger.error(f"Failed to retrieve memories for user {user_id}: {str(e)}")
            return []
    
    async def _route_to_node(self, intent: Intent, message: str, context: PamContext, memories: List[PamMemory]) -> PamResponse:
        """Route message to appropriate node for processing"""
        try:
            if intent.domain in self.nodes:
                node = self.nodes[intent.domain]
                response = await node.process(
                    message=message,
                    intent=intent,
                    context=context,
                    memories=memories
                )
                return response
            else:
                # Handle general conversation
                return await self.conversation_handler.handle_general_conversation(
                    message=message,
                    context=context,
                    memories=memories
                )
                
        except Exception as e:
            logger.error(f"Node routing failed for domain {intent.domain}: {str(e)}")
            raise PAMError(f"Failed to process request: {str(e)}")
    
    async def _store_conversation_memory(self, user_id: str, message: str, response: PamResponse, 
                                       intent: Intent, conversation_id: Optional[str] = None):
        """Store conversation in memory for future reference"""
        try:
            memory = PamMemory(
                id=f"conv_{int(time.time())}",
                user_id=user_id,
                memory_type="conversation",
                content=f"User: {message}\nPAM: {response.content}",
                context={
                    "intent": intent.domain.value,
                    "action": intent.action.value,
                    "confidence": intent.confidence,
                    "conversation_id": conversation_id
                },
                confidence=intent.confidence,
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow(),
                source_conversation_id=conversation_id
            )
            
            await self.memory_node.store_memory(memory)
            
        except Exception as e:
            logger.error(f"Failed to store conversation memory: {str(e)}")
            # Don't raise - this is not critical for user experience
    
    async def _update_context_cache(self, user_id: str, conversation_id: Optional[str], context: PamContext):
        """Update context in cache"""
        try:
            cache_key = f"user_context:{user_id}:{conversation_id or 'default'}"
            await self.cache_service.set(
                cache_key,
                context.model_dump(),
                ttl=1800  # 30 minutes
            )
            
        except CacheError as e:
            logger.warning(f"Failed to update context cache: {str(e)}")
            # Don't raise - cache failure shouldn't break functionality
    
    def _create_error_response(self, error_message: str) -> PamResponse:
        """Create a user-friendly error response"""
        return PamResponse(
            content="I'm sorry, I encountered an issue processing your request. Please try again or rephrase your question.",
            intent=None,
            confidence=0.0,
            suggestions=["Try rephrasing your question", "Ask for help with a specific topic"],
            actions=[],
            requires_followup=False,
            context_updates={},
            voice_enabled=False
        )
    
    async def plan(self, message: str, context: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Legacy method for backward compatibility"""
        try:
            user_id = context.get("user_id", "unknown")
            response = await self.process_message(user_id, message)
            
            # Convert response to legacy format
            return [{
                "type": "response",
                "content": response.content,
                "suggestions": response.suggestions,
                "actions": response.actions
            }]
            
        except Exception as e:
            logger.error(f"Legacy plan method failed: {str(e)}")
            return [{
                "type": "error",
                "content": "I encountered an issue processing your request.",
                "error": str(e)
            }]

# Create singleton instance
orchestrator = PAMOrchestrator()
