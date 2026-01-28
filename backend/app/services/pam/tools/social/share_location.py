"""Share Location Tool for PAM

Share current location or favorite spots with the community

Example usage:
- "Share my current location"
- "Share this campground with friends"
"""

import logging
from typing import Any, Dict, Optional
from datetime import datetime
from pydantic import ValidationError as PydanticValidationError

from app.integrations.supabase import get_supabase_client
from app.services.pam.schemas.social import ShareLocationInput
from app.services.pam.tools.exceptions import (
    ValidationError,
    DatabaseError,
)
from app.services.pam.tools.utils import (
    validate_uuid,
    validate_required,
    safe_db_insert,
)
from app.services.pam.tools.social.constants import (
    DEFAULT_LOCATION_SHARE_DURATION_HOURS,
    LATITUDE_MIN,
    LATITUDE_MAX,
    LONGITUDE_MIN,
    LONGITUDE_MAX,
)

logger = logging.getLogger(__name__)


async def share_location(
    user_id: str,
    location_name: str,
    latitude: float,
    longitude: float,
    description: Optional[str] = None,
    is_public: Optional[bool] = True,
    **kwargs
) -> Dict[str, Any]:
    """
    Share location with community

    Args:
        user_id: UUID of the user
        location_name: Name of the location
        latitude: Location latitude
        longitude: Location longitude
        description: Optional description
        is_public: Whether location is publicly visible (default: True)

    Returns:
        Dict with shared location details

    Raises:
        ValidationError: Invalid input parameters
        DatabaseError: Database operation failed
    """
    try:
        validate_uuid(user_id, "user_id")
        validate_required(location_name, "location_name")

        if not LATITUDE_MIN <= latitude <= LATITUDE_MAX:
            raise ValidationError(
                f"Latitude must be between {LATITUDE_MIN} and {LATITUDE_MAX}",
                context={"latitude": latitude}
            )

        if not LONGITUDE_MIN <= longitude <= LONGITUDE_MAX:
            raise ValidationError(
                f"Longitude must be between {LONGITUDE_MIN} and {LONGITUDE_MAX}",
                context={"longitude": longitude}
            )

        try:
            share_with = "public" if is_public else "friends"
            share_duration_hours = kwargs.get("share_duration_hours", DEFAULT_LOCATION_SHARE_DURATION_HOURS)

            validated = ShareLocationInput(
                user_id=user_id,
                location_name=location_name,
                latitude=latitude,
                longitude=longitude,
                share_duration_hours=share_duration_hours,
                share_with=share_with
            )
        except PydanticValidationError as e:
            error_msg = e.errors()[0]['msg']
            raise ValidationError(
                f"Invalid input: {error_msg}",
                context={"field": e.errors()[0]['loc'][0], "error": error_msg}
            )

        location_data = {
            "user_id": validated.user_id,
            "location_name": validated.location_name,
            "latitude": validated.latitude,
            "longitude": validated.longitude,
            "description": description,
            "is_public": is_public,
            "share_with": validated.share_with,
            "share_duration_hours": validated.share_duration_hours,
            "created_at": datetime.now().isoformat()
        }

        shared_location = await safe_db_insert("shared_locations", location_data, user_id)

        logger.info(f"User {validated.user_id} shared location: {validated.location_name}")

        return {
            "success": True,
            "location": shared_location,
            "message": f"Shared location '{validated.location_name}'" +
                      (" publicly" if is_public else " privately")
        }

    except ValidationError:
        raise
    except DatabaseError:
        raise
    except Exception as e:
        logger.error(
            f"Unexpected error sharing location",
            extra={"user_id": user_id, "location_name": location_name},
            exc_info=True
        )
        raise DatabaseError(
            "Failed to share location",
            context={"user_id": user_id, "location_name": location_name, "error": str(e)}
        )
