"""
PAM 2.0 Safety Layer
===================

Clean content filtering and rate limiting service.
Provides production-ready guardrails for safe AI interactions.

Key Features:
- Content safety filtering
- User rate limiting (100 messages/hour)
- Security policy enforcement
- Incident logging and reporting

Design: <300 lines, single responsibility, easily testable
"""

import asyncio
import time
import logging
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, List

from ..core.types import (
    ChatMessage, ServiceResponse, MessageType,
    RateLimitConfig, UserID
)
from ..core.config import pam2_settings
from ..core.exceptions import (
    SafetyLayerError, RateLimitExceededError, ContentFilterError,
    handle_async_service_error
)
from ..integrations.redis import RedisClient, create_redis_client

logger = logging.getLogger(__name__)


class SafetyLayer:
    """
    Clean safety and security service for PAM 2.0

    Provides content filtering, rate limiting, and security
    policy enforcement to ensure safe AI interactions.
    """

    def __init__(self):
        self.rate_limit_config = pam2_settings.get_rate_limit_config()
        self.content_filtering_enabled = pam2_settings.enable_content_filtering
        self.rate_limiting_enabled = pam2_settings.enable_rate_limiting

        # Initialize Redis for rate limiting
        self._redis_client: Optional[RedisClient] = None
        self._client_ready = False

        # Content safety patterns
        self.blocked_patterns = [
            # Basic harmful content patterns
            r'\b(?:hack|hacking|illegal|drugs|violence)\b',
            # Personal information patterns
            r'\b\d{3}-\d{2}-\d{4}\b',  # SSN pattern
            r'\b\d{4}\s?\d{4}\s?\d{4}\s?\d{4}\b',  # Credit card pattern
        ]

        # Allowed topics for travel assistant
        self.allowed_topics = [
            'travel', 'vacation', 'trip', 'budget', 'savings', 'planning',
            'hotel', 'flight', 'restaurant', 'attraction', 'weather',
            'transportation', 'accommodation', 'money', 'finance'
        ]

        logger.info(f"SafetyLayer initialized (content_filter: {self.content_filtering_enabled}, "
                   f"rate_limit: {self.rate_limiting_enabled})")

    async def initialize(self) -> bool:
        """Initialize the safety layer"""
        try:
            if self.rate_limiting_enabled:
                redis_config = pam2_settings.get_redis_config()
                self._redis_client = create_redis_client(redis_config)
                await self._redis_client.initialize()
                self._client_ready = True
                logger.info("SafetyLayer ready with Redis rate limiting")
            else:
                self._client_ready = True
                logger.info("SafetyLayer ready (rate limiting disabled)")
            return True
        except Exception as e:
            logger.error(f"SafetyLayer initialization failed: {e}")
            return False

    @handle_async_service_error
    async def check_message_safety(
        self,
        message: ChatMessage,
        user_id: Optional[UserID] = None
    ) -> ServiceResponse:
        """
        Check message safety including content filtering and rate limiting

        Args:
            message: Message to check
            user_id: Optional user ID (defaults to message.user_id)

        Returns:
            ServiceResponse with safety check results
        """
        user_id = user_id or message.user_id
        checks = {
            "content_filter": True,
            "rate_limit": True,
            "safety_passed": True
        }

        try:
            # Check content safety
            if self.content_filtering_enabled:
                content_result = await self._check_content_safety(message)
                checks["content_filter"] = content_result["safe"]
                if not content_result["safe"]:
                    checks["safety_passed"] = False
                    await self._log_safety_incident(
                        user_id, "content_filter", content_result["reason"]
                    )

            # Check rate limits
            if self.rate_limiting_enabled and self._client_ready:
                rate_result = await self._check_rate_limits(user_id)
                checks["rate_limit"] = rate_result["allowed"]
                if not rate_result["allowed"]:
                    checks["safety_passed"] = False
                    await self._log_safety_incident(
                        user_id, "rate_limit", rate_result["reason"]
                    )

            # Record successful message if all checks pass
            if checks["safety_passed"] and self.rate_limiting_enabled and self._client_ready:
                await self._record_message(user_id)

            return ServiceResponse(
                success=True,
                data={
                    "safety_passed": checks["safety_passed"],
                    "checks": checks,
                    "user_id": user_id,
                    "message_id": message.id
                },
                metadata={
                    "timestamp": datetime.now().isoformat(),
                    "content_filtering_enabled": self.content_filtering_enabled,
                    "rate_limiting_enabled": self.rate_limiting_enabled
                },
                service_name="safety_layer"
            )

        except Exception as e:
            logger.error(f"Safety check failed: {e}")
            raise SafetyLayerError(
                f"Safety check failed: {str(e)}",
                operation="check_message_safety",
                context={"user_id": user_id, "message_id": message.id}
            )

    async def _check_content_safety(self, message: ChatMessage) -> Dict[str, Any]:
        """Check content safety using pattern matching"""
        content = message.content.lower()

        # Check for blocked patterns
        import re
        for pattern in self.blocked_patterns:
            if re.search(pattern, content, re.IGNORECASE):
                return {
                    "safe": False,
                    "reason": "blocked_content_detected",
                    "pattern": pattern
                }

        # Check if content is on-topic for travel assistant
        content_words = content.split()
        topic_match = any(
            topic in content for topic in self.allowed_topics
        )

        # Allow general conversation but flag if completely off-topic
        if len(content_words) > 10 and not topic_match:
            # Don't block, but log for monitoring
            logger.info(f"Off-topic content detected: {content[:50]}...")

        return {
            "safe": True,
            "reason": "content_approved",
            "topic_match": topic_match
        }

    async def _check_rate_limits(self, user_id: UserID) -> Dict[str, Any]:
        """Check if user exceeds rate limits"""
        try:
            current_time = int(time.time())
            hour_key = f"rate_limit:hour:{user_id}:{current_time // 3600}"
            minute_key = f"rate_limit:minute:{user_id}:{current_time // 60}"

            # Check hourly limit
            hourly_count = await self._get_rate_count(hour_key)
            if hourly_count >= self.rate_limit_config.messages_per_hour:
                return {
                    "allowed": False,
                    "reason": "hourly_limit_exceeded",
                    "count": hourly_count,
                    "limit": self.rate_limit_config.messages_per_hour
                }

            # Check minute limit
            minute_count = await self._get_rate_count(minute_key)
            if minute_count >= self.rate_limit_config.messages_per_minute:
                return {
                    "allowed": False,
                    "reason": "minute_limit_exceeded",
                    "count": minute_count,
                    "limit": self.rate_limit_config.messages_per_minute
                }

            return {
                "allowed": True,
                "reason": "rate_limit_ok",
                "hourly_count": hourly_count,
                "minute_count": minute_count
            }

        except Exception as e:
            logger.error(f"Rate limit check failed: {e}")
            # Fail open - allow message if rate limiting fails
            return {
                "allowed": True,
                "reason": "rate_limit_check_failed",
                "error": str(e)
            }

    async def _get_rate_count(self, key: str) -> int:
        """Get current rate count from Redis"""
        if not self._redis_client:
            return 0

        try:
            count = await self._redis_client.get(key)
            return int(count) if count else 0
        except Exception:
            return 0

    async def _record_message(self, user_id: UserID):
        """Record message for rate limiting"""
        if not self._redis_client:
            return

        try:
            current_time = int(time.time())
            hour_key = f"rate_limit:hour:{user_id}:{current_time // 3600}"
            minute_key = f"rate_limit:minute:{user_id}:{current_time // 60}"

            # Increment counters with appropriate TTL
            await self._increment_rate_counter(hour_key, 3600)  # 1 hour TTL
            await self._increment_rate_counter(minute_key, 60)   # 1 minute TTL

        except Exception as e:
            logger.error(f"Failed to record message: {e}")

    async def _increment_rate_counter(self, key: str, ttl: int):
        """Increment rate counter with TTL"""
        if not self._redis_client:
            return

        try:
            # Check if key exists
            current = await self._redis_client.get(key)
            if current:
                # Increment existing counter
                new_value = str(int(current) + 1)
                await self._redis_client.set(key, new_value, ttl)
            else:
                # Set initial counter
                await self._redis_client.set(key, "1", ttl)

        except Exception as e:
            logger.error(f"Failed to increment rate counter: {e}")

    async def _log_safety_incident(self, user_id: UserID, incident_type: str, reason: str):
        """Log safety incident for monitoring"""
        incident = {
            "timestamp": datetime.now().isoformat(),
            "user_id": user_id,
            "incident_type": incident_type,
            "reason": reason,
            "service": "safety_layer"
        }

        logger.warning(f"Safety incident: {incident}")

        # In a real implementation, this would store to database
        # For now, we just log it

    async def get_user_rate_status(self, user_id: UserID) -> ServiceResponse:
        """Get current rate limit status for user"""
        try:
            if not self.rate_limiting_enabled or not self._client_ready:
                return ServiceResponse(
                    success=True,
                    data={"rate_limiting_enabled": False},
                    service_name="safety_layer"
                )

            current_time = int(time.time())
            hour_key = f"rate_limit:hour:{user_id}:{current_time // 3600}"
            minute_key = f"rate_limit:minute:{user_id}:{current_time // 60}"

            hourly_count = await self._get_rate_count(hour_key)
            minute_count = await self._get_rate_count(minute_key)

            return ServiceResponse(
                success=True,
                data={
                    "user_id": user_id,
                    "hourly_usage": {
                        "count": hourly_count,
                        "limit": self.rate_limit_config.messages_per_hour,
                        "remaining": max(0, self.rate_limit_config.messages_per_hour - hourly_count)
                    },
                    "minute_usage": {
                        "count": minute_count,
                        "limit": self.rate_limit_config.messages_per_minute,
                        "remaining": max(0, self.rate_limit_config.messages_per_minute - minute_count)
                    }
                },
                service_name="safety_layer"
            )

        except Exception as e:
            logger.error(f"Failed to get rate status: {e}")
            raise SafetyLayerError(
                f"Rate status retrieval failed: {str(e)}",
                operation="get_user_rate_status",
                context={"user_id": user_id}
            )

    async def get_service_health(self) -> Dict[str, Any]:
        """Get service health status"""
        return {
            "service": "safety_layer",
            "content_filtering_enabled": self.content_filtering_enabled,
            "rate_limiting_enabled": self.rate_limiting_enabled,
            "redis_available": self._client_ready,
            "configuration": {
                "messages_per_hour": self.rate_limit_config.messages_per_hour,
                "messages_per_minute": self.rate_limit_config.messages_per_minute,
                "blocked_patterns": len(self.blocked_patterns),
                "allowed_topics": len(self.allowed_topics)
            }
        }


def create_safety_layer() -> SafetyLayer:
    """Factory function to create SafetyLayer instance"""
    return SafetyLayer()