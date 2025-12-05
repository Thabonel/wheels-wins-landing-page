"""Search Products Tool for PAM

Find Amazon affiliate products for RV travelers

Example usage:
- "Find tire deflators"
- "Search for camping gear under $50"
- "Show me tools for RV maintenance"
"""

import logging
from typing import Any, Dict, Optional, List

from app.integrations.supabase import get_supabase_client

logger = logging.getLogger(__name__)


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

        logger.info(f"Found {len(products)} products for query '{query}' by user {user_id}")

        # Create response message
        if len(products) == 0:
            message = f"No products found for '{query}'"
        elif len(products) == 1:
            message = f"Found 1 product: {products[0]['title']} (${products[0]['price']})"
        else:
            message = f"Found {len(products)} products matching '{query}'"

        return {
            "success": True,
            "query": query,
            "products_found": len(products),
            "products": formatted_products,
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