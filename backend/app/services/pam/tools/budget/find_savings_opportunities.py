"""Find Savings Opportunities Tool for PAM

AI-powered suggestions for saving money

Example usage:
- "Where can I save money?"
- "Find ways to cut my spending"

Amendment #4: Input validation with Pydantic models
"""

import logging
from datetime import datetime, timedelta
from typing import Any, Dict
from pydantic import ValidationError

from app.integrations.supabase import get_supabase_client
from app.services.pam.schemas.budget import FindSavingsOpportunitiesInput

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
    """
    try:
        # Validate inputs using Pydantic schema
        try:
            validated = FindSavingsOpportunitiesInput(
                user_id=user_id
            )
        except ValidationError as e:
            # Extract first error message for user-friendly response
            error_msg = e.errors()[0]['msg']
            return {
                "success": False,
                "error": f"Invalid input: {error_msg}"
            }

        supabase = get_supabase_client()

        # Get last 60 days of expenses using validated user_id
        start_date = datetime.now() - timedelta(days=60)
        expenses = supabase.table("expenses").select("*").eq("user_id", validated.user_id).gte("date", start_date.isoformat()).execute()

        # Analyze spending patterns
        spending_by_category = {}
        for exp in expenses.data if expenses.data else []:
            cat = exp.get("category", "other")
            spending_by_category[cat] = spending_by_category.get(cat, 0) + float(exp.get("amount", 0))

        # Generate suggestions based on high spending categories
        suggestions = []

        # Gas savings
        if spending_by_category.get("gas", 0) > 200:
            suggestions.append({
                "category": "gas",
                "potential_savings": 20,
                "suggestion": "Use GasBuddy app to find cheaper stations. Could save $20-40/month."
            })

        # Campground savings
        if spending_by_category.get("campground", 0) > 300:
            suggestions.append({
                "category": "campground",
                "potential_savings": 50,
                "suggestion": "Try free boondocking sites or Harvest Hosts. Could save $50-100/month."
            })

        # Food savings
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

    except Exception as e:
        logger.error(f"Error finding savings: {e}", exc_info=True)
        return {"success": False, "error": str(e)}
