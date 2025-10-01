"""Update Profile Tool for PAM

Modify user profile information

Example usage:
- "Update my bio to..."
- "Change my profile photo"
"""

import logging
from typing import Any, Dict, Optional
from datetime import datetime

from app.integrations.supabase import get_supabase_client

logger = logging.getLogger(__name__)


async def update_profile(
    user_id: str,
    username: Optional[str] = None,
    bio: Optional[str] = None,
    avatar_url: Optional[str] = None,
    location: Optional[str] = None,
    rv_type: Optional[str] = None,
    rv_year: Optional[int] = None,
    **kwargs
) -> Dict[str, Any]:
    """
    Update user profile information

    Args:
        user_id: UUID of the user
        username: Optional new username
        bio: Optional bio text
        avatar_url: Optional avatar image URL
        location: Optional location
        rv_type: Optional RV type
        rv_year: Optional RV year

    Returns:
        Dict with updated profile
    """
    try:
        supabase = get_supabase_client()

        # Build update data (only include provided fields)
        update_data = {
            "updated_at": datetime.now().isoformat()
        }

        if username is not None:
            update_data["username"] = username
        if bio is not None:
            update_data["bio"] = bio
        if avatar_url is not None:
            update_data["avatar_url"] = avatar_url
        if location is not None:
            update_data["location"] = location
        if rv_type is not None:
            update_data["rv_type"] = rv_type
        if rv_year is not None:
            update_data["rv_year"] = rv_year

        # Update profile
        response = supabase.table("profiles").update(
            update_data
        ).eq("id", user_id).execute()

        if response.data:
            profile = response.data[0]
            logger.info(f"Updated profile for user {user_id}")

            return {
                "success": True,
                "profile": profile,
                "message": "Profile updated successfully"
            }
        else:
            logger.error(f"Failed to update profile: {response}")
            return {
                "success": False,
                "error": "Failed to update profile"
            }

    except Exception as e:
        logger.error(f"Error updating profile: {e}", exc_info=True)
        return {
            "success": False,
            "error": str(e)
        }
