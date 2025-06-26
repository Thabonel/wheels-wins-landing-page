
"""
Performance Middleware
Compression, caching, and optimization middleware.
"""

import gzip
import time
from typing import Callable
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response, StreamingResponse
from starlette.middleware.gzip import GZipMiddleware
from app.core.logging import setup_logging
from app.services.cache_service import get_cache

logger = setup_logging()

class PerformanceMiddleware(BaseHTTPMiddleware):
    """Custom performance monitoring and optimization middleware"""
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        # Start timing
        start_time = time.time()
        
        # Add request ID for tracing
        request_id = f"{int(start_time * 1000)}-{id(request)}"
        
        # Log request start
        logger.info(f"Request started: {request.method} {request.url.path} [{request_id}]")
        
        # Process request
        response = await call_next(request)
        
        # Calculate response time
        process_time = time.time() - start_time
        
        # Add performance headers
        response.headers["X-Process-Time"] = str(process_time)
        response.headers["X-Request-ID"] = request_id
        
        # Log request completion
        logger.info(f"Request completed: {request.method} {request.url.path} "
                   f"[{request_id}] - {response.status_code} - {process_time:.4f}s")
        
        # Log slow requests
        if process_time > 1.0:
            logger.warning(f"Slow request detected: {request.method} {request.url.path} "
                          f"took {process_time:.4f}s")
        
        return response

class CacheMiddleware(BaseHTTPMiddleware):
    """Response caching middleware for GET requests"""
    
    def __init__(self, app, cache_ttl: int = 300):
        super().__init__(app)
        self.cache_ttl = cache_ttl
        self.cacheable_paths = [
            "/api/camping-locations",
            "/api/fuel-stations",
            "/api/local-events",
            "/api/marketplace",
            "/api/shop/products"
        ]
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        # Only cache GET requests for specific paths
        if (request.method != "GET" or 
            not any(request.url.path.startswith(path) for path in self.cacheable_paths)):
            return await call_next(request)
        
        # Generate cache key
        cache_key = f"response:{request.url.path}:{str(request.query_params)}"
        
        try:
            cache = await get_cache()
            
            # Try to get cached response
            cached_data = await cache.get(cache_key)
            if cached_data:
                logger.debug(f"Cache hit for {request.url.path}")
                return Response(
                    content=cached_data["content"],
                    status_code=cached_data["status_code"],
                    headers=dict(cached_data["headers"], **{"X-Cache": "HIT"})
                )
            
            # Process request
            response = await call_next(request)
            
            # Cache successful responses
            if response.status_code == 200:
                # Read response content
                response_body = b""
                async for chunk in response.body_iterator:
                    response_body += chunk
                
                # Cache the response
                cache_data = {
                    "content": response_body.decode(),
                    "status_code": response.status_code,
                    "headers": dict(response.headers)
                }
                
                await cache.set(cache_key, cache_data, ttl=self.cache_ttl)
                
                # Return response with cache header
                response = Response(
                    content=response_body,
                    status_code=response.status_code,
                    headers=dict(response.headers, **{"X-Cache": "MISS"})
                )
                
                logger.debug(f"Response cached for {request.url.path}")
            
            return response
            
        except Exception as e:
            logger.warning(f"Cache middleware error: {e}")
            return await call_next(request)

class CompressionMiddleware(BaseHTTPMiddleware):
    """Advanced compression middleware with multiple algorithms"""
    
    def __init__(self, app, minimum_size: int = 1024):
        super().__init__(app)
        self.minimum_size = minimum_size
        self.compressible_types = {
            "application/json",
            "application/javascript",
            "text/html",
            "text/css",
            "text/plain",
            "text/xml",
            "application/xml"
        }
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        response = await call_next(request)
        
        # Check if compression is needed
        if not self._should_compress(request, response):
            return response
        
        # Get response content
        if isinstance(response, StreamingResponse):
            # Don't compress streaming responses
            return response
        
        # Read response body
        response_body = b""
        async for chunk in response.body_iterator:
            response_body += chunk
        
        # Check minimum size
        if len(response_body) < self.minimum_size:
            return Response(
                content=response_body,
                status_code=response.status_code,
                headers=response.headers
            )
        
        # Compress content
        compressed_body = gzip.compress(response_body)
        
        # Update headers
        headers = dict(response.headers)
        headers["Content-Encoding"] = "gzip"
        headers["Content-Length"] = str(len(compressed_body))
        headers["Vary"] = "Accept-Encoding"
        
        logger.debug(f"Response compressed: {len(response_body)} -> {len(compressed_body)} bytes "
                    f"({(1 - len(compressed_body) / len(response_body)) * 100:.1f}% reduction)")
        
        return Response(
            content=compressed_body,
            status_code=response.status_code,
            headers=headers
        )
    
    def _should_compress(self, request: Request, response: Response) -> bool:
        """Check if response should be compressed"""
        # Check if client accepts gzip
        accept_encoding = request.headers.get("accept-encoding", "")
        if "gzip" not in accept_encoding.lower():
            return False
        
        # Check if already compressed
        if response.headers.get("content-encoding"):
            return False
        
        # Check content type
        content_type = response.headers.get("content-type", "").split(";")[0]
        if content_type not in self.compressible_types:
            return False
        
        return True

def setup_middleware(app):
    """Setup all performance middleware"""
    # Add compression middleware (outermost)
    app.add_middleware(CompressionMiddleware, minimum_size=1024)
    
    # Add cache middleware
    app.add_middleware(CacheMiddleware, cache_ttl=300)
    
    # Add performance monitoring middleware (innermost)
    app.add_middleware(PerformanceMiddleware)
    
    logger.info("Performance middleware configured")
