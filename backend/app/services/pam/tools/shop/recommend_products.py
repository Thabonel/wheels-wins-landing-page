"""Recommend Products Tool for PAM

Recommend products based on user needs and context

Example usage:
- "What tools do I need for tire maintenance?"
- "Recommend camping gear for boondocking"
- "Suggest recovery gear for off-road travel"
"""

import logging
from typing import Any, Dict, Optional, List

from app.integrations.supabase import get_supabase_client

logger = logging.getLogger(__name__)


# Product recommendations by use case
RECOMMENDATIONS = {
    "tire_maintenance": {
        "categories": ["tools_maintenance", "recovery_gear"],
        "keywords": ["tire", "deflator", "gauge", "pump", "compressor"]
    },
    "boondocking": {
        "categories": ["camping_expedition", "power_electronics", "comfort_living"],
        "keywords": ["solar", "battery", "water", "tank", "portable"]
    },
    "recovery": {
        "categories": ["recovery_gear", "safety_equipment"],
        "keywords": ["traction", "winch", "recovery", "shovel", "board"]
    },
    "maintenance": {
        "categories": ["tools_maintenance", "parts_upgrades"],
        "keywords": ["tool", "wrench", "filter", "oil", "repair"]
    },
    "camping": {
        "categories": ["camping_expedition", "comfort_living"],
        "keywords": ["camping", "outdoor", "portable", "collapsible", "storage"]
    },
    "safety": {
        "categories": ["safety_equipment", "recovery_gear"],
        "keywords": ["safety", "emergency", "first aid", "fire", "alarm"]
    },
    "power": {
        "categories": ["power_electronics"],
        "keywords": ["solar", "battery", "inverter", "charger", "power"]
    }
}


async def recommend_products(
    user_id: str,
    use_case: Optional[str] = None,
    budget: Optional[float] = None,
    limit: Optional[int] = 10,
    **kwargs
) -> Dict[str, Any]:
    """
    Recommend products based on user needs

    Args:
        user_id: UUID of the user
        use_case: Type of recommendation (tire_maintenance, boondocking, recovery, etc)
        budget: Optional budget constraint
        limit: Maximum number of recommendations (default: 10)

    Returns:
        Dict with product recommendations
    """
    try:
        supabase = get_supabase_client()

        # Determine recommendation strategy
        if use_case and use_case in RECOMMENDATIONS:
            rec_config = RECOMMENDATIONS[use_case]
            categories = rec_config["categories"]
            keywords = rec_config["keywords"]
        else:
            # General recommendations - show popular items from each category
            categories = ["tools_maintenance", "camping_expedition", "recovery_gear"]
            keywords = []

        # Build query
        db_query = supabase.table("affiliate_products").select("*")

        # Only show active products
        db_query = db_query.eq("is_active", True)

        # Filter by categories
        if categories:
            db_query = db_query.in_("category", categories)

        # Filter by budget
        if budget:
            db_query = db_query.lte("price", budget)

        # If we have keywords, search for them
        if keywords:
            keyword_filter = " | ".join([f"title.ilike.%{kw}%" for kw in keywords])
            keyword_filter += " | " + " | ".join([f"description.ilike.%{kw}%" for kw in keywords])
            db_query = db_query.or_(keyword_filter)

        # Order by price (best value first) and limit
        db_query = db_query.order("price", desc=False).limit(limit)

        response = db_query.execute()

        products = response.data if response.data else []

        # Format recommendations
        recommendations = []
        for product in products:
            recommendations.append({
                "id": product.get("id"),
                "title": product.get("title"),
                "price": float(product.get("price", 0)),
                "category": product.get("category"),
                "reason": f"Recommended for {use_case.replace('_', ' ')}" if use_case else "Popular item",
                "url": product.get("affiliate_url")
            })

        logger.info(f"Generated {len(recommendations)} recommendations for user {user_id}")

        # Create response message
        if len(recommendations) == 0:
            message = "No products found matching your criteria"
        else:
            message = f"Here are {len(recommendations)} recommended products"
            if use_case:
                message += f" for {use_case.replace('_', ' ')}"
            if budget:
                message += f" under ${budget:.2f}"

            # Add top 3 recommendations to message
            message += "\n\nTop recommendations:"
            for i, rec in enumerate(recommendations[:3], 1):
                message += f"\n{i}. {rec['title']} - ${rec['price']:.2f}"

        return {
            "success": True,
            "use_case": use_case,
            "recommendations_count": len(recommendations),
            "recommendations": recommendations,
            "message": message
        }

    except Exception as e:
        logger.error(f"Error recommending products: {e}", exc_info=True)
        return {
            "success": False,
            "error": str(e)
        }


# Tool metadata for registration
TOOL_METADATA = {
    "name": "recommend_products",
    "description": "Recommend products based on user needs and use cases",
    "parameters": {
        "type": "object",
        "properties": {
            "use_case": {
                "type": "string",
                "description": "Type of recommendation",
                "enum": [
                    "tire_maintenance",
                    "boondocking",
                    "recovery",
                    "maintenance",
                    "camping",
                    "safety",
                    "power"
                ]
            },
            "budget": {
                "type": "number",
                "description": "Maximum budget for recommendations"
            },
            "limit": {
                "type": "integer",
                "description": "Maximum number of recommendations (default: 10)",
                "default": 10
            }
        }
    }
}