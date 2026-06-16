"""
Pam V2 profile adapter: read and update user profile, settings, and vehicles.
"""

from __future__ import annotations

from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field

from app.core.database import get_supabase_client
from app.services.pam.tools.profile.create_vehicle import create_vehicle
from app.services.pam.tools.profile.update_profile import update_profile as v1_update_profile
from app.services.pam.tools.profile.update_settings import update_settings as v1_update_settings

from ..catalog import catalog
from ..handlers import register_handler
from ..namespaces import PROFILE
from ..types import (
    ApprovalPolicy,
    ToolContext,
    ToolEffect,
    ToolResult,
    ToolRisk,
    ToolScope,
    ToolSpec,
)


class LoadProfileInput(BaseModel):
    include_vehicle: bool = Field(default=True)


class LoadProfileOutput(BaseModel):
    user_id: str
    profile_exists: bool
    language: str
    personal_details: Dict[str, Any]
    travel_preferences: Dict[str, Any]
    vehicle_info: Dict[str, Any]
    budget_preferences: Dict[str, Any]
    accessibility_needs: Dict[str, Any]
    communication_preferences: Dict[str, Any]


async def _load_profile(user_id: str, include_vehicle: bool) -> Dict[str, Any]:
    supabase = get_supabase_client()
    response = (
        supabase.table("profiles")
        .select("*")
        .eq("id", user_id)
        .single()
        .execute()
    )

    if not response.data:
        return {
            "user_id": user_id,
            "profile_exists": False,
            "language": "en",
            "personal_details": {},
            "travel_preferences": {},
            "vehicle_info": {},
            "budget_preferences": {},
            "accessibility_needs": {},
            "communication_preferences": {},
        }

    profile = response.data
    return {
        "user_id": user_id,
        "profile_exists": True,
        "language": profile.get("language", "en"),
        "personal_details": {
            "full_name": profile.get("full_name", ""),
            "nickname": profile.get("nickname", ""),
            "email": profile.get("email", ""),
            "region": profile.get("region", "Australia"),
            "age_range": profile.get("age_range", ""),
            "onboarding_completed": profile.get("onboarding_completed", False),
        },
        "travel_preferences": _extract_travel_preferences(profile),
        "vehicle_info": _extract_vehicle_info(profile) if include_vehicle else {},
        "budget_preferences": _extract_budget_preferences(profile),
        "accessibility_needs": _extract_accessibility_needs(profile),
        "communication_preferences": _extract_communication_preferences(profile),
    }


def _extract_travel_preferences(profile: Dict[str, Any]) -> Dict[str, Any]:
    return {
        "style": profile.get("travel_style", "balanced"),
        "camp_types": profile.get("preferred_camp_types", ["caravan_parks", "free_camps"]),
        "drive_limit_per_day": profile.get("daily_drive_limit", "500km"),
        "region": profile.get("region", "Australia"),
        "pet_info": profile.get("pet_info", ""),
        "accessibility_needs": profile.get("accessibility_needs", []),
        "age_range": profile.get("age_range", ""),
    }


def _extract_vehicle_info(profile: Dict[str, Any]) -> Dict[str, Any]:
    return {
        "type": profile.get("vehicle_type", "caravan"),
        "make_model_year": profile.get("vehicle_make_model_year", "") or profile.get("make_model_year", ""),
        "fuel_type": profile.get("fuel_type", "diesel"),
        "fuel_efficiency": profile.get("fuel_efficiency_l_100km", 8.5),
        "length_feet": profile.get("vehicle_length_feet", 25.0),
        "water_capacity": profile.get("water_capacity_liters", 120),
        "solar_panels": profile.get("solar_panels", False),
        "generator": profile.get("generator", False),
    }


def _extract_budget_preferences(profile: Dict[str, Any]) -> Dict[str, Any]:
    budget = profile.get("budget_preferences") or {}
    return {
        "daily_budget": budget.get("daily_budget", 100),
        "currency": budget.get("currency", "AUD"),
        "budget_alerts": budget.get("budget_alerts", True),
    }


