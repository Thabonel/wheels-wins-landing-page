"""
Phase 5A TTS Performance Optimizations
Implements caching, compression, and rate limiting for sub-800ms latency
"""

import zlib
import base64
import hashlib
from typing import Optional, Dict, Any
from cachetools import TTLCache
import asyncio
import logging
from dataclasses import dataclass
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)

# ============================================================================
# COMPRESSION MODULE
# ============================================================================

class AudioCompressor:
    """Handles audio compression/decompression for reduced bandwidth"""
    
    @staticmethod
    def compress(audio_data: bytes, level: int = 6) -> str:
        """
        Compress audio data using zlib
        
        Args:
            audio_data: Raw audio bytes
            level: Compression level (1-9, 6 is optimal)
            
        Returns:
            Base64 encoded compressed audio
        """
        try:
            compressed = zlib.compress(audio_data, level=level)
            # Log compression ratio
            ratio = (1 - len(compressed) / len(audio_data)) * 100
            logger.debug(f"🗜️ Audio compressed: {len(audio_data)} → {len(compressed)} bytes ({ratio:.1f}% reduction)")
            return base64.b64encode(compressed).decode('utf-8')
        except Exception as e:
            logger.error(f"❌ Compression failed: {e}")
            # Fallback to uncompressed
            return base64.b64encode(audio_data).decode('utf-8')
    
    @staticmethod
    def decompress(compressed_b64: str) -> bytes:
        """
        Decompress audio data
        
        Args:
            compressed_b64: Base64 encoded compressed audio
            
        Returns:
            Raw audio bytes
        """
        try:
            compressed = base64.b64decode(compressed_b64)
            # Try to decompress
            try:
                return zlib.decompress(compressed)
            except zlib.error:
                # Data might not be compressed, return as-is
                return compressed
        except Exception as e:
            logger.error(f"❌ Decompression failed: {e}")
            raise

# ============================================================================
# CACHING MODULE
# ============================================================================

@dataclass
class CachedAudio:
    """Cached audio data with metadata"""
    audio_data: str  # Base64 encoded compressed audio
    format: str
    voice: str
    engine: str
    created_at: datetime
    hit_count: int = 0
    
    @property
    def age_seconds(self) -> float:
        """Get age of cached item in seconds"""
        return (datetime.now() - self.created_at).total_seconds()

