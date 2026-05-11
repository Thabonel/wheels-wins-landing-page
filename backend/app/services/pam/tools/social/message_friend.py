"""Message Friend Tool for PAM

Send direct messages to other users

Example usage:
- "Send a message to John asking about his RV setup"
- "DM Sarah about the campground recommendation"
"""

import os
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

_MAX_MESSAGE_LENGTH = 2000
_RATE_LIMIT_MESSAGES = 10
_RATE_LIMIT_WINDOW_SECONDS = 3600


async def _check_rate_limit(user_id: str) -> bool:
    """Return True if user is within rate limit, False if exceeded."""
    redis_url = os.getenv("REDIS_URL")
    if not redis_url:
        return True  # No Redis configured - skip rate limiting
    try:
        import redis.asyncio as aioredis
        client = aioredis.from_url(redis_url, decode_responses=True)
        key = f"msg_rate:{user_id}"
        count = await client.incr(key)
        if count == 1:
            await client.expire(key, _RATE_LIMIT_WINDOW_SECONDS)
        await client.aclose()
        return count <= _RATE_LIMIT_MESSAGES
    except Exception:
        # Redis unavailable - allow message to proceed
        return True


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

        if user_id == recipient_id:
            raise ValidationError(
                "Cannot send a message to yourself",
                context={"user_id": user_id}
            )

        if len(message) > _MAX_MESSAGE_LENGTH:
            raise ValidationError(
                f"Message too long ({len(message)} chars). Maximum is {_MAX_MESSAGE_LENGTH} characters.",
                context={"length": len(message), "max": _MAX_MESSAGE_LENGTH}
            )

        if not await _check_rate_limit(user_id):
            raise ValidationError(
                f"Rate limit reached: maximum {_RATE_LIMIT_MESSAGES} messages per hour.",
                context={"user_id": user_id, "limit": _RATE_LIMIT_MESSAGES}
            )

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
