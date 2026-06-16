"""
Pam V2 tool adapters.

Importing this module registers all adapters with the catalog and handler registry.
"""

from . import calendar, community, money, profile, routing, travel, weather

__all__ = ["calendar", "community", "money", "profile", "routing", "travel", "weather"]
