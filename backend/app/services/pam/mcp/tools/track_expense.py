from __future__ import annotations

from typing import Any, Dict

from langchain_core.tools import tool

from app.database.supabase_client import get_supabase_client


@tool
async def track_expense(user_id: str, category: str, amount: float) -> Dict[str, Any]:
    """Record an expense for a user in Supabase budgets table."""
    supabase = get_supabase_client()
    result = (
        supabase.table("budgets")
        .insert({"user_id": user_id, "category": category, "amount": amount})
        .execute()
    )
    return result.data
