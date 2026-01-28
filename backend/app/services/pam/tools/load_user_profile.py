"""Load User Profile Tool - Retrieves comprehensive user information."""
from typing import Dict, Any
from pydantic import BaseModel, Field, ValidationError as PydanticValidationError
from .base_tool import BaseTool
from app.core.database import get_supabase_client, get_user_context_supabase_client
from app.core.config import get_settings
from app.services.pam.tools.exceptions import (
    ValidationError,
    DatabaseError,
)
from app.services.pam.tools.utils import validate_uuid


class _ExecuteParams(BaseModel):
    """Validation model for execute parameters."""

    user_id: str = Field(min_length=1)
    parameters: Dict[str, Any] | None = None

class LoadUserProfileTool(BaseTool):
    """Tool to load comprehensive user profile information."""

    def __init__(self, user_jwt: str = None):
        super().__init__("load_user_profile", user_jwt=user_jwt)
        if user_jwt:
            self.supabase = get_user_context_supabase_client(user_jwt)
        else:
            self.supabase = get_supabase_client()
    
    async def execute(self, user_id: str, parameters: Dict[str, Any] = None) -> Dict[str, Any]:
        """Load user profile from database

        Raises:
            ValidationError: Invalid user_id
            DatabaseError: Database operation failed
        """
        try:
            # Validate inputs
            try:
                validate_uuid(user_id, "user_id")
                _ExecuteParams(user_id=user_id, parameters=parameters)
            except PydanticValidationError as ve:
                self.logger.error(f"Input validation failed: {ve.errors()}")
                raise ValidationError(
                    "Invalid parameters",
                    context={"validation_errors": ve.errors()}
                )

            self.logger.info(f"🔍 PROFILE DEBUG: Loading profile for user {user_id}")

            profile_response = (
                self.supabase.table("profiles")
                .select("*")
                .eq("id", user_id)
                .single()
                .execute()
            )
            try:
                settings = get_settings()
            except Exception:
                settings = None

            _data = profile_response.data or {}
            image_len = 0
            if isinstance(_data, dict) and isinstance(_data.get('profile_image_url'), str):
                try:
                    image_len = len(_data.get('profile_image_url') or "")
                except Exception:
                    image_len = 0

            profile_summary = {
                'id': _data.get('id') or _data.get('user_id'),
                'role': _data.get('role'),
                'region': _data.get('region'),
                'has_image': bool(_data.get('profile_image_url')),
                'image_length': image_len,
                'fields': len(_data) if isinstance(_data, dict) else 0,
            }

            if settings and getattr(settings, 'ENVIRONMENT', 'production') != 'development':
                self.logger.debug(f"🔍 PROFILE DEBUG: Profile summary: {profile_summary}")
            else:
                self.logger.info(f"🔍 PROFILE DEBUG: Profile summary: {profile_summary}")

            if profile_response.data:
                vehicle_fields = {
                    'vehicle_type': profile_response.data.get('vehicle_type'),
                    'make_model_year': profile_response.data.get('make_model_year'),
                    'vehicle_make_model_year': profile_response.data.get('vehicle_make_model_year'),
                    'fuel_type': profile_response.data.get('fuel_type'),
                    'towing_info': profile_response.data.get('towing_info')
                }
                self.logger.info(f"🚐 VEHICLE DEBUG: Vehicle fields found: {vehicle_fields}")

                if profile_response.data.get('vehicle_make_model_year'):
                    self.logger.info(f"🚐 VEHICLE DEBUG: Using vehicle_make_model_year: {profile_response.data.get('vehicle_make_model_year')}")
                elif profile_response.data.get('make_model_year'):
                    self.logger.info(f"🚐 VEHICLE DEBUG: Using make_model_year: {profile_response.data.get('make_model_year')}")

            if not profile_response.data:
                return self._create_success_response({
                    "user_id": user_id,
                    "profile_exists": False,
                    "language": "en",
                    "travel_preferences": {},
                    "vehicle_info": {},
                    "budget_preferences": {},
                    "personal_details": {},
                    "accessibility_needs": {},
                    "communication_preferences": {}
                })

            profile = profile_response.data

            enhanced_profile = {
                "user_id": user_id,
                "profile_exists": True,
                "language": profile.get("language", "en"),
                "personal_details": {
                    "full_name": profile.get("full_name", ""),
                    "nickname": profile.get("nickname", ""),
                    "email": profile.get("email", ""),
                    "region": profile.get("region", "Australia"),
                    "age_range": profile.get("age_range", ""),
                    "onboarding_completed": profile.get("onboarding_completed", False)
                },
                "travel_preferences": self._extract_travel_preferences(profile),
                "vehicle_info": self._extract_vehicle_info(profile),
                "budget_preferences": self._extract_budget_preferences(profile),
                "accessibility_needs": self._extract_accessibility_needs(profile),
                "communication_preferences": self._extract_communication_preferences(profile),
                "family_details": self._extract_family_details(profile)
            }

            vehicle_info = enhanced_profile.get('vehicle_info', {})
            self.logger.info(f"🚐 VEHICLE DEBUG: Extracted vehicle_info: {vehicle_info}")
            self.logger.info(f"🚐 VEHICLE DEBUG: Is RV detected: {vehicle_info.get('is_rv', False)}")
            self.logger.info(f"🚐 VEHICLE DEBUG: Vehicle type: {vehicle_info.get('type')}")

            self.logger.info(f"Successfully loaded profile for user {user_id}")
            return self._create_success_response(enhanced_profile)

        except ValidationError:
            raise
        except DatabaseError:
            raise
        except Exception as e:
            self.logger.error(
                f"Unexpected error loading user profile",
                extra={"user_id": user_id},
                exc_info=True
            )
            raise DatabaseError(
                "Could not load user profile",
                context={"user_id": user_id, "error": str(e)}
            )
    
    def _extract_travel_preferences(self, profile: Dict[str, Any]) -> Dict[str, Any]:
        """Extract and structure travel preferences from unified profile."""
        return {
            "style": profile.get("travel_style", "balanced"),
            "camp_types": profile.get("preferred_camp_types", ["caravan_parks", "free_camps"]),
            "drive_limit_per_day": profile.get("daily_drive_limit", "500km"),
            "region": profile.get("region", "Australia"),
            "pet_info": profile.get("pet_info", ""),
            "accessibility_needs": profile.get("accessibility_needs", []),
            "age_range": profile.get("age_range", ""),
            "pet_friendly_required": bool(profile.get("pet_info", "")),
            "has_accessibility_needs": bool(profile.get("accessibility_needs", [])),
        }

    def _extract_vehicle_info(self, profile: Dict[str, Any]) -> Dict[str, Any]:
        """Extract and structure vehicle information from unified profile."""
        vehicle_type = profile.get("vehicle_type", "caravan")
        make_model = profile.get("vehicle_make_model_year", "") or profile.get("make_model_year", "")

        enhanced_type = vehicle_type
        if 'unimog' in make_model.lower():
            enhanced_type = "Unimog RV"
        elif vehicle_type.lower() == "4 x 4" and make_model:
            enhanced_type = f"4WD RV ({make_model})"

        return {
            "type": enhanced_type,
            "original_type": vehicle_type,
            "make_model_year": make_model,
            "fuel_type": profile.get("fuel_type", "diesel"),
            "towing_info": profile.get("towing_info", ""),
            "second_vehicle": profile.get("second_vehicle", ""),
            "fuel_efficiency": profile.get("fuel_efficiency_l_100km", 8.5),
            "length_feet": profile.get("vehicle_length_feet", 25.0),
            "height_feet": profile.get("vehicle_height_feet", 10.0),
            "weight_kg": profile.get("vehicle_weight_kg", 2500),
            "water_capacity": profile.get("water_capacity_liters", 120),
            "grey_water_capacity": profile.get("grey_water_capacity_liters", 95),
            "solar_panels": profile.get("solar_panels", False),
            "generator": profile.get("generator", False),
            "is_rv": (
                profile.get("vehicle_type", "").lower() in [
                    'motorhome', 'caravan', 'travel_trailer', 'fifth_wheel',
                    'truck_camper', 'van', 'unimog', 'camper_trailer', 'rv', '4 x 4'
                ] or
                'unimog' in profile.get("make_model_year", "").lower() or
                any(rv_keyword in profile.get("make_model_year", "").lower()
                    for rv_keyword in ['motorhome', 'caravan', 'camper'])
            )
        }
    
    def _extract_budget_preferences(self, profile: Dict[str, Any]) -> Dict[str, Any]:
        """Extract and structure budget preferences"""
        budget_prefs = profile.get("budget_preferences") or {}
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
        accessibility = profile.get("accessibility_needs") or {}
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
        comm_prefs = profile.get("communication_preferences") or {}
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
        family = profile.get("family_details") or {}
        return {
            "traveling_companions": family.get("companions", []),
            "children_ages": family.get("children_ages", []),
            "pets": family.get("pets", []),
            "special_occasions": family.get("special_occasions", {}),
            "group_memberships": family.get("group_memberships", [])
        }
