"""
Production Monitoring and Error Tracking System
Comprehensive monitoring setup for production debugging and observability.
"""

import asyncio
import logging
import os
import time
import traceback
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
from dataclasses import dataclass, asdict
from contextlib import asynccontextmanager

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
import psutil

from app.core.logging import get_logger
from app.services.sentry_service import sentry_service
from app.monitoring.metrics_cache import metrics_cache
# Memory optimizer removed - was consuming more memory than it saved

logger = get_logger(__name__)


@dataclass
class ErrorContext:
    """Error context information for debugging."""
    timestamp: str
    error_type: str
    error_message: str
    traceback: str
    request_id: Optional[str] = None
    user_id: Optional[str] = None
    endpoint: Optional[str] = None
    method: Optional[str] = None
    user_agent: Optional[str] = None
    ip_address: Optional[str] = None
    request_body: Optional[str] = None
    environment: Optional[str] = None
    build_version: Optional[str] = None


@dataclass
class PerformanceMetrics:
    """Performance metrics for monitoring."""
    timestamp: str
    endpoint: str
    method: str
    duration_ms: float
    status_code: int
    memory_usage_mb: float
    cpu_percent: float
    database_queries: int = 0
    cache_hits: int = 0
    cache_misses: int = 0
    user_id: Optional[str] = None


@dataclass
class SystemHealth:
    """System health metrics."""
    timestamp: str
    cpu_percent: float
    memory_usage_mb: float
    memory_percent: float
    disk_usage_percent: float
    active_connections: int
    database_pool_size: int
    redis_memory_mb: float
    uptime_seconds: float
    error_rate_5min: float
    avg_response_time_5min: float


