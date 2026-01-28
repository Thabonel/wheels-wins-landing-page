"""Update Profile Tool for PAM

Modify user profile information

Example usage:
- "Update my bio to..."
- "Change my profile photo"

Amendment #4: Input validation with Pydantic models
"""

import logging
from typing import Any, Dict, Optional
from datetime import datetime
from pydantic import ValidationError as PydanticValidationError

from app.integrations.supabase import get_supabase_client
from app.services.pam.schemas.profile import UpdateProfileInput
from app.services.pam.tools.exceptions import (
    ValidationError,
    DatabaseError,
    ResourceNotFoundError,
)
from app.services.pam.tools.utils import (
    validate_uuid,
    safe_db_update,
)

logger = logging.getLogger(__name__)


async def update_profile(
    user_id: str,
    username: Optional[str] = None,
    bio: Optional[str] = None,
    avatar_url: Optional[str] = None,
    location: Optional[str] = None,
    rv_type: Optional[str] = None,
    rv_year: Optional[int] = None,
    **kwargs
) -> Dict[str, Any]:
    """
    Update user profile information

    Args:
        user_id: UUID of the user
        username: Optional new username
        bio: Optional bio text
        avatar_url: Optional avatar image URL
        location: Optional location
        rv_type: Optional RV type
        rv_year: Optional RV year

    Returns:
        Dict with updated profile

    Raises:
        ValidationError: Invalid input parameters
        DatabaseError: Database operation failed
    """
    try:
        validate_uuid(user_id, "user_id")

        try:
            validated = UpdateProfileInput(
                user_id=user_id,
                username=username,
                bio=bio,
                avatar_url=avatar_url,
                location=location,
                rv_type=rv_type,
                rv_year=rv_year
            )
        except PydanticValidationError as e:
            error_msg = e.errors()[0]['msg']
            raise ValidationError(
                f"Invalid input: {error_msg}",
                context={"validation_errors": e.errors()}
            )

        update_data = {
            "updated_at": datetime.now().isoformat()
        }

        if validated.username is not None:
            update_data["username"] = validated.username
        if validated.bio is not None:
            update_data["bio"] = validated.bio
        if validated.avatar_url is not None:
            update_data["avatar_url"] = validated.avatar_url
        if validated.location is not None:
            update_data["location"] = validated.location
        if validated.rv_type is not None:
            update_data["rv_type"] = validated.rv_type
        if validated.rv_year is not None:
            update_data["rv_year"] = validated.rv_year

        if not update_data or (len(update_data) == 1 and "updated_at" in update_data):
            raise ValidationError(
                "No profile fields provided to update",
                context={"user_id": user_id}
            )

        supabase = get_supabase_client()
        response = supabase.table("profiles").update(
            update_data
        ).eq("id", validated.user_id).execute()

        if not response.data:
            raise DatabaseError(
                "Failed to update profile",
                context={"user_id": validated.user_id}
            )

        profile = response.data[0]
        logger.info(f"Updated profile for user {validated.user_id}")

        return {
            "success": True,
            "profile": profile,
            "message": "Profile updated successfully"
        }

    except ValidationError:
        raise
    except DatabaseError:
        raise
    except Exception as e:
        logger.error(
            f"Unexpected error updating profile",
            extra={"user_id": user_id},
            exc_info=True
        )
        raise DatabaseError(
            "Failed to update profile",
            context={"user_id": user_id, "error": str(e)}
        )
