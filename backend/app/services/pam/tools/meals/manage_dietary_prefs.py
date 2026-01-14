"""
PAM Tool: Manage Dietary Preferences

Allows users to set dietary restrictions, allergies, and nutrition goals
"""

import logging
from typing import Dict, Any, Optional, List

from app.core.database import get_supabase_client

logger = logging.getLogger(__name__)


async def manage_dietary_prefs(
    user_id: str,
    action: str,
    dietary_restrictions: Optional[List[str]] = None,
    allergies: Optional[List[str]] = None,
    preferred_cuisines: Optional[List[str]] = None,
    disliked_ingredients: Optional[List[str]] = None,
    daily_calorie_goal: Optional[int] = None,
    daily_protein_goal: Optional[int] = None,
    daily_carb_goal: Optional[int] = None,
    daily_fat_goal: Optional[int] = None
) -> Dict[str, Any]:
    """
    Manage user's dietary preferences and restrictions.

    Args:
        user_id: ID of the user
        action: 'set', 'add', 'remove', or 'get'
        dietary_restrictions: List of dietary restrictions (vegan, vegetarian, gluten-free, etc.)
        allergies: List of allergies (peanuts, shellfish, etc.)
        preferred_cuisines: List of preferred cuisines
        disliked_ingredients: List of disliked ingredients
        daily_calorie_goal: Daily calorie goal
        daily_protein_goal: Daily protein goal (grams)
        daily_carb_goal: Daily carb goal (grams)
        daily_fat_goal: Daily fat goal (grams)

    Returns:
        Dict with preferences or success status

    Examples:
        User: "I'm vegan and allergic to peanuts"
        PAM: *Calls manage_dietary_prefs(action='set', dietary_restrictions=['vegan'], allergies=['peanuts'])*

        User: "I want to eat 2000 calories per day"
        PAM: *Calls manage_dietary_prefs(action='set', daily_calorie_goal=2000)*
    """
    try:
        supabase = get_supabase_client()

        if action == 'get':
            result = supabase.table("user_dietary_preferences").select("*").eq("user_id", user_id).execute()

            if result.data:
                return {
                    "success": True,
                    "preferences": result.data[0]
                }
            else:
                return {
                    "success": True,
                    "preferences": {},
                    "message": "No dietary preferences set yet"
                }

        elif action == 'set':
            # Upsert preferences (create or update)
            data = {"user_id": user_id}

            if dietary_restrictions is not None:
                data["dietary_restrictions"] = dietary_restrictions
            if allergies is not None:
                data["allergies"] = allergies
            if preferred_cuisines is not None:
                data["preferred_cuisines"] = preferred_cuisines
            if disliked_ingredients is not None:
                data["disliked_ingredients"] = disliked_ingredients
            if daily_calorie_goal is not None:
                data["daily_calorie_goal"] = daily_calorie_goal
            if daily_protein_goal is not None:
                data["daily_protein_goal"] = daily_protein_goal
            if daily_carb_goal is not None:
                data["daily_carb_goal"] = daily_carb_goal
            if daily_fat_goal is not None:
                data["daily_fat_goal"] = daily_fat_goal

            result = supabase.table("user_dietary_preferences").upsert(data, on_conflict="user_id").execute()

            logger.info(f"Updated dietary preferences for user {user_id}")

            return {
                "success": True,
                "preferences": result.data[0],
                "message": "Dietary preferences updated successfully"
            }

        elif action == 'add':
            # Add to existing arrays
            existing = supabase.table("user_dietary_preferences").select("*").eq("user_id", user_id).execute()

            if existing.data:
                current = existing.data[0]
                data = {"user_id": user_id}

                # Merge arrays
                if dietary_restrictions:
                    current_restrictions = current.get("dietary_restrictions", []) or []
                    data["dietary_restrictions"] = list(set(current_restrictions + dietary_restrictions))

                if allergies:
                    current_allergies = current.get("allergies", []) or []
                    data["allergies"] = list(set(current_allergies + allergies))

                if preferred_cuisines:
                    current_cuisines = current.get("preferred_cuisines", []) or []
                    data["preferred_cuisines"] = list(set(current_cuisines + preferred_cuisines))

                if disliked_ingredients:
                    current_disliked = current.get("disliked_ingredients", []) or []
                    data["disliked_ingredients"] = list(set(current_disliked + disliked_ingredients))

                result = supabase.table("user_dietary_preferences").upsert(data, on_conflict="user_id").execute()

                logger.info(f"Added to dietary preferences for user {user_id}")

                return {
                    "success": True,
                    "preferences": result.data[0],
                    "message": "Preferences added successfully"
                }
            else:
                # No existing preferences, create new
                return await manage_dietary_prefs(
                    user_id=user_id,
                    action='set',
                    dietary_restrictions=dietary_restrictions,
                    allergies=allergies,
                    preferred_cuisines=preferred_cuisines,
                    disliked_ingredients=disliked_ingredients
                )

        elif action == 'remove':
            # Remove from existing arrays
            existing = supabase.table("user_dietary_preferences").select("*").eq("user_id", user_id).execute()

            if existing.data:
                current = existing.data[0]
                data = {"user_id": user_id}

                # Remove from arrays
                if dietary_restrictions:
                    current_restrictions = current.get("dietary_restrictions", []) or []
                    data["dietary_restrictions"] = [r for r in current_restrictions if r not in dietary_restrictions]

                if allergies:
                    current_allergies = current.get("allergies", []) or []
                    data["allergies"] = [a for a in current_allergies if a not in allergies]

                if preferred_cuisines:
                    current_cuisines = current.get("preferred_cuisines", []) or []
                    data["preferred_cuisines"] = [c for c in current_cuisines if c not in preferred_cuisines]

                if disliked_ingredients:
                    current_disliked = current.get("disliked_ingredients", []) or []
                    data["disliked_ingredients"] = [d for d in current_disliked if d not in disliked_ingredients]

                result = supabase.table("user_dietary_preferences").upsert(data, on_conflict="user_id").execute()

                logger.info(f"Removed from dietary preferences for user {user_id}")

                return {
                    "success": True,
                    "preferences": result.data[0],
                    "message": "Preferences removed successfully"
                }
            else:
                return {
                    "success": False,
                    "error": "No preferences to remove"
                }

        else:
            return {
                "success": False,
                "error": f"Invalid action '{action}'. Use 'set', 'add', 'remove', or 'get'"
            }

    except Exception as e:
        logger.error(f"Error managing dietary preferences: {str(e)}")
        return {
            "success": False,
            "error": str(e)
        }
