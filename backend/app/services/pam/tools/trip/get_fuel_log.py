"""
Get user's fuel log entries from database.
"""
from typing import Dict, Any, Optional
from app.integrations.supabase import get_supabase_client
import logging

logger = logging.getLogger(__name__)

async def get_fuel_log(
    user_id: str,
    limit: int = 10,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None
) -> Dict[str, Any]:
    """
    Get user's fuel log entries with date, litres/gallons, and cost.

    Args:
        user_id: User's UUID
        limit: Max number of entries to return (default 10)
        start_date: Optional start date filter (YYYY-MM-DD)
        end_date: Optional end date filter (YYYY-MM-DD)

    Returns:
        Dict with success status and fuel log entries
    """
    try:
        supabase = get_supabase_client()

        query = (
            supabase.table("fuel_log")
            .select("date, gallons, litres, cost, location, odometer, mpg")
            .eq("user_id", user_id)
            .order("date", desc=True)
            .limit(limit)
        )

        if start_date:
            query = query.gte("date", start_date)
        if end_date:
            query = query.lte("date", end_date)

        result = query.execute()

        logger.info(f"📊 Retrieved {len(result.data)} fuel log entries for user {user_id}")

        return {
            "success": True,
            "fuel_logs": result.data,
            "count": len(result.data)
        }
    except Exception as e:
        logger.error(f"❌ Failed to get fuel log for user {user_id}: {str(e)}")
        return {
            "success": False,
            "error": str(e),
            "fuel_logs": [],
            "count": 0
        }
