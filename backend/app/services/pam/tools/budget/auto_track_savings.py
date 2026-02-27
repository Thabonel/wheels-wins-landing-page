"""Savings Verification System - Record savings with user verification status

This module provides functions to record savings opportunities and verified savings.
Savings must be explicitly verified by users to prevent inflated savings claims.

Usage in other tools:
    from app.services.pam.tools.budget.auto_track_savings import record_potential_savings, verify_savings

    # Record opportunity (NOT automatic savings):
    await record_potential_savings(
        user_id=user_id,
        amount=potential_savings,
        category="fuel",
        savings_type="fuel_optimization",
        description=f"Found cheaper gas at {station_name} - could save ${savings:.2f}"
    )

    # Only record as verified when user confirms they took the action:
    await verify_savings(savings_id, actual_amount_saved)

Date: February 2026
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

MIN_SAVINGS_THRESHOLD = 1.0
DEFAULT_CONFIDENCE_SCORE = 0.8


async def record_potential_savings(
    user_id: str,
    amount: float,
    category: str,
    savings_type: str,
    description: str,
    confidence_score: float = DEFAULT_CONFIDENCE_SCORE,
    baseline_cost: Optional[float] = None,
    optimized_cost: Optional[float] = None
) -> Optional[int]:
    """
    Record a potential savings opportunity that requires user verification.

    This function records savings opportunities that PAM identifies, but does NOT
    count them as verified savings until the user confirms they took the action.

    Args:
        user_id: UUID of the user
        amount: Potential amount of money that could be saved (must be > 0)
        category: Category of savings (fuel, camping, food, route, etc.)
        savings_type: Type identifier (fuel_optimization, camping_alternative, etc.)
        description: Human-readable description of the savings opportunity
        confidence_score: How confident we are in the savings estimate (0-1)
        baseline_cost: Original cost before optimization (optional)
        optimized_cost: Cost after optimization (optional)

    Returns:
        Savings record ID if recorded successfully, None if failed
    """
    if amount < MIN_SAVINGS_THRESHOLD:
        logger.debug(f"Potential savings amount ${amount:.2f} below threshold, not recording")
        return None

    try:
        validate_uuid(user_id, "user_id")
        validate_positive_number(amount, "amount")

        if not category or not category.strip():
            logger.warning("Category is required for recording savings opportunity")
            return None

        if not savings_type or not savings_type.strip():
            logger.warning("Savings type is required for recording savings opportunity")
            return None

        if baseline_cost is None:
            baseline_cost = amount
        if optimized_cost is None:
            optimized_cost = max(0, baseline_cost - amount)

        # Record as POTENTIAL savings opportunity - NOT verified
        savings_data = {
            "user_id": user_id,
            "event_type": "savings_opportunity",  # New: distinguish from actual savings
            "amount": float(amount),
            "description": f"POTENTIAL: {description}",
            "category": category.lower(),
            "metadata": {
                "savings_type": savings_type,
                "verification_status": "pending",  # CRITICAL: Not verified yet
                "confidence_score": confidence_score,
                "baseline_cost": float(baseline_cost),
                "optimized_cost": float(optimized_cost),
                "opportunity_date": datetime.now().isoformat(),
                "source": "pam_tool",
                "requires_user_confirmation": True
            }
        }

        result = await safe_db_insert("pam_savings_events", savings_data, user_id)
        savings_id = result.get('id') if result else None

        logger.info(
            f"Recorded POTENTIAL savings opportunity: ${amount:.2f} for user {user_id} "
            f"(category: {category}, type: {savings_type}) - ID: {savings_id}"
        )
        return savings_id

    except ValidationError as e:
        logger.warning(f"Validation error recording savings opportunity: {e}")
        return None
    except DatabaseError as e:
        logger.error(f"Database error recording savings opportunity: {e}")
        return None
    except Exception as e:
        logger.error(f"Unexpected error recording savings opportunity: {e}")
        return None


DEFAULT_RV_TANK_SIZE_GALLONS = 20.0
DEFAULT_RV_FUEL_EFFICIENCY_MPG = 10.0
DEFAULT_FUEL_PRICE_PER_GALLON = 3.50


async def calculate_potential_fuel_savings(
    regional_average: float,
    cheapest_price: float,
    estimated_gallons: float = DEFAULT_RV_TANK_SIZE_GALLONS
) -> float:
    """
    Calculate potential fuel savings based on price difference.

    Args:
        regional_average: Average regional fuel price per gallon/liter
        cheapest_price: Cheapest price found
        estimated_gallons: Estimated fill-up amount

    Returns:
        Potential savings amount
    """
    price_diff = regional_average - cheapest_price
    if price_diff <= 0:
        return 0.0

    return round(price_diff * estimated_gallons, 2)


async def verify_savings(
    savings_id: int,
    actual_amount_saved: float,
    user_id: str,
    notes: Optional[str] = None
) -> bool:
    """
    Verify that user actually achieved the savings opportunity.

    This function should be called when the user confirms they took the suggested
    savings action and wants to record the actual verified savings amount.

    Args:
        savings_id: ID of the original savings opportunity record
        actual_amount_saved: Actual amount the user saved (may differ from estimate)
        user_id: UUID of the user verifying the savings
        notes: Optional user notes about the savings action taken

    Returns:
        True if savings were successfully verified and recorded, False otherwise
    """
    try:
        validate_uuid(user_id, "user_id")
        validate_positive_number(actual_amount_saved, "actual_amount_saved")

        if actual_amount_saved < MIN_SAVINGS_THRESHOLD:
            logger.debug(f"Verified savings amount ${actual_amount_saved:.2f} below threshold, not recording")
            return False

        # Record verified savings event
        verified_savings_data = {
            "user_id": user_id,
            "event_type": "verified_savings",  # New: actual verified savings
            "amount": float(actual_amount_saved),
            "description": f"VERIFIED: User confirmed savings of ${actual_amount_saved:.2f}",
            "category": "verified",
            "metadata": {
                "original_opportunity_id": savings_id,
                "verification_status": "confirmed",  # CRITICAL: Now verified
                "verification_date": datetime.now().isoformat(),
                "user_notes": notes,
                "source": "user_verification",
                "requires_user_confirmation": False  # Already confirmed
            }
        }

        result = await safe_db_insert("pam_savings_events", verified_savings_data, user_id)

        if result:
            logger.info(
                f"Recorded VERIFIED savings: ${actual_amount_saved:.2f} for user {user_id} "
                f"(original opportunity ID: {savings_id})"
            )
            return True
        else:
            logger.error(f"Failed to record verified savings for opportunity {savings_id}")
            return False

    except ValidationError as e:
        logger.warning(f"Validation error verifying savings: {e}")
        return False
    except DatabaseError as e:
        logger.error(f"Database error verifying savings: {e}")
        return False
    except Exception as e:
        logger.error(f"Unexpected error verifying savings: {e}")
        return False


async def calculate_route_savings(
    original_distance: float,
    optimized_distance: float,
    fuel_efficiency_mpg: float = DEFAULT_RV_FUEL_EFFICIENCY_MPG,
    fuel_price_per_gallon: float = DEFAULT_FUEL_PRICE_PER_GALLON
) -> float:
    """
    Calculate savings from route optimization.

    Args:
        original_distance: Original route distance in miles
        optimized_distance: Optimized route distance in miles
        fuel_efficiency_mpg: Vehicle fuel efficiency
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
