
import redis
import json
import hashlib
import functools
import asyncio
from typing import Any, Dict, List, Optional, Union, Callable, Set
from datetime import datetime, timedelta
from contextlib import asynccontextmanager
import logging
from app.core.config import settings

logger = logging.getLogger(__name__)

class CacheService:
    """Redis-based cache service with connection pooling and error handling."""
    
    _instance = None
    _lock = asyncio.Lock()
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance
    
    def __init__(self):
        if not hasattr(self, 'initialized'):
            self.redis_client = None
            self.connection_pool = None
            self.pubsub = None
            self.initialized = False
            
    async def initialize(self):
        """Initialize Redis connection with connection pooling."""
        if self.initialized:
            return
            
        try:
            # Create connection pool
            self.connection_pool = redis.ConnectionPool.from_url(
                settings.REDIS_URL,
                max_connections=20,
                retry_on_timeout=True,
                socket_keepalive=True,
                socket_keepalive_options={},
                health_check_interval=30
            )
            
            # Create Redis client
            self.redis_client = redis.Redis(
                connection_pool=self.connection_pool,
                decode_responses=True,
                socket_connect_timeout=5,
                socket_timeout=5
            )
            
            # Test connection
            await self._test_connection()
            
            # Initialize pub/sub
            self.pubsub = self.redis_client.pubsub()
            
            self.initialized = True
            logger.info("Cache service initialized successfully")
            
        except Exception as e:
            logger.error(f"Failed to initialize cache service: {e}")
            raise
    
    async def _test_connection(self):
        """Test Redis connection."""
        try:
            await asyncio.to_thread(self.redis_client.ping)
            logger.info("Redis connection successful")
        except Exception as e:
            logger.error(f"Redis connection failed: {e}")
            raise
    
    def generate_key(self, prefix: str, *args, **kwargs) -> str:
        """Generate cache key from prefix and arguments."""
        key_parts = [prefix]
        
        # Add positional arguments
        for arg in args:
            if isinstance(arg, (dict, list)):
                key_parts.append(hashlib.md5(json.dumps(arg, sort_keys=True).encode()).hexdigest())
            else:
                key_parts.append(str(arg))
        
        # Add keyword arguments
        if kwargs:
            sorted_kwargs = sorted(kwargs.items())
            kwargs_str = json.dumps(sorted_kwargs, sort_keys=True)
            key_parts.append(hashlib.md5(kwargs_str.encode()).hexdigest())
        
        return ":".join(key_parts)
    
    async def get(self, key: str) -> Optional[Any]:
        """Get value from cache."""
        try:
            value = await asyncio.to_thread(self.redis_client.get, key)
            if value is None:
                return None
            return json.loads(value)
        except Exception as e:
            logger.error(f"Cache get error for key {key}: {e}")
            return None
    
    async def set(self, key: str, value: Any, ttl: Optional[int] = None) -> bool:
        """Set value in cache with optional TTL."""
        try:
            serialized_value = json.dumps(value, default=str)
            if ttl:
                result = await asyncio.to_thread(
                    self.redis_client.setex, key, ttl, serialized_value
                )
            else:
                result = await asyncio.to_thread(
                    self.redis_client.set, key, serialized_value
                )
            return bool(result)
        except Exception as e:
            logger.error(f"Cache set error for key {key}: {e}")
            return False
    
    async def delete(self, key: str) -> bool:
        """Delete key from cache."""
        try:
            result = await asyncio.to_thread(self.redis_client.delete, key)
            return bool(result)
        except Exception as e:
            logger.error(f"Cache delete error for key {key}: {e}")
            return False
    
    async def delete_pattern(self, pattern: str) -> int:
        """Delete all keys matching pattern."""
        try:
            keys = await asyncio.to_thread(self.redis_client.keys, pattern)
            if keys:
                result = await asyncio.to_thread(self.redis_client.delete, *keys)
                return result
            return 0
        except Exception as e:
            logger.error(f"Cache delete pattern error for {pattern}: {e}")
            return 0
    
    async def exists(self, key: str) -> bool:
        """Check if key exists in cache."""
        try:
            result = await asyncio.to_thread(self.redis_client.exists, key)
            return bool(result)
        except Exception as e:
            logger.error(f"Cache exists error for key {key}: {e}")
            return False
    
    async def expire(self, key: str, ttl: int) -> bool:
        """Set TTL for existing key."""
        try:
            result = await asyncio.to_thread(self.redis_client.expire, key, ttl)
            return bool(result)
        except Exception as e:
            logger.error(f"Cache expire error for key {key}: {e}")
            return False
    
    async def increment(self, key: str, amount: int = 1) -> Optional[int]:
        """Increment counter."""
        try:
            result = await asyncio.to_thread(self.redis_client.incrby, key, amount)
            return result
        except Exception as e:
            logger.error(f"Cache increment error for key {key}: {e}")
            return None
    
    async def set_add(self, key: str, *values) -> int:
        """Add values to set."""
        try:
            result = await asyncio.to_thread(self.redis_client.sadd, key, *values)
            return result
        except Exception as e:
            logger.error(f"Cache set add error for key {key}: {e}")
            return 0
    
    async def set_members(self, key: str) -> Set[str]:
        """Get all members of set."""
        try:
            result = await asyncio.to_thread(self.redis_client.smembers, key)
            return result
        except Exception as e:
            logger.error(f"Cache set members error for key {key}: {e}")
            return set()
    
    async def hash_set(self, key: str, field: str, value: Any) -> bool:
        """Set hash field."""
        try:
            serialized_value = json.dumps(value, default=str)
            result = await asyncio.to_thread(
                self.redis_client.hset, key, field, serialized_value
            )
            return bool(result)
        except Exception as e:
            logger.error(f"Cache hash set error for key {key}, field {field}: {e}")
            return False
    
    async def hash_get(self, key: str, field: str) -> Optional[Any]:
        """Get hash field."""
        try:
            value = await asyncio.to_thread(self.redis_client.hget, key, field)
            if value is None:
                return None
            return json.loads(value)
        except Exception as e:
            logger.error(f"Cache hash get error for key {key}, field {field}: {e}")
            return None
    
    async def hash_get_all(self, key: str) -> Dict[str, Any]:
        """Get all hash fields."""
        try:
            result = await asyncio.to_thread(self.redis_client.hgetall, key)
            return {k: json.loads(v) for k, v in result.items()}
        except Exception as e:
            logger.error(f"Cache hash get all error for key {key}: {e}")
            return {}
    
    # Session Storage
    async def set_session(self, session_id: str, user_id: str, data: Dict[str, Any], ttl: int = 3600) -> bool:
        """Store session data."""
        session_key = self.generate_key("session", session_id)
        session_data = {
            "user_id": user_id,
            "created_at": datetime.utcnow().isoformat(),
            "data": data
        }
        return await self.set(session_key, session_data, ttl)
    
    async def get_session(self, session_id: str) -> Optional[Dict[str, Any]]:
        """Get session data."""
        session_key = self.generate_key("session", session_id)
        return await self.get(session_key)
    
    async def delete_session(self, session_id: str) -> bool:
        """Delete session."""
        session_key = self.generate_key("session", session_id)
        return await self.delete(session_key)
    
    async def delete_user_sessions(self, user_id: str) -> int:
        """Delete all sessions for a user."""
        pattern = self.generate_key("session", "*")
        return await self.delete_pattern(pattern)
    
    # Rate Limiting
    async def check_rate_limit(self, identifier: str, limit: int, window: int) -> Dict[str, Any]:
        """Check if rate limit is exceeded."""
        key = self.generate_key("rate_limit", identifier)
        
        try:
            current = await self.get(key)
            if current is None:
                await self.set(key, 1, window)
                return {
                    "allowed": True,
                    "count": 1,
                    "limit": limit,
                    "reset": datetime.utcnow() + timedelta(seconds=window)
                }
            
            if current >= limit:
                return {
                    "allowed": False,
                    "count": current,
                    "limit": limit,
                    "reset": datetime.utcnow() + timedelta(seconds=window)
                }
            
            new_count = await self.increment(key)
            return {
                "allowed": True,
                "count": new_count,
                "limit": limit,
                "reset": datetime.utcnow() + timedelta(seconds=window)
            }
            
        except Exception as e:
            logger.error(f"Rate limit check error for {identifier}: {e}")
            return {"allowed": True, "count": 0, "limit": limit}
    
    # Pub/Sub for WebSocket scaling
    async def publish(self, channel: str, message: Dict[str, Any]) -> bool:
        """Publish message to channel."""
        try:
            serialized_message = json.dumps(message, default=str)
            result = await asyncio.to_thread(
                self.redis_client.publish, channel, serialized_message
            )
            return bool(result)
        except Exception as e:
            logger.error(f"Publish error for channel {channel}: {e}")
            return False
    
    async def subscribe(self, *channels) -> None:
        """Subscribe to channels."""
        try:
            await asyncio.to_thread(self.pubsub.subscribe, *channels)
        except Exception as e:
            logger.error(f"Subscribe error: {e}")
    
    async def unsubscribe(self, *channels) -> None:
        """Unsubscribe from channels."""
        try:
            await asyncio.to_thread(self.pubsub.unsubscribe, *channels)
        except Exception as e:
            logger.error(f"Unsubscribe error: {e}")
    
    async def get_messages(self, timeout: Optional[float] = None) -> List[Dict[str, Any]]:
        """Get messages from subscribed channels."""
        try:
            messages = []
            message = await asyncio.to_thread(self.pubsub.get_message, timeout=timeout)
            if message and message['type'] == 'message':
                data = json.loads(message['data'])
                messages.append({
                    'channel': message['channel'],
                    'data': data
                })
            return messages
        except Exception as e:
            logger.error(f"Get messages error: {e}")
            return []
    
    # Cache Invalidation Patterns
    async def invalidate_user_cache(self, user_id: str) -> int:
        """Invalidate all cache entries for a user."""
        patterns = [
            f"user:{user_id}:*",
            f"pam:{user_id}:*",
            f"wheels:{user_id}:*",
            f"wins:{user_id}:*",
            f"social:{user_id}:*"
        ]
        
        total_deleted = 0
        for pattern in patterns:
            deleted = await self.delete_pattern(pattern)
            total_deleted += deleted
        
        return total_deleted
    
    async def invalidate_conversation_cache(self, user_id: str, conversation_id: str) -> int:
        """Invalidate cache for a specific conversation."""
        pattern = f"pam:{user_id}:conversation:{conversation_id}:*"
        return await self.delete_pattern(pattern)
    
    async def invalidate_trip_cache(self, user_id: str, trip_id: str) -> int:
        """Invalidate cache for a specific trip."""
        pattern = f"wheels:{user_id}:trip:{trip_id}:*"
        return await self.delete_pattern(pattern)
    
    async def health_check(self) -> Dict[str, Any]:
        """Check cache service health."""
        try:
            start_time = datetime.utcnow()
            
            # Test basic operations
            test_key = "health_check_test"
            await self.set(test_key, {"test": True}, 10)
            result = await self.get(test_key)
            await self.delete(test_key)
            
            end_time = datetime.utcnow()
            response_time = (end_time - start_time).total_seconds()
            
            return {
                "status": "healthy",
                "response_time_seconds": response_time,
                "redis_connected": True,
                "test_passed": result is not None
            }
            
        except Exception as e:
            return {
                "status": "unhealthy",
                "error": str(e),
                "redis_connected": False,
                "test_passed": False
            }
    
    async def close(self):
        """Close connections."""
        try:
            if self.pubsub:
                await asyncio.to_thread(self.pubsub.close)
            if self.connection_pool:
                await asyncio.to_thread(self.connection_pool.disconnect)
            logger.info("Cache service connections closed")
        except Exception as e:
            logger.error(f"Error closing cache service: {e}")


