"""Find RV Parks Tool for PAM

Search for campgrounds and RV parks near a route or location
"""

import logging
from typing import Any, Dict, Optional, List
from pydantic import ValidationError

from app.integrations.supabase import get_supabase_client
from app.services.pam.schemas.trip import FindRVParksInput
from app.services.pam.tools.exceptions import (
    ValidationError as CustomValidationError,
    DatabaseError,
)
from app.services.pam.tools.utils import (
    validate_uuid,
    validate_positive_number,
    safe_db_select,
)

logger = logging.getLogger(__name__)

DEFAULT_SEARCH_RADIUS_MILES = 50
MAX_CAMPGROUNDS_QUERY_LIMIT = 20
MAX_RESULTS_RETURNED = 10


async def find_rv_parks(
    user_id: str,
    location: str,
    radius_miles: Optional[int] = 50,
    amenities: Optional[List[str]] = None,
    max_price: Optional[float] = None,
    **kwargs
) -> Dict[str, Any]:
    """
    Find RV parks and campgrounds near a location

    Args:
        user_id: UUID of the user
        location: Location to search near (address or coordinates)
        radius_miles: Search radius in miles (default: 50)
        amenities: Optional list of required amenities
        max_price: Optional maximum price per night

    Returns:
        Dict with RV park listings

    Raises:
        ValidationError: Invalid input parameters
        DatabaseError: Database operation failed
    """
    try:
        validate_uuid(user_id, "user_id")

        if not location or not location.strip():
            raise CustomValidationError(
                "Location is required",
                context={"field": "location"}
            )

        if radius_miles is not None:
            validate_positive_number(radius_miles, "radius_miles")

        if max_price is not None:
            validate_positive_number(max_price, "max_price")

        try:
            validated = FindRVParksInput(
                user_id=user_id,
                location=location,
                radius_miles=radius_miles,
                amenities=amenities,
                max_price=max_price
            )
        except ValidationError as e:
            error_msg = e.errors()[0]['msg']
            raise CustomValidationError(
                f"Invalid input: {error_msg}",
                context={"validation_errors": e.errors()}
            )

        supabase = get_supabase_client()

        query = supabase.table("campgrounds").select("*")

        if validated.max_price:
            query = query.lte("price_per_night", validated.max_price)

        response = query.limit(MAX_CAMPGROUNDS_QUERY_LIMIT).execute()

        campgrounds = response.data if response.data else []

        if validated.amenities and campgrounds:
            campgrounds = [
                park for park in campgrounds
                if all(amenity in park.get("amenities", []) for amenity in validated.amenities)
            ]

        logger.info(f"Found {len(campgrounds)} RV parks near {validated.location} for user {validated.user_id}")

        return {
            "success": True,
            "location": validated.location,
            "radius_miles": validated.radius_miles,
            "parks_found": len(campgrounds),
            "parks": campgrounds[:MAX_RESULTS_RETURNED],
            "message": f"Found {len(campgrounds)} RV parks within {validated.radius_miles} miles of {validated.location}"
        }

    except CustomValidationError:
        raise
    except DatabaseError:
        raise
    except Exception as e:
        logger.error(
            f"Unexpected error finding RV parks",
            extra={"user_id": user_id, "location": location},
            exc_info=True
        )
        raise DatabaseError(
            "Failed to find RV parks",
            context={"user_id": user_id, "location": location, "error": str(e)}
        )
