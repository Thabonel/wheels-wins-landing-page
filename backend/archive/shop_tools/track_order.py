"""Track Order Tool for PAM

Check order status and shipping information

Example usage:
- "Track my order"
- "What's the status of order ORD-12345?"
"""

import logging
from typing import Any, Dict, Optional

from app.integrations.supabase import get_supabase_client

logger = logging.getLogger(__name__)


async def track_order(
    user_id: str,
    order_id: Optional[str] = None,
    order_number: Optional[str] = None,
    **kwargs
) -> Dict[str, Any]:
    """
    Track order status and shipping

    Args:
        user_id: UUID of the user
        order_id: Optional order UUID
        order_number: Optional order number (e.g., ORD-12345)

    Returns:
        Dict with order tracking details
    """
    try:
        supabase = get_supabase_client()

        # Build query
        if order_id:
            query = supabase.table("orders").select(
                "*, order_items(*, products(name))"
            ).eq("id", order_id).eq("user_id", user_id)
        elif order_number:
            query = supabase.table("orders").select(
                "*, order_items(*, products(name))"
            ).eq("order_number", order_number).eq("user_id", user_id)
        else:
            # Get most recent order
            query = supabase.table("orders").select(
                "*, order_items(*, products(name))"
            ).eq("user_id", user_id).order("created_at", desc=True).limit(1)

        response = query.execute()

        if not response.data:
            return {
                "success": False,
                "error": "Order not found"
            }

        order = response.data[0]

        # Mock shipping tracking (in production, integrate with carrier APIs)
        tracking_info = {
            "carrier": "USPS",
            "tracking_number": f"9400{order['id'][:12]}",
            "estimated_delivery": "3-5 business days",
            "current_location": "In transit"
        }

        logger.info(f"Retrieved order {order['order_number']} for user {user_id}")

        return {
            "success": True,
            "order": order,
            "tracking": tracking_info,
            "message": f"Order {order['order_number']} is {order['status']}"
        }

    except Exception as e:
        logger.error(f"Error tracking order: {e}", exc_info=True)
        return {
            "success": False,
            "error": str(e)
        }
