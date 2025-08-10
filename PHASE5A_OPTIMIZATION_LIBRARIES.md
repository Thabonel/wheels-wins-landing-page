# Phase 5A TTS Performance Optimization - Library Recommendations

## 🚀 Recommended Libraries for Production Optimization

### 1. **Audio Compression Libraries**

#### Frontend (JavaScript/TypeScript)

##### **Primary: pako** (zlib compression)
```bash
npm install pako @types/pako
```
```typescript
// src/utils/audioCompression.ts
import pako from 'pako';

export const compressAudio = (audioData: Uint8Array): string => {
  const compressed = pako.deflate(audioData, { level: 6 });
  return btoa(String.fromCharCode(...compressed));
};

export const decompressAudio = (compressedBase64: string): Uint8Array => {
  const compressed = Uint8Array.from(atob(compressedBase64), c => c.charCodeAt(0));
  return pako.inflate(compressed);
};
```

##### **Alternative: fflate** (lighter, faster)
```bash
npm install fflate
```
```typescript
// 8KB library, 3x faster than pako
import { compressSync, decompressSync } from 'fflate';

export const compressAudioFflate = (audioData: Uint8Array): Uint8Array => {
  return compressSync(audioData, { level: 6 });
};
```

##### **Audio-specific: lamejs** (MP3 encoding)
```bash
npm install lamejs
```
```typescript
// For MP3 encoding/decoding
import lamejs from 'lamejs';

const mp3encoder = new lamejs.Mp3Encoder(1, 44100, 128);
// Encode PCM to MP3 for better compression
```

#### Backend (Python)

##### **Primary: zlib** (built-in)
```python
# backend/app/services/tts/compression.py
import zlib
import base64

def compress_audio(audio_data: bytes) -> str:
    """Compress audio data using zlib"""
    compressed = zlib.compress(audio_data, level=6)
    return base64.b64encode(compressed).decode('utf-8')

def decompress_audio(compressed_b64: str) -> bytes:
    """Decompress audio data"""
    compressed = base64.b64decode(compressed_b64)
    return zlib.decompress(compressed)
```

##### **Alternative: brotli** (better compression)
```bash
pip install brotli
```
```python
import brotli

def compress_audio_brotli(audio_data: bytes) -> bytes:
    return brotli.compress(audio_data, quality=6)
```

---

### 2. **Caching Solutions**

#### **In-Memory Caching (Single Server)**

##### **Python: cachetools with TTL**
```bash
pip install cachetools
```
```python
# backend/app/services/tts/cache.py
from cachetools import TTLCache
import hashlib
from typing import Optional

class TTSCache:
    def __init__(self, max_size: int = 100, ttl: int = 3600):
        """
        Initialize TTS cache
        Args:
            max_size: Maximum number of cached items
            ttl: Time-to-live in seconds (default 1 hour)
        """
        self.cache = TTLCache(maxsize=max_size, ttl=ttl)
    
    def _get_cache_key(self, text: str, voice: str, speed: float) -> str:
        """Generate cache key from TTS parameters"""
        key_str = f"{text}:{voice}:{speed}"
        return hashlib.sha256(key_str.encode()).hexdigest()
    
    def get(self, text: str, voice: str, speed: float) -> Optional[bytes]:
        """Get cached audio if available"""
        key = self._get_cache_key(text, voice, speed)
        return self.cache.get(key)
    
    def set(self, text: str, voice: str, speed: float, audio_data: bytes):
        """Cache audio data"""
        key = self._get_cache_key(text, voice, speed)
        self.cache[key] = audio_data
```

#### **Distributed Caching (Multi-Server)**

