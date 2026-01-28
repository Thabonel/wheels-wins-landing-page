"""Find Savings Opportunities Tool for PAM

AI-powered suggestions for saving money

Example usage:
- "Where can I save money?"
- "Find ways to cut my spending"
"""

import logging
from datetime import datetime, timedelta
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


async def find_savings_opportunities(
    user_id: str,
    **kwargs
) -> Dict[str, Any]:
    """
    Find opportunities to save money

    Args:
        user_id: UUID of the user

    Returns:
        Dict with savings suggestions

    Raises:
        ValidationError: Invalid input parameters
        DatabaseError: Database operation failed
    """
    try:
        validate_uuid(user_id, "user_id")

        start_date = datetime.now() - timedelta(days=60)

        expenses = await safe_db_select(
            "expenses",
            filters={"user_id": user_id},
            user_id=user_id
        )

        expenses = [e for e in expenses if datetime.fromisoformat(e.get("date", "1970-01-01")) >= start_date]

        spending_by_category = {}
        for exp in expenses:
            cat = exp.get("category", "other")
            spending_by_category[cat] = spending_by_category.get(cat, 0) + float(exp.get("amount", 0))

        suggestions = []

        if spending_by_category.get("gas", 0) > 200:
            suggestions.append({
                "category": "gas",
                "potential_savings": 20,
                "suggestion": "Use GasBuddy app to find cheaper stations. Could save $20-40/month."
            })

        if spending_by_category.get("campground", 0) > 300:
            suggestions.append({
                "category": "campground",
                "potential_savings": 50,
                "suggestion": "Try free boondocking sites or Harvest Hosts. Could save $50-100/month."
            })

        if spending_by_category.get("food", 0) > 400:
            suggestions.append({
                "category": "food",
                "potential_savings": 80,
                "suggestion": "Cook more meals vs eating out. Could save $80-120/month."
            })

        total_potential = sum(s["potential_savings"] for s in suggestions)

        return {
            "success": True,
            "suggestions": suggestions,
            "total_potential_savings": total_potential
        }

    except ValidationError:
        raise
    except DatabaseError:
        raise
    except Exception as e:
        logger.error(
            "Unexpected error finding savings opportunities",
            extra={"user_id": user_id},
            exc_info=True
        )
        raise DatabaseError(
            "Failed to find savings opportunities",
            context={"user_id": user_id, "error": str(e)}
        )