def _extract_accessibility_needs(profile: Dict[str, Any]) -> Dict[str, Any]:
    accessibility = profile.get("accessibility_needs") or {}
    return {
        "mobility_aids": accessibility.get("mobility_aids", False),
        "wheelchair_access": accessibility.get("wheelchair_access", False),
        "dietary_restrictions": accessibility.get("dietary_restrictions", []),
    }


def _extract_communication_preferences(profile: Dict[str, Any]) -> Dict[str, Any]:
    comms = profile.get("communication_preferences") or {}
    return {
        "preferred_greeting": comms.get("preferred_greeting", "friendly"),
        "detail_level": comms.get("detail_level", "detailed"),
        "language": comms.get("language", "en-AU"),
        "timezone": comms.get("timezone", "Australia/Sydney"),
    }


load_profile_tool = ToolSpec(
    name="load_profile",
    description="Read the current user's profile, travel preferences, and vehicle information.",
    namespace=PROFILE.name,
    input_schema=LoadProfileInput,
    output_schema=LoadProfileOutput,
    effect=ToolEffect.READ,
    risk=ToolRisk.LOW,
    scope=ToolScope.OWN,
    approval_policy=ApprovalPolicy.NONE,
    idempotent=True,
)


@register_handler(load_profile_tool.name)
async def handle_load_profile(context: ToolContext, input: LoadProfileInput) -> ToolResult:
    try:
        data = await _load_profile(context.user_id, input.include_vehicle)
        return ToolResult(
            success=True,
            data=data,
            summary=f"Loaded profile for {data['user_id']}",
        )
    except Exception as exc:
        return ToolResult(
            success=False,
            error_code="profile_load_failed",
            error_message=f"Could not load profile: {type(exc).__name__}",
        )


catalog.register(load_profile_tool)


# ---- update_profile (WRITE, requires approval) ----

class UpdateProfileInput(BaseModel):
    username: Optional[str] = Field(default=None, max_length=100)
    bio: Optional[str] = Field(default=None, max_length=1000)
    avatar_url: Optional[str] = Field(default=None)
    location: Optional[str] = Field(default=None, max_length=200)
    rv_type: Optional[str] = Field(default=None, max_length=100)
    rv_year: Optional[int] = Field(default=None, ge=1900, le=2099)


class UpdateProfileOutput(BaseModel):
    profile: dict


update_profile_tool = ToolSpec(
    name="update_profile",
    description="Update user profile information. Requires explicit approval.",
    namespace=PROFILE.name,
    input_schema=UpdateProfileInput,
    output_schema=UpdateProfileOutput,
    effect=ToolEffect.WRITE,
    risk=ToolRisk.LOW,
    scope=ToolScope.OWN,
    approval_policy=ApprovalPolicy.EXPLICIT,
    idempotent=True,
)


@register_handler(update_profile_tool.name)
async def handle_update_profile(context: ToolContext, input: UpdateProfileInput) -> ToolResult:
    try:
        kwargs = {}
        for field in ("username", "bio", "avatar_url", "location", "rv_type", "rv_year"):
            val = getattr(input, field, None)
            if val is not None:
                kwargs[field] = val
        result = await v1_update_profile(user_id=context.user_id, **kwargs)
        if not result.get("success"):
            return ToolResult(success=False, error_code="profile_update_failed", error_message=result.get("message"))
        return ToolResult(
            success=True,
            data={"profile": result.get("profile", {})},
            summary=result.get("message", "Profile updated"),
        )
    except Exception as exc:
        return ToolResult(success=False, error_code="profile_update_error", error_message=str(exc))


catalog.register(update_profile_tool)


# ---- update_settings (WRITE) ----

