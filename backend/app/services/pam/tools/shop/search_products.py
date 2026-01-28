"""Search Products Tool for PAM

Find products for RV travelers. Searches internal affiliate products first,
then falls back to RapidAPI price comparison if no internal matches.

Example usage:
- "Find tire deflators"
- "Search for camping gear under $50"
- "Show me tools for RV maintenance"
- "Compare prices for Goal Zero Yeti"

Amendment #6: Added RapidAPI fallback for broader product search
"""

import logging
from typing import Any, Dict, Optional, List

from app.integrations.supabase import get_supabase_client
from app.services.pam.tools.constants import ShopConstants
from app.services.pam.tools.exceptions import (
    ValidationError,
    DatabaseError,
    ResourceNotFoundError,
)
from app.services.pam.tools.utils import (
    validate_uuid,
    validate_positive_number,
)

logger = logging.getLogger(__name__)


async def _search_rapidapi_fallback(
    query: str,
    max_price: Optional[float] = None,
    min_price: Optional[float] = None,
    limit: int = ShopConstants.SEARCH_FALLBACK_BASE_LIMIT
) -> List[Dict[str, Any]]:
    """
    Fallback to RapidAPI when internal products don't match.
    Returns empty list if RapidAPI is not configured or fails.
    """
    try:
        from app.services.external.rapidapi_price_search import search_products as rapidapi_search

        results = await rapidapi_search(
            query=query,
            country="au",
            max_results=limit,
            min_price=min_price,
            max_price=max_price
        )

        if results.get("success") and results.get("products"):
            return [
                {
                    "id": None,
                    "title": p.get("title"),
                    "description": f"From {p.get('store', 'external retailer')}",
                    "price": p.get("price", 0),
                    "category": "external",
                    "url": p.get("url"),
                    "image": p.get("image_url"),
                    "source": "rapidapi",
                    "store": p.get("store"),
                    "rating": p.get("rating")
                }
                for p in results["products"]
            ]
        return []

    except ImportError:
        logger.debug("RapidAPI service not available")
        return []
    except Exception as e:
        logger.warning(f"RapidAPI fallback failed: {e}")
        return []


async def search_products(
    user_id: str,
    query: str,
    category: Optional[str] = None,
    max_price: Optional[float] = None,
    min_price: Optional[float] = None,
    limit: Optional[int] = ShopConstants.DEFAULT_SEARCH_LIMIT,
    **kwargs
) -> Dict[str, Any]:
    """
    Search for products in the affiliate_products table

    Args:
        user_id: UUID of the user
        query: Search query string
        category: Optional category filter (tools_maintenance, camping_expedition, etc)
        max_price: Optional maximum price filter
        min_price: Optional minimum price filter
        limit: Maximum number of results

    Returns:
        Dict with product search results

    Raises:
        ValidationError: Invalid input parameters
        DatabaseError: Database operation failed
    """
    try:
        validate_uuid(user_id, "user_id")

        if not query or len(query.strip()) == 0:
            raise ValidationError(
                "Search query is required",
                context={"query": query}
            )

        if max_price is not None:
            validate_positive_number(max_price, "max_price")

        if min_price is not None:
            validate_positive_number(min_price, "min_price")

        if min_price is not None and max_price is not None and min_price > max_price:
            raise ValidationError(
                "min_price cannot be greater than max_price",
                context={"min_price": min_price, "max_price": max_price}
            )

        if limit is not None and (limit < ShopConstants.MIN_RESULTS_LIMIT or limit > ShopConstants.MAX_RESULTS_LIMIT):
            raise ValidationError(
                f"Limit must be between {ShopConstants.MIN_RESULTS_LIMIT} and {ShopConstants.MAX_RESULTS_LIMIT}",
                context={"limit": limit}
            )

        valid_categories = [
            "tools_maintenance",
            "camping_expedition",
            "recovery_gear",
            "parts_upgrades",
            "safety_equipment",
            "power_electronics",
            "comfort_living",
            "navigation_tech"
        ]
        if category and category not in valid_categories:
            raise ValidationError(
                f"Invalid category. Must be one of: {', '.join(valid_categories)}",
                context={"category": category, "valid_categories": valid_categories}
            )

        supabase = get_supabase_client()

        db_query = supabase.table("affiliate_products").select("*")
        db_query = db_query.eq("is_active", True)

        if category:
            db_query = db_query.eq("category", category)

        if max_price:
            db_query = db_query.lte("price", max_price)
        if min_price:
            db_query = db_query.gte("price", min_price)

        db_query = db_query.or_(
            f"title.ilike.%{query}%,description.ilike.%{query}%"
        )

        db_query = db_query.order("created_at", desc=True).limit(limit)

        response = db_query.execute()

        products = response.data if response.data else []

        formatted_products = []
        for product in products:
            formatted_products.append({
                "id": product.get("id"),
                "title": product.get("title"),
                "description": product.get("description"),
                "price": float(product.get("price", 0)),
                "category": product.get("category"),
                "url": product.get("affiliate_url"),
                "image": product.get("image_url")
            })

        logger.info(f"Found {len(products)} internal products for query '{query}' by user {user_id}")

        external_products = []
        if len(formatted_products) < ShopConstants.SEARCH_MIN_INTERNAL_RESULTS:
            external_products = await _search_rapidapi_fallback(
                query=query,
                max_price=max_price,
                min_price=min_price,
                limit=ShopConstants.SEARCH_FALLBACK_BASE_LIMIT - len(formatted_products)
            )
            if external_products:
                logger.info(f"Added {len(external_products)} external products from RapidAPI")

        all_products = formatted_products + external_products

        if len(all_products) == 0:
            message = f"No products found for '{query}'"
        elif len(all_products) == 1:
            message = f"Found 1 product: {all_products[0]['title']} (${all_products[0]['price']:.2f})"
        else:
            internal_count = len(formatted_products)
            external_count = len(external_products)
            if external_count > 0:
                message = f"Found {len(all_products)} products matching '{query}' ({internal_count} curated, {external_count} from price comparison)"
            else:
                message = f"Found {len(all_products)} products matching '{query}'"

        return {
            "success": True,
            "query": query,
            "products_found": len(all_products),
            "products": all_products,
            "internal_count": len(formatted_products),
            "external_count": len(external_products),
            "message": message
        }

    except ValidationError:
        raise
    except DatabaseError:
        raise
    except Exception as e:
        logger.error(
            f"Unexpected error searching products",
            extra={"user_id": user_id, "query": query, "category": category},
            exc_info=True
        )
        raise DatabaseError(
            "Failed to search products",
            context={
                "user_id": user_id,
                "query": query,
                "category": category,
                "error": str(e)
            }
        )


# Tool metadata for registration
TOOL_METADATA = {
    "name": "search_products",
    "description": "Search for Amazon affiliate products for RV travelers",
    "parameters": {
        "type": "object",
        "properties": {
            "query": {
                "type": "string",
                "description": "Search query for products"
            },
            "category": {
                "type": "string",
                "description": "Product category (tools_maintenance, camping_expedition, recovery_gear, etc)",
                "enum": [
                    "tools_maintenance",
                    "camping_expedition",
                    "recovery_gear",
                    "parts_upgrades",
                    "safety_equipment",
                    "power_electronics",
                    "comfort_living",
                    "navigation_tech"
                ]
            },
            "max_price": {
                "type": "number",
                "description": "Maximum price filter"
            },
            "min_price": {
                "type": "number",
                "description": "Minimum price filter"
            },
            "limit": {
                "type": "integer",
                "description": "Maximum number of results (default: 20)",
                "default": 20
            }
        },
        "required": ["query"]
    }
}