# Caching Decorators
def cache_result(ttl: int = 3600, key_prefix: str = "cache"):
    """Decorator to cache function results."""
    def decorator(func: Callable) -> Callable:
        @functools.wraps(func)
        async def wrapper(*args, **kwargs):
            cache = CacheService()
            if not cache.initialized:
                await cache.initialize()
            
            # Generate cache key
            cache_key = cache.generate_key(key_prefix, func.__name__, *args, **kwargs)
            
            # Try to get from cache
            cached_result = await cache.get(cache_key)
            if cached_result is not None:
                return cached_result
            
            # Execute function and cache result
            result = await func(*args, **kwargs)
            await cache.set(cache_key, result, ttl)
            
            return result
        return wrapper
    return decorator


def invalidate_cache(key_patterns: List[str]):
    """Decorator to invalidate cache patterns after function execution."""
    def decorator(func: Callable) -> Callable:
        @functools.wraps(func)
        async def wrapper(*args, **kwargs):
            result = await func(*args, **kwargs)
            
            cache = CacheService()
            if not cache.initialized:
                await cache.initialize()
            
            # Invalidate cache patterns
            for pattern in key_patterns:
                await cache.delete_pattern(pattern)
            
            return result
        return wrapper
    return decorator


# Global cache instance
cache_service = CacheService()


# Context manager for cache operations
@asynccontextmanager
async def get_cache():
    """Context manager for cache operations."""
    if not cache_service.initialized:
        await cache_service.initialize()
    try:
        yield cache_service
    except Exception as e:
        logger.error(f"Cache operation error: {e}")
        raise
