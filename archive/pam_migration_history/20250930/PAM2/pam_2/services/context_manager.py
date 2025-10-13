"""
PAM 2.0 Context Manager
=======================

Clean context persistence and retrieval service using Redis.
Manages conversation history, user context, and session state.

Key Features:
- Fast Redis-based context storage
- Session management and cleanup
- Context compression and optimization
- Type-safe context operations

Design: <300 lines, single responsibility, easily testable
"""

import json
import logging
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, List

from ..core.types import (
    ConversationContext, UserContext, ChatMessage,
    ServiceResponse, SessionID, UserID
)
from ..core.config import pam2_settings
from ..core.exceptions import ContextManagerError, handle_async_service_error
from ..integrations.redis import RedisClient, create_redis_client

logger = logging.getLogger(__name__)


class ContextManager:
    """
    Clean context management service using Redis

    Provides fast, reliable context storage and retrieval
    for conversation state and user information.
    """

    def __init__(self):
        self.config = pam2_settings.get_redis_config()
        self.default_ttl = self.config.default_ttl
        self.max_history = pam2_settings.max_conversation_history

        # Initialize Redis client
        self._redis_client: Optional[RedisClient] = None
        self._client_ready = False

        # Cache keys
        self._context_key_prefix = "pam2:context:"
        self._session_key_prefix = "pam2:session:"
        self._user_key_prefix = "pam2:user:"

        logger.info("ContextManager initialized")

    async def initialize(self) -> bool:
        """Initialize the context manager"""
        try:
            self._redis_client = create_redis_client(self.config)
            await self._redis_client.initialize()
            self._client_ready = True
            logger.info("ContextManager ready with Redis")
            return True
        except Exception as e:
            logger.error(f"ContextManager initialization failed: {e}")
            return False

    @handle_async_service_error
    async def store_context(
        self,
        session_id: SessionID,
        context: ConversationContext
    ) -> ServiceResponse:
        """
        Store conversation context in Redis

        Args:
            session_id: Session identifier
            context: Conversation context to store

        Returns:
            ServiceResponse with storage result
        """
        if not self._client_ready:
            raise ContextManagerError(
                "Context manager not initialized",
                operation="store_context"
            )

        try:
            # Optimize context for storage
            optimized_context = self._optimize_context_for_storage(context)

            # Store context with TTL
            context_key = f"{self._context_key_prefix}{session_id}"
            await self._redis_client.set(
                key=context_key,
                value=optimized_context.json(),
                ttl=self.default_ttl
            )

            # Update session index
            await self._update_session_index(session_id, context.user_context.user_id)

            logger.debug(f"Context stored for session: {session_id}")

            return ServiceResponse(
                success=True,
                data={
                    "session_id": session_id,
                    "messages_count": len(context.messages),
                    "ttl_seconds": self.default_ttl
                },
                metadata={
                    "operation": "store_context",
                    "context_size_bytes": len(optimized_context.json()),
                    "user_id": context.user_context.user_id
                },
                service_name="context_manager"
            )

        except Exception as e:
            logger.error(f"Failed to store context: {e}")
            raise ContextManagerError(
                f"Context storage failed: {str(e)}",
                operation="store_context",
                context={"session_id": session_id}
            )

    @handle_async_service_error
    async def retrieve_context(
        self,
        session_id: SessionID,
        user_id: Optional[UserID] = None
    ) -> ServiceResponse:
        """
        Retrieve conversation context from Redis

        Args:
            session_id: Session identifier
            user_id: Optional user ID for validation

        Returns:
            ServiceResponse with retrieved context or None
        """
        if not self._client_ready:
            raise ContextManagerError(
                "Context manager not initialized",
                operation="retrieve_context"
            )

        try:
            context_key = f"{self._context_key_prefix}{session_id}"
            context_data = await self._redis_client.get(context_key)

            if not context_data:
                return ServiceResponse(
                    success=True,
                    data=None,
                    metadata={
                        "operation": "retrieve_context",
                        "session_id": session_id,
                        "found": False
                    },
                    service_name="context_manager"
                )

            # Parse and validate context
            context = ConversationContext.parse_raw(context_data)

            # Validate user ownership if user_id provided
            if user_id and context.user_context.user_id != user_id:
                raise ContextManagerError(
                    "Session does not belong to user",
                    operation="retrieve_context",
                    context={"session_id": session_id, "user_id": user_id}
                )

            # Update last access time
            context.last_activity = datetime.now()
            await self._update_last_access(session_id)

            logger.debug(f"Context retrieved for session: {session_id}")

            return ServiceResponse(
                success=True,
                data=context,
                metadata={
                    "operation": "retrieve_context",
                    "session_id": session_id,
                    "found": True,
                    "messages_count": len(context.messages),
                    "user_id": context.user_context.user_id
                },
                service_name="context_manager"
            )

        except Exception as e:
            logger.error(f"Failed to retrieve context: {e}")
            raise ContextManagerError(
                f"Context retrieval failed: {str(e)}",
                operation="retrieve_context",
                context={"session_id": session_id}
            )

    @handle_async_service_error
    async def add_message_to_context(
        self,
        session_id: SessionID,
        message: ChatMessage
    ) -> ServiceResponse:
        """
        Add a new message to existing context

        Args:
            session_id: Session identifier
            message: Chat message to add

        Returns:
            ServiceResponse with update result
        """
        # Retrieve existing context
        context_response = await self.retrieve_context(session_id)

        if not context_response.success or not context_response.data:
            raise ContextManagerError(
                "Cannot add message: context not found",
                operation="add_message_to_context",
                context={"session_id": session_id}
            )

        context: ConversationContext = context_response.data

        # Add message to context
        context.messages.append(message)
        context.last_activity = datetime.now()

        # Store updated context
        return await self.store_context(session_id, context)

    @handle_async_service_error
    async def cleanup_expired_sessions(self) -> ServiceResponse:
        """
        Clean up expired sessions and contexts

        Returns:
            ServiceResponse with cleanup statistics
        """
        try:
            # This is handled by Redis TTL automatically
            # But we can add additional cleanup logic here
            cleanup_count = 0

            return ServiceResponse(
                success=True,
                data={
                    "expired_sessions_cleaned": cleanup_count,
                    "cleanup_method": "redis_ttl"
                },
                metadata={
                    "operation": "cleanup_expired_sessions"
                },
                service_name="context_manager"
            )

        except Exception as e:
            logger.error(f"Session cleanup failed: {e}")
            raise ContextManagerError(
                f"Session cleanup failed: {str(e)}",
                operation="cleanup_expired_sessions"
            )

    def _optimize_context_for_storage(self, context: ConversationContext) -> ConversationContext:
        """Optimize context for efficient storage"""
        # Limit message history to max configured
        if len(context.messages) > self.max_history:
            context.messages = context.messages[-self.max_history:]

        # Remove large metadata if present
        for message in context.messages:
            if len(message.metadata) > 10:  # Arbitrary limit
                message.metadata = {}

        return context

    async def _update_session_index(self, session_id: SessionID, user_id: UserID):
        """Update session index for user"""
        try:
            user_sessions_key = f"{self._user_key_prefix}{user_id}:sessions"
            await self._redis_client.sadd(user_sessions_key, session_id)
            await self._redis_client.expire(user_sessions_key, self.default_ttl)
        except Exception as e:
            logger.warning(f"Failed to update session index: {e}")

    async def _update_last_access(self, session_id: SessionID):
        """Update last access time for session"""
        try:
            access_key = f"{self._session_key_prefix}{session_id}:last_access"
            await self._redis_client.set(
                key=access_key,
                value=datetime.now().isoformat(),
                ttl=self.default_ttl
            )
        except Exception as e:
            logger.warning(f"Failed to update last access: {e}")

    async def get_service_health(self) -> Dict[str, Any]:
        """Get service health status"""
        return {
            "service": "context_manager",
            "redis_available": self._client_ready,
            "configuration": {
                "default_ttl": self.default_ttl,
                "max_history": self.max_history,
                "redis_url": self.config.url
            }
        }


def create_context_manager() -> ContextManager:
    """Factory function to create ContextManager instance"""
    return ContextManager()