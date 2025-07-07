from __future__ import annotations

from typing import Any, Dict

from app.models.structured_responses import StructuredResponse

__all__ = ["memory_chain"]

async def _call_memory_tools(input_text: str, user_ctx: Dict[str, Any]) -> Dict[str, Any]:
    """Placeholder for memory node tools."""
    return {}

async def memory_chain(input_text: str, user_ctx: Dict[str, Any]) -> StructuredResponse:
    """Micro-agent chain for the memory node."""
    await _call_memory_tools(input_text, user_ctx)
    return StructuredResponse(
        answer_display="memory placeholder",
        answer_speech="memory placeholder",
        answer_ssml="memory placeholder",
    )
