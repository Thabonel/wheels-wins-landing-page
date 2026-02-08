"""Unit Conversion Utilities for PAM Trip Tools

Handles conversion between imperial (US) and metric (international) units
based on user preferences stored in user_settings.regional_preferences
"""

import logging
from typing import Literal
from app.core.database import get_supabase_client

logger = logging.getLogger(__name__)

# Conversion constants
MILES_TO_KM = 1.60934
KM_TO_MILES = 0.621371
MPG_TO_L100KM_FACTOR = 235.214
GALLONS_TO_LITERS = 3.78541


UnitSystem = Literal["imperial", "metric"]


async def get_user_unit_preference(user_id: str) -> UnitSystem:
    """
    Get user's preferred unit system from database

    Args:
        user_id: UUID of the user

    Returns:
        "imperial" for US users (miles, MPG, gallons)
        "metric" for international users (km, L/100km, liters)
    """
    try:
        supabase = get_supabase_client()

        # Get user's regional preferences
        response = supabase.table("user_settings").select(
            "regional_preferences"
        ).eq("user_id", user_id).single().execute()

        if response.data and response.data.get("regional_preferences"):
            prefs = response.data["regional_preferences"]
            units = prefs.get("units", "imperial")
            logger.info(f"User {user_id} unit preference: {units}")
            return units

        # Default to imperial if no preference set
        logger.info(f"No unit preference found for user {user_id}, defaulting to imperial")
        return "imperial"

    except Exception as e:
        logger.warning(f"Could not fetch unit preference for user {user_id}: {e}")
        return "imperial"  # Safe default


def convert_miles_to_km(miles: float) -> float:
    """Convert miles to kilometers"""
    return round(miles * MILES_TO_KM, 2)


def convert_km_to_miles(km: float) -> float:
    """Convert kilometers to miles"""
    return round(km * KM_TO_MILES, 2)


def convert_mpg_to_l_per_100km(mpg: float) -> float:
    """Convert miles per gallon to liters per 100km"""
    if mpg <= 0:
        raise ValueError("MPG must be positive")
    return round(MPG_TO_L100KM_FACTOR / mpg, 2)


def convert_l_per_100km_to_mpg(l_per_100km: float) -> float:
    """Convert liters per 100km to miles per gallon"""
    if l_per_100km <= 0:
        raise ValueError("Liters per 100km must be positive")
    return round(MPG_TO_L100KM_FACTOR / l_per_100km, 2)


def convert_gallons_to_liters(gallons: float) -> float:
    """Convert gallons to liters"""
    return round(gallons * GALLONS_TO_LITERS, 2)


def convert_liters_to_gallons(liters: float) -> float:
    """Convert liters to gallons"""
    return round(liters / GALLONS_TO_LITERS, 2)


def format_distance(
    distance_miles: float,
    unit_system: UnitSystem,
    include_unit: bool = True
) -> str:
    """
    Format distance in user's preferred units

    Args:
        distance_miles: Distance in miles (internal storage format)
        unit_system: User's preferred unit system
        include_unit: Whether to include the unit label

    Returns:
        Formatted string like "100 miles" or "160.9 km"
    """
    if unit_system == "metric":
        distance_km = convert_miles_to_km(distance_miles)
        return f"{distance_km} km" if include_unit else str(distance_km)
    else:
        return f"{distance_miles} miles" if include_unit else str(distance_miles)


def format_fuel_consumption(
    mpg: float,
    unit_system: UnitSystem,
    include_unit: bool = True
) -> str:
    """
    Format fuel consumption in user's preferred units

    Args:
        mpg: Fuel consumption in MPG (internal storage format)
        unit_system: User's preferred unit system
        include_unit: Whether to include the unit label

    Returns:
        Formatted string like "25 MPG" or "9.4 L/100km"
    """
    if unit_system == "metric":
        l_per_100km = convert_mpg_to_l_per_100km(mpg)
        return f"{l_per_100km} L/100km" if include_unit else str(l_per_100km)
    else:
        return f"{mpg} MPG" if include_unit else str(mpg)


def format_fuel_volume(
    gallons: float,
    unit_system: UnitSystem,
    include_unit: bool = True
) -> str:
    """
    Format fuel volume in user's preferred units

    Args:
        gallons: Fuel volume in gallons (internal storage format)
        unit_system: User's preferred unit system
        include_unit: Whether to include the unit label

    Returns:
        Formatted string like "20 gallons" or "75.7 liters"
    """
    if unit_system == "metric":
        liters = convert_gallons_to_liters(gallons)
        return f"{liters} liters" if include_unit else str(liters)
    else:
        return f"{gallons} gallons" if include_unit else str(gallons)


def format_gas_cost_response(
    distance_miles: float,
    mpg: float,
    gallons_needed: float,
    total_cost: float,
    unit_system: UnitSystem,
    gas_price: float
) -> str:
    """
    Format gas cost response in user's preferred units

    Args:
        distance_miles: Trip distance in miles
        mpg: Fuel consumption in MPG
        gallons_needed: Gallons needed for trip
        total_cost: Total fuel cost
        unit_system: User's preferred unit system
        gas_price: Price per gallon

    Returns:
        Natural language response in user's preferred units
    """
    if unit_system == "metric":
        distance_km = convert_miles_to_km(distance_miles)
        l_per_100km = convert_mpg_to_l_per_100km(mpg)
        liters_needed = convert_gallons_to_liters(gallons_needed)
        price_per_liter = gas_price / GALLONS_TO_LITERS

        return (
            f"Estimated gas cost: ${total_cost:.2f} for {distance_km} km "
            f"({liters_needed:.1f} liters at {l_per_100km} L/100km, "
            f"${price_per_liter:.2f}/liter)"
        )
    else:
        return (
            f"Estimated gas cost: ${total_cost:.2f} for {distance_miles} miles "
            f"({gallons_needed:.1f} gallons at {mpg} MPG, ${gas_price:.2f}/gallon)"
        )
