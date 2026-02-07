"""
PAM Fuel CRUD Tools

Create, update, delete fuel entries with smart calculations.
"""

import logging
from typing import Dict, Any, Optional
from datetime import datetime, date, timedelta

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
    safe_db_delete,
    safe_db_select,
)

logger = logging.getLogger(__name__)


async def add_fuel_entry(
    user_id: str,
    odometer: float,
    volume: Optional[float] = None,
    price: Optional[float] = None,
    total: Optional[float] = None,
    entry_date: Optional[str] = None,
    filled_to_top: bool = True,
    station: Optional[str] = None,
    notes: Optional[str] = None,
    receipt_url: Optional[str] = None,
    receipt_metadata: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """
    Add a fuel log entry with smart calculation.

    Provide any 2 of 3 (volume, price, total) and the third will be calculated.

    Args:
        user_id: The user's ID
        odometer: Current odometer reading
        volume: Liters/gallons filled
        price: Price per liter/gallon
        total: Total cost
        entry_date: Fill-up date (YYYY-MM-DD, defaults to today)
        filled_to_top: Was the tank filled completely? (affects consumption calc)
        station: Gas station name/location
        notes: Additional notes

    Returns:
        Dict with created entry and consumption info

    Raises:
        ValidationError: Invalid input parameters
        DatabaseError: Database operation failed

    Example:
        User: "I just filled up - 45 liters for $67.50"
        User: "Filled 50 liters at $1.45 per liter"
        User: "Put $80 of gas at $1.60 per liter"
    """
    try:
        validate_uuid(user_id, "user_id")
        validate_positive_number(odometer, "odometer")

        if entry_date:
            validate_date_format(entry_date, "entry_date")

        provided = sum(x is not None for x in [volume, price, total])

        if provided < 2:
            raise ValidationError(
                "Please provide at least 2 of: volume, price per unit, total cost",
                context={
                    "missing": {
                        "volume": volume is None,
                        "price": price is None,
                        "total": total is None
                    }
                }
            )

        if provided == 2:
            if volume is None and price and total:
                volume = total / price
            elif price is None and volume and total:
                price = total / volume
            elif total is None and volume and price:
                total = volume * price

        volume = round(volume, 2)
        price = round(price, 3)
        total = round(total, 2)

        supabase = get_supabase_client()

        consumption = None
        consumption_note = None

        if filled_to_top:
            prev_result = supabase.table("fuel_log")\
                .select("*")\
                .eq("user_id", user_id)\
                .eq("filled_to_top", True)\
                .lt("odometer", odometer)\
                .order("odometer", desc=True)\
                .limit(1)\
                .execute()

            if prev_result.data:
                prev_entry = prev_result.data[0]
                distance = odometer - prev_entry["odometer"]
                if distance > 0:
                    consumption = round((volume / distance) * 100, 1)
                    consumption_note = f"Calculated from last fill-up at {prev_entry['odometer']:,.0f} km ({distance:,.0f} km driven)"

        if not entry_date:
            entry_date = date.today().isoformat()

        record_data = {
            "user_id": user_id,
            "date": entry_date,
            "odometer": odometer,
            "volume": volume,
            "price": price,
            "total": total,
            "filled_to_top": filled_to_top,
            "consumption": consumption,
        }

        if station:
            record_data["station"] = station
        if notes:
            record_data["notes"] = notes
        if receipt_url:
            record_data["receipt_url"] = receipt_url
        if receipt_metadata:
            record_data["receipt_metadata"] = receipt_metadata

        entry = await safe_db_insert("fuel_log", record_data, user_id)

        logger.info(f"Added fuel entry for user {user_id}: {volume}L @ ${price}/L")

        message = f"Logged: {volume}L at ${price}/L = ${total:.2f}"
        if odometer:
            message += f" at {odometer:,.0f} km"

        response = {
            "success": True,
            "entry_id": entry.get("id"),
            "entry": entry,
            "calculated": {
                "volume": volume,
                "price": price,
                "total": total
            },
            "message": message
        }

        if consumption:
            response["consumption"] = f"{consumption} L/100km"
            response["consumption_note"] = consumption_note
            response["message"] += f". Consumption: {consumption} L/100km"
        elif not filled_to_top:
            response["message"] += " (partial fill - consumption not calculated)"

        return response

    except ValidationError:
        raise
    except DatabaseError:
        raise
    except Exception as e:
        logger.error(
            f"Unexpected error adding fuel entry",
            extra={"user_id": user_id, "odometer": odometer},
            exc_info=True
        )
        raise DatabaseError(
            "Failed to add fuel entry",
            context={"user_id": user_id, "error": str(e)}
        )


async def update_fuel_entry(
    user_id: str,
    entry_id: Optional[str] = None,
    odometer: Optional[float] = None,
    volume: Optional[float] = None,
    price: Optional[float] = None,
    total: Optional[float] = None,
    entry_date: Optional[str] = None,
    filled_to_top: Optional[bool] = None,
    station: Optional[str] = None,
    notes: Optional[str] = None
) -> Dict[str, Any]:
    """
    Update an existing fuel entry.

    If entry_id is not provided, updates the most recent entry.

    Args:
        user_id: The user's ID
        entry_id: ID of the entry to update (optional, uses latest if not provided)
        odometer: New odometer reading
        volume: New volume
        price: New price per unit
        total: New total cost
        entry_date: New date
        filled_to_top: New filled_to_top value
        station: New station
        notes: New notes

    Returns:
        Dict with updated entry

    Raises:
        ValidationError: Invalid input parameters
        ResourceNotFoundError: Entry not found
        DatabaseError: Database operation failed

    Example:
        User: "Actually that last fill-up was 46 liters, not 45"
        User: "Update the price to $1.48"
    """
    try:
        validate_uuid(user_id, "user_id")

        if entry_id:
            validate_uuid(entry_id, "entry_id")

        if odometer is not None:
            validate_positive_number(odometer, "odometer")

        if entry_date:
            validate_date_format(entry_date, "entry_date")

        supabase = get_supabase_client()

        if entry_id:
            existing = supabase.table("fuel_log")\
                .select("*")\
                .eq("id", entry_id)\
                .eq("user_id", user_id)\
                .maybeSingle()\
                .execute()
        else:
            existing = supabase.table("fuel_log")\
                .select("*")\
                .eq("user_id", user_id)\
                .order("date", desc=True)\
                .order("created_at", desc=True)\
                .limit(1)\
                .maybeSingle()\
                .execute()

        if not existing.data:
            raise ResourceNotFoundError(
                "No fuel entry found to update",
                context={"user_id": user_id, "entry_id": entry_id}
            )

        entry = existing.data
        entry_id = entry["id"]

        update_data = {}

        if odometer is not None:
            update_data["odometer"] = odometer
        if volume is not None:
            update_data["volume"] = volume
        if price is not None:
            update_data["price"] = price
        if total is not None:
            update_data["total"] = total
        if entry_date is not None:
            update_data["date"] = entry_date
        if filled_to_top is not None:
            update_data["filled_to_top"] = filled_to_top
        if station is not None:
            update_data["station"] = station
        if notes is not None:
            update_data["notes"] = notes

        new_volume = update_data.get("volume", entry.get("volume"))
        new_price = update_data.get("price", entry.get("price"))
        new_total = update_data.get("total", entry.get("total"))

        if "volume" in update_data or "price" in update_data or "total" in update_data:
            if new_volume and new_price:
                update_data["total"] = round(new_volume * new_price, 2)
            elif new_volume and new_total:
                update_data["price"] = round(new_total / new_volume, 3)
            elif new_price and new_total:
                update_data["volume"] = round(new_total / new_price, 2)

        if not update_data:
            raise ValidationError(
                "No updates provided",
                context={"user_id": user_id, "entry_id": entry_id}
            )

        updated = await safe_db_update("fuel_log", entry_id, update_data, user_id)

        logger.info(f"Updated fuel entry {entry_id} for user {user_id}")

        return {
            "success": True,
            "entry": updated,
            "message": f"Updated entry: {updated['volume']}L at ${updated['price']}/L = ${updated['total']:.2f}"
        }

    except ValidationError:
        raise
    except ResourceNotFoundError:
        raise
    except DatabaseError:
        raise
    except Exception as e:
        logger.error(
            f"Unexpected error updating fuel entry",
            extra={"user_id": user_id, "entry_id": entry_id},
            exc_info=True
        )
        raise DatabaseError(
            "Failed to update fuel entry",
            context={"user_id": user_id, "entry_id": entry_id, "error": str(e)}
        )


async def delete_fuel_entry(
    user_id: str,
    entry_id: Optional[str] = None,
    confirm: bool = False
) -> Dict[str, Any]:
    """
    Delete a fuel entry.

    If entry_id is not provided, targets the most recent entry.
    Requires confirmation.

    Args:
        user_id: The user's ID
        entry_id: ID of the entry to delete (optional, uses latest)
        confirm: Must be True to actually delete

    Returns:
        Dict with deletion status

    Raises:
        ValidationError: Invalid input parameters or missing confirmation
        ResourceNotFoundError: Entry not found
        DatabaseError: Database operation failed

    Example:
        User: "Delete my last fuel entry"
        PAM: "Delete the entry from Jan 29 (45L, $67.50)?"
        User: "Yes"
    """
    try:
        validate_uuid(user_id, "user_id")

        if entry_id:
            validate_uuid(entry_id, "entry_id")

        supabase = get_supabase_client()

        if entry_id:
            existing = supabase.table("fuel_log")\
                .select("*")\
                .eq("id", entry_id)\
                .eq("user_id", user_id)\
                .maybeSingle()\
                .execute()
        else:
            existing = supabase.table("fuel_log")\
                .select("*")\
                .eq("user_id", user_id)\
                .order("date", desc=True)\
                .order("created_at", desc=True)\
                .limit(1)\
                .maybeSingle()\
                .execute()

        if not existing.data:
            raise ResourceNotFoundError(
                "No fuel entry found to delete",
                context={"user_id": user_id, "entry_id": entry_id}
            )

        entry = existing.data
        entry_id = entry["id"]

        if not confirm:
            raise ValidationError(
                f"Delete fuel entry from {entry['date']} ({entry['volume']}L, ${entry['total']:.2f})? This cannot be undone.",
                context={
                    "requires_confirmation": True,
                    "entry": entry
                }
            )

        await safe_db_delete("fuel_log", entry_id, user_id)

        logger.info(f"Deleted fuel entry {entry_id} for user {user_id}")

        return {
            "success": True,
            "deleted_entry": entry,
            "message": f"Deleted fuel entry from {entry['date']}."
        }

    except ValidationError:
        raise
    except ResourceNotFoundError:
        raise
    except DatabaseError:
        raise
    except Exception as e:
        logger.error(
            f"Unexpected error deleting fuel entry",
            extra={"user_id": user_id, "entry_id": entry_id},
            exc_info=True
        )
        raise DatabaseError(
            "Failed to delete fuel entry",
            context={"user_id": user_id, "entry_id": entry_id, "error": str(e)}
        )


async def get_fuel_stats(
    user_id: str,
    period: str = "month"
) -> Dict[str, Any]:
    """
    Get fuel statistics and trends.

    Args:
        user_id: The user's ID
        period: Time period ('week', 'month', 'year', 'all')

    Returns:
        Dict with fuel statistics

    Raises:
        ValidationError: Invalid input parameters
        DatabaseError: Database operation failed

    Example:
        User: "How much have I spent on fuel this month?"
        User: "What's my average fuel consumption?"
        User: "Show my fuel stats"
    """
    try:
        validate_uuid(user_id, "user_id")

        valid_periods = ["week", "month", "year", "all"]
        if period not in valid_periods:
            raise ValidationError(
                f"Invalid period. Must be one of: {', '.join(valid_periods)}",
                context={"period": period, "valid_periods": valid_periods}
            )

        supabase = get_supabase_client()

        today = date.today()
        if period == "week":
            start_date = today - timedelta(days=7)
        elif period == "month":
            start_date = today - timedelta(days=30)
        elif period == "year":
            start_date = today - timedelta(days=365)
        else:
            start_date = None

        query = supabase.table("fuel_log")\
            .select("*")\
            .eq("user_id", user_id)

        if start_date:
            query = query.gte("date", start_date.isoformat())

        query = query.order("date", desc=True)
        result = query.execute()

        entries = result.data or []

        if not entries:
            return {
                "success": True,
                "period": period,
                "message": f"No fuel entries found for the past {period}."
            }

        total_spent = sum(e.get("total", 0) or 0 for e in entries)
        total_volume = sum(e.get("volume", 0) or 0 for e in entries)
        fill_ups = len(entries)

        consumptions = [e.get("consumption") for e in entries if e.get("consumption")]
        avg_consumption = round(sum(consumptions) / len(consumptions), 1) if consumptions else None
        best_consumption = min(consumptions) if consumptions else None
        worst_consumption = max(consumptions) if consumptions else None

        prices = [e.get("price") for e in entries if e.get("price")]
        avg_price = round(sum(prices) / len(prices), 3) if prices else None

        message_parts = [f"Over the past {period}:"]
        message_parts.append(f"${total_spent:.2f} spent on {total_volume:.0f}L across {fill_ups} fill-ups.")

        if avg_consumption:
            message_parts.append(f"Average consumption: {avg_consumption} L/100km.")
            if best_consumption != worst_consumption:
                message_parts.append(f"Range: {best_consumption} (best) to {worst_consumption} (worst) L/100km.")

        if avg_price:
            message_parts.append(f"Average price: ${avg_price}/L.")

        return {
            "success": True,
            "period": period,
            "stats": {
                "total_spent": round(total_spent, 2),
                "total_volume": round(total_volume, 1),
                "fill_ups": fill_ups,
                "average_consumption": avg_consumption,
                "best_consumption": best_consumption,
                "worst_consumption": worst_consumption,
                "average_price": avg_price
            },
            "entries": entries[:5],
            "message": " ".join(message_parts)
        }

    except ValidationError:
        raise
    except DatabaseError:
        raise
    except Exception as e:
        logger.error(
            f"Unexpected error getting fuel stats",
            extra={"user_id": user_id, "period": period},
            exc_info=True
        )
        raise DatabaseError(
            "Failed to retrieve fuel statistics",
            context={"user_id": user_id, "period": period, "error": str(e)}
        )
