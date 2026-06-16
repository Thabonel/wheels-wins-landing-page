"""
Pam V2 canonical tool catalog and executor.
"""

from .adapters import *  # noqa: F401,F403 - registers adapters
from .catalog import ToolCatalog, catalog, get_catalog
from .executor import ToolExecutor, get_executor
from .namespaces import list_namespaces, namespace_description
from .policy import authorize_tool, requires_approval
from .types import (
    ApprovalPolicy,
    ToolCall,
    ToolContext,
    ToolEffect,
    ToolHandler,
    ToolResult,
    ToolRisk,
    ToolScope,
    ToolSpec,
    ToolTimeout,
)

__all__ = [
    "ToolCatalog",
    "ToolExecutor",
    "ToolCall",
    "ToolContext",
    "ToolEffect",
    "ToolHandler",
    "ToolResult",
    "ToolRisk",
    "ToolScope",
    "ToolSpec",
    "ToolTimeout",
    "ApprovalPolicy",
    "authorize_tool",
    "catalog",
    "get_catalog",
    "get_executor",
    "list_namespaces",
    "namespace_description",
    "requires_approval",
]
