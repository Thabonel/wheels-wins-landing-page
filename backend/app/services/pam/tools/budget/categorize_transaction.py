"""Categorize Transaction Tool for PAM

Auto-categorize expenses based on description

Example usage:
- "Categorize my Shell station purchase"
- "What category is this expense?"

Amendment #4: Input validation with Pydantic models
"""

import logging
import re
from typing import Any, Dict, Optional
from pydantic import ValidationError

from app.services.pam.schemas.budget import CategorizeTransactionInput

logger = logging.getLogger(__name__)


# Category keywords
CATEGORY_PATTERNS = {
    "gas": r"\b(gas|fuel|shell|chevron|bp|exxon|mobil|pump|diesel|gasoline)\b",
    "food": r"\b(food|grocery|restaurant|cafe|walmart|safeway|kroger|albertsons|dining|meal)\b",
    "campground": r"\b(campground|rv\s*park|campsite|camping|site\s*fee|rv\s*resort|koa)\b",
    "maintenance": r"\b(repair|maintenance|oil\s*change|tire|brake|filter|service|mechanic)\b",
    "entertainment": r"\b(movie|theater|park\s*entrance|museum|attraction|ticket|tour)\b",
    "propane": r"\b(propane|lp\s*gas)\b",
    "utilities": r"\b(electric|water|sewer|internet|phone|wifi)\b",
    "shopping": r"\b(amazon|walmart|target|store|purchase|bought)\b",
    "insurance": r"\b(insurance|policy|premium)\b",
    "registration": r"\b(registration|dmv|tags|license)\b"
}


async def categorize_transaction(
    user_id: str,
    description: str,
    amount: Optional[float] = None,
    merchant: Optional[str] = None,
    **kwargs
) -> Dict[str, Any]:
    """
    Auto-categorize a transaction based on description

    Args:
        user_id: UUID of the user (not used in categorization logic)
        description: Transaction description
        amount: Optional amount (for context)
        merchant: Optional merchant name

    Returns:
        Dict with suggested category
    """
    try:
        # Validate inputs using Pydantic schema
        try:
            validated = CategorizeTransactionInput(
                user_id=user_id,
                description=description,
                amount=amount,
                merchant=merchant
            )
        except ValidationError as e:
            # Extract first error message for user-friendly response
            error_msg = e.errors()[0]['msg']
            return {
                "success": False,
                "error": f"Invalid input: {error_msg}"
            }

        description_lower = validated.description.lower()

        # Check each category pattern
        for category, pattern in CATEGORY_PATTERNS.items():
            if re.search(pattern, description_lower, re.IGNORECASE):
                return {
                    "success": True,
                    "category": category,
                    "confidence": "high",
                    "description": validated.description,
                    "amount": validated.amount,
                    "merchant": validated.merchant
                }

        # Default to "other" if no match
        return {
            "success": True,
            "category": "other",
            "confidence": "low",
            "description": validated.description,
            "amount": validated.amount,
            "merchant": validated.merchant
        }

    except Exception as e:
        logger.error(f"Error categorizing transaction: {e}", exc_info=True)
        return {"success": False, "error": str(e)}
