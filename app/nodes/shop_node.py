from typing import Dict, Any, List
from app.database.supabase_client import get_supabase_client
from app.core.logging import setup_logging

logger = setup_logging("shop_node")

class ShopNode:
    """Handles product browsing and shopping actions."""

    def __init__(self):
        self.supabase = get_supabase_client()

    async def browse_products(self, filters: Dict[str, Any] | None = None) -> Dict[str, Any]:
        """Return products from the shop matching optional filters."""
        filters = filters or {}
        try:
            query = self.supabase.table("v_shop_products").select("*").eq("status", "active")
            if "category" in filters:
                query = query.eq("category", filters["category"])
            if "query" in filters:
                query = query.ilike("name", f"%{filters['query']}%")
            if "limit" in filters:
                query = query.limit(int(filters["limit"]))
            result = query.execute()
            return {"success": True, "data": result.data or []}
        except Exception as e:
            logger.error(f"Error browsing products: {e}")
            return {"success": False, "error": str(e)}

    async def get_product(self, product_id: str) -> Dict[str, Any]:
        """Retrieve a single product by ID."""
        try:
            result = (
                self.supabase
                .table("v_shop_products")
                .select("*")
                .eq("id", product_id)
                .single()
                .execute()
            )
            return {"success": True, "data": result.data} if result.data else {"success": False, "error": "not_found"}
        except Exception as e:
            logger.error(f"Error fetching product {product_id}: {e}")
            return {"success": False, "error": str(e)}

    async def process(self, message: str, context: Dict[str, Any]) -> Dict[str, Any]:
        """Simple processor that suggests products when keywords are detected."""
        message_lower = message.lower()
        if "product" in message_lower or "buy" in message_lower or "shop" in message_lower:
            products = await self.browse_products({"limit": 5})
            return {
                "type": "message",
                "content": "Here are some products you might like",
                "products": products.get("data", [])
            }
        return {"type": "message", "content": "Let me know what you're looking for in the shop."}

shop_node = ShopNode()
