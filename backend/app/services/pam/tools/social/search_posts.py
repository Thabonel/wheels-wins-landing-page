"""Search Posts Tool for PAM

Find relevant content in the community

Example usage:
- "Search for posts about Yellowstone"
- "Find posts with #rvlife tag"
"""

import logging
from typing import Any, Dict, Optional, List
from pydantic import ValidationError as PydanticValidationError

from app.integrations.supabase import get_supabase_client
from app.services.pam.schemas.social import SearchPostsInput
from app.services.pam.tools.exceptions import (
    ValidationError,
    DatabaseError,
)
from app.services.pam.tools.utils import (
    validate_uuid,
    validate_required,
)

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

    Raises:
        ValidationError: Invalid input parameters
        DatabaseError: Database operation failed
    """
    try:
        validate_uuid(user_id, "user_id")
        validate_required(query, "query")

        # Validate inputs using Pydantic schema
        try:
            validated = SearchPostsInput(
                user_id=user_id,
                query=query,
                tags=tags,
                location=location,
                limit=limit
            )
        except PydanticValidationError as e:
            error_msg = e.errors()[0]['msg']
            raise ValidationError(
                f"Invalid input: {error_msg}",
                context={"field": e.errors()[0]['loc'][0], "error": error_msg}
            )

        supabase = get_supabase_client()

        try:
            db_query = supabase.table("posts").select(
                "*, profiles(username, avatar_url)"
            )

            if validated.tags:
                db_query = db_query.contains("tags", validated.tags)

            if validated.location:
                db_query = db_query.ilike("location", f"%{validated.location}%")

            db_query = db_query.or_(
                f"content.ilike.%{validated.query}%,title.ilike.%{validated.query}%"
            )

            db_query = db_query.order("created_at", desc=True).limit(validated.limit)

            response = db_query.execute()
            posts = response.data if response.data else []

        except Exception as db_error:
            logger.error(
                f"Database error searching posts",
                extra={"user_id": user_id, "query": query},
                exc_info=True
            )
            raise DatabaseError(
                "Failed to search posts",
                context={
                    "user_id": user_id,
                    "query": query,
                    "error": str(db_error)
                }
            )

        logger.info(f"Found {len(posts)} posts for query '{validated.query}' by user {validated.user_id}")

        return {
            "success": True,
            "query": validated.query,
            "posts_found": len(posts),
            "posts": posts,
            "message": f"Found {len(posts)} posts matching '{validated.query}'"
        }

    except ValidationError:
        raise
    except DatabaseError:
        raise
    except Exception as e:
        logger.error(
            f"Unexpected error searching posts",
            extra={"user_id": user_id, "query": query},
            exc_info=True
        )
        raise DatabaseError(
            "Failed to search posts",
            context={"user_id": user_id, "query": query, "error": str(e)}
        )
