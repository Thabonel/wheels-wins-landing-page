"""Compare vs Budget Tool for PAM

Compares actual spending vs budgeted amounts

Example usage:
- "How am I doing vs my budget?"
- "Am I on track with my budget?"
"""

import logging
from datetime import datetime
from typing import Any, Dict
from app.integrations.supabase import get_supabase_client

logger = logging.getLogger(__name__)


async def compare_vs_budget(
    user_id: str,
    **kwargs
) -> Dict[str, Any]:
    """
    Compare actual spending vs budgeted amounts

    Args:
        user_id: UUID of the user

    Returns:
        Dict with comparison data
    """
    try:
        supabase = get_supabase_client()

        # Get current month
        month_start = datetime.now().replace(day=1, hour=0, minute=0, second=0, microsecond=0)

        # Get expenses for current month
        expenses = supabase.table("expenses").select("category, amount").eq("user_id", user_id).gte("date", month_start.isoformat()).execute()

        # Get budgets
        budgets = supabase.table("budgets").select("*").eq("user_id", user_id).execute()

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
            "comparisons": comparisons
        }

    except Exception as e:
        logger.error(f"Error comparing budget: {e}", exc_info=True)
        return {"success": False, "error": str(e)}
