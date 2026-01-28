"""
PAM Fuel Log Tools

Tools for fuel tracking with smart calculations.
"""

from .fuel_crud import (
    add_fuel_entry,
    update_fuel_entry,
    delete_fuel_entry,
    get_fuel_stats,
)

__all__ = [
    "add_fuel_entry",
    "update_fuel_entry",
    "delete_fuel_entry",
    "get_fuel_stats",
]
