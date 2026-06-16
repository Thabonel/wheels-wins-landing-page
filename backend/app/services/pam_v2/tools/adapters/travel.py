"""
Pam V2 travel info adapter: find campgrounds and RV parks near a location.
"""

from __future__ import annotations

from typing import List, Optional

from pydantic import BaseModel, Field

from app.services.pam.tools.trip.find_rv_parks import find_rv_parks

from ..catalog import catalog
from ..handlers import register_handler
from ..namespaces import TRAVEL
from ..types import (
    ApprovalPolicy,
    ToolContext,
    ToolEffect,
    ToolResult,
    ToolRisk,
    ToolScope,
    ToolSpec,
    ToolTimeout,
)


class FindCampgroundsInput(BaseModel):
    location: str = Field(..., min_length=1)
    radius_miles: int = Field(default=50, ge=1, le=200)
    amenities: Optional[List[str]] = Field(default=None)


class FindCampgroundsOutput(BaseModel):
    location: str
    count: int
    campgrounds: List[dict]


find_campgrounds_tool = ToolSpec(
    name="find_campgrounds",
    description="Find campgrounds and RV parks near a location.",
    namespace=TRAVEL.name,
    input_schema=FindCampgroundsInput,
    output_schema=FindCampgroundsOutput,
    effect=ToolEffect.READ,
    risk=ToolRisk.NONE,
    scope=ToolScope.PUBLIC,
    approval_policy=ApprovalPolicy.NONE,
    timeout_seconds=ToolTimeout.SLOW,
    idempotent=True,
    max_retries=1,
)


@register_handler(find_campgrounds_tool.name)
async def handle_find_campgrounds(context: ToolContext, input: FindCampgroundsInput) -> ToolResult:
    try:
        result = await find_rv_parks(
            user_id=context.user_id,
            location=input.location,
            radius_miles=input.radius_miles,
            amenities=input.amenities,
        )

        if not result.get("success"):
            return ToolResult(
                success=False,
                error_code="campground_search_failed",
                error_message=result.get("error", "Could not search campgrounds"),
            )

        campgrounds = result.get("campgrounds", [])
        return ToolResult(
            success=True,
            data={
                "location": input.location,
                "count": len(campgrounds),
                "campgrounds": campgrounds[:10],
            },
            summary=f"Found {len(campgrounds)} campgrounds near {input.location}",
        )
    except Exception as exc:
        return ToolResult(
            success=False,
            error_code="campground_tool_error",
            error_message=f"Campground search failed: {type(exc).__name__}",
        )


catalog.register(find_campgrounds_tool)
