"""Analyze Budget Tool for PAM

Provides budget analysis and insights for the user

Example usage:
- "How's my budget looking?"
- "Analyze my spending this month"
- "Am I over budget anywhere?"
"""

import logging
from datetime import datetime
from typing import Any, Dict

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


async def analyze_budget(
    user_id: str,
    **kwargs
) -> Dict[str, Any]:
    """
    Analyze user's budget and spending

    Args:
        user_id: UUID of the user

    Returns:
        Dict with budget analysis

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

        budgets = await safe_db_select(
            "budgets",
            filters={"user_id": user_id},
            user_id=user_id
        )

        spending_by_category = {}
        total_spending = 0

        for expense in expenses:
            category = expense.get("category", "other")
            amount = float(expense.get("amount", 0))
            spending_by_category[category] = spending_by_category.get(category, 0) + amount
            total_spending += amount

        budget_status = []
        for budget in budgets:
            category = budget.get("category", "other")
            budget_amount = float(budget.get("monthly_limit", 0))
            spent = spending_by_category.get(category, 0)
            remaining = budget_amount - spent
            percent_used = (spent / budget_amount * 100) if budget_amount > 0 else 0

            budget_status.append({
                "category": category,
                "budget": budget_amount,
                "spent": spent,
                "remaining": remaining,
                "percent_used": percent_used,
                "status": "over" if remaining < 0 else "warning" if percent_used > 80 else "good"
            })

        return {
            "success": True,
            "total_spending": total_spending,
            "spending_by_category": spending_by_category,
            "budget_status": budget_status,
            "expense_count": len(expenses)
        }

    except ValidationError:
        raise
    except DatabaseError:
        raise
    except Exception as e:
        logger.error(
            "Unexpected error analyzing budget",
            extra={"user_id": user_id},
            exc_info=True
        )
        raise DatabaseError(
            "Failed to analyze budget",
            context={"user_id": user_id, "error": str(e)}
        )
