"""Track Savings Tool for PAM

Allows PAM to log money saved for the user (cheaper gas, better campground deals, etc.)

Example usage:
- "Saved $8 on gas at this station"
- "Found a campground $15 cheaper than average"
- "Route optimization saved $20 in fuel"
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
    validate_positive_number,
    safe_db_insert,
    safe_db_select,
)

logger = logging.getLogger(__name__)


async def track_savings(
    user_id: str,
    amount: float,
    category: str,
    description: Optional[str] = None,
    event_type: str = "other",
    **kwargs
) -> Dict[str, Any]:
    """
    Track money saved by PAM for the user

    Args:
        user_id: UUID of the user
        amount: Amount of money saved (must be positive)
        category: Category of savings (gas, campground, route, shopping, etc.)
        description: Optional description of what was saved
        event_type: Type of savings event (gas, campground, route, other)

    Returns:
        Dict with savings event details and monthly total

    Raises:
        ValidationError: Invalid input parameters
        DatabaseError: Database operation failed
    """
    try:
        validate_uuid(user_id, "user_id")
        validate_positive_number(amount, "amount")

        if not category or not category.strip():
            raise ValidationError(
                "category is required and cannot be empty",
                context={"field": "category"}
            )

        valid_event_types = ["gas", "campground", "route", "other"]
        if event_type not in valid_event_types:
            raise ValidationError(
                f"Invalid event_type. Must be one of: {', '.join(valid_event_types)}",
                context={"event_type": event_type, "valid_event_types": valid_event_types}
            )

        savings_type_map = {
            'gas': 'fuel_optimization',
            'campground': 'camping_alternative',
            'route': 'route_optimization',
            'other': 'price_comparison'
        }
        savings_type = savings_type_map.get(event_type, 'price_comparison')

        savings_data = {
            "user_id": user_id,
            "savings_type": savings_type,
            "predicted_savings": float(amount),
            "actual_savings": float(amount),
            "baseline_cost": float(amount),
            "optimized_cost": 0.0,
            "savings_description": description or f"Saved on {category}",
            "verification_method": "user_confirmation",
            "category": category.lower(),
            "saved_date": datetime.now().date().isoformat()
        }

        savings_event = await safe_db_insert("pam_savings_events", savings_data, user_id)

        logger.info(f"Created savings event: {savings_event['id']} for user {user_id}")

        month_start = datetime.now().replace(day=1, hour=0, minute=0, second=0, microsecond=0).date()

        monthly_savings = await safe_db_select(
            "pam_savings_events",
            filters={"user_id": user_id},
            user_id=user_id
        )

        monthly_savings = [
            s for s in monthly_savings
            if datetime.fromisoformat(s.get("saved_date", "1970-01-01")).date() >= month_start
        ]

        monthly_total = sum(event.get("actual_savings", 0) for event in monthly_savings)

        return {
            "success": True,
            "savings_event": savings_event,
            "monthly_total": monthly_total,
            "message": f"Saved ${amount:.2f} on {category}! Monthly total: ${monthly_total:.2f}"
        }

    except ValidationError:
        raise
    except DatabaseError:
        raise
    except Exception as e:
        logger.error(
            "Unexpected error tracking savings",
            extra={"user_id": user_id, "amount": amount, "category": category},
            exc_info=True
        )
        raise DatabaseError(
            "Failed to track savings",
            context={"user_id": user_id, "error": str(e)}
        )
