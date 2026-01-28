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

from app.core.database import get_supabase_client
from app.services.pam.tools.exceptions import (
    ValidationError,
    DatabaseError,
)
from app.services.pam.tools.utils import (
    validate_uuid,
    validate_date_format,
    safe_db_select,
)

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

    Raises:
        ValidationError: Invalid input parameters
        DatabaseError: Database operation failed
    """
    try:
        validate_uuid(user_id, "user_id")

        if start_date:
            validate_date_format(start_date, "start_date")
        if end_date:
            validate_date_format(end_date, "end_date")

        valid_periods = ["daily", "weekly", "monthly", "quarterly", "yearly"]
        if period not in valid_periods:
            raise ValidationError(
                f"Invalid period. Must be one of: {', '.join(valid_periods)}",
                context={"period": period, "valid_periods": valid_periods}
            )

        if end_date:
            end_dt = datetime.fromisoformat(end_date.replace('Z', '+00:00'))
        else:
            end_dt = datetime.now()

        if start_date:
            start_dt = datetime.fromisoformat(start_date.replace('Z', '+00:00'))
        else:
            period_days = {
                "daily": 1,
                "weekly": 7,
                "monthly": 30,
                "quarterly": 90,
                "yearly": 365
            }
            days_back = period_days.get(period, 30)
            start_dt = end_dt - timedelta(days=days_back)

        expenses = await safe_db_select(
            "expenses",
            filters={"user_id": user_id},
            user_id=user_id
        )

        expenses = [
            e for e in expenses
            if start_dt <= datetime.fromisoformat(e.get("date", "1970-01-01")) <= end_dt
        ]

        if category:
            expenses = [e for e in expenses if e.get("category") == category.lower()]

        total_amount = sum(float(e.get("amount", 0)) for e in expenses)

        by_category = {}
        for expense in expenses:
            cat = expense.get("category", "other")
            amount = float(expense.get("amount", 0))
            by_category[cat] = by_category.get(cat, 0) + amount

        days_diff = (end_dt - start_dt).days or 1
        daily_average = total_amount / days_diff

        return {
            "success": True,
            "period": period,
            "start_date": start_dt.isoformat(),
            "end_date": end_dt.isoformat(),
            "days": days_diff,
            "total_amount": total_amount,
            "expense_count": len(expenses),
            "daily_average": daily_average,
            "by_category": by_category,
            "category_filter": category
        }

    except ValidationError:
        raise
    except DatabaseError:
        raise
    except Exception as e:
        logger.error(
            "Unexpected error getting spending summary",
            extra={"user_id": user_id, "period": period},
            exc_info=True
        )
        raise DatabaseError(
            "Failed to get spending summary",
            context={"user_id": user_id, "error": str(e)}
        )