class UpdateSettingsInput(BaseModel):
    email_notifications: Optional[bool] = None
    push_notifications: Optional[bool] = None
    theme: Optional[str] = Field(default=None, max_length=50)
    language: Optional[str] = Field(default=None, max_length=10)
    budget_alerts: Optional[bool] = None
    trip_reminders: Optional[bool] = None
    profile_visibility: Optional[str] = Field(default=None, pattern="^(public|friends|private)$")
    location_sharing: Optional[bool] = None


class UpdateSettingsOutput(BaseModel):
    settings: dict


update_settings_tool = ToolSpec(
    name="update_settings",
    description="Update user preferences, notifications, and privacy settings.",
    namespace=PROFILE.name,
    input_schema=UpdateSettingsInput,
    output_schema=UpdateSettingsOutput,
    effect=ToolEffect.WRITE,
    risk=ToolRisk.LOW,
    scope=ToolScope.OWN,
    approval_policy=ApprovalPolicy.NONE,
    idempotent=True,
)


@register_handler(update_settings_tool.name)
async def handle_update_settings(context: ToolContext, input: UpdateSettingsInput) -> ToolResult:
    try:
        kwargs = {}
        for field in ("email_notifications", "push_notifications", "theme", "language",
                       "budget_alerts", "trip_reminders", "profile_visibility", "location_sharing"):
            val = getattr(input, field, None)
            if val is not None:
                kwargs[field] = val
        result = await v1_update_settings(user_id=context.user_id, **kwargs)
        if not result.get("success"):
            return ToolResult(success=False, error_code="settings_update_failed", error_message=result.get("message"))
        return ToolResult(
            success=True,
            data={"settings": result.get("settings", {})},
            summary=result.get("message", "Settings updated"),
        )
    except Exception as exc:
        return ToolResult(success=False, error_code="settings_update_error", error_message=str(exc))


catalog.register(update_settings_tool)


# ---- add_vehicle (WRITE, requires approval) ----

class AddVehicleInput(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    make: Optional[str] = Field(default=None, max_length=100)
    model: Optional[str] = Field(default=None, max_length=100)
    year: Optional[int] = Field(default=None, ge=1900, le=2099)
    vehicle_type: str = Field(default="rv", pattern="^(rv|caravan|truck|car|van)$")
    fuel_type: str = Field(default="gasoline", pattern="^(gasoline|diesel|electric|hybrid|LPG)$")


class AddVehicleOutput(BaseModel):
    vehicle_id: str
    name: str
    is_primary: bool


add_vehicle_tool = ToolSpec(
    name="add_vehicle",
    description="Add a new vehicle to the user's profile. Requires explicit approval.",
    namespace=PROFILE.name,
    input_schema=AddVehicleInput,
    output_schema=AddVehicleOutput,
    effect=ToolEffect.WRITE,
    risk=ToolRisk.LOW,
    scope=ToolScope.OWN,
    approval_policy=ApprovalPolicy.EXPLICIT,
    idempotent=True,
)


@register_handler(add_vehicle_tool.name)
async def handle_add_vehicle(context: ToolContext, input: AddVehicleInput) -> ToolResult:
    try:
        result = await create_vehicle(
            user_id=context.user_id,
            name=input.name,
            make=input.make,
            model=input.model,
            year=input.year,
            vehicle_type=input.vehicle_type,
            fuel_type=input.fuel_type,
        )
        if not result.get("success"):
            return ToolResult(success=False, error_code="vehicle_add_failed", error_message=result.get("message"))
        return ToolResult(
            success=True,
            data={
                "vehicle_id": result.get("vehicle_id", ""),
                "name": result.get("name", input.name),
                "is_primary": result.get("is_primary", False),
            },
            summary=result.get("message", f"Added vehicle: {input.name}"),
        )
    except Exception as exc:
        return ToolResult(success=False, error_code="vehicle_add_error", error_message=str(exc))


catalog.register(add_vehicle_tool)
