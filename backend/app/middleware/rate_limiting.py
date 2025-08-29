"""
Advanced Rate Limiting Middleware for PAM API

Provides sophisticated rate limiting capabilities with:
- Sliding window algorithm for accurate rate limiting
- Different limits for different endpoint types
- User-based and IP-based rate limiting
- Automatic cleanup of expired requests
- Integration with security middleware
"""

from collections import defaultdict
from datetime import datetime, timedelta
from typing import Dict, List, Tuple, Optional
import asyncio
import time
import logging
from enum import Enum

logger = logging.getLogger(__name__)

class RateLimitType(Enum):
    """Types of rate limits that can be applied"""
    PER_USER = "per_user"
    PER_IP = "per_ip"
    PER_ENDPOINT = "per_endpoint"
    GLOBAL = "global"

class RateLimitResult:
    """Result of rate limit check"""
    def __init__(self, allowed: bool, remaining: int = 0, reset_time: Optional[datetime] = None, reason: str = ""):
        self.allowed = allowed
        self.remaining = remaining
        self.reset_time = reset_time
        self.reason = reason

class AdvancedRateLimiter:
    """
    Advanced rate limiter with sliding window algorithm and multiple limit types
    """
    
    def __init__(self, max_requests: int = 60, window_seconds: int = 60, cleanup_interval: int = 300):
        self.max_requests = max_requests
        self.window = timedelta(seconds=window_seconds)
        self.window_seconds = window_seconds
        self.cleanup_interval = cleanup_interval
        
        # Store requests with timestamps
        self.requests: Dict[str, List[datetime]] = defaultdict(list)
        
        # Track when we last cleaned up expired requests
        self.last_cleanup = time.time()
        
        logger.info(f"Rate limiter initialized: {max_requests} requests per {window_seconds}s window")
    
    async def check_rate_limit(self, identifier: str, endpoint: str = "default") -> RateLimitResult:
        """
        Check if request should be allowed based on rate limits
        
        Args:
            identifier: User ID, IP address, or other identifier
            endpoint: Endpoint being accessed (for endpoint-specific limits)
            
        Returns:
            RateLimitResult with decision and metadata
        """
        now = datetime.now()
        
        # Periodic cleanup of old requests
        if time.time() - self.last_cleanup > self.cleanup_interval:
            await self._cleanup_expired_requests(now)
        
        # Get request history for this identifier
        request_times = self.requests[identifier]
        
        # Remove expired requests (sliding window)
        valid_requests = [
            req_time for req_time in request_times
            if now - req_time < self.window
        ]
        
        # Update the list with only valid requests
        self.requests[identifier] = valid_requests
        
        # Check if limit would be exceeded
        if len(valid_requests) >= self.max_requests:
            # Find when the oldest request will expire
            oldest_request = min(valid_requests) if valid_requests else now
            reset_time = oldest_request + self.window
            
            return RateLimitResult(
                allowed=False,
                remaining=0,
                reset_time=reset_time,
                reason=f"Rate limit exceeded: {len(valid_requests)}/{self.max_requests} requests in {self.window_seconds}s window"
            )
        
        # Allow the request and record it
        self.requests[identifier].append(now)
        remaining = self.max_requests - len(self.requests[identifier])
        
        return RateLimitResult(
            allowed=True,
            remaining=remaining,
            reset_time=now + self.window,
            reason="Request allowed"
        )
    
    async def _cleanup_expired_requests(self, now: datetime):
        """Clean up expired requests to prevent memory bloat"""
        cleaned_count = 0
        empty_keys = []
        
        for identifier, request_times in self.requests.items():
            # Filter out expired requests
            valid_requests = [
                req_time for req_time in request_times
                if now - req_time < self.window
            ]
            
            cleaned_count += len(request_times) - len(valid_requests)
            
            if valid_requests:
                self.requests[identifier] = valid_requests
            else:
                empty_keys.append(identifier)
        
        # Remove empty entries
        for key in empty_keys:
            del self.requests[key]
        
        self.last_cleanup = time.time()
        
        if cleaned_count > 0:
            logger.debug(f"Rate limiter cleanup: removed {cleaned_count} expired requests, {len(empty_keys)} empty entries")
    
    def get_stats(self) -> Dict:
        """Get current rate limiter statistics"""
        active_users = len(self.requests)
        total_active_requests = sum(len(reqs) for reqs in self.requests.values())
        
        return {
            "max_requests": self.max_requests,
            "window_seconds": self.window_seconds,
            "active_users": active_users,
            "total_active_requests": total_active_requests,
            "cleanup_interval": self.cleanup_interval,
            "last_cleanup": self.last_cleanup
        }