class TTSMemoryCache:
    """
    In-memory TTS cache with TTL and LRU eviction
    Ideal for single-server deployments
    """
    
    def __init__(self, max_size: int = 100, ttl_seconds: int = 3600):
        """
        Initialize TTS cache
        
        Args:
            max_size: Maximum number of cached items
            ttl_seconds: Time-to-live in seconds (default 1 hour)
        """
        self.cache = TTLCache(maxsize=max_size, ttl=ttl_seconds)
        self.stats = {
            'hits': 0,
            'misses': 0,
            'evictions': 0,
            'total_requests': 0
        }
        self.compressor = AudioCompressor()
        logger.info(f"📦 TTS cache initialized: max_size={max_size}, ttl={ttl_seconds}s")
    
    def _generate_key(self, text: str, voice: str, speed: float = 1.0) -> str:
        """Generate cache key from TTS parameters"""
        # Normalize text (lowercase, strip whitespace)
        normalized_text = text.lower().strip()
        key_str = f"{normalized_text}|{voice}|{speed}"
        return hashlib.sha256(key_str.encode()).hexdigest()[:16]  # Use first 16 chars
    
    async def get(
        self, 
        text: str, 
        voice: str, 
        speed: float = 1.0
    ) -> Optional[Dict[str, Any]]:
        """
        Get cached audio if available
        
        Returns:
            Dict with audio data and metadata, or None if not cached
        """
        key = self._generate_key(text, voice, speed)
        self.stats['total_requests'] += 1
        
        cached_item = self.cache.get(key)
        if cached_item:
            self.stats['hits'] += 1
            cached_item.hit_count += 1
            
            # Update cache with increased hit count
            self.cache[key] = cached_item
            
            hit_rate = (self.stats['hits'] / self.stats['total_requests']) * 100
            logger.debug(f"✅ Cache HIT for key {key} (hit rate: {hit_rate:.1f}%)")
            
            return {
                'audio_data': cached_item.audio_data,
                'format': cached_item.format,
                'voice_used': cached_item.voice,
                'engine_used': cached_item.engine,
                'from_cache': True,
                'cache_age_seconds': cached_item.age_seconds,
                'hit_count': cached_item.hit_count
            }
        
        self.stats['misses'] += 1
        logger.debug(f"❌ Cache MISS for key {key}")
        return None
    
    async def set(
        self,
        text: str,
        voice: str,
        speed: float,
        audio_data: bytes,
        format: str,
        engine: str
    ):
        """Store audio in cache"""
        key = self._generate_key(text, voice, speed)
        
        # Compress before caching
        compressed_audio = self.compressor.compress(audio_data)
        
        cached_item = CachedAudio(
            audio_data=compressed_audio,
            format=format,
            voice=voice,
            engine=engine,
            created_at=datetime.now()
        )
        
        # Check if we're replacing an existing item
        if key in self.cache:
            self.stats['evictions'] += 1
        
        self.cache[key] = cached_item
        logger.debug(f"💾 Cached TTS for key {key} (size: {len(compressed_audio)} bytes)")
    
    def get_stats(self) -> Dict[str, Any]:
        """Get cache statistics"""
        hit_rate = 0
        if self.stats['total_requests'] > 0:
            hit_rate = (self.stats['hits'] / self.stats['total_requests']) * 100
        
        return {
            'size': len(self.cache),
            'max_size': self.cache.maxsize,
            'ttl_seconds': self.cache.ttl,
            'hits': self.stats['hits'],
            'misses': self.stats['misses'],
            'hit_rate': f"{hit_rate:.1f}%",
            'evictions': self.stats['evictions'],
            'total_requests': self.stats['total_requests']
        }
    
    def clear(self):
        """Clear all cached items"""
        self.cache.clear()
        logger.info("🧹 TTS cache cleared")

# ============================================================================
# RATE LIMITING MODULE
# ============================================================================

class TTSRateLimiter:
    """
    Simple in-memory rate limiter for TTS requests
    For production, use SlowAPI with Redis backend
    """
    
    def __init__(
        self,
        requests_per_minute: int = 30,
        requests_per_hour: int = 500
    ):
        """
        Initialize rate limiter
        
        Args:
            requests_per_minute: Max requests per minute per user
            requests_per_hour: Max requests per hour per user
        """
        self.requests_per_minute = requests_per_minute
        self.requests_per_hour = requests_per_hour
        self.user_requests: Dict[str, list] = {}
        self.lock = asyncio.Lock()
        
        logger.info(f"🚦 TTS rate limiter initialized: {requests_per_minute}/min, {requests_per_hour}/hour")
    
    async def check_rate_limit(self, user_id: str) -> tuple[bool, Optional[str]]:
        """
        Check if user has exceeded rate limit
        
        Returns:
            Tuple of (is_allowed, error_message)
        """
        async with self.lock:
            now = datetime.now()
            
            # Initialize user request list if needed
            if user_id not in self.user_requests:
                self.user_requests[user_id] = []
            
            # Clean old requests
            user_reqs = self.user_requests[user_id]
            
            # Remove requests older than 1 hour
            hour_ago = now - timedelta(hours=1)
            user_reqs = [req_time for req_time in user_reqs if req_time > hour_ago]
            
            # Check hourly limit
            if len(user_reqs) >= self.requests_per_hour:
                return False, f"Hourly limit exceeded ({self.requests_per_hour} requests/hour)"
            
            # Check minute limit
            minute_ago = now - timedelta(minutes=1)
            recent_reqs = [req_time for req_time in user_reqs if req_time > minute_ago]
            
            if len(recent_reqs) >= self.requests_per_minute:
                return False, f"Per-minute limit exceeded ({self.requests_per_minute} requests/minute)"
            
            # Add current request
            user_reqs.append(now)
            self.user_requests[user_id] = user_reqs
            
            return True, None
    
    def get_user_stats(self, user_id: str) -> Dict[str, Any]:
        """Get rate limit stats for a user"""
        if user_id not in self.user_requests:
            return {
                'requests_last_minute': 0,
                'requests_last_hour': 0,
                'limit_per_minute': self.requests_per_minute,
                'limit_per_hour': self.requests_per_hour
            }
        
        now = datetime.now()
        user_reqs = self.user_requests[user_id]
        
        minute_ago = now - timedelta(minutes=1)
        hour_ago = now - timedelta(hours=1)
        
        requests_last_minute = len([r for r in user_reqs if r > minute_ago])
        requests_last_hour = len([r for r in user_reqs if r > hour_ago])
        
        return {
            'requests_last_minute': requests_last_minute,
            'requests_last_hour': requests_last_hour,
            'limit_per_minute': self.requests_per_minute,
            'limit_per_hour': self.requests_per_hour,
            'remaining_minute': max(0, self.requests_per_minute - requests_last_minute),
            'remaining_hour': max(0, self.requests_per_hour - requests_last_hour)
        }

