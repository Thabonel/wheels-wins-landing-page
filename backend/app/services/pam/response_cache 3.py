"""
PAM Response Cache Service
Intelligent caching for PAM AI responses to reduce latency and API costs
"""

import hashlib
import json
import time
from typing import Dict, Optional, Any, List, Tuple
from datetime import datetime, timedelta
import asyncio
from dataclasses import dataclass, asdict
import redis.asyncio as redis
from app.core.config import get_settings
from app.core.logging import get_logger

logger = get_logger(__name__)
settings = get_settings()

@dataclass
class CachedResponse:
    """Represents a cached PAM response"""
    query: str
    response: str
    timestamp: float
    hit_count: int = 0
    last_accessed: float = 0
    metadata: Dict[str, Any] = None
    ttl: int = 3600  # Default 1 hour TTL
    
    def is_expired(self) -> bool:
        """Check if cache entry is expired"""
        return (time.time() - self.timestamp) > self.ttl
    
    def to_dict(self) -> Dict:
        """Convert to dictionary for storage"""
        return asdict(self)
    
    @classmethod
    def from_dict(cls, data: Dict) -> 'CachedResponse':
        """Create from dictionary"""
        return cls(**data)

class PAMResponseCache:
    """
    Intelligent caching service for PAM responses
    Uses Redis for distributed caching in production, memory cache as fallback
    """
    
    def __init__(self):
        self.redis_client: Optional[redis.Redis] = None
        self.memory_cache: Dict[str, CachedResponse] = {}
        self.cache_stats = {
            'hits': 0,
            'misses': 0,
            'saves': 0,
            'evictions': 0
        }
        
        # Common queries that should always be cached
        self.common_queries = [
            "hello", "hi", "help", "what can you do",
            "how are you", "good morning", "good evening",
            "thank you", "thanks", "goodbye", "bye"
        ]
        
        # Query patterns for intelligent caching
        self.cacheable_patterns = [
            r"^(what|how|where|when|who|why)\s+is\s+",  # Information queries
            r"^(tell|show|explain|describe)\s+me\s+",  # Explanation queries
            r"^(weather|forecast|temperature)\s+",  # Weather queries
            r"^(directions?|route|navigate)\s+to\s+",  # Navigation queries
            r"^(find|search|look for)\s+",  # Search queries
        ]
        
        # TTL configurations by query type (seconds)
        self.ttl_config = {
            'greeting': 86400,  # 24 hours
            'help': 86400,  # 24 hours
            'weather': 600,  # 10 minutes
            'location': 1800,  # 30 minutes
            'general': 3600,  # 1 hour
            'personal': 0,  # Don't cache personal queries
        }
    
    async def initialize(self):
        """Initialize cache connections"""
        try:
            # Try to connect to Redis if available
            if hasattr(settings, 'REDIS_URL') and settings.REDIS_URL:
                self.redis_client = await redis.from_url(
                    settings.REDIS_URL,
                    encoding="utf-8",
                    decode_responses=True
                )
                await self.redis_client.ping()
                logger.info("✅ PAM Response Cache initialized with Redis")
                
                # Warm cache with common responses
                await self.warm_cache()
            else:
                logger.info("📦 PAM Response Cache using in-memory cache")
        except Exception as e:
            logger.warning(f"⚠️ Redis not available, using in-memory cache: {e}")
            self.redis_client = None
    
    def generate_cache_key(self, query: str, context: Optional[Dict] = None) -> str:
        """Generate a cache key for a query"""
        # Normalize query
        normalized_query = query.lower().strip()
        
        # Add context if provided (but exclude personal data)
        context_str = ""
        if context:
            safe_context = {
                k: v for k, v in context.items()
                if k not in ['user_id', 'session_id', 'auth_token']
            }
            if safe_context:
                context_str = json.dumps(safe_context, sort_keys=True)
        
        # Generate hash
        content = f"{normalized_query}:{context_str}"
        return f"pam:cache:{hashlib.md5(content.encode()).hexdigest()}"
    
    def classify_query(self, query: str) -> Tuple[str, int]:
        """Classify query type and return appropriate TTL"""
        query_lower = query.lower().strip()
        
        # Check for greetings
        if any(greeting in query_lower for greeting in ['hello', 'hi', 'hey', 'morning', 'evening']):
            return 'greeting', self.ttl_config['greeting']
        
        # Check for help queries
        if any(help_word in query_lower for help_word in ['help', 'what can you do', 'commands', 'features']):
            return 'help', self.ttl_config['help']
        
        # Check for weather queries
        if any(weather_word in query_lower for weather_word in ['weather', 'forecast', 'temperature', 'rain', 'snow']):
            return 'weather', self.ttl_config['weather']
        
        # Check for location queries
        if any(location_word in query_lower for location_word in ['near', 'nearby', 'around', 'location', 'where']):
            return 'location', self.ttl_config['location']
        
        # Check for personal queries (don't cache these)
        if any(personal_word in query_lower for personal_word in ['my', 'me', 'i ', "i'm", 'mine']):
            return 'personal', self.ttl_config['personal']
        
        # Default to general
        return 'general', self.ttl_config['general']
    
    async def get(self, query: str, context: Optional[Dict] = None) -> Optional[str]:
        """Get cached response for a query"""
        cache_key = self.generate_cache_key(query, context)
        
        try:
            # Try Redis first
            if self.redis_client:
                cached_data = await self.redis_client.get(cache_key)
                if cached_data:
                    cached_response = CachedResponse.from_dict(json.loads(cached_data))
                    
                    # Check if expired
                    if not cached_response.is_expired():
                        # Update stats
                        cached_response.hit_count += 1
                        cached_response.last_accessed = time.time()
                        
                        # Update in Redis
                        await self.redis_client.set(
                            cache_key,
                            json.dumps(cached_response.to_dict()),
                            ex=cached_response.ttl
                        )
                        
                        self.cache_stats['hits'] += 1
                        logger.debug(f"✅ Cache hit for query: {query[:50]}...")
                        return cached_response.response
                    else:
                        # Remove expired entry
                        await self.redis_client.delete(cache_key)
                        self.cache_stats['evictions'] += 1
            
            # Fallback to memory cache
            elif cache_key in self.memory_cache:
                cached_response = self.memory_cache[cache_key]
                
                if not cached_response.is_expired():
                    cached_response.hit_count += 1
                    cached_response.last_accessed = time.time()
                    self.cache_stats['hits'] += 1
                    logger.debug(f"✅ Memory cache hit for query: {query[:50]}...")
                    return cached_response.response
                else:
                    # Remove expired entry
                    del self.memory_cache[cache_key]
                    self.cache_stats['evictions'] += 1
            
        except Exception as e:
            logger.error(f"Cache get error: {e}")
        
        self.cache_stats['misses'] += 1
        logger.debug(f"❌ Cache miss for query: {query[:50]}...")
        return None
    
    async def set(self, query: str, response: str, context: Optional[Dict] = None, ttl: Optional[int] = None):
        """Cache a PAM response"""
        # Classify query to determine if it should be cached
        query_type, default_ttl = self.classify_query(query)
        
        # Don't cache personal queries
        if query_type == 'personal':
            logger.debug(f"⏭️ Skipping cache for personal query: {query[:50]}...")
            return
        
        cache_key = self.generate_cache_key(query, context)
        ttl = ttl or default_ttl
        
        cached_response = CachedResponse(
            query=query,
            response=response,
            timestamp=time.time(),
            last_accessed=time.time(),
            metadata={'type': query_type, 'context': context},
            ttl=ttl
        )
        
        try:
            # Store in Redis if available
            if self.redis_client:
                await self.redis_client.set(
                    cache_key,
                    json.dumps(cached_response.to_dict()),
                    ex=ttl
                )
                logger.debug(f"💾 Cached response in Redis (TTL: {ttl}s): {query[:50]}...")
            else:
                # Store in memory cache
                self.memory_cache[cache_key] = cached_response
                
                # Implement simple LRU eviction if cache gets too large
                if len(self.memory_cache) > 1000:
                    # Remove oldest entries
                    sorted_entries = sorted(
                        self.memory_cache.items(),
                        key=lambda x: x[1].last_accessed
                    )
                    for key, _ in sorted_entries[:100]:
                        del self.memory_cache[key]
                        self.cache_stats['evictions'] += 1
                
                logger.debug(f"💾 Cached response in memory (TTL: {ttl}s): {query[:50]}...")
            
            self.cache_stats['saves'] += 1
            
        except Exception as e:
            logger.error(f"Cache set error: {e}")
    
    async def invalidate(self, pattern: Optional[str] = None):
        """Invalidate cached responses matching a pattern"""
        try:
            if self.redis_client:
                if pattern:
                    # Invalidate matching keys
                    keys = await self.redis_client.keys(f"pam:cache:*{pattern}*")
                    if keys:
                        await self.redis_client.delete(*keys)
                        logger.info(f"🗑️ Invalidated {len(keys)} cache entries matching: {pattern}")
                else:
                    # Invalidate all PAM cache
                    keys = await self.redis_client.keys("pam:cache:*")
                    if keys:
                        await self.redis_client.delete(*keys)
                        logger.info(f"🗑️ Invalidated all {len(keys)} PAM cache entries")
            else:
                # Clear memory cache
                if pattern:
                    keys_to_delete = [
                        k for k in self.memory_cache.keys()
                        if pattern in self.memory_cache[k].query
                    ]
                    for key in keys_to_delete:
                        del self.memory_cache[key]
                    logger.info(f"🗑️ Invalidated {len(keys_to_delete)} memory cache entries")
                else:
                    self.memory_cache.clear()
                    logger.info("🗑️ Cleared all memory cache")
                    
        except Exception as e:
            logger.error(f"Cache invalidation error: {e}")
    
    async def warm_cache(self):
        """Pre-populate cache with common responses"""
        common_responses = {
            "hello": "Hello! I'm PAM, your Personal AI Manager. How can I assist you today?",
            "hi": "Hi there! I'm PAM, ready to help with your travel planning and more. What can I do for you?",
            "help": "I can help you with:\n• Trip planning and navigation\n• Weather and travel conditions\n• Expense tracking\n• Finding places and attractions\n• Community connections\n\nJust ask me anything!",
            "what can you do": "I'm PAM, your AI assistant! I can help with trip planning, weather updates, expense tracking, finding locations, and much more. Just tell me what you need!",
            "thank you": "You're welcome! Is there anything else I can help you with?",
            "thanks": "You're welcome! Let me know if you need anything else!",
            "goodbye": "Goodbye! Have a great day and safe travels!",
            "bye": "See you later! Feel free to come back anytime you need assistance!",
        }
        
        for query, response in common_responses.items():
            await self.set(query, response, ttl=86400)  # Cache for 24 hours
        
        logger.info(f"🔥 Warmed cache with {len(common_responses)} common responses")
    
    def get_stats(self) -> Dict[str, Any]:
        """Get cache statistics"""
        total_requests = self.cache_stats['hits'] + self.cache_stats['misses']
        hit_rate = (self.cache_stats['hits'] / total_requests * 100) if total_requests > 0 else 0
        
        return {
            'hits': self.cache_stats['hits'],
            'misses': self.cache_stats['misses'],
            'saves': self.cache_stats['saves'],
            'evictions': self.cache_stats['evictions'],
            'hit_rate': f"{hit_rate:.1f}%",
            'total_requests': total_requests,
            'cache_type': 'Redis' if self.redis_client else 'Memory',
            'memory_entries': len(self.memory_cache) if not self.redis_client else 0
        }
    
    async def cleanup(self):
        """Clean up expired entries"""
        try:
            if self.redis_client:
                # Redis handles expiration automatically
                pass
            else:
                # Clean up memory cache
                expired_keys = [
                    k for k, v in self.memory_cache.items()
                    if v.is_expired()
                ]
                for key in expired_keys:
                    del self.memory_cache[key]
                    self.cache_stats['evictions'] += 1
                
                if expired_keys:
                    logger.info(f"🧹 Cleaned up {len(expired_keys)} expired cache entries")
                    
        except Exception as e:
            logger.error(f"Cache cleanup error: {e}")

# Singleton instance
pam_response_cache = PAMResponseCache()

# Export for use in PAM services
__all__ = ['PAMResponseCache', 'pam_response_cache', 'CachedResponse']