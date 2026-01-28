"""Save Favorite Spot Tool for PAM

Bookmark locations for future reference

Example usage:
- "Save this campground as a favorite"
- "Bookmark this restaurant for later"

Amendment #4: Input validation with Pydantic models
"""

import logging
from typing import Any, Dict, Optional
from datetime import datetime
from pydantic import ValidationError

from app.integrations.supabase import get_supabase_client
from app.services.pam.schemas.trip import SaveFavoriteSpotInput
from app.services.pam.tools.exceptions import (
    ValidationError as CustomValidationError,
    DatabaseError,
)
from app.services.pam.tools.utils import (
    validate_uuid,
    validate_positive_number,
    safe_db_insert,
)

logger = logging.getLogger(__name__)


async def save_favorite_spot(
    user_id: str,
    location_name: str,
    location_address: str,
    category: Optional[str] = "general",
    notes: Optional[str] = None,
    rating: Optional[int] = None,
    **kwargs
) -> Dict[str, Any]:
    """
    Save a location as a favorite

    Args:
        user_id: UUID of the user
        location_name: Name of the location
        location_address: Address or coordinates
        category: Category (campground, restaurant, attraction, etc.)
        notes: Optional personal notes
        rating: Optional rating (1-5)

    Returns:
        Dict with saved favorite details

    Raises:
        ValidationError: Invalid input parameters
        DatabaseError: Database operation failed
    """
    try:
        validate_uuid(user_id, "user_id")

        if not location_name or not location_name.strip():
            raise CustomValidationError(
                "Location name is required",
                context={"field": "location_name"}
            )

        if not location_address or not location_address.strip():
            raise CustomValidationError(
                "Location address is required",
                context={"field": "location_address"}
            )

        if rating is not None:
            validate_positive_number(rating, "rating")
            if rating < 1 or rating > 5:
                raise CustomValidationError(
                    "Rating must be between 1 and 5",
                    context={"rating": rating}
                )

        try:
            validated = SaveFavoriteSpotInput(
                user_id=user_id,
                name=location_name,
                location=location_address,
                category=category,
                notes=notes,
                rating=rating
            )
        except ValidationError as e:
            error_msg = e.errors()[0]['msg']
            raise CustomValidationError(
                f"Invalid input: {error_msg}",
                context={"validation_errors": e.errors()}
            )

        favorite_data = {
            "user_id": validated.user_id,
            "location_name": validated.name,
            "location_address": validated.location,
            "category": validated.category.value,
            "notes": validated.notes,
            "rating": validated.rating,
            "created_at": datetime.now().isoformat()
        }

        favorite = await safe_db_insert("favorite_locations", favorite_data, user_id)

        logger.info(f"Saved favorite location: {validated.name} for user {validated.user_id}")

        return {
            "success": True,
            "favorite": favorite,
            "message": f"Saved '{validated.name}' to your favorites" +
                      (f" ({validated.category})" if validated.category != "general" else "")
        }

    except CustomValidationError:
        raise
    except DatabaseError:
        raise
    except Exception as e:
        logger.error(
            f"Unexpected error saving favorite spot",
            extra={"user_id": user_id, "location_name": location_name},
            exc_info=True
        )
        raise DatabaseError(
            "Failed to save favorite spot",
            context={"user_id": user_id, "location_name": location_name, "error": str(e)}
        )
