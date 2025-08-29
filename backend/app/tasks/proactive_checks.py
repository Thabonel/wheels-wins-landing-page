from __future__ import annotations

import json
from datetime import datetime, timedelta
from typing import Dict, List, Any

from app.core.logging import get_logger
from app.core.database import get_supabase_client
from app.core.websocket_manager import manager
from app.workers.tasks.notification_tasks import _get_weather_alert
from app.core.route_intelligence import route_intelligence
from app.services.pam.route_scraper import RouteIntelligentScraper

logger = get_logger(__name__)
scraper = RouteIntelligentScraper()


async def _get_active_users() -> List[Dict[str, Any]]:
    """Return users active in the last 24 hours."""
    supabase = get_supabase_client()
    cutoff = datetime.utcnow() - timedelta(hours=24)
    result = (
        supabase.table("pam_conversation_sessions")
        .select("user_id, profiles(email, region)")
        .gte("updated_at", cutoff.isoformat())
        .eq("is_active", True)
        .execute()
    )
    users = []
    for row in result.data or []:
        users.append(
            {
                "user_id": row.get("user_id"),
                "email": row.get("profiles", {}).get("email"),
                "region": row.get("profiles", {}).get("region"),
            }
        )
    return users


async def _get_budget_info(user_id: str) -> List[Dict[str, Any]]:
    """Fetch budget categories for the user."""
    supabase = get_supabase_client()
    response = (
        supabase.table("budget_categories")
        .select("name,budgeted_amount,spent_amount")
        .eq("user_id", user_id)
        .execute()
    )
    return response.data or []


def _budget_warning(budgets: List[Dict[str, Any]]) -> bool:
    for category in budgets:
        budgeted = category.get("budgeted_amount") or 0
        spent = category.get("spent_amount") or 0
        if budgeted and spent >= budgeted:
            return True
    return False


async def _prefetch_tomorrow_camps(user_id: str) -> List[Dict[str, Any]]:
    """Fetch camping options along the user's route for tomorrow."""
    try:
        zones = await route_intelligence.calculate_search_zones(user_id)
        tomorrow_zones = [z for z in zones if getattr(z, "zone_type", "") == "overnight" or getattr(z, "priority", 0) == 2]
        if not tomorrow_zones:
            return []
        return await scraper.scrape_zones(tomorrow_zones)
    except Exception as exc:  # pragma: no cover - best effort
        logger.error(f"Failed to prefetch camps for {user_id}: {exc}")
        return []


async def run_proactive_checks() -> None:
    """Check active users and notify them of important actions."""
    users = await _get_active_users()
    for user in users:
        uid = user["user_id"]
        region = user.get("region") or "Unknown"

        weather = _get_weather_alert(region)
        budgets = await _get_budget_info(uid)
        camps = await _prefetch_tomorrow_camps(uid)

        if weather or _budget_warning(budgets) or camps:
            message = {
                "type": "proactive_alert",
                "weather": weather,
                "budgets": budgets,
                "camps_tomorrow": camps,
            }
            try:
                await manager.send_message_to_user(json.dumps(message), uid)
            except Exception as exc:  # pragma: no cover - best effort
                logger.error(f"Failed to notify {uid}: {exc}")
