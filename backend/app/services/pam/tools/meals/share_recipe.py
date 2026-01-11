"""
PAM Tool: Share Recipe

Allows users to share recipes with friends or make them public
"""

import logging
from typing import Dict, Any, Optional, List

from app.core.database import get_supabase_client

logger = logging.getLogger(__name__)


async def share_recipe(
    user_id: str,
    recipe_id: str,
    action: str,
    friend_ids: Optional[List[str]] = None
) -> Dict[str, Any]:
    """
    Share a recipe with friends or make it public in community library.

    Args:
        user_id: ID of the user sharing the recipe
        recipe_id: UUID of the recipe to share
        action: 'share_with_friends', 'make_public', or 'make_private'
        friend_ids: List of friend user IDs (required for share_with_friends)

    Returns:
        Dict with success status and message

    Examples:
        User: "Make my chicken parmesan recipe public"
        PAM: *Calls share_recipe(recipe_id='...', action='make_public')*

        User: "Share this recipe with John"
        PAM: *Gets John's user_id* *Calls share_recipe(recipe_id='...', action='share_with_friends', friend_ids=['john_id'])*
    """
    try:
        supabase = get_supabase_client()

        # Verify user owns the recipe
        recipe_result = supabase.table("recipes").select("*").eq("id", recipe_id).eq("user_id", user_id).execute()

        if not recipe_result.data:
            return {
                "success": False,
                "error": "Recipe not found or you don't have permission to share it"
            }

        recipe = recipe_result.data[0]

        if action == 'share_with_friends':
            if not friend_ids:
                return {
                    "success": False,
                    "error": "friend_ids required for sharing with friends"
                }

            # Update shared_with array
            current_shared = recipe.get("shared_with", []) or []
            new_shared = list(set(current_shared + friend_ids))  # Merge and dedupe

            supabase.table("recipes").update({
                "is_shared": True,
                "shared_with": new_shared
            }).eq("id", recipe_id).execute()

            logger.info(f"Recipe {recipe_id} shared with {len(friend_ids)} friend(s)")

            return {
                "success": True,
                "message": f"Recipe '{recipe['title']}' shared with {len(friend_ids)} friend(s)"
            }

        elif action == 'make_public':
            supabase.table("recipes").update({
                "is_public": True
            }).eq("id", recipe_id).execute()

            logger.info(f"Recipe {recipe_id} made public")

            return {
                "success": True,
                "message": f"Recipe '{recipe['title']}' is now public in the community library"
            }

        elif action == 'make_private':
            supabase.table("recipes").update({
                "is_public": False,
                "is_shared": False,
                "shared_with": []
            }).eq("id", recipe_id).execute()

            logger.info(f"Recipe {recipe_id} made private")

            return {
                "success": True,
                "message": f"Recipe '{recipe['title']}' is now private"
            }

        else:
            return {
                "success": False,
                "error": f"Invalid action '{action}'. Use 'share_with_friends', 'make_public', or 'make_private'"
            }

    except Exception as e:
        logger.error(f"Error sharing recipe: {str(e)}")
        return {
            "success": False,
            "error": str(e)
        }
