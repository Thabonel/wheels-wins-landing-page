from __future__ import annotations

from typing import Any, Dict

from app.models.structured_responses import StructuredResponse
from app.services.pam.mcp.tools import (
    log_expense,
    suggest_budget_adjustment,
    fetch_summary,
    get_user_context,
)

__all__ = ["wins_chain"]

async def _call_wins_tools(input_text: str, user_ctx: Dict[str, Any]) -> Dict[str, Any]:
    """Invoke wins micro-agent finance tools."""
    context = await get_user_context(user_ctx)
    user_id = user_ctx.get("user_id", "anon")
    expense = await log_expense(user_id, "misc", 10.0, input_text)
    suggestion = await suggest_budget_adjustment(user_id, "misc")
    summary = await fetch_summary(user_id)
    return {
        "context": context,
        "expense": expense,
        "suggestion": suggestion,
        "summary": summary,
    }

async def wins_chain(input_text: str, user_ctx: Dict[str, Any]) -> StructuredResponse:
    """Micro-agent chain for the wins node."""
    data = await _call_wins_tools(input_text, user_ctx)
    answer_display = "Expense logged successfully"
    answer_speech = "Your expense has been recorded."
    return StructuredResponse(
        answer_display=answer_display,
        answer_speech=answer_speech,
        answer_ssml=f"<speak>{answer_speech}</speak>",
        ui_actions=[{"type": "openModal", "name": "ExpenseLogged"}],
        memory_updates=data,
    )