##### **Redis with FastAPI**
```bash
pip install redis aioredis fastapi-cache2
```
```python
# backend/app/services/tts/redis_cache.py
import redis.asyncio as redis
from fastapi_cache import FastAPICache
from fastapi_cache.backend.redis import RedisBackend
from fastapi_cache.decorator import cache
import hashlib

class TTSRedisCache:
    def __init__(self, redis_url: str = "redis://localhost:6379"):
        self.redis_client = None
        self.redis_url = redis_url
    
    async def init(self):
        """Initialize Redis connection"""
        self.redis_client = redis.from_url(
            self.redis_url,
            encoding="utf-8",
            decode_responses=False  # For binary audio data
        )
        # Initialize FastAPI cache
        FastAPICache.init(
            RedisBackend(self.redis_client),
            prefix="tts-cache:"
        )
    
    async def get_audio(self, text: str, voice: str) -> Optional[bytes]:
        """Get cached audio from Redis"""
        key = f"tts:{hashlib.md5(f'{text}:{voice}'.encode()).hexdigest()}"
        return await self.redis_client.get(key)
    
    async def set_audio(
        self, 
        text: str, 
        voice: str, 
        audio_data: bytes, 
        ttl: int = 3600
    ):
        """Cache audio in Redis with TTL"""
        key = f"tts:{hashlib.md5(f'{text}:{voice}'.encode()).hexdigest()}"
        await self.redis_client.setex(key, ttl, audio_data)
    
    async def close(self):
        """Close Redis connection"""
        if self.redis_client:
            await self.redis_client.close()
```

##### **FastAPI Cache Decorator**
```python
# backend/app/api/v1/pam.py
from fastapi_cache.decorator import cache

@cache(expire=3600)  # Cache for 1 hour
async def generate_tts_cached(text: str, voice: str = "en-US-AriaNeural"):
    """Cached TTS generation"""
    return await generate_tts_audio(text, {"tts_voice": voice})
```

---

### 3. **Rate Limiting**

#### **SlowAPI (Recommended for FastAPI)**
```bash
pip install slowapi
```
```python
# backend/app/middleware/rate_limiter.py
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from fastapi import FastAPI, Request
import redis.asyncio as redis

# Create limiter with Redis backend for distributed rate limiting
limiter = Limiter(
    key_func=get_remote_address,
    default_limits=["100/minute"],  # Global default
    storage_uri="redis://localhost:6379",
    strategy="fixed-window"
)

def setup_rate_limiting(app: FastAPI):
    """Setup rate limiting for FastAPI app"""
    app.state.limiter = limiter
    app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
    app.add_middleware(SlowAPIMiddleware)

# Usage in endpoints
from slowapi import Limiter

# backend/app/api/v1/pam.py
@router.post("/tts/generate")
@limiter.limit("10/minute")  # TTS-specific limit
async def generate_tts_endpoint(request: Request, text: str):
    """Rate-limited TTS generation endpoint"""
    return await generate_tts_audio(text)

# WebSocket rate limiting
@router.websocket("/ws/{user_id}")
@limiter.limit("5/minute")  # Connection attempts limit
async def websocket_endpoint(request: Request, websocket: WebSocket, user_id: str):
    # Existing WebSocket code
    pass
```

#### **FastAPI-Limiter (Alternative)**
```bash
pip install fastapi-limiter
```
```python
# backend/app/core/rate_limiter.py
from fastapi_limiter import FastAPILimiter
from fastapi_limiter.depends import RateLimiter
import redis.asyncio as redis

async def init_rate_limiter():
    """Initialize FastAPI-Limiter with Redis"""
    redis_client = redis.from_url("redis://localhost:6379", encoding="utf-8")
    await FastAPILimiter.init(redis_client)

# Usage in endpoint
@router.post("/tts/generate")
async def generate_tts_endpoint(
    text: str,
    rate_limiter: RateLimiter = Depends(RateLimiter(times=10, seconds=60))
):
    """TTS endpoint with rate limiting (10 requests per minute)"""
    return await generate_tts_audio(text)
```

---

### 4. **Performance Optimization Libraries**

#### **Async Performance**
```bash
pip install aiocache uvloop
```
```python
# backend/app/services/tts/async_cache.py
from aiocache import cached, Cache
from aiocache.serializers import PickleSerializer

@cached(
    cache=Cache.REDIS,
    endpoint="127.0.0.1",
    port=6379,
    ttl=3600,
    serializer=PickleSerializer(),
    key_builder=lambda f, text, voice: f"tts:{text}:{voice}"
)
async def generate_tts_with_cache(text: str, voice: str) -> bytes:
    """TTS generation with automatic caching"""
    return await synthesize_text(text, voice=voice)
```

