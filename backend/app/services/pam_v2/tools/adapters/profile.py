"""
Pam V2 profile adapter: read-only access to the user's own profile.
"""

from __future__ import annotations

from typing import Any, Dict

from pydantic import BaseModel, Field

from app.core.database import get_supabase_client

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
