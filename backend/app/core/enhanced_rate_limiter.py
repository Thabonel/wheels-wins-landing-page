"""
Enhanced Rate Limiting System
Redis-based rate limiting with DDoS protection and adaptive limits.
"""

import asyncio
import time
import json
from typing import Dict, List, Optional, Tuple, Any
from datetime import datetime, timedelta
from dataclasses import dataclass, asdict
from enum import Enum
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response, JSONResponse
from app.core.logging import get_logger

try:
    import redis.asyncio as aioredis
    REDIS_AVAILABLE = True
except ImportError:
    REDIS_AVAILABLE = False

logger = get_logger(__name__)


class ThreatLevel(Enum):
    """Threat levels for adaptive rate limiting"""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


@dataclass
class RateLimitConfig:
    """Rate limit configuration"""
    requests_per_window: int
    window_seconds: int
    burst_allowance: int = 0  # Additional requests allowed in burst
    block_duration_seconds: int = 300  # 5 minutes default
    threat_level: ThreatLevel = ThreatLevel.LOW


@dataclass
class RateLimitResult:
    """Result of rate limit check"""
    allowed: bool
    remaining: int
    reset_time: datetime
    current_usage: int
    is_blocked: bool = False
    block_expires: Optional[datetime] = None


class RedisRateLimiter:
    """Redis-based rate limiter with advanced features"""
    
    def __init__(self, redis_url: str = "redis://localhost:6379"):
        import os
        # Try to get Redis URL from environment if not provided
        self.redis_url = redis_url
        if redis_url == "redis://localhost:6379":
            self.redis_url = os.environ.get('REDIS_URL', redis_url)
        self.redis_client: Optional[aioredis.Redis] = None
        self.fallback_storage: Dict[str, List[float]] = {}
        self.blocked_clients: Dict[str, datetime] = {}
        
        # Default rate limit configurations
        self.default_configs = {
            "/api/auth/login": RateLimitConfig(5, 300, 0, 900, ThreatLevel.HIGH),  # 5 per 5min
            "/api/auth/signup": RateLimitConfig(3, 300, 0, 1800, ThreatLevel.HIGH),  # 3 per 5min
            "/api/auth/password-reset": RateLimitConfig(3, 300, 0, 1800, ThreatLevel.HIGH),  # 3 per 5min
            "/api/pam/chat": RateLimitConfig(60, 60, 10, 60, ThreatLevel.MEDIUM),  # 60 per minute
            "/api/pam/voice": RateLimitConfig(30, 60, 5, 120, ThreatLevel.MEDIUM),  # 30 per minute
            "/api/expenses": RateLimitConfig(100, 60, 20, 60, ThreatLevel.LOW),  # 100 per minute
            "/api/social/posts": RateLimitConfig(50, 60, 10, 60, ThreatLevel.LOW),  # 50 per minute
            "/api/admin/": RateLimitConfig(200, 60, 50, 300, ThreatLevel.LOW),  # Admin endpoints
            "/api/": RateLimitConfig(1000, 60, 200, 60, ThreatLevel.LOW),  # Default API
        }
        
        # DDoS protection thresholds
        self.ddos_thresholds = {
            "requests_per_second": 50,  # Suspicious if > 50 req/sec from single IP
            "burst_multiplier": 5,      # Block if burst > 5x normal rate
            "unique_endpoints": 20,     # Suspicious if hitting > 20 endpoints/minute
        }
    
    async def initialize(self) -> bool:
        """Initialize Redis connection"""
        if not REDIS_AVAILABLE:
            logger.warning("Redis not available (library not installed), using in-memory fallback")
            return False
        
        try:
            # Log Redis URL (masked for security)
            if self.redis_url and self.redis_url != 'redis://localhost:6379':
                masked_url = self.redis_url.split('@')[0] + '@***' if '@' in self.redis_url else self.redis_url
                logger.info(f"Rate limiter attempting Redis connection to: {masked_url}")
            
            self.redis_client = aioredis.from_url(
                self.redis_url,
                encoding="utf-8",
                decode_responses=True,
                retry_on_timeout=True,
                socket_connect_timeout=5,
                socket_timeout=5
            )
            
            # Test connection
            await self.redis_client.ping()
            logger.info("✅ Redis rate limiter initialized successfully")
            return True
            
        except asyncio.TimeoutError:
            logger.warning("Redis rate limiter connection timeout - using in-memory fallback")
            self.redis_client = None
            return False
        except Exception as e:
            logger.warning(f"Redis rate limiter unavailable ({type(e).__name__}: {e}) - using in-memory fallback")
            self.redis_client = None
            return False
    
    async def check_rate_limit(
        self,
        client_id: str,
        endpoint: str,
        request_size: int = 1
    ) -> RateLimitResult:
        """Check if request is within rate limits"""
        
        # Get configuration for endpoint
        config = self._get_endpoint_config(endpoint)
        
        # Check if client is blocked
        if await self._is_client_blocked(client_id):
            block_expires = await self._get_block_expiry(client_id)
            return RateLimitResult(
                allowed=False,
                remaining=0,
                reset_time=datetime.now() + timedelta(seconds=config.window_seconds),
                current_usage=0,
                is_blocked=True,
                block_expires=block_expires
            )
        
        # Perform rate limit check
        if self.redis_client:
            return await self._redis_rate_limit(client_id, endpoint, config, request_size)
        else:
            return await self._fallback_rate_limit(client_id, endpoint, config, request_size)
    
    async def _redis_rate_limit(
        self,
        client_id: str,
        endpoint: str,
        config: RateLimitConfig,
        request_size: int
    ) -> RateLimitResult:
        """Redis-based rate limiting with sliding window"""
        current_time = time.time()
        window_start = current_time - config.window_seconds
        
        # Keys for different data
        requests_key = f"rate_limit:requests:{client_id}:{endpoint}"
        burst_key = f"rate_limit:burst:{client_id}:{endpoint}"
        ddos_key = f"rate_limit:ddos:{client_id}"
        
        try:
            # Use Redis pipeline for atomic operations
            pipe = self.redis_client.pipeline()
            
            # Remove old entries (sliding window)
            pipe.zremrangebyscore(requests_key, 0, window_start)
            
            # Count current requests in window
            pipe.zcard(requests_key)
            
            # Get DDoS monitoring data
            pipe.hgetall(ddos_key)
            
            results = await pipe.execute()
            current_count = results[1]
            ddos_data = results[2] or {}
            
            # Check for DDoS patterns
            await self._update_ddos_monitoring(client_id, endpoint, ddos_data)
            
            # Calculate available capacity
            total_allowed = config.requests_per_window + config.burst_allowance
            remaining = max(0, total_allowed - current_count)
            
            # Check if request should be allowed
            if current_count + request_size <= total_allowed:
                # Allow request - add to window
                pipe = self.redis_client.pipeline()
                for _ in range(request_size):
                    pipe.zadd(requests_key, {str(current_time + (_ * 0.001)): current_time})
                
                # Set expiry for cleanup
                pipe.expire(requests_key, config.window_seconds + 60)
                await pipe.execute()
                
                return RateLimitResult(
                    allowed=True,
                    remaining=remaining - request_size,
                    reset_time=datetime.fromtimestamp(current_time + config.window_seconds),
                    current_usage=current_count + request_size
                )
            else:
                # Rate limit exceeded
                logger.warning(
                    f"Rate limit exceeded for {client_id} on {endpoint}: "
                    f"{current_count + request_size}/{total_allowed}"
                )
                
                # Check if should block client (multiple violations)
                violation_key = f"rate_limit:violations:{client_id}"
                violations = await self.redis_client.incr(violation_key)
                await self.redis_client.expire(violation_key, 3600)  # Reset hourly
                
                # Block after 3 violations in an hour
                if violations >= 3:
                    await self._block_client(client_id, config.block_duration_seconds)
                
                return RateLimitResult(
                    allowed=False,
                    remaining=0,
                    reset_time=datetime.fromtimestamp(current_time + config.window_seconds),
                    current_usage=current_count
                )
        
        except Exception as e:
            logger.error(f"Redis rate limit error: {e}")
            # Fallback to in-memory limiting
            return await self._fallback_rate_limit(client_id, endpoint, config, request_size)
    
    async def _fallback_rate_limit(
        self,
        client_id: str,
        endpoint: str,
        config: RateLimitConfig,
        request_size: int
    ) -> RateLimitResult:
        """In-memory fallback rate limiting"""
        current_time = time.time()
        window_start = current_time - config.window_seconds
        
        key = f"{client_id}:{endpoint}"
        
        # Clean old entries
        if key in self.fallback_storage:
            self.fallback_storage[key] = [
                req_time for req_time in self.fallback_storage[key]
                if req_time > window_start
            ]
        else:
            self.fallback_storage[key] = []
        
        current_count = len(self.fallback_storage[key])
        total_allowed = config.requests_per_window + config.burst_allowance
        
        if current_count + request_size <= total_allowed:
            # Allow request
            for _ in range(request_size):
                self.fallback_storage[key].append(current_time)
            
            return RateLimitResult(
                allowed=True,
                remaining=total_allowed - current_count - request_size,
                reset_time=datetime.fromtimestamp(current_time + config.window_seconds),
                current_usage=current_count + request_size
            )
        else:
            return RateLimitResult(
                allowed=False,
                remaining=0,
                reset_time=datetime.fromtimestamp(current_time + config.window_seconds),
                current_usage=current_count
            )
    
    async def _update_ddos_monitoring(
        self,
        client_id: str,
        endpoint: str,
        current_data: Dict[str, Any]
    ):
        """Update DDoS monitoring data"""
        try:
            current_minute = int(time.time() // 60)
            ddos_key = f"rate_limit:ddos:{client_id}"
            
            # Parse existing data
            endpoints_this_minute = set(current_data.get("endpoints", "").split(","))
            if endpoint not in endpoints_this_minute:
                endpoints_this_minute.add(endpoint)
            
            last_minute = int(current_data.get("last_minute", 0))
            requests_per_second = int(current_data.get("rps", 0))
            
            # Reset if new minute
            if current_minute != last_minute:
                requests_per_second = 1
                endpoints_this_minute = {endpoint}
            else:
                requests_per_second += 1
            
            # Update data
            ddos_data = {
                "last_minute": current_minute,
                "rps": requests_per_second,
                "endpoints": ",".join(endpoints_this_minute),
                "endpoint_count": len(endpoints_this_minute)
            }
            
            if self.redis_client:
                await self.redis_client.hset(ddos_key, mapping=ddos_data)
                await self.redis_client.expire(ddos_key, 300)  # 5 minute expiry
            
            # Check for DDoS patterns
            if (requests_per_second > self.ddos_thresholds["requests_per_second"] or
                len(endpoints_this_minute) > self.ddos_thresholds["unique_endpoints"]):
                logger.warning(
                    f"Potential DDoS detected from {client_id}: "
                    f"{requests_per_second} RPS, {len(endpoints_this_minute)} unique endpoints"
                )
                
                # Auto-block for DDoS
                await self._block_client(client_id, 1800)  # 30 minutes
        
        except Exception as e:
            logger.error(f"Error updating DDoS monitoring: {e}")
    
    async def _block_client(self, client_id: str, duration_seconds: int):
        """Block a client for specified duration"""
        block_key = f"rate_limit:blocked:{client_id}"
        block_until = time.time() + duration_seconds
        
        try:
            if self.redis_client:
                await self.redis_client.set(block_key, block_until, ex=duration_seconds)
            else:
                self.blocked_clients[client_id] = datetime.now() + timedelta(seconds=duration_seconds)
            
            logger.warning(f"Blocked client {client_id} for {duration_seconds} seconds")
        
        except Exception as e:
            logger.error(f"Error blocking client: {e}")
    
    async def _is_client_blocked(self, client_id: str) -> bool:
        """Check if client is currently blocked"""
        try:
            if self.redis_client:
                block_key = f"rate_limit:blocked:{client_id}"
                block_until = await self.redis_client.get(block_key)
                if block_until:
                    return float(block_until) > time.time()
            else:
                if client_id in self.blocked_clients:
                    if self.blocked_clients[client_id] > datetime.now():
                        return True
                    else:
                        del self.blocked_clients[client_id]
            
            return False
        
        except Exception as e:
            logger.error(f"Error checking if client blocked: {e}")
            return False
    
    async def _get_block_expiry(self, client_id: str) -> Optional[datetime]:
        """Get when client block expires"""
        try:
            if self.redis_client:
                block_key = f"rate_limit:blocked:{client_id}"
                block_until = await self.redis_client.get(block_key)
                if block_until:
                    return datetime.fromtimestamp(float(block_until))
            else:
                return self.blocked_clients.get(client_id)
            
            return None
        
        except Exception as e:
            logger.error(f"Error getting block expiry: {e}")
            return None
    
    def _get_endpoint_config(self, endpoint: str) -> RateLimitConfig:
        """Get rate limit configuration for endpoint"""
        # Match longest prefix
        for pattern, config in sorted(self.default_configs.items(), key=len, reverse=True):
            if endpoint.startswith(pattern):
                return config
        
        # Default configuration
        return RateLimitConfig(100, 60, 20, 300, ThreatLevel.LOW)
    
    async def get_client_stats(self, client_id: str) -> Dict[str, Any]:
        """Get statistics for a client"""
        try:
            if not self.redis_client:
                return {"error": "Redis not available"}
            
            stats = {}
            
            # Get current blocks
            block_key = f"rate_limit:blocked:{client_id}"
            block_until = await self.redis_client.get(block_key)
            if block_until:
                stats["blocked_until"] = datetime.fromtimestamp(float(block_until)).isoformat()
            
            # Get violations
            violation_key = f"rate_limit:violations:{client_id}"
            violations = await self.redis_client.get(violation_key)
            stats["violations"] = int(violations) if violations else 0
            
            # Get DDoS data
            ddos_key = f"rate_limit:ddos:{client_id}"
            ddos_data = await self.redis_client.hgetall(ddos_key)
            if ddos_data:
                stats["ddos_monitoring"] = ddos_data
            
            return stats
        
        except Exception as e:
            logger.error(f"Error getting client stats: {e}")
            return {"error": str(e)}
    
    async def unblock_client(self, client_id: str) -> bool:
        """Manually unblock a client"""
        try:
            if self.redis_client:
                block_key = f"rate_limit:blocked:{client_id}"
                result = await self.redis_client.delete(block_key)
                logger.info(f"Unblocked client {client_id}")
                return result > 0
            else:
                if client_id in self.blocked_clients:
                    del self.blocked_clients[client_id]
                    logger.info(f"Unblocked client {client_id}")
                    return True
            
            return False
        
        except Exception as e:
            logger.error(f"Error unblocking client: {e}")
            return False


class EnhancedRateLimitMiddleware(BaseHTTPMiddleware):
    """Enhanced rate limiting middleware with DDoS protection"""
    
    def __init__(self, app, redis_url: str = "redis://localhost:6379", enable_blocking: bool = True):
        super().__init__(app)
        self.rate_limiter = RedisRateLimiter(redis_url)
        self.enable_blocking = enable_blocking
        self.exempt_paths = [
            "/health",
            "/docs",
            "/openapi.json",
            "/favicon.ico",
            "/metrics"
        ]
        
        # Initialize rate limiter
        asyncio.create_task(self.rate_limiter.initialize())
    
    async def dispatch(self, request: Request, call_next) -> Response:
        # Skip rate limiting for exempt paths
        if any(request.url.path.startswith(path) for path in self.exempt_paths):
            return await call_next(request)
        
        # Skip rate limiting for OPTIONS requests (CORS preflight)
        if request.method == "OPTIONS":
            return await call_next(request)
        
        # Get client identifier
        client_id = self._get_client_identifier(request)
        
        # Estimate request size (for better rate limiting)
        request_size = self._estimate_request_size(request)
        
        # Check rate limit
        rate_limit_result = await self.rate_limiter.check_rate_limit(
            client_id,
            request.url.path,
            request_size
        )
        
        # Add rate limit headers to response
        response_headers = {
            "X-RateLimit-Limit": str(self.rate_limiter._get_endpoint_config(request.url.path).requests_per_window),
            "X-RateLimit-Remaining": str(rate_limit_result.remaining),
            "X-RateLimit-Reset": str(int(rate_limit_result.reset_time.timestamp())),
        }
        
        if not rate_limit_result.allowed and self.enable_blocking:
            if rate_limit_result.is_blocked:
                # Client is blocked
                response_headers["Retry-After"] = str(int((rate_limit_result.block_expires - datetime.now()).total_seconds()))
                
                return JSONResponse(
                    status_code=429,
                    content={
                        "error": "Client Blocked",
                        "message": "Your IP has been temporarily blocked due to excessive requests",
                        "blocked_until": rate_limit_result.block_expires.isoformat() if rate_limit_result.block_expires else None,
                        "request_id": getattr(request.state, 'request_id', 'unknown')
                    },
                    headers=response_headers
                )
            else:
                # Rate limit exceeded
                response_headers["Retry-After"] = str(int((rate_limit_result.reset_time - datetime.now()).total_seconds()))
                
                return JSONResponse(
                    status_code=429,
                    content={
                        "error": "Rate Limit Exceeded",
                        "message": "Too many requests. Please try again later.",
                        "retry_after": response_headers["Retry-After"],
                        "request_id": getattr(request.state, 'request_id', 'unknown')
                    },
                    headers=response_headers
                )
        
        # Process request
        response = await call_next(request)
        
        # Add rate limit headers to successful responses
        for header, value in response_headers.items():
            response.headers[header] = value
        
        return response
    
    def _get_client_identifier(self, request: Request) -> str:
        """Get unique client identifier"""
        # Try to get real IP from proxy headers
        forwarded_headers = [
            "cf-connecting-ip",
            "x-forwarded-for",
            "x-real-ip",
            "forwarded-for"
        ]
        
        for header in forwarded_headers:
            if header in request.headers:
                ip = request.headers[header].split(',')[0].strip()
                if ip and ip != "unknown":
                    # Combine with user agent hash for better uniqueness
                    user_agent = request.headers.get("user-agent", "unknown")
                    return f"{ip}:{hash(user_agent) % 10000}"
        
        # Fallback to connection IP
        client_ip = request.client.host if request.client else "unknown"
        user_agent = request.headers.get("user-agent", "unknown")
        return f"{client_ip}:{hash(user_agent) % 10000}"
    
    def _estimate_request_size(self, request: Request) -> int:
        """Estimate request computational cost"""
        # Base cost
        cost = 1
        
        # Higher cost for complex operations
        if request.method in ["POST", "PUT", "PATCH"]:
            cost += 1
        
        # AI endpoints are more expensive
        if "/pam/" in request.url.path or "/ai/" in request.url.path:
            cost += 2
        
        # File upload endpoints
        if "/upload" in request.url.path:
            cost += 3
        
        return cost


def setup_enhanced_rate_limiting(app, redis_url: str = "redis://localhost:6379", enable_blocking: bool = True):
    """Setup enhanced rate limiting middleware"""
    app.add_middleware(EnhancedRateLimitMiddleware, redis_url=redis_url, enable_blocking=enable_blocking)
    logger.info("Enhanced rate limiting middleware configured")