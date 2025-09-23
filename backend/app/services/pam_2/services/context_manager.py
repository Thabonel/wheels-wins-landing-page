"""
PAM 2.0 Context Manager Service
Phase 3 Implementation: Hybrid Memory System

Key Features:
- Supabase pgvector for long-term semantic memory
- Redis for session-based fast retrieval
- LangGraph for conversation state management
- User preference learning and adaptation

Target: <300 lines, modular design
"""

import logging
from typing import Dict, Any, Optional, List
from datetime import datetime, timedelta

from ..core.types import (
    ConversationContext,
    UserContext,
    ChatMessage,
    ServiceResponse,
    MessageType
)
from ..core.exceptions import ContextManagerError
from ..core.config import pam2_settings

logger = logging.getLogger(__name__)

class ContextManager:
    """
    Context Manager Service
    Manages conversation context and user memory using hybrid storage
    """

    def __init__(self):
        self.redis_config = pam2_settings.get_redis_config()
        self.mcp_config = pam2_settings.get_mcp_config()

        # Initialize connections (Phase 3 implementation)
        self._redis_client = None
        self._supabase_client = None
        self._vector_store = None

        # Context retention settings
        self.session_timeout_hours = 24
        self.max_context_messages = 50
        self.semantic_similarity_threshold = 0.8

        logger.info("ContextManager initialized")

    async def get_conversation_context(
        self,
        user_id: str,
        session_id: Optional[str] = None
    ) -> Optional[ConversationContext]:
        """
        Retrieve conversation context for user

        Args:
            user_id: User identifier
            session_id: Session identifier (optional)

        Returns:
            ConversationContext if found, None otherwise
        """
        try:
            logger.info(f"Retrieving context for user {user_id}, session {session_id}")

            # Phase 1: Return basic context
            # Phase 3: Implement hybrid retrieval (Redis + Supabase)
            return await self._get_context_hybrid(user_id, session_id)

        except Exception as e:
            logger.error(f"Error retrieving context for user {user_id}: {e}")
            raise ContextManagerError(
                message=f"Failed to retrieve context: {str(e)}",
                details={"user_id": user_id, "session_id": session_id}
            )

    async def update_conversation_context(
        self,
        context: ConversationContext,
        new_message: ChatMessage
    ) -> ConversationContext:
        """
        Update conversation context with new message

        Args:
            context: Current conversation context
            new_message: New message to add

        Returns:
            Updated ConversationContext
        """
        try:
            # Add new message to context
            context.messages.append(new_message)
            context.last_activity = datetime.now()

            # Trim context if too long
            if len(context.messages) > self.max_context_messages:
                # Keep system messages and recent messages
                system_messages = [msg for msg in context.messages if msg.type == MessageType.SYSTEM]
                recent_messages = context.messages[-self.max_context_messages + len(system_messages):]
                context.messages = system_messages + recent_messages

            # Update topic based on conversation flow
            context.current_topic = await self._analyze_current_topic(context.messages)

            # Phase 1: Basic in-memory update
            # Phase 3: Persist to Redis and Supabase
            await self._persist_context(context)

            return context

        except Exception as e:
            logger.error(f"Error updating context: {e}")
            raise ContextManagerError(
                message=f"Failed to update context: {str(e)}",
                details={"session_id": context.session_id}
            )

    async def create_conversation_context(
        self,
        user_id: str,
        session_id: Optional[str] = None
    ) -> ConversationContext:
        """Create new conversation context"""

        if not session_id:
            session_id = f"{user_id}_{datetime.now().strftime('%Y%m%d_%H%M%S')}"

        # Get user context (preferences, history, etc.)
        user_context = await self._get_user_context(user_id)

        context = ConversationContext(
            session_id=session_id,
            user_context=user_context,
            messages=[],
            current_topic=None,
            last_activity=datetime.now()
        )

        return context

    async def _get_context_hybrid(
        self,
        user_id: str,
        session_id: Optional[str]
    ) -> Optional[ConversationContext]:
        """
        Hybrid context retrieval from Redis + Supabase
        Phase 3 implementation placeholder
        """

        # Phase 1: Return None (no persistence yet)
        # Phase 3: Implement hybrid retrieval
        # 1. Check Redis for active session
        # 2. Check Supabase for historical context
        # 3. Merge and return combined context

        return None

    async def _get_user_context(self, user_id: str) -> UserContext:
        """
        Get user context (preferences, trip data, financial data)
        """

        # Phase 1: Basic user context
        return UserContext(
            user_id=user_id,
            preferences={},
            trip_data={},
            financial_data={},
            conversation_history=[]
        )

        # Phase 3: Implement full user context retrieval
        # - Get user preferences from Supabase
        # - Get recent trip data
        # - Get financial context
        # - Get conversation patterns

    async def _analyze_current_topic(self, messages: List[ChatMessage]) -> Optional[str]:
        """
        Analyze recent messages to determine current conversation topic
        """

        if not messages:
            return None

        # Simple keyword-based topic detection for Phase 1
        recent_content = " ".join([msg.content for msg in messages[-5:]])
        content_lower = recent_content.lower()

        # Topic detection keywords
        if any(word in content_lower for word in ["trip", "travel", "destination", "hotel", "flight"]):
            return "travel_planning"
        elif any(word in content_lower for word in ["budget", "expense", "money", "cost", "price"]):
            return "financial_planning"
        elif any(word in content_lower for word in ["savings", "save", "goal", "target"]):
            return "savings_tracking"
        elif any(word in content_lower for word in ["restaurant", "food", "eat", "dining"]):
            return "dining_recommendations"
        else:
            return "general_conversation"

    async def _persist_context(self, context: ConversationContext):
        """
        Persist context to storage
        Phase 3 implementation placeholder
        """

        # Phase 1: No persistence
        # Phase 3: Implement dual persistence
        # 1. Store active session in Redis (fast access)
        # 2. Store conversation history in Supabase (long-term)
        # 3. Generate embeddings for semantic search

        logger.debug(f"Context persistence pending Phase 3: {context.session_id}")

    async def get_similar_conversations(
        self,
        user_id: str,
        query_text: str,
        limit: int = 5
    ) -> List[Dict[str, Any]]:
        """
        Find similar past conversations using semantic search
        Phase 3 implementation placeholder
        """

        # Phase 3: Implement semantic search
        # 1. Generate embedding for query_text
        # 2. Search Supabase pgvector for similar conversations
        # 3. Return relevant conversation snippets

        return []

    async def get_user_preferences(self, user_id: str) -> Dict[str, Any]:
        """Get user preferences and learned patterns"""

        # Phase 1: Empty preferences
        return {}

        # Phase 3: Implement preference retrieval
        # - Communication style preferences
        # - Travel preferences
        # - Financial goals and patterns
        # - Interaction frequency preferences

    async def update_user_preferences(
        self,
        user_id: str,
        preferences: Dict[str, Any]
    ) -> ServiceResponse:
        """Update user preferences"""

        # Phase 3: Implement preference updates
        # - Validate preference schema
        # - Update in Supabase
        # - Invalidate Redis cache

        return ServiceResponse(
            success=True,
            data={"preferences_updated": True},
            metadata={"user_id": user_id}
        )

    async def cleanup_expired_sessions(self):
        """Clean up expired conversation sessions"""

        # Phase 3: Implement session cleanup
        # - Remove expired Redis sessions
        # - Archive old conversations to long-term storage

        logger.info("Session cleanup pending Phase 3")

    async def get_service_health(self) -> Dict[str, Any]:
        """Get service health status"""

        return {
            "service": "context_manager",
            "status": "healthy",
            "redis_connected": self._redis_client is not None,
            "supabase_connected": self._supabase_client is not None,
            "vector_store_ready": self._vector_store is not None,
            "session_timeout_hours": self.session_timeout_hours,
            "max_context_messages": self.max_context_messages,
            "timestamp": datetime.now().isoformat()
        }

# Service factory function
def create_context_manager() -> ContextManager:
    """Factory function to create ContextManager instance"""
    return ContextManager()