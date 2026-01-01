"""
Celery Task: Monthly Quota Reset
Resets user usage quotas on the 1st of each month
"""

import logging
from celery import shared_task

logger = logging.getLogger(__name__)


@shared_task(name="reset_monthly_quotas")
def reset_monthly_quotas_task():
    """
    Reset all user usage quotas on the 1st of the month.
    Scheduled via Celery Beat in celery_config.py

    Returns:
        dict: Task result with count of reset quotas
    """
    logger.info("🔄 Starting monthly quota reset task")

    try:
        # Import here to avoid circular imports
        import asyncio
        from app.services.usage import reset_monthly_quotas

        # Run async function in sync context
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        count = loop.run_until_complete(reset_monthly_quotas())
        loop.close()

        logger.info(f"✅ Monthly quota reset completed: {count} users reset")

        return {
            "status": "success",
            "users_reset": count,
            "message": f"Reset quotas for {count} users"
        }

    except Exception as e:
        logger.error(f"❌ Monthly quota reset failed: {e}")
        return {
            "status": "error",
            "error": str(e),
            "message": "Failed to reset monthly quotas"
        }


@shared_task(name="check_quota_health")
def check_quota_health_task():
    """
    Health check task to verify quota system is working.
    Runs daily to catch issues early.

    Returns:
        dict: Health check results
    """
    logger.info("🏥 Running quota health check")

    try:
        from app.integrations.supabase import get_supabase_client

        supabase = get_supabase_client()

        # Check if tables exist and have data
        quotas_count = supabase.table("user_usage_quotas").select("user_id", count="exact").execute()
        logs_count = supabase.table("pam_usage_logs").select("id", count="exact").execute()

        quota_count = quotas_count.count if hasattr(quotas_count, "count") else 0
        log_count = logs_count.count if hasattr(logs_count, "count") else 0

        # Check for users with suspicious usage (>150 queries/month)
        high_usage = supabase.table("user_usage_quotas")\
            .select("user_id, queries_used_this_month, subscription_tier")\
            .gt("queries_used_this_month", 150)\
            .execute()

        high_usage_users = len(high_usage.data) if high_usage.data else 0

        logger.info(
            f"✅ Quota health check passed: "
            f"{quota_count} quotas, {log_count} logs, {high_usage_users} high-usage users"
        )

        return {
            "status": "healthy",
            "quota_records": quota_count,
            "log_records": log_count,
            "high_usage_users": high_usage_users,
            "message": "Quota system healthy"
        }

    except Exception as e:
        logger.error(f"❌ Quota health check failed: {e}")
        return {
            "status": "unhealthy",
            "error": str(e),
            "message": "Quota health check failed"
        }
