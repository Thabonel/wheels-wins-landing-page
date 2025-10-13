"""Create Post Tool for PAM

Share travel updates with the community

Example usage:
- "Post about my trip to Yellowstone"
- "Share this photo with my followers"
"""

import logging
from typing import Any, Dict, Optional
from datetime import datetime

from app.integrations.supabase import get_supabase_client

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
        if not content or len(content.strip()) == 0:
            return {
                "success": False,
                "error": "Post content is required"
            }

        supabase = get_supabase_client()

        # Build post data
        post_data = {
            "user_id": user_id,
            "content": content.strip(),
            "title": title,
            "location": location,
            "image_url": image_url,
            "tags": tags or [],
            "created_at": datetime.now().isoformat(),
            "likes_count": 0,
            "comments_count": 0
        }

        # Save to database
        response = supabase.table("posts").insert(post_data).execute()

        if response.data:
            post = response.data[0]
            logger.info(f"Created post {post['id']} for user {user_id}")

            return {
                "success": True,
                "post": post,
                "message": "Post created successfully" +
                          (f" at {location}" if location else "")
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
