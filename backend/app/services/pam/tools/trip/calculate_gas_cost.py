"""Calculate Gas Cost Tool for PAM

Estimate fuel costs for a trip based on distance and vehicle MPG
"""

import logging
from typing import Any, Dict, Optional
import os
from decimal import Decimal, ROUND_HALF_UP
from pydantic import ValidationError
from supabase import create_client, Client
from .unit_conversion import (
    get_user_unit_preference,
    format_gas_cost_response,
    convert_km_to_miles
)
from app.services.external.eia_gas_prices import get_fuel_price_for_region
from app.services.pam.schemas.trip import CalculateGasCostInput
from app.services.pam.tools.exceptions import (
    ValidationError as CustomValidationError,
    DatabaseError,
    ResourceNotFoundError,
)
from app.services.pam.tools.utils import (
    validate_uuid,
    validate_positive_number,
    safe_db_select,
)

logger = logging.getLogger(__name__)

DEFAULT_RV_MPG = 10.0
GALLONS_TO_LITERS = 3.78541


async def _detect_user_region(user_id: str) -> str:
    """
    Detect user's region from their settings

    Args:
        user_id: User's UUID

    Returns:
        Region code (US, CA, AU, UK, NZ, EU)

    Raises:
        ValidationError: Invalid user_id format
        DatabaseError: Database query failed
    """
    try:
        validate_uuid(user_id, "user_id")

        supabase: Client = create_client(
            os.getenv("SUPABASE_URL"),
            os.getenv("SUPABASE_SERVICE_ROLE_KEY")
        )

        response = await safe_db_select(
            "user_settings",
            filters={"user_id": user_id},
            columns="regional_preferences",
            single=True
        )

        if response and response.get("regional_preferences"):
            prefs = response["regional_preferences"]

            currency = prefs.get("currency", "USD")
            if currency == "CAD":
                return "CA"
            elif currency == "AUD":
                return "AU"
            elif currency == "GBP":
                return "UK"
            elif currency == "NZD":
                return "NZ"
            elif currency == "EUR":
                return "EU"
            else:
                return "US"

        return "US"

    except CustomValidationError:
        raise
    except DatabaseError:
        raise
    except Exception as e:
        logger.warning(
            f"Could not detect user region, using default",
            extra={"user_id": user_id, "error": str(e)}
        )
        return "US"


async def calculate_gas_cost(
    user_id: str,
    distance_miles: Optional[float] = None,
    distance_km: Optional[float] = None,
    mpg: Optional[float] = None,
    gas_price: Optional[float] = None,
    **kwargs
) -> Dict[str, Any]:
    """
    Calculate estimated gas cost for a trip

    Args:
        user_id: UUID of the user
        distance_miles: Trip distance in miles (preferred for internal use)
        distance_km: Trip distance in kilometers (auto-converted to miles)
        mpg: Vehicle miles per gallon (uses stored vehicle data if not provided)
        gas_price: Price per gallon (default: $3.50)

    Returns:
        Dict with gas cost estimate formatted in user's preferred units

    Raises:
        ValidationError: Invalid input parameters
        DatabaseError: Database operation failed
        ResourceNotFoundError: Vehicle data not found
    """
    try:
        validate_uuid(user_id, "user_id")

        if distance_miles is not None:
            validate_positive_number(distance_miles, "distance_miles")
        if distance_km is not None:
            validate_positive_number(distance_km, "distance_km")
        if mpg is not None:
            validate_positive_number(mpg, "mpg")
        if gas_price is not None:
            validate_positive_number(gas_price, "gas_price")

        try:
            validated = CalculateGasCostInput(
                user_id=user_id,
                distance_miles=distance_miles,
                distance_km=distance_km,
                mpg=mpg,
                gas_price=gas_price
            )
        except ValidationError as e:
            error_msg = e.errors()[0]['msg']
            raise CustomValidationError(
                f"Invalid input: {error_msg}",
                context={"validation_errors": e.errors()}
            )

        # Handle distance input (accept either miles or km, convert to miles internally)
        if validated.distance_km is not None:
            distance_miles = convert_km_to_miles(validated.distance_km)
        else:
            distance_miles = validated.distance_miles

        if validated.mpg is None:
            try:
                vehicle_response = await safe_db_select(
                    "vehicles",
                    filters={"user_id": validated.user_id, "is_primary": True},
                    columns="fuel_consumption_mpg, name",
                    single=True
                )

                if vehicle_response and vehicle_response.get("fuel_consumption_mpg"):
                    mpg = float(vehicle_response["fuel_consumption_mpg"])
                    vehicle_name = vehicle_response.get("name", "your vehicle")
                    logger.info(f"Using stored fuel consumption: {mpg} MPG from {vehicle_name}")
                else:
                    mpg = DEFAULT_RV_MPG
                    logger.info(f"No stored fuel consumption found, using default: {mpg} MPG")
            except DatabaseError as e:
                logger.warning(
                    f"Could not fetch vehicle fuel consumption, using default",
                    extra={"user_id": validated.user_id, "error": str(e)}
                )
                mpg = DEFAULT_RV_MPG
        else:
            mpg = validated.mpg

        if validated.gas_price is None:
            region = await _detect_user_region(validated.user_id)
            fuel_price_data = await get_fuel_price_for_region(region, "regular")

            if region == "US":
                gas_price = fuel_price_data["price"]
            else:
                price_per_gallon = fuel_price_data["price"] * GALLONS_TO_LITERS
                gas_price = price_per_gallon

            logger.info(
                f"Using {region} fuel price: {fuel_price_data['price']:.2f} "
                f"{fuel_price_data['currency']}/{fuel_price_data['unit']} "
                f"(source: {fuel_price_data['source']})"
            )
            gas_price = price_per_gallon if region != "US" else fuel_price_data["price"]
        else:
            gas_price = validated.gas_price

        distance_decimal = Decimal(str(distance_miles))
        mpg_decimal = Decimal(str(mpg))
        gas_price_decimal = Decimal(str(gas_price))

        gallons_needed = distance_decimal / mpg_decimal
        total_cost = gallons_needed * gas_price_decimal
        cost_per_mile = total_cost / distance_decimal

        logger.info(f"Calculated gas cost: ${total_cost:.2f} for {distance_miles} miles for user {validated.user_id}")

        unit_system = await get_user_unit_preference(validated.user_id)

        message = format_gas_cost_response(
            distance_miles=distance_miles,
            mpg=mpg,
            gallons_needed=gallons_needed,
            total_cost=total_cost,
            unit_system=unit_system,
            gas_price=gas_price
        )

        total_cost_rounded = float(total_cost.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP))
        gas_price_rounded = float(gas_price_decimal.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP))
        gallons_rounded = float(gallons_needed.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP))
        cost_per_mile_rounded = float(cost_per_mile.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP))

        return {
            "success": True,
            "distance_miles": distance_miles,
            "mpg": mpg,
            "gas_price_per_gallon": gas_price_rounded,
            "price_per_gallon": gas_price_rounded,
            "gallons_needed": gallons_rounded,
            "total_cost": total_cost_rounded,
            "cost_estimate": total_cost_rounded,
            "cost_per_mile": cost_per_mile_rounded,
            "message": message
        }

    except CustomValidationError:
        raise
    except DatabaseError:
        raise
    except ResourceNotFoundError:
        raise
    except Exception as e:
        logger.error(
            f"Unexpected error calculating gas cost",
            extra={"user_id": user_id},
            exc_info=True
        )
        raise DatabaseError(
            "Failed to calculate gas cost",
            context={"user_id": user_id, "error": str(e)}
        )
