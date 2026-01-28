"""Auto Track Savings - Automatically record savings when PAM helps users save money

This module provides a lightweight function that tools can call to automatically
record savings when they help users save money. This makes the savings guarantee
system more accurate by capturing savings at the moment they happen.

Usage in other tools:
    from app.services.pam.tools.budget.auto_track_savings import auto_record_savings

    # In find_cheap_gas:
    await auto_record_savings(
        user_id=user_id,
        amount=potential_savings,
        category="fuel",
        savings_type="fuel_optimization",
        description=f"Found cheaper gas at {station_name} - saving ${savings:.2f}"
    )

Date: January 2026
"""

import logging
from datetime import datetime
from typing import Optional
import os

from app.services.pam.tools.exceptions import (
    ValidationError,
    DatabaseError,
)
from app.services.pam.tools.utils import (
    validate_uuid,
    validate_positive_number,
    safe_db_insert,
)

logger = logging.getLogger(__name__)


async def auto_record_savings(
    user_id: str,
    amount: float,
    category: str,
    savings_type: str,
    description: str,
    verification_method: str = "pam_tool_detection",
    confidence_score: float = 0.8,
    baseline_cost: Optional[float] = None,
    optimized_cost: Optional[float] = None
) -> bool:
    """
    Automatically record a savings event when PAM helps user save money.

    This is a fire-and-forget function - it won't raise exceptions or block
    the main tool execution. If recording fails, it logs the error and returns False.

    Args:
        user_id: UUID of the user
        amount: Amount of money saved (must be > 0)
        category: Category of savings (fuel, camping, food, route, etc.)
        savings_type: Type identifier (fuel_optimization, camping_alternative, etc.)
        description: Human-readable description of the savings
        verification_method: How the savings were verified
        confidence_score: How confident we are in the savings (0-1)
        baseline_cost: Original cost before optimization (optional)
        optimized_cost: Cost after optimization (optional)

    Returns:
        True if savings were recorded successfully, False otherwise
    """
    MIN_SAVINGS_THRESHOLD = 1.0

    if amount < MIN_SAVINGS_THRESHOLD:
        logger.debug(f"Savings amount ${amount:.2f} below threshold, not recording")
        return False

    try:
        validate_uuid(user_id, "user_id")
        validate_positive_number(amount, "amount")

        if not category or not category.strip():
            logger.warning("Category is required for auto-recording savings")
            return False

        if not savings_type or not savings_type.strip():
            logger.warning("Savings type is required for auto-recording savings")
            return False

        if baseline_cost is None:
            baseline_cost = amount
        if optimized_cost is None:
            optimized_cost = max(0, baseline_cost - amount)

        savings_data = {
            "user_id": user_id,
            "savings_type": savings_type,
            "predicted_savings": float(amount),
            "actual_savings": float(amount),
            "baseline_cost": float(baseline_cost),
            "optimized_cost": float(optimized_cost),
            "savings_description": description,
            "verification_method": verification_method,
            "confidence_score": confidence_score,
            "category": category.lower(),
            "saved_date": datetime.now().date().isoformat(),
            "metadata": {
                "auto_tracked": True,
                "source": "pam_tool"
            }
        }

        await safe_db_insert("pam_savings_events", savings_data, user_id)

        logger.info(
            f"Auto-recorded savings: ${amount:.2f} for user {user_id} "
            f"(category: {category}, type: {savings_type})"
        )
        return True

    except ValidationError as e:
        logger.warning(f"Validation error auto-recording savings: {e}")
        return False
    except DatabaseError as e:
        logger.error(f"Database error auto-recording savings: {e}")
        return False
    except Exception as e:
        logger.error(f"Unexpected error auto-recording savings: {e}")
        return False


async def calculate_potential_fuel_savings(
    regional_average: float,
    cheapest_price: float,
    estimated_gallons: float = 20.0
) -> float:
    """
    Calculate potential fuel savings based on price difference.

    Args:
        regional_average: Average regional fuel price per gallon/liter
        cheapest_price: Cheapest price found
        estimated_gallons: Estimated fill-up amount (default 20 gallons for RV)

    Returns:
        Potential savings amount
    """
    price_diff = regional_average - cheapest_price
    if price_diff <= 0:
        return 0.0

    return round(price_diff * estimated_gallons, 2)


async def calculate_route_savings(
    original_distance: float,
    optimized_distance: float,
    fuel_efficiency_mpg: float = 10.0,
    fuel_price_per_gallon: float = 3.50
) -> float:
    """
    Calculate savings from route optimization.

    Args:
        original_distance: Original route distance in miles
        optimized_distance: Optimized route distance in miles
        fuel_efficiency_mpg: Vehicle fuel efficiency (default 10 mpg for RV)
        fuel_price_per_gallon: Current fuel price

    Returns:
        Fuel cost savings from shorter route
    """
    distance_saved = original_distance - optimized_distance
    if distance_saved <= 0:
        return 0.0

    gallons_saved = distance_saved / fuel_efficiency_mpg
    savings = gallons_saved * fuel_price_per_gallon

    return round(savings, 2)
