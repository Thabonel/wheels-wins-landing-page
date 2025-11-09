"""Get Feed Tool for PAM

Load social feed with posts from friends and community

Example usage:
- "Show me my feed"
- "What's new in the community?"

Amendment #4: Input validation with Pydantic models
"""

import logging
from typing import Any, Dict, Optional
from pydantic import ValidationError

from app.integrations.supabase import get_supabase_client
from app.services.pam.schemas.social import GetFeedInput

logger = logging.getLogger(__name__)


async def get_feed(
    user_id: str,
    filter_type: Optional[str] = "all",
    limit: Optional[int] = 20,
    offset: Optional[int] = 0,
    **kwargs
) -> Dict[str, Any]:
    """
    Get user's social feed

    Args:
        user_id: UUID of the user
        filter_type: Type of feed (all, friends, following)
        limit: Maximum number of posts (default: 20)
        offset: Pagination offset (default: 0)

    Returns:
        Dict with feed posts
    """
    try:
        # Validate inputs using Pydantic schema
        try:
            validated = GetFeedInput(
                user_id=user_id,
                filter_type=filter_type,
                limit=limit,
                offset=offset
            )
        except ValidationError as e:
            # Extract first error message for user-friendly response
            error_msg = e.errors()[0]['msg']
            return {
                "success": False,
                "error": f"Invalid input: {error_msg}"
            }

        supabase = get_supabase_client()

        # Build query based on filter type
        if validated.filter_type == "friends":
            # Get posts from friends only
            response = supabase.rpc(
                "get_friends_feed",
                {"p_user_id": validated.user_id, "p_limit": validated.limit, "p_offset": validated.offset}
            ).execute()
        elif validated.filter_type == "following":
            # Get posts from users the user is following
            response = supabase.rpc(
                "get_following_feed",
                {"p_user_id": validated.user_id, "p_limit": validated.limit, "p_offset": validated.offset}
            ).execute()
        else:
            # Get all public posts
            response = supabase.table("posts").select(
                "*, profiles(username, avatar_url)"
            ).order("created_at", desc=True).range(validated.offset, validated.offset + validated.limit - 1).execute()

        posts = response.data if response.data else []

        logger.info(f"Retrieved {len(posts)} posts for user {validated.user_id} feed")

        return {
            "success": True,
            "filter_type": validated.filter_type,
            "posts_count": len(posts),
            "posts": posts,
            "has_more": len(posts) == validated.limit,
            "message": f"Loaded {len(posts)} posts"
        }

    except Exception as e:
        logger.error(f"Error getting feed: {e}", exc_info=True)
        return {
            "success": False,
            "error": str(e)
        }
