"""Social Post Approval System - Draft posts with mandatory user approval

All social media posts require explicit user preview and approval before publishing.
This prevents unwanted AI-generated content from being posted without user consent.

Usage in PAM:
    # Step 1: Create draft for user preview
    draft_result = await create_post_draft(
        user_id=user_id,
        content="Loving this campsite in Yellowstone!",
        title="Beautiful Morning",
        location="Yellowstone National Park"
    )

    # Step 2: Show preview to user and get approval
    # Frontend shows draft content, user clicks "Post" or "Cancel"

    # Step 3: Publish only after user approval
    await approve_and_publish_post(draft_id, user_id)

Example usage:
- "Draft a post about my trip to Yellowstone" → Creates draft, shows preview
- "Share this photo with my followers" → Creates draft, requires approval
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


async def create_post_draft(
    user_id: str,
    content: str,
    title: Optional[str] = None,
    location: Optional[str] = None,
    image_url: Optional[str] = None,
    tags: Optional[list] = None,
    **kwargs
) -> Dict[str, Any]:
    """
    Create a draft social post that requires user approval before publishing.

    This function creates a DRAFT post that is NOT visible to other users until
    the user explicitly approves and publishes it via approve_and_publish_post().

    Args:
        user_id: UUID of the user
        content: Post content (required)
        title: Optional post title
        location: Optional location tag
        image_url: Optional image URL
        tags: Optional list of tags

    Returns:
        Dict with draft post details for user preview and approval

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

        # Create as DRAFT - not visible to other users until approved
        post_data = {
            "user_id": validated.user_id,
            "content": validated.content,
            "title": validated.title,
            "location": validated.location,
            "image_url": validated.image_url,
            "tags": validated.tags or [],
            "created_at": datetime.now().isoformat(),
            "status": "draft",  # CRITICAL: Draft status prevents public visibility
            "likes_count": 0,
            "comments_count": 0,
            "requires_approval": True,
            "draft_created_at": datetime.now().isoformat()
        }

        draft_post = await safe_db_insert("posts", post_data, user_id)

        logger.info(f"Created DRAFT post {draft_post['id']} for user {validated.user_id} - requires approval")

        # Return draft for user preview - NOT a published post
        return {
            "success": True,
            "draft_post": draft_post,
            "requires_approval": True,
            "preview": {
                "title": validated.title,
                "content": validated.content,
                "location": validated.location,
                "tags": validated.tags or []
            },
            "message": "⚠️ DRAFT CREATED - Post preview ready for your approval. " +
                      "This post is NOT yet visible to other users. " +
                      "Please review and approve to publish" +
                      (f" at {validated.location}" if validated.location else "")
        }

    except ValidationError:
        raise
    except DatabaseError:
        raise
    except Exception as e:
        logger.error(
            f"Unexpected error creating draft post",
            extra={"user_id": user_id},
            exc_info=True
        )
        raise DatabaseError(
            "Failed to create draft post",
            context={"user_id": user_id, "error": str(e)}
        )


async def approve_and_publish_post(
    draft_id: str,
    user_id: str,
    **kwargs
) -> Dict[str, Any]:
    """
    Approve and publish a draft post after user confirmation.

    This function should only be called after the user has reviewed the draft
    content and explicitly approved it for publication.

    Args:
        draft_id: UUID of the draft post to publish
        user_id: UUID of the user (must match draft owner)

    Returns:
        Dict with published post details

    Raises:
        ValidationError: Invalid input parameters
        DatabaseError: Database operation failed
    """
    try:
        validate_uuid(draft_id, "draft_id")
        validate_uuid(user_id, "user_id")

        supabase = get_supabase_client()

        # Verify draft exists and belongs to user
        draft_response = supabase.table("posts").select("*").eq("id", draft_id).eq("user_id", user_id).eq("status", "draft").single().execute()

        if not draft_response.data:
            raise ValidationError(
                "Draft post not found or not owned by user",
                context={"draft_id": draft_id, "user_id": user_id}
            )

        draft = draft_response.data

        # Update draft to published status
        published_data = {
            "status": "published",
            "requires_approval": False,
            "published_at": datetime.now().isoformat(),
            "draft_approved_at": datetime.now().isoformat()
        }

        published_response = supabase.table("posts").update(published_data).eq("id", draft_id).eq("user_id", user_id).execute()

        if not published_response.data:
            raise DatabaseError(
                "Failed to publish draft post",
                context={"draft_id": draft_id, "user_id": user_id}
            )

        published_post = published_response.data[0]

        logger.info(f"Published approved post {draft_id} for user {user_id}")

        return {
            "success": True,
            "published_post": published_post,
            "message": f"✅ Post published successfully! Now visible to the community" +
                      (f" at {draft['location']}" if draft.get('location') else "")
        }

    except ValidationError:
        raise
    except DatabaseError:
        raise
    except Exception as e:
        logger.error(
            f"Unexpected error publishing post",
            extra={"draft_id": draft_id, "user_id": user_id},
            exc_info=True
        )
        raise DatabaseError(
            "Failed to publish post",
            context={"draft_id": draft_id, "user_id": user_id, "error": str(e)}
        )
