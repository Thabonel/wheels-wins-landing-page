"""
Rate Limiting Middleware
Implements sliding window rate limiting using Redis for distributed systems.

Limits:
- PAM queries: 60 requests/minute per user
- Edge Functions (read): 100 requests/minute per user
- Edge Functions (write): 20 requests/minute per user
- Authentication: 10 requests/minute per IP

Date: January 10, 2025
"""

import time
import hashlib
from typing import Optional, Tuple
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse, Response
from typing import Callable
import redis
import os
import logging

logger = logging.getLogger(__name__)


class RateLimitMiddleware(BaseHTTPMiddleware):
    """Rate limiting middleware using Redis sliding window"""

    def __init__(self, app, redis_url: Optional[str] = None):
        super().__init__(app)

        # Initialize Redis connection
        redis_url = redis_url or os.getenv("REDIS_URL", "redis://localhost:6379")
        try:
            self.redis_client = redis.from_url(redis_url, decode_responses=True)
            # Test connection
            self.redis_client.ping()
            self.enabled = True
            logger.info(f"✅ Rate limiting enabled (Redis: {redis_url})")
        except Exception as e:
            logger.warning(f"⚠️ Rate limiting disabled - Redis unavailable: {e}")
            self.redis_client = None
            self.enabled = False

        # Rate limit configurations
        self.rate_limits = {
            # PAM AI queries
            "/api/v1/pam": {"limit": 60, "window": 60, "by": "user"},

            # Edge Functions (read)
            "/functions/v1/pam-spend-summary": {"limit": 100, "window": 60, "by": "user"},
            "/functions/v1/pam-fuel-estimate": {"limit": 100, "window": 60, "by": "user"},

            # Edge Functions (write)
            "/functions/v1/pam-expense-create": {"limit": 20, "window": 60, "by": "user"},

            # Authentication endpoints
            "/api/v1/auth": {"limit": 10, "window": 60, "by": "ip"},

            # Default for all other endpoints
            "default": {"limit": 120, "window": 60, "by": "user"},
        }

    def _get_rate_limit_config(self, path: str) -> dict:
        """Get rate limit config for a path"""
        # Check exact match first
        if path in self.rate_limits:
            return self.rate_limits[path]

        # Check prefix match
        for route_pattern, config in self.rate_limits.items():
            if route_pattern != "default" and path.startswith(route_pattern):
                return config

        # Return default
        return self.rate_limits["default"]

    def _get_identifier(self, request: Request, identifier_type: str) -> str:
        """Get rate limit identifier (user ID or IP)"""
        if identifier_type == "user":
            # Try to get user ID from JWT token
            auth_header = request.headers.get("Authorization", "")
            if auth_header.startswith("Bearer "):
                token = auth_header.replace("Bearer ", "")
                # Hash token for privacy (first 32 chars for uniqueness)
                user_hash = hashlib.sha256(token[:32].encode()).hexdigest()[:16]
                return f"user:{user_hash}"

            # Fallback to IP if no auth
            return f"ip:{self._get_client_ip(request)}"

        # identifier_type == "ip"
        return f"ip:{self._get_client_ip(request)}"

    def _get_client_ip(self, request: Request) -> str:
        """Get client IP address"""
        # Check X-Forwarded-For header (from proxy)
        forwarded = request.headers.get("X-Forwarded-For")
        if forwarded:
            return forwarded.split(",")[0].strip()

        # Check X-Real-IP header
        real_ip = request.headers.get("X-Real-IP")
        if real_ip:
            return real_ip

        # Fallback to direct connection
        return request.client.host if request.client else "unknown"

    async def _check_rate_limit(
        self, identifier: str, limit: int, window: int
    ) -> Tuple[bool, dict]:
        """
        Check if request should be rate limited using sliding window algorithm

        Returns:
            (is_allowed, rate_limit_info)
        """
        if not self.enabled:
            return True, {}

        try:
            # Redis key for this identifier
            key = f"rate_limit:{identifier}"
            current_time = time.time()
            window_start = current_time - window

            # Remove old entries (outside window)
            self.redis_client.zremrangebyscore(key, 0, window_start)

            # Count current requests in window
            current_count = self.redis_client.zcard(key)

            if current_count >= limit:
                # Rate limit exceeded
                # Get oldest entry to calculate reset time
                oldest_entries = self.redis_client.zrange(key, 0, 0, withscores=True)
                if oldest_entries:
                    oldest_time = oldest_entries[0][1]
                    reset_time = int(oldest_time + window)
                else:
                    reset_time = int(current_time + window)

                return False, {
                    "limit": limit,
                    "remaining": 0,
                    "reset": reset_time,
                    "retry_after": int(reset_time - current_time),
                }

            # Allow request - add to sliding window
            self.redis_client.zadd(key, {str(current_time): current_time})

            # Set expiry on key (cleanup)
            self.redis_client.expire(key, window * 2)

            # Calculate remaining requests
            remaining = limit - (current_count + 1)

            return True, {
                "limit": limit,
                "remaining": remaining,
                "reset": int(current_time + window),
            }

        except Exception as e:
            logger.error(f"Rate limit check failed: {e}", exc_info=True)
            # Fail open (allow request) if Redis fails
            return True, {}

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        """Check rate limit before processing request"""

        # Skip rate limiting for health checks
        if request.url.path in ["/health", "/api/health"]:
            return await call_next(request)

        # Get rate limit config for this path
        config = self._get_rate_limit_config(request.url.path)

        # Get identifier
        identifier = self._get_identifier(request, config["by"])

        # Check rate limit
        is_allowed, rate_info = await self._check_rate_limit(
            identifier, config["limit"], config["window"]
        )

        # Add rate limit headers to response
        if is_allowed:
            response = await call_next(request)

            if rate_info:
                response.headers["X-RateLimit-Limit"] = str(rate_info["limit"])
                response.headers["X-RateLimit-Remaining"] = str(rate_info["remaining"])
                response.headers["X-RateLimit-Reset"] = str(rate_info["reset"])

            return response

        # Rate limit exceeded - return 429
        return JSONResponse(
            status_code=429,
            content={
                "error": "Rate limit exceeded",
                "message": f"Too many requests. Please try again in {rate_info.get('retry_after', 60)} seconds.",
                "retry_after": rate_info.get("retry_after"),
            },
            headers={
                "X-RateLimit-Limit": str(rate_info["limit"]),
                "X-RateLimit-Remaining": "0",
                "X-RateLimit-Reset": str(rate_info["reset"]),
                "Retry-After": str(rate_info.get("retry_after", 60)),
            },
        )


def add_rate_limiting(app, redis_url: Optional[str] = None):
    """Helper function to add rate limiting middleware"""
    app.add_middleware(RateLimitMiddleware, redis_url=redis_url)
