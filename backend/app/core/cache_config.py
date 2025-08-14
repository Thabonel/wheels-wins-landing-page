"""
Cache Configuration for Render Edge CDN
Centralized cache policies and strategies
"""

from enum import Enum
from typing import Dict, Optional, List
from dataclasses import dataclass
from datetime import timedelta

class CacheStrategy(Enum):
    """Cache strategies for different content types"""
    NO_CACHE = "no-cache"
    PRIVATE = "private"
    PUBLIC = "public"
    IMMUTABLE = "immutable"
    DYNAMIC = "dynamic"

@dataclass
class CachePolicy:
    """Defines caching policy for an endpoint"""
    strategy: CacheStrategy
    max_age: int  # seconds
    stale_while_revalidate: Optional[int] = None  # seconds
    stale_if_error: Optional[int] = None  # seconds
    must_revalidate: bool = False
    proxy_revalidate: bool = False
    no_transform: bool = False
    vary_headers: List[str] = None
    cache_tags: List[str] = None
    
    def to_header(self) -> str:
        """Convert policy to Cache-Control header value"""
        parts = []
        
        if self.strategy == CacheStrategy.NO_CACHE:
            return "no-cache, no-store, must-revalidate"
        
        if self.strategy == CacheStrategy.PRIVATE:
            parts.append("private")
        elif self.strategy == CacheStrategy.PUBLIC:
            parts.append("public")
        elif self.strategy == CacheStrategy.IMMUTABLE:
            parts.append("public")
            parts.append("immutable")
        
        parts.append(f"max-age={self.max_age}")
        
        if self.stale_while_revalidate:
            parts.append(f"stale-while-revalidate={self.stale_while_revalidate}")
        
        if self.stale_if_error:
            parts.append(f"stale-if-error={self.stale_if_error}")
        
        if self.must_revalidate:
            parts.append("must-revalidate")
        
        if self.proxy_revalidate:
            parts.append("proxy-revalidate")
        
        if self.no_transform:
            parts.append("no-transform")
        
        return ", ".join(parts)

class CachePolicies:
    """Predefined cache policies for different endpoint types"""
    
    # Static assets - aggressive caching
    STATIC_ASSETS = CachePolicy(
        strategy=CacheStrategy.IMMUTABLE,
        max_age=2592000,  # 30 days
        cache_tags=["static"]
    )
    
    # Images and media
    MEDIA = CachePolicy(
        strategy=CacheStrategy.PUBLIC,
        max_age=604800,  # 7 days
        stale_while_revalidate=86400,  # 1 day
        cache_tags=["media"]
    )
    
    # Weather data - short cache with revalidation
    WEATHER = CachePolicy(
        strategy=CacheStrategy.PUBLIC,
        max_age=600,  # 10 minutes
        stale_while_revalidate=60,  # 1 minute
        stale_if_error=300,  # 5 minutes
        cache_tags=["weather", "api"]
    )
    
    # Location data - moderate cache
    LOCATIONS = CachePolicy(
        strategy=CacheStrategy.PUBLIC,
        max_age=1800,  # 30 minutes
        stale_while_revalidate=300,  # 5 minutes
        cache_tags=["locations", "api"]
    )
    
    # Trip templates - longer cache
    TRIP_TEMPLATES = CachePolicy(
        strategy=CacheStrategy.PUBLIC,
        max_age=21600,  # 6 hours
        stale_while_revalidate=3600,  # 1 hour
        cache_tags=["trips", "templates", "api"]
    )
    
    # PAM common responses
    PAM_COMMON = CachePolicy(
        strategy=CacheStrategy.PUBLIC,
        max_age=3600,  # 1 hour
        stale_while_revalidate=600,  # 10 minutes
        vary_headers=["Accept-Language"],
        cache_tags=["pam", "common", "api"]
    )
    
    # Community content - short cache
    COMMUNITY = CachePolicy(
        strategy=CacheStrategy.PUBLIC,
        max_age=300,  # 5 minutes
        stale_while_revalidate=60,  # 1 minute
        cache_tags=["community", "api"]
    )
    
    # User-specific data - no public cache
    USER_DATA = CachePolicy(
        strategy=CacheStrategy.PRIVATE,
        max_age=0,
        must_revalidate=True,
        cache_tags=["user", "private"]
    )
    
    # Authentication - never cache
    AUTH = CachePolicy(
        strategy=CacheStrategy.NO_CACHE,
        max_age=0,
        cache_tags=["auth"]
    )
    
    # Real-time data - no cache
    REALTIME = CachePolicy(
        strategy=CacheStrategy.NO_CACHE,
        max_age=0,
        cache_tags=["realtime"]
    )

