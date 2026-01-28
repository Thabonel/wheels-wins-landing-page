"""Export Budget Report Tool for PAM

Generate budget reports for the user

Example usage:
- "Export my budget report"
- "Generate spending report for this month"
"""

import logging
from datetime import datetime
from typing import Any, Dict, Optional

from app.core.database import get_supabase_client
from app.services.pam.tools.exceptions import (
    ValidationError,
    DatabaseError,
)
from app.services.pam.tools.utils import (
    validate_uuid,
    validate_date_format,
    safe_db_select,
)

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

    Raises:
        ValidationError: Invalid input parameters
        DatabaseError: Database operation failed
    """
    try:
        validate_uuid(user_id, "user_id")

        if start_date:
            validate_date_format(start_date, "start_date")
        if end_date:
            validate_date_format(end_date, "end_date")

        valid_formats = ["pdf", "csv", "json"]
        if format not in valid_formats:
            raise ValidationError(
                f"Invalid format. Must be one of: {', '.join(valid_formats)}",
                context={"format": format, "valid_formats": valid_formats}
            )

        month_start = datetime.now().replace(day=1, hour=0, minute=0, second=0, microsecond=0)

        expenses = await safe_db_select(
            "expenses",
            filters={"user_id": user_id},
            user_id=user_id
        )
        expenses = [e for e in expenses if datetime.fromisoformat(e.get("date", "1970-01-01")) >= month_start]

        budgets = await safe_db_select(
            "budgets",
            filters={"user_id": user_id},
            user_id=user_id
        )

        savings = await safe_db_select(
            "pam_savings_events",
            filters={"user_id": user_id},
            user_id=user_id
        )
        savings = [s for s in savings if datetime.fromisoformat(s.get("created_at", "1970-01-01")) >= month_start]

        total_expenses = sum(float(e.get("amount", 0)) for e in expenses)
        total_budgeted = sum(float(b.get("monthly_limit", 0)) for b in budgets)
        total_savings = sum(float(s.get("actual_savings", 0)) for s in savings)

        report = {
            "user_id": user_id,
            "period": {
                "period_type": period,
                "start": start_date or month_start.isoformat(),
                "end": end_date or datetime.now().isoformat(),
                "month": month_start.strftime("%B %Y")
            },
            "summary": {
                "total_expenses": total_expenses,
                "total_budgeted": total_budgeted,
                "total_savings": total_savings,
                "budget_remaining": total_budgeted - total_expenses,
                "expense_count": len(expenses),
                "savings_event_count": len(savings)
            },
            "expenses": expenses,
            "budgets": budgets,
            "savings_events": savings,
            "generated_at": datetime.now().isoformat()
        }

        return {
            "success": True,
            "report": report,
            "format": format
        }

    except ValidationError:
        raise
    except DatabaseError:
        raise
    except Exception as e:
        logger.error(
            "Unexpected error exporting budget report",
            extra={"user_id": user_id, "format": format},
            exc_info=True
        )
        raise DatabaseError(
            "Failed to export budget report",
            context={"user_id": user_id, "error": str(e)}
        )
