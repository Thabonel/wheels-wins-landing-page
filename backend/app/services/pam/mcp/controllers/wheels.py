from __future__ import annotations

from typing import Any, Dict

from app.models.structured_responses import StructuredResponse
from app.services.pam.mcp.tools import (
    plan_trip,
    track_expense,
    get_user_context,
)

__all__ = ["wheels_chain"]

async def _call_wheels_tools(
    input_text: str, user_ctx: Dict[str, Any]
) -> Dict[str, Any]:
    """Invoke wheels micro-agent tools."""
    context = await get_user_context(user_ctx)
    user_id = user_ctx.get("user_id", "anon")
    trip = await plan_trip("brisbane", "sydney", user_id)
    expense = await track_expense(user_id, "fuel", 100.0)
    return {"context": context, "trip": trip, "expense": expense}

async def wheels_chain(
    input_text: str, user_ctx: Dict[str, Any]
) -> StructuredResponse:
    """Micro-agent chain for the wheels node."""
    data = await _call_wheels_tools(input_text, user_ctx)
    trip = data.get("trip", {})
    route = trip.get("route", {})
    start = route.get("start", {})
    end = route.get("end", {})
    answer_display = (
        f"Trip planned from {start.get('lat')}:{start.get('lon')} "
        f"to {end.get('lat')}:{end.get('lon')}"
    )
    answer_speech = "Your trip is ready and expense logged."
    return StructuredResponse(
        answer_display=answer_display,
        answer_speech=answer_speech,
        answer_ssml=f"<speak>{answer_speech}</speak>",
        ui_actions=[],
        memory_updates=data,
    )