class EndpointCacheConfig:
    """Maps endpoints to their cache policies"""
    
    ENDPOINT_POLICIES: Dict[str, CachePolicy] = {
        # Static content
        "/static": CachePolicies.STATIC_ASSETS,
        "/assets": CachePolicies.STATIC_ASSETS,
        "/fonts": CachePolicies.STATIC_ASSETS,
        "/images": CachePolicies.MEDIA,
        "/media": CachePolicies.MEDIA,
        
        # API endpoints
        "/api/v1/weather": CachePolicies.WEATHER,
        "/api/v1/locations": CachePolicies.LOCATIONS,
        "/api/v1/places": CachePolicies.LOCATIONS,
        "/api/v1/trips/templates": CachePolicies.TRIP_TEMPLATES,
        "/api/v1/trips/popular": CachePolicies.TRIP_TEMPLATES,
        "/api/v1/pam/common": CachePolicies.PAM_COMMON,
        "/api/v1/pam/help": CachePolicies.PAM_COMMON,
        "/api/v1/community/trending": CachePolicies.COMMUNITY,
        "/api/v1/community/featured": CachePolicies.COMMUNITY,
        "/api/v1/tips": CachePolicies.COMMUNITY,
        "/api/v1/shop/featured": CachePolicies.COMMUNITY,
        
        # User-specific endpoints
        "/api/v1/users": CachePolicies.USER_DATA,
        "/api/v1/profile": CachePolicies.USER_DATA,
        "/api/v1/settings": CachePolicies.USER_DATA,
        "/api/v1/expenses": CachePolicies.USER_DATA,
        "/api/v1/income": CachePolicies.USER_DATA,
        "/api/v1/trips/my": CachePolicies.USER_DATA,
        
        # Authentication endpoints
        "/api/v1/auth": CachePolicies.AUTH,
        "/api/v1/login": CachePolicies.AUTH,
        "/api/v1/logout": CachePolicies.AUTH,
        "/api/v1/refresh": CachePolicies.AUTH,
        
        # Real-time endpoints
        "/api/v1/pam/ws": CachePolicies.REALTIME,
        "/api/v1/chat": CachePolicies.REALTIME,
        "/api/v1/notifications": CachePolicies.REALTIME,
    }
    
    @classmethod
    def get_policy(cls, path: str) -> Optional[CachePolicy]:
        """Get cache policy for a given path"""
        # Check exact match first
        if path in cls.ENDPOINT_POLICIES:
            return cls.ENDPOINT_POLICIES[path]
        
        # Check prefix matches
        for endpoint, policy in cls.ENDPOINT_POLICIES.items():
            if path.startswith(endpoint):
                return policy
        
        # Default to no cache for unknown endpoints
        return CachePolicies.AUTH

class CacheWarming:
    """Configuration for cache warming strategies"""
    
    # Endpoints to warm on startup
    WARM_ON_STARTUP = [
        "/api/v1/pam/common/greetings",
        "/api/v1/pam/common/help",
        "/api/v1/trips/templates/popular",
        "/api/v1/locations/featured",
        "/api/v1/community/trending",
    ]
    
    # Endpoints to warm periodically
    PERIODIC_WARM = {
        "/api/v1/weather": timedelta(minutes=8),  # Warm before 10-min expiry
        "/api/v1/locations/popular": timedelta(minutes=25),  # Warm before 30-min expiry
        "/api/v1/pam/common": timedelta(minutes=50),  # Warm before 1-hour expiry
    }
    
    # Endpoints to warm based on usage patterns
    USAGE_BASED_WARM = {
        "morning": [  # 6 AM - 10 AM
            "/api/v1/weather",
            "/api/v1/trips/today",
            "/api/v1/pam/common/morning",
        ],
        "evening": [  # 5 PM - 9 PM
            "/api/v1/trips/templates",
            "/api/v1/community/trending",
            "/api/v1/tips",
        ],
        "weekend": [  # Saturday & Sunday
            "/api/v1/trips/templates/weekend",
            "/api/v1/locations/recreational",
            "/api/v1/shop/featured",
        ]
    }

class CacheInvalidation:
    """Configuration for cache invalidation strategies"""
    
    # Events that trigger cache invalidation
    INVALIDATION_TRIGGERS = {
        "weather_update": ["weather"],
        "location_change": ["locations", "weather"],
        "trip_created": ["trips", "community"],
        "trip_updated": ["trips"],
        "community_post": ["community"],
        "shop_update": ["shop"],
        "pam_training": ["pam"],
    }
    
    # Cascade invalidation rules
    CASCADE_RULES = {
        "user": ["trips", "expenses", "income", "profile"],
        "trips": ["community", "trending"],
        "weather": ["trips", "pam"],
    }
    
    @classmethod
    def get_tags_to_invalidate(cls, event: str) -> List[str]:
        """Get cache tags to invalidate for an event"""
        tags = set()
        
        # Get direct tags
        if event in cls.INVALIDATION_TRIGGERS:
            tags.update(cls.INVALIDATION_TRIGGERS[event])
        
        # Add cascade tags
        for tag in list(tags):
            if tag in cls.CASCADE_RULES:
                tags.update(cls.CASCADE_RULES[tag])
        
        return list(tags)

# Singleton instances
cache_policies = CachePolicies()
endpoint_config = EndpointCacheConfig()
cache_warming = CacheWarming()
cache_invalidation = CacheInvalidation()