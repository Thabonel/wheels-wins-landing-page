"""
Pam V2 tool policy engine.

Deterministic authorization and approval decisions. No model participates in
policy decisions; the model only proposes tool calls.
"""

from __future__ import annotations

from typing import Optional

from .types import ToolCall, ToolContext, ToolEffect, ToolRisk, ToolScope, ToolSpec, ApprovalPolicy


def requires_approval(tool: ToolSpec) -> bool:
    """Return True if the tool requires explicit user approval."""
    if tool.approval_policy == ApprovalPolicy.EXPLICIT:
        return True
    if tool.effect in (ToolEffect.WRITE, ToolEffect.DELETE):
        return True
    if tool.risk in (ToolRisk.HIGH, ToolRisk.MEDIUM) and tool.scope != ToolScope.OWN:
        return True
    return False


def authorize_tool(
    tool: ToolSpec,
    context: ToolContext,
    target_user_id: Optional[str] = None,
) -> None:
    """
    Raise PermissionError if the tool is not authorized for this context.

    Rules:
    - OWN-scope tools may only access the calling user's data.
    - SHARED-scope tools require target_user_id == context.user_id unless admin.
    - ADMIN-scope tools require an admin role (not implemented here; always deny for users).
    """
    if tool.scope == ToolScope.ADMIN:
        raise PermissionError(f"Tool {tool.name} requires admin privileges")

    if tool.scope == ToolScope.OWN:
        if target_user_id is not None and target_user_id != context.user_id:
            raise PermissionError(
                f"Tool {tool.name} cannot access user {target_user_id}'s data"
            )

    # SHARED scope allows same-user access by default; cross-user checks are
    # enforced by application services, not the policy engine.


def can_retry(tool: ToolSpec, attempt: int) -> bool:
    """Return True if a failed execution may be retried."""
    return tool.idempotent and attempt < tool.max_retries


def audit_event(
    tool: ToolSpec,
    call: ToolCall,
    context: ToolContext,
    approved: bool,
) -> dict:
    """Return a safe audit record (no secrets or PII beyond user_id)."""
    return {
        "tool_name": tool.name,
        "namespace": tool.namespace,
        "effect": tool.effect.value,
        "risk": tool.risk.value,
        "user_id": context.user_id,
        "trace_id": context.trace_id,
        "conversation_id": context.conversation_id,
        "approved": approved,
    }
