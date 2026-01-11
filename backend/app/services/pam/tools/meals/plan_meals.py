"""
PAM Tool: Plan Meals

AI-powered meal planning using user's recipes and pantry items
"""

import logging
from typing import Dict, Any, Optional, List
from datetime import datetime, timedelta

from app.core.database import get_supabase_client
from app.core.ai import get_ai_client

logger = logging.getLogger(__name__)


async def plan_meals(
    user_id: str,
    days: int = 7,
    meal_types: Optional[List[str]] = None,
    use_pantry_items: bool = True,
    dietary_preferences: Optional[List[str]] = None
) -> Dict[str, Any]:
    """
    Generate AI-powered meal plan for specified days.

    Args:
        user_id: ID of the user
        days: Number of days to plan (default: 7)
        meal_types: List of meal types to plan (default: ['breakfast', 'lunch', 'dinner'])
        use_pantry_items: Whether to prioritize pantry items (default: True)
        dietary_preferences: Optional dietary preferences to enforce

    Returns:
        Dict with success status and meal plan

    Examples:
        User: "Plan my meals for this week"
        PAM: *Calls plan_meals(days=7)*

        User: "Plan my meals for next 3 days using what's in my pantry"
        PAM: *Calls plan_meals(days=3, use_pantry_items=True)*
    """
    try:
        supabase = get_supabase_client()
        meal_types = meal_types or ['breakfast', 'lunch', 'dinner']

        # Get user's recipes
        recipes_result = supabase.table("recipes").select("*").eq("user_id", user_id).execute()
        recipes = recipes_result.data or []

        if not recipes:
            return {
                "success": False,
                "error": "No recipes found. Please add some recipes first before planning meals."
            }

        # Get pantry items if requested
        pantry_items = []
        if use_pantry_items:
            pantry_result = supabase.table("pantry_items").select("*").eq("user_id", user_id).execute()
            pantry_items = pantry_result.data or []

        # Get user's dietary preferences
        prefs_result = supabase.table("user_dietary_preferences").select("*").eq("user_id", user_id).execute()

        user_restrictions = []
        user_allergies = []
        nutrition_goals = {}

        if prefs_result.data:
            prefs = prefs_result.data[0]
            user_restrictions = prefs.get("dietary_restrictions", []) or []
            user_allergies = prefs.get("allergies", []) or []
            nutrition_goals = {
                "daily_calorie_goal": prefs.get("daily_calorie_goal"),
                "daily_protein_goal": prefs.get("daily_protein_goal"),
                "daily_carb_goal": prefs.get("daily_carb_goal"),
                "daily_fat_goal": prefs.get("daily_fat_goal")
            }

        # Use AI to generate meal plan
        ai_client = get_ai_client()

        prompt = f"""
Generate a {days}-day meal plan for a user with the following constraints:

DIETARY RESTRICTIONS (MUST ENFORCE):
- Restrictions: {user_restrictions or 'None'}
- Allergies: {user_allergies or 'None'}

NUTRITION GOALS:
{nutrition_goals if any(nutrition_goals.values()) else 'None specified'}

MEAL TYPES TO PLAN:
{', '.join(meal_types)}

AVAILABLE RECIPES ({len(recipes)} total):
{_format_recipes_for_ai(recipes)}

PANTRY ITEMS (prioritize using these):
{_format_pantry_for_ai(pantry_items) if use_pantry_items else 'Not considering pantry items'}

REQUIREMENTS:
1. Each day must have {len(meal_types)} meals
2. Meals must be balanced and varied
3. NEVER suggest recipes with allergens: {user_allergies}
4. ONLY use recipes that match dietary restrictions: {user_restrictions}
5. If using pantry items, prioritize recipes that use expiring ingredients
6. Aim to meet nutrition goals if specified
7. Avoid repeating the same recipe within 3 days

Return a JSON array with this structure:
[
  {{
    "day": 1,
    "meals": [
      {{"type": "breakfast", "recipe_id": "uuid", "recipe_title": "Title", "notes": "Optional notes"}},
      {{"type": "lunch", "recipe_id": "uuid", "recipe_title": "Title", "notes": ""}},
      {{"type": "dinner", "recipe_id": "uuid", "recipe_title": "Title", "notes": ""}}
    ]
  }},
  ...
]

IMPORTANT: Only use recipe_id values from the available recipes list above.
"""

        response = await ai_client.generate_text(prompt)

        # Parse AI response
        import json
        try:
            meal_plan = json.loads(response)
        except json.JSONDecodeError:
            # Try to extract JSON from response
            import re
            json_match = re.search(r'\[.*\]', response, re.DOTALL)
            if json_match:
                meal_plan = json.loads(json_match.group(0))
            else:
                raise ValueError("AI did not return valid JSON")

        # Save meal plan to database
        plan_date = datetime.now().date()
        saved_plans = []

        for day_plan in meal_plan:
            for meal in day_plan.get('meals', []):
                meal_data = {
                    "user_id": user_id,
                    "plan_date": str(plan_date),
                    "meal_type": meal['type'],
                    "recipe_id": meal.get('recipe_id'),
                    "notes": meal.get('notes', '')
                }

                result = supabase.table("meal_plans").insert(meal_data).execute()
                saved_plans.append(result.data[0])

            plan_date += timedelta(days=1)

        logger.info(f"Created {days}-day meal plan with {len(saved_plans)} meals for user {user_id}")

        return {
            "success": True,
            "meal_plan": meal_plan,
            "saved_count": len(saved_plans),
            "message": f"Created {days}-day meal plan with {len(saved_plans)} meals",
            "restrictions_applied": user_restrictions,
            "allergies_filtered": user_allergies
        }

    except Exception as e:
        logger.error(f"Error planning meals: {str(e)}")
        return {
            "success": False,
            "error": str(e)
        }


def _format_recipes_for_ai(recipes: List[Dict]) -> str:
    """Format recipes for AI prompt"""
    formatted = []
    for recipe in recipes:
        formatted.append(
            f"- {recipe['title']} (ID: {recipe['id']}, "
            f"Prep: {recipe.get('prep_time_minutes', 'N/A')}min, "
            f"Tags: {', '.join(recipe.get('dietary_tags', []))})"
        )
    return '\n'.join(formatted[:50])  # Limit to 50 recipes to avoid token limits


def _format_pantry_for_ai(pantry_items: List[Dict]) -> str:
    """Format pantry items for AI prompt"""
    if not pantry_items:
        return "No pantry items"

    formatted = []
    for item in pantry_items:
        expiry = item.get('expiry_date')
        expiry_str = f"expires {expiry}" if expiry else "no expiry"
        formatted.append(
            f"- {item['ingredient_name']}: {item['quantity']} {item['unit']} ({expiry_str})"
        )
    return '\n'.join(formatted[:30])  # Limit to avoid token bloat
