"""Follow User Tool for PAM

Connect with other RVers in the community

Example usage:
- "Follow John"
- "Unfollow Sarah"
"""

import logging
from typing import Any, Dict
from datetime import datetime

from app.integrations.supabase import get_supabase_client

logger = logging.getLogger(__name__)


async def follow_user(
    user_id: str,
    target_user_id: str,
    unfollow: bool = False,
    **kwargs
) -> Dict[str, Any]:
    """
    Follow or unfollow another user

    Args:
        user_id: UUID of the current user
        target_user_id: UUID of the user to follow/unfollow
        unfollow: Set to True to unfollow (default: False)

    Returns:
        Dict with follow status
    """
    try:
        if not target_user_id:
            return {
                "success": False,
                "error": "Target user ID is required"
            }

        if user_id == target_user_id:
            return {
                "success": False,
                "error": "Cannot follow yourself"
            }

        supabase = get_supabase_client()

        if unfollow:
            # Remove follow relationship
            response = supabase.table("user_follows").delete().match({
                "follower_id": user_id,
                "following_id": target_user_id
            }).execute()

            logger.info(f"User {user_id} unfollowed user {target_user_id}")

            return {
                "success": True,
                "following": False,
                "message": "User unfollowed"
            }
        else:
            # Create follow relationship
            follow_data = {
                "follower_id": user_id,
                "following_id": target_user_id,
                "created_at": datetime.now().isoformat()
            }

            response = supabase.table("user_follows").insert(follow_data).execute()

            logger.info(f"User {user_id} followed user {target_user_id}")

            return {
                "success": True,
                "following": True,
                "message": "User followed successfully"
            }

    except Exception as e:
        logger.error(f"Error following user: {e}", exc_info=True)
        return {
            "success": False,
            "error": str(e)
        }
