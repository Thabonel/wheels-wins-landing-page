from typing import Any, Dict, Optional
from app.database.supabase_client import get_supabase_client

class CustomRoutesService:
    def __init__(self):
        self.client = get_supabase_client()

    async def create_route(self, data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        result = self.client.table("custom_routes").insert(data).execute()
        return result.data[0] if result.data else None

    async def get_route(self, route_id: str) -> Optional[Dict[str, Any]]:
        result = (
            self.client.table("custom_routes")
            .select("*")
            .eq("id", route_id)
            .single()
            .execute()
        )
        return result.data if result.data else None

    async def update_route(self, route_id: str, data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        result = (
            self.client.table("custom_routes")
            .update(data)
            .eq("id", route_id)
            .execute()
        )
        return result.data[0] if result.data else None

    async def delete_route(self, route_id: str) -> bool:
        result = self.client.table("custom_routes").delete().eq("id", route_id).execute()
        return bool(result.data)

    async def list_routes(self, user_id: str) -> list[Dict[str, Any]]:
        result = (
            self.client.table("custom_routes")
            .select("*")
            .eq("user_id", user_id)
            .execute()
        )
        return result.data or []

custom_routes_service = CustomRoutesService()
