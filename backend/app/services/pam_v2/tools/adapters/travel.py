"""
Pam V2 travel adapter: routes, weather, campgrounds, and trip planning.
"""

from __future__ import annotations

from typing import List, Optional

from pydantic import BaseModel, Field

from app.services.pam.tools.trip.calculate_gas_cost import calculate_gas_cost as v1_calculate_gas_cost
from app.services.pam.tools.trip.estimate_travel_time import estimate_travel_time as v1_estimate_travel_time
from app.services.pam.tools.trip.find_attractions import find_attractions as v1_find_attractions
from app.services.pam.tools.trip.find_cheap_gas import find_cheap_gas as v1_find_cheap_gas
from app.services.pam.tools.trip.find_rv_parks import find_rv_parks
from app.services.pam.tools.trip.get_road_conditions import get_road_conditions as v1_get_road_conditions
from app.services.pam.tools.trip.plan_trip import plan_trip as v1_plan_trip

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


# ---- find_cheap_gas (READ) ----

class FindCheapGasInput(BaseModel):
    location: str = Field(..., min_length=1, max_length=200)
    radius_miles: int = Field(default=25, ge=1, le=100)
    fuel_type: str = Field(default="regular", pattern="^(regular|premium|diesel|LPG)$")


class FindCheapGasOutput(BaseModel):
    location: str
    cheapest_price: Optional[float] = None
    stations_found: int
    stations: list


find_cheap_gas_tool = ToolSpec(
    name="find_cheap_gas",
    description="Find current fuel prices near a location.",
    namespace=TRAVEL.name,
    input_schema=FindCheapGasInput,
    output_schema=FindCheapGasOutput,
    effect=ToolEffect.READ,
    risk=ToolRisk.LOW,
    scope=ToolScope.PUBLIC,
    approval_policy=ApprovalPolicy.NONE,
    idempotent=True,
)


@register_handler(find_cheap_gas_tool.name)
async def handle_find_cheap_gas(context: ToolContext, input: FindCheapGasInput) -> ToolResult:
    try:
        result = await v1_find_cheap_gas(
            user_id=context.user_id, location=input.location,
            radius_miles=input.radius_miles, fuel_type=input.fuel_type,
        )
        if not result.get("success"):
            return ToolResult(success=False, error_code="gas_price_failed", error_message=result.get("message"))
        return ToolResult(
            success=True,
            data={
                "location": input.location,
                "cheapest_price": result.get("cheapest_price"),
                "stations_found": result.get("stations_found", 0),
                "stations": result.get("stations", [])[:20],
            },
            summary=result.get("message", f"Found {result.get('stations_found', 0)} stations"),
        )
    except Exception as exc:
        return ToolResult(success=False, error_code="gas_tool_error", error_message=str(exc))


catalog.register(find_cheap_gas_tool)


# ---- get_road_conditions (READ) ----

class GetRoadConditionsInput(BaseModel):
    location: str = Field(..., min_length=1, max_length=200)
    route: Optional[str] = Field(default=None, max_length=500)


class GetRoadConditionsOutput(BaseModel):
    location: str
    conditions: dict
    alert_count: int


get_road_conditions_tool = ToolSpec(
    name="get_road_conditions",
    description="Check road conditions, closures, and hazards.",
    namespace=TRAVEL.name,
    input_schema=GetRoadConditionsInput,
    output_schema=GetRoadConditionsOutput,
    effect=ToolEffect.READ,
    risk=ToolRisk.LOW,
    scope=ToolScope.PUBLIC,
    approval_policy=ApprovalPolicy.NONE,
    idempotent=True,
)


@register_handler(get_road_conditions_tool.name)
async def handle_get_road_conditions(context: ToolContext, input: GetRoadConditionsInput) -> ToolResult:
    try:
        result = await v1_get_road_conditions(user_id=context.user_id, location=input.location, route=input.route)
        if not result.get("success"):
            return ToolResult(success=False, error_code="road_conditions_failed", error_message=result.get("message"))
        return ToolResult(
            success=True,
            data={
                "location": input.location,
                "conditions": result.get("conditions", {}),
                "alert_count": result.get("alert_count", 0),
            },
            summary=result.get("message", f"{result.get('alert_count', 0)} alerts"),
        )
    except Exception as exc:
        return ToolResult(success=False, error_code="road_tool_error", error_message=str(exc))


