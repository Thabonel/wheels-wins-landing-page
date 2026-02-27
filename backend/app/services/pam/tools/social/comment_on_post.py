"""Comment Approval System - Draft comments with mandatory user approval

All comments require explicit user preview and approval before posting.
This prevents unwanted AI-generated comments from being posted without user consent.

Usage in PAM:
    # Step 1: Create draft comment for user preview
    draft_result = await create_comment_draft(
        user_id=user_id,
        post_id=post_id,
        comment="Great photos! Thanks for sharing your experience."
    )

    # Step 2: Show preview to user and get approval
    # Frontend shows draft comment, user clicks "Post Comment" or "Cancel"

    # Step 3: Publish only after user approval
    await approve_and_publish_comment(draft_id, user_id)

Example usage:
- "Comment on John's post about Yellowstone" → Creates draft, shows preview
- "Reply to the post about RV maintenance" → Creates draft, requires approval
"""

import logging
from typing import Any, Dict
from datetime import datetime
from pydantic import ValidationError as PydanticValidationError

from app.integrations.supabase import get_supabase_client
from app.services.pam.schemas.social import CommentOnPostInput
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


async def create_comment_draft(
    user_id: str,
    post_id: str,
    comment: str,
    **kwargs
) -> Dict[str, Any]:
    """
    Create a draft comment that requires user approval before posting.

    This function creates a DRAFT comment that is NOT visible to other users until
    the user explicitly approves and publishes it via approve_and_publish_comment().

    Args:
        user_id: UUID of the user
        post_id: UUID of the post
        comment: Comment content

    Returns:
        Dict with draft comment details for user preview and approval

    Raises:
        ValidationError: Invalid input parameters
        DatabaseError: Database operation failed
    """
    try:
        validate_uuid(user_id, "user_id")
        validate_uuid(post_id, "post_id")
        validate_required(comment, "comment")

        try:
            validated = CommentOnPostInput(
                user_id=user_id,
                post_id=post_id,
                comment=comment
            )
        except PydanticValidationError as e:
            error_msg = e.errors()[0]['msg']
            raise ValidationError(
                f"Invalid input: {error_msg}",
                context={"field": e.errors()[0]['loc'][0], "error": error_msg}
            )

        # Create as DRAFT - not visible to other users until approved
        comment_data = {
            "user_id": validated.user_id,
            "post_id": validated.post_id,
            "comment": validated.comment,
            "created_at": datetime.now().isoformat(),
            "status": "draft",  # CRITICAL: Draft status prevents public visibility
            "requires_approval": True,
            "draft_created_at": datetime.now().isoformat()
        }

        draft_comment = await safe_db_insert("comments", comment_data, user_id)

        # DO NOT increment post comments count for drafts - only for published comments

        logger.info(f"Created DRAFT comment on post {validated.post_id} by user {validated.user_id} - requires approval")

        # Return draft for user preview - NOT a published comment
        return {
            "success": True,
            "draft_comment": draft_comment,
            "requires_approval": True,
            "preview": {
                "comment": validated.comment,
                "post_id": validated.post_id
            },
            "message": "⚠️ DRAFT COMMENT CREATED - Comment preview ready for your approval. " +
                      "This comment is NOT yet visible to other users. " +
                      "Please review and approve to publish."
        }

    except ValidationError:
        raise
    except DatabaseError:
        raise
    except Exception as e:
        logger.error(
            f"Unexpected error creating draft comment",
            extra={"user_id": user_id, "post_id": post_id},
            exc_info=True
        )
        raise DatabaseError(
            "Failed to create draft comment",
            context={"user_id": user_id, "post_id": post_id, "error": str(e)}
        )


async def approve_and_publish_comment(
    draft_id: str,
    user_id: str,
    **kwargs
) -> Dict[str, Any]:
    """
    Approve and publish a draft comment after user confirmation.

    This function should only be called after the user has reviewed the draft
    comment and explicitly approved it for publication.

    Args:
        draft_id: UUID of the draft comment to publish
        user_id: UUID of the user (must match draft owner)

    Returns:
        Dict with published comment details

    Raises:
        ValidationError: Invalid input parameters
        DatabaseError: Database operation failed
    """
    try:
        validate_uuid(draft_id, "draft_id")
        validate_uuid(user_id, "user_id")

        supabase = get_supabase_client()

        # Verify draft exists and belongs to user
        draft_response = supabase.table("comments").select("*").eq("id", draft_id).eq("user_id", user_id).eq("status", "draft").single().execute()

        if not draft_response.data:
            raise ValidationError(
                "Draft comment not found or not owned by user",
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

        published_response = supabase.table("comments").update(published_data).eq("id", draft_id).eq("user_id", user_id).execute()

        if not published_response.data:
            raise DatabaseError(
                "Failed to publish draft comment",
                context={"draft_id": draft_id, "user_id": user_id}
            )

        published_comment = published_response.data[0]

        # NOW increment post comments count (only for published comments)
        supabase.rpc("increment_post_comments", {"post_id": draft["post_id"]}).execute()

        logger.info(f"Published approved comment {draft_id} on post {draft['post_id']} by user {user_id}")

        return {
            "success": True,
            "published_comment": published_comment,
            "message": "✅ Comment published successfully! Now visible to the community."
        }

    except ValidationError:
        raise
    except DatabaseError:
        raise
    except Exception as e:
        logger.error(
            f"Unexpected error publishing comment",
            extra={"draft_id": draft_id, "user_id": user_id},
            exc_info=True
        )
        raise DatabaseError(
            "Failed to publish comment",
            context={"draft_id": draft_id, "user_id": user_id, "error": str(e)}
        )
