"""
PAM Transition Equipment Tools

Tools for tracking RV gear and equipment purchases.
"""

import logging
from typing import Dict, Any, Optional
from datetime import datetime

from app.core.database import get_supabase_client
from app.services.pam.tools.exceptions import (
    ValidationError,
    DatabaseError,
    ResourceNotFoundError,
)
from app.services.pam.tools.utils import (
    validate_uuid,
    validate_positive_number,
    validate_date_format,
    safe_db_insert,
    safe_db_update,
)

logger = logging.getLogger(__name__)

# Valid equipment categories
VALID_CATEGORIES = ["recovery", "kitchen", "power", "climate", "safety", "comfort", "other"]
VALID_PRIORITIES = ["critical", "high", "medium", "low"]


async def add_equipment_item(
    user_id: str,
    name: str,
    category: str,
    is_essential: bool = True,
    estimated_cost: Optional[float] = None,
    vendor_url: Optional[str] = None,
    notes: Optional[str] = None,
    priority: str = "medium"
) -> Dict[str, Any]:
    """
    Add an equipment item to track for purchase.

    Args:
        user_id: The user's ID
        name: Name of the equipment
        category: Category (recovery, kitchen, power, climate, safety, comfort, other)
        is_essential: Whether this is essential vs nice-to-have
        estimated_cost: Estimated cost
        vendor_url: URL where to purchase
        notes: Additional notes
        priority: Priority level (critical, high, medium, low)

    Returns:
        Dict with added item details

    Raises:
        ValidationError: Invalid input parameters
        ResourceNotFoundError: Transition profile not found
        DatabaseError: Database operation failed

    Example:
        User: "Add a portable solar panel to my equipment list, about $300"
        User: "I need to get a recovery kit, essential, around $150"
        User: "Add blackout curtains to comfort items"
    """
    try:
        validate_uuid(user_id, "user_id")

        # Validate category
        if category not in VALID_CATEGORIES:
            raise ValidationError(
                f"Invalid category. Must be one of: {', '.join(VALID_CATEGORIES)}",
                context={"category": category, "valid_categories": VALID_CATEGORIES}
            )

        if priority not in VALID_PRIORITIES:
            priority = "medium"

        if estimated_cost is not None:
            validate_positive_number(estimated_cost, "estimated_cost")

        supabase = get_supabase_client()

        # Get user's transition profile
        profile_result = supabase.table("transition_profiles")\
            .select("id")\
            .eq("user_id", user_id)\
            .maybeSingle()\
            .execute()

        if not profile_result.data:
            raise ResourceNotFoundError(
                "No transition plan found. Start one at /transition in the app first.",
                context={"user_id": user_id}
            )

        profile_id = profile_result.data["id"]

        # Create equipment item
        item_data = {
            "profile_id": profile_id,
            "user_id": user_id,
            "equipment_name": name,
            "equipment_category": category,
            "priority": priority,
            "estimated_cost": estimated_cost or 0,
            "actual_cost": None,
            "is_acquired": False,
            "acquired_at": None,
            "purchase_link": vendor_url,
            "notes": notes
        }

        item = await safe_db_insert("transition_equipment", item_data, user_id)

        # Get current equipment stats
        equip_result = supabase.table("transition_equipment")\
            .select("estimated_cost, is_acquired")\
            .eq("user_id", user_id)\
            .execute()

        equipment = equip_result.data or []
        total_items = len(equipment)
        total_estimated = sum(e.get("estimated_cost", 0) or 0 for e in equipment)
        acquired_count = len([e for e in equipment if e.get("is_acquired")])

        logger.info(f"Added equipment item '{name}' for user {user_id}")

        message = f"Added '{name}' to your {category} equipment list"
        if estimated_cost:
            message += f" (estimated ${estimated_cost:.2f})"
        message += f". You now have {total_items} items totaling ${total_estimated:.2f} estimated."

        return {
            "success": True,
            "item": item,
            "stats": {
                "total_items": total_items,
                "acquired": acquired_count,
                "remaining": total_items - acquired_count,
                "total_estimated": total_estimated
            },
            "message": message
        }

    except ValidationError:
        raise
    except ResourceNotFoundError:
        raise
    except DatabaseError:
        raise
    except Exception as e:
        logger.error(
            f"Unexpected error adding equipment item",
            extra={"user_id": user_id, "name": name},
            exc_info=True
        )
        raise DatabaseError(
            "Failed to add equipment item",
            context={"user_id": user_id, "name": name, "error": str(e)}
        )


