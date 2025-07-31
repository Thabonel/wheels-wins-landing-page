"""
Custom CORS Middleware for Enhanced OPTIONS Handling
Provides fallback OPTIONS handling and comprehensive CORS debugging
"""

import time
from typing import Callable, Dict, Tuple
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response as StarletteResponse

from app.core.cors_config import cors_config
from app.core.logging import get_logger

logger = get_logger(__name__)

# Performance optimization: Cache CORS responses
_cors_response_cache: Dict[str, Tuple[StarletteResponse, float]] = {}
_cache_ttl = 60  # 1 minute cache for CORS responses


class EnhancedCORSMiddleware(BaseHTTPMiddleware):
    """
    Enhanced CORS middleware that provides:
    - Fallback OPTIONS handling for any endpoint
    - Comprehensive CORS logging and debugging
    - Request/response timing for CORS calls
    - Origin validation and blocking
    """
    
    def __init__(self, app, **kwargs):
        super().__init__(app)
        self.cors_stats = {
            "preflight_requests": 0,
            "blocked_origins": 0,
            "successful_cors": 0,
            "fallback_options": 0
        }
        
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        # Record start time for performance monitoring
        start_time = time.time()
        
        # Get origin from request
        origin = request.headers.get("origin", "No origin header")
        
        # Handle OPTIONS preflight requests with caching
        if request.method == "OPTIONS":
            self.cors_stats["preflight_requests"] += 1
            
            # Check cache for CORS response
            cache_key = f"{origin}:{request.url.path}"
            current_time = time.time()
            
            if cache_key in _cors_response_cache:
                cached_response, cache_time = _cors_response_cache[cache_key]
                if current_time - cache_time < _cache_ttl:
                    # Return cached response
                    logger.debug(f"🚀 CORS cache hit for {cache_key}")
                    return cached_response
            
            # Log the preflight request
            logger.info(
                f"🔍 CORS preflight: {request.method} {request.url.path} "
                f"from origin: {origin}"
            )
            
            # Check if origin is allowed
            is_allowed = cors_config.is_origin_allowed(origin) if origin != "No origin header" else False
            
            if not is_allowed and origin != "No origin header":
                self.cors_stats["blocked_origins"] += 1
                cors_config.log_cors_debug(origin, request.url.path, False)
                
                # Return blocked response
                response = StarletteResponse(
                    content='{"error": "Origin not allowed", "origin": "' + origin + '"}',
                    status_code=403,
                    media_type="application/json"
                )
                return response
            
            # Try to process the request normally first
            try:
                response = await call_next(request)
                
                # If we get a 400, 404 or 405, it means no OPTIONS handler exists
                # Provide fallback OPTIONS response
                if response.status_code in [400, 404, 405]:
                    self.cors_stats["fallback_options"] += 1
                    logger.info(
                        f"🔧 Providing fallback OPTIONS response for {request.url.path} (was {response.status_code})"
                    )
                    
                    response = cors_config.create_options_response(
                        origin=origin if is_allowed else None,
                        requested_method=request.headers.get("access-control-request-method"),
                        requested_headers=request.headers.get("access-control-request-headers"),
                        cache_bust=True
                    )
                    
                    # Cache the response for performance
                    _cors_response_cache[cache_key] = (response, current_time)
                    
                else:
                    self.cors_stats["successful_cors"] += 1
                    
                    # Cache successful CORS responses too
                    _cors_response_cache[cache_key] = (response, current_time)
                    
            except Exception as e:
                logger.error(f"❌ Error processing OPTIONS request: {e}")
                # Provide fallback response on error
                response = cors_config.create_options_response(
                    origin=origin if is_allowed else None,
                    cache_bust=True
                )
                self.cors_stats["fallback_options"] += 1
                
        else:
            # Process non-OPTIONS requests normally
            try:
                response = await call_next(request)
                
                # Add CORS debugging for non-OPTIONS requests if origin is provided
                if origin != "No origin header":
                    is_allowed = cors_config.is_origin_allowed(origin)
                    cors_config.log_cors_debug(origin, request.url.path, is_allowed)
                    
            except Exception as e:
                logger.error(f"❌ Error processing request: {e}")
                raise
        
        # Calculate processing time
        process_time = time.time() - start_time
        
        # Add timing header
        response.headers["X-CORS-Process-Time"] = f"{process_time:.4f}"
        
        # Clean up old cache entries periodically (every 100 requests)
        if self.cors_stats["preflight_requests"] % 100 == 0:
            await self._cleanup_cors_cache()
        
        # Log slow CORS processing
        if process_time > 0.1:  # 100ms threshold
            logger.warning(
                f"🐌 Slow CORS processing: {request.method} {request.url.path} "
                f"took {process_time:.4f}s"
            )
            
        return response
        
    async def _cleanup_cors_cache(self):
        """Clean up expired CORS cache entries to prevent memory buildup"""
        try:
            current_time = time.time()
            expired_keys = []
            
            for cache_key, (cached_response, cache_time) in _cors_response_cache.items():
                if current_time - cache_time >= _cache_ttl:
                    expired_keys.append(cache_key)
            
            # Remove expired entries
            for key in expired_keys:
                del _cors_response_cache[key]
            
            if expired_keys:
                logger.debug(f"🧹 Cleaned up {len(expired_keys)} expired CORS cache entries")
                
        except Exception as e:
            logger.error(f"❌ CORS cache cleanup error: {e}")
    
    def get_stats(self) -> dict:
        """Get CORS middleware statistics"""
        return {
            **self.cors_stats,
            "allowed_origins_count": len(cors_config.origins),
            "allowed_origins": cors_config.origins[:5],  # First 5 for brevity
            "cache_entries": len(_cors_response_cache),
            "cache_hit_ratio": self._calculate_cache_hit_ratio()
        }
    
    def _calculate_cache_hit_ratio(self) -> float:
        """Calculate CORS cache hit ratio for performance monitoring"""
        total_requests = self.cors_stats["preflight_requests"]
        if total_requests == 0:
            return 0.0
        
        # Estimate cache hits based on cache usage patterns
        # This is a simplified calculation - in production you'd track actual hits
        cache_usage_estimate = min(len(_cors_response_cache) * 2, total_requests)
        return round(cache_usage_estimate / total_requests, 2) if total_requests > 0 else 0.0


class CORSDebugMiddleware(BaseHTTPMiddleware):
    """
    Lightweight CORS debugging middleware
    Logs all CORS-related headers and responses
    """
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        origin = request.headers.get("origin")
        
        # Log incoming CORS request details
        if origin or request.method == "OPTIONS":
            cors_headers = {
                key: value for key, value in request.headers.items()
                if key.lower().startswith(('origin', 'access-control', 'sec-fetch'))
            }
            
            logger.debug(
                f"🔍 CORS Request: {request.method} {request.url.path}\n"
                f"   Origin: {origin}\n"
                f"   CORS Headers: {cors_headers}"
            )
        
        # Process request
        response = await call_next(request)
        
        # Log outgoing CORS response details
        if origin or request.method == "OPTIONS":
            cors_response_headers = {
                key: value for key, value in response.headers.items()
                if key.lower().startswith('access-control')
            }
            
            logger.debug(
                f"🔍 CORS Response: {response.status_code}\n"
                f"   CORS Headers: {cors_response_headers}"
            )
            
        return response