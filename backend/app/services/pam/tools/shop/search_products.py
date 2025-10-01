"""Search Products Tool for PAM

Find RV parts, gear, and accessories

Example usage:
- "Find RV water filters"
- "Search for camping chairs under $50"
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
    min_rating: Optional[float] = None,
    limit: Optional[int] = 20,
    **kwargs
) -> Dict[str, Any]:
    """
    Search for products in the shop

    Args:
        user_id: UUID of the user
        query: Search query string
        category: Optional category filter (rv_parts, camping_gear, electronics)
        max_price: Optional maximum price filter
        min_rating: Optional minimum rating filter (1-5)
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

        # Build query
        db_query = supabase.table("products").select("*")

        # Filter by category
        if category:
            db_query = db_query.eq("category", category)

        # Filter by price
        if max_price:
            db_query = db_query.lte("price", max_price)

        # Filter by rating
        if min_rating:
            db_query = db_query.gte("rating", min_rating)

        # Search in name and description
        db_query = db_query.or_(
            f"name.ilike.%{query}%,description.ilike.%{query}%"
        )

        # Order by relevance and rating
        db_query = db_query.order("rating", desc=True).limit(limit)

        response = db_query.execute()

        products = response.data if response.data else []

        logger.info(f"Found {len(products)} products for query '{query}' by user {user_id}")

        return {
            "success": True,
            "query": query,
            "products_found": len(products),
            "products": products,
            "message": f"Found {len(products)} products matching '{query}'"
        }

    except Exception as e:
        logger.error(f"Error searching products: {e}", exc_info=True)
        return {
            "success": False,
            "error": str(e)
        }
