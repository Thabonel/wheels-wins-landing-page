"""
PAM Tool: Manage Pantry

Allows users to track pantry inventory with expiry dates
"""

import logging
from typing import Dict, Any, Optional
from datetime import datetime, timedelta

from app.core.database import get_supabase_client

logger = logging.getLogger(__name__)


async def manage_pantry(
    user_id: str,
    action: str,
    ingredient_name: Optional[str] = None,
    quantity: Optional[float] = None,
    unit: Optional[str] = None,
    location: Optional[str] = None,
    expiry_date: Optional[str] = None,
    item_id: Optional[str] = None
) -> Dict[str, Any]:
    """
    Manage pantry inventory.

    Args:
        user_id: ID of the user
        action: 'add', 'update', 'remove', 'list', or 'check_expiry'
        ingredient_name: Name of the ingredient
        quantity: Quantity of the ingredient
        unit: Unit of measurement (cups, lbs, oz, grams, etc.)
        location: Storage location (fridge, freezer, pantry)
        expiry_date: Expiry date (YYYY-MM-DD format)
        item_id: UUID of pantry item (for update/remove)

    Returns:
        Dict with success status and data

    Examples:
        User: "Add 2 lbs of chicken to my pantry, expires next week"
        PAM: *Calls manage_pantry(action='add', ingredient_name='chicken', quantity=2, unit='lbs', expiry_date='2026-01-13')*

        User: "What's expiring soon in my pantry?"
        PAM: *Calls manage_pantry(action='check_expiry')*
    """
    try:
        supabase = get_supabase_client()

        if action == 'add':
            if not ingredient_name or quantity is None or not unit:
                return {
                    "success": False,
                    "error": "ingredient_name, quantity, and unit are required for adding items"
                }

            data = {
                "user_id": user_id,
                "ingredient_name": ingredient_name,
                "quantity": quantity,
                "unit": unit,
                "location": location,
                "expiry_date": expiry_date
            }

            result = supabase.table("pantry_items").insert(data).execute()

            logger.info(f"Added {quantity} {unit} of {ingredient_name} to pantry for user {user_id}")

            return {
                "success": True,
                "item": result.data[0],
                "message": f"Added {quantity} {unit} of {ingredient_name} to your pantry"
            }

        elif action == 'list':
            result = supabase.table("pantry_items").select("*").eq("user_id", user_id).order("ingredient_name").execute()

            return {
                "success": True,
                "items": result.data,
                "count": len(result.data)
            }

        elif action == 'check_expiry':
            # Check items expiring within 7 days
            soon_date = (datetime.now() + timedelta(days=7)).date()

            result = supabase.table("pantry_items").select("*").eq("user_id", user_id).lte("expiry_date", str(soon_date)).order("expiry_date").execute()

            logger.info(f"Found {len(result.data)} items expiring soon for user {user_id}")

            return {
                "success": True,
                "expiring_soon": result.data,
                "count": len(result.data),
                "message": f"Found {len(result.data)} item(s) expiring within 7 days"
            }

        elif action == 'update':
            if not item_id:
                return {
                    "success": False,
                    "error": "item_id required for updating"
                }

            data = {}
            if ingredient_name is not None:
                data["ingredient_name"] = ingredient_name
            if quantity is not None:
                data["quantity"] = quantity
            if unit is not None:
                data["unit"] = unit
            if location is not None:
                data["location"] = location
            if expiry_date is not None:
                data["expiry_date"] = expiry_date

            result = supabase.table("pantry_items").update(data).eq("id", item_id).eq("user_id", user_id).execute()

            if result.data:
                logger.info(f"Updated pantry item {item_id} for user {user_id}")

                return {
                    "success": True,
                    "item": result.data[0],
                    "message": "Pantry item updated successfully"
                }
            else:
                return {
                    "success": False,
                    "error": "Pantry item not found or you don't have permission"
                }

        elif action == 'remove':
            if not item_id:
                return {
                    "success": False,
                    "error": "item_id required for removing"
                }

            result = supabase.table("pantry_items").delete().eq("id", item_id).eq("user_id", user_id).execute()

            if result.data:
                logger.info(f"Removed pantry item {item_id} for user {user_id}")

                return {
                    "success": True,
                    "message": "Pantry item removed successfully"
                }
            else:
                return {
                    "success": False,
                    "error": "Pantry item not found or you don't have permission"
                }

        else:
            return {
                "success": False,
                "error": f"Invalid action '{action}'. Use 'add', 'update', 'remove', 'list', or 'check_expiry'"
            }

    except Exception as e:
        logger.error(f"Error managing pantry: {str(e)}")
        return {
            "success": False,
            "error": str(e)
        }
