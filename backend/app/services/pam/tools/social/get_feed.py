"""Get Feed Tool for PAM

Load social feed with posts from friends and community

Example usage:
- "Show me my feed"
- "What's new in the community?"
"""

import logging
from typing import Any, Dict, Optional
from pydantic import ValidationError as PydanticValidationError

from app.integrations.supabase import get_supabase_client
from app.services.pam.schemas.social import GetFeedInput
from app.services.pam.tools.exceptions import (
    ValidationError,
    DatabaseError,
)
from app.services.pam.tools.utils import (
    validate_uuid,
)
from app.services.pam.tools.social.constants import DEFAULT_FEED_LIMIT

logger = logging.getLogger(__name__)


async def get_feed(
    user_id: str,
    filter_type: Optional[str] = "all",
    limit: Optional[int] = DEFAULT_FEED_LIMIT,
    offset: Optional[int] = 0,
    **kwargs
) -> Dict[str, Any]:
    """
    Get user's social feed

    Args:
        user_id: UUID of the user
        filter_type: Type of feed (all, friends, following)
        limit: Maximum number of posts
        offset: Pagination offset

    Returns:
        Dict with feed posts

    Raises:
        ValidationError: Invalid input parameters
        DatabaseError: Database operation failed
    """
    try:
        validate_uuid(user_id, "user_id")

        try:
            validated = GetFeedInput(
                user_id=user_id,
                filter_type=filter_type,
                limit=limit,
                offset=offset
            )
        except PydanticValidationError as e:
            error_msg = e.errors()[0]['msg']
            raise ValidationError(
                f"Invalid input: {error_msg}",
                context={"field": e.errors()[0]['loc'][0], "error": error_msg}
            )

        supabase = get_supabase_client()

        try:
            if validated.filter_type == "friends":
                response = supabase.rpc(
                    "get_friends_feed",
                    {
                        "p_user_id": validated.user_id,
                        "p_limit": validated.limit,
                        "p_offset": validated.offset
                    }
                ).execute()
            elif validated.filter_type == "following":
                response = supabase.rpc(
                    "get_following_feed",
                    {
                        "p_user_id": validated.user_id,
                        "p_limit": validated.limit,
                        "p_offset": validated.offset
                    }
                ).execute()
            else:
                response = supabase.table("posts").select(
                    "*, profiles(username, avatar_url)"
                ).order(
                    "created_at", desc=True
                ).range(
                    validated.offset, validated.offset + validated.limit - 1
                ).execute()

            posts = response.data if response.data else []

        except Exception as db_error:
            logger.error(
                f"Database error getting feed",
                extra={"user_id": user_id, "filter_type": filter_type},
                exc_info=True
            )
            raise DatabaseError(
                "Failed to retrieve feed",
                context={
                    "user_id": user_id,
                    "filter_type": filter_type,
                    "error": str(db_error)
                }
            )

        logger.info(f"Retrieved {len(posts)} posts for user {validated.user_id} feed")

        return {
            "success": True,
            "filter_type": validated.filter_type,
            "posts_count": len(posts),
            "posts": posts,
            "has_more": len(posts) == validated.limit,
            "message": f"Loaded {len(posts)} posts"
        }

    except ValidationError:
        raise
    except DatabaseError:
        raise
    except Exception as e:
        logger.error(
            f"Unexpected error getting feed",
            extra={"user_id": user_id, "filter_type": filter_type},
            exc_info=True
        )
        raise DatabaseError(
            "Failed to retrieve feed",
            context={"user_id": user_id, "error": str(e)}
        )
