"""
PAM Quota Middleware
Simple wrapper for PAM responses that checks quotas and logs usage
"""

import logging
from typing import Dict, Any, Optional, Callable
from functools import wraps

from .quota_manager import check_user_quota, log_usage, QuotaStatus

logger = logging.getLogger(__name__)


class QuotaExceededError(Exception):
    """Raised when user exceeds hard quota limit (130 queries)"""
    def __init__(self, status: QuotaStatus):
        self.status = status
        super().__init__(f"Hard quota limit exceeded: {status.queries_used_this_month}/{status.monthly_query_limit}")


async def check_quota_before_request(user_id: str) -> QuotaStatus:
    """
    Check quota before processing PAM request.
    Raises QuotaExceededError if hard limit exceeded.

    Args:
        user_id: User UUID

    Returns:
        QuotaStatus object

    Raises:
        QuotaExceededError: If hard limit (130 queries) exceeded
    """
    quota = await check_user_quota(user_id)

    # Hard limit check (130 queries = 100 base + 30 grace)
    if quota.warning_level == "hard_limit":
        logger.warning(
            f"🚫 Hard quota limit reached for user {user_id[:8]}: "
            f"{quota.queries_used_this_month}/{quota.monthly_query_limit} queries"
        )
        raise QuotaExceededError(quota)

    # Log warning levels
    if quota.should_show_warning:
        logger.info(
            f"⚠️  User {user_id[:8]} at {quota.warning_level} quota: "
            f"{quota.queries_used_this_month}/{quota.monthly_query_limit} queries"
        )

    return quota


async def log_usage_after_request(
    user_id: str,
    ai_response: Dict[str, Any],
    conversation_id: Optional[str] = None,
    model: Optional[str] = None,
    intent: Optional[str] = None,
    tool_names: Optional[list] = None,
    success: bool = True,
    error_message: Optional[str] = None,
    response_time_ms: Optional[int] = None
) -> Dict[str, Any]:
    """
    Log usage after PAM response and add quota status to response.

    Args:
        user_id: User UUID
        ai_response: AI response object with usage data
        conversation_id: Conversation UUID (optional)
        model: AI model used (optional - will extract from ai_response)
        intent: Detected intent (optional)
        tool_names: Tools executed (optional)
        success: Whether request succeeded
        error_message: Error message if failed
        response_time_ms: Response time in milliseconds

    Returns:
        AI response dict with added quota_status field
    """
    try:
        # Extract usage data from AI response
        usage = ai_response.get("usage", {})
        input_tokens = usage.get("prompt_tokens", 0)
        output_tokens = usage.get("completion_tokens", 0)

        # Get model from response if not provided
        if not model:
            model = ai_response.get("model", "claude-sonnet-4-5-20250929")

        # Log usage to database
        log_id, cost = await log_usage(
            user_id=user_id,
            conversation_id=conversation_id,
            model=model,
            input_tokens=input_tokens,
            output_tokens=output_tokens,
            intent=intent,
            tool_names=tool_names,
            success=success,
            error_message=error_message,
            response_time_ms=response_time_ms
        )

        # Get updated quota status
        quota = await check_user_quota(user_id)

        # Add quota status to response
        ai_response["quota_status"] = {
            "queries_used": quota.queries_used_this_month,
            "queries_remaining": quota.queries_remaining,
            "monthly_limit": quota.monthly_query_limit,
            "overage_queries": quota.overage_queries,
            "warning_level": quota.warning_level,
            "should_show_warning": quota.should_show_warning,
            "is_in_grace_period": quota.is_in_grace_period,
            "total_cost_usd": float(quota.total_cost_usd),
            "subscription_tier": quota.subscription_tier
        }

        # Add usage log metadata
        ai_response["usage_log_id"] = log_id
        ai_response["estimated_cost_usd"] = float(cost)

        logger.info(
            f"📊 Usage logged for user {user_id[:8]}: "
            f"{quota.queries_used_this_month}/{quota.monthly_query_limit} queries, "
            f"${cost:.6f} cost"
        )

        return ai_response

    except Exception as e:
        logger.error(f"❌ Failed to log usage for user {user_id[:8]}: {e}")
        # Don't fail the request if logging fails
        return ai_response


def with_quota_check(func: Callable):
    """
    Decorator to add quota checking to PAM endpoint handlers.

    Usage:
        @with_quota_check
        async def handle_pam_request(user_id: str, message: str, ...):
            # Your handler code
            return ai_response
    """
    @wraps(func)
    async def wrapper(*args, **kwargs):
        # Extract user_id from arguments
        user_id = kwargs.get("user_id")
        if not user_id and len(args) > 0:
            user_id = args[0]  # Assume first arg is user_id

        if not user_id:
            raise ValueError("user_id required for quota check")

        # Check quota before processing
        await check_quota_before_request(user_id)

        # Execute the original function
        return await func(*args, **kwargs)

    return wrapper
