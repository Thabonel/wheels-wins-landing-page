"""
Comprehensive Response Caching Manager for PAM API
Provides intelligent caching with Redis for optimized performance
"""

import hashlib
import json
import asyncio
import time
from typing import Optional, Dict, Any, List, Union, Callable
from datetime import timedelta, datetime
from enum import Enum
from dataclasses import dataclass, asdict
import redis.asyncio as redis
from contextlib import asynccontextmanager
import pickle
import zlib

from app.core.config import get_settings
from app.core.logging import get_logger

settings = get_settings()
logger = get_logger(__name__)


class CacheStrategy(Enum):
    """Cache invalidation strategies"""
    TTL = "ttl"  # Time-to-live based
    LRU = "lru"  # Least recently used
    LFU = "lfu"  # Least frequently used
    SLIDING = "sliding"  # Sliding window expiration
    INTELLIGENT = "intelligent"  # AI-based intelligent caching


class CacheLevel(Enum):
    """Cache levels for different response types"""
    L1_MEMORY = "memory"  # In-memory cache (fastest)
    L2_REDIS = "redis"    # Redis cache (distributed)
    L3_DATABASE = "database"  # Database cache (persistent)


@dataclass
class CacheMetadata:
    """Metadata for cached items"""
    key: str
    created_at: datetime
    accessed_at: datetime
    access_count: int
    ttl_seconds: int
    size_bytes: int
    user_id: str
    message_hash: str
    response_type: str
    cache_strategy: CacheStrategy
    compression_enabled: bool = False
    
    def to_dict(self) -> Dict[str, Any]:
        data = asdict(self)
        data['created_at'] = self.created_at.isoformat()
        data['accessed_at'] = self.accessed_at.isoformat()
        data['cache_strategy'] = self.cache_strategy.value
        return data


