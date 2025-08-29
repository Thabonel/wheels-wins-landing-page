
"""
Monitoring Middleware
Integrates monitoring and error tracking into FastAPI requests.
"""

import time
from typing import Callable
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response
from app.services.monitoring_service import monitoring_service
from app.services.sentry_service import sentry_service
from app.core.logging import setup_logging, get_logger

setup_logging()
logger = get_logger(__name__)

class MonitoringMiddleware(BaseHTTPMiddleware):
    """Middleware for request monitoring and error tracking"""
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        # Start timing
        start_time = time.time()
        
        # Start Sentry transaction
        transaction = sentry_service.start_transaction(
            name=f"{request.method} {request.url.path}",
            op="http.server"
        )
        
        try:
            # Process request
            response = await call_next(request)
            
            # Calculate duration
            duration = time.time() - start_time
            
            # Record metrics
            monitoring_service.record_http_request(
                method=request.method,
                endpoint=request.url.path,
                status_code=response.status_code,
                duration=duration
            )
            
            # Set transaction status
            if transaction:
                transaction.set_http_status(response.status_code)
                transaction.finish()
            
            return response
            
        except Exception as e:
            # Calculate duration even for errors
            duration = time.time() - start_time
            
            # Record error metrics
            monitoring_service.record_http_request(
                method=request.method,
                endpoint=request.url.path,
                status_code=500,
                duration=duration
            )
            
            # Capture exception in Sentry
            sentry_service.capture_exception(e, {
                "method": request.method,
                "endpoint": request.url.path,
                "duration": duration
            })
            
            # Set transaction status and finish
            if transaction:
                transaction.set_http_status(500)
                transaction.finish()
            
            raise
