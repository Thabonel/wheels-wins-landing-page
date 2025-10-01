"""Add to Cart Tool for PAM

Add items to shopping cart

Example usage:
- "Add this water filter to my cart"
- "Put 2 camping chairs in my cart"
"""

import logging
from typing import Any, Dict, Optional
from datetime import datetime

from app.integrations.supabase import get_supabase_client

logger = logging.getLogger(__name__)


async def add_to_cart(
    user_id: str,
    product_id: str,
    quantity: Optional[int] = 1,
    **kwargs
) -> Dict[str, Any]:
    """
    Add product to shopping cart

    Args:
        user_id: UUID of the user
        product_id: UUID of the product
        quantity: Quantity to add (default: 1)

    Returns:
        Dict with cart update details
    """
    try:
        if not product_id:
            return {
                "success": False,
                "error": "Product ID is required"
            }

        if quantity < 1:
            return {
                "success": False,
                "error": "Quantity must be at least 1"
            }

        supabase = get_supabase_client()

        # Check if product exists
        product_response = supabase.table("products").select("*").eq("id", product_id).execute()

        if not product_response.data:
            return {
                "success": False,
                "error": "Product not found"
            }

        product = product_response.data[0]

        # Check if item already in cart
        existing_response = supabase.table("cart_items").select("*").match({
            "user_id": user_id,
            "product_id": product_id
        }).execute()

        if existing_response.data:
            # Update quantity
            existing_item = existing_response.data[0]
            new_quantity = existing_item["quantity"] + quantity

            update_response = supabase.table("cart_items").update({
                "quantity": new_quantity,
                "updated_at": datetime.now().isoformat()
            }).eq("id", existing_item["id"]).execute()

            logger.info(f"Updated cart item quantity to {new_quantity} for user {user_id}")
        else:
            # Add new item
            cart_data = {
                "user_id": user_id,
                "product_id": product_id,
                "quantity": quantity,
                "price": product["price"],
                "created_at": datetime.now().isoformat()
            }

            supabase.table("cart_items").insert(cart_data).execute()

            logger.info(f"Added product {product_id} to cart for user {user_id}")

        return {
            "success": True,
            "product": product,
            "quantity": quantity,
            "message": f"Added {quantity}x {product['name']} to cart"
        }

    except Exception as e:
        logger.error(f"Error adding to cart: {e}", exc_info=True)
        return {
            "success": False,
            "error": str(e)
        }
