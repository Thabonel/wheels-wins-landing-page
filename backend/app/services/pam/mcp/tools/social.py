from __future__ import annotations

from typing import Any, Dict, List, Optional

from langchain_core.tools import tool

from app.database.supabase_client import get_supabase_client


@tool
async def post_update(user_id: str, content: str, group_id: Optional[str] = None) -> Dict[str, Any]:
    """Post a social update for a user."""
    supabase = get_supabase_client()
    data = {"user_id": user_id, "content": content}
    if group_id:
        data["group_id"] = group_id
    result = supabase.table("social_posts").insert(data).execute()
    return result.data[0] if result.data else {}


@tool
async def suggest_groups(user_id: str, limit: int = 5) -> List[Dict[str, Any]]:
    """Suggest popular groups for a user."""
    supabase = get_supabase_client()
    result = (
        supabase.table("social_groups")
        .select("*")
        .order("member_count", desc=True)
        .limit(limit)
        .execute()
    )
    return result.data or []

