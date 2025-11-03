"""Create Expense Tool for PAM

Allows PAM to add expenses to user's budget tracker through natural language.

Example usage:
- "PAM, add a $50 gas expense"
- "Log $120 for groceries today"
- "I spent $30 on propane"

Amendment #4: Input validation with Pydantic models
"""

import logging
from datetime import datetime
from typing import Any, Dict, Optional
from decimal import Decimal
from pydantic import ValidationError

from app.integrations.supabase import get_supabase_client
from app.services.pam.schemas.budget import CreateExpenseInput

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
    """
    try:
        # Validate inputs using Pydantic schema
        try:
            validated = CreateExpenseInput(
                user_id=user_id,
                amount=amount,
                category=category,
                description=description,
                date=date
            )
        except ValidationError as e:
            # Extract first error message for user-friendly response
            error_msg = e.errors()[0]['msg']
            return {
                "success": False,
                "error": f"Invalid input: {error_msg}"
            }

        # Get Supabase client
        supabase = get_supabase_client()

        # Parse date or use today
        if validated.date:
            try:
                expense_date = datetime.fromisoformat(validated.date.replace('Z', '+00:00'))
            except ValueError:
                expense_date = datetime.now()
        else:
            expense_date = datetime.now()

        # Build expense data using validated inputs
        expense_data = {
            "user_id": validated.user_id,
            "amount": float(validated.amount),  # Already validated as positive
            "category": validated.category.lower(),
            "description": validated.description or f"{validated.category} expense",
            "date": expense_date.isoformat(),
            "created_at": datetime.now().isoformat()
        }

        # Insert into database
        response = supabase.table("expenses").insert(expense_data).execute()

        if response.data:
            expense = response.data[0]
            logger.info(f"Created expense: {expense['id']} for user {validated.user_id}")

            return {
                "success": True,
                "expense": expense,
                "message": f"Added ${validated.amount:.2f} {validated.category} expense"
            }
        else:
            logger.error(f"Failed to create expense: {response}")
            return {
                "success": False,
                "error": "Failed to create expense"
            }

    except Exception as e:
        logger.error(f"Error creating expense: {e}", exc_info=True)
        return {
            "success": False,
            "error": str(e)
        }
