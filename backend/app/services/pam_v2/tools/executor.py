"""
Pam V2 tool executor.

Validates, authorizes, and runs tool calls against the canonical catalog.
All exceptions are converted into safe ToolResult failures.
"""

from __future__ import annotations

import asyncio
from typing import Any, Dict

from pydantic import BaseModel, ValidationError as PydanticValidationError

from .catalog import ToolCatalog, get_catalog
from .policy import audit_event, authorize_tool, can_retry, requires_approval
from .types import ToolCall, ToolContext, ToolResult, ToolSpec


class ToolExecutor:
    """Execute tool calls with policy enforcement and safe failures."""

    def __init__(self, catalog: ToolCatalog):
        self.catalog = catalog

    async def execute(
        self,
        call: ToolCall,
        context: ToolContext,
        approved: bool = False,
    ) -> ToolResult:
        """
        Execute a single tool call.

        Args:
            call: Tool call from the model.
            context: Server-derived execution context.
            approved: True if the user has explicitly approved this call.
        """
        try:
            tool = self.catalog.get(call.tool_name)
        except KeyError as exc:
            return ToolResult(
                success=False,
                error_code="unknown_tool",
                error_message=str(exc),
            )

        if requires_approval(tool) and not approved:
            return ToolResult(
                success=False,
                error_code="approval_required",
                error_message=f"Tool {tool.name} requires explicit approval",
            )

        try:
            authorize_tool(tool, context)
        except PermissionError as exc:
            return ToolResult(
                success=False,
                error_code="unauthorized",
                error_message=str(exc),
            )

        try:
            validated_input = tool.input_schema(**call.arguments)
        except PydanticValidationError as exc:
            return ToolResult(
                success=False,
                error_code="invalid_arguments",
                error_message=exc.errors(include_url=False)[0]["msg"],
            )

        attempt = 0
        while True:
            try:
                handler = _resolve_handler(tool)
                result = await asyncio.wait_for(
                    handler(context, validated_input),
                    timeout=tool.timeout_seconds,
                )
                # Basic audit logging (structured, no secrets).
                _log_audit(tool, call, context, approved=True)
                return result
            except asyncio.TimeoutError:
                return ToolResult(
                    success=False,
                    error_code="tool_timeout",
                    error_message=f"Tool {tool.name} timed out after {tool.timeout_seconds}s",
                )
            except Exception as exc:
                if can_retry(tool, attempt):
                    attempt += 1
                    continue
                return ToolResult(
                    success=False,
                    error_code="tool_error",
                    error_message=f"Tool {tool.name} failed: {type(exc).__name__}",
                )


def _resolve_handler(tool: ToolSpec) -> Any:
    """Return the handler registered for a tool spec."""
    from .handlers import get_handler

    return get_handler(tool.name)


def _log_audit(tool: ToolSpec, call: ToolCall, context: ToolContext, approved: bool) -> None:
    """Emit a safe audit record."""
    record = audit_event(tool, call, context, approved=approved)
    # Use the application's structured logger if available; otherwise print.
    try:
        from app.core.logging import get_logger

        logger = get_logger(__name__)
        logger.info("pam_v2_tool_executed", extra=record)
    except Exception:
        print(record)


def get_executor() -> ToolExecutor:
    """Return an executor backed by the global catalog."""
    return ToolExecutor(get_catalog())
