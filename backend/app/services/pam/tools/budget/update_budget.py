"""Update Budget Tool for PAM

Allows PAM to update budget categories for the user

Example usage:
- "Set my gas budget to $400/month"
- "Update food budget to $500"
- "Change campground budget to $300"
"""

import logging
from datetime import datetime
from typing import Any, Dict
from app.integrations.supabase import get_supabase_client

logger = logging.getLogger(__name__)


async def update_budget(
    user_id: str,
    category: str,
    amount: float,
    **kwargs
) -> Dict[str, Any]:
    """
    Update or create a budget category

    Args:
        user_id: UUID of the user
        category: Budget category name
        amount: Budget amount (must be positive)

    Returns:
        Dict with updated budget details
    """
    try:
        # Validate amount
        if amount <= 0:
            return {
                "success": False,
                "error": "Budget amount must be positive"
            }

        supabase = get_supabase_client()

        # Check if budget exists for this category
        existing = supabase.table("budgets").select("*").eq("user_id", user_id).eq("category", category.lower()).execute()

        # Schema uses monthly_limit, not amount
        budget_data = {
            "user_id": user_id,
            "category": category.lower(),
            "monthly_limit": float(amount),  # Correct field name
            "updated_at": datetime.now().isoformat()
        }

        if existing.data:
            # Update existing budget
            budget_id = existing.data[0]["id"]
            response = supabase.table("budgets").update(budget_data).eq("id", budget_id).execute()
            action = "updated"
        else:
            # Create new budget
            budget_data["created_at"] = datetime.now().isoformat()
            response = supabase.table("budgets").insert(budget_data).execute()
            action = "created"

        if response.data:
            budget = response.data[0]
            logger.info(f"{action.capitalize()} budget: {budget['id']} for user {user_id}")

            return {
                "success": True,
                "budget": budget,
                "action": action,
                "message": f"Set ${amount:.2f}/month budget for {category}"
            }
        else:
            return {
                "success": False,
                "error": f"Failed to {action} budget"
            }

    except Exception as e:
        logger.error(f"Error updating budget: {e}", exc_info=True)
        return {
            "success": False,
            "error": str(e)
        }