class CacheManager:
    """
    Advanced Cache Manager with multi-level caching and intelligent strategies
    
    Features:
    - Multi-level caching (Memory, Redis, Database)
    - Intelligent cache key generation
    - Multiple invalidation strategies
    - Compression for large responses
    - Cache warming and preloading
    - Analytics and monitoring
    - Distributed cache synchronization
    """
    
    def __init__(self, 
                 redis_url: Optional[str] = None,
                 default_ttl: int = 300,  # 5 minutes
                 max_memory_items: int = 1000,
                 enable_compression: bool = True,
                 compression_threshold: int = 1024):  # Compress if > 1KB
        self.redis_url = redis_url or settings.REDIS_URL
        self.default_ttl = default_ttl
        self.max_memory_items = max_memory_items
        self.enable_compression = enable_compression
        self.compression_threshold = compression_threshold
        
        # In-memory L1 cache
        self.memory_cache: Dict[str, Any] = {}
        self.memory_metadata: Dict[str, CacheMetadata] = {}
        
        # Redis connection pool
        self._redis_pool = None
        self._redis_client = None
        
        # Cache statistics
        self.stats = {
            "hits": 0,
            "misses": 0,
            "memory_hits": 0,
            "redis_hits": 0,
            "total_requests": 0,
            "cache_size_bytes": 0,
            "evictions": 0,
            "compression_ratio": 0.0
        }
    
    async def initialize(self):
        """Initialize Redis connection"""
        try:
            self._redis_pool = redis.ConnectionPool.from_url(
                self.redis_url,
                decode_responses=False,  # We'll handle encoding ourselves
                max_connections=50
            )
            self._redis_client = redis.Redis(connection_pool=self._redis_pool)
            
            # Test connection
            await self._redis_client.ping()
            logger.info("Cache Manager: Redis connection established")
            
            # Start background tasks
            asyncio.create_task(self._memory_cache_cleanup())
            asyncio.create_task(self._cache_analytics_reporter())
            
        except Exception as e:
            logger.error(f"Cache Manager: Failed to connect to Redis: {str(e)}")
            # Fall back to memory-only caching
            self._redis_client = None
    
    async def close(self):
        """Close Redis connection"""
        if self._redis_client:
            await self._redis_client.close()
            await self._redis_pool.disconnect()
    
    def generate_cache_key(self, 
                          message: str, 
                          user_id: str,
                          context: Optional[Dict[str, Any]] = None,
                          prefix: str = "pam:response") -> str:
        """Generate intelligent cache key based on message and context"""
        # Create a deterministic key from message and important context
        key_components = [
            user_id,
            message.lower().strip(),  # Normalize message
        ]
        
        # Add relevant context to key (if provided)
        if context:
            # Only include relevant context that affects response
            relevant_context = {
                "location": context.get("location"),
                "vehicle_type": context.get("vehicle_type"),
                "travel_style": context.get("travel_style"),
                "preferences": context.get("preferences")
            }
            # Remove None values and sort for consistency
            relevant_context = {k: v for k, v in relevant_context.items() if v is not None}
            if relevant_context:
                key_components.append(json.dumps(relevant_context, sort_keys=True))
        
        # Generate hash
        content = ":".join(key_components)
        hash_key = hashlib.sha256(content.encode()).hexdigest()[:16]
        
        return f"{prefix}:{hash_key}"
    
    async def get(self, 
                  message: str, 
                  user_id: str,
                  context: Optional[Dict[str, Any]] = None,
                  cache_level: CacheLevel = CacheLevel.L2_REDIS) -> Optional[Dict[str, Any]]:
        """Get cached response with multi-level lookup"""
        key = self.generate_cache_key(message, user_id, context)
        self.stats["total_requests"] += 1
        
        # L1: Check memory cache first
        if key in self.memory_cache:
            self.stats["hits"] += 1
            self.stats["memory_hits"] += 1
            await self._update_access_metadata(key, CacheLevel.L1_MEMORY)
            logger.debug(f"Cache hit (memory): {key}")
            return self.memory_cache[key]
        
        # L2: Check Redis cache
        if self._redis_client and cache_level != CacheLevel.L1_MEMORY:
            try:
                cached_data = await self._redis_client.get(key)
                if cached_data:
                    # Decompress if needed
                    response = await self._deserialize_response(cached_data)
                    
                    if response:
                        self.stats["hits"] += 1
                        self.stats["redis_hits"] += 1
                        
                        # Promote to memory cache
                        await self._promote_to_memory(key, response)
                        
                        await self._update_access_metadata(key, CacheLevel.L2_REDIS)
                        logger.debug(f"Cache hit (Redis): {key}")
                        return response
                        
            except Exception as e:
                logger.error(f"Redis get error: {str(e)}")
        
        self.stats["misses"] += 1
        logger.debug(f"Cache miss: {key}")
        return None
    
    async def set(self,
                  message: str,
                  user_id: str,
                  response: Dict[str, Any],
                  context: Optional[Dict[str, Any]] = None,
                  ttl: Optional[int] = None,
                  cache_strategy: CacheStrategy = CacheStrategy.TTL) -> bool:
        """Set cached response with intelligent strategy"""
        key = self.generate_cache_key(message, user_id, context)
        ttl = ttl or self.default_ttl
        
        try:
            # Serialize and potentially compress
            serialized_data = await self._serialize_response(response)
            size_bytes = len(serialized_data)
            
            # Create metadata
            metadata = CacheMetadata(
                key=key,
                created_at=datetime.utcnow(),
                accessed_at=datetime.utcnow(),
                access_count=1,
                ttl_seconds=ttl,
                size_bytes=size_bytes,
                user_id=user_id,
                message_hash=hashlib.md5(message.encode()).hexdigest(),
                response_type=response.get("type", "unknown"),
                cache_strategy=cache_strategy,
                compression_enabled=self.enable_compression and size_bytes > self.compression_threshold
            )
            
            # L1: Store in memory cache (with eviction if needed)
            await self._add_to_memory_cache(key, response, metadata)
            
            # L2: Store in Redis
            if self._redis_client:
                try:
                    # Set with expiration
                    await self._redis_client.setex(
                        key,
                        ttl,
                        serialized_data
                    )
                    
                    # Store metadata separately
                    metadata_key = f"{key}:metadata"
                    await self._redis_client.setex(
                        metadata_key,
                        ttl,
                        json.dumps(metadata.to_dict()).encode()
                    )
                    
                    # Update cache size stats
                    self.stats["cache_size_bytes"] += size_bytes
                    
                    logger.debug(f"Cached response: {key} (TTL: {ttl}s, Size: {size_bytes} bytes)")
                    return True
                    
                except Exception as e:
                    logger.error(f"Redis set error: {str(e)}")
                    
            return True  # At least stored in memory
            
        except Exception as e:
            logger.error(f"Cache set error: {str(e)}")
            return False
    
    async def invalidate(self, 
                        pattern: Optional[str] = None,
                        user_id: Optional[str] = None,
                        message_pattern: Optional[str] = None) -> int:
        """Invalidate cached entries based on pattern"""
        invalidated_count = 0
        
        # Build pattern for matching
        if pattern:
            cache_pattern = pattern
        elif user_id:
            cache_pattern = f"pam:response:*{user_id}*"
        elif message_pattern:
            cache_pattern = f"pam:response:*{message_pattern}*"
        else:
            cache_pattern = "pam:response:*"
        
        # Clear from memory cache
        keys_to_remove = []
        for key in self.memory_cache.keys():
            if self._matches_pattern(key, cache_pattern):
                keys_to_remove.append(key)
        
        for key in keys_to_remove:
            del self.memory_cache[key]
            if key in self.memory_metadata:
                del self.memory_metadata[key]
            invalidated_count += 1
        
        # Clear from Redis
        if self._redis_client:
            try:
                cursor = 0
                while True:
                    cursor, keys = await self._redis_client.scan(
                        cursor,
                        match=cache_pattern,
                        count=100
                    )
                    
                    if keys:
                        await self._redis_client.delete(*keys)
                        invalidated_count += len(keys)
                    
                    if cursor == 0:
                        break
                        
            except Exception as e:
                logger.error(f"Redis invalidation error: {str(e)}")
        
        logger.info(f"Invalidated {invalidated_count} cache entries with pattern: {cache_pattern}")
        return invalidated_count
    
    async def warm_cache(self, common_queries: List[Dict[str, Any]]) -> int:
        """Pre-warm cache with common queries"""
        warmed_count = 0
        
        for query in common_queries:
            try:
                # Check if already cached
                existing = await self.get(
                    query["message"],
                    query["user_id"],
                    query.get("context")
                )
                
                if not existing and "response" in query:
                    # Cache the response
                    await self.set(
                        query["message"],
                        query["user_id"],
                        query["response"],
                        query.get("context"),
                        ttl=query.get("ttl", self.default_ttl)
                    )
                    warmed_count += 1
                    
            except Exception as e:
                logger.error(f"Cache warming error: {str(e)}")
        
        logger.info(f"Pre-warmed {warmed_count} cache entries")
        return warmed_count
    
    def get_statistics(self) -> Dict[str, Any]:
        """Get cache statistics and analytics"""
        hit_rate = (self.stats["hits"] / self.stats["total_requests"] * 100) if self.stats["total_requests"] > 0 else 0
        memory_hit_rate = (self.stats["memory_hits"] / self.stats["hits"] * 100) if self.stats["hits"] > 0 else 0
        
        return {
            "performance": {
                "hit_rate": f"{hit_rate:.2f}%",
                "memory_hit_rate": f"{memory_hit_rate:.2f}%",
                "total_requests": self.stats["total_requests"],
                "hits": self.stats["hits"],
                "misses": self.stats["misses"]
            },
            "cache_levels": {
                "memory_items": len(self.memory_cache),
                "memory_size_bytes": sum(len(str(v)) for v in self.memory_cache.values()),
                "redis_connected": self._redis_client is not None
            },
            "efficiency": {
                "evictions": self.stats["evictions"],
                "compression_ratio": self.stats.get("compression_ratio", 0.0),
                "avg_response_size": self.stats["cache_size_bytes"] / max(len(self.memory_cache), 1)
            },
            "memory_cache_items": len(self.memory_cache),
            "max_memory_items": self.max_memory_items
        }
    
    async def clear_all(self) -> bool:
        """Clear all cached data"""
        try:
            # Clear memory cache
            self.memory_cache.clear()
            self.memory_metadata.clear()
            
            # Clear Redis
            if self._redis_client:
                await self._redis_client.flushdb()
            
            # Reset statistics
            self.stats = {
                "hits": 0,
                "misses": 0,
                "memory_hits": 0,
                "redis_hits": 0,
                "total_requests": 0,
                "cache_size_bytes": 0,
                "evictions": 0,
                "compression_ratio": 0.0
            }
            
            logger.info("Cache cleared successfully")
            return True
            
        except Exception as e:
            logger.error(f"Cache clear error: {str(e)}")
            return False
    
    # Private helper methods
    
    async def _serialize_response(self, response: Dict[str, Any]) -> bytes:
        """Serialize and optionally compress response"""
        try:
            # Convert to JSON string
            json_data = json.dumps(response, default=str)
            data = json_data.encode('utf-8')
            
            # Compress if enabled and above threshold
            if self.enable_compression and len(data) > self.compression_threshold:
                compressed_data = zlib.compress(data, level=6)
                compression_ratio = len(compressed_data) / len(data)
                
                # Only use compression if it actually saves space
                if compression_ratio < 0.9:
                    self.stats["compression_ratio"] = compression_ratio
                    return b'COMPRESSED:' + compressed_data
            
            return data
            
        except Exception as e:
            logger.error(f"Serialization error: {str(e)}")
            # Fall back to pickle
            return pickle.dumps(response)
    
    async def _deserialize_response(self, data: bytes) -> Optional[Dict[str, Any]]:
        """Deserialize and optionally decompress response"""
        try:
            # Check if compressed
            if data.startswith(b'COMPRESSED:'):
                decompressed_data = zlib.decompress(data[11:])
                json_str = decompressed_data.decode('utf-8')
                return json.loads(json_str)
            
            # Try JSON first
            try:
                json_str = data.decode('utf-8')
                return json.loads(json_str)
            except (UnicodeDecodeError, json.JSONDecodeError):
                # Fall back to pickle
                return pickle.loads(data)
                
        except Exception as e:
            logger.error(f"Deserialization error: {str(e)}")
            return None
    
    async def _add_to_memory_cache(self, key: str, response: Dict[str, Any], metadata: CacheMetadata):
        """Add item to memory cache with LRU eviction"""
        # Check if we need to evict
        if len(self.memory_cache) >= self.max_memory_items:
            await self._evict_from_memory()
        
        self.memory_cache[key] = response
        self.memory_metadata[key] = metadata
    
    async def _evict_from_memory(self):
        """Evict least recently used item from memory cache"""
        if not self.memory_metadata:
            return
        
        # Find LRU item
        lru_key = min(
            self.memory_metadata.keys(),
            key=lambda k: self.memory_metadata[k].accessed_at
        )
        
        # Remove from cache
        if lru_key in self.memory_cache:
            del self.memory_cache[lru_key]
        if lru_key in self.memory_metadata:
            del self.memory_metadata[lru_key]
        
        self.stats["evictions"] += 1
        logger.debug(f"Evicted from memory cache: {lru_key}")
    
    async def _promote_to_memory(self, key: str, response: Dict[str, Any]):
        """Promote item from Redis to memory cache"""
        # Create basic metadata
        metadata = CacheMetadata(
            key=key,
            created_at=datetime.utcnow(),
            accessed_at=datetime.utcnow(),
            access_count=1,
            ttl_seconds=self.default_ttl,
            size_bytes=len(json.dumps(response, default=str)),
            user_id="unknown",
            message_hash="",
            response_type=response.get("type", "unknown"),
            cache_strategy=CacheStrategy.TTL
        )
        
        await self._add_to_memory_cache(key, response, metadata)
    
    async def _update_access_metadata(self, key: str, level: CacheLevel):
        """Update access metadata for cache entry"""
        if level == CacheLevel.L1_MEMORY and key in self.memory_metadata:
            self.memory_metadata[key].accessed_at = datetime.utcnow()
            self.memory_metadata[key].access_count += 1
        
        elif level == CacheLevel.L2_REDIS and self._redis_client:
            try:
                metadata_key = f"{key}:metadata"
                metadata_data = await self._redis_client.get(metadata_key)
                if metadata_data:
                    metadata = json.loads(metadata_data.decode())
                    metadata["accessed_at"] = datetime.utcnow().isoformat()
                    metadata["access_count"] = metadata.get("access_count", 0) + 1
                    
                    # Update in Redis
                    ttl = await self._redis_client.ttl(key)
                    if ttl > 0:
                        await self._redis_client.setex(
                            metadata_key,
                            ttl,
                            json.dumps(metadata).encode()
                        )
            except Exception as e:
                logger.debug(f"Metadata update error: {str(e)}")
    
    def _matches_pattern(self, key: str, pattern: str) -> bool:
        """Check if key matches pattern (simple wildcard matching)"""
        import fnmatch
        return fnmatch.fnmatch(key, pattern)
    
    async def _memory_cache_cleanup(self):
        """Background task to clean up expired memory cache entries"""
        while True:
            try:
                await asyncio.sleep(60)  # Run every minute
                
                current_time = datetime.utcnow()
                keys_to_remove = []
                
                for key, metadata in self.memory_metadata.items():
                    # Check if expired based on TTL
                    age_seconds = (current_time - metadata.created_at).total_seconds()
                    if age_seconds > metadata.ttl_seconds:
                        keys_to_remove.append(key)
                
                for key in keys_to_remove:
                    if key in self.memory_cache:
                        del self.memory_cache[key]
                    if key in self.memory_metadata:
                        del self.memory_metadata[key]
                
                if keys_to_remove:
                    logger.debug(f"Cleaned up {len(keys_to_remove)} expired memory cache entries")
                    
            except Exception as e:
                logger.error(f"Memory cache cleanup error: {str(e)}")
    
    async def _cache_analytics_reporter(self):
        """Background task to report cache analytics"""
        while True:
            try:
                await asyncio.sleep(300)  # Report every 5 minutes
                
                stats = self.get_statistics()
                logger.info(f"Cache Analytics: {stats}")
                
                # Log to monitoring system if configured
                from app.core.logging_config import pam_logger
                pam_logger.log_performance_alert(
                    metric="cache_hit_rate",
                    current_value=float(stats["performance"]["hit_rate"].rstrip('%')),
                    threshold=80.0  # Alert if hit rate drops below 80%
                )
                
            except Exception as e:
                logger.error(f"Cache analytics reporter error: {str(e)}")


