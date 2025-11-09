"""Get Cart Tool for PAM

View shopping cart contents

Example usage:
- "Show me my cart"
- "What's in my shopping cart?"
"""

import logging
from typing import Any, Dict

from app.integrations.supabase import get_supabase_client

logger = logging.getLogger(__name__)


async def get_cart(
    user_id: str,
    **kwargs
) -> Dict[str, Any]:
    """
    Get user's shopping cart

    Args:
        user_id: UUID of the user

    Returns:
        Dict with cart contents
    """
    try:
        supabase = get_supabase_client()

        # Get cart items with product details
        response = supabase.table("cart_items").select(
            "*, products(*)"
        ).eq("user_id", user_id).execute()

        cart_items = response.data if response.data else []

        # Calculate totals
        subtotal = sum(
            item["quantity"] * item["price"]
            for item in cart_items
        )

        total_items = sum(item["quantity"] for item in cart_items)

        # Estimate tax and shipping (mock calculation)
        tax = round(subtotal * 0.08, 2)  # 8% tax
        shipping = 9.99 if subtotal > 0 and subtotal < 50 else 0  # Free shipping over $50

        total = round(subtotal + tax + shipping, 2)

        logger.info(f"Retrieved cart with {len(cart_items)} items for user {user_id}")

        return {
            "success": True,
            "items_count": len(cart_items),
            "total_quantity": total_items,
            "items": cart_items,
            "subtotal": subtotal,
            "tax": tax,
            "shipping": shipping,
            "total": total,
            "message": f"Cart has {total_items} items (${total})"
        }

    except Exception as e:
        logger.error(f"Error getting cart: {e}", exc_info=True)
        return {
            "success": False,
            "error": str(e)
        }
