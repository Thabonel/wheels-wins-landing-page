"""
Pam V2 routing adapter: route optimization between locations.
"""

from __future__ import annotations

from typing import List, Optional

from pydantic import BaseModel, Field

from app.services.pam.tools.trip.optimize_route import optimize_route

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


class OptimizeRouteInput(BaseModel):
    origin: str = Field(..., min_length=1)
    destination: str = Field(..., min_length=1)
    stops: Optional[List[str]] = Field(default=None)
    optimization_type: str = Field(default="balanced", pattern="^(balanced|cost|time)$")


class OptimizeRouteOutput(BaseModel):
    origin: str
    destination: str
    distance: str
    duration: str
    route_summary: str


optimize_route_tool = ToolSpec(
    name="optimize_route",
    description="Optimize a driving route between an origin and destination, optionally via stops.",
    namespace=TRAVEL.name,
    input_schema=OptimizeRouteInput,
    output_schema=OptimizeRouteOutput,
    effect=ToolEffect.READ,
    risk=ToolRisk.NONE,
    scope=ToolScope.PUBLIC,
    approval_policy=ApprovalPolicy.NONE,
    timeout_seconds=ToolTimeout.SLOW,
    idempotent=True,
    max_retries=1,
)


@register_handler(optimize_route_tool.name)
async def handle_optimize_route(context: ToolContext, input: OptimizeRouteInput) -> ToolResult:
    try:
        result = await optimize_route(
            user_id=context.user_id,
            origin=input.origin,
            destination=input.destination,
            stops=input.stops,
            optimization_type=input.optimization_type,
        )

        if not result.get("success"):
            return ToolResult(
                success=False,
                error_code="route_optimization_failed",
                error_message=result.get("error", "Could not optimize route"),
            )

        data = result.get("data", {})
        return ToolResult(
            success=True,
            data={
                "origin": input.origin,
                "destination": input.destination,
                "distance": data.get("distance", "unknown"),
                "duration": data.get("duration", "unknown"),
                "route_summary": data.get("route_summary", ""),
            },
            summary=f"Route from {input.origin} to {input.destination}",
        )
    except Exception as exc:
        return ToolResult(
            success=False,
            error_code="route_tool_error",
            error_message=f"Route lookup failed: {type(exc).__name__}",
        )


catalog.register(optimize_route_tool)
