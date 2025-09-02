from typing import Any, Dict, Optional
from app.database.supabase_client import get_supabase_client

class MaintenanceService:
    def __init__(self):
        self.client = get_supabase_client()

    async def create_record(self, data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        result = self.client.table("maintenance_records").insert(data).execute()
        return result.data[0] if result.data else None

    async def get_record(self, record_id: str) -> Optional[Dict[str, Any]]:
        result = (
            self.client.table("maintenance_records")
            .select("*")
            .eq("id", record_id)
            .single()
            .execute()
        )
        return result.data if result.data else None

    async def update_record(self, record_id: str, data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        result = (
            self.client.table("maintenance_records")
            .update(data)
            .eq("id", record_id)
            .execute()
        )
        return result.data[0] if result.data else None

    async def delete_record(self, record_id: str) -> bool:
        result = self.client.table("maintenance_records").delete().eq("id", record_id).execute()
        return bool(result.data)

    async def list_records(self, user_id: str) -> list[Dict[str, Any]]:
        result = (
            self.client.table("maintenance_records")
            .select("*")
            .eq("user_id", user_id)
            .execute()
        )
        return result.data or []

maintenance_service = MaintenanceService()
