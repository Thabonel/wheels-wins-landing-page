
"""
Cache Service
"""

# Re-export CacheService and underlying aioredis for mocking
from app.services.cache_service import cache_service
import aioredis

# Re-exports for backward compatibility
CacheService = cache_service.__class__

__all__ = ['cache_service', 'CacheService']
