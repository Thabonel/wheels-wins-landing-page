"""Compare vs Budget Tool for PAM

Compares actual spending vs budgeted amounts

Example usage:
- "How am I doing vs my budget?"
- "Am I on track with my budget?"

Amendment #4: Input validation with Pydantic models
"""

import logging
from datetime import datetime
from typing import Any, Dict, Optional
from pydantic import ValidationError

from app.integrations.supabase import get_supabase_client
from app.services.pam.schemas.budget import CompareVsBudgetInput

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
    """
    try:
        # Validate inputs using Pydantic schema
        try:
            validated = CompareVsBudgetInput(
                user_id=user_id,
                category=category,
                period=period
            )
        except ValidationError as e:
            # Extract first error message for user-friendly response
            error_msg = e.errors()[0]['msg']
            return {
                "success": False,
                "error": f"Invalid input: {error_msg}"
            }

        supabase = get_supabase_client()

        # Get current month
        month_start = datetime.now().replace(day=1, hour=0, minute=0, second=0, microsecond=0)

        # Get expenses for current month using validated user_id
        expense_query = supabase.table("expenses").select("category, amount").eq("user_id", validated.user_id).gte("date", month_start.isoformat())

        # Filter by category if specified
        if validated.category:
            expense_query = expense_query.eq("category", validated.category.value)  # ✅ Extract enum value

        expenses = expense_query.execute()

        # Get budgets using validated user_id
        budget_query = supabase.table("budgets").select("*").eq("user_id", validated.user_id)

        # Filter by category if specified
        if validated.category:
            budget_query = budget_query.eq("category", validated.category.value)  # ✅ Extract enum value

        budgets = budget_query.execute()

        # Calculate spending by category
        spending = {}
        for exp in expenses.data if expenses.data else []:
            cat = exp.get("category", "other")
            spending[cat] = spending.get(cat, 0) + float(exp.get("amount", 0))

        # Compare (schema uses monthly_limit, not amount)
        comparisons = []
        for budget in budgets.data if budgets.data else []:
            cat = budget.get("category")
            budgeted = float(budget.get("monthly_limit", 0))  # Correct field name
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
            "period": validated.period,
            "category_filter": validated.category,
            "comparisons": comparisons
        }

    except Exception as e:
        logger.error(f"Error comparing budget: {e}", exc_info=True)
        return {"success": False, "error": str(e)}
