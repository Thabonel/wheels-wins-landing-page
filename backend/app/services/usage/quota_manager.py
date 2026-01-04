"""
PAM Usage Quota Manager
Handles per-user usage tracking, quota enforcement, and billing cost calculations
"""

import logging
from datetime import datetime, date
from decimal import Decimal
from typing import Dict, Any, Optional, Tuple
from dataclasses import dataclass
from uuid import UUID

from app.integrations.supabase import get_supabase_client

logger = logging.getLogger(__name__)


@dataclass
class QuotaStatus:
    """Current quota status for a user"""
    user_id: str
    subscription_tier: str
    monthly_query_limit: int
    queries_used_this_month: int
    queries_remaining: int
    overage_queries: int
    total_cost_usd: Decimal
    monthly_reset_date: date
    is_over_limit: bool
    is_in_grace_period: bool
    should_show_warning: bool
    warning_level: str  # "none", "80%", "90%", "100%", "110%", "hard_limit"


# Model pricing (per 1M tokens)
MODEL_PRICING = {
    "claude-sonnet-4-5-20250929": {
        "input": 0.003,   # $3/1M input tokens
        "output": 0.015   # $15/1M output tokens
    },
    "claude-3-5-sonnet-20241022": {
        "input": 0.003,
        "output": 0.015
    },
    "gpt-5.1-instant": {
        "input": 0.00125,  # $1.25/1M tokens
        "output": 0.01     # $10/1M tokens
    },
    "gpt-5-turbo": {
        "input": 0.00125,
        "output": 0.01
    },
    "gpt-4-turbo": {
        "input": 0.01,
        "output": 0.03
    }
}


def calculate_cost(
    model: str,
    input_tokens: int,
    output_tokens: int
) -> Decimal:
    """
    Calculate cost for AI API call based on model and token counts.

    Args:
        model: Model identifier (e.g., "claude-sonnet-4-5-20250929")
        input_tokens: Number of input tokens
        output_tokens: Number of output tokens

    Returns:
        Cost in USD (Decimal for precision)
    """
    # Get pricing for model, default to Claude Sonnet 4.5
    pricing = MODEL_PRICING.get(model, MODEL_PRICING["claude-sonnet-4-5-20250929"])

    input_cost = (input_tokens / 1_000_000) * pricing["input"]
    output_cost = (output_tokens / 1_000_000) * pricing["output"]

    total_cost = Decimal(str(input_cost + output_cost))
    return round(total_cost, 6)  # 6 decimal places for precision


async def check_user_quota(user_id: str) -> QuotaStatus:
    """
    Check user's current quota status.

    Args:
        user_id: User UUID

    Returns:
        QuotaStatus with current usage and limits

    Raises:
        ValueError: If user quota record not found
    """
    supabase = get_supabase_client()

    # Get user quota from database
    result = supabase.table("user_usage_quotas").select("*").eq("user_id", user_id).execute()

    if not result.data:
        raise ValueError(f"No quota record found for user {user_id}")

    quota = result.data[0]

    # Calculate quota status
    queries_used = quota["queries_used_this_month"]
    limit = quota["monthly_query_limit"]
    remaining = max(0, limit - queries_used)
    overage = max(0, queries_used - limit)

    # Hard limit at 130 queries (30 grace queries)
    grace_limit = limit + 30
    is_over_hard_limit = queries_used >= grace_limit
    is_in_grace = limit < queries_used < grace_limit

    # Warning levels
    usage_pct = (queries_used / limit) * 100 if limit > 0 else 0

    if is_over_hard_limit:
        warning_level = "hard_limit"
        should_warn = True
    elif usage_pct >= 110:
        warning_level = "110%"
        should_warn = True
    elif usage_pct >= 100:
        warning_level = "100%"
        should_warn = True
    elif usage_pct >= 90:
        warning_level = "90%"
        should_warn = True
    elif usage_pct >= 80:
        warning_level = "80%"
        should_warn = True
    else:
        warning_level = "none"
        should_warn = False

    return QuotaStatus(
        user_id=user_id,
        subscription_tier=quota["subscription_tier"],
        monthly_query_limit=limit,
        queries_used_this_month=queries_used,
        queries_remaining=remaining,
        overage_queries=overage,
        total_cost_usd=Decimal(str(quota["total_cost_usd"])),
        monthly_reset_date=datetime.fromisoformat(quota["monthly_reset_date"]).date(),
        is_over_limit=queries_used >= limit,
        is_in_grace_period=is_in_grace,
        should_show_warning=should_warn,
        warning_level=warning_level
    )


