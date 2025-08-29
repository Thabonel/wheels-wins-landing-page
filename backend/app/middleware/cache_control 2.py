"""
Cache Control Middleware for Render Edge Caching
Implements intelligent caching strategies for different endpoint types
"""

from typing import Optional, Dict, Any, Callable
from fastapi import Request, Response
from fastapi.responses import JSONResponse
import hashlib
import json
import time
from datetime import datetime, timedelta

class CacheControlMiddleware:
    """
    Middleware to add cache control headers for Render Edge CDN
    """
    
    # Cache duration configurations (in seconds)
    CACHE_DURATIONS = {
        # Static assets - long cache
        '/static': 2592000,  # 30 days
        '/assets': 2592000,  # 30 days
        '/images': 2592000,  # 30 days
        
        # API endpoints - varied cache times
        '/api/v1/weather': 600,  # 10 minutes
        '/api/v1/locations': 1800,  # 30 minutes
        '/api/v1/trips/templates': 21600,  # 6 hours
        '/api/v1/pam/common': 3600,  # 1 hour
        '/api/v1/places': 3600,  # 1 hour
        '/api/v1/routes/popular': 7200,  # 2 hours
        
        # Short cache for dynamic but relatively stable data
        '/api/v1/community/trending': 300,  # 5 minutes
        '/api/v1/tips': 900,  # 15 minutes
        '/api/v1/shop/featured': 1800,  # 30 minutes
        
        # No cache for personal/real-time data
        '/api/v1/users': 0,
        '/api/v1/auth': 0,
        '/api/v1/pam/ws': 0,  # WebSocket
        '/api/v1/expenses': 0,
        '/api/v1/income': 0,
        '/api/v1/settings': 0,
    }
    
    # Stale-while-revalidate times (in seconds)
    STALE_WHILE_REVALIDATE = {
        '/api/v1/weather': 60,  # 1 minute
        '/api/v1/locations': 300,  # 5 minutes
        '/api/v1/pam/common': 600,  # 10 minutes
    }
    
    def __init__(self, app=None):
        self.app = app
        
    def get_cache_duration(self, path: str) -> int:
        """
        Determine cache duration based on path patterns
        """
        # Check exact matches first
        for pattern, duration in self.CACHE_DURATIONS.items():
            if path.startswith(pattern):
                return duration
        
        # Default to no cache for unmatched paths
        return 0
    
    def get_stale_while_revalidate(self, path: str) -> Optional[int]:
        """
        Get stale-while-revalidate time for path
        """
        for pattern, swr_time in self.STALE_WHILE_REVALIDATE.items():
            if path.startswith(pattern):
                return swr_time
        return None
    
    def generate_etag(self, content: Any) -> str:
        """
        Generate ETag for response content
        """
        if isinstance(content, dict):
            content_str = json.dumps(content, sort_keys=True)
        else:
            content_str = str(content)
        
        return hashlib.md5(content_str.encode()).hexdigest()
    
    def should_cache(self, request: Request, response: Response) -> bool:
        """
        Determine if response should be cached
        """
        # Don't cache if explicitly disabled
        if response.headers.get('X-No-Cache') == 'true':
            return False
        
        # Only cache successful responses
        if response.status_code not in [200, 201, 204]:
            return False
        
        # Don't cache if user-specific
        if request.headers.get('Authorization'):
            # Check if endpoint allows caching with auth
            path = str(request.url.path)
            if not path.startswith(('/api/v1/weather', '/api/v1/locations', '/api/v1/places')):
                return False
        
        return True
    
    def add_cache_headers(self, request: Request, response: Response) -> Response:
        """
        Add appropriate cache control headers to response
        """
        path = str(request.url.path)
        
        # Skip if already has cache headers
        if 'Cache-Control' in response.headers:
            return response
        
        # Check if should cache
        if not self.should_cache(request, response):
            response.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate'
            response.headers['Pragma'] = 'no-cache'
            response.headers['Expires'] = '0'
            return response
        
        # Get cache duration
        cache_duration = self.get_cache_duration(path)
        
        if cache_duration > 0:
            # Build cache control header
            cache_parts = [f'public, max-age={cache_duration}']
            
            # Add stale-while-revalidate if applicable
            swr_time = self.get_stale_while_revalidate(path)
            if swr_time:
                cache_parts.append(f'stale-while-revalidate={swr_time}')
            
            # Add immutable for static assets
            if path.startswith(('/static', '/assets', '/images')):
                cache_parts.append('immutable')
            
            response.headers['Cache-Control'] = ', '.join(cache_parts)
            
            # Add ETag for conditional requests
            if hasattr(response, 'body'):
                etag = self.generate_etag(response.body)
                response.headers['ETag'] = f'"{etag}"'
            
            # Add Vary header for content negotiation
            vary_headers = []
            if 'Accept-Encoding' in request.headers:
                vary_headers.append('Accept-Encoding')
            if 'Accept-Language' in request.headers:
                vary_headers.append('Accept-Language')
            if vary_headers:
                response.headers['Vary'] = ', '.join(vary_headers)
            
            # Add CDN cache tag for targeted purging
            response.headers['X-Cache-Tag'] = self._get_cache_tag(path)
            
            # Add timestamp for debugging
            response.headers['X-Cache-Date'] = datetime.utcnow().isoformat()
        else:
            # No cache for this endpoint
            response.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate'
        
        return response
    
    def _get_cache_tag(self, path: str) -> str:
        """
        Generate cache tag for targeted cache purging
        """
        # Extract resource type from path
        parts = path.strip('/').split('/')
        
        if len(parts) >= 3:
            # e.g., "api-v1-weather" from "/api/v1/weather"
            return '-'.join(parts[:3])
        elif len(parts) >= 1:
            # e.g., "static" from "/static/..."
            return parts[0]
        
        return 'general'
    
    async def __call__(self, request: Request, call_next: Callable) -> Response:
        """
        Process request and add cache headers to response
        """
        # Check for conditional request
        if_none_match = request.headers.get('If-None-Match')
        
        # Process request
        response = await call_next(request)
        
        # Add cache headers
        response = self.add_cache_headers(request, response)
        
        # Handle conditional requests
        if if_none_match and 'ETag' in response.headers:
            if if_none_match == response.headers['ETag']:
                # Return 304 Not Modified
                return Response(status_code=304, headers=dict(response.headers))
        
        return response


