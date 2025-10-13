"""Checkout Tool for PAM

Complete purchase from shopping cart

Example usage:
- "Checkout with my saved payment method"
- "Complete my order"
"""

import logging
from typing import Any, Dict, Optional
from datetime import datetime
import uuid

from app.integrations.supabase import get_supabase_client

logger = logging.getLogger(__name__)


async def checkout(
    user_id: str,
    payment_method_id: Optional[str] = None,
    shipping_address_id: Optional[str] = None,
    **kwargs
) -> Dict[str, Any]:
    """
    Complete checkout and create order

    Args:
        user_id: UUID of the user
        payment_method_id: Optional payment method ID
        shipping_address_id: Optional shipping address ID

    Returns:
        Dict with order details
    """
    try:
        supabase = get_supabase_client()

        # Get cart items
        cart_response = supabase.table("cart_items").select(
            "*, products(*)"
        ).eq("user_id", user_id).execute()

        if not cart_response.data:
            return {
                "success": False,
                "error": "Cart is empty"
            }

        cart_items = cart_response.data

        # Calculate totals
        subtotal = sum(
            item["quantity"] * item["price"]
            for item in cart_items
        )

        tax = round(subtotal * 0.08, 2)
        shipping = 9.99 if subtotal < 50 else 0
        total = round(subtotal + tax + shipping, 2)

        # Create order
        order_data = {
            "user_id": user_id,
            "order_number": f"ORD-{uuid.uuid4().hex[:8].upper()}",
            "subtotal": subtotal,
            "tax": tax,
            "shipping": shipping,
            "total": total,
            "payment_method_id": payment_method_id,
            "shipping_address_id": shipping_address_id,
            "status": "processing",
            "created_at": datetime.now().isoformat()
        }

        order_response = supabase.table("orders").insert(order_data).execute()

        if not order_response.data:
            return {
                "success": False,
                "error": "Failed to create order"
            }

        order = order_response.data[0]

        # Create order items
        order_items = []
        for item in cart_items:
            order_item = {
                "order_id": order["id"],
                "product_id": item["product_id"],
                "quantity": item["quantity"],
                "price": item["price"],
                "created_at": datetime.now().isoformat()
            }
            order_items.append(order_item)

        supabase.table("order_items").insert(order_items).execute()

        # Clear cart
        supabase.table("cart_items").delete().eq("user_id", user_id).execute()

        logger.info(f"Created order {order['order_number']} for user {user_id}")

        return {
            "success": True,
            "order": order,
            "message": f"Order {order['order_number']} placed successfully (${total})"
        }

    except Exception as e:
        logger.error(f"Error during checkout: {e}", exc_info=True)
        return {
            "success": False,
            "error": str(e)
        }
