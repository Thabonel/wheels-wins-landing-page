"""Compare Prices Tool for PAM

Compare prices across retailers to find the best deal.
Auto-tracks savings when PAM helps find cheaper options.

Example usage:
- "Compare prices for Goal Zero Yeti 500X"
- "Find best price on camping solar panel"
- "Price check Dometic fridge"

Date: January 2026
"""

import logging
from typing import Any, Dict, Optional

from app.services.pam.tools.budget.auto_track_savings import auto_record_savings
from app.services.pam.tools.constants import ShopConstants
from app.services.pam.tools.exceptions import (
    ValidationError,
    DatabaseError,
    ResourceNotFoundError,
)
from app.services.pam.tools.utils import (
    validate_uuid,
)

logger = logging.getLogger(__name__)


async def compare_prices(
    user_id: str,
    product_name: str,
    country: str = "au",
    **kwargs
) -> Dict[str, Any]:
    """
    Compare prices for a product across multiple retailers.

    Args:
        user_id: UUID of the user
        product_name: Product name to search and compare
        country: Country code (au, us, uk, etc.)

    Returns:
        Dict with price comparison results and potential savings

    Raises:
        ValidationError: Invalid input parameters
        DatabaseError: External service failure
    """
    try:
        validate_uuid(user_id, "user_id")

        if not product_name or len(product_name.strip()) == 0:
            raise ValidationError(
                "Product name is required",
                context={"product_name": product_name}
            )

        valid_countries = ["au", "us", "uk", "ca", "nz"]
        if country not in valid_countries:
            raise ValidationError(
                f"Invalid country code. Must be one of: {', '.join(valid_countries)}",
                context={"country": country, "valid_countries": valid_countries}
            )

        try:
            from app.services.external.rapidapi_price_search import compare_prices as rapidapi_compare
        except ImportError:
            raise DatabaseError(
                "Price comparison service not available",
                context={"service": "rapidapi"}
            )

        results = await rapidapi_compare(product_name, country=country)

        if not results.get("success"):
            raise ResourceNotFoundError(
                results.get("error", "No products found for comparison"),
                context={"product_name": product_name, "country": country}
            )

        comparison = results.get("comparison", {})

        savings_tracked = False
        potential_savings = comparison.get("potential_savings", 0)

        if potential_savings >= ShopConstants.MIN_SAVINGS_TO_TRACK:
            cheapest = comparison.get("cheapest", {})
            savings_tracked = await auto_record_savings(
                user_id=user_id,
                amount=potential_savings,
                category="shopping",
                savings_type="price_comparison",
                description=f"Found {product_name} cheaper at {cheapest.get('store', 'retailer')} - saving ${potential_savings:.2f}",
                confidence_score=ShopConstants.PRICE_COMPARISON_CONFIDENCE,
                baseline_cost=comparison.get("most_expensive", {}).get("price", 0),
                optimized_cost=cheapest.get("price", 0)
            )

        savings_msg = " Savings tracked!" if savings_tracked else ""

        return {
            "success": True,
            "product_name": product_name,
            "country": country,
            "comparison": comparison,
            "savings_tracked": savings_tracked,
            "message": f"{results.get('message', '')}{savings_msg}"
        }

    except ValidationError:
        raise
    except ResourceNotFoundError:
        raise
    except DatabaseError:
        raise
    except Exception as e:
        logger.error(
            f"Unexpected error comparing prices",
            extra={"user_id": user_id, "product_name": product_name},
            exc_info=True
        )
        raise DatabaseError(
            "Failed to compare prices",
            context={"user_id": user_id, "product_name": product_name, "error": str(e)}
        )


# Tool metadata for registration
TOOL_METADATA = {
    "name": "compare_prices",
    "description": "Compare prices for a product across multiple retailers to find the best deal",
    "parameters": {
        "type": "object",
        "properties": {
            "product_name": {
                "type": "string",
                "description": "The product name to compare prices for"
            },
            "country": {
                "type": "string",
                "description": "Country code for local pricing (au, us, uk, ca, nz)",
                "default": "au",
                "enum": ["au", "us", "uk", "ca", "nz"]
            }
        },
        "required": ["product_name"]
    }
}
