"""Create Post Tool for PAM

Share travel updates with the community

Example usage:
- "Post about my trip to Yellowstone"
- "Share this photo with my followers"
"""

import logging
from typing import Any, Dict, Optional
from datetime import datetime
from pydantic import ValidationError as PydanticValidationError

from app.integrations.supabase import get_supabase_client
from app.services.pam.schemas.social import CreatePostInput
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


async def create_post(
    user_id: str,
    content: str,
    title: Optional[str] = None,
    location: Optional[str] = None,
    image_url: Optional[str] = None,
    tags: Optional[list] = None,
    **kwargs
) -> Dict[str, Any]:
    """
    Create a social post

    Args:
        user_id: UUID of the user
        content: Post content (required)
        title: Optional post title
        location: Optional location tag
        image_url: Optional image URL
        tags: Optional list of tags

    Returns:
        Dict with created post details

    Raises:
        ValidationError: Invalid input parameters
        DatabaseError: Database operation failed
    """
    try:
        validate_uuid(user_id, "user_id")
        validate_required(content, "content")

        try:
            validated = CreatePostInput(
                user_id=user_id,
                content=content,
                title=title,
                location=location,
                image_url=image_url,
                tags=tags
            )
        except PydanticValidationError as e:
            error_msg = e.errors()[0]['msg']
            raise ValidationError(
                f"Invalid input: {error_msg}",
                context={"field": e.errors()[0]['loc'][0], "error": error_msg}
            )

        post_data = {
            "user_id": validated.user_id,
            "content": validated.content,
            "title": validated.title,
            "location": validated.location,
            "image_url": validated.image_url,
            "tags": validated.tags or [],
            "created_at": datetime.now().isoformat(),
            "likes_count": 0,
            "comments_count": 0
        }

        post = await safe_db_insert("posts", post_data, user_id)

        logger.info(f"Created post {post['id']} for user {validated.user_id}")

        return {
            "success": True,
            "post": post,
            "message": "Post created successfully" +
                      (f" at {validated.location}" if validated.location else "")
        }

    except ValidationError:
        raise
    except DatabaseError:
        raise
    except Exception as e:
        logger.error(
            f"Unexpected error creating post",
            extra={"user_id": user_id},
            exc_info=True
        )
        raise DatabaseError(
            "Failed to create post",
            context={"user_id": user_id, "error": str(e)}
        )
