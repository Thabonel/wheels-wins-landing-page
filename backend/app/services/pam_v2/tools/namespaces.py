"""
Pam V2 tool namespaces.

Namespaces group related tools so the model runtime can discover a small,
relevant surface instead of every tool at once.
"""

from __future__ import annotations

from typing import List

from .catalog import ToolCatalog, get_catalog


class Namespace:
    """A namespace groups tools by product domain."""

    def __init__(self, name: str, description: str):
        self.name = name
        self.description = description

    def tools(self, catalog: ToolCatalog = None) -> List[str]:
        """Return tool names in this namespace."""
        cat = catalog or get_catalog()
        return [t.name for t in cat.list_namespace(self.name)]


# Defined namespaces (max 10 tools each).
PROFILE = Namespace("profile", "User profile and preferences")
TRAVEL = Namespace("travel", "Routes, places, weather, and trip planning")
CALENDAR = Namespace("calendar", "Calendar events and reminders")
MONEY = Namespace("money", "Budgets, expenses, and financial tools")
COMMUNITY = Namespace("community", "Community content and social tools")

_ALL_NAMESPACES = [PROFILE, TRAVEL, CALENDAR, MONEY, COMMUNITY]


def list_namespaces() -> List[Namespace]:
    """Return all defined namespaces."""
    return _ALL_NAMESPACES[:]


def namespace_description(name: str) -> str:
    """Return the description for a namespace."""
    for ns in _ALL_NAMESPACES:
        if ns.name == name:
            return ns.description
    raise KeyError(f"Unknown namespace: {name}")
