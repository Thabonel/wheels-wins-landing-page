"""Like Post Tool for PAM

React to community posts

Example usage:
- "Like John's post about Yellowstone"
- "Unlike that post"
"""

import logging
from typing import Any, Dict
from datetime import datetime
from pydantic import ValidationError as PydanticValidationError

from app.integrations.supabase import get_supabase_client
from app.services.pam.schemas.social import LikePostInput
from app.services.pam.tools.exceptions import (
    ValidationError,
    DatabaseError,
)
from app.services.pam.tools.utils import (
    validate_uuid,
    safe_db_insert,
)

logger = logging.getLogger(__name__)


async def like_post(
    user_id: str,
    post_id: str,
    unlike: bool = False,
    **kwargs
) -> Dict[str, Any]:
    """
    Like or unlike a post

    Args:
        user_id: UUID of the user
        post_id: UUID of the post
        unlike: Set to True to unlike (default: False)

    Returns:
        Dict with like status

    Raises:
        ValidationError: Invalid input parameters
        DatabaseError: Database operation failed
    """
    try:
        validate_uuid(user_id, "user_id")
        validate_uuid(post_id, "post_id")

        # Validate inputs using Pydantic schema
        try:
            validated = LikePostInput(
                user_id=user_id,
                post_id=post_id
            )
        except PydanticValidationError as e:
            error_msg = e.errors()[0]['msg']
            raise ValidationError(
                f"Invalid input: {error_msg}",
                context={"field": e.errors()[0]['loc'][0], "error": error_msg}
            )

        supabase = get_supabase_client()

        if unlike:
            try:
                response = supabase.table("post_likes").delete().match({
                    "user_id": validated.user_id,
                    "post_id": validated.post_id
                }).execute()

                supabase.rpc("decrement_post_likes", {"post_id": validated.post_id}).execute()

            except Exception as db_error:
                logger.error(
                    f"Database error unliking post",
                    extra={"user_id": user_id, "post_id": post_id},
                    exc_info=True
                )
                raise DatabaseError(
                    "Failed to unlike post",
                    context={
                        "user_id": user_id,
                        "post_id": post_id,
                        "error": str(db_error)
                    }
                )

            logger.info(f"User {validated.user_id} unliked post {validated.post_id}")

            return {
                "success": True,
                "liked": False,
                "message": "Post unliked"
            }
        else:
            like_data = {
                "user_id": validated.user_id,
                "post_id": validated.post_id,
                "created_at": datetime.now().isoformat()
            }

            await safe_db_insert("post_likes", like_data, user_id)

            try:
                supabase.rpc("increment_post_likes", {"post_id": validated.post_id}).execute()
            except Exception as rpc_error:
                logger.warning(
                    f"Failed to increment post likes count (RPC)",
                    extra={"post_id": post_id, "error": str(rpc_error)}
                )

            logger.info(f"User {validated.user_id} liked post {validated.post_id}")

            return {
                "success": True,
                "liked": True,
                "message": "Post liked"
            }

    except ValidationError:
        raise
    except DatabaseError:
        raise
    except Exception as e:
        logger.error(
            f"Unexpected error liking post",
            extra={"user_id": user_id, "post_id": post_id},
            exc_info=True
        )
        raise DatabaseError(
            "Failed to like/unlike post",
            context={"user_id": user_id, "post_id": post_id, "error": str(e)}
        )
