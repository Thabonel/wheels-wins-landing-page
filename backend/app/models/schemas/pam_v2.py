"""
Pam V2 request/streaming event contracts.

These schemas define the stable, versioned protocol between the Pam V2 frontend
client and backend. They are intentionally provider-neutral: no OpenAI,
Anthropic, or model-specific shapes leak through.
"""

from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Literal, Optional, Union
from uuid import UUID, uuid4

from pydantic import BaseModel, Field, field_validator


PAM_V2_SCHEMA_VERSION = "2026-06-16"


class PamChannel(str, Enum):
    """Supported conversation channels."""

    TEXT = "text"
    VOICE = "voice"


class PamTurnRequestV2(BaseModel):
    """A single user turn sent to /api/v2/pam/turn."""

    conversation_id: str = Field(
        default_factory=lambda: str(uuid4()),
        description="Stable conversation identifier. Created by the client for the first turn.",
    )
    client_message_id: str = Field(
        default_factory=lambda: str(uuid4()),
        description="Client-generated idempotency key for this message.",
    )
    message: str = Field(
        ...,
        min_length=1,
        max_length=4000,
        description="User message content.",
    )
    channel: PamChannel = Field(default=PamChannel.TEXT)
    locale: str = Field(default="en-AU")
    timezone: str = Field(default="Australia/Sydney")
    approval_token: Optional[str] = Field(
        default=None,
        description="Token returned by a previous approval_required event when the user confirms.",
    )

    @field_validator("message")
    @classmethod
    def message_not_only_whitespace(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("message cannot be only whitespace")
        return v


class PamEventBase(BaseModel):
    """Every streamed event carries these fields."""

    event: str = Field(..., description="Discriminator for the event type.")
    schema_version: str = Field(default=PAM_V2_SCHEMA_VERSION)
    trace_id: str = Field(..., description="Opaque trace identifier for observability.")
    sequence: int = Field(
        ...,
        ge=0,
        description="Monotonic sequence number for this turn, starting at 0.",
    )


class TurnStartedEvent(PamEventBase):
    """Sent when the server accepts a turn and begins processing."""

    event: Literal["turn_started"] = "turn_started"
    conversation_id: str
    client_message_id: str


class TextDeltaEvent(PamEventBase):
    """Incremental text output from the model."""

    event: Literal["text_delta"] = "text_delta"
    delta: str = Field(..., description="Incremental text fragment.")


class ToolStartedEvent(PamEventBase):
    """Sent just before a tool is invoked."""

    event: Literal["tool_started"] = "tool_started"
    tool_call_id: str
    tool_name: str
    namespace: str = Field(default="default")


class ToolCompletedEvent(PamEventBase):
    """Sent after a tool finishes, regardless of success."""

    event: Literal["tool_completed"] = "tool_completed"
    tool_call_id: str
    tool_name: str
    status: Literal["success", "error", "blocked"]
    result_summary: Optional[str] = Field(
        default=None,
        description="Human-readable summary safe to show in the UI.",
    )


class ApprovalRequiredEvent(PamEventBase):
    """Sent when a proposed mutation requires explicit user approval."""

    event: Literal["approval_required"] = "approval_required"
    approval_token: str
    action_type: str
    action_summary: str = Field(
        ...,
        description="Exact, human-readable description of the proposed action.",
    )
    expires_at: datetime = Field(
        ...,
        description="ISO 8601 timestamp after which the token is invalid.",
    )


class ActionEvent(PamEventBase):
    """A rendered action for the client to display (e.g. calendar preview)."""

    event: Literal["action"] = "action"
    action_type: str
    payload: Dict[str, Any] = Field(
        default_factory=dict,
        description="Typed payload for the registered action renderer.",
    )


class TurnCompletedEvent(PamEventBase):
    """Sent when the turn is fully complete."""

    event: Literal["turn_completed"] = "turn_completed"
    conversation_id: str
    client_message_id: str
    finish_reason: Literal["completed", "error", "max_iterations", "timeout"]


class ErrorEvent(PamEventBase):
    """Sent when the turn cannot continue. Raw exceptions never appear here."""

    event: Literal["error"] = "error"
    code: str = Field(
        ...,
        description="Stable error code (e.g. invalid_request, runtime_error).",
    )
    message: str = Field(
        ...,
        description="Safe, user-facing or client-facing message.",
    )


PamEventV2 = Union[
    TurnStartedEvent,
    TextDeltaEvent,
    ToolStartedEvent,
    ToolCompletedEvent,
    ApprovalRequiredEvent,
    ActionEvent,
    TurnCompletedEvent,
    ErrorEvent,
]


class PamHealthResponseV2(BaseModel):
    """Response from /api/v2/pam/health."""

    status: Literal["ok", "degraded", "unavailable"] = "ok"
    schema_version: str = PAM_V2_SCHEMA_VERSION
    pam_v2_enabled: bool
    provider: Optional[str] = None
    model: Optional[str] = None
    environment: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)


class PamV2ErrorDetail(BaseModel):
    """Structured error returned for non-streaming failures."""

    error: Literal["error"] = "error"
    code: str
    message: str
    trace_id: Optional[str] = None
    schema_version: str = PAM_V2_SCHEMA_VERSION
