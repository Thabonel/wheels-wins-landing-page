"""Find Long-Stay Parks Tool for PAM

Search for caravan parks and campgrounds offering monthly rates
or extended-stay discounts in a region.
"""

import logging
from typing import Any, Dict, Optional, List
from pydantic import ValidationError

from app.integrations.supabase import get_supabase_client
from app.services.pam.schemas.trip import FindLongstayParksInput
from app.services.pam.tools.exceptions import (
    ValidationError as CustomValidationError,
    DatabaseError,
)
from app.services.pam.tools.utils import validate_uuid

logger = logging.getLogger(__name__)

MAX_CAMPGROUND_RESULTS = 20
MAX_KNOWLEDGE_RESULTS = 5
LONGSTAY_DISCOUNT_FACTOR = 0.75  # 25% discount for monthly bookings


async def find_longstay_parks(
    user_id: str,
    region: str,
    min_stay_days: Optional[int] = 30,
    max_monthly_rate: Optional[float] = None,
    amenities: Optional[List[str]] = None,
    **kwargs
) -> Dict[str, Any]:
    """
    Find caravan parks offering monthly rates or extended-stay discounts.

    Queries campgrounds table filtered by region and estimates monthly rates
    from nightly prices. Also checks knowledge base for long-stay recommendations.

    Args:
        user_id: UUID of the user
        region: Region to search (e.g. "Hervey Bay", "Murray River", "Echuca")
        min_stay_days: Minimum stay in days (default 30)
        max_monthly_rate: Maximum acceptable monthly rate
        amenities: Required amenities list

    Returns:
        Dict with long-stay parks sorted by value
    """
    try:
        validate_uuid(user_id, "user_id")

        if not region or not region.strip():
            raise CustomValidationError(
                "Region is required",
                context={"field": "region"}
            )

        try:
            validated = FindLongstayParksInput(
                user_id=user_id,
                region=region,
                min_stay_days=min_stay_days,
                max_monthly_rate=max_monthly_rate,
                amenities=amenities,
            )
        except ValidationError as e:
            error_msg = e.errors()[0]['msg']
            raise CustomValidationError(
                f"Invalid input: {error_msg}",
                context={"validation_errors": e.errors()}
            )

        supabase = get_supabase_client()

        # Search campgrounds table
        query = supabase.table("campgrounds").select(
            "name, state, price_per_night, amenities, description, location"
        )

        response = query.limit(MAX_CAMPGROUND_RESULTS).execute()
        campgrounds = response.data if response.data else []

        # Filter by region name match (case-insensitive check in name, state, description)
        region_lower = validated.region.lower()
        region_matched = [
            cg for cg in campgrounds
            if region_lower in (cg.get("name", "") or "").lower()
            or region_lower in (cg.get("state", "") or "").lower()
            or region_lower in (cg.get("description", "") or "").lower()
            or region_lower in (cg.get("location", "") or "").lower()
        ]

        # If no region matches, return all campgrounds as fallback
        parks_to_process = region_matched if region_matched else campgrounds

        # Calculate estimated monthly rates and build results
        longstay_parks = []
        for cg in parks_to_process:
            nightly = float(cg.get("price_per_night", 0) or 0)
            if nightly <= 0:
                continue

            estimated_monthly = round(nightly * 28 * LONGSTAY_DISCOUNT_FACTOR, 2)

            # Filter by max monthly rate if specified
            if validated.max_monthly_rate and estimated_monthly > validated.max_monthly_rate:
                continue

            park_amenities = cg.get("amenities") or []

            # Filter by required amenities if specified
            if validated.amenities:
                if not all(a.lower() in [pa.lower() for pa in park_amenities] for a in validated.amenities):
                    continue

            longstay_parks.append({
                "name": cg.get("name", "Unknown"),
                "state": cg.get("state", ""),
                "nightly_rate": nightly,
                "estimated_monthly_rate": estimated_monthly,
                "min_stay_days": validated.min_stay_days,
                "amenities": park_amenities,
                "description": cg.get("description", ""),
            })

        # Sort by estimated monthly rate (best value first)
        longstay_parks.sort(key=lambda p: p["estimated_monthly_rate"])

        # Search knowledge base for long-stay park recommendations
        knowledge_response = supabase.table("pam_admin_knowledge").select(
            "title, content"
        ).eq(
            "is_active", True
        ).contains(
            "tags", ["long-stay"]
        ).limit(MAX_KNOWLEDGE_RESULTS).execute()

        knowledge_tips = []
        if knowledge_response.data:
            for entry in knowledge_response.data:
                knowledge_tips.append({
                    "title": entry.get("title", ""),
                    "content_preview": entry.get("content", "")[:400],
                })

        logger.info(
            f"Found {len(longstay_parks)} long-stay parks in {validated.region} "
            f"for user {validated.user_id}"
        )

        return {
            "success": True,
            "region": validated.region,
            "min_stay_days": validated.min_stay_days,
            "parks_found": len(longstay_parks),
            "parks": longstay_parks[:10],
            "knowledge_tips": knowledge_tips,
            "pricing_note": (
                "Monthly rates are estimated at 75% of nightly rate x 28 days. "
                "Call parks directly for exact monthly rates - they are often not advertised online."
            ),
            "message": (
                f"Found {len(longstay_parks)} parks with long-stay potential "
                f"in the {validated.region} region"
                + (f" under ${validated.max_monthly_rate:.0f}/month" if validated.max_monthly_rate else "")
                + "."
            ),
        }

    except CustomValidationError:
        raise
    except DatabaseError:
        raise
    except Exception as e:
        logger.error(
            "Unexpected error finding long-stay parks",
            extra={"user_id": user_id, "region": region},
            exc_info=True,
        )
        raise DatabaseError(
            "Failed to find long-stay parks",
            context={"user_id": user_id, "region": region, "error": str(e)},
        )
