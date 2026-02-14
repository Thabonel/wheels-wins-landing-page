"""Suggest Seasonal Route Tool for PAM

Recommend optimal seasonal migration routes for Australian Grey Nomads
based on origin, destination region, timing, and knowledge base data.
"""

import logging
from typing import Any, Dict, Optional, List
from decimal import Decimal
from pydantic import ValidationError

from app.integrations.supabase import get_supabase_client
from app.services.pam.schemas.trip import SuggestSeasonalRouteInput
from app.services.pam.tools.exceptions import (
    ValidationError as CustomValidationError,
    DatabaseError,
)
from app.services.pam.tools.utils import validate_uuid

logger = logging.getLogger(__name__)

MAX_KNOWLEDGE_RESULTS = 10
MAX_CAMPGROUND_RESULTS = 15


async def suggest_seasonal_route(
    user_id: str,
    origin: str,
    destination_region: str,
    travel_month: Optional[str] = None,
    duration_weeks: Optional[int] = None,
    budget: Optional[float] = None,
    **kwargs
) -> Dict[str, Any]:
    """
    Suggest an optimal seasonal migration route for Grey Nomads.

    Queries PAM knowledge base for corridor/seasonal data and campgrounds
    table for parks along the route.

    Args:
        user_id: UUID of the user
        origin: Starting location (e.g. "Brisbane", "Melbourne")
        destination_region: Target region (e.g. "top end", "southern victoria")
        travel_month: When they want to travel (e.g. "may", "october")
        duration_weeks: Total migration duration in weeks
        budget: Total budget for the migration

    Returns:
        Dict with corridor recommendation, timing, stops, and cost estimate
    """
    try:
        validate_uuid(user_id, "user_id")

        if not origin or not origin.strip():
            raise CustomValidationError(
                "Origin is required",
                context={"field": "origin"}
            )

        if not destination_region or not destination_region.strip():
            raise CustomValidationError(
                "Destination region is required",
                context={"field": "destination_region"}
            )

        try:
            validated = SuggestSeasonalRouteInput(
                user_id=user_id,
                origin=origin,
                destination_region=destination_region,
                travel_month=travel_month,
                duration_weeks=duration_weeks,
                budget=Decimal(str(budget)) if budget else None,
            )
        except ValidationError as e:
            error_msg = e.errors()[0]['msg']
            raise CustomValidationError(
                f"Invalid input: {error_msg}",
                context={"validation_errors": e.errors()}
            )

        supabase = get_supabase_client()

        # Search knowledge base for seasonal corridor information
        search_terms = [
            validated.origin.lower(),
            validated.destination_region.lower(),
        ]
        if validated.travel_month:
            search_terms.append(validated.travel_month.lower())

        knowledge_entries = []
        for term in search_terms:
            response = supabase.table("pam_admin_knowledge").select(
                "title, content, tags"
            ).eq(
                "is_active", True
            ).contains(
                "tags", ["seasonal"]
            ).ilike(
                "content", f"%{term}%"
            ).limit(MAX_KNOWLEDGE_RESULTS).execute()

            if response.data:
                for entry in response.data:
                    if entry not in knowledge_entries:
                        knowledge_entries.append(entry)

        # Search for campgrounds along potential corridor
        campground_response = supabase.table("campgrounds").select(
            "name, state, price_per_night, amenities, description"
        ).limit(MAX_CAMPGROUND_RESULTS).execute()

        campgrounds = campground_response.data if campground_response.data else []

        # Build suggested stops from campground data
        suggested_stops = []
        for cg in campgrounds:
            nightly = float(cg.get("price_per_night", 0) or 0)
            estimated_monthly = round(nightly * 28 * 0.75, 2) if nightly > 0 else None
            suggested_stops.append({
                "name": cg.get("name", "Unknown"),
                "state": cg.get("state", ""),
                "nightly_rate": nightly,
                "estimated_monthly_rate": estimated_monthly,
                "amenities": cg.get("amenities", []),
            })

        # Extract seasonal events from knowledge entries
        seasonal_events = []
        for entry in knowledge_entries:
            if "events" in (entry.get("tags") or []):
                seasonal_events.append(entry.get("title", ""))

        # Build corridor summary from knowledge
        corridor_info = ""
        weather_notes = ""
        for entry in knowledge_entries:
            tags = entry.get("tags") or []
            if "corridor" in tags:
                corridor_info = entry.get("title", "")
            if "weather" in tags or "weather-windows" in tags:
                weather_notes = entry.get("title", "")

        # Estimate cost if duration provided
        estimated_total_cost = None
        if validated.duration_weeks:
            weeks = validated.duration_weeks
            # Rough estimate: $400/week for parks + $200/week fuel + $150/week food
            estimated_total_cost = round(weeks * 750, 2)

        logger.info(
            f"Suggested seasonal route for user {validated.user_id}: "
            f"{validated.origin} -> {validated.destination_region}, "
            f"found {len(knowledge_entries)} knowledge entries, "
            f"{len(suggested_stops)} campgrounds"
        )

        return {
            "success": True,
            "origin": validated.origin,
            "destination_region": validated.destination_region,
            "travel_month": validated.travel_month,
            "duration_weeks": validated.duration_weeks,
            "corridor": corridor_info or f"{validated.origin} to {validated.destination_region}",
            "weather_notes": weather_notes,
            "knowledge_entries": len(knowledge_entries),
            "knowledge_summaries": [
                {"title": e.get("title", ""), "content_preview": e.get("content", "")[:300]}
                for e in knowledge_entries[:5]
            ],
            "suggested_stops": suggested_stops[:10],
            "seasonal_events": seasonal_events,
            "estimated_total_cost": estimated_total_cost,
            "budget": float(validated.budget) if validated.budget else None,
            "message": (
                f"Here's your seasonal migration plan from {validated.origin} "
                f"to {validated.destination_region}"
                + (f" for {validated.travel_month}" if validated.travel_month else "")
                + f". Found {len(knowledge_entries)} relevant knowledge entries "
                f"and {len(suggested_stops)} potential stops along the way."
            ),
        }

    except CustomValidationError:
        raise
    except DatabaseError:
        raise
    except Exception as e:
        logger.error(
            "Unexpected error suggesting seasonal route",
            extra={"user_id": user_id, "origin": origin, "destination_region": destination_region},
            exc_info=True,
        )
        raise DatabaseError(
            "Failed to suggest seasonal route",
            context={"user_id": user_id, "origin": origin, "error": str(e)},
        )
