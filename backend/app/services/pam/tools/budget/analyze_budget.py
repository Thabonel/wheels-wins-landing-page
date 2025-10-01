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
from app.integrations.supabase import get_supabase_client

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
    """
    try:
        supabase = get_supabase_client()

        # Get current month start
        month_start = datetime.now().replace(day=1, hour=0, minute=0, second=0, microsecond=0)

        # Get all expenses for current month
        expenses_response = supabase.table("expenses").select("*").eq("user_id", user_id).gte("date", month_start.isoformat()).execute()

        # Get user's budgets
        budgets_response = supabase.table("budgets").select("*").eq("user_id", user_id).execute()

        expenses = expenses_response.data if expenses_response.data else []
        budgets = budgets_response.data if budgets_response.data else []

        # Calculate spending by category
        spending_by_category = {}
        total_spending = 0

        for expense in expenses:
            category = expense.get("category", "other")
            amount = float(expense.get("amount", 0))
            spending_by_category[category] = spending_by_category.get(category, 0) + amount
            total_spending += amount

        # Compare with budgets
        budget_status = []
        for budget in budgets:
            category = budget.get("category", "other")
            budget_amount = float(budget.get("amount", 0))
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

    except Exception as e:
        logger.error(f"Error analyzing budget: {e}", exc_info=True)
        return {
            "success": False,
            "error": str(e)
        }
