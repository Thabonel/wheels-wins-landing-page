"""Track Savings Tool for PAM

Allows PAM to log money saved for the user (cheaper gas, better campground deals, etc.)

Example usage:
- "Saved $8 on gas at this station"
- "Found a campground $15 cheaper than average"
- "Route optimization saved $20 in fuel"

Amendment #4: Input validation with Pydantic models
"""

import logging
from datetime import datetime
from typing import Any, Dict, Optional
from pydantic import ValidationError

from app.integrations.supabase import get_supabase_client
from app.services.pam.schemas.budget import TrackSavingsInput

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
    """
    try:
        # Validate inputs using Pydantic schema
        try:
            validated = TrackSavingsInput(
                user_id=user_id,
                amount=amount,
                category=category,
                description=description,
                event_type=event_type
            )
        except ValidationError as e:
            # Extract first error message for user-friendly response
            error_msg = e.errors()[0]['msg']
            return {
                "success": False,
                "error": f"Invalid input: {error_msg}"
            }

        # Get Supabase client
        supabase = get_supabase_client()

        # Map event_type to valid savings_type for schema
        savings_type_map = {
            'gas': 'fuel_optimization',
            'campground': 'camping_alternative',
            'route': 'route_optimization',
            'other': 'price_comparison'
        }
        savings_type = savings_type_map.get(validated.event_type, 'price_comparison')

        # Build savings event data matching actual schema using validated inputs
        # Schema requires: savings_type, predicted_savings, actual_savings, baseline_cost,
        # optimized_cost, savings_description, verification_method, category, saved_date
        savings_data = {
            "user_id": validated.user_id,
            "savings_type": savings_type,
            "predicted_savings": float(validated.amount),  # Predicted == actual for user-confirmed savings
            "actual_savings": float(validated.amount),
            "baseline_cost": float(validated.amount),  # Simplified: savings = baseline - optimized
            "optimized_cost": 0.0,  # Simplified: user saved full amount
            "savings_description": validated.description or f"Saved on {validated.category}",
            "verification_method": "user_confirmation",  # User confirmed via PAM
            "category": validated.category,  # Already lowercased by validator
            "saved_date": datetime.now().date().isoformat()
        }

        # Insert savings event
        response = supabase.table("pam_savings_events").insert(savings_data).execute()

        if response.data:
            savings_event = response.data[0]
            logger.info(f"Created savings event: {savings_event['id']} for user {validated.user_id}")

            # Calculate monthly total savings (using actual_savings field from schema)
            month_start = datetime.now().replace(day=1, hour=0, minute=0, second=0, microsecond=0).date()
            monthly_response = supabase.table("pam_savings_events").select("actual_savings").eq("user_id", validated.user_id).gte("saved_date", month_start.isoformat()).execute()

            monthly_total = sum(event.get("actual_savings", 0) for event in monthly_response.data) if monthly_response.data else 0

            return {
                "success": True,
                "savings_event": savings_event,
                "monthly_total": monthly_total,
                "message": f"Saved ${validated.amount:.2f} on {validated.category}! Monthly total: ${monthly_total:.2f}"
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
