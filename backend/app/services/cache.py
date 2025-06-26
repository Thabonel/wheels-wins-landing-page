
"""
Cache Service
"""

from backend.app.services.cache_service import cache_service

# Re-export for backward compatibility
CacheService = cache_service.__class__

__all__ = ['cache_service', 'CacheService']
