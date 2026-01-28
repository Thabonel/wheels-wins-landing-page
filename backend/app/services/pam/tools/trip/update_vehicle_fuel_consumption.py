"""Update Vehicle Fuel Consumption Tool for PAM

Store user-provided fuel consumption data for accurate trip cost calculations

Example usage:
- "My truck uses 24 liters per 100km"
- "My RV gets 8 miles per gallon"
- "Update fuel consumption to 12 MPG"
"""

import logging
from typing import Any, Dict, Optional
from datetime import datetime
import os
from supabase import create_client, Client
from .unit_conversion import (
    convert_l_per_100km_to_mpg,
    convert_mpg_to_l_per_100km,
    get_user_unit_preference,
    format_fuel_consumption
)
from app.services.pam.tools.exceptions import (
    ValidationError,
    DatabaseError,
    ResourceNotFoundError,
)
from app.services.pam.tools.utils import (
    validate_uuid,
    validate_positive_number,
    safe_db_select,
    safe_db_update,
)

logger = logging.getLogger(__name__)


async def update_vehicle_fuel_consumption(
    user_id: str,
    mpg: Optional[float] = None,
    l_per_100km: Optional[float] = None,
    vehicle_id: Optional[str] = None,
    **kwargs
) -> Dict[str, Any]:
    """
    Update vehicle fuel consumption data

    Args:
        user_id: UUID of the user
        mpg: Fuel consumption in miles per gallon (optional)
        l_per_100km: Fuel consumption in liters per 100km (optional)
        vehicle_id: Specific vehicle ID (uses primary vehicle if not provided)

    Returns:
        Dict with updated fuel consumption data

    Raises:
        ValidationError: Invalid input parameters
        ResourceNotFoundError: Vehicle not found
        DatabaseError: Database operation failed
    """
    try:
        validate_uuid(user_id, "user_id")

        if mpg is None and l_per_100km is None:
            raise ValidationError(
                "Must provide either MPG or liters per 100km",
                context={"mpg": mpg, "l_per_100km": l_per_100km}
            )

        if mpg is not None:
            validate_positive_number(mpg, "mpg")

        if l_per_100km is not None:
            validate_positive_number(l_per_100km, "l_per_100km")

        if vehicle_id:
            validate_uuid(vehicle_id, "vehicle_id")

        if vehicle_id:
            vehicle = await safe_db_select(
                "vehicles",
                filters={"id": vehicle_id, "user_id": user_id},
                columns="*",
                single=True
            )
        else:
            vehicle = await safe_db_select(
                "vehicles",
                filters={"user_id": user_id, "is_primary": True},
                columns="*",
                single=True
            )

        if not vehicle:
            raise ResourceNotFoundError(
                "No vehicle found. Please add a vehicle first.",
                context={"user_id": user_id, "vehicle_id": vehicle_id}
            )

        if mpg is not None:
            fuel_mpg = float(mpg)
            fuel_l_per_100km = convert_mpg_to_l_per_100km(fuel_mpg)
        else:
            fuel_l_per_100km = float(l_per_100km)
            fuel_mpg = convert_l_per_100km_to_mpg(fuel_l_per_100km)

        update_data = {
            "fuel_consumption_mpg": fuel_mpg,
            "fuel_consumption_l_per_100km": fuel_l_per_100km,
            "fuel_consumption_source": "user_provided",
            "fuel_consumption_last_updated": datetime.utcnow().isoformat(),
            "fuel_consumption_sample_size": 1
        }

        updated = await safe_db_update("vehicles", vehicle["id"], update_data, user_id)

        logger.info(f"Updated fuel consumption for vehicle {vehicle['id']}: {fuel_mpg} MPG / {fuel_l_per_100km} L/100km")

        unit_system = await get_user_unit_preference(user_id)
        fuel_consumption_str = format_fuel_consumption(fuel_mpg, unit_system)

        return {
            "success": True,
            "vehicle_id": vehicle["id"],
            "vehicle_name": vehicle.get("name", "Your vehicle"),
            "fuel_consumption_mpg": fuel_mpg,
            "fuel_consumption_l_per_100km": fuel_l_per_100km,
            "message": f"Got it! I've recorded that your {vehicle.get('name', 'vehicle')} uses {fuel_consumption_str}. I'll use this for trip cost calculations."
        }

    except ValidationError:
        raise
    except ResourceNotFoundError:
        raise
    except DatabaseError:
        raise
    except ValueError as e:
        logger.error(
            f"Invalid fuel consumption value",
            extra={"user_id": user_id, "mpg": mpg, "l_per_100km": l_per_100km},
            exc_info=True
        )
        raise ValidationError(
            f"Invalid fuel consumption value: {str(e)}",
            context={"mpg": mpg, "l_per_100km": l_per_100km}
        )
    except Exception as e:
        logger.error(
            f"Unexpected error updating vehicle fuel consumption",
            extra={"user_id": user_id, "vehicle_id": vehicle_id},
            exc_info=True
        )
        raise DatabaseError(
            "Failed to update vehicle fuel consumption",
            context={"user_id": user_id, "vehicle_id": vehicle_id, "error": str(e)}
        )
