"""
TTS Redis-based Optimization for Multi-Server Deployment
Uses existing Redis infrastructure for distributed caching and rate limiting
"""

import redis.asyncio as redis
import hashlib
import json
import zlib
import base64
from typing import Optional, Dict, Any, List
from datetime import datetime, timedelta
import asyncio
import logging
from dataclasses import dataclass, asdict

from app.core.config import get_settings
from .base import VoiceSettings, TTSResponse

logger = logging.getLogger(__name__)

# ============================================================================
# REDIS-BASED TTS CACHE
# ============================================================================

class RedisTTSCache:
    """
    Distributed TTS cache using Redis
    Supports multi-server deployments with shared cache
    """
    
    def __init__(self, redis_url: str = None, ttl_seconds: int = 3600):
        """
        Initialize Redis TTS cache
        
        Args:
            redis_url: Redis connection URL (uses settings if not provided)
            ttl_seconds: Time-to-live for cached items (default 1 hour)
        """
        self.redis_url = redis_url or get_settings().REDIS_URL
        self.ttl_seconds = ttl_seconds
        self.redis_client = None
        self.compression_enabled = True
        self.stats_key = "tts:stats"
        
        logger.info(f"🔴 Redis TTS Cache initialized with TTL={ttl_seconds}s")
    
    async def connect(self):
        """Connect to Redis"""
        if not self.redis_client:
            self.redis_client = redis.from_url(
                self.redis_url,
                encoding=None,  # Binary data for audio
                decode_responses=False,
                max_connections=10,
                socket_keepalive=True,
                socket_keepalive_options={
                    1: 1,  # TCP_KEEPIDLE
                    2: 1,  # TCP_KEEPINTVL
                    3: 5,  # TCP_KEEPCNT
                }
            )
            # Test connection
            await self.redis_client.ping()
            logger.info("✅ Connected to Redis for TTS caching")
    
    async def _ensure_connected(self):
        """Ensure Redis connection is active"""
        if not self.redis_client:
            await self.connect()
    
    def _generate_cache_key(
        self, 
        text: str, 
        voice: str = "en-US-AriaNeural", 
        speed: float = 1.0
    ) -> str:
        """Generate unique cache key for TTS parameters"""
        # Normalize text
        normalized_text = text.lower().strip()[:500]  # Limit text length
        key_data = f"{normalized_text}|{voice}|{speed}"
        hash_key = hashlib.sha256(key_data.encode()).hexdigest()[:16]
        return f"tts:audio:{hash_key}"
    
    def _compress_audio(self, audio_data: bytes) -> bytes:
        """Compress audio data using zlib"""
        if self.compression_enabled:
            try:
                compressed = zlib.compress(audio_data, level=6)
                if len(compressed) < len(audio_data):
                    return compressed
            except Exception as e:
                logger.warning(f"Compression failed: {e}")
        return audio_data
    
    def _decompress_audio(self, data: bytes) -> bytes:
        """Decompress audio data"""
        if self.compression_enabled:
            try:
                # Check if data is compressed (zlib magic number)
                if data[:2] == b'\x78\x9c':
                    return zlib.decompress(data)
            except Exception as e:
                logger.warning(f"Decompression failed: {e}")
        return data
    
    async def get(
        self,
        text: str,
        voice: str = "en-US-AriaNeural",
        speed: float = 1.0
    ) -> Optional[Dict[str, Any]]:
        """
        Get cached TTS audio from Redis
        
        Returns:
            Dict with audio data and metadata, or None if not cached
        """
        await self._ensure_connected()
        
        cache_key = self._generate_cache_key(text, voice, speed)
        
        try:
            # Get cached data
            cached_data = await self.redis_client.get(cache_key)
            
            if cached_data:
                # Increment hit counter
                await self.redis_client.hincrby(self.stats_key, "hits", 1)
                
                # Parse cached data
                # Format: [4 bytes metadata length][metadata JSON][audio data]
                metadata_len = int.from_bytes(cached_data[:4], 'big')
                metadata_json = cached_data[4:4+metadata_len]
                audio_data = cached_data[4+metadata_len:]
                
                metadata = json.loads(metadata_json)
                
                # Decompress audio
                audio_data = self._decompress_audio(audio_data)
                
                # Convert to base64 for transport
                audio_base64 = base64.b64encode(audio_data).decode('utf-8')
                
                # Update access time
                await self.redis_client.expire(cache_key, self.ttl_seconds)
                
                logger.debug(f"✅ Redis cache HIT for TTS (key: {cache_key})")
                
                return {
                    'audio_data': audio_base64,
                    'format': metadata['format'],
                    'voice_used': metadata['voice'],
                    'engine_used': metadata['engine'],
                    'duration': metadata.get('duration'),
                    'from_cache': True,
                    'cache_key': cache_key
                }
            else:
                # Increment miss counter
                await self.redis_client.hincrby(self.stats_key, "misses", 1)
                logger.debug(f"❌ Redis cache MISS for TTS (key: {cache_key})")
                return None
                
        except Exception as e:
            logger.error(f"Redis cache get error: {e}")
            return None
    
    async def set(
        self,
        text: str,
        voice: str,
        speed: float,
        audio_data: bytes,
        format: str,
        engine: str,
        duration: Optional[float] = None
    ):
        """Store TTS audio in Redis cache"""
        await self._ensure_connected()
        
        cache_key = self._generate_cache_key(text, voice, speed)
        
        try:
            # Prepare metadata
            metadata = {
                'voice': voice,
                'speed': speed,
                'format': format,
                'engine': engine,
                'duration': duration,
                'cached_at': datetime.utcnow().isoformat(),
                'text_hash': hashlib.md5(text.encode()).hexdigest()
            }
            
            metadata_json = json.dumps(metadata).encode()
            
            # Compress audio
            compressed_audio = self._compress_audio(audio_data)
            
            # Create cached data format
            # [4 bytes metadata length][metadata JSON][compressed audio data]
            metadata_len = len(metadata_json).to_bytes(4, 'big')
            cached_data = metadata_len + metadata_json + compressed_audio
            
            # Store in Redis with TTL
            await self.redis_client.setex(cache_key, self.ttl_seconds, cached_data)
            
            # Update stats
            await self.redis_client.hincrby(self.stats_key, "total_cached", 1)
            
            compression_ratio = (1 - len(compressed_audio) / len(audio_data)) * 100
            logger.debug(
                f"💾 Cached TTS in Redis (key: {cache_key}, "
                f"size: {len(cached_data)} bytes, compression: {compression_ratio:.1f}%)"
            )
            
        except Exception as e:
            logger.error(f"Redis cache set error: {e}")
    
    async def get_stats(self) -> Dict[str, Any]:
        """Get cache statistics from Redis"""
        await self._ensure_connected()
        
        try:
            stats = await self.redis_client.hgetall(self.stats_key)
            
            # Convert bytes to integers
            hits = int(stats.get(b'hits', 0))
            misses = int(stats.get(b'misses', 0))
            total_cached = int(stats.get(b'total_cached', 0))
            
            total_requests = hits + misses
            hit_rate = (hits / total_requests * 100) if total_requests > 0 else 0
            
            # Get cache size
            cache_keys = await self.redis_client.keys("tts:audio:*")
            cache_size = len(cache_keys)
            
            # Get Redis memory info
            info = await self.redis_client.info("memory")
            memory_used_mb = info.get('used_memory', 0) / 1024 / 1024
            
            return {
                'hits': hits,
                'misses': misses,
                'hit_rate': f"{hit_rate:.1f}%",
                'total_requests': total_requests,
                'total_cached': total_cached,
                'current_cache_size': cache_size,
                'memory_used_mb': round(memory_used_mb, 2),
                'ttl_seconds': self.ttl_seconds
            }
            
        except Exception as e:
            logger.error(f"Failed to get cache stats: {e}")
            return {}
    
    async def clear(self, pattern: str = "tts:audio:*"):
        """Clear TTS cache entries"""
        await self._ensure_connected()
        
        try:
            keys = await self.redis_client.keys(pattern)
            if keys:
                await self.redis_client.delete(*keys)
                logger.info(f"🧹 Cleared {len(keys)} TTS cache entries")
        except Exception as e:
            logger.error(f"Failed to clear cache: {e}")
    
    async def close(self):
        """Close Redis connection"""
        if self.redis_client:
            await self.redis_client.close()
            self.redis_client = None

