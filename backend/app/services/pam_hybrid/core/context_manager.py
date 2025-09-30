"""Context Manager for PAM Hybrid System

Maintains conversation context, user state, and shared memory across
GPT-4o-mini and Claude agents.
"""

import json
from typing import Any, Dict, List, Optional
from datetime import datetime, timedelta
import logging

logger = logging.getLogger(__name__)


class ContextManager:
    """Manages conversation context for hybrid system"""

    def __init__(self, redis_client=None):
        self.redis = redis_client
        self.local_cache: Dict[str, Dict[str, Any]] = {}
        self.cache_ttl = timedelta(hours=1)

    async def get_user_context(self, user_id: str) -> Dict[str, Any]:
        """Get complete user context"""
        # Try Redis first
        if self.redis:
            try:
                context_key = f"pam:hybrid:context:{user_id}"
                cached = await self.redis.get(context_key)
                if cached:
                    return json.loads(cached)
            except Exception as e:
                logger.warning(f"Redis get failed: {e}")

        # Fallback to local cache
        if user_id in self.local_cache:
            context = self.local_cache[user_id]
            if datetime.utcnow() - context.get("last_updated", datetime.min) < self.cache_ttl:
                return context

        # Return empty context if none found
        return self._create_empty_context(user_id)

    async def update_user_context(
        self,
        user_id: str,
        updates: Dict[str, Any],
        merge: bool = True
    ):
        """Update user context"""
        context = await self.get_user_context(user_id) if merge else {}
        context.update(updates)
        context["last_updated"] = datetime.utcnow().isoformat()

        # Save to Redis
        if self.redis:
            try:
                context_key = f"pam:hybrid:context:{user_id}"
                await self.redis.setex(
                    context_key,
                    int(self.cache_ttl.total_seconds()),
                    json.dumps(context, default=str)
                )
            except Exception as e:
                logger.warning(f"Redis set failed: {e}")

        # Save to local cache
        self.local_cache[user_id] = context

    async def get_conversation_history(
        self,
        user_id: str,
        limit: int = 10
    ) -> List[Dict[str, str]]:
        """Get recent conversation history"""
        context = await self.get_user_context(user_id)
        history = context.get("conversation_history", [])
        return history[-limit:] if limit else history

    async def add_conversation_turn(
        self,
        user_id: str,
        role: str,
        content: str,
        metadata: Optional[Dict[str, Any]] = None
    ):
        """Add a conversation turn"""
        context = await self.get_user_context(user_id)

        if "conversation_history" not in context:
            context["conversation_history"] = []

        turn = {
            "role": role,
            "content": content,
            "timestamp": datetime.utcnow().isoformat(),
            "metadata": metadata or {}
        }

        context["conversation_history"].append(turn)

        # Keep only last 50 turns
        if len(context["conversation_history"]) > 50:
            context["conversation_history"] = context["conversation_history"][-50:]

        await self.update_user_context(user_id, context, merge=False)

    async def get_user_state(self, user_id: str) -> Dict[str, Any]:
        """Get current user state (location, preferences, etc.)"""
        context = await self.get_user_context(user_id)
        return context.get("user_state", {})

    async def update_user_state(
        self,
        user_id: str,
        state_updates: Dict[str, Any]
    ):
        """Update user state"""
        context = await self.get_user_context(user_id)

        if "user_state" not in context:
            context["user_state"] = {}

        context["user_state"].update(state_updates)
        await self.update_user_context(user_id, context, merge=False)

    async def get_shared_memory(
        self,
        user_id: str,
        key: str
    ) -> Optional[Any]:
        """Get value from shared memory"""
        context = await self.get_user_context(user_id)
        shared_memory = context.get("shared_memory", {})
        return shared_memory.get(key)

    async def set_shared_memory(
        self,
        user_id: str,
        key: str,
        value: Any
    ):
        """Set value in shared memory"""
        context = await self.get_user_context(user_id)

        if "shared_memory" not in context:
            context["shared_memory"] = {}

        context["shared_memory"][key] = value
        await self.update_user_context(user_id, context, merge=False)

    async def get_last_agent_used(self, user_id: str) -> Optional[str]:
        """Get the last agent that handled a request"""
        context = await self.get_user_context(user_id)
        return context.get("last_agent")

    async def set_last_agent_used(self, user_id: str, agent: str):
        """Set the last agent that handled a request"""
        await self.update_user_context(
            user_id,
            {"last_agent": agent},
            merge=True
        )

    async def clear_context(self, user_id: str):
        """Clear all context for a user"""
        # Clear from Redis
        if self.redis:
            try:
                context_key = f"pam:hybrid:context:{user_id}"
                await self.redis.delete(context_key)
            except Exception as e:
                logger.warning(f"Redis delete failed: {e}")

        # Clear from local cache
        if user_id in self.local_cache:
            del self.local_cache[user_id]

    def _create_empty_context(self, user_id: str) -> Dict[str, Any]:
        """Create empty context structure"""
        return {
            "user_id": user_id,
            "conversation_history": [],
            "user_state": {},
            "shared_memory": {},
            "last_agent": None,
            "created_at": datetime.utcnow().isoformat(),
            "last_updated": datetime.utcnow().isoformat()
        }


# Global context manager instance
context_manager = ContextManager()