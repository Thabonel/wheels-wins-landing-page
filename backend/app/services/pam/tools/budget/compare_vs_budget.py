"""Compare vs Budget Tool for PAM

Compares actual spending vs budgeted amounts

Example usage:
- "How am I doing vs my budget?"
- "Am I on track with my budget?"
"""

import logging
from datetime import datetime
from typing import Any, Dict, Optional

from app.core.database import get_supabase_client
from app.services.pam.tools.exceptions import (
    ValidationError,
    DatabaseError,
)
from app.services.pam.tools.utils import (
    validate_uuid,
    safe_db_select,
)

logger = logging.getLogger(__name__)


async def compare_vs_budget(
    user_id: str,
    category: Optional[str] = None,
    period: str = "monthly",
    **kwargs
) -> Dict[str, Any]:
    """
    Compare actual spending vs budgeted amounts

    Args:
        user_id: UUID of the user
        category: Optional specific category to compare
        period: Budget period (default: monthly)

    Returns:
        Dict with comparison data

    Raises:
        ValidationError: Invalid input parameters
        DatabaseError: Database operation failed
    """
    try:
        validate_uuid(user_id, "user_id")

        supabase = get_supabase_client()

        month_start = datetime.now().replace(day=1, hour=0, minute=0, second=0, microsecond=0)

        expenses = await safe_db_select(
            "expenses",
            filters={"user_id": user_id},
            user_id=user_id
        )

        expenses = [e for e in expenses if datetime.fromisoformat(e.get("date", "1970-01-01")) >= month_start]

        if category:
            expenses = [e for e in expenses if e.get("category") == category.lower()]

        budgets = await safe_db_select(
            "budgets",
            filters={"user_id": user_id},
            user_id=user_id
        )

        if category:
            budgets = [b for b in budgets if b.get("category") == category.lower()]

        spending = {}
        for exp in expenses:
            cat = exp.get("category", "other")
            spending[cat] = spending.get(cat, 0) + float(exp.get("amount", 0))

        comparisons = []
        for budget in budgets:
            cat = budget.get("category")
            budgeted = float(budget.get("monthly_limit", 0))
            spent = spending.get(cat, 0)
            difference = budgeted - spent
            percent = (spent / budgeted * 100) if budgeted > 0 else 0

            comparisons.append({
                "category": cat,
                "budgeted": budgeted,
                "spent": spent,
                "difference": difference,
                "percent_used": percent,
                "status": "over" if difference < 0 else "warning" if percent > 80 else "good"
            })

        return {
            "success": True,
            "period": period,
            "category_filter": category,
            "comparisons": comparisons
        }

    except ValidationError:
        raise
    except DatabaseError:
        raise
    except Exception as e:
        logger.error(
            "Unexpected error comparing budget",
            extra={"user_id": user_id, "category": category},
            exc_info=True
        )
        raise DatabaseError(
            "Failed to compare budget",
            context={"user_id": user_id, "category": category, "error": str(e)}
        )