# ============================================================================
# REDIS-BASED RATE LIMITER
# ============================================================================

class RedisRateLimiter:
    """
    Distributed rate limiter using Redis
    Supports sliding window algorithm for accurate rate limiting
    """
    
    def __init__(
        self,
        redis_url: str = None,
        requests_per_minute: int = 30,
        requests_per_hour: int = 500
    ):
        """
        Initialize Redis rate limiter
        
        Args:
            redis_url: Redis connection URL
            requests_per_minute: Max requests per minute per user
            requests_per_hour: Max requests per hour per user
        """
        self.redis_url = redis_url or get_settings().REDIS_URL
        self.requests_per_minute = requests_per_minute
        self.requests_per_hour = requests_per_hour
        self.redis_client = None
        
        logger.info(
            f"🚦 Redis Rate Limiter initialized: "
            f"{requests_per_minute}/min, {requests_per_hour}/hour"
        )
    
    async def connect(self):
        """Connect to Redis"""
        if not self.redis_client:
            self.redis_client = redis.from_url(
                self.redis_url,
                decode_responses=True
            )
            await self.redis_client.ping()
            logger.info("✅ Connected to Redis for rate limiting")
    
    async def _ensure_connected(self):
        """Ensure Redis connection is active"""
        if not self.redis_client:
            await self.connect()
    
    async def check_rate_limit(
        self, 
        user_id: str,
        resource: str = "tts"
    ) -> tuple[bool, Optional[Dict[str, Any]]]:
        """
        Check if user request is within rate limits
        
        Args:
            user_id: User identifier
            resource: Resource type (e.g., "tts", "api")
            
        Returns:
            Tuple of (is_allowed, rate_limit_info)
        """
        await self._ensure_connected()
        
        now = datetime.utcnow()
        minute_window = int(now.timestamp())
        hour_window = int(now.timestamp() / 3600) * 3600
        
        # Keys for sliding windows
        minute_key = f"rate:{resource}:minute:{user_id}:{minute_window}"
        hour_key = f"rate:{resource}:hour:{user_id}:{hour_window}"
        
        try:
            # Use pipeline for atomic operations
            async with self.redis_client.pipeline(transaction=True) as pipe:
                # Get current counts
                pipe.get(minute_key)
                pipe.get(hour_key)
                results = await pipe.execute()
                
                minute_count = int(results[0] or 0)
                hour_count = int(results[1] or 0)
                
                # Check limits
                if minute_count >= self.requests_per_minute:
                    return False, {
                        'exceeded': 'minute',
                        'limit': self.requests_per_minute,
                        'current': minute_count,
                        'retry_after': 60 - (now.second),
                        'message': f"Rate limit exceeded: {self.requests_per_minute} requests per minute"
                    }
                
                if hour_count >= self.requests_per_hour:
                    return False, {
                        'exceeded': 'hour',
                        'limit': self.requests_per_hour,
                        'current': hour_count,
                        'retry_after': 3600 - (now.minute * 60 + now.second),
                        'message': f"Rate limit exceeded: {self.requests_per_hour} requests per hour"
                    }
                
                # Increment counters
                pipe.multi()
                pipe.incr(minute_key)
                pipe.expire(minute_key, 60)
                pipe.incr(hour_key)
                pipe.expire(hour_key, 3600)
                await pipe.execute()
                
                return True, {
                    'allowed': True,
                    'remaining_minute': self.requests_per_minute - minute_count - 1,
                    'remaining_hour': self.requests_per_hour - hour_count - 1,
                    'limits': {
                        'per_minute': self.requests_per_minute,
                        'per_hour': self.requests_per_hour
                    }
                }
                
        except Exception as e:
            logger.error(f"Rate limit check error: {e}")
            # Allow request on error (fail open)
            return True, {'error': str(e)}
    
    async def get_user_stats(self, user_id: str, resource: str = "tts") -> Dict[str, Any]:
        """Get rate limit statistics for a user"""
        await self._ensure_connected()
        
        now = datetime.utcnow()
        minute_window = int(now.timestamp())
        hour_window = int(now.timestamp() / 3600) * 3600
        
        minute_key = f"rate:{resource}:minute:{user_id}:{minute_window}"
        hour_key = f"rate:{resource}:hour:{user_id}:{hour_window}"
        
        try:
            minute_count = await self.redis_client.get(minute_key)
            hour_count = await self.redis_client.get(hour_key)
            
            return {
                'user_id': user_id,
                'resource': resource,
                'requests_last_minute': int(minute_count or 0),
                'requests_last_hour': int(hour_count or 0),
                'remaining_minute': max(0, self.requests_per_minute - int(minute_count or 0)),
                'remaining_hour': max(0, self.requests_per_hour - int(hour_count or 0)),
                'limits': {
                    'per_minute': self.requests_per_minute,
                    'per_hour': self.requests_per_hour
                }
            }
        except Exception as e:
            logger.error(f"Failed to get user stats: {e}")
            return {}
    
    async def reset_user_limits(self, user_id: str, resource: str = "tts"):
        """Reset rate limits for a user (admin function)"""
        await self._ensure_connected()
        
        pattern = f"rate:{resource}:*:{user_id}:*"
        keys = await self.redis_client.keys(pattern)
        if keys:
            await self.redis_client.delete(*keys)
            logger.info(f"🔄 Reset rate limits for user {user_id}")
    
    async def close(self):
        """Close Redis connection"""
        if self.redis_client:
            await self.redis_client.close()
            self.redis_client = None

