from __future__ import annotations

from typing import Any, Dict, List, Optional

from langchain_core.tools import tool

from app.database.supabase_client import get_supabase_client


@tool
def add_idea(user_id: str, title: str, description: str = "", tags: Optional[List[str]] = None, avg_earnings: float = 0.0) -> Dict[str, Any]:
    """Add a money-making idea for a user."""
    supabase = get_supabase_client()
    data = {
        "user_id": user_id,
        "title": title,
        "description": description,
        "tags": tags or [],
        "avg_earnings": avg_earnings,
    }
    result = supabase.table("hustle_ideas").insert(data).execute()
    return result.data[0] if result.data else {}


@tool
def list_active_ideas(user_id: str) -> List[Dict[str, Any]]:
    """List a user's active money-making ideas."""
    supabase = get_supabase_client()
    result = (
        supabase.table("hustle_ideas")
        .select("*")
        .eq("user_id", user_id)
        .neq("status", "rejected")
        .order("created_at")
        .execute()
    )
    return result.data or []


@tool
def estimate_monthly_income(user_id: str) -> float:
    """Estimate monthly income from approved hustle ideas."""
    supabase = get_supabase_client()
    result = (
        supabase.table("hustle_ideas")
        .select("avg_earnings")
        .eq("user_id", user_id)
        .eq("status", "approved")
        .execute()
    )
    return sum(float(item["avg_earnings"]) for item in (result.data or []))
