"""
Unified PAM Orchestrator - Single source of truth for all PAM interactions
Combines the best features from all orchestrators while eliminating duplication
"""

import asyncio
import json
import uuid
from typing import Dict, List, Any, Optional, Union, AsyncGenerator
from datetime import datetime
from enum import Enum
from dataclasses import dataclass

from app.core.logging import get_logger
from app.core.config import settings
from app.models.domain.pam import PamContext, PamResponse
from app.services.database import get_database_service
from app.services.ai_service import get_ai_service
from app.services.pam.context_manager import ContextManager
from app.core.intelligent_conversation import IntelligentConversationHandler
from app.services.pam.rag_integration_mixin import RAGIntegrationMixin

logger = get_logger(__name__)


class ResponseMode(Enum):
    """Response modes for different use cases"""
    STREAMING = "streaming"
    COMPLETE = "complete"
    ADAPTIVE = "adaptive"  # Decides based on query complexity


class QueryContext(Enum):
    """Query context types for adaptive responses"""
    TRAVEL = "travel"
    FINANCIAL = "financial"
    WEATHER = "weather"
    GENERAL = "general"
    SOCIAL = "social"
    PROFILE = "profile"


@dataclass
class UnifiedResponse:
    """Unified response format for all interactions"""
    content: str
    actions: List[Dict[str, Any]] = None
    confidence: float = 0.9
    requires_followup: bool = False
    suggestions: List[str] = None
    emotional_insight: Optional[str] = None
    proactive_items: List[Dict[str, Any]] = None
    streaming: bool = False
    context_used: Optional[str] = None


