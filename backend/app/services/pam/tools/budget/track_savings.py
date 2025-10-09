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

from app.integrations.supabase import get_supabase_client

logger = logging.getLogger(__name__)


async def track_savings(
    user_id: str,
    amount_saved: float,
    category: str,
    description: Optional[str] = None,
    event_type: str = "other",
    **kwargs
) -> Dict[str, Any]:
    """
    Track money saved by PAM for the user

    Args:
        user_id: UUID of the user
        amount_saved: Amount of money saved (must be positive)
        category: Category of savings (gas, campground, route, shopping, etc.)
        description: Optional description of what was saved
        event_type: Type of savings event (gas, campground, route, other)

    Returns:
        Dict with savings event details and monthly total
    """
    try:
        # Validate amount
        if amount_saved <= 0:
            return {
                "success": False,
                "error": "Savings amount must be positive"
            }

        # Validate event_type
        valid_types = ['gas', 'campground', 'route', 'other']
        if event_type not in valid_types:
            event_type = 'other'

        # Get Supabase client
        supabase = get_supabase_client()

        # Map event_type to valid savings_type for schema
        savings_type_map = {
            'gas': 'fuel_optimization',
            'campground': 'camping_alternative',
            'route': 'route_optimization',
            'other': 'price_comparison'
        }
        savings_type = savings_type_map.get(event_type, 'price_comparison')

        # Build savings event data matching actual schema
        # Schema requires: savings_type, predicted_savings, actual_savings, baseline_cost,
        # optimized_cost, savings_description, verification_method, category, saved_date
        savings_data = {
            "user_id": user_id,
            "savings_type": savings_type,
            "predicted_savings": float(amount_saved),  # Predicted == actual for user-confirmed savings
            "actual_savings": float(amount_saved),
            "baseline_cost": float(amount_saved),  # Simplified: savings = baseline - optimized
            "optimized_cost": 0.0,  # Simplified: user saved full amount
            "savings_description": description or f"Saved on {category}",
            "verification_method": "user_confirmation",  # User confirmed via PAM
            "category": category.lower(),
            "saved_date": datetime.now().date().isoformat()
        }

        # Insert savings event
        response = supabase.table("pam_savings_events").insert(savings_data).execute()

        if response.data:
            savings_event = response.data[0]
            logger.info(f"Created savings event: {savings_event['id']} for user {user_id}")

            # Calculate monthly total savings (using actual_savings field from schema)
            month_start = datetime.now().replace(day=1, hour=0, minute=0, second=0, microsecond=0).date()
            monthly_response = supabase.table("pam_savings_events").select("actual_savings").eq("user_id", user_id).gte("saved_date", month_start.isoformat()).execute()

            monthly_total = sum(event.get("actual_savings", 0) for event in monthly_response.data) if monthly_response.data else 0

            return {
                "success": True,
                "savings_event": savings_event,
                "monthly_total": monthly_total,
                "message": f"Saved ${amount_saved:.2f} on {category}! Monthly total: ${monthly_total:.2f}"
            }
        else:
            logger.error(f"Failed to create savings event: {response}")
            return {
                "success": False,
                "error": "Failed to create savings event"
            }

    except Exception as e:
        logger.error(f"Error tracking savings: {e}", exc_info=True)
        return {
            "success": False,
            "error": str(e)
        }