class MultiTierRateLimiter:
    """
    Multi-tier rate limiter supporting different limits for different scenarios
    """
    
    def __init__(self):
        # Different rate limiters for different scenarios
        self.limiters = {
            # WebSocket connections - more permissive for real-time communication
            "websocket": AdvancedRateLimiter(max_requests=60, window_seconds=60),
            
            # REST API calls - standard rate limiting
            "rest_api": AdvancedRateLimiter(max_requests=30, window_seconds=60),
            
            # Voice synthesis - more restrictive due to resource intensity
            "voice_synthesis": AdvancedRateLimiter(max_requests=10, window_seconds=60),
            
            # Feedback submissions - prevent spam
            "feedback": AdvancedRateLimiter(max_requests=5, window_seconds=60),
            
            # Authentication attempts - prevent brute force
            "auth": AdvancedRateLimiter(max_requests=5, window_seconds=300),  # 5 attempts per 5 minutes
            
            # File uploads/heavy operations
            "heavy_operations": AdvancedRateLimiter(max_requests=5, window_seconds=300)
        }
        
        logger.info("Multi-tier rate limiter initialized with specialized limits")
    
    async def check_limit(self, limit_type: str, identifier: str, endpoint: str = "default") -> RateLimitResult:
        """Check rate limit for specific limit type"""
        if limit_type not in self.limiters:
            # Fallback to REST API limits for unknown types
            limit_type = "rest_api"
            
        limiter = self.limiters[limit_type]
        result = await limiter.check_rate_limit(identifier, endpoint)
        
        if not result.allowed:
            logger.warning(f"Rate limit exceeded for {limit_type}: {identifier} - {result.reason}")
        
        return result
    
    def get_all_stats(self) -> Dict:
        """Get statistics for all rate limiters"""
        stats = {}
        for limit_type, limiter in self.limiters.items():
            stats[limit_type] = limiter.get_stats()
        return stats

# Global rate limiter instances
multi_tier_limiter = MultiTierRateLimiter()

# Convenience functions for different rate limit types
async def check_websocket_rate_limit(user_id: str) -> RateLimitResult:
    """Check rate limit for WebSocket connections"""
    return await multi_tier_limiter.check_limit("websocket", user_id, "websocket")

async def check_rest_api_rate_limit(user_id: str, endpoint: str = "api") -> RateLimitResult:
    """Check rate limit for REST API calls"""
    return await multi_tier_limiter.check_limit("rest_api", user_id, endpoint)

async def check_voice_rate_limit(user_id: str) -> RateLimitResult:
    """Check rate limit for voice synthesis requests"""
    return await multi_tier_limiter.check_limit("voice_synthesis", user_id, "voice")

async def check_feedback_rate_limit(user_id: str) -> RateLimitResult:
    """Check rate limit for feedback submissions"""
    return await multi_tier_limiter.check_limit("feedback", user_id, "feedback")

async def check_auth_rate_limit(identifier: str) -> RateLimitResult:
    """Check rate limit for authentication attempts"""
    return await multi_tier_limiter.check_limit("auth", identifier, "auth")

async def check_heavy_operation_rate_limit(user_id: str) -> RateLimitResult:
    """Check rate limit for heavy operations"""
    return await multi_tier_limiter.check_limit("heavy_operations", user_id, "heavy")

# Legacy compatibility function
class RateLimiter:
    """Legacy rate limiter for backward compatibility"""
    
    def __init__(self, max_requests: int = 60, window: int = 60):
        self.limiter = AdvancedRateLimiter(max_requests, window)
    
    async def check_rate_limit(self, user_id: str) -> bool:
        """Check rate limit - returns simple boolean for compatibility"""
        result = await self.limiter.check_rate_limit(user_id)
        return result.allowed

# Default rate limiter instance for backward compatibility
rate_limiter = RateLimiter(max_requests=60, window=60)