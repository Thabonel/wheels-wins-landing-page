from __future__ import annotations

from typing import Any, Dict

from app.models.structured_responses import StructuredResponse

__all__ = ["social_chain"]

async def _call_social_tools(input_text: str, user_ctx: Dict[str, Any]) -> Dict[str, Any]:
    """Placeholder for social node tools."""
    return {}

async def social_chain(input_text: str, user_ctx: Dict[str, Any]) -> StructuredResponse:
    """Micro-agent chain for the social node."""
    await _call_social_tools(input_text, user_ctx)
    return StructuredResponse(
        answer_display="social placeholder",
        answer_speech="social placeholder",
        answer_ssml="social placeholder",
    )
