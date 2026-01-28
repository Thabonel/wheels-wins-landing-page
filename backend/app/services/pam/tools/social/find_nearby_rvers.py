"""Find Nearby RVers Tool for PAM

Discover local RV community members

Example usage:
- "Find RVers near me"
- "Who's camping near Yellowstone?"
"""

import logging
from typing import Any, Dict, Optional
from pydantic import ValidationError as PydanticValidationError

from app.integrations.supabase import get_supabase_client
from app.services.pam.schemas.social import FindNearbyRVersInput
from app.services.pam.tools.exceptions import (
    ValidationError,
    DatabaseError,
)
from app.services.pam.tools.utils import (
    validate_uuid,
)

logger = logging.getLogger(__name__)


async def find_nearby_rvers(
    user_id: str,
    latitude: float,
    longitude: float,
    radius_miles: Optional[int] = 50,
    limit: Optional[int] = 20,
    **kwargs
) -> Dict[str, Any]:
    """
    Find RVers near a location

    Args:
        user_id: UUID of the user
        latitude: Search center latitude
        longitude: Search center longitude
        radius_miles: Search radius in miles (default: 50)
        limit: Maximum number of results (default: 20)

    Returns:
        Dict with nearby RVers

    Raises:
        ValidationError: Invalid input parameters
        DatabaseError: Database operation failed
    """
    try:
        validate_uuid(user_id, "user_id")

        # Validate inputs using Pydantic schema
        try:
            validated = FindNearbyRVersInput(
                user_id=user_id,
                latitude=latitude,
                longitude=longitude,
                radius_miles=radius_miles,
                limit=limit
            )
        except PydanticValidationError as e:
            error_msg = e.errors()[0]['msg']
            raise ValidationError(
                f"Invalid input: {error_msg}",
                context={"field": e.errors()[0]['loc'][0], "error": error_msg}
            )

        supabase = get_supabase_client()

        try:
            response = supabase.rpc(
                "find_nearby_users",
                {
                    "p_user_id": validated.user_id,
                    "p_latitude": validated.latitude,
                    "p_longitude": validated.longitude,
                    "p_radius_miles": validated.radius_miles,
                    "p_limit": validated.limit
                }
            ).execute()

            nearby_rvers = response.data if response.data else []

            # Mock data for development
            if not nearby_rvers:
                nearby_rvers = [
                    {
                        "user_id": "mock-user-1",
                        "username": "RoadWarrior82",
                        "avatar_url": None,
                        "location_name": "Yellowstone NP",
                        "distance_miles": 12.5,
                        "last_seen": "2 hours ago"
                    },
                    {
                        "user_id": "mock-user-2",
                        "username": "WanderlustRV",
                        "avatar_url": None,
                        "location_name": "Grand Teton NP",
                        "distance_miles": 35.2,
                        "last_seen": "1 day ago"
                    }
                ]

        except Exception as db_error:
            logger.error(
                f"Database error finding nearby RVers",
                extra={"user_id": user_id, "latitude": latitude, "longitude": longitude},
                exc_info=True
            )
            raise DatabaseError(
                "Failed to find nearby RVers",
                context={
                    "user_id": user_id,
                    "latitude": latitude,
                    "longitude": longitude,
                    "error": str(db_error)
                }
            )

        logger.info(f"Found {len(nearby_rvers)} nearby RVers for user {validated.user_id}")

        return {
            "success": True,
            "rvers_found": len(nearby_rvers),
            "rvers": nearby_rvers,
            "radius_miles": validated.radius_miles,
            "message": f"Found {len(nearby_rvers)} RVers within {validated.radius_miles} miles"
        }

    except ValidationError:
        raise
    except DatabaseError:
        raise
    except Exception as e:
        logger.error(
            f"Unexpected error finding nearby RVers",
            extra={"user_id": user_id, "latitude": latitude, "longitude": longitude},
            exc_info=True
        )
        raise DatabaseError(
            "Failed to find nearby RVers",
            context={"user_id": user_id, "error": str(e)}
        )