# Context manager for cache operations
@asynccontextmanager
async def cache_context():
    """Context manager for cache operations with automatic cleanup"""
    cache = CacheManager()
    await cache.initialize()
    try:
        yield cache
    finally:
        await cache.close()


# Global cache instance (singleton)
_cache_manager_instance = None

async def get_cache_manager() -> CacheManager:
    """Get or create global cache manager instance"""
    global _cache_manager_instance
    
    if _cache_manager_instance is None:
        _cache_manager_instance = CacheManager()
        await _cache_manager_instance.initialize()
    
    return _cache_manager_instance


# Decorator for automatic caching
def cached(ttl: int = 300, 
          cache_strategy: CacheStrategy = CacheStrategy.TTL,
          key_prefix: str = "pam:response"):
    """Decorator for automatic response caching"""
    def decorator(func: Callable):
        async def wrapper(*args, **kwargs):
            # Extract message and user_id from args/kwargs
            message = kwargs.get("message") or (args[1] if len(args) > 1 else None)
            user_id = kwargs.get("user_id") or (args[2] if len(args) > 2 else None)
            
            if not message or not user_id:
                # Can't cache without key components
                return await func(*args, **kwargs)
            
            cache = await get_cache_manager()
            
            # Check cache
            cached_response = await cache.get(message, user_id)
            if cached_response:
                logger.debug(f"Cache hit for decorated function: {func.__name__}")
                return cached_response
            
            # Call original function
            response = await func(*args, **kwargs)
            
            # Cache the response
            if response:
                await cache.set(
                    message, 
                    user_id, 
                    response, 
                    ttl=ttl,
                    cache_strategy=cache_strategy
                )
            
            return response
        
        return wrapper
    return decorator


# Export main components
__all__ = [
    'CacheManager',
    'CacheStrategy',
    'CacheLevel',
    'CacheMetadata',
    'get_cache_manager',
    'cache_context',
    'cached'
]