"""Export Budget Report Tool for PAM

Generate budget reports for the user

Example usage:
- "Export my budget report"
- "Generate spending report for this month"
"""

import logging
from datetime import datetime
from typing import Any, Dict
from app.integrations.supabase import get_supabase_client

logger = logging.getLogger(__name__)


async def export_budget_report(
    user_id: str,
    format: str = "json",
    **kwargs
) -> Dict[str, Any]:
    """
    Generate and export budget report

    Args:
        user_id: UUID of the user
        format: Export format (json, csv, or summary)

    Returns:
        Dict with report data
    """
    try:
        supabase = get_supabase_client()

        # Get current month
        month_start = datetime.now().replace(day=1, hour=0, minute=0, second=0, microsecond=0)

        # Get all data for current month
        expenses = supabase.table("expenses").select("*").eq("user_id", user_id).gte("date", month_start.isoformat()).execute()
        budgets = supabase.table("budgets").select("*").eq("user_id", user_id).execute()
        savings = supabase.table("pam_savings_events").select("*").eq("user_id", user_id).gte("created_at", month_start.isoformat()).execute()

        # Calculate totals
        total_expenses = sum(float(e.get("amount", 0)) for e in (expenses.data if expenses.data else []))
        total_budgeted = sum(float(b.get("amount", 0)) for b in (budgets.data if budgets.data else []))
        total_savings = sum(float(s.get("amount_saved", 0)) for s in (savings.data if savings.data else []))

        # Build report
        report = {
            "user_id": user_id,
            "period": {
                "start": month_start.isoformat(),
                "end": datetime.now().isoformat(),
                "month": month_start.strftime("%B %Y")
            },
            "summary": {
                "total_expenses": total_expenses,
                "total_budgeted": total_budgeted,
                "total_savings": total_savings,
                "budget_remaining": total_budgeted - total_expenses,
                "expense_count": len(expenses.data) if expenses.data else 0,
                "savings_event_count": len(savings.data) if savings.data else 0
            },
            "expenses": expenses.data if expenses.data else [],
            "budgets": budgets.data if budgets.data else [],
            "savings_events": savings.data if savings.data else [],
            "generated_at": datetime.now().isoformat()
        }

        return {
            "success": True,
            "report": report,
            "format": format
        }

    except Exception as e:
        logger.error(f"Error exporting report: {e}", exc_info=True)
        return {"success": False, "error": str(e)}
