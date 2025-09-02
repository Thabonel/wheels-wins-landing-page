from typing import Any, Dict, Optional
from app.database.supabase_client import get_supabase_client

class OrdersService:
    def __init__(self):
        self.client = get_supabase_client()

    async def create_order(self, data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        result = self.client.table("shop_orders").insert(data).execute()
        return result.data[0] if result.data else None

    async def get_order(self, order_id: str) -> Optional[Dict[str, Any]]:
        result = (
            self.client.table("shop_orders")
            .select("*")
            .eq("id", order_id)
            .single()
            .execute()
        )
        return result.data if result.data else None

    async def update_order(self, order_id: str, data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        result = (
            self.client.table("shop_orders")
            .update(data)
            .eq("id", order_id)
            .execute()
        )
        return result.data[0] if result.data else None

    async def delete_order(self, order_id: str) -> bool:
        result = self.client.table("shop_orders").delete().eq("id", order_id).execute()
        return bool(result.data)

    async def list_orders(self) -> list[Dict[str, Any]]:
        result = self.client.table("shop_orders").select("*").execute()
        return result.data or []

orders_service = OrdersService()
