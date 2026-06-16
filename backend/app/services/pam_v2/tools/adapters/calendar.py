"""
Pam V2 calendar adapter: read-only listing and approved calendar creation.
"""

from __future__ import annotations

from datetime import date, timedelta
from typing import Optional

from pydantic import BaseModel, Field

from app.services.pam.tools.create_calendar_event import create_calendar_event
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


# ---- Create calendar event (write tool requiring approval) ----

class CreateCalendarEventInput(BaseModel):
    title: str = Field(..., min_length=1, max_length=200, description="Event title")
    start_date: str = Field(..., description="ISO start datetime")
    end_date: Optional[str] = Field(default=None, description="ISO end datetime")
    description: Optional[str] = Field(default=None, max_length=2000)
    event_type: str = Field(default="reminder", pattern="^(reminder|trip|booking|maintenance|inspection)$")
    all_day: bool = False
    location_name: Optional[str] = None
    color: str = "#3b82f6"


class CreateCalendarEventOutput(BaseModel):
    event: dict


create_calendar_event_tool = ToolSpec(
    name="create_calendar_event",
    description="Create a new calendar event for the current user. Requires explicit approval.",
    namespace=CALENDAR.name,
    input_schema=CreateCalendarEventInput,
    output_schema=CreateCalendarEventOutput,
    effect=ToolEffect.WRITE,
    risk=ToolRisk.LOW,
    scope=ToolScope.OWN,
    approval_policy=ApprovalPolicy.EXPLICIT,
    idempotent=True,
)


@register_handler(create_calendar_event_tool.name)
async def handle_create_calendar_event(
    context: ToolContext, input: CreateCalendarEventInput
) -> ToolResult:
    try:
        result = await create_calendar_event(
            user_id=context.user_id,
            title=input.title,
            start_date=input.start_date,
            end_date=input.end_date,
            description=input.description,
            event_type=input.event_type,
            all_day=input.all_day,
            location_name=input.location_name,
            color=input.color,
        )

        if not result.get("success"):
            return ToolResult(
                success=False,
                error_code="calendar_create_failed",
                error_message=result.get("error", "Could not create calendar event"),
            )

        event = result.get("event", result.get("data", {}))
        return ToolResult(
            success=True,
            data={"event": event},
            summary=f"Created event: {input.title}",
        )
    except Exception as exc:
        return ToolResult(
            success=False,
            error_code="calendar_create_error",
            error_message=f"Calendar creation failed: {type(exc).__name__}",
        )


catalog.register(create_calendar_event_tool)
