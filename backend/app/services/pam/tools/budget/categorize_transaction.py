"""Categorize Transaction Tool for PAM

Auto-categorize expenses based on description

Example usage:
- "Categorize my Shell station purchase"
- "What category is this expense?"
"""

import logging
import re
from typing import Any, Dict, Optional

from app.services.pam.tools.exceptions import (
    ValidationError,
)
from app.services.pam.tools.utils import (
    validate_uuid,
)

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

    Raises:
        ValidationError: Invalid input parameters
    """
    try:
        validate_uuid(user_id, "user_id")

        if not description or not description.strip():
            raise ValidationError(
                "description is required and cannot be empty",
                context={"field": "description"}
            )

        description_lower = description.lower()

        for category, pattern in CATEGORY_PATTERNS.items():
            if re.search(pattern, description_lower, re.IGNORECASE):
                return {
                    "success": True,
                    "category": category,
                    "confidence": "high",
                    "description": description,
                    "amount": amount,
                    "merchant": merchant
                }

        return {
            "success": True,
            "category": "other",
            "confidence": "low",
            "description": description,
            "amount": amount,
            "merchant": merchant
        }

    except ValidationError:
        raise
    except Exception as e:
        logger.error(
            "Unexpected error categorizing transaction",
            extra={"user_id": user_id, "description": description},
            exc_info=True
        )
        raise ValidationError(
            "Failed to categorize transaction",
            context={"user_id": user_id, "error": str(e)}
        )
