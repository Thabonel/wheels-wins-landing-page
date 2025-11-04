"""Search Posts Tool for PAM

Find relevant content in the community

Example usage:
- "Search for posts about Yellowstone"
- "Find posts with #rvlife tag"

Amendment #4: Input validation with Pydantic models
"""

import logging
from typing import Any, Dict, Optional, List
from pydantic import ValidationError

from app.integrations.supabase import get_supabase_client
from app.services.pam.schemas.social import SearchPostsInput

logger = logging.getLogger(__name__)


async def search_posts(
    user_id: str,
    query: str,
    tags: Optional[List[str]] = None,
    location: Optional[str] = None,
    limit: Optional[int] = 20,
    **kwargs
) -> Dict[str, Any]:
    """
    Search for posts by content, tags, or location

    Args:
        user_id: UUID of the user
        query: Search query string
        tags: Optional list of tags to filter by
        location: Optional location to filter by
        limit: Maximum number of results (default: 20)

    Returns:
        Dict with search results
    """
    try:
        # Validate inputs using Pydantic schema
        try:
            validated = SearchPostsInput(
                user_id=user_id,
                query=query,
                tags=tags,
                location=location,
                limit=limit
            )
        except ValidationError as e:
            # Extract first error message for user-friendly response
            error_msg = e.errors()[0]['msg']
            return {
                "success": False,
                "error": f"Invalid input: {error_msg}"
            }

        supabase = get_supabase_client()

        # Build query (using text search)
        db_query = supabase.table("posts").select(
            "*, profiles(username, avatar_url)"
        )

        # Filter by tags if provided
        if validated.tags:
            db_query = db_query.contains("tags", validated.tags)

        # Filter by location if provided
        if validated.location:
            db_query = db_query.ilike("location", f"%{validated.location}%")

        # Search in content and title
        db_query = db_query.or_(
            f"content.ilike.%{validated.query}%,title.ilike.%{validated.query}%"
        )

        # Order by relevance (most recent first)
        db_query = db_query.order("created_at", desc=True).limit(validated.limit)

        response = db_query.execute()

        posts = response.data if response.data else []

        logger.info(f"Found {len(posts)} posts for query '{validated.query}' by user {validated.user_id}")

        return {
            "success": True,
            "query": validated.query,
            "posts_found": len(posts),
            "posts": posts,
            "message": f"Found {len(posts)} posts matching '{validated.query}'"
        }

    except Exception as e:
        logger.error(f"Error searching posts: {e}", exc_info=True)
        return {
            "success": False,
            "error": str(e)
        }