#### **Connection Pooling**
```python
# backend/app/services/tts/connection_pool.py
import aiohttp
from aiohttp import TCPConnector

class EdgeTTSPool:
    def __init__(self, pool_size: int = 10):
        self.connector = TCPConnector(
            limit=pool_size,
            limit_per_host=pool_size,
            ttl_dns_cache=300
        )
        self.session = None
    
    async def init(self):
        self.session = aiohttp.ClientSession(connector=self.connector)
    
    async def close(self):
        if self.session:
            await self.session.close()
```

---

## 📦 Complete Installation Commands

### Frontend Dependencies
```bash
# Audio compression and optimization
npm install pako @types/pako
npm install fflate  # Alternative lighter compression
npm install comlink  # Web Worker for audio processing

# Performance monitoring
npm install web-vitals
```

### Backend Dependencies
```bash
# Caching
pip install cachetools==5.3.2
pip install redis==5.0.1
pip install aioredis==2.0.1
pip install fastapi-cache2==0.2.1
pip install aiocache==0.12.2

# Rate Limiting
pip install slowapi==0.1.9
# OR
pip install fastapi-limiter==0.1.6

# Compression
pip install brotli==1.1.0  # Optional, zlib is built-in

# Performance
pip install uvloop==0.19.0  # Faster event loop
pip install orjson==3.9.10  # Faster JSON
```

---

## 🎯 Implementation Priority

### Phase 1: Quick Wins (1-2 hours)
1. **Add zlib compression** (built-in Python, reduces payload by 50-70%)
2. **Implement in-memory caching** with cachetools TTLCache
3. **Add basic rate limiting** with SlowAPI

### Phase 2: Production Ready (2-4 hours)
1. **Setup Redis caching** for distributed systems
2. **Implement connection pooling** for Edge TTS
3. **Add compression on frontend** with pako

### Phase 3: Advanced Optimization (4-8 hours)
1. **Implement audio streaming** instead of full generation
2. **Add predictive pre-generation** for common phrases
3. **Setup monitoring and metrics** collection

---

## 🚀 Expected Performance Improvements

With these optimizations:

| Metric | Current | With Optimizations | Improvement |
|--------|---------|-------------------|-------------|
| TTS Generation | 200-500ms | 50-200ms (cached) | 75% faster |
| Payload Size | 100-200KB | 30-60KB | 70% smaller |
| WebSocket Latency | 500-800ms | 200-400ms | 50% faster |
| Memory Usage | Unbounded | Bounded (LRU) | Predictable |
| Concurrent Users | ~100 | ~1000 | 10x capacity |

---

## 💡 Production Configuration Example

```python
# backend/app/core/tts_config.py
from pydantic import BaseSettings

class TTSConfig(BaseSettings):
    # Caching
    TTS_CACHE_ENABLED: bool = True
    TTS_CACHE_TTL: int = 3600  # 1 hour
    TTS_CACHE_MAX_SIZE: int = 1000
    TTS_REDIS_URL: str = "redis://localhost:6379/0"
    
    # Rate Limiting
    TTS_RATE_LIMIT_ENABLED: bool = True
    TTS_RATE_LIMIT_PER_MINUTE: int = 30
    TTS_RATE_LIMIT_PER_HOUR: int = 500
    
    # Compression
    TTS_COMPRESSION_ENABLED: bool = True
    TTS_COMPRESSION_LEVEL: int = 6  # 1-9, 6 is optimal
    
    # Performance
    TTS_CONNECTION_POOL_SIZE: int = 20
    TTS_TIMEOUT_SECONDS: int = 10
    TTS_MAX_TEXT_LENGTH: int = 1000
    
    class Config:
        env_prefix = "TTS_"
```

---

## ✅ Ready for Production

These libraries are all:
- **Production-tested** and widely used
- **Well-maintained** with active communities
- **Performance-optimized** for real-world use
- **Compatible** with your existing FastAPI/React stack
- **Scalable** from single server to distributed systems

Start with the Phase 1 quick wins to immediately improve performance, then progressively add more optimizations based on your specific needs and traffic patterns.