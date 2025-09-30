"""
PAM 2.0 Redis Integration
=========================

Clean Redis client for context caching and session management.
Optimized for PAM 2.0 context operations with error handling.
"""

import asyncio
import logging
from typing import Optional, Any, Set

from ..core.types import RedisConfig
from ..core.exceptions import RedisError

logger = logging.getLogger(__name__)

# Safe import of Redis
try:
    import aioredis
    REDIS_AVAILABLE = True
except ImportError:
    logger.warning("aioredis package not installed. Run: pip install aioredis")
    REDIS_AVAILABLE = False
    aioredis = None


class RedisClient:
    """Clean Redis client for PAM 2.0 context operations"""

    def __init__(self, config: RedisConfig):
        if not REDIS_AVAILABLE:
            raise RuntimeError("aioredis package not installed. Install with: pip install aioredis")

        self.config = config
        self.url = config.url
        self.max_connections = config.max_connections
        self.timeout = config.timeout_seconds
        self.default_ttl = config.default_ttl

        self._pool: Optional[aioredis.ConnectionPool] = None
        self._redis: Optional[aioredis.Redis] = None

        logger.info(f"RedisClient initialized with URL: {self.url}")

    async def initialize(self) -> bool:
        """Initialize Redis connection pool"""
        try:
            self._pool = aioredis.ConnectionPool.from_url(
                self.url,
                max_connections=self.max_connections,
                socket_timeout=self.timeout,
                socket_connect_timeout=self.timeout
            )
            self._redis = aioredis.Redis(connection_pool=self._pool)

            # Test connection
            await self._redis.ping()
            logger.info("Redis connection established successfully")
            return True

        except Exception as e:
            logger.error(f"Failed to initialize Redis: {e}")
            raise RedisError(f"Redis initialization failed: {e}", original_error=e)

    async def set(self, key: str, value: str, ttl: Optional[int] = None) -> bool:
        """Set a key-value pair with optional TTL"""
        if not self._redis:
            raise RedisError("Redis not initialized", operation="set")

        try:
            expire_time = ttl or self.default_ttl
            result = await self._redis.setex(key, expire_time, value)
            return bool(result)
        except Exception as e:
            logger.error(f"Redis SET failed: {e}")
            raise RedisError(f"SET operation failed: {e}", operation="set", context={"key": key})

    async def get(self, key: str) -> Optional[str]:
        """Get value by key"""
        if not self._redis:
            raise RedisError("Redis not initialized", operation="get")

        try:
            result = await self._redis.get(key)
            return result.decode('utf-8') if result else None
        except Exception as e:
            logger.error(f"Redis GET failed: {e}")
            raise RedisError(f"GET operation failed: {e}", operation="get", context={"key": key})

    async def delete(self, key: str) -> bool:
        """Delete a key"""
        if not self._redis:
            raise RedisError("Redis not initialized", operation="delete")

        try:
            result = await self._redis.delete(key)
            return bool(result)
        except Exception as e:
            logger.error(f"Redis DELETE failed: {e}")
            raise RedisError(f"DELETE operation failed: {e}", operation="delete", context={"key": key})

    async def expire(self, key: str, ttl: int) -> bool:
        """Set TTL for existing key"""
        if not self._redis:
            raise RedisError("Redis not initialized", operation="expire")

        try:
            result = await self._redis.expire(key, ttl)
            return bool(result)
        except Exception as e:
            logger.error(f"Redis EXPIRE failed: {e}")
            raise RedisError(f"EXPIRE operation failed: {e}", operation="expire", context={"key": key, "ttl": ttl})

    async def sadd(self, key: str, value: str) -> bool:
        """Add value to set"""
        if not self._redis:
            raise RedisError("Redis not initialized", operation="sadd")

        try:
            result = await self._redis.sadd(key, value)
            return bool(result)
        except Exception as e:
            logger.error(f"Redis SADD failed: {e}")
            raise RedisError(f"SADD operation failed: {e}", operation="sadd", context={"key": key})

    async def smembers(self, key: str) -> Set[str]:
        """Get all members of a set"""
        if not self._redis:
            raise RedisError("Redis not initialized", operation="smembers")

        try:
            result = await self._redis.smembers(key)
            return {member.decode('utf-8') for member in result}
        except Exception as e:
            logger.error(f"Redis SMEMBERS failed: {e}")
            raise RedisError(f"SMEMBERS operation failed: {e}", operation="smembers", context={"key": key})

    async def health_check(self) -> bool:
        """Check Redis connection health"""
        if not self._redis:
            return False

        try:
            result = await self._redis.ping()
            return bool(result)
        except Exception:
            return False

    async def cleanup(self):
        """Clean up Redis connections"""
        if self._redis:
            await self._redis.close()
        if self._pool:
            await self._pool.disconnect()


def create_redis_client(config: RedisConfig) -> RedisClient:
    """Factory function to create RedisClient instance"""
    return RedisClient(config)