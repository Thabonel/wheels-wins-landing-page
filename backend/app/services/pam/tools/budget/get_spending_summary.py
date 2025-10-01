"""Get Spending Summary Tool for PAM

Provides spending breakdown and summary

Example usage:
- "What did I spend this month?"
- "Show me my spending breakdown"
- "How much did I spend on gas?"
"""

import logging
from datetime import datetime, timedelta
from typing import Any, Dict, Optional
from app.integrations.supabase import get_supabase_client

logger = logging.getLogger(__name__)


async def get_spending_summary(
    user_id: str,
    days: int = 30,
    category: Optional[str] = None,
    **kwargs
) -> Dict[str, Any]:
    """
    Get spending summary for user

    Args:
        user_id: UUID of the user
        days: Number of days to look back (default: 30)
        category: Optional category filter

    Returns:
        Dict with spending summary
    """
    try:
        supabase = get_supabase_client()

        # Calculate date range
        end_date = datetime.now()
        start_date = end_date - timedelta(days=days)

        # Build query
        query = supabase.table("expenses").select("*").eq("user_id", user_id).gte("date", start_date.isoformat()).lte("date", end_date.isoformat())

        # Add category filter if specified
        if category:
            query = query.eq("category", category.lower())

        response = query.execute()
        expenses = response.data if response.data else []

        # Calculate totals
        total_amount = sum(float(e.get("amount", 0)) for e in expenses)

        # Group by category
        by_category = {}
        for expense in expenses:
            cat = expense.get("category", "other")
            amount = float(expense.get("amount", 0))
            by_category[cat] = by_category.get(cat, 0) + amount

        # Calculate daily average
        daily_average = total_amount / days if days > 0 else 0

        return {
            "success": True,
            "period_days": days,
            "total_amount": total_amount,
            "expense_count": len(expenses),
            "daily_average": daily_average,
            "by_category": by_category,
            "category_filter": category
        }

    except Exception as e:
        logger.error(f"Error getting spending summary: {e}", exc_info=True)
        return {
            "success": False,
            "error": str(e)
        }
