"""
Production Usage Tracker Middleware

Tracks which API endpoints are actually called in production.
Used to safely identify truly unused code before deletion.

Part of: ENTERPRISE_DEAD_CODE_REMOVAL_PLAN.md
Timeline: 2-week monitoring (October 8-22, 2025)
"""

from fastapi import Request
from datetime import datetime
import logging
import os

logger = logging.getLogger(__name__)

# Redis connection (optional - graceful degradation if unavailable)
try:
    import redis

    # Support both REDIS_URL (Render/production) and REDIS_HOST/PORT (local dev)
    redis_url = os.getenv('REDIS_URL')
    if redis_url:
        # Parse connection string (e.g., redis://user:pass@host:port/db)
        redis_client = redis.from_url(
            redis_url,
            db=1,
            socket_connect_timeout=1,
            decode_responses=True
        )
        logger.info(f"✅ Usage tracker: Connecting to Redis via REDIS_URL")
    else:
        # Fall back to host/port format for local development
        redis_client = redis.Redis(
            host=os.getenv('REDIS_HOST', 'localhost'),
            port=int(os.getenv('REDIS_PORT', 6379)),
            db=1,
            socket_connect_timeout=1,
            decode_responses=True
        )
        logger.info(f"✅ Usage tracker: Connecting to Redis via REDIS_HOST/PORT")

    redis_client.ping()
    REDIS_AVAILABLE = True
    logger.info("✅ Usage tracker: Redis connected successfully")
except Exception as e:
    REDIS_AVAILABLE = False
    logger.warning(f"⚠️ Usage tracker: Redis not available ({e}), tracking disabled")


async def track_api_usage(request: Request, call_next):
    """
    Track which endpoints are actually called in production.

    Stores:
    - Endpoint path (e.g., POST:/api/v1/pam/chat)
    - Timestamp of each call
    - Count of calls

    Data retention: 30 days
    """
    if REDIS_AVAILABLE:
        try:
            endpoint = f"{request.method}:{request.url.path}"
            timestamp = datetime.utcnow().isoformat()

            # Track endpoint usage with sorted set (timestamp as score)
            key = f"endpoint_usage:{endpoint}"
            redis_client.zadd(key, {timestamp: datetime.utcnow().timestamp()})
            redis_client.expire(key, 60 * 60 * 24 * 30)  # 30 days retention

            # Increment call counter
            counter_key = f"endpoint_count:{endpoint}"
            redis_client.incr(counter_key)
            redis_client.expire(counter_key, 60 * 60 * 24 * 30)

        except Exception as e:
            logger.error(f"Usage tracking failed for {request.url.path}: {e}")

    response = await call_next(request)
    return response


def get_usage_stats(days: int = 14):
    """
    Get usage statistics for the past N days.

    Returns:
        dict: Endpoint usage data
    """
    if not REDIS_AVAILABLE:
        return {"error": "Redis not available"}

    try:
        cutoff_time = (datetime.utcnow().timestamp()) - (days * 24 * 60 * 60)

        # Get all endpoint usage keys
        endpoint_keys = redis_client.keys("endpoint_usage:*")

        stats = {}
        for key in endpoint_keys:
            endpoint = key.replace("endpoint_usage:", "")

            # Count calls in time range
            count = redis_client.zcount(key, cutoff_time, "+inf")

            if count > 0:
                stats[endpoint] = {
                    "calls": count,
                    "last_used": datetime.fromtimestamp(
                        redis_client.zrevrange(key, 0, 0, withscores=True)[0][1]
                    ).isoformat() if count > 0 else None
                }

        return {
            "period_days": days,
            "endpoints_used": len(stats),
            "stats": stats,
            "generated_at": datetime.utcnow().isoformat()
        }

    except Exception as e:
        logger.error(f"Failed to get usage stats: {e}")
        return {"error": str(e)}
