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
        # Add timestamp for profile updates
        data["updated_at"] = "now()"
        
        result = (
            self.client.table("profiles")
            .update(data)
            .eq("id", profile_id)
            .execute()
        )
        return result.data[0] if result.data else None

    async def create_or_update_from_onboarding(self, user_id: str, onboarding_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Create or update profile from onboarding data - unified approach"""
        profile_data = {
            "id": user_id,
            "email": onboarding_data.get("email"),
            "full_name": onboarding_data.get("full_name"),
            "nickname": onboarding_data.get("nickname"),
            "region": onboarding_data.get("region"),
            "vehicle_type": onboarding_data.get("vehicle_type"),
            "make_model_year": onboarding_data.get("make_model_year"),
            "fuel_type": onboarding_data.get("fuel_type"),
            "travel_style": onboarding_data.get("travel_style"),
            "daily_drive_limit": onboarding_data.get("daily_drive_limit"),
            "towing_info": onboarding_data.get("towing_info"),
            "second_vehicle": onboarding_data.get("second_vehicle"),
            "preferred_camp_types": onboarding_data.get("preferred_camp_types", "").split(',') if onboarding_data.get("preferred_camp_types") else [],
            "pet_info": onboarding_data.get("pet_info"),
            "accessibility_needs": onboarding_data.get("accessibility_needs", "").split(',') if onboarding_data.get("accessibility_needs") else [],
            "age_range": onboarding_data.get("age_range"),
            "onboarding_completed": True,
            "onboarding_completed_at": "now()",
            "updated_at": "now()"
        }
        
        # Try to update first, then create if doesn't exist
        result = (
            self.client.table("profiles")
            .upsert(profile_data, on_conflict="id")
            .execute()
        )
        return result.data[0] if result.data else None

    async def delete_profile(self, profile_id: str) -> bool:
        result = self.client.table("profiles").delete().eq("id", profile_id).execute()
        return bool(result.data)

profiles_service = ProfilesService()