catalog.register(get_road_conditions_tool)


# ---- estimate_travel_time (READ) ----

class EstimateTravelTimeInput(BaseModel):
    origin: str = Field(..., min_length=1, max_length=200)
    destination: str = Field(..., min_length=1, max_length=200)
    distance_miles: Optional[float] = Field(default=None, gt=0)
    include_breaks: bool = True


class EstimateTravelTimeOutput(BaseModel):
    origin: str
    destination: str
    distance_miles: float
    driving_hours: float
    total_hours: float
    suggested_days: int


estimate_travel_time_tool = ToolSpec(
    name="estimate_travel_time",
    description="Calculate travel duration with RV-specific adjustments.",
    namespace=TRAVEL.name,
    input_schema=EstimateTravelTimeInput,
    output_schema=EstimateTravelTimeOutput,
    effect=ToolEffect.READ,
    risk=ToolRisk.LOW,
    scope=ToolScope.PUBLIC,
    approval_policy=ApprovalPolicy.NONE,
    idempotent=True,
)


@register_handler(estimate_travel_time_tool.name)
async def handle_estimate_travel_time(context: ToolContext, input: EstimateTravelTimeInput) -> ToolResult:
    try:
        result = await v1_estimate_travel_time(
            user_id=context.user_id, origin=input.origin, destination=input.destination,
            distance_miles=input.distance_miles, include_breaks=input.include_breaks,
        )
        if not result.get("success"):
            return ToolResult(success=False, error_code="travel_time_failed", error_message=result.get("message"))
        return ToolResult(
            success=True,
            data={
                "origin": result.get("origin", input.origin),
                "destination": result.get("destination", input.destination),
                "distance_miles": result.get("distance_miles", 0),
                "driving_hours": result.get("driving_hours", 0),
                "total_hours": result.get("total_hours", 0),
                "suggested_days": result.get("suggested_days", 1),
            },
            summary=result.get("message", f"{result.get('suggested_days', 1)} day trip"),
        )
    except Exception as exc:
        return ToolResult(success=False, error_code="travel_time_error", error_message=str(exc))


catalog.register(estimate_travel_time_tool)


# ---- find_attractions (READ) ----

class FindAttractionsInput(BaseModel):
    location: str = Field(..., min_length=1, max_length=200)
    radius_miles: int = Field(default=50, ge=1, le=200)
    categories: Optional[List[str]] = Field(default=None)


class FindAttractionsOutput(BaseModel):
    location: str
    attractions_found: int
    attractions: list


find_attractions_tool = ToolSpec(
    name="find_attractions",
    description="Find tourist attractions and points of interest near a location.",
    namespace=TRAVEL.name,
    input_schema=FindAttractionsInput,
    output_schema=FindAttractionsOutput,
    effect=ToolEffect.READ,
    risk=ToolRisk.LOW,
    scope=ToolScope.PUBLIC,
    approval_policy=ApprovalPolicy.NONE,
    idempotent=True,
)


@register_handler(find_attractions_tool.name)
async def handle_find_attractions(context: ToolContext, input: FindAttractionsInput) -> ToolResult:
    try:
        result = await v1_find_attractions(
            user_id=context.user_id, location=input.location,
            radius_miles=input.radius_miles, categories=input.categories,
        )
        if not result.get("success"):
            return ToolResult(success=False, error_code="attractions_failed", error_message=result.get("message"))
        return ToolResult(
            success=True,
            data={
                "location": input.location,
                "attractions_found": result.get("attractions_found", 0),
                "attractions": result.get("attractions", [])[:20],
            },
            summary=f"Found {result.get('attractions_found', 0)} attractions near {input.location}",
        )
    except Exception as exc:
        return ToolResult(success=False, error_code="attractions_tool_error", error_message=str(exc))


