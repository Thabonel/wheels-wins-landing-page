"""Comment on Post Tool for PAM

Engage with community posts

Example usage:
- "Comment on John's post about Yellowstone"
- "Reply to the post about RV maintenance"
"""

import logging
from typing import Any, Dict
from datetime import datetime
from pydantic import ValidationError as PydanticValidationError

from app.integrations.supabase import get_supabase_client
from app.services.pam.schemas.social import CommentOnPostInput
from app.services.pam.tools.exceptions import (
    ValidationError,
    DatabaseError,
)
from app.services.pam.tools.utils import (
    validate_uuid,
    validate_required,
    safe_db_insert,
)

logger = logging.getLogger(__name__)


async def comment_on_post(
    user_id: str,
    post_id: str,
    comment: str,
    **kwargs
) -> Dict[str, Any]:
    """
    Add a comment to a post

    Args:
        user_id: UUID of the user
        post_id: UUID of the post
        comment: Comment content

    Returns:
        Dict with comment details

    Raises:
        ValidationError: Invalid input parameters
        DatabaseError: Database operation failed
    """
    try:
        validate_uuid(user_id, "user_id")
        validate_uuid(post_id, "post_id")
        validate_required(comment, "comment")

        try:
            validated = CommentOnPostInput(
                user_id=user_id,
                post_id=post_id,
                comment=comment
            )
        except PydanticValidationError as e:
            error_msg = e.errors()[0]['msg']
            raise ValidationError(
                f"Invalid input: {error_msg}",
                context={"field": e.errors()[0]['loc'][0], "error": error_msg}
            )

        comment_data = {
            "user_id": validated.user_id,
            "post_id": validated.post_id,
            "comment": validated.comment,
            "created_at": datetime.now().isoformat()
        }

        comment_obj = await safe_db_insert("comments", comment_data, user_id)

        supabase = get_supabase_client()
        supabase.rpc("increment_post_comments", {"post_id": validated.post_id}).execute()

        logger.info(f"Added comment to post {validated.post_id} by user {validated.user_id}")

        return {
            "success": True,
            "comment": comment_obj,
            "message": "Comment added successfully"
        }

    except ValidationError:
        raise
    except DatabaseError:
        raise
    except Exception as e:
        logger.error(
            f"Unexpected error adding comment",
            extra={"user_id": user_id, "post_id": post_id},
            exc_info=True
        )
        raise DatabaseError(
            "Failed to add comment",
            context={"user_id": user_id, "post_id": post_id, "error": str(e)}
        )