class ProductionMonitor:
    """Comprehensive production monitoring system."""
    
    def __init__(self):
        self.start_time = time.time()
        self.error_buffer: List[ErrorContext] = []
        self.performance_buffer: List[PerformanceMetrics] = []
        self.max_buffer_size = 500  # Reduced from 1000 to save memory
        self.alert_thresholds = {
            "error_rate_5min": 10,  # errors per 5 minutes
            "avg_response_time_ms": 2000,  # 2 seconds
            "memory_usage_percent": 85,
            "cpu_usage_percent": 80,
            "disk_usage_percent": 90
        }
        self.is_monitoring = False
        
    async def start_monitoring(self):
        """Start background monitoring tasks."""
        if self.is_monitoring:
            return
            
        self.is_monitoring = True
        logger.info("🔍 Starting production monitoring system...")
        
        # Start metrics cache
        await metrics_cache.start()
        
        # Memory optimizer removed - was causing memory thrashing
        logger.info("💡 Memory optimizer disabled - using Python's built-in garbage collection")
        
        # Start background tasks
        asyncio.create_task(self._system_health_monitor())
        asyncio.create_task(self._buffer_cleanup_task())
        asyncio.create_task(self._alert_checker())
        
        logger.info("✅ Production monitoring system started")
    
    async def stop_monitoring(self):
        """Stop monitoring system."""
        self.is_monitoring = False
        
        # Stop metrics cache
        await metrics_cache.stop()
        
        # Memory optimizer was already removed
        logger.info("💡 Memory optimizer was disabled - no cleanup needed")
        
        logger.info("🛑 Production monitoring system stopped")
    
    def log_error(self, error: Exception, request: Optional[Request] = None, 
                  user_id: Optional[str] = None, additional_context: Optional[Dict] = None):
        """Log error with comprehensive context."""
        try:
            error_context = ErrorContext(
                timestamp=datetime.utcnow().isoformat(),
                error_type=type(error).__name__,
                error_message=str(error),
                traceback=traceback.format_exc(),
                user_id=user_id,
                environment=os.getenv("ENVIRONMENT", "unknown"),
                build_version=os.getenv("BUILD_VERSION", "unknown")
            )
            
            if request:
                error_context.request_id = getattr(request.state, 'request_id', None)
                error_context.endpoint = request.url.path
                error_context.method = request.method
                error_context.user_agent = request.headers.get("user-agent")
                error_context.ip_address = self._get_client_ip(request)
                
                # Safely capture request body for debugging
                if hasattr(request, '_body') and len(request._body) < 10000:  # Limit size
                    try:
                        error_context.request_body = request._body.decode('utf-8')[:1000]
                    except Exception:
                        error_context.request_body = "Unable to decode request body"
            
            # Add to buffer with validation
            if self._validate_buffer_object(error_context, ErrorContext):
                self.error_buffer.append(error_context)
                if len(self.error_buffer) > self.max_buffer_size:
                    self.error_buffer.pop(0)
            else:
                logger.error(f"Invalid object type for error buffer: {type(error_context)}")
            
            # Log structured error
            logger.error(
                f"💥 Production Error: {error_context.error_type}",
                extra={
                    "error_context": asdict(error_context),
                    "additional_context": additional_context or {}
                }
            )
            
            # Send to Sentry with context
            sentry_context = {
                "user": {"id": user_id} if user_id else {},
                "request": {
                    "url": error_context.endpoint,
                    "method": error_context.method,
                    "headers": {"user-agent": error_context.user_agent} if error_context.user_agent else {}
                } if request else {},
                "extra": additional_context or {}
            }
            
            sentry_service.capture_exception(error, sentry_context)
            
        except Exception as monitor_error:
            # Ensure monitoring errors don't break the application
            logger.error(f"❌ Error in error monitoring: {monitor_error}")
    
    def log_performance(self, request: Request, response: Response, 
                       duration_ms: float, user_id: Optional[str] = None):
        """Log performance metrics."""
        try:
            # Get system metrics
            process = psutil.Process()
            memory_info = process.memory_info()
            
            metrics = PerformanceMetrics(
                timestamp=datetime.utcnow().isoformat(),
                endpoint=request.url.path,
                method=request.method,
                duration_ms=duration_ms,
                status_code=response.status_code,
                memory_usage_mb=memory_info.rss / 1024 / 1024,
                cpu_percent=process.cpu_percent(),
                user_id=user_id
            )
            
            # Add to buffer with validation
            if self._validate_buffer_object(metrics, PerformanceMetrics):
                self.performance_buffer.append(metrics)
                if len(self.performance_buffer) > self.max_buffer_size:
                    self.performance_buffer.pop(0)
            else:
                logger.error(f"Invalid object type for performance buffer: {type(metrics)}")
            
            # Log slow requests
            if duration_ms > 1000:  # 1 second
                logger.warning(
                    f"🐌 Slow request: {request.method} {request.url.path} - {duration_ms:.2f}ms",
                    extra={"performance_metrics": asdict(metrics)}
                )
            
            # Log error responses
            if response.status_code >= 500:
                logger.error(
                    f"💥 Server error: {request.method} {request.url.path} - {response.status_code}",
                    extra={"performance_metrics": asdict(metrics)}
                )
            
        except Exception as monitor_error:
            logger.error(f"❌ Error in performance monitoring: {monitor_error}")
    
    async def get_system_health(self) -> SystemHealth:
        """Get current system health metrics - uses cached values for speed."""
        try:
            # Get cached metrics (non-blocking)
            cached = await metrics_cache.get_metrics()
            
            # Use cached values if available, fallback to direct collection
            if "error" not in cached:
                cpu_percent = cached["cpu_percent"]
                memory_usage_mb = cached["memory_usage_mb"]
                memory_percent = cached["memory_percent"]
                disk_usage_percent = cached["disk_usage_percent"]
            else:
                # Fallback to direct collection (non-blocking)
                cpu_percent = psutil.cpu_percent(interval=None)
                memory = psutil.virtual_memory()
                memory_usage_mb = memory.used / 1024 / 1024
                memory_percent = memory.percent
                disk = psutil.disk_usage('/')
                disk_usage_percent = disk.percent
            
            # Application metrics
            uptime = time.time() - self.start_time
            
            # Calculate error rate and avg response time for last 5 minutes
            now = datetime.utcnow()
            five_min_ago = now - timedelta(minutes=5)
            
            recent_errors = [
                e for e in self.error_buffer 
                if self._extract_timestamp_datetime(e) > five_min_ago
            ]
            
            recent_performance = [
                p for p in self.performance_buffer 
                if self._extract_timestamp_datetime(p) > five_min_ago
            ]
            
            error_rate_5min = len(recent_errors)
            avg_response_time_5min = (
                sum(p.duration_ms for p in recent_performance) / len(recent_performance)
                if recent_performance else 0
            )
            
            health = SystemHealth(
                timestamp=now.isoformat(),
                cpu_percent=cpu_percent,
                memory_usage_mb=memory_usage_mb,
                memory_percent=memory_percent,
                disk_usage_percent=disk_usage_percent,
                active_connections=len(recent_performance),
                database_pool_size=0,  # TODO: Get from database pool
                redis_memory_mb=0,  # TODO: Get from Redis
                uptime_seconds=uptime,
                error_rate_5min=error_rate_5min,
                avg_response_time_5min=avg_response_time_5min
            )
            
            return health
            
        except Exception as e:
            logger.error(f"❌ Error getting system health: {e}")
            # Return basic health info
            return SystemHealth(
                timestamp=datetime.utcnow().isoformat(),
                cpu_percent=0,
                memory_usage_mb=0,
                memory_percent=0,
                disk_usage_percent=0,
                active_connections=0,
                database_pool_size=0,
                redis_memory_mb=0,
                uptime_seconds=time.time() - self.start_time,
                error_rate_5min=0,
                avg_response_time_5min=0
            )
    
    async def _system_health_monitor(self):
        """Background task to monitor system health."""
        while self.is_monitoring:
            try:
                health = await self.get_system_health()
                
                # Log system health every 5 minutes
                logger.info(
                    f"💓 System Health Check",
                    extra={"system_health": asdict(health)}
                )
                
                await asyncio.sleep(300)  # 5 minutes
                
            except Exception as e:
                logger.error(f"❌ Error in health monitoring: {e}")
                await asyncio.sleep(60)  # Retry in 1 minute
    
    async def _buffer_cleanup_task(self):
        """Clean up old entries from buffers."""
        while self.is_monitoring:
            try:
                now = datetime.utcnow()
                one_hour_ago = now - timedelta(hours=1)
                
                # Clean error buffer
                self.error_buffer = [
                    e for e in self.error_buffer
                    if self._extract_timestamp_datetime(e) > one_hour_ago
                ]
                
                # Clean performance buffer
                self.performance_buffer = [
                    p for p in self.performance_buffer
                    if self._extract_timestamp_datetime(p) > one_hour_ago
                ]
                
                await asyncio.sleep(600)  # 10 minutes
                
            except Exception as e:
                logger.error(f"❌ Error in buffer cleanup: {e}")
                await asyncio.sleep(300)  # Retry in 5 minutes
    
    async def _alert_checker(self):
        """Check for alert conditions."""
        while self.is_monitoring:
            try:
                health = await self.get_system_health()
                alerts = []
                
                # Check thresholds
                if health.error_rate_5min > self.alert_thresholds["error_rate_5min"]:
                    alerts.append(f"High error rate: {health.error_rate_5min} errors in 5 minutes")
                
                if health.avg_response_time_5min > self.alert_thresholds["avg_response_time_ms"]:
                    alerts.append(f"Slow response time: {health.avg_response_time_5min:.2f}ms average")
                
                if health.memory_percent > self.alert_thresholds["memory_usage_percent"]:
                    alerts.append(f"High memory usage: {health.memory_percent:.1f}%")
                
                if health.cpu_percent > self.alert_thresholds["cpu_usage_percent"]:
                    alerts.append(f"High CPU usage: {health.cpu_percent:.1f}%")
                
                if health.disk_usage_percent > self.alert_thresholds["disk_usage_percent"]:
                    alerts.append(f"High disk usage: {health.disk_usage_percent:.1f}%")
                
                # Send alerts
                if alerts:
                    alert_message = f"🚨 PRODUCTION ALERTS:\n" + "\n".join(f"• {alert}" for alert in alerts)
                    logger.warning(alert_message, extra={"alerts": alerts, "system_health": asdict(health)})
                    
                    # Send to Sentry as warning
                    sentry_service.capture_message(alert_message, level="warning", extra_data={"system_health": asdict(health)})
                
                await asyncio.sleep(300)  # 5 minutes
                
            except Exception as e:
                logger.error(f"❌ Error in alert checking: {e}")
                await asyncio.sleep(300)  # Retry in 5 minutes
    
    def _get_client_ip(self, request: Request) -> str:
        """Get client IP address from request."""
        # Check for forwarded headers first (behind proxy/load balancer)
        forwarded_for = request.headers.get("x-forwarded-for")
        if forwarded_for:
            return forwarded_for.split(",")[0].strip()
        
        real_ip = request.headers.get("x-real-ip")
        if real_ip:
            return real_ip
        
        # Fallback to direct connection
        if request.client:
            return request.client.host
        
        return "unknown"
    
    def _extract_timestamp_datetime(self, obj) -> datetime:
        """
        Safely extract datetime from mixed timestamp types.
        Handles both dataclass objects with timestamp strings and raw float timestamps.
        """
        try:
            # If it's a dataclass with a timestamp attribute (expected case)
            if hasattr(obj, 'timestamp'):
                timestamp_val = obj.timestamp
                # Handle string timestamps (ISO format)
                if isinstance(timestamp_val, str):
                    return datetime.fromisoformat(timestamp_val.replace('Z', '+00:00'))
                # Handle float timestamps (Unix time)
                elif isinstance(timestamp_val, (int, float)):
                    return datetime.fromtimestamp(timestamp_val)
                else:
                    logger.warning(f"Unexpected timestamp type: {type(timestamp_val)} for {obj}")
                    return datetime.utcnow()
            
            # If obj itself is a float timestamp (error case that needs fixing)
            elif isinstance(obj, (int, float)):
                logger.warning(f"Found raw timestamp in buffer: {obj} - this should be a dataclass object")
                return datetime.fromtimestamp(obj)
            
            # If it's something else entirely
            else:
                logger.error(f"Unexpected object type in monitoring buffer: {type(obj)} - {obj}")
                return datetime.utcnow()
                
        except Exception as e:
            logger.error(f"Failed to extract timestamp from {obj}: {e}")
            return datetime.utcnow()  # Fallback to current time
    
    def _validate_buffer_object(self, obj, expected_type) -> bool:
        """
        Validate that an object is of the expected type before adding to buffer.
        This prevents raw timestamps or other incorrect types from being added.
        """
        try:
            # Check if it's an instance of the expected type
            if isinstance(obj, expected_type):
                # Additional validation: ensure timestamp is a string as expected
                if hasattr(obj, 'timestamp') and not isinstance(obj.timestamp, str):
                    logger.warning(f"Object has non-string timestamp: {type(obj.timestamp)} - {obj.timestamp}")
                    # Convert to string if it's a valid timestamp
                    if isinstance(obj.timestamp, (int, float)):
                        obj.timestamp = datetime.fromtimestamp(obj.timestamp).isoformat()
                        logger.info(f"Converted timestamp to ISO string: {obj.timestamp}")
                return True
            else:
                logger.error(f"Expected {expected_type.__name__}, got {type(obj).__name__}: {obj}")
                return False
        except Exception as e:
            logger.error(f"Buffer validation error: {e}")
            return False
    
    def get_debug_info(self) -> Dict[str, Any]:
        """Get debug information for troubleshooting."""
        return {
            "monitoring_status": "active" if self.is_monitoring else "inactive",
            "uptime_seconds": time.time() - self.start_time,
            "error_buffer_size": len(self.error_buffer),
            "performance_buffer_size": len(self.performance_buffer),
            "recent_errors": [asdict(e) for e in self.error_buffer[-5:]],  # Last 5 errors
            "recent_performance": [asdict(p) for p in self.performance_buffer[-10:]],  # Last 10 requests
            "alert_thresholds": self.alert_thresholds,
            "environment": os.getenv("ENVIRONMENT", "unknown"),
            "build_version": os.getenv("BUILD_VERSION", "unknown")
        }