# ============================================================================
# OPTIMIZED TTS MANAGER
# ============================================================================

class OptimizedTTSManager:
    """
    Enhanced TTS Manager with caching, compression, and rate limiting
    Target: <800ms latency for 90% of requests
    """
    
    def __init__(
        self,
        base_manager,
        cache_enabled: bool = True,
        compression_enabled: bool = True,
        rate_limiting_enabled: bool = True
    ):
        """
        Initialize optimized TTS manager
        
        Args:
            base_manager: Original TTS manager instance
            cache_enabled: Enable caching
            compression_enabled: Enable compression
            rate_limiting_enabled: Enable rate limiting
        """
        self.base_manager = base_manager
        self.cache = TTSMemoryCache() if cache_enabled else None
        self.compressor = AudioCompressor() if compression_enabled else None
        self.rate_limiter = TTSRateLimiter() if rate_limiting_enabled else None
        
        self.metrics = {
            'total_requests': 0,
            'cache_hits': 0,
            'avg_latency_ms': 0,
            'p95_latency_ms': 0,
            'p99_latency_ms': 0
        }
        
        self.latencies = []  # Store recent latencies for percentile calculation
        
        logger.info(f"⚡ Optimized TTS Manager initialized - Cache: {cache_enabled}, Compression: {compression_enabled}, Rate Limiting: {rate_limiting_enabled}")
    
    async def synthesize_optimized(
        self,
        text: str,
        voice: str = "en-US-AriaNeural",
        speed: float = 1.0,
        user_id: str = "anonymous"
    ) -> Dict[str, Any]:
        """
        Optimized TTS synthesis with caching, compression, and rate limiting
        
        Returns:
            Dict with audio data and performance metrics
        """
        start_time = asyncio.get_event_loop().time()
        
        # Check rate limit
        if self.rate_limiter:
            allowed, error_msg = await self.rate_limiter.check_rate_limit(user_id)
            if not allowed:
                return {
                    'error': error_msg,
                    'rate_limit_exceeded': True,
                    'stats': self.rate_limiter.get_user_stats(user_id)
                }
        
        # Check cache first
        if self.cache:
            cached_result = await self.cache.get(text, voice, speed)
            if cached_result:
                self.metrics['cache_hits'] += 1
                
                # Calculate latency
                latency_ms = (asyncio.get_event_loop().time() - start_time) * 1000
                self._record_latency(latency_ms)
                
                logger.info(f"🚀 TTS from cache in {latency_ms:.1f}ms")
                
                cached_result['latency_ms'] = latency_ms
                cached_result['optimization_stats'] = {
                    'cache_hit': True,
                    'compressed': True,
                    'cache_stats': self.cache.get_stats()
                }
                
                return cached_result
        
        # Generate new TTS
        from .base import VoiceSettings
        settings = VoiceSettings(voice=voice, speed=speed)
        
        try:
            result = await self.base_manager.synthesize(text, settings)
            
            # Cache the result
            if self.cache:
                await self.cache.set(
                    text=text,
                    voice=voice,
                    speed=speed,
                    audio_data=result.audio_data,
                    format=result.format,
                    engine=result.engine_used
                )
            
            # Compress the audio
            if self.compressor:
                compressed_audio = self.compressor.compress(result.audio_data)
            else:
                compressed_audio = base64.b64encode(result.audio_data).decode('utf-8')
            
            # Calculate latency
            latency_ms = (asyncio.get_event_loop().time() - start_time) * 1000
            self._record_latency(latency_ms)
            
            self.metrics['total_requests'] += 1
            
            return {
                'audio_data': compressed_audio,
                'format': result.format,
                'voice_used': result.voice_used,
                'engine_used': result.engine_used,
                'duration': result.duration,
                'from_cache': False,
                'compressed': self.compressor is not None,
                'latency_ms': latency_ms,
                'optimization_stats': {
                    'cache_hit': False,
                    'compressed': self.compressor is not None,
                    'cache_stats': self.cache.get_stats() if self.cache else None
                }
            }
            
        except Exception as e:
            logger.error(f"❌ Optimized TTS synthesis failed: {e}")
            raise
    
    def _record_latency(self, latency_ms: float):
        """Record latency for metrics calculation"""
        self.latencies.append(latency_ms)
        
        # Keep only last 1000 latencies
        if len(self.latencies) > 1000:
            self.latencies = self.latencies[-1000:]
        
        # Update metrics
        if self.latencies:
            self.metrics['avg_latency_ms'] = sum(self.latencies) / len(self.latencies)
            
            # Calculate percentiles
            sorted_latencies = sorted(self.latencies)
            p95_index = int(len(sorted_latencies) * 0.95)
            p99_index = int(len(sorted_latencies) * 0.99)
            
            self.metrics['p95_latency_ms'] = sorted_latencies[min(p95_index, len(sorted_latencies)-1)]
            self.metrics['p99_latency_ms'] = sorted_latencies[min(p99_index, len(sorted_latencies)-1)]
    
    def get_performance_metrics(self) -> Dict[str, Any]:
        """Get performance metrics"""
        cache_hit_rate = 0
        if self.metrics['total_requests'] > 0:
            cache_hit_rate = (self.metrics['cache_hits'] / self.metrics['total_requests']) * 100
        
        return {
            'total_requests': self.metrics['total_requests'],
            'cache_hit_rate': f"{cache_hit_rate:.1f}%",
            'avg_latency_ms': f"{self.metrics['avg_latency_ms']:.1f}",
            'p95_latency_ms': f"{self.metrics['p95_latency_ms']:.1f}",
            'p99_latency_ms': f"{self.metrics['p99_latency_ms']:.1f}",
            'target_met': self.metrics['avg_latency_ms'] < 800,
            'cache_stats': self.cache.get_stats() if self.cache else None
        }

