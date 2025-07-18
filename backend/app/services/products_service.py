from typing import Any, Dict, Optional
from app.database.supabase_client import get_supabase_client

class ProductsService:
    def __init__(self):
        self.client = get_supabase_client()

    async def create_product(self, data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        result = self.client.table("shop_products").insert(data).execute()
        return result.data[0] if result.data else None

    async def get_product(self, product_id: str) -> Optional[Dict[str, Any]]:
        result = (
            self.client.table("shop_products")
            .select("*")
            .eq("id", product_id)
            .single()
            .execute()
        )
        return result.data if result.data else None

    async def update_product(self, product_id: str, data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        result = (
            self.client.table("shop_products")
            .update(data)
            .eq("id", product_id)
            .execute()
        )
        return result.data[0] if result.data else None

    async def delete_product(self, product_id: str) -> bool:
        result = self.client.table("shop_products").delete().eq("id", product_id).execute()
        return bool(result.data)

    async def list_products(self) -> list[Dict[str, Any]]:
        result = self.client.table("shop_products").select("*").execute()
        return result.data or []

products_service = ProductsService()
