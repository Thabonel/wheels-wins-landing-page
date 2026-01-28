"""Predict End of Month Spending Tool for PAM

Forecasts end-of-month spending based on current trends

Example usage:
- "Will I stay within budget this month?"
- "Predict my end of month spending"
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

DECEMBER_MONTH_NUMBER = 12


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

    Raises:
        ValidationError: Invalid input parameters
        DatabaseError: Database operation failed
    """
    try:
        validate_uuid(user_id, "user_id")

        now = datetime.now()
        month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        days_elapsed = now.day

        if now.month == DECEMBER_MONTH_NUMBER:
            next_month = now.replace(year=now.year + 1, month=1, day=1)
        else:
            next_month = now.replace(month=now.month + 1, day=1)
        days_in_month = (next_month - month_start).days

        expenses = await safe_db_select(
            "expenses",
            filters={"user_id": user_id},
            user_id=user_id
        )

        expenses = [e for e in expenses if datetime.fromisoformat(e.get("date", "1970-01-01")) >= month_start]

        if category:
            expenses = [e for e in expenses if e.get("category") == category.lower()]

        spending = {}
        for exp in expenses:
            cat = exp.get("category", "other")
            spending[cat] = spending.get(cat, 0) + float(exp.get("amount", 0))

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
            "category_filter": category,
            "include_trends": include_trends,
            "predictions": predictions,
            "total_projected": total_projected
        }

    except ValidationError:
        raise
    except DatabaseError:
        raise
    except Exception as e:
        logger.error(
            "Unexpected error predicting end of month spending",
            extra={"user_id": user_id, "category": category},
            exc_info=True
        )
        raise DatabaseError(
            "Failed to predict end of month spending",
            context={"user_id": user_id, "error": str(e)}
        )
