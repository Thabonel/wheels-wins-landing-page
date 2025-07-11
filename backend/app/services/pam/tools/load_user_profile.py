"""
Load User Profile Tool - Retrieves comprehensive user information
"""
from typing import Dict, Any
from .base_tool import BaseTool
from app.core.database import get_supabase_client

class LoadUserProfileTool(BaseTool):
    """Tool to load comprehensive user profile information"""
    
    def __init__(self):
        super().__init__("load_user_profile")
        self.supabase = get_supabase_client()
    
    async def execute(self, user_id: str, parameters: Dict[str, Any] = None) -> Dict[str, Any]:
        """Load user profile from database"""
        try:
            self.logger.info(f"Loading profile for user {user_id}")
            
            # Get user profile from Supabase
            profile_response = (
                self.supabase.table("profiles")
                .select("*")
                .eq("user_id", user_id)
                .single()
                .execute()
            )
            
            if not profile_response.data:
                # Return basic profile structure if none exists
                return self._create_success_response({
                    "user_id": user_id,
                    "profile_exists": False,
                    "travel_preferences": {},
                    "vehicle_info": {},
                    "budget_preferences": {},
                    "personal_details": {},
                    "accessibility_needs": {},
                    "communication_preferences": {}
                })
            
            profile = profile_response.data
            
            # Enhance profile with structured data
            enhanced_profile = {
                "user_id": user_id,
                "profile_exists": True,
                "personal_details": {
                    "full_name": profile.get("full_name", ""),
                    "nickname": profile.get("nickname", ""),
                    "email": profile.get("email", ""),
                    "region": profile.get("region", "Australia"),
                    "experience_level": profile.get("experience_level", "intermediate")
                },
                "travel_preferences": self._extract_travel_preferences(profile),
                "vehicle_info": self._extract_vehicle_info(profile),
                "budget_preferences": self._extract_budget_preferences(profile),
                "accessibility_needs": self._extract_accessibility_needs(profile),
                "communication_preferences": self._extract_communication_preferences(profile),
                "family_details": self._extract_family_details(profile)
            }
            
            self.logger.info(f"Successfully loaded profile for user {user_id}")
            return self._create_success_response(enhanced_profile)
            
        except Exception as e:
            self.logger.error(f"Error loading user profile: {e}")
            return self._create_error_response(f"Could not load user profile: {str(e)}")
    
    def _extract_travel_preferences(self, profile: Dict[str, Any]) -> Dict[str, Any]:
        """Extract and structure travel preferences"""
        travel_prefs = profile.get("travel_preferences", {})
        return {
            "style": travel_prefs.get("style", "balanced"),  # budget, balanced, luxury
            "camp_types": travel_prefs.get("camp_types", ["caravan_parks", "free_camps"]),
            "drive_limit_per_day": travel_prefs.get("drive_limit", "500km"),
            "preferred_season": travel_prefs.get("preferred_season", "any"),
            "group_size": travel_prefs.get("group_size", 2),
            "pet_friendly_required": travel_prefs.get("pet_friendly", False),
            "internet_required": travel_prefs.get("internet_required", False)
        }
    
    def _extract_vehicle_info(self, profile: Dict[str, Any]) -> Dict[str, Any]:
        """Extract and structure vehicle information"""
        vehicle_info = profile.get("vehicle_info", {})
        return {
            "type": vehicle_info.get("type", "caravan"),  # caravan, motorhome, camper_trailer
            "make_model_year": vehicle_info.get("make_model_year", ""),
            "fuel_type": vehicle_info.get("fuel_type", "diesel"),
            "fuel_efficiency": vehicle_info.get("fuel_efficiency", 8.5),  # L/100km
            "length_meters": vehicle_info.get("length", 7.5),
            "height_meters": vehicle_info.get("height", 3.2),
            "weight_kg": vehicle_info.get("weight", 2500),
            "water_capacity": vehicle_info.get("water_capacity", 120),
            "grey_water_capacity": vehicle_info.get("grey_water_capacity", 95),
            "solar_panels": vehicle_info.get("solar_panels", False),
            "generator": vehicle_info.get("generator", False)
        }
    
    def _extract_budget_preferences(self, profile: Dict[str, Any]) -> Dict[str, Any]:
        """Extract and structure budget preferences"""
        budget_prefs = profile.get("budget_preferences", {})
        return {
            "daily_budget": budget_prefs.get("daily_budget", 100),
            "fuel_budget_monthly": budget_prefs.get("fuel_budget", 200),
            "accommodation_budget": budget_prefs.get("accommodation_budget", 50),
            "food_budget": budget_prefs.get("food_budget", 30),
            "activities_budget": budget_prefs.get("activities_budget", 20),
            "currency": budget_prefs.get("currency", "AUD"),
            "budget_alerts": budget_prefs.get("budget_alerts", True)
        }
    
    def _extract_accessibility_needs(self, profile: Dict[str, Any]) -> Dict[str, Any]:
        """Extract accessibility and health requirements"""
        accessibility = profile.get("accessibility_needs", {})
        return {
            "mobility_aids": accessibility.get("mobility_aids", False),
            "wheelchair_access": accessibility.get("wheelchair_access", False),
            "medical_equipment": accessibility.get("medical_equipment", False),
            "dietary_restrictions": accessibility.get("dietary_restrictions", []),
            "medication_storage": accessibility.get("medication_storage", False),
            "emergency_contacts": accessibility.get("emergency_contacts", [])
        }
    
    def _extract_communication_preferences(self, profile: Dict[str, Any]) -> Dict[str, Any]:
        """Extract communication and interaction preferences"""
        comm_prefs = profile.get("communication_preferences", {})
        return {
            "preferred_greeting": comm_prefs.get("preferred_greeting", "friendly"),
            "detail_level": comm_prefs.get("detail_level", "detailed"),  # brief, detailed, comprehensive
            "notification_frequency": comm_prefs.get("notification_frequency", "normal"),
            "emergency_contact_method": comm_prefs.get("emergency_contact", "app"),
            "language": comm_prefs.get("language", "en-AU"),
            "timezone": comm_prefs.get("timezone", "Australia/Sydney")
        }
    
    def _extract_family_details(self, profile: Dict[str, Any]) -> Dict[str, Any]:
        """Extract family and companion information"""
        family = profile.get("family_details", {})
        return {
            "traveling_companions": family.get("companions", []),
            "children_ages": family.get("children_ages", []),
            "pets": family.get("pets", []),
            "special_occasions": family.get("special_occasions", {}),
            "group_memberships": family.get("group_memberships", [])
        }