class CacheKeyGenerator:
    """
    Generate cache keys for dynamic content
    """
    
    @staticmethod
    def generate(request: Request, include_auth: bool = False) -> str:
        """
        Generate a cache key based on request parameters
        """
        key_parts = [
            request.url.path,
            str(request.url.query) if request.url.query else ''
        ]
        
        # Include specific headers if needed
        if include_auth and request.headers.get('Authorization'):
            # Hash the auth token to include user-specific caching
            auth_hash = hashlib.md5(
                request.headers['Authorization'].encode()
            ).hexdigest()[:8]
            key_parts.append(f'u:{auth_hash}')
        
        # Include accept language for localized content
        if request.headers.get('Accept-Language'):
            key_parts.append(f"lang:{request.headers['Accept-Language'][:2]}")
        
        # Generate final key
        return ':'.join(filter(None, key_parts))


class CachePurger:
    """
    Utility for purging cached content
    """
    
    @staticmethod
    async def purge_by_tag(tag: str) -> bool:
        """
        Purge cache by tag (requires Render API integration)
        """
        # TODO: Implement Render CDN purge API call
        # This would make an API call to Render's purge endpoint
        print(f"Cache purge requested for tag: {tag}")
        return True
    
    @staticmethod
    async def purge_by_path(path: str) -> bool:
        """
        Purge cache by path pattern
        """
        # TODO: Implement Render CDN purge API call
        print(f"Cache purge requested for path: {path}")
        return True
    
    @staticmethod
    async def purge_all() -> bool:
        """
        Purge entire cache (use sparingly)
        """
        # TODO: Implement Render CDN purge API call
        print("Full cache purge requested")
        return True


# Export middleware instance
cache_middleware = CacheControlMiddleware()