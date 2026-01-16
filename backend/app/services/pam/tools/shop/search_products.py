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

logger = logging.getLogger(__name__)


async def _search_rapidapi_fallback(
    query: str,
    max_price: Optional[float] = None,
    min_price: Optional[float] = None,
    limit: int = 10
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
            # Format to match internal product structure
            return [
                {
                    "id": None,  # External product
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
    limit: Optional[int] = 20,
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
        limit: Maximum number of results (default: 20)

    Returns:
        Dict with product search results
    """
    try:
        if not query or len(query.strip()) == 0:
            return {
                "success": False,
                "error": "Search query is required"
            }

        supabase = get_supabase_client()

        # Build query - affiliate_products table
        db_query = supabase.table("affiliate_products").select("*")

        # Only show active products
        db_query = db_query.eq("is_active", True)

        # Filter by category
        if category:
            db_query = db_query.eq("category", category)

        # Filter by price range
        if max_price:
            db_query = db_query.lte("price", max_price)
        if min_price:
            db_query = db_query.gte("price", min_price)

        # Search in title and description
        db_query = db_query.or_(
            f"title.ilike.%{query}%,description.ilike.%{query}%"
        )

        # Order by created date (newest first) and limit
        db_query = db_query.order("created_at", desc=True).limit(limit)

        response = db_query.execute()

        products = response.data if response.data else []

        # Format products for better display
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

        # If few internal results, supplement with RapidAPI
        external_products = []
        if len(formatted_products) < 5:
            external_products = await _search_rapidapi_fallback(
                query=query,
                max_price=max_price,
                min_price=min_price,
                limit=10 - len(formatted_products)  # Fill up to 10 total
            )
            if external_products:
                logger.info(f"Added {len(external_products)} external products from RapidAPI")

        # Combine results (internal first, then external)
        all_products = formatted_products + external_products

        # Create response message
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

    except Exception as e:
        logger.error(f"Error searching products: {e}", exc_info=True)
        return {
            "success": False,
            "error": str(e)
        }


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