async def log_usage(
    user_id: str,
    conversation_id: Optional[str],
    model: str,
    input_tokens: int,
    output_tokens: int,
    intent: Optional[str] = None,
    tool_names: Optional[list] = None,
    success: bool = True,
    error_message: Optional[str] = None,
    response_time_ms: Optional[int] = None
) -> Tuple[str, Decimal]:
    """
    Log a PAM usage event and update user quotas.

    Args:
        user_id: User UUID
        conversation_id: Conversation UUID (optional)
        model: AI model used
        input_tokens: Input token count
        output_tokens: Output token count
        intent: Detected intent (optional)
        tool_names: List of tools executed (optional)
        success: Whether the query succeeded
        error_message: Error message if failed (optional)
        response_time_ms: Response time in milliseconds (optional)

    Returns:
        Tuple of (log_id, estimated_cost_usd)
    """
    supabase = get_supabase_client()

    # Calculate cost
    total_tokens = input_tokens + output_tokens
    cost = calculate_cost(model, input_tokens, output_tokens)

    # Log to pam_usage_logs
    log_data = {
        "user_id": user_id,
        "conversation_id": conversation_id,
        "model_used": model,
        "input_tokens": input_tokens,
        "output_tokens": output_tokens,
        "total_tokens": total_tokens,
        "estimated_cost_usd": float(cost),
        "intent": intent,
        "tool_names": tool_names or [],
        "success": success,
        "error_message": error_message,
        "response_time_ms": response_time_ms
    }

    log_result = supabase.table("pam_usage_logs").insert(log_data).execute()
    log_id = log_result.data[0]["id"] if log_result.data else None

    # Update user_usage_quotas
    # Use PostgreSQL function to atomically increment counters
    supabase.rpc(
        "increment_user_quota",
        {
            "p_user_id": user_id,
            "p_tokens": total_tokens,
            "p_cost": float(cost)
        }
    ).execute()

    logger.info(
        f"💰 Logged usage for user {user_id[:8]}: "
        f"{total_tokens} tokens ({input_tokens} in, {output_tokens} out), "
        f"cost ${cost:.6f}, model {model}"
    )

    return log_id, cost


async def get_usage_stats(
    user_id: str,
    period: str = "month"
) -> Dict[str, Any]:
    """
    Get usage statistics for a user.

    Args:
        user_id: User UUID
        period: Time period ("day", "week", "month", "all")

    Returns:
        Dict with usage statistics
    """
    supabase = get_supabase_client()

    # Get current quota status
    quota = await check_user_quota(user_id)

    # Query usage logs based on period
    query = supabase.table("pam_usage_logs").select("*").eq("user_id", user_id)

    if period == "day":
        query = query.gte("timestamp", datetime.now().replace(hour=0, minute=0, second=0).isoformat())
    elif period == "week":
        from datetime import timedelta
        week_ago = datetime.now() - timedelta(days=7)
        query = query.gte("timestamp", week_ago.isoformat())
    elif period == "month":
        query = query.gte("timestamp", datetime.now().replace(day=1, hour=0, minute=0, second=0).isoformat())

    logs = query.order("timestamp", desc=True).execute()

    # Calculate stats
    total_queries = len(logs.data) if logs.data else 0
    successful_queries = sum(1 for log in logs.data if log["success"]) if logs.data else 0
    failed_queries = total_queries - successful_queries
    total_tokens = sum(log["total_tokens"] for log in logs.data) if logs.data else 0
    total_cost = sum(Decimal(str(log["estimated_cost_usd"])) for log in logs.data) if logs.data else Decimal("0")

    # Group by model
    model_breakdown = {}
    if logs.data:
        for log in logs.data:
            model = log["model_used"]
            if model not in model_breakdown:
                model_breakdown[model] = {"queries": 0, "tokens": 0, "cost": Decimal("0")}
            model_breakdown[model]["queries"] += 1
            model_breakdown[model]["tokens"] += log["total_tokens"]
            model_breakdown[model]["cost"] += Decimal(str(log["estimated_cost_usd"]))

    return {
        "period": period,
        "quota_status": {
            "subscription_tier": quota.subscription_tier,
            "monthly_limit": quota.monthly_query_limit,
            "queries_used": quota.queries_used_this_month,
            "queries_remaining": quota.queries_remaining,
            "overage_queries": quota.overage_queries,
            "total_cost_usd": float(quota.total_cost_usd),
            "monthly_reset_date": quota.monthly_reset_date.isoformat(),
            "warning_level": quota.warning_level
        },
        "period_stats": {
            "total_queries": total_queries,
            "successful_queries": successful_queries,
            "failed_queries": failed_queries,
            "total_tokens": total_tokens,
            "total_cost_usd": float(total_cost)
        },
        "model_breakdown": {
            model: {
                "queries": stats["queries"],
                "tokens": stats["tokens"],
                "cost_usd": float(stats["cost"])
            }
            for model, stats in model_breakdown.items()
        }
    }


async def reset_monthly_quotas() -> int:
    """
    Reset monthly quotas for all users.
    Called by Celery Beat on 1st of month.

    Returns:
        Number of quotas reset
    """
    supabase = get_supabase_client()

    # Get all quotas that need resetting
    result = supabase.table("user_usage_quotas").select("user_id").execute()

    if not result.data:
        logger.warning("No quota records found to reset")
        return 0

    # Reset counters
    from datetime import timedelta
    next_reset = (datetime.now().replace(day=1, hour=0, minute=0, second=0) + timedelta(days=32)).replace(day=1)

    update_data = {
        "queries_used_this_month": 0,
        "overage_queries": 0,
        "monthly_reset_date": next_reset.date().isoformat(),
        "updated_at": datetime.now().isoformat()
    }

    supabase.table("user_usage_quotas").update(update_data).neq("user_id", "00000000-0000-0000-0000-000000000000").execute()

    count = len(result.data)
    logger.info(f"🔄 Reset monthly quotas for {count} users")

    return count
