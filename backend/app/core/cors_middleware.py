"""
Custom CORS Middleware for Enhanced OPTIONS Handling
Provides fallback OPTIONS handling and comprehensive CORS debugging
"""

import time
from typing import Callable
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response as StarletteResponse

from app.core.cors_config import cors_config
from app.core.logging import get_logger

logger = get_logger(__name__)


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
        
        # Handle OPTIONS preflight requests
        if request.method == "OPTIONS":
            self.cors_stats["preflight_requests"] += 1
            
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
                    
                else:
                    self.cors_stats["successful_cors"] += 1
                    
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
        
        # Log slow CORS processing
        if process_time > 0.1:  # 100ms threshold
            logger.warning(
                f"🐌 Slow CORS processing: {request.method} {request.url.path} "
                f"took {process_time:.4f}s"
            )
            
        return response
        
    def get_stats(self) -> dict:
        """Get CORS middleware statistics"""
        return {
            **self.cors_stats,
            "allowed_origins_count": len(cors_config.origins),
            "allowed_origins": cors_config.origins[:5],  # First 5 for brevity
        }


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