class MonitoringMiddleware(BaseHTTPMiddleware):
    """Middleware for automatic request monitoring."""
    
    def __init__(self, app, monitor: ProductionMonitor):
        super().__init__(app)
        self.monitor = monitor
    
    async def dispatch(self, request: Request, call_next):
        # Generate request ID
        request_id = f"req_{int(time.time() * 1000)}_{id(request)}"
        request.state.request_id = request_id
        
        start_time = time.time()
        
        try:
            # Process request
            response = await call_next(request)
            
            # Calculate duration
            duration_ms = (time.time() - start_time) * 1000
            
            # Extract user ID if available (from JWT token, session, etc.)
            user_id = getattr(request.state, 'user_id', None)
            
            # Log performance
            self.monitor.log_performance(request, response, duration_ms, user_id)
            
            # Add monitoring headers
            response.headers["X-Request-ID"] = request_id
            response.headers["X-Response-Time"] = f"{duration_ms:.2f}ms"
            
            return response
            
        except Exception as e:
            # Calculate duration for error case
            duration_ms = (time.time() - start_time) * 1000
            
            # Extract user ID if available
            user_id = getattr(request.state, 'user_id', None)
            
            # Log error with context
            self.monitor.log_error(e, request, user_id, {
                "duration_ms": duration_ms,
                "request_id": request_id
            })
            
            # Re-raise the exception
            raise


# Global monitor instance
production_monitor = ProductionMonitor()


@asynccontextmanager
async def monitoring_lifespan():
    """Context manager for monitoring lifecycle."""
    await production_monitor.start_monitoring()
    try:
        yield production_monitor
    finally:
        await production_monitor.stop_monitoring()


def get_production_monitor() -> ProductionMonitor:
    """Get the global production monitor instance."""
    return production_monitor