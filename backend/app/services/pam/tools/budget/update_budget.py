"""Update Budget Tool for PAM

Allows PAM to update budget categories for the user

Example usage:
- "Set my gas budget to $400/month"
- "Update food budget to $500"
- "Change campground budget to $300"

Amendment #4: Input validation with Pydantic models
"""

import logging
from datetime import datetime
from typing import Any, Dict
from pydantic import ValidationError

from app.integrations.supabase import get_supabase_client
from app.services.pam.schemas.budget import UpdateBudgetInput

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
        # Validate inputs using Pydantic schema
        try:
            validated = UpdateBudgetInput(
                user_id=user_id,
                category=category,
                amount=amount
            )
        except ValidationError as e:
            # Extract first error message for user-friendly response
            error_msg = e.errors()[0]['msg']
            return {
                "success": False,
                "error": f"Invalid input: {error_msg}"
            }

        supabase = get_supabase_client()

        # Check if budget exists for this category
        existing = supabase.table("budgets").select("*").eq("user_id", validated.user_id).eq("category", validated.category.lower()).execute()

        # Schema uses monthly_limit, not amount
        budget_data = {
            "user_id": validated.user_id,
            "category": validated.category.lower(),
            "monthly_limit": float(validated.amount),  # Already validated as positive
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
            logger.info(f"{action.capitalize()} budget: {budget['id']} for user {validated.user_id}")

            return {
                "success": True,
                "budget": budget,
                "action": action,
                "message": f"Set ${validated.amount:.2f}/month budget for {validated.category}"
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
