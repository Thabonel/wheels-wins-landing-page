"""
PAM 2.0 External Integrations
=============================

Clean integrations with external services:
- Google Gemini 1.5 Flash API
- Redis for caching and session management
- Future: Vector databases, other AI providers

Each integration is designed for:
- Clean interfaces
- Error handling
- Performance optimization
- Easy testing
"""

from .gemini import GeminiClient, create_gemini_client
from .redis import RedisClient, create_redis_client

__all__ = [
    "GeminiClient",
    "create_gemini_client",
    "RedisClient",
    "create_redis_client"
]