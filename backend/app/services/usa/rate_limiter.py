"""
Rate Limiter for Universal Site Access

Simple in-memory rate limiting: 60 actions per minute per user.
"""

from collections import defaultdict
from datetime import datetime, timedelta
from typing import Dict, List
import logging

logger = logging.getLogger(__name__)


class RateLimitError(Exception):
    """Raised when rate limit is exceeded"""

    def __init__(self, retry_after: int):
        self.retry_after = retry_after
        super().__init__(f"Rate limited. Retry after {retry_after} seconds.")


class RateLimiter:
    """
    Simple in-memory rate limiter.

    Default: 60 actions per minute per user.
    Thread-safe for async usage.
    """

    def __init__(self, max_actions: int = 60, window_seconds: int = 60):
        self.max_actions = max_actions
        self.window = timedelta(seconds=window_seconds)
        self.user_actions: Dict[str, List[datetime]] = defaultdict(list)

    def check(self, user_id: str) -> None:
        """
        Check if user is within rate limit.

        Args:
            user_id: The user ID to check

        Raises:
            RateLimitError: If rate limit exceeded, includes retry_after seconds
        """
        now = datetime.utcnow()
        cutoff = now - self.window

        # Clean old entries and keep only recent ones
        recent = [t for t in self.user_actions[user_id] if t > cutoff]
        self.user_actions[user_id] = recent

        if len(recent) >= self.max_actions:
            # Calculate when the oldest action will expire
            oldest = min(recent)
            retry_after = int((oldest + self.window - now).total_seconds()) + 1
            logger.warning(f"Rate limit exceeded for user {user_id}, retry after {retry_after}s")
            raise RateLimitError(retry_after)

        # Record this action
        self.user_actions[user_id].append(now)
        logger.debug(f"User {user_id} action recorded, {len(recent) + 1}/{self.max_actions} in window")

    def reset(self, user_id: str) -> None:
        """Reset rate limit for a user (for testing)"""
        if user_id in self.user_actions:
            del self.user_actions[user_id]

    def get_remaining(self, user_id: str) -> int:
        """Get remaining actions for user in current window"""
        now = datetime.utcnow()
        cutoff = now - self.window
        recent = [t for t in self.user_actions[user_id] if t > cutoff]
        return max(0, self.max_actions - len(recent))


# Singleton instance
rate_limiter = RateLimiter()