async def mark_equipment_purchased(
    user_id: str,
    item_id: Optional[str] = None,
    item_name: Optional[str] = None,
    actual_cost: Optional[float] = None,
    purchase_date: Optional[str] = None
) -> Dict[str, Any]:
    """
    Mark an equipment item as purchased.

    Can identify item by ID or by name (fuzzy match).

    Args:
        user_id: The user's ID
        item_id: ID of the item (optional if item_name provided)
        item_name: Name of the item to mark purchased (fuzzy match)
        actual_cost: Actual purchase cost
        purchase_date: Date of purchase (YYYY-MM-DD)

    Returns:
        Dict with updated item and budget status

    Raises:
        ValidationError: Invalid input parameters or missing required fields
        ResourceNotFoundError: Equipment item not found
        DatabaseError: Database operation failed

    Example:
        User: "I bought the solar panel for $280"
        User: "Mark the recovery kit as purchased, cost $165"
        User: "Got the blackout curtains"
    """
    try:
        validate_uuid(user_id, "user_id")

        if item_id:
            validate_uuid(item_id, "item_id")

        if not item_id and not item_name:
            raise ValidationError(
                "Please provide either item_id or item_name.",
                context={"user_id": user_id}
            )

        if actual_cost is not None:
            validate_positive_number(actual_cost, "actual_cost")

        if purchase_date:
            validate_date_format(purchase_date, "purchase_date")

        supabase = get_supabase_client()

        # Find item by ID or name
        if item_id:
            item_result = supabase.table("transition_equipment")\
                .select("*")\
                .eq("id", item_id)\
                .eq("user_id", user_id)\
                .maybeSingle()\
                .execute()
        elif item_name:
            # Search by name (case-insensitive partial match)
            all_items = supabase.table("transition_equipment")\
                .select("*")\
                .eq("user_id", user_id)\
                .eq("is_acquired", False)\
                .execute()

            matching_items = [
                i for i in (all_items.data or [])
                if item_name.lower() in i.get("equipment_name", "").lower()
            ]

            if len(matching_items) == 0:
                raise ResourceNotFoundError(
                    f"No unpurchased equipment found matching '{item_name}'.",
                    context={"user_id": user_id, "item_name": item_name}
                )
            elif len(matching_items) > 1:
                names = [i["equipment_name"] for i in matching_items[:5]]
                raise ValidationError(
                    f"Multiple items match '{item_name}'. Please be more specific. Matches: {names}",
                    context={"user_id": user_id, "item_name": item_name, "matches": names}
                )

            item_result = type("Result", (), {"data": matching_items[0]})()

        if not item_result.data:
            raise ResourceNotFoundError(
                "Equipment item not found.",
                context={"user_id": user_id, "item_id": item_id}
            )

        item = item_result.data
        item_id = item["id"]

        if item.get("is_acquired"):
            return {
                "success": True,
                "message": f"'{item['equipment_name']}' was already marked as purchased.",
                "already_purchased": True
            }

        # Update item
        update_data = {
            "is_acquired": True,
            "acquired_at": purchase_date or datetime.utcnow().date().isoformat(),
            "updated_at": datetime.utcnow().isoformat()
        }

        if actual_cost is not None:
            update_data["actual_cost"] = actual_cost

        updated_item = await safe_db_update("transition_equipment", item_id, update_data, user_id)

        # Get updated stats
        equip_result = supabase.table("transition_equipment")\
            .select("estimated_cost, actual_cost, is_acquired")\
            .eq("user_id", user_id)\
            .execute()

        equipment = equip_result.data or []
        total_items = len(equipment)
        acquired = [e for e in equipment if e.get("is_acquired")]
        acquired_count = len(acquired)

        total_estimated = sum(e.get("estimated_cost", 0) or 0 for e in equipment)
        total_spent = sum(e.get("actual_cost", 0) or 0 for e in acquired)
        remaining_budget = total_estimated - total_spent

        logger.info(f"Marked equipment '{item['equipment_name']}' as purchased for user {user_id}")

        message = f"Marked '{item['equipment_name']}' as purchased"
        if actual_cost is not None:
            savings = (item.get("estimated_cost", 0) or 0) - actual_cost
            message += f" for ${actual_cost:.2f}"
            if savings > 0:
                message += f" (saved ${savings:.2f} vs estimate!)"
            elif savings < 0:
                message += f" (${abs(savings):.2f} over estimate)"

        message += f". {acquired_count}/{total_items} items acquired. ${total_spent:.2f} spent, ${remaining_budget:.2f} remaining in budget."

        return {
            "success": True,
            "item": updated_item,
            "stats": {
                "total_items": total_items,
                "acquired": acquired_count,
                "remaining_items": total_items - acquired_count,
                "total_estimated": total_estimated,
                "total_spent": total_spent,
                "remaining_budget": remaining_budget
            },
            "message": message
        }

    except ValidationError:
        raise
    except ResourceNotFoundError:
        raise
    except DatabaseError:
        raise
    except Exception as e:
        logger.error(
            f"Unexpected error marking equipment purchased",
            extra={"user_id": user_id, "item_id": item_id, "item_name": item_name},
            exc_info=True
        )
        raise DatabaseError(
            "Failed to mark equipment as purchased",
            context={"user_id": user_id, "item_id": item_id, "error": str(e)}
        )


