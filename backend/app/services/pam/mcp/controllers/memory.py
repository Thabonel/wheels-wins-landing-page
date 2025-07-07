from __future__ import annotations

from typing import Any, Dict

from app.services.pam.mcp.models.context_manager import context_manager

from app.models.structured_responses import StructuredResponse

__all__ = ["memory_chain"]

async def _call_memory_tools(input_text: str, user_ctx: Dict[str, Any]) -> Dict[str, Any]:
    """Persist a conversation turn and return updated memory."""
    user_id = user_ctx.get("user_id")
    session_id = user_ctx.get("session_id")

    if not user_id:
        return {}

    await context_manager.save_memory(
        user_id=user_id,
        session_id=session_id or "default",
        user_message=input_text,
        pam_response="",
    )

    return await context_manager.get_user_context(user_id, session_id)

async def memory_chain(input_text: str, user_ctx: Dict[str, Any]) -> StructuredResponse:
    """Micro-agent chain for the memory node."""
    memory_data = await _call_memory_tools(input_text, user_ctx)
    answer_speech = "I've stored that for you."
    return StructuredResponse(
        answer_display="Memory updated",
        answer_speech=answer_speech,
        answer_ssml=f"<speak>{answer_speech}</speak>",
        memory_updates=memory_data,
    )
