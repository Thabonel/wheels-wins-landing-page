
"""
Advanced Caching Service
Implements Redis-based caching with performance optimizations.
"""

import json
import pickle
import asyncio
from typing import Any, Optional, Union, Dict
from datetime import datetime, timedelta
import redis.asyncio as aioredis
from app.core.config import settings
from app.core.logging import setup_logging, get_logger

setup_logging()
logger = get_logger(__name__)

class CacheService:
    """High-performance caching service with Redis backend"""
    
    def __init__(self):
        self.redis: Optional[aioredis.Redis] = None
        self._connection_lock = asyncio.Lock()
        self.default_ttl = 300  # 5 minutes default TTL
    
    async def initialize(self):
        """Initialize Redis connection with optimized settings"""
        if self.redis:
            return
            
        async with self._connection_lock:
            if self.redis:
                return
                
            try:
                self.redis = await aioredis.from_url(
                    settings.REDIS_URL,
                    encoding="utf-8",
                    decode_responses=True,
                    max_connections=20,
                    retry_on_timeout=True,
                    health_check_interval=30
                )
                logger.info("Redis cache initialized successfully")
            except Exception as e:
                logger.error(f"Failed to initialize Redis cache: {e}")
                raise
    
    async def get(self, key: str, use_pickle: bool = False) -> Optional[Any]:
        """Get value from cache with optional pickle deserialization"""
        if not self.redis:
            await self.initialize()
        
        try:
            value = await self.redis.get(key)
            if value is None:
                return None
            
            if use_pickle:
                return pickle.loads(value.encode())
            else:
                return json.loads(value)
        except Exception as e:
            logger.warning(f"Cache get error for key {key}: {e}")
            return None
    
    async def set(self, key: str, value: Any, ttl: Optional[int] = None, use_pickle: bool = False):
        """Set value in cache with optional pickle serialization"""
        if not self.redis:
            await self.initialize()
        
        try:
            ttl = ttl or self.default_ttl
            
            if use_pickle:
                serialized_value = pickle.dumps(value).decode('latin-1')
            else:
                serialized_value = json.dumps(value, default=str)
            
            await self.redis.setex(key, ttl, serialized_value)
        except Exception as e:
            logger.warning(f"Cache set error for key {key}: {e}")
    
    async def delete(self, key: str):
        """Delete key from cache"""
        if not self.redis:
            await self.initialize()
        
        try:
            await self.redis.delete(key)
        except Exception as e:
            logger.warning(f"Cache delete error for key {key}: {e}")
    
    async def exists(self, key: str) -> bool:
        """Check if key exists in cache"""
        if not self.redis:
            await self.initialize()
        
        try:
            result = await self.redis.exists(key)
            return bool(result)
        except Exception as e:
            logger.warning(f"Cache exists error for key {key}: {e}")
            return False
    
    async def batch_get(self, keys: list) -> Dict[str, Any]:
        """Get multiple keys in batch for better performance"""
        if not self.redis:
            await self.initialize()
        
        try:
            values = await self.redis.mget(keys)
            result = {}
            for key, value in zip(keys, values):
                if value:
                    try:
                        result[key] = json.loads(value)
                    except json.JSONDecodeError:
                        result[key] = value
            return result
        except Exception as e:
            logger.warning(f"Cache batch_get error: {e}")
            return {}
    
    async def batch_set(self, data: Dict[str, Any], ttl: Optional[int] = None):
        """Set multiple keys in batch for better performance"""
        if not self.redis:
            await self.initialize()
        
        try:
            ttl = ttl or self.default_ttl
            pipe = self.redis.pipeline()
            
            for key, value in data.items():
                serialized_value = json.dumps(value, default=str)
                pipe.setex(key, ttl, serialized_value)
            
            await pipe.execute()
        except Exception as e:
            logger.warning(f"Cache batch_set error: {e}")
    
    async def close(self):
        """Close Redis connection"""
        if self.redis:
            await self.redis.close()
            self.redis = None

# Global cache instance
cache_service = CacheService()

async def get_cache() -> CacheService:
    """Get cache service instance"""
    if not cache_service.redis:
        await cache_service.initialize()
    return cache_service
