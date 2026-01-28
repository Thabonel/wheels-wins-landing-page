"""Follow User Tool for PAM

Connect with other RVers in the community

Example usage:
- "Follow John"
- "Unfollow Sarah"
"""

import logging
from typing import Any, Dict
from datetime import datetime
from pydantic import ValidationError as PydanticValidationError

from app.integrations.supabase import get_supabase_client
from app.services.pam.schemas.social import FollowUserInput
from app.services.pam.tools.exceptions import (
    ValidationError,
    DatabaseError,
)
from app.services.pam.tools.utils import (
    validate_uuid,
    safe_db_insert,
    safe_db_delete,
)

logger = logging.getLogger(__name__)


async def follow_user(
    user_id: str,
    target_user_id: str,
    unfollow: bool = False,
    **kwargs
) -> Dict[str, Any]:
    """
    Follow or unfollow another user

    Args:
        user_id: UUID of the current user
        target_user_id: UUID of the user to follow/unfollow
        unfollow: Set to True to unfollow (default: False)

    Returns:
        Dict with follow status

    Raises:
        ValidationError: Invalid input parameters
        DatabaseError: Database operation failed
    """
    try:
        validate_uuid(user_id, "user_id")
        validate_uuid(target_user_id, "target_user_id")

        # Validate inputs using Pydantic schema
        try:
            validated = FollowUserInput(
                user_id=user_id,
                target_user_id=target_user_id
            )
        except PydanticValidationError as e:
            error_msg = e.errors()[0]['msg']
            raise ValidationError(
                f"Invalid input: {error_msg}",
                context={"field": e.errors()[0]['loc'][0], "error": error_msg}
            )

        # Business logic validation
        if validated.user_id == validated.target_user_id:
            raise ValidationError(
                "Cannot follow yourself",
                context={"user_id": user_id, "target_user_id": target_user_id}
            )

        supabase = get_supabase_client()

        if unfollow:
            try:
                response = supabase.table("user_follows").delete().match({
                    "follower_id": validated.user_id,
                    "following_id": validated.target_user_id
                }).execute()
            except Exception as db_error:
                logger.error(
                    f"Database error unfollowing user",
                    extra={"user_id": user_id, "target_user_id": target_user_id},
                    exc_info=True
                )
                raise DatabaseError(
                    "Failed to unfollow user",
                    context={
                        "user_id": user_id,
                        "target_user_id": target_user_id,
                        "error": str(db_error)
                    }
                )

            logger.info(f"User {validated.user_id} unfollowed user {validated.target_user_id}")

            return {
                "success": True,
                "following": False,
                "message": "User unfollowed"
            }
        else:
            follow_data = {
                "follower_id": validated.user_id,
                "following_id": validated.target_user_id,
                "created_at": datetime.now().isoformat()
            }

            await safe_db_insert("user_follows", follow_data, user_id)

            logger.info(f"User {validated.user_id} followed user {validated.target_user_id}")

            return {
                "success": True,
                "following": True,
                "message": "User followed successfully"
            }

    except ValidationError:
        raise
    except DatabaseError:
        raise
    except Exception as e:
        logger.error(
            f"Unexpected error following user",
            extra={"user_id": user_id, "target_user_id": target_user_id},
            exc_info=True
        )
        raise DatabaseError(
            "Failed to follow/unfollow user",
            context={"user_id": user_id, "target_user_id": target_user_id, "error": str(e)}
        )
