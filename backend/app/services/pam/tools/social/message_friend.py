"""Message Friend Tool for PAM

Send direct messages to other users

Example usage:
- "Send a message to John asking about his RV setup"
- "DM Sarah about the campground recommendation"
"""

import logging
from typing import Any, Dict
from datetime import datetime

from app.integrations.supabase import get_supabase_client

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
    """
    try:
        if not message or len(message.strip()) == 0:
            return {
                "success": False,
                "error": "Message content is required"
            }

        if not recipient_id:
            return {
                "success": False,
                "error": "Recipient ID is required"
            }

        supabase = get_supabase_client()

        # Build message data
        message_data = {
            "sender_id": user_id,
            "recipient_id": recipient_id,
            "message": message.strip(),
            "created_at": datetime.now().isoformat(),
            "read": False
        }

        # Save to database
        response = supabase.table("messages").insert(message_data).execute()

        if response.data:
            msg = response.data[0]
            logger.info(f"Sent message from {user_id} to {recipient_id}")

            return {
                "success": True,
                "message": msg,
                "message_text": "Message sent successfully"
            }
        else:
            logger.error(f"Failed to send message: {response}")
            return {
                "success": False,
                "error": "Failed to send message"
            }

    except Exception as e:
        logger.error(f"Error sending message: {e}", exc_info=True)
        return {
            "success": False,
            "error": str(e)
        }
