"""Message Friend Tool for PAM

Send direct messages to other users

Example usage:
- "Send a message to John asking about his RV setup"
- "DM Sarah about the campground recommendation"
"""

import logging
from typing import Any, Dict
from datetime import datetime
from pydantic import ValidationError as PydanticValidationError

from app.integrations.supabase import get_supabase_client
from app.services.pam.schemas.social import MessageFriendInput
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


async def message_friend(
    user_id: str,
    recipient_id: str,
    message: str,
    **kwargs
) -> Dict[str, Any]:
    """
    Send a direct message to another user

    Args:
        user_id: UUID of the sender
        recipient_id: UUID of the recipient
        message: Message content

    Returns:
        Dict with message details

    Raises:
        ValidationError: Invalid input parameters
        DatabaseError: Database operation failed
    """
    try:
        validate_uuid(user_id, "user_id")
        validate_uuid(recipient_id, "recipient_id")
        validate_required(message, "message")

        # Validate inputs using Pydantic schema
        try:
            validated = MessageFriendInput(
                user_id=user_id,
                recipient_id=recipient_id,
                message=message
            )
        except PydanticValidationError as e:
            error_msg = e.errors()[0]['msg']
            raise ValidationError(
                f"Invalid input: {error_msg}",
                context={"field": e.errors()[0]['loc'][0], "error": error_msg}
            )

        # Build message data
        message_data = {
            "sender_id": validated.user_id,
            "recipient_id": validated.recipient_id,
            "message": validated.message,
            "created_at": datetime.now().isoformat(),
            "read": False
        }

        msg = await safe_db_insert("messages", message_data, user_id)

        logger.info(f"Sent message from {validated.user_id} to {validated.recipient_id}")

        return {
            "success": True,
            "message": msg,
            "message_text": "Message sent successfully"
        }

    except ValidationError:
        raise
    except DatabaseError:
        raise
    except Exception as e:
        logger.error(
            f"Unexpected error sending message",
            extra={"user_id": user_id, "recipient_id": recipient_id},
            exc_info=True
        )
        raise DatabaseError(
            "Failed to send message",
            context={"user_id": user_id, "recipient_id": recipient_id, "error": str(e)}
        )