catalog.register(find_attractions_tool)


# ---- calculate_gas_cost (READ) ----

class CalculateGasCostInput(BaseModel):
    distance_miles: Optional[float] = Field(default=None, gt=0)
    distance_km: Optional[float] = Field(default=None, gt=0)
    mpg: Optional[float] = Field(default=None, gt=0)
    gas_price: Optional[float] = Field(default=None, gt=0)


class CalculateGasCostOutput(BaseModel):
    distance_miles: float
    total_cost: float
    cost_per_mile: float
    gallons_needed: float


calculate_gas_cost_tool = ToolSpec(
    name="calculate_gas_cost",
    description="Calculate estimated fuel costs for a trip.",
    namespace=TRAVEL.name,
    input_schema=CalculateGasCostInput,
    output_schema=CalculateGasCostOutput,
    effect=ToolEffect.READ,
    risk=ToolRisk.LOW,
    scope=ToolScope.OWN,
    approval_policy=ApprovalPolicy.NONE,
    idempotent=True,
)


@register_handler(calculate_gas_cost_tool.name)
async def handle_calculate_gas_cost(context: ToolContext, input: CalculateGasCostInput) -> ToolResult:
    try:
        result = await v1_calculate_gas_cost(
            user_id=context.user_id,
            distance_miles=input.distance_miles,
            distance_km=input.distance_km,
            mpg=input.mpg,
            gas_price=input.gas_price,
        )
        if not result.get("success"):
            return ToolResult(success=False, error_code="gas_cost_failed", error_message=result.get("message"))
        return ToolResult(
            success=True,
            data={
                "distance_miles": result.get("distance_miles", 0),
                "total_cost": result.get("total_cost", result.get("cost_estimate", 0)),
                "cost_per_mile": result.get("cost_per_mile", 0),
                "gallons_needed": result.get("gallons_needed", 0),
            },
            summary=result.get("message", f"Fuel cost: ${result.get('total_cost', 0):.2f}"),
        )
    except Exception as exc:
        return ToolResult(success=False, error_code="gas_cost_error", error_message=str(exc))


catalog.register(calculate_gas_cost_tool)


# ---- plan_trip (WRITE, requires approval) ----

class PlanTripInput(BaseModel):
    origin: str = Field(..., min_length=1, max_length=200)
    destination: str = Field(..., min_length=1, max_length=200)
    budget: Optional[float] = Field(default=None, gt=0)
    stops: Optional[List[str]] = Field(default=None)
    start_date: Optional[str] = Field(default=None)
    end_date: Optional[str] = Field(default=None)


class PlanTripOutput(BaseModel):
    trip: dict
    estimates: dict


plan_trip_tool = ToolSpec(
    name="plan_trip",
    description="Create a comprehensive trip plan. Requires explicit approval.",
    namespace=TRAVEL.name,
    input_schema=PlanTripInput,
    output_schema=PlanTripOutput,
    effect=ToolEffect.WRITE,
    risk=ToolRisk.LOW,
    scope=ToolScope.OWN,
    approval_policy=ApprovalPolicy.EXPLICIT,
    idempotent=True,
)


@register_handler(plan_trip_tool.name)
async def handle_plan_trip(context: ToolContext, input: PlanTripInput) -> ToolResult:
    try:
        result = await v1_plan_trip(
            user_id=context.user_id, origin=input.origin, destination=input.destination,
            budget=input.budget, stops=input.stops,
            start_date=input.start_date, end_date=input.end_date,
        )
        if not result.get("success"):
            return ToolResult(success=False, error_code="trip_plan_failed", error_message=result.get("message"))
        return ToolResult(
            success=True,
            data={
                "trip": result.get("trip", {}),
                "estimates": result.get("estimates", {}),
            },
            summary=result.get("message", f"Trip planned from {input.origin} to {input.destination}"),
        )
    except Exception as exc:
        return ToolResult(success=False, error_code="trip_plan_error", error_message=str(exc))


catalog.register(plan_trip_tool)
