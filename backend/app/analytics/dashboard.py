from datetime import datetime, timedelta
from typing import Any, Dict, List

from app.database.supabase_client import get_supabase_client
from app.core.logging import setup_logging, get_logger

setup_logging()
logger = get_logger(__name__)

async def fetch_dashboard_stats() -> Dict[str, Any]:
    """Return basic analytics for the admin dashboard."""
    client = get_supabase_client()
    one_day_ago = datetime.utcnow() - timedelta(days=1)
    daily_active_users = 0
    top_intents: List[Any] = []
    revenue = 0.0

    try:
        resp = (
            client.table("pam_analytics_logs")
            .select("user_id,intent")
            .filter("timestamp", "gte", one_day_ago.isoformat())
            .execute()
        )
        records = resp.data or []
        daily_active_users = len({r.get("user_id") for r in records if r.get("user_id")})
        intents: Dict[str, int] = {}
        for r in records:
            intent = r.get("intent")
            if intent:
                intents[intent] = intents.get(intent, 0) + 1
        top_intents = sorted(intents.items(), key=lambda x: x[1], reverse=True)[:5]
    except Exception as exc:
        logger.error(f"Failed to fetch user analytics: {exc}")

    try:
        resp = client.table("affiliate_sales").select("amount_total").execute()
        records = resp.data or []
        revenue = sum(r.get("amount_total", 0) or 0 for r in records) / 100
    except Exception as exc:
        if 'does not exist' in str(exc).lower():
            logger.info(f"affiliate_sales table doesn't exist yet - revenue will be 0")
            revenue = 0
        else:
            logger.error(f"Failed to fetch revenue stats: {exc}")

    return {
        "daily_active_users": daily_active_users,
        "top_intents": top_intents,
        "revenue": revenue,
    }
