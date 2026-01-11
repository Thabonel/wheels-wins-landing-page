"""
PAM Tool: Search Recipes

Searches user's recipe collection with dietary restriction enforcement
Automatically filters out non-compliant recipes based on user preferences
"""

import logging
from typing import Dict, Any, Optional, List

from app.core.database import get_supabase_client

logger = logging.getLogger(__name__)


async def search_recipes(
    user_id: str,
    query: Optional[str] = None,
    ingredients: Optional[List[str]] = None,
    meal_type: Optional[str] = None,
    dietary_tags: Optional[List[str]] = None,
    max_prep_time: Optional[int] = None,
    include_public: bool = True,
    limit: int = 10
) -> Dict[str, Any]:
    """
    Search recipes (own + shared + optionally public).

    ENFORCES USER'S DIETARY RESTRICTIONS (hides non-compliant recipes)

    Args:
        user_id: ID of the user searching
        query: Text query (recipe name/description)
        ingredients: List of ingredients to search for
        meal_type: Filter by meal type (breakfast, lunch, dinner, snack)
        dietary_tags: Filter by dietary tags (vegan, gluten-free, etc.)
        max_prep_time: Maximum prep time in minutes
        include_public: Include public community recipes
        limit: Maximum number of results

    Returns:
        Dict with:
        {
            "success": True,
            "recipes": [...],
            "count": 5
        }

    Examples:
        User: "Find me vegan recipes under 30 minutes"
        PAM: *Calls search_recipes(dietary_tags=['vegan'], max_prep_time=30)*

        User: "What can I make with chicken and rice?"
        PAM: *Calls search_recipes(ingredients=['chicken', 'rice'])*
    """
    try:
        supabase = get_supabase_client()

        # Get user's dietary restrictions (ENFORCED)
        prefs_result = supabase.table("user_dietary_preferences").select("*").eq("user_id", user_id).execute()

        user_restrictions = []
        user_allergies = []

        if prefs_result.data:
            user_restrictions = prefs_result.data[0].get("dietary_restrictions", []) or []
            user_allergies = prefs_result.data[0].get("allergies", []) or []

        # Build query (RLS handles access control for own/shared/public)
        query_builder = supabase.table("recipes").select("*")

        # Apply filters
        if query:
            query_builder = query_builder.or_(f"title.ilike.%{query}%,description.ilike.%{query}%")

        if meal_type:
            query_builder = query_builder.contains("meal_type", [meal_type])

        if dietary_tags:
            for tag in dietary_tags:
                query_builder = query_builder.contains("dietary_tags", [tag])

        if max_prep_time:
            query_builder = query_builder.lte("prep_time_minutes", max_prep_time)

        # Execute query (get extra for filtering)
        result = query_builder.order("created_at", desc=True).limit(limit * 3).execute()

        # ENFORCE dietary restrictions (filter out non-compliant recipes)
        filtered_recipes = []

        for recipe in result.data:
            recipe_tags = set(recipe.get("dietary_tags", []) or [])

            # Check allergies (CRITICAL - never show recipes with allergens)
            if user_allergies:
                recipe_ingredients_str = str(recipe.get("ingredients", [])).lower()
                has_allergen = any(
                    allergen.lower() in recipe_ingredients_str
                    for allergen in user_allergies
                )
                if has_allergen:
                    logger.info(f"Filtering out recipe with allergen: {recipe['title']}")
                    continue  # Skip recipes with allergens

            # Check dietary restrictions (e.g., if user is vegan, recipe must be vegan)
            if user_restrictions:
                # Recipe must have ALL user's dietary restrictions as tags
                if not all(restriction in recipe_tags for restriction in user_restrictions):
                    logger.info(f"Filtering out non-compliant recipe: {recipe['title']}")
                    continue  # Skip non-compliant recipes

            # Search by ingredients if specified
            if ingredients:
                recipe_ingredients_str = str(recipe.get("ingredients", [])).lower()
                # Check if at least one ingredient matches
                has_ingredient = any(
                    ing.lower() in recipe_ingredients_str
                    for ing in ingredients
                )
                if not has_ingredient:
                    continue

            filtered_recipes.append(recipe)

            if len(filtered_recipes) >= limit:
                break

        logger.info(
            f"Found {len(filtered_recipes)} recipes for user {user_id} "
            f"(filtered from {len(result.data)} total, restrictions: {user_restrictions}, allergies: {user_allergies})"
        )

        return {
            "success": True,
            "recipes": filtered_recipes,
            "count": len(filtered_recipes),
            "restrictions_applied": user_restrictions,
            "allergies_filtered": user_allergies
        }

    except Exception as e:
        logger.error(f"Error searching recipes: {str(e)}")
        return {
            "success": False,
            "recipes": [],
            "count": 0,
            "error": str(e)
        }
