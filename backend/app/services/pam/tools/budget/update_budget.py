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

from app.core.database import get_supabase_client
from app.services.pam.tools.exceptions import (
    ValidationError,
    DatabaseError,
)
from app.services.pam.tools.utils import (
    validate_uuid,
    validate_positive_number,
    safe_db_insert,
    safe_db_select,
)

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

    Raises:
        ValidationError: Invalid input parameters
        DatabaseError: Database operation failed
    """
    try:
        validate_uuid(user_id, "user_id")
        validate_positive_number(amount, "amount")

        if not category or not category.strip():
            raise ValidationError(
                "category is required and cannot be empty",
                context={"field": "category"}
            )

        supabase = get_supabase_client()

        existing = await safe_db_select(
            "budgets",
            filters={"user_id": user_id},
            user_id=user_id
        )

        existing_budget = next(
            (b for b in existing if b.get("category") == category.lower()),
            None
        )

        budget_data = {
            "user_id": user_id,
            "category": category.lower(),
            "monthly_limit": float(amount),
            "updated_at": datetime.now().isoformat()
        }

        if existing_budget:
            budget_id = existing_budget["id"]
            result = supabase.table("budgets").update(budget_data).eq("id", budget_id).execute()
            action = "updated"

            if not result.data or len(result.data) == 0:
                raise DatabaseError(
                    "Failed to update budget: no data returned",
                    context={"user_id": user_id, "budget_id": budget_id}
                )
            budget = result.data[0]
        else:
            budget_data["created_at"] = datetime.now().isoformat()
            budget = await safe_db_insert("budgets", budget_data, user_id)
            action = "created"

        logger.info(f"{action.capitalize()} budget: {budget['id']} for user {user_id}")

        return {
            "success": True,
            "budget": budget,
            "action": action,
            "message": f"Set ${amount:.2f}/month budget for {category}"
        }

    except ValidationError:
        raise
    except DatabaseError:
        raise
    except Exception as e:
        logger.error(
            "Unexpected error updating budget",
            extra={"user_id": user_id, "category": category, "amount": amount},
            exc_info=True
        )
        raise DatabaseError(
            "Failed to update budget",
            context={"user_id": user_id, "error": str(e)}
        )
