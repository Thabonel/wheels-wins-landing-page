"""Create Expense Tool for PAM

Allows PAM to add expenses to user's budget tracker through natural language.

Example usage:
- "PAM, add a $50 gas expense"
- "Log $120 for groceries today"
- "I spent $30 on propane"
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
    validate_positive_number,
    validate_date_format,
    safe_db_insert,
)

logger = logging.getLogger(__name__)


async def create_expense(
    user_id: str,
    amount: float,
    category: str,
    description: Optional[str] = None,
    date: Optional[str] = None,
    **kwargs
) -> Dict[str, Any]:
    """
    Create an expense entry for the user

    Args:
        user_id: UUID of the user
        amount: Expense amount (must be positive)
        category: Expense category (gas, food, campground, maintenance, etc.)
        description: Optional description of the expense
        date: Optional date in ISO format (defaults to today)

    Returns:
        Dict with created expense details

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

        if date:
            validate_date_format(date, "date")
            try:
                expense_date = datetime.fromisoformat(date.replace('Z', '+00:00'))
            except ValueError:
                expense_date = datetime.now()
        else:
            expense_date = datetime.now()

        expense_data = {
            "user_id": user_id,
            "amount": float(amount),
            "category": category.lower(),
            "description": description or f"{category} expense",
            "date": expense_date.isoformat(),
            "created_at": datetime.now().isoformat()
        }

        expense = await safe_db_insert("expenses", expense_data, user_id)

        logger.info(f"Created expense: {expense['id']} for user {user_id}")

        return {
            "success": True,
            "expense": expense,
            "message": f"Added ${amount:.2f} {category} expense"
        }

    except ValidationError:
        raise
    except DatabaseError:
        raise
    except Exception as e:
        logger.error(
            "Unexpected error creating expense",
            extra={"user_id": user_id, "amount": amount, "category": category},
            exc_info=True
        )
        raise DatabaseError(
            "Failed to create expense",
            context={"user_id": user_id, "error": str(e)}
        )
