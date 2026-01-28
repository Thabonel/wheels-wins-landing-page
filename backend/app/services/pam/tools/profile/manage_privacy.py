"""Manage Privacy Tool for PAM

Control data sharing and privacy settings

Example usage:
- "Make my profile private"
- "Hide my location from other users"

Amendment #4: Input validation with Pydantic models
"""

import logging
from typing import Any, Dict, Optional
from datetime import datetime
from pydantic import ValidationError as PydanticValidationError

from app.integrations.supabase import get_supabase_client
from app.services.pam.schemas.profile import ManagePrivacyInput
from app.services.pam.tools.exceptions import (
    ValidationError,
    DatabaseError,
    ResourceNotFoundError,
)
from app.services.pam.tools.utils import (
    validate_uuid,
    safe_db_insert,
    safe_db_update,
)

logger = logging.getLogger(__name__)


async def manage_privacy(
    user_id: str,
    profile_visibility: Optional[str] = None,
    location_sharing: Optional[bool] = None,
    show_activity: Optional[bool] = None,
    allow_messages: Optional[str] = None,
    data_collection: Optional[bool] = None,
    **kwargs
) -> Dict[str, Any]:
    """
    Manage privacy settings

    Args:
        user_id: UUID of the user
        profile_visibility: Profile visibility (public, friends, private)
        location_sharing: Whether to share location
        show_activity: Whether to show activity status
        allow_messages: Who can message (everyone, friends, none)
        data_collection: Whether to allow data collection for analytics

    Returns:
        Dict with updated privacy settings

    Raises:
        ValidationError: Invalid input parameters
        DatabaseError: Database operation failed
    """
    try:
        validate_uuid(user_id, "user_id")

        try:
            validated = ManagePrivacyInput(
                user_id=user_id,
                profile_visibility=profile_visibility,
                location_sharing=location_sharing,
                show_activity=show_activity,
                allow_messages=allow_messages,
                data_collection=data_collection
            )
        except PydanticValidationError as e:
            error_msg = e.errors()[0]['msg']
            raise ValidationError(
                f"Invalid input: {error_msg}",
                context={"validation_errors": e.errors()}
            )

        update_data = {"updated_at": datetime.now().isoformat()}

        if validated.profile_visibility is not None:
            update_data["profile_visibility"] = validated.profile_visibility
        if validated.location_sharing is not None:
            update_data["location_sharing"] = validated.location_sharing
        if validated.show_activity is not None:
            update_data["show_activity"] = validated.show_activity
        if validated.allow_messages is not None:
            update_data["allow_messages"] = validated.allow_messages
        if validated.data_collection is not None:
            update_data["data_collection"] = validated.data_collection

        supabase = get_supabase_client()
        response = supabase.table("privacy_settings").upsert({
            "user_id": validated.user_id,
            **update_data
        }).execute()

        if not response.data:
            raise DatabaseError(
                "Failed to update privacy settings",
                context={"user_id": validated.user_id}
            )

        privacy_settings = response.data[0]
        logger.info(f"Updated privacy settings for user {validated.user_id}")

        return {
            "success": True,
            "privacy_settings": privacy_settings,
            "message": "Privacy settings updated successfully"
        }

    except ValidationError:
        raise
    except DatabaseError:
        raise
    except Exception as e:
        logger.error(
            f"Unexpected error managing privacy",
            extra={"user_id": user_id},
            exc_info=True
        )
        raise DatabaseError(
            "Failed to manage privacy settings",
            context={"user_id": user_id, "error": str(e)}
        )
