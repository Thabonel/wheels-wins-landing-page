from __future__ import annotations

from typing import Any, Dict

from langchain_core.tools import tool

from app.services.pam.context_manager import context_manager


@tool
async def get_user_context(raw_context: Dict[str, Any]) -> Dict[str, Any]:
    """Validate and enrich a raw context payload."""
    return context_manager.validate_and_enrich_context(raw_context)
