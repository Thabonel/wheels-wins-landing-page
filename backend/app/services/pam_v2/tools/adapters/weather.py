"""
Pam V2 weather adapter: current conditions and forecasts via OpenMeteo.
"""

from __future__ import annotations

from pydantic import BaseModel, Field

from app.services.pam.tools.weather import get_weather

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


class GetWeatherInput(BaseModel):
    location: str = Field(..., min_length=1, description="City or 'lat,lon'")
    units: str = Field(default="metric", pattern="^(metric|imperial|kelvin)$")


class GetWeatherOutput(BaseModel):
    location: str
    temperature: float
    description: str
    humidity: int
    wind_speed: float
    units: str


get_weather_tool = ToolSpec(
    name="get_weather",
    description="Get current weather conditions for a location using a free API.",
    namespace=TRAVEL.name,
    input_schema=GetWeatherInput,
    output_schema=GetWeatherOutput,
    effect=ToolEffect.READ,
    risk=ToolRisk.NONE,
    scope=ToolScope.PUBLIC,
    approval_policy=ApprovalPolicy.NONE,
    timeout_seconds=ToolTimeout.SLOW,
    idempotent=True,
    max_retries=1,
)


@register_handler(get_weather_tool.name)
async def handle_get_weather(context: ToolContext, input: GetWeatherInput) -> ToolResult:
    try:
        result = await get_weather(location=input.location, units=input.units)

        if "error" in result:
            return ToolResult(
                success=False,
                error_code="weather_api_error",
                error_message=result.get("error", "Weather lookup failed"),
            )

        return ToolResult(
            success=True,
            data={
                "location": input.location,
                "temperature": result.get("temperature", 0.0),
                "description": result.get("description", ""),
                "humidity": result.get("humidity", 0),
                "wind_speed": result.get("wind_speed", 0.0),
                "units": input.units,
            },
            summary=f"{result.get('description', 'Weather')} in {input.location}",
        )
    except Exception as exc:
        return ToolResult(
            success=False,
            error_code="weather_tool_error",
            error_message=f"Weather lookup failed: {type(exc).__name__}",
        )


catalog.register(get_weather_tool)
