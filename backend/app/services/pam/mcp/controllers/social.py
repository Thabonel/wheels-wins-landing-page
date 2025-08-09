from __future__ import annotations

from typing import Any, Dict

from app.models.structured_responses import StructuredResponse
from app.services.pam.mcp.tools import (
    post_update,
    suggest_groups,
    get_user_context,
)

__all__ = ["social_chain"]

async def _call_social_tools(
    input_text: str, user_ctx: Dict[str, Any]
) -> Dict[str, Any]:
    """Invoke social micro-agent tools."""
    context = await get_user_context(user_ctx)
    user_id = user_ctx.get("user_id", "anon")
    post = await post_update(user_id, input_text)
    groups = await suggest_groups(user_id)
    return {"context": context, "post": post, "groups": groups}

async def social_chain(
    input_text: str, user_ctx: Dict[str, Any]
) -> StructuredResponse:
    """Micro-agent chain for the social node."""
    data = await _call_social_tools(input_text, user_ctx)
    answer_display = "Update posted to social feed"
    answer_speech = "Your update has been shared."
    return StructuredResponse(
        answer_display=answer_display,
        answer_speech=answer_speech,
        answer_ssml=f"<speak>{answer_speech}</speak>",
        ui_actions=[],
        memory_updates=data,
    )
