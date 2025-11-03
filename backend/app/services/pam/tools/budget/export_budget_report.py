"""Export Budget Report Tool for PAM

Generate budget reports for the user

Example usage:
- "Export my budget report"
- "Generate spending report for this month"

Amendment #4: Input validation with Pydantic models
"""

import logging
from datetime import datetime
from typing import Any, Dict, Optional
from pydantic import ValidationError

from app.integrations.supabase import get_supabase_client
from app.services.pam.schemas.budget import ExportBudgetReportInput

logger = logging.getLogger(__name__)


async def export_budget_report(
    user_id: str,
    format: str = "pdf",
    period: str = "monthly",
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    **kwargs
) -> Dict[str, Any]:
    """
    Generate and export budget report

    Args:
        user_id: UUID of the user
        format: Export format (pdf, csv, or json)
        period: Report period (daily, weekly, monthly, quarterly, yearly)
        start_date: Optional start date (ISO format)
        end_date: Optional end date (ISO format)

    Returns:
        Dict with report data
    """
    try:
        # Validate inputs using Pydantic schema
        try:
            validated = ExportBudgetReportInput(
                user_id=user_id,
                format=format,
                period=period,
                start_date=start_date,
                end_date=end_date
            )
        except ValidationError as e:
            # Extract first error message for user-friendly response
            error_msg = e.errors()[0]['msg']
            return {
                "success": False,
                "error": f"Invalid input: {error_msg}"
            }

        supabase = get_supabase_client()

        # Get current month
        month_start = datetime.now().replace(day=1, hour=0, minute=0, second=0, microsecond=0)

        # Get all data for current month using validated user_id
        expenses = supabase.table("expenses").select("*").eq("user_id", validated.user_id).gte("date", month_start.isoformat()).execute()
        budgets = supabase.table("budgets").select("*").eq("user_id", validated.user_id).execute()
        savings = supabase.table("pam_savings_events").select("*").eq("user_id", validated.user_id).gte("created_at", month_start.isoformat()).execute()

        # Calculate totals (schema uses monthly_limit for budgets, actual_savings for savings)
        total_expenses = sum(float(e.get("amount", 0)) for e in (expenses.data if expenses.data else []))
        total_budgeted = sum(float(b.get("monthly_limit", 0)) for b in (budgets.data if budgets.data else []))  # Correct field name
        total_savings = sum(float(s.get("actual_savings", 0)) for s in (savings.data if savings.data else []))  # Correct field name

        # Build report
        report = {
            "user_id": validated.user_id,
            "period": {
                "period_type": validated.period,
                "start": validated.start_date or month_start.isoformat(),
                "end": validated.end_date or datetime.now().isoformat(),
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
            "format": validated.format
        }

    except Exception as e:
        logger.error(f"Error exporting report: {e}", exc_info=True)
        return {"success": False, "error": str(e)}
