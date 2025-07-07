from __future__ import annotations

from typing import Any, Dict

from app.models.structured_responses import StructuredResponse

__all__ = ["wheels_chain"]

async def _call_wheels_tools(input_text: str, user_ctx: Dict[str, Any]) -> Dict[str, Any]:
    """Placeholder for wheels node tools."""
    return {}

async def wheels_chain(input_text: str, user_ctx: Dict[str, Any]) -> StructuredResponse:
    """Micro-agent chain for the wheels node."""
    await _call_wheels_tools(input_text, user_ctx)
    return StructuredResponse(
        answer_display="wheels placeholder",
        answer_speech="wheels placeholder",
        answer_ssml="wheels placeholder",
    )