class UnifiedPamOrchestrator(RAGIntegrationMixin):
    """
    Unified orchestrator that combines all capabilities:
    - Context-aware responses (no hardcoded RV bias)
    - Location awareness with proper data flow
    - Streaming support for real-time responses
    - AI service integration with fallbacks
    - Node-based data access when needed
    - Analytics and monitoring
    - RAG-enhanced conversation memory and context retrieval
    """
    
    def __init__(self):
        # Initialize RAG mixin first
        super().__init__()
        
        # Core services
        self.ai_service = None
        self.database_service = None
        self.context_manager = ContextManager()
        self.conversation_handler = IntelligentConversationHandler()
        
        # State management
        self.initialized = False
        
        # Configuration
        self.enable_streaming = True
        self.enable_analytics = True
        self.enable_memory = True
        self.enable_rag = True  # Enable RAG by default
        
    async def initialize(self):
        """Initialize all required services"""
        if self.initialized:
            return
            
        try:
            # Initialize AI service
            self.ai_service = get_ai_service()
            await self.ai_service.initialize()
            
            # Initialize database service
            self.database_service = get_database_service()
            
            logger.info("✅ Unified PAM Orchestrator initialized successfully")
            self.initialized = True
            
        except Exception as e:
            logger.error(f"Failed to initialize Unified Orchestrator: {e}")
            # Continue with degraded functionality
            self.initialized = True
    
    def _detect_query_context(self, message: str, context: Dict[str, Any]) -> QueryContext:
        """Detect the context of the user's query"""
        message_lower = message.lower()
        
        # Travel/RV keywords
        if any(word in message_lower for word in [
            'rv', 'trip', 'route', 'camping', 'travel', 'drive', 'road', 
            'park', 'campground', 'journey', 'destination'
        ]):
            return QueryContext.TRAVEL
            
        # Financial keywords
        if any(word in message_lower for word in [
            'budget', 'expense', 'cost', 'money', 'spend', 'save', 
            'income', 'payment', 'price'
        ]):
            return QueryContext.FINANCIAL
            
        # Weather keywords
        if any(word in message_lower for word in [
            'weather', 'temperature', 'rain', 'forecast', 'storm',
            'cold', 'hot', 'wind', 'tomorrow', 'today'
        ]):
            return QueryContext.WEATHER
            
        # Social keywords
        if any(word in message_lower for word in [
            'group', 'friend', 'meet', 'social', 'community', 'event'
        ]):
            return QueryContext.SOCIAL
            
        # Profile keywords
        if any(word in message_lower for word in [
            'profile', 'settings', 'preferences', 'account', 'my info'
        ]):
            return QueryContext.PROFILE
            
        return QueryContext.GENERAL
    
    def _build_context_aware_prompt(self, message: str, context: Dict[str, Any], 
                                   query_context: QueryContext) -> str:
        """Build a context-aware system prompt based on the query type"""
        
        # Extract location if available
        location_str = ""
        user_location = context.get('user_location') or context.get('location')
        if user_location:
            if isinstance(user_location, dict):
                if user_location.get('address'):
                    location_str = f"User is in {user_location['address']}. "
                elif user_location.get('city'):
                    location_str = f"User is in {user_location['city']}. "
            elif isinstance(user_location, str):
                location_str = f"User is in {user_location}. "
        
        # Base prompt - neutral and adaptive
        base_prompt = f"""You are PAM (Personal AI Manager), an intelligent and adaptive assistant.
{location_str}Current time: {datetime.now().strftime('%Y-%m-%d %H:%M')}

"""
        
        # Add context-specific guidance
        if query_context == QueryContext.TRAVEL:
            base_prompt += """For this travel-related query, provide helpful travel and route information.
Focus on: routes, destinations, camping, RV considerations if relevant."""
        elif query_context == QueryContext.FINANCIAL:
            base_prompt += """For this financial query, provide budget and expense management assistance.
Focus on: budgeting, expense tracking, financial planning."""
        elif query_context == QueryContext.WEATHER:
            base_prompt += """For this weather query, provide accurate weather information.
Focus on: current conditions, forecasts, weather impacts."""
        elif query_context == QueryContext.SOCIAL:
            base_prompt += """For this social query, help with community and social features.
Focus on: connections, groups, events, community."""
        elif query_context == QueryContext.PROFILE:
            base_prompt += """For this profile query, help with user settings and preferences.
Focus on: account management, preferences, personal information."""
        else:
            base_prompt += """Provide helpful, relevant assistance for this general query.
Be conversational and friendly without forcing specialized knowledge."""
        
        return base_prompt
    
    async def process_message(
        self,
        user_id: str,
        message: str,
        session_id: str = None,
        context: Dict[str, Any] = None
    ) -> Dict[str, Any]:
        """
        Main entry point for processing messages
        Replaces all other orchestrator process_message methods
        """
        
        # Ensure we're initialized
        if not self.initialized:
            await self.initialize()
        
        # Generate session ID if not provided
        if not session_id:
            session_id = str(uuid.uuid4())
        
        # Ensure context exists and preserve location
        if not context:
            context = {}
        
        # CRITICAL: Preserve location data
        if 'user_location' in context:
            logger.info(f"📍 Location preserved: {context['user_location']}")
        elif 'userLocation' in context:
            # Frontend compatibility
            context['user_location'] = context['userLocation']
            logger.info(f"📍 Location mapped from userLocation: {context['user_location']}")
        
        # Add essential context
        context['user_id'] = user_id
        context['session_id'] = session_id
        context['timestamp'] = datetime.now().isoformat()
        
        # Detect query context
        query_context = self._detect_query_context(message, context)
        logger.info(f"🎯 Query context detected: {query_context.value}")
        
        # Handle simple greetings with quick responses
        if self._is_simple_greeting(message):
            return self._handle_simple_greeting(message, context)
        
        # Enhance context with RAG if enabled
        if self.enable_rag and self._rag_enabled:
            try:
                context = await self.enhance_message_with_rag(
                    message=message,
                    user_id=user_id,
                    session_id=session_id,
                    context=context
                )
                logger.info(f"🧠 Context enhanced with RAG (confidence: {context.get('confidence_score', 0):.2f})")
            except Exception as e:
                logger.warning(f"RAG enhancement failed, continuing without: {e}")
        
        # For complex queries, use AI service
        try:
            response = await self._process_with_ai(message, context, query_context)
            
            # Store conversation with RAG context if available
            if self.enable_rag and context.get('rag_enabled') and isinstance(response, dict):
                try:
                    # Convert context back to EnhancedContext for storage
                    from app.services.pam.enhanced_context_retriever import EnhancedContext
                    enhanced_obj = EnhancedContext(
                        similar_conversations=context.get('similar_conversations', []),
                        relevant_preferences=context.get('relevant_preferences', []),
                        contextual_memories=context.get('contextual_memories', []),
                        user_knowledge=context.get('user_knowledge', []),
                        context_summary=context.get('context_summary', ''),
                        confidence_score=context.get('confidence_score', 0.0),
                        retrieval_time_ms=context.get('retrieval_time_ms', 0)
                    )
                    
                    await self.store_rag_enhanced_conversation(
                        user_id=user_id,
                        user_message=message,
                        assistant_response=response.get('content', ''),
                        session_id=session_id,
                        enhanced_context=enhanced_obj
                    )
                except Exception as store_error:
                    logger.warning(f"Failed to store RAG-enhanced conversation: {store_error}")
            
            return response
        except Exception as e:
            logger.error(f"AI processing failed: {e}")
            return self._fallback_response(message, context)
    
    def _is_simple_greeting(self, message: str) -> bool:
        """Check if message is a simple greeting"""
        greetings = ['hi', 'hello', 'hey', 'good morning', 'good afternoon', 'good evening']
        message_lower = message.lower().strip()
        return any(greeting in message_lower for greeting in greetings) and len(message_lower) < 20
    
    def _handle_simple_greeting(self, message: str, context: Dict[str, Any]) -> Dict[str, Any]:
        """Handle simple greetings with location awareness"""
        
        # Extract location for personalized greeting
        location_str = ""
        user_location = context.get('user_location')
        if user_location:
            if isinstance(user_location, dict):
                if user_location.get('address'):
                    location_str = f" I see you're in {user_location['address']}."
                elif user_location.get('city'):
                    location_str = f" I see you're in {user_location['city']}."
            elif isinstance(user_location, str):
                location_str = f" I see you're in {user_location}."
        
        response = f"Hello! I'm PAM, your personal AI assistant.{location_str} How can I help you today?"
        
        return {
            "content": response,
            "actions": [],
            "confidence": 0.95,
            "requires_followup": True,
            "suggestions": [
                "What can you help me with?",
                "Check the weather",
                "Help me plan something",
                "Tell me about yourself"
            ],
            "context_used": "greeting"
        }
    
    async def _process_with_ai(self, message: str, context: Dict[str, Any], 
                              query_context: QueryContext) -> Dict[str, Any]:
        """Process message using AI service with context awareness"""
        
        if not self.ai_service:
            return self._fallback_response(message, context)
        
        try:
            # Build context-aware prompt
            system_prompt = self._build_context_aware_prompt(message, context, query_context)
            
            # Prepare enhanced context for AI
            enhanced_context = {
                **context,
                'query_context': query_context.value,
                'system_prompt_override': system_prompt
            }
            
            # Process through AI service
            ai_response = await self.ai_service.process_message(
                message=message,
                user_context=enhanced_context,
                stream=False
            )
            
            # Format response
            return {
                "content": ai_response.content,
                "actions": [],
                "confidence": ai_response.confidence_score or 0.9,
                "requires_followup": True,
                "suggestions": self._generate_suggestions(query_context),
                "context_used": query_context.value
            }
            
        except Exception as e:
            logger.error(f"AI processing error: {e}")
            return self._fallback_response(message, context)
    
    def _generate_suggestions(self, query_context: QueryContext) -> List[str]:
        """Generate context-appropriate suggestions"""
        
        suggestions_map = {
            QueryContext.TRAVEL: [
                "Find nearby campgrounds",
                "Plan a route",
                "Check road conditions",
                "Calculate fuel costs"
            ],
            QueryContext.FINANCIAL: [
                "View my budget",
                "Track expenses",
                "Set savings goals",
                "Review spending"
            ],
            QueryContext.WEATHER: [
                "Get extended forecast",
                "Check for alerts",
                "View radar",
                "Plan around weather"
            ],
            QueryContext.SOCIAL: [
                "Find travel groups",
                "Join events",
                "Connect with others",
                "Share experiences"
            ],
            QueryContext.GENERAL: [
                "What can you help with?",
                "Tell me more",
                "Show me around",
                "Get started"
            ]
        }
        
        return suggestions_map.get(query_context, suggestions_map[QueryContext.GENERAL])
    
    def _fallback_response(self, message: str, context: Dict[str, Any]) -> Dict[str, Any]:
        """Fallback response when AI is unavailable"""
        
        location_str = ""
        if context.get('user_location'):
            location_str = " I can see your location data is available."
        
        return {
            "content": f"I'm here to help!{location_str} Could you tell me more about what you need assistance with?",
            "actions": [],
            "confidence": 0.7,
            "requires_followup": True,
            "suggestions": [
                "Help with travel planning",
                "Manage my budget",
                "Check the weather",
                "General assistance"
            ],
            "context_used": "fallback"
        }
    
    async def process_enhanced_message(
        self,
        user_id: str,
        message: str,
        session_id: str = None,
        context: Dict[str, Any] = None,
        response_mode: ResponseMode = ResponseMode.ADAPTIVE,
        user_location: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Enhanced message processing with streaming support
        Maintains compatibility with enhanced_orchestrator calls
        """
        
        # Merge user_location into context if provided separately
        if user_location and context:
            context['user_location'] = user_location
        
        # Determine if we should stream based on mode
        should_stream = response_mode == ResponseMode.STREAMING
        
        if should_stream and self.ai_service:
            # Return streaming response
            return {
                "content": "Streaming response initiated",
                "streaming": True,
                "stream_generator": self._stream_response(message, context)
            }
        
        # Use standard processing
        return await self.process_message(user_id, message, session_id, context)
    
    async def _stream_response(self, message: str, context: Dict[str, Any]) -> AsyncGenerator[str, None]:
        """Generate streaming response"""
        
        # Detect context for appropriate response
        query_context = self._detect_query_context(message, context)
        
        # Build prompt
        system_prompt = self._build_context_aware_prompt(message, context, query_context)
        
        enhanced_context = {
            **context,
            'query_context': query_context.value,
            'system_prompt_override': system_prompt
        }
        
        # Stream from AI service
        async for token in self.ai_service.process_message(
            message=message,
            user_context=enhanced_context,
            stream=True
        ):
            yield token
    
    # API Compatibility Methods
    async def get_conversation_history(self, user_id: str, limit: int = 20) -> List[Dict[str, Any]]:
        """Get conversation history - maintains API compatibility"""
        if self.database_service:
            try:
                return await self.database_service.get_conversation_context(user_id, limit)
            except:
                pass
        return []
    
    async def clear_conversation(self, user_id: str, conversation_id: Optional[str] = None) -> bool:
        """Clear conversation history - maintains API compatibility"""
        # Implementation would clear from database
        return True
    
    async def update_context(self, user_id: str, context_updates: Dict[str, Any]) -> bool:
        """Update user context - maintains API compatibility"""
        # Implementation would update in database
        return True


# Create singleton instance
unified_orchestrator = UnifiedPamOrchestrator()

# Export for compatibility
async def get_unified_orchestrator() -> UnifiedPamOrchestrator:
    """Get the unified orchestrator instance"""
    if not unified_orchestrator.initialized:
        await unified_orchestrator.initialize()
    return unified_orchestrator