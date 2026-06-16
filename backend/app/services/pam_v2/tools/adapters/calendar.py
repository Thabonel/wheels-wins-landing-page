"""
Pam V2 calendar adapter: read-only listing of the user's calendar events.
"""

from __future__ import annotations

from datetime import date, timedelta
from typing import Optional

from pydantic import BaseModel, Field

from app.services.pam.tools.get_calendar_events import get_calendar_events

from ..catalog import catalog
from ..handlers import register_handler
from ..namespaces import CALENDAR
from ..types import (
    ApprovalPolicy,
    ToolContext,
    ToolEffect,
    ToolResult,
    ToolRisk,
    ToolScope,
    ToolSpec,
)


class ListCalendarEventsInput(BaseModel):
    start_date: Optional[str] = Field(default=None, description="ISO date (YYYY-MM-DD)")
    end_date: Optional[str] = Field(default=None, description="ISO date (YYYY-MM-DD)")
    limit: int = Field(default=20, ge=1, le=100)


class ListCalendarEventsOutput(BaseModel):
    events: list[dict]
    count: int


list_calendar_events_tool = ToolSpec(
    name="list_calendar_events",
    description="List the current user's calendar events for a date range.",
    namespace=CALENDAR.name,
    input_schema=ListCalendarEventsInput,
    output_schema=ListCalendarEventsOutput,
    effect=ToolEffect.READ,
    risk=ToolRisk.LOW,
    scope=ToolScope.OWN,
    approval_policy=ApprovalPolicy.NONE,
    idempotent=True,
)


@register_handler(list_calendar_events_tool.name)
async def handle_list_calendar_events(
    context: ToolContext, input: ListCalendarEventsInput
) -> ToolResult:
    try:
        if not input.start_date:
            input.start_date = date.today().isoformat()
        if not input.end_date:
            input.end_date = (date.today() + timedelta(days=30)).isoformat()

        result = await get_calendar_events(
            user_id=context.user_id,
            start_date=input.start_date,
            end_date=input.end_date,
            limit=input.limit,
        )

        if not result.get("success"):
            return ToolResult(
                success=False,
                error_code="calendar_list_failed",
                error_message=result.get("error", "Could not list calendar events"),
            )

        events = result.get("events", [])
        return ToolResult(
            success=True,
            data={"events": events, "count": len(events)},
            summary=f"Found {len(events)} calendar events",
        )
    except Exception as exc:
        return ToolResult(
            success=False,
            error_code="calendar_tool_error",
            error_message=f"Calendar lookup failed: {type(exc).__name__}",
        )


catalog.register(list_calendar_events_tool)
