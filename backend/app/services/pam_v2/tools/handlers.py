"""
Handler registry for Pam V2 tools.

Adapters register their implementations here via @register_handler.
"""

from __future__ import annotations

from typing import Any, Awaitable, Callable, Dict

from pydantic import BaseModel

from .types import ToolContext, ToolResult


Handler = Callable[[ToolContext, BaseModel], Awaitable[ToolResult]]

_HANDLERS: Dict[str, Handler] = {}


def register_handler(tool_name: str) -> Callable[[Handler], Handler]:
    """Decorator to register a handler for a tool name."""

    def decorator(func: Handler) -> Handler:
        if tool_name in _HANDLERS:
            raise ValueError(f"Handler already registered for {tool_name}")
        _HANDLERS[tool_name] = func
        return func

    return decorator


def get_handler(tool_name: str) -> Handler:
    """Return the registered handler for a tool name."""
    if tool_name not in _HANDLERS:
        raise KeyError(f"No handler registered for {tool_name}")
    return _HANDLERS[tool_name]
