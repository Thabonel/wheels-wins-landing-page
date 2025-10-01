"""Categorize Transaction Tool for PAM

Auto-categorize expenses based on description

Example usage:
- "Categorize my Shell station purchase"
- "What category is this expense?"
"""

import logging
import re
from typing import Any, Dict

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
    description: str,
    amount: float = None,
    **kwargs
) -> Dict[str, Any]:
    """
    Auto-categorize a transaction based on description

    Args:
        description: Transaction description
        amount: Optional amount (for context)

    Returns:
        Dict with suggested category
    """
    try:
        description_lower = description.lower()

        # Check each category pattern
        for category, pattern in CATEGORY_PATTERNS.items():
            if re.search(pattern, description_lower, re.IGNORECASE):
                return {
                    "success": True,
                    "category": category,
                    "confidence": "high",
                    "description": description
                }

        # Default to "other" if no match
        return {
            "success": True,
            "category": "other",
            "confidence": "low",
            "description": description
        }

    except Exception as e:
        logger.error(f"Error categorizing transaction: {e}", exc_info=True)
        return {"success": False, "error": str(e)}
