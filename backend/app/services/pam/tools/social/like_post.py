"""Like Post Tool for PAM

React to community posts

Example usage:
- "Like John's post about Yellowstone"
- "Unlike that post"

Amendment #4: Input validation with Pydantic models
"""

import logging
from typing import Any, Dict
from datetime import datetime
from pydantic import ValidationError

from app.integrations.supabase import get_supabase_client
from app.services.pam.schemas.social import LikePostInput

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
    """
    try:
        # Validate inputs using Pydantic schema
        try:
            validated = LikePostInput(
                user_id=user_id,
                post_id=post_id
            )
        except ValidationError as e:
            # Extract first error message for user-friendly response
            error_msg = e.errors()[0]['msg']
            return {
                "success": False,
                "error": f"Invalid input: {error_msg}"
            }

        supabase = get_supabase_client()

        if unlike:
            # Remove like
            response = supabase.table("post_likes").delete().match({
                "user_id": validated.user_id,
                "post_id": validated.post_id
            }).execute()

            # Decrement post likes count
            supabase.rpc("decrement_post_likes", {"post_id": validated.post_id}).execute()

            logger.info(f"User {validated.user_id} unliked post {validated.post_id}")

            return {
                "success": True,
                "liked": False,
                "message": "Post unliked"
            }
        else:
            # Add like
            like_data = {
                "user_id": validated.user_id,
                "post_id": validated.post_id,
                "created_at": datetime.now().isoformat()
            }

            response = supabase.table("post_likes").insert(like_data).execute()

            # Increment post likes count
            supabase.rpc("increment_post_likes", {"post_id": validated.post_id}).execute()

            logger.info(f"User {validated.user_id} liked post {validated.post_id}")

            return {
                "success": True,
                "liked": True,
                "message": "Post liked"
            }

    except Exception as e:
        logger.error(f"Error liking post: {e}", exc_info=True)
        return {
            "success": False,
            "error": str(e)
        }