# ============================================================================
# REDIS-OPTIMIZED TTS MANAGER
# ============================================================================

class RedisOptimizedTTSManager:
    """
    Production-ready TTS Manager with Redis-based caching and rate limiting
    Designed for multi-server deployments with <800ms latency target
    """
    
    def __init__(
        self,
        base_manager,
        cache_ttl: int = 3600,
        rate_limit_per_minute: int = 30,
        rate_limit_per_hour: int = 500
    ):
        """
        Initialize Redis-optimized TTS manager
        
        Args:
            base_manager: Original TTS manager instance
            cache_ttl: Cache time-to-live in seconds
            rate_limit_per_minute: Max requests per minute
            rate_limit_per_hour: Max requests per hour
        """
        self.base_manager = base_manager
        self.cache = RedisTTSCache(ttl_seconds=cache_ttl)
        self.rate_limiter = RedisRateLimiter(
            requests_per_minute=rate_limit_per_minute,
            requests_per_hour=rate_limit_per_hour
        )
        self.initialized = False
        
        logger.info("⚡ Redis-Optimized TTS Manager initialized")
    
    async def initialize(self):
        """Initialize Redis connections"""
        if not self.initialized:
            await self.cache.connect()
            await self.rate_limiter.connect()
            self.initialized = True
            logger.info("✅ Redis-Optimized TTS Manager ready")
    
    async def synthesize_optimized(
        self,
        text: str,
        voice: str = "en-US-AriaNeural",
        speed: float = 1.0,
        user_id: str = "anonymous"
    ) -> Dict[str, Any]:
        """
        Optimized TTS synthesis with Redis caching and rate limiting
        
        Args:
            text: Text to synthesize
            voice: Voice to use
            speed: Speech speed
            user_id: User identifier for rate limiting
            
        Returns:
            Dict with audio data and metadata
        """
        # Ensure initialized
        await self.initialize()
        
        start_time = asyncio.get_event_loop().time()
        
        # Check rate limit
        allowed, rate_info = await self.rate_limiter.check_rate_limit(user_id, "tts")
        if not allowed:
            return {
                'error': rate_info['message'],
                'rate_limit_exceeded': True,
                'retry_after': rate_info['retry_after'],
                'rate_limit_info': rate_info
            }
        
        # Check cache
        cached_result = await self.cache.get(text, voice, speed)
        if cached_result:
            latency_ms = (asyncio.get_event_loop().time() - start_time) * 1000
            
            logger.info(f"🚀 TTS from Redis cache in {latency_ms:.1f}ms")
            
            cached_result['latency_ms'] = latency_ms
            cached_result['performance'] = {
                'source': 'redis_cache',
                'latency_ms': latency_ms,
                'cache_stats': await self.cache.get_stats(),
                'rate_limit_info': rate_info
            }
            
            return cached_result
        
        # Generate new TTS
        try:
            settings = VoiceSettings(voice=voice, speed=speed)
            result = await self.base_manager.synthesize(text, settings)
            
            # Cache the result in Redis
            await self.cache.set(
                text=text,
                voice=voice,
                speed=speed,
                audio_data=result.audio_data,
                format=result.format,
                engine=result.engine_used,
                duration=result.duration
            )
            
            # Compress and encode for transport
            compressed = zlib.compress(result.audio_data, level=6)
            audio_base64 = base64.b64encode(compressed).decode('utf-8')
            
            latency_ms = (asyncio.get_event_loop().time() - start_time) * 1000
            
            logger.info(f"✅ TTS generated and cached in Redis ({latency_ms:.1f}ms)")
            
            return {
                'audio_data': audio_base64,
                'format': result.format,
                'voice_used': result.voice_used,
                'engine_used': result.engine_used,
                'duration': result.duration,
                'from_cache': False,
                'compressed': True,
                'latency_ms': latency_ms,
                'performance': {
                    'source': 'generated',
                    'latency_ms': latency_ms,
                    'cache_stats': await self.cache.get_stats(),
                    'rate_limit_info': rate_info
                }
            }
            
        except Exception as e:
            logger.error(f"TTS synthesis failed: {e}")
            raise
    
    async def get_performance_metrics(self) -> Dict[str, Any]:
        """Get comprehensive performance metrics"""
        cache_stats = await self.cache.get_stats()
        
        return {
            'cache': cache_stats,
            'health': {
                'redis_connected': self.initialized,
                'cache_hit_rate': cache_stats.get('hit_rate', '0%'),
                'memory_used_mb': cache_stats.get('memory_used_mb', 0)
            }
        }
    
    async def clear_cache(self):
        """Clear TTS cache"""
        await self.cache.clear()
        logger.info("🧹 TTS cache cleared")
    
    async def close(self):
        """Close Redis connections"""
        await self.cache.close()
        await self.rate_limiter.close()
        self.initialized = False
        logger.info("👋 Redis-Optimized TTS Manager closed")