# ============================================================================
# USAGE EXAMPLE
# ============================================================================

async def test_optimized_tts():
    """Test the optimized TTS system"""
    from .manager import get_tts_manager
    
    # Get base manager
    base_manager = get_tts_manager()
    
    # Create optimized manager
    optimized = OptimizedTTSManager(
        base_manager,
        cache_enabled=True,
        compression_enabled=True,
        rate_limiting_enabled=True
    )
    
    # Test synthesis
    test_texts = [
        "Hello, this is a test.",
        "Hello, this is a test.",  # Duplicate to test cache
        "Welcome to Wheels and Wins!",
        "Your trip planning assistant is ready."
    ]
    
    for text in test_texts:
        result = await optimized.synthesize_optimized(text, user_id="test_user")
        
        if 'error' in result:
            print(f"❌ Error: {result['error']}")
        else:
            print(f"✅ TTS generated: {text[:30]}...")
            print(f"   - From cache: {result.get('from_cache', False)}")
            print(f"   - Latency: {result.get('latency_ms', 0):.1f}ms")
            print(f"   - Engine: {result.get('engine_used', 'Unknown')}")
    
    # Print performance metrics
    metrics = optimized.get_performance_metrics()
    print("\n📊 Performance Metrics:")
    for key, value in metrics.items():
        if key != 'cache_stats':
            print(f"   {key}: {value}")
    
    return optimized

if __name__ == "__main__":
    # Test the optimized TTS
    import asyncio
    asyncio.run(test_optimized_tts())