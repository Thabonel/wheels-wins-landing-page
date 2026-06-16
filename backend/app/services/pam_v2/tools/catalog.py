"""
Pam V2 canonical tool catalog.

A single registry of statically-defined tools. Tools are grouped into
namespaces; the model runtime discovers only the namespace(s) relevant to the
current turn.
"""

from __future__ import annotations

from typing import Dict, List, Optional

from .types import ToolSpec


class ToolCatalog:
    """In-memory catalog of V2 tools."""

    def __init__(self):
        self._tools: Dict[str, ToolSpec] = {}
        self._namespaces: Dict[str, List[str]] = {}

    def register(self, tool: ToolSpec) -> "ToolCatalog":
        """Register a tool. Re-registration of the same name is an error."""
        if tool.name in self._tools:
            raise ValueError(f"Tool {tool.name} is already registered")
        self._tools[tool.name] = tool
        self._namespaces.setdefault(tool.namespace, []).append(tool.name)
        return self

    def get(self, name: str) -> ToolSpec:
        """Return a tool by name."""
        if name not in self._tools:
            raise KeyError(f"Unknown tool: {name}")
        return self._tools[name]

    def list_namespaces(self) -> List[str]:
        """Return all namespace names."""
        return sorted(self._namespaces.keys())

    def list_namespace(self, namespace: str) -> List[ToolSpec]:
        """Return all tools in a namespace."""
        names = self._namespaces.get(namespace, [])
        return [self._tools[name] for name in names]

    def all_tools(self) -> List[ToolSpec]:
        """Return all registered tools."""
        return list(self._tools.values())

    def has_tool(self, name: str) -> bool:
        """Return True if the tool is registered."""
        return name in self._tools


# Global catalog instance populated by adapters at import time.
catalog = ToolCatalog()


def get_catalog() -> ToolCatalog:
    """Return the global tool catalog."""
    return catalog
