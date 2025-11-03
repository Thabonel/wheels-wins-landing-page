"""Get Spending Summary Tool for PAM

Provides spending breakdown and summary

Example usage:
- "What did I spend this month?"
- "Show me my spending breakdown"
- "How much did I spend on gas?"

Amendment #4: Input validation with Pydantic models
"""

import logging
from datetime import datetime, timedelta
from typing import Any, Dict, Optional
from pydantic import ValidationError

from app.integrations.supabase import get_supabase_client
from app.services.pam.schemas.budget import GetSpendingSummaryInput, BudgetPeriod

logger = logging.getLogger(__name__)


async def get_spending_summary(
    user_id: str,
    category: Optional[str] = None,
    period: str = "monthly",
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    **kwargs
) -> Dict[str, Any]:
    """
    Get spending summary for user

    Args:
        user_id: UUID of the user
        category: Optional category filter
        period: Budget period (daily, weekly, monthly, quarterly, yearly)
        start_date: Optional start date (ISO format)
        end_date: Optional end date (ISO format)

    Returns:
        Dict with spending summary
    """
    try:
        # Validate inputs using Pydantic schema
        try:
            validated = GetSpendingSummaryInput(
                user_id=user_id,
                category=category,
                period=period,
                start_date=start_date,
                end_date=end_date
            )
        except ValidationError as e:
            # Extract first error message for user-friendly response
            error_msg = e.errors()[0]['msg']
            return {
                "success": False,
                "error": f"Invalid input: {error_msg}"
            }

        supabase = get_supabase_client()

        # Calculate date range based on period if not provided
        if validated.end_date:
            end_dt = datetime.fromisoformat(validated.end_date.replace('Z', '+00:00'))
        else:
            end_dt = datetime.now()

        if validated.start_date:
            start_dt = datetime.fromisoformat(validated.start_date.replace('Z', '+00:00'))
        else:
            # Use period to calculate start date
            period_days = {
                BudgetPeriod.DAILY: 1,
                BudgetPeriod.WEEKLY: 7,
                BudgetPeriod.MONTHLY: 30,
                BudgetPeriod.QUARTERLY: 90,
                BudgetPeriod.YEARLY: 365
            }
            days_back = period_days.get(validated.period, 30)
            start_dt = end_dt - timedelta(days=days_back)

        # Build query using validated inputs
        query = supabase.table("expenses").select("*").eq("user_id", validated.user_id).gte("date", start_dt.isoformat()).lte("date", end_dt.isoformat())

        # Add category filter if specified
        if validated.category:
            query = query.eq("category", validated.category.lower())

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
        days_diff = (end_dt - start_dt).days or 1
        daily_average = total_amount / days_diff

        return {
            "success": True,
            "period": validated.period,
            "start_date": start_dt.isoformat(),
            "end_date": end_dt.isoformat(),
            "days": days_diff,
            "total_amount": total_amount,
            "expense_count": len(expenses),
            "daily_average": daily_average,
            "by_category": by_category,
            "category_filter": validated.category
        }

    except Exception as e:
        logger.error(f"Error getting spending summary: {e}", exc_info=True)
        return {
            "success": False,
            "error": str(e)
        }