async def get_equipment_list(
    user_id: str,
    category: Optional[str] = None,
    show_purchased: bool = True
) -> Dict[str, Any]:
    """
    Get equipment inventory and budget status.

    Args:
        user_id: The user's ID
        category: Filter by category (optional)
        show_purchased: Whether to include already-purchased items

    Returns:
        Dict with equipment list and budget summary

    Raises:
        ValidationError: Invalid input parameters
        DatabaseError: Database operation failed

    Example:
        User: "What equipment do I still need?"
        User: "Show me my power equipment"
        User: "What's my equipment budget status?"
    """
    try:
        validate_uuid(user_id, "user_id")

        if category and category not in VALID_CATEGORIES:
            raise ValidationError(
                f"Invalid category. Must be one of: {', '.join(VALID_CATEGORIES)}",
                context={"category": category, "valid_categories": VALID_CATEGORIES}
            )

        supabase = get_supabase_client()

        # Build query
        query = supabase.table("transition_equipment")\
            .select("*")\
            .eq("user_id", user_id)

        if category and category in VALID_CATEGORIES:
            query = query.eq("equipment_category", category)

        if not show_purchased:
            query = query.eq("is_acquired", False)

        query = query.order("priority", desc=False)\
            .order("equipment_category")

        result = query.execute()
        items = result.data or []

        # Calculate stats
        total_estimated = 0
        total_spent = 0
        by_category = {}
        acquired_count = 0

        for item in items:
            cat = item.get("equipment_category", "other")
            estimated = item.get("estimated_cost", 0) or 0
            actual = item.get("actual_cost", 0) or 0 if item.get("is_acquired") else 0

            total_estimated += estimated
            total_spent += actual

            if cat not in by_category:
                by_category[cat] = {"count": 0, "acquired": 0, "estimated": 0, "spent": 0}

            by_category[cat]["count"] += 1
            by_category[cat]["estimated"] += estimated

            if item.get("is_acquired"):
                acquired_count += 1
                by_category[cat]["acquired"] += 1
                by_category[cat]["spent"] += actual

        remaining_items = len(items) - acquired_count
        remaining_budget = total_estimated - total_spent

        message = f"You have {len(items)} equipment items"
        if not show_purchased:
            message = f"You have {len(items)} items remaining to purchase"
        else:
            message += f" ({acquired_count} purchased, {remaining_items} remaining)"

        message += f". Total budget: ${total_estimated:.2f}, spent: ${total_spent:.2f}, remaining: ${remaining_budget:.2f}."

        return {
            "success": True,
            "items": items,
            "count": len(items),
            "stats": {
                "total_items": len(items),
                "acquired": acquired_count,
                "remaining": remaining_items,
                "total_estimated": total_estimated,
                "total_spent": total_spent,
                "remaining_budget": remaining_budget,
                "by_category": by_category
            },
            "message": message
        }

    except ValidationError:
        raise
    except DatabaseError:
        raise
    except Exception as e:
        logger.error(
            f"Unexpected error getting equipment list",
            extra={"user_id": user_id, "category": category},
            exc_info=True
        )
        raise DatabaseError(
            "Failed to retrieve equipment list",
            context={"user_id": user_id, "error": str(e)}
        )
