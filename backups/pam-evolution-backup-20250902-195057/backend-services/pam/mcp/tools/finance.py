from __future__ import annotations

from typing import Any, Dict, List

from langchain_core.tools import tool

from app.database.supabase_client import get_supabase_client


@tool
async def log_expense(user_id: str, category: str, amount: float, description: str = "") -> Dict[str, Any]:
    """Log an expense entry for a user."""
    supabase = get_supabase_client()
    data = {
        "user_id": user_id,
        "category": category,
        "amount": amount,
        "description": description,
    }
    result = supabase.table("expenses").insert(data).execute()
    return result.data


@tool
async def suggest_budget_adjustment(user_id: str, category: str) -> Dict[str, Any]:
    """Suggest a budget adjustment based on spending."""
    supabase = get_supabase_client()
    budget_res = (
        supabase.table("budgets")
        .select("*")
        .eq("user_id", user_id)
        .eq("category", category)
        .limit(1)
        .execute()
    )
    budget = budget_res.data[0] if budget_res.data else None

    expense_res = (
        supabase.table("expenses")
        .select("amount")
        .eq("user_id", user_id)
        .eq("category", category)
        .execute()
    )
    total_spent = sum(float(e["amount"]) for e in (expense_res.data or []))

    suggestion = "budget_on_track"
    if budget and total_spent > float(budget.get("budgeted_amount", 0)):
        suggestion = "increase_budget"
    elif budget and total_spent < 0.5 * float(budget.get("budgeted_amount", 0)):
        suggestion = "reduce_budget"

    return {
        "suggestion": suggestion,
        "spent": total_spent,
        "budget": budget,
    }


@tool
async def fetch_summary(user_id: str) -> Dict[str, List[Dict[str, Any]]]:
    """Fetch budgets, expenses and income entries for a user."""
    supabase = get_supabase_client()
    budgets = supabase.table("budgets").select("*").eq("user_id", user_id).execute().data or []
    expenses = supabase.table("expenses").select("*").eq("user_id", user_id).execute().data or []
    income_entries = (
        supabase.table("income_entries")
        .select("*")
        .eq("user_id", user_id)
        .execute()
        .data
        or []
    )

    return {
        "budgets": budgets,
        "expenses": expenses,
        "income_entries": income_entries,
    }
