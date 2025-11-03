"""Predict End of Month Spending Tool for PAM

Forecasts end-of-month spending based on current trends

Example usage:
- "Will I stay within budget this month?"
- "Predict my end of month spending"

Amendment #4: Input validation with Pydantic models
"""

import logging
from datetime import datetime
from typing import Any, Dict, Optional
from pydantic import ValidationError

from app.integrations.supabase import get_supabase_client
from app.services.pam.schemas.budget import PredictEndOfMonthInput

logger = logging.getLogger(__name__)


async def predict_end_of_month(
    user_id: str,
    category: Optional[str] = None,
    include_trends: bool = True,
    **kwargs
) -> Dict[str, Any]:
    """
    Predict end-of-month spending

    Args:
        user_id: UUID of the user
        category: Optional specific category to predict
        include_trends: Include spending trends in prediction

    Returns:
        Dict with predictions
    """
    try:
        # Validate inputs using Pydantic schema
        try:
            validated = PredictEndOfMonthInput(
                user_id=user_id,
                category=category,
                include_trends=include_trends
            )
        except ValidationError as e:
            # Extract first error message for user-friendly response
            error_msg = e.errors()[0]['msg']
            return {
                "success": False,
                "error": f"Invalid input: {error_msg}"
            }

        supabase = get_supabase_client()

        # Get current month info
        now = datetime.now()
        month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        days_elapsed = now.day

        # Calculate days in month (simple approximation)
        if now.month == 12:
            next_month = now.replace(year=now.year + 1, month=1, day=1)
        else:
            next_month = now.replace(month=now.month + 1, day=1)
        days_in_month = (next_month - month_start).days

        # Get expenses for current month using validated user_id
        expense_query = supabase.table("expenses").select("category, amount").eq("user_id", validated.user_id).gte("date", month_start.isoformat())

        # Filter by category if specified
        if validated.category:
            expense_query = expense_query.eq("category", validated.category.lower())

        expenses = expense_query.execute()

        # Calculate spending by category
        spending = {}
        for exp in expenses.data if expenses.data else []:
            cat = exp.get("category", "other")
            spending[cat] = spending.get(cat, 0) + float(exp.get("amount", 0))

        # Project to end of month
        predictions = {}
        for cat, spent in spending.items():
            daily_rate = spent / days_elapsed if days_elapsed > 0 else 0
            projected = daily_rate * days_in_month
            predictions[cat] = {
                "spent_so_far": spent,
                "daily_rate": daily_rate,
                "projected_total": projected
            }

        total_projected = sum(p["projected_total"] for p in predictions.values())

        return {
            "success": True,
            "days_elapsed": days_elapsed,
            "days_in_month": days_in_month,
            "category_filter": validated.category,
            "include_trends": validated.include_trends,
            "predictions": predictions,
            "total_projected": total_projected
        }

    except Exception as e:
        logger.error(f"Error predicting spending: {e}", exc_info=True)
        return {"success": False, "error": str(e)}
