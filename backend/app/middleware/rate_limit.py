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

        # Enhanced rate limit configurations with admin support and per-IP limits
        self.rate_limits = {
            # PAM AI queries - differentiated by role
            "/api/v1/pam": {"limit": 100, "window": 60, "by": "user", "admin_limit": 1000},

            # Edge Functions (read)
            "/functions/v1/pam-spend-summary": {"limit": 100, "window": 60, "by": "user", "admin_limit": 500},
            "/functions/v1/pam-fuel-estimate": {"limit": 100, "window": 60, "by": "user", "admin_limit": 500},

            # Edge Functions (write)
            "/functions/v1/pam-expense-create": {"limit": 20, "window": 60, "by": "user", "admin_limit": 100},

            # Authentication endpoints - strict IP-based limiting
            "/api/v1/auth": {"limit": 10, "window": 60, "by": "ip", "strict_ip": True},
            "/api/auth": {"limit": 10, "window": 60, "by": "ip", "strict_ip": True},

            # Admin endpoints - admin-only with audit logging
            "/api/v1/admin": {"limit": 50, "window": 60, "by": "user", "admin_only": True, "audit_required": True},

            # File upload endpoints - strict limits
            "/api/v1/pam/voice": {"limit": 30, "window": 60, "by": "user", "admin_limit": 100},

            # WebSocket connections - per IP and per user
            "/api/v1/pam/ws": {"limit": 5, "window": 60, "by": "user", "ip_limit": 10},

            # Global per-IP rate limiting (fallback protection)
            "ip_global": {"limit": 200, "window": 60, "by": "ip"},

            # Default for all other endpoints
            "default": {"limit": 100, "window": 60, "by": "user", "admin_limit": 1000},
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

    def _is_admin_user(self, request: Request) -> bool:
        """Check if the request is from an admin user"""
        try:
            auth_header = request.headers.get("Authorization", "")
            if not auth_header.startswith("Bearer "):
                return False

            token = auth_header.replace("Bearer ", "")

            # Simple JWT decode to check role (without verification for rate limiting)
            import base64
            import json

            # Split token and get payload
            parts = token.split('.')
            if len(parts) != 3:
                return False

            # Decode payload (add padding if needed)
            payload_b64 = parts[1]
            payload_b64 += '=' * (4 - len(payload_b64) % 4)
            payload = base64.urlsafe_b64decode(payload_b64)

            user_data = json.loads(payload)
            user_role = user_data.get('role', '').lower()

            # Check for admin role indicators
            return user_role in ['admin', 'administrator'] or user_data.get('is_admin', False)

        except Exception:
            # If any error in parsing, treat as non-admin
            return False

    def _get_effective_limit(self, config: dict, request: Request) -> int:
        """Get the effective rate limit based on user role"""
        base_limit = config["limit"]

        # Check if admin gets higher limits
        if "admin_limit" in config and self._is_admin_user(request):
            return config["admin_limit"]

        return base_limit

    def _should_audit_request(self, config: dict, request: Request) -> bool:
        """Check if this request should be audit logged"""
        return config.get("audit_required", False) and (
            config.get("admin_only", False) or self._is_admin_user(request)
        )

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
        """Enhanced rate limiting with admin support and global IP limiting"""

        # Skip rate limiting for health checks
        if request.url.path in ["/health", "/api/health", "/api/security"]:
            return await call_next(request)

        # Get rate limit config for this path
        config = self._get_rate_limit_config(request.url.path)

        # Check admin-only endpoints
        if config.get("admin_only", False) and not self._is_admin_user(request):
            return JSONResponse(
                status_code=403,
                content={
                    "error": "Forbidden",
                    "message": "Admin access required",
                    "timestamp": time.time()
                }
            )

        # Get effective limit based on user role
        effective_limit = self._get_effective_limit(config, request)

        # Get primary identifier
        identifier = self._get_identifier(request, config["by"])

        # Check primary rate limit
        is_allowed, rate_info = await self._check_rate_limit(
            identifier, effective_limit, config["window"]
        )

        # Also check global IP rate limiting
        ip_identifier = f"ip:{self._get_client_ip(request)}"
        ip_config = self.rate_limits.get("ip_global", {"limit": 200, "window": 60})

        ip_allowed, ip_rate_info = await self._check_rate_limit(
            ip_identifier, ip_config["limit"], ip_config["window"]
        )

        # Check additional IP-specific limits for certain endpoints
        if config.get("ip_limit"):
            ip_specific_allowed, _ = await self._check_rate_limit(
                f"ip_specific:{self._get_client_ip(request)}:{request.url.path}",
                config["ip_limit"],
                config["window"]
            )
            if not ip_specific_allowed:
                return JSONResponse(
                    status_code=429,
                    content={
                        "error": "IP rate limit exceeded",
                        "message": "Too many requests from this IP address for this endpoint",
                        "retry_after": 60,
                    },
                    headers={"Retry-After": "60"},
                )

        # Audit logging for admin endpoints
        if self._should_audit_request(config, request):
            logger.info("Admin endpoint access", extra={
                "user_ip": self._get_client_ip(request),
                "endpoint": request.url.path,
                "method": request.method,
                "user_agent": request.headers.get("User-Agent", "unknown"),
                "rate_limit_used": rate_info.get("limit", 0) - rate_info.get("remaining", 0),
                "is_admin": self._is_admin_user(request)
            })

        # Check if either rate limit is exceeded
        if not is_allowed:
            limiting_factor = "user" if config["by"] == "user" else "endpoint"
            return JSONResponse(
                status_code=429,
                content={
                    "error": "Rate limit exceeded",
                    "message": f"Too many requests ({limiting_factor} limit). Please try again in {rate_info.get('retry_after', 60)} seconds.",
                    "retry_after": rate_info.get("retry_after"),
                    "limit_type": limiting_factor,
                },
                headers={
                    "X-RateLimit-Limit": str(rate_info["limit"]),
                    "X-RateLimit-Remaining": "0",
                    "X-RateLimit-Reset": str(rate_info["reset"]),
                    "Retry-After": str(rate_info.get("retry_after", 60)),
                },
            )

        if not ip_allowed:
            return JSONResponse(
                status_code=429,
                content={
                    "error": "IP rate limit exceeded",
                    "message": f"Too many requests from this IP. Please try again in {ip_rate_info.get('retry_after', 60)} seconds.",
                    "retry_after": ip_rate_info.get("retry_after"),
                    "limit_type": "ip_global",
                },
                headers={
                    "X-RateLimit-Limit": str(ip_rate_info["limit"]),
                    "X-RateLimit-Remaining": "0",
                    "X-RateLimit-Reset": str(ip_rate_info["reset"]),
                    "Retry-After": str(ip_rate_info.get("retry_after", 60)),
                },
            )

        # Process request
        response = await call_next(request)

        # Add comprehensive rate limit headers
        if rate_info:
            response.headers["X-RateLimit-Limit"] = str(rate_info["limit"])
            response.headers["X-RateLimit-Remaining"] = str(rate_info["remaining"])
            response.headers["X-RateLimit-Reset"] = str(rate_info["reset"])

        if ip_rate_info:
            response.headers["X-RateLimit-IP-Limit"] = str(ip_rate_info["limit"])
            response.headers["X-RateLimit-IP-Remaining"] = str(ip_rate_info["remaining"])

        # Add admin status for debugging
        if self._is_admin_user(request):
            response.headers["X-User-Role"] = "admin"

        return response


def add_rate_limiting(app, redis_url: Optional[str] = None):
    """Helper function to add rate limiting middleware"""
    app.add_middleware(RateLimitMiddleware, redis_url=redis_url)
