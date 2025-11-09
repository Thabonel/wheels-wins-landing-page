"""Comment on Post Tool for PAM

Engage with community posts

Example usage:
- "Comment on John's post about Yellowstone"
- "Reply to the post about RV maintenance"

Amendment #4: Input validation with Pydantic models
"""

import logging
from typing import Any, Dict
from datetime import datetime
from pydantic import ValidationError

from app.integrations.supabase import get_supabase_client
from app.services.pam.schemas.social import CommentOnPostInput

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
    """
    try:
        # Validate inputs using Pydantic schema
        try:
            validated = CommentOnPostInput(
                user_id=user_id,
                post_id=post_id,
                comment=comment
            )
        except ValidationError as e:
            # Extract first error message for user-friendly response
            error_msg = e.errors()[0]['msg']
            return {
                "success": False,
                "error": f"Invalid input: {error_msg}"
            }

        supabase = get_supabase_client()

        # Build comment data
        comment_data = {
            "user_id": validated.user_id,
            "post_id": validated.post_id,
            "comment": validated.comment,
            "created_at": datetime.now().isoformat()
        }

        # Save to database
        response = supabase.table("comments").insert(comment_data).execute()

        if response.data:
            comment_obj = response.data[0]

            # Increment post comments count
            supabase.rpc("increment_post_comments", {"post_id": validated.post_id}).execute()

            logger.info(f"Added comment to post {validated.post_id} by user {validated.user_id}")

            return {
                "success": True,
                "comment": comment_obj,
                "message": "Comment added successfully"
            }
        else:
            logger.error(f"Failed to add comment: {response}")
            return {
                "success": False,
                "error": "Failed to add comment"
            }

    except Exception as e:
        logger.error(f"Error adding comment: {e}", exc_info=True)
        return {
            "success": False,
            "error": str(e)
        }
