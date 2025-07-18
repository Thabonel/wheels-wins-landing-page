from typing import Any, Dict, Optional
from app.database.supabase_client import get_supabase_client

class ProfilesService:
    def __init__(self):
        self.client = get_supabase_client()

    async def create_profile(self, data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        result = self.client.table("profiles").insert(data).execute()
        return result.data[0] if result.data else None

    async def get_profile(self, profile_id: str) -> Optional[Dict[str, Any]]:
        result = (
            self.client.table("profiles")
            .select("*")
            .eq("id", profile_id)
            .single()
            .execute()
        )
        return result.data if result.data else None

    async def update_profile(self, profile_id: str, data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        result = (
            self.client.table("profiles")
            .update(data)
            .eq("id", profile_id)
            .execute()
        )
        return result.data[0] if result.data else None

    async def delete_profile(self, profile_id: str) -> bool:
        result = self.client.table("profiles").delete().eq("id", profile_id).execute()
        return bool(result.data)

profiles_service = ProfilesService()