# ============================================================================
# USAGE
# ============================================================================

# Global instance
_redis_tts_manager = None

async def get_redis_tts_manager():
    """Get or create the global Redis-optimized TTS manager"""
    global _redis_tts_manager
    
    if _redis_tts_manager is None:
        from .manager import get_tts_manager
        
        base_manager = get_tts_manager()
        _redis_tts_manager = RedisOptimizedTTSManager(
            base_manager=base_manager,
            cache_ttl=3600,  # 1 hour
            rate_limit_per_minute=30,
            rate_limit_per_hour=500
        )
        await _redis_tts_manager.initialize()
    
    return _redis_tts_manager

# Test function
async def test_redis_tts():
    """Test Redis-optimized TTS functionality"""
    try:
        manager = await get_redis_tts_manager()
        
        # Test texts
        texts = [
            "Hello, this is a Redis cache test.",
            "Hello, this is a Redis cache test.",  # Duplicate to test cache
            "Welcome to the optimized TTS system!",
        ]
        
        for i, text in enumerate(texts):
            print(f"\n🧪 Test {i+1}: {text[:30]}...")
            
            result = await manager.synthesize_optimized(
                text=text,
                user_id="test_user"
            )
            
            if 'error' in result:
                print(f"   ❌ Error: {result['error']}")
            else:
                print(f"   ✅ Success!")
                print(f"   - From cache: {result.get('from_cache', False)}")
                print(f"   - Latency: {result.get('latency_ms', 0):.1f}ms")
                print(f"   - Engine: {result.get('engine_used', 'Unknown')}")
        
        # Get metrics
        metrics = await manager.get_performance_metrics()
        print("\n📊 Performance Metrics:")
        print(f"   Cache hit rate: {metrics['cache']['hit_rate']}")
        print(f"   Total requests: {metrics['cache']['total_requests']}")
        print(f"   Redis memory: {metrics['cache']['memory_used_mb']} MB")
        
        return True
        
    except Exception as e:
        print(f"❌ Test failed: {e}")
        return False
    finally:
        if _redis_tts_manager:
            await _redis_tts_manager.close()

if __name__ == "__main__":
    import asyncio
    asyncio.run(test_redis_tts())