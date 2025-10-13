"""Search Posts Tool for PAM

Find relevant content in the community

Example usage:
- "Search for posts about Yellowstone"
- "Find posts with #rvlife tag"
"""

import logging
from typing import Any, Dict, Optional, List

from app.integrations.supabase import get_supabase_client

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
        if not query or len(query.strip()) == 0:
            return {
                "success": False,
                "error": "Search query is required"
            }

        supabase = get_supabase_client()

        # Build query (using text search)
        db_query = supabase.table("posts").select(
            "*, profiles(username, avatar_url)"
        )

        # Filter by tags if provided
        if tags:
            db_query = db_query.contains("tags", tags)

        # Filter by location if provided
        if location:
            db_query = db_query.ilike("location", f"%{location}%")

        # Search in content and title
        db_query = db_query.or_(
            f"content.ilike.%{query}%,title.ilike.%{query}%"
        )

        # Order by relevance (most recent first)
        db_query = db_query.order("created_at", desc=True).limit(limit)

        response = db_query.execute()

        posts = response.data if response.data else []

        logger.info(f"Found {len(posts)} posts for query '{query}' by user {user_id}")

        return {
            "success": True,
            "query": query,
            "posts_found": len(posts),
            "posts": posts,
            "message": f"Found {len(posts)} posts matching '{query}'"
        }

    except Exception as e:
        logger.error(f"Error searching posts: {e}", exc_info=True)
        return {
            "success": False,
            "error": str(e)
        }
