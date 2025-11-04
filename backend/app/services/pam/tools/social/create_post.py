"""Create Post Tool for PAM

Share travel updates with the community

Example usage:
- "Post about my trip to Yellowstone"
- "Share this photo with my followers"

Amendment #4: Input validation with Pydantic models
"""

import logging
from typing import Any, Dict, Optional
from datetime import datetime
from pydantic import ValidationError

from app.integrations.supabase import get_supabase_client
from app.services.pam.schemas.social import CreatePostInput

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
    """
    try:
        # Validate inputs using Pydantic schema
        try:
            validated = CreatePostInput(
                user_id=user_id,
                content=content,
                title=title,
                location=location,
                image_url=image_url,
                tags=tags
            )
        except ValidationError as e:
            # Extract first error message for user-friendly response
            error_msg = e.errors()[0]['msg']
            return {
                "success": False,
                "error": f"Invalid input: {error_msg}"
            }

        supabase = get_supabase_client()

        # Build post data
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

        # Save to database
        response = supabase.table("posts").insert(post_data).execute()

        if response.data:
            post = response.data[0]
            logger.info(f"Created post {post['id']} for user {validated.user_id}")

            return {
                "success": True,
                "post": post,
                "message": "Post created successfully" +
                          (f" at {validated.location}" if validated.location else "")
            }
        else:
            logger.error(f"Failed to create post: {response}")
            return {
                "success": False,
                "error": "Failed to create post"
            }

    except Exception as e:
        logger.error(f"Error creating post: {e}", exc_info=True)
        return {
            "success": False,
            "error": str(e)
        }
