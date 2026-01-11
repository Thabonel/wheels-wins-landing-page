"""
PAM Tool: Generate Shopping List

Creates shopping lists from meal plans, subtracting pantry items
"""

import logging
from typing import Dict, Any, Optional, List
from datetime import datetime, timedelta
from collections import defaultdict

from app.core.database import get_supabase_client

logger = logging.getLogger(__name__)


async def generate_shopping_list(
    user_id: str,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    meal_plan_ids: Optional[List[str]] = None,
    list_name: Optional[str] = None
) -> Dict[str, Any]:
    """
    Generate shopping list from meal plans.

    Algorithm:
    1. Get meal plans for date range (or specific IDs)
    2. Extract all ingredients from linked recipes
    3. Aggregate quantities by ingredient name
    4. Subtract available pantry items
    5. Save to shopping_lists table

    Args:
        user_id: ID of the user
        start_date: Start date for meal plans (YYYY-MM-DD format)
        end_date: End date for meal plans (YYYY-MM-DD format)
        meal_plan_ids: Optional list of specific meal plan IDs
        list_name: Optional custom name for the list

    Returns:
        Dict with success status and shopping list

    Examples:
        User: "Create a shopping list for next week's meals"
        PAM: *Calls generate_shopping_list()*

        User: "Make a shopping list for the next 3 days"
        PAM: *Calls generate_shopping_list(start_date='2026-01-07', end_date='2026-01-10')*
    """
    try:
        supabase = get_supabase_client()

        # Get meal plans
        if meal_plan_ids:
            # Get specific meal plans by IDs
            meal_plans_result = supabase.table("meal_plans").select("*, recipes(*)").in_("id", meal_plan_ids).eq("user_id", user_id).execute()
            meal_plans = meal_plans_result.data or []
        else:
            # Get meal plans by date range
            start = start_date or str(datetime.now().date())
            end = end_date or str((datetime.now() + timedelta(days=7)).date())

            meal_plans_result = supabase.table("meal_plans").select("*, recipes(*)").eq("user_id", user_id).gte("plan_date", start).lte("plan_date", end).execute()
            meal_plans = meal_plans_result.data or []

        if not meal_plans:
            return {
                "success": False,
                "error": "No meal plans found for the specified date range"
            }

        # Aggregate ingredients from all recipes
        needed_ingredients = defaultdict(lambda: {"quantity": 0.0, "unit": "", "recipes": []})

        for plan in meal_plans:
            recipe = plan.get('recipes')
            if not recipe:
                continue

            recipe_ingredients = recipe.get('ingredients', [])
            if not recipe_ingredients:
                continue

            for ing in recipe_ingredients:
                name = ing.get('name', '').lower().strip()
                if not name:
                    continue

                quantity = ing.get('quantity', 0.0) or 0.0
                unit = ing.get('unit', '').lower().strip()

                # Try to aggregate quantities if units match
                if needed_ingredients[name]['unit'] == unit or not needed_ingredients[name]['unit']:
                    needed_ingredients[name]['quantity'] += quantity
                    needed_ingredients[name]['unit'] = unit
                    needed_ingredients[name]['recipes'].append(recipe.get('title', 'Unknown'))
                else:
                    # Different units - keep separate (e.g., "1 cup + 2 tbsp")
                    combined_name = f"{name} ({unit})"
                    needed_ingredients[combined_name]['quantity'] += quantity
                    needed_ingredients[combined_name]['unit'] = unit
                    needed_ingredients[combined_name]['recipes'].append(recipe.get('title', 'Unknown'))

        # Get pantry items to subtract
        pantry_result = supabase.table("pantry_items").select("*").eq("user_id", user_id).execute()
        pantry_items = pantry_result.data or []

        pantry_dict = {}
        for item in pantry_items:
            name = item.get('ingredient_name', '').lower().strip()
            pantry_dict[name] = {
                "quantity": item.get('quantity', 0.0) or 0.0,
                "unit": item.get('unit', '').lower().strip()
            }

        # Subtract pantry items from needed ingredients
        for name, pantry_info in pantry_dict.items():
            if name in needed_ingredients:
                pantry_qty = pantry_info['quantity']
                pantry_unit = pantry_info['unit']
                needed_unit = needed_ingredients[name]['unit']

                # Only subtract if units match
                if pantry_unit == needed_unit:
                    needed_ingredients[name]['quantity'] -= pantry_qty

                    # If we have enough in pantry, set to 0
                    if needed_ingredients[name]['quantity'] <= 0:
                        needed_ingredients[name]['quantity'] = 0

        # Filter out items we have enough of (quantity <= 0)
        shopping_items = []
        for name, info in needed_ingredients.items():
            if info['quantity'] > 0:
                shopping_items.append({
                    "ingredient": name,
                    "quantity": round(info['quantity'], 2),
                    "unit": info['unit'],
                    "checked": False,
                    "recipes": list(set(info['recipes']))  # Dedupe recipe names
                })

        if not shopping_items:
            return {
                "success": True,
                "shopping_list": None,
                "items": [],
                "message": "You have all ingredients needed in your pantry!"
            }

        # Generate list name
        if not list_name:
            list_name = f"Shopping List {datetime.now().strftime('%Y-%m-%d')}"

        # Save shopping list
        list_data = {
            "user_id": user_id,
            "list_name": list_name,
            "items": shopping_items,
            "generated_from_meal_plan": True,
            "notes": f"Generated from {len(meal_plans)} meal plans"
        }

        result = supabase.table("shopping_lists").insert(list_data).execute()

        logger.info(f"Generated shopping list with {len(shopping_items)} items for user {user_id}")

        return {
            "success": True,
            "shopping_list": result.data[0],
            "items": shopping_items,
            "count": len(shopping_items),
            "message": f"Created shopping list with {len(shopping_items)} items"
        }

    except Exception as e:
        logger.error(f"Error generating shopping list: {str(e)}")
        return {
            "success": False,
            "error": str(e)
        }
