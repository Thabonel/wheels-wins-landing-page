"""Create Vehicle Tool for PAM

Allows users to create a vehicle record via natural language

Example usage:
- "Add my 2019 RAM 1500 truck"
- "Create a vehicle for my RV"
- "I have a 2022 Ford F-350"

Amendment #4: Input validation with Pydantic models
"""

import logging
from typing import Any, Dict, Optional
from datetime import datetime
from pydantic import ValidationError as PydanticValidationError

from app.integrations.supabase import get_supabase_client
from app.services.pam.schemas.profile import CreateVehicleInput
from app.services.pam.tools.exceptions import (
    ValidationError,
    DatabaseError,
    ResourceNotFoundError,
)
from app.services.pam.tools.utils import (
    validate_uuid,
    safe_db_insert,
    safe_db_update,
)

logger = logging.getLogger(__name__)


async def create_vehicle(
    user_id: str,
    name: str,
    make: Optional[str] = None,
    model: Optional[str] = None,
    year: Optional[int] = None,
    vehicle_type: str = "rv",
    fuel_type: str = "gasoline",
    set_as_primary: bool = True,
    **kwargs
) -> Dict[str, Any]:
    """
    Create a new vehicle record for the user

    Args:
        user_id: UUID of the user
        name: Vehicle nickname (e.g., "My RV", "Blue Truck")
        make: Manufacturer (e.g., "Ford", "RAM", "Winnebago")
        model: Model name (e.g., "F-350", "1500", "Vista")
        year: Year of manufacture
        vehicle_type: Type of vehicle (rv, motorhome, truck, car, etc.)
        fuel_type: Type of fuel (gasoline, diesel, electric, hybrid, propane)
        set_as_primary: Make this the primary vehicle (default: True)

    Returns:
        Dict with created vehicle data

    Raises:
        ValidationError: Invalid input parameters
        DatabaseError: Database operation failed
    """
    try:
        validate_uuid(user_id, "user_id")

        try:
            validated = CreateVehicleInput(
                user_id=user_id,
                name=name,
                make=make,
                model=model,
                year=year,
                vehicle_type=vehicle_type,
                fuel_type=fuel_type,
                set_as_primary=set_as_primary
            )
        except PydanticValidationError as e:
            error_msg = e.errors()[0]['msg']
            raise ValidationError(
                f"Invalid input: {error_msg}",
                context={"validation_errors": e.errors()}
            )

        if validated.set_as_primary:
            try:
                supabase = get_supabase_client()
                supabase.table("vehicles").update({
                    "is_primary": False
                }).eq("user_id", validated.user_id).eq("is_primary", True).execute()
                logger.info(f"Unset previous primary vehicles for user {validated.user_id}")
            except Exception as e:
                logger.warning(
                    f"Could not unset primary vehicles",
                    extra={"user_id": validated.user_id},
                    exc_info=True
                )

        vehicle_data = {
            "user_id": validated.user_id,
            "name": validated.name,
            "is_primary": validated.set_as_primary,
            "vehicle_type": validated.vehicle_type.value,
            "fuel_type": validated.fuel_type.value,
            "created_at": datetime.utcnow().isoformat(),
            "updated_at": datetime.utcnow().isoformat()
        }

        if validated.make:
            vehicle_data["make"] = validated.make
        if validated.model:
            vehicle_data["model"] = validated.model
        if validated.year:
            vehicle_data["year"] = validated.year

        vehicle = await safe_db_insert("vehicles", vehicle_data, user_id)

        logger.info(f"Created vehicle {vehicle['id']} for user {validated.user_id}: {validated.name}")

        vehicle_description = validated.name
        if validated.make and validated.model:
            vehicle_description = f"{validated.year or ''} {validated.make} {validated.model}".strip()
        elif validated.make:
            vehicle_description = f"{validated.make} ({validated.name})"

        return {
            "success": True,
            "vehicle_id": vehicle["id"],
            "name": vehicle["name"],
            "make": vehicle.get("make"),
            "model": vehicle.get("model"),
            "year": vehicle.get("year"),
            "vehicle_type": vehicle.get("vehicle_type"),
            "is_primary": vehicle["is_primary"],
            "message": f"Great! I've added your {vehicle_description} to your garage. " +
                      (f"This is now your primary vehicle. " if validated.set_as_primary else "") +
                      f"You can now tell me the fuel consumption for trip cost calculations."
        }

    except ValidationError:
        raise
    except DatabaseError:
        raise
    except Exception as e:
        logger.error(
            f"Unexpected error creating vehicle",
            extra={"user_id": user_id, "name": name},
            exc_info=True
        )
        raise DatabaseError(
            "Failed to create vehicle",
            context={"user_id": user_id, "error": str(e)}
        )
