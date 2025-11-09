"""
WebSocket Rate Limiting
Implements message-level rate limiting for WebSocket connections using Redis.

Limits:
- PAM WebSocket messages: 100 messages/minute per user
- Prevents abuse while allowing normal conversation flow

Date: November 9, 2025
"""

import time
import redis
import os
import logging
from typing import Tuple, Optional

logger = logging.getLogger(__name__)


class WebSocketRateLimiter:
    """Rate limiter for WebSocket messages using Redis sliding window"""

    def __init__(self, redis_url: Optional[str] = None, limit: int = 100, window: int = 60):
        """
        Initialize WebSocket rate limiter

        Args:
            redis_url: Redis connection URL
            limit: Maximum messages allowed per window
            window: Time window in seconds
        """
        self.limit = limit
        self.window = window

        # Initialize Redis connection
        redis_url = redis_url or os.getenv("REDIS_URL", "redis://localhost:6379")
        try:
            self.redis_client = redis.from_url(redis_url, decode_responses=True)
            # Test connection
            self.redis_client.ping()
            self.enabled = True
            logger.info(f"✅ WebSocket rate limiting enabled (Redis: {redis_url}, limit: {limit}/{window}s)")
        except Exception as e:
            logger.warning(f"⚠️ WebSocket rate limiting disabled - Redis unavailable: {e}")
            self.redis_client = None
            self.enabled = False

    async def check_rate_limit(self, user_id: str) -> Tuple[bool, dict]:
        """
        Check if user has exceeded message rate limit

        Args:
            user_id: User identifier

        Returns:
            Tuple of (is_allowed: bool, rate_limit_info: dict)

        Example:
            is_allowed, info = await limiter.check_rate_limit("user-uuid")
            if not is_allowed:
                await websocket.send_json({
                    "type": "error",
                    "message": "Rate limit exceeded",
                    "rate_limit": info
                })
        """
        if not self.enabled:
            return True, {}

        try:
            # Redis key for this user's WebSocket messages
            key = f"ws_rate_limit:{user_id}"
            current_time = time.time()
            window_start = current_time - self.window

            # Remove old entries (outside window)
            self.redis_client.zremrangebyscore(key, 0, window_start)

            # Count current messages in window
            current_count = self.redis_client.zcard(key)

            if current_count >= self.limit:
                # Rate limit exceeded
                # Get oldest entry to calculate reset time
                oldest_entries = self.redis_client.zrange(key, 0, 0, withscores=True)
                if oldest_entries:
                    oldest_time = oldest_entries[0][1]
                    reset_time = int(oldest_time + self.window)
                else:
                    reset_time = int(current_time + self.window)

                logger.warning(
                    f"⚠️ WebSocket rate limit exceeded for user {user_id}: "
                    f"{current_count}/{self.limit} messages in {self.window}s"
                )

                return False, {
                    "limit": self.limit,
                    "remaining": 0,
                    "reset": reset_time,
                    "retry_after": int(reset_time - current_time),
                    "window": self.window
                }

            # Allow message - add to sliding window
            self.redis_client.zadd(key, {str(current_time): current_time})

            # Set expiry on key (cleanup)
            self.redis_client.expire(key, self.window * 2)

            # Calculate remaining messages
            remaining = self.limit - (current_count + 1)

            return True, {
                "limit": self.limit,
                "remaining": remaining,
                "reset": int(current_time + self.window),
                "window": self.window
            }

        except Exception as e:
            logger.error(f"WebSocket rate limit check failed: {e}", exc_info=True)
            # On error, allow message to prevent false blocking
            return True, {}


# Global instance (lazy loaded)
_websocket_rate_limiter: Optional[WebSocketRateLimiter] = None


def get_websocket_rate_limiter() -> WebSocketRateLimiter:
    """
    Get or create WebSocket rate limiter singleton

    Returns:
        WebSocketRateLimiter instance
    """
    global _websocket_rate_limiter
    if _websocket_rate_limiter is None:
        _websocket_rate_limiter = WebSocketRateLimiter(
            limit=100,  # 100 messages per minute
            window=60    # 60 seconds
        )
    return _websocket_rate_limiter
