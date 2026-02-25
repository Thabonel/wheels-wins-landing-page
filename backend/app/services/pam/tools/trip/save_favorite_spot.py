"""Save Favorite Spot Tool for PAM

Bookmark locations for future reference.
"""

import asyncio
import json
import logging
from datetime import datetime
from typing import Any, Dict, Optional
from urllib.parse import urlencode
from urllib.request import Request, urlopen

from pydantic import ValidationError

from app.services.pam.schemas.trip import SaveFavoriteSpotInput
from app.services.pam.tools.exceptions import (
    DatabaseError,
    ValidationError as CustomValidationError,
)
from app.services.pam.tools.utils import (
    safe_db_insert,
    validate_positive_number,
    validate_uuid,
)

logger = logging.getLogger(__name__)

MIN_RATING = 1
MAX_RATING = 5
NOMINATIM_SEARCH_URL = "https://nominatim.openstreetmap.org/search"


def _lookup_address_sync(location_query: str) -> Optional[str]:
    """Resolve a location name to a formatted address using Nominatim."""
    params = {
        "q": location_query,
        "format": "json",
        "limit": 1,
        "addressdetails": 1,
    }
    request_url = f"{NOMINATIM_SEARCH_URL}?{urlencode(params)}"
    request = Request(
        request_url,
        headers={"User-Agent": "wheels-wins-pam/1.0 (favorite spot resolver)"},
    )

    with urlopen(request, timeout=8) as response:
        response_data = response.read().decode("utf-8")

    results = json.loads(response_data)
    if not isinstance(results, list) or not results:
        return None

    top_match = results[0]
    if not isinstance(top_match, dict):
        return None

    display_name = top_match.get("display_name")
    return display_name.strip() if isinstance(display_name, str) and display_name.strip() else None


async def _resolve_location_address(location_name: str, location_address: Optional[str]) -> str:
    """Prefer user-provided address; otherwise resolve via web lookup and fallback to name."""
    if location_address and location_address.strip():
        return location_address.strip()

    try:
        resolved_address = await asyncio.to_thread(_lookup_address_sync, location_name)
        if resolved_address:
            logger.info("Resolved favorite spot address", extra={"location_name": location_name})
            return resolved_address
    except Exception:
        logger.warning(
            "Address lookup failed for favorite spot; falling back to location name",
            extra={"location_name": location_name},
            exc_info=True,
        )

    return location_name.strip()


async def save_favorite_spot(
    user_id: str,
    location_name: str,
    location_address: Optional[str] = None,
    category: Optional[str] = "general",
    notes: Optional[str] = None,
    rating: Optional[int] = None,
    **kwargs,
) -> Dict[str, Any]:
    """Save a location as a favorite."""
    try:
        validate_uuid(user_id, "user_id")

        if not location_name or not location_name.strip():
            raise CustomValidationError(
                "Location name is required",
                context={"field": "location_name"},
            )

        normalized_location_address = await _resolve_location_address(
            location_name=location_name.strip(),
            location_address=location_address,
        )

        if rating is not None:
            validate_positive_number(rating, "rating")
            if rating < MIN_RATING or rating > MAX_RATING:
                raise CustomValidationError(
                    f"Rating must be between {MIN_RATING} and {MAX_RATING}",
                    context={"rating": rating},
                )

        try:
            validated = SaveFavoriteSpotInput(
                user_id=user_id,
                name=location_name,
                location=normalized_location_address,
                category=category,
                notes=notes,
                rating=rating,
            )
        except ValidationError as e:
            error_msg = e.errors()[0]["msg"]
            raise CustomValidationError(
                f"Invalid input: {error_msg}",
                context={"validation_errors": e.errors()},
            )

        favorite_data = {
            "user_id": validated.user_id,
            "location_name": validated.name,
            "location_address": validated.location,
            "category": validated.category,
            "notes": validated.notes,
            "rating": validated.rating,
            "created_at": datetime.now().isoformat(),
        }

        favorite = await safe_db_insert("favorite_locations", favorite_data, user_id)

        logger.info(f"Saved favorite location: {validated.name} for user {validated.user_id}")

        return {
            "success": True,
            "favorite": favorite,
            "message": f"Saved '{validated.name}' to your favorites"
            + (f" ({validated.category})" if validated.category != "general" else ""),
        }

    except CustomValidationError:
        raise
    except DatabaseError:
        raise
    except Exception as e:
        logger.error(
            "Unexpected error saving favorite spot",
            extra={"user_id": user_id, "location_name": location_name},
            exc_info=True,
        )
        raise DatabaseError(
            "Failed to save favorite spot",
            context={"user_id": user_id, "location_name": location_name, "error": str(e)},
        )
