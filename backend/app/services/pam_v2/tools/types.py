"""
Core types for the Pam V2 canonical tool catalog and policy engine.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Awaitable, Callable, Dict, List, Optional, Type

from pydantic import BaseModel, Field


class ToolEffect(str, Enum):
    """Effect classification for a tool."""

    READ = "read"
    WRITE = "write"
    DELETE = "delete"
    NOTIFY = "notify"


class ToolRisk(str, Enum):
    """Risk classification for a tool."""

    NONE = "none"
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"


class ToolScope(str, Enum):
    """Scope of data a tool can access."""

    OWN = "own"
    SHARED = "shared"
    PUBLIC = "public"
    ADMIN = "admin"


class ApprovalPolicy(str, Enum):
    """Approval policy for a tool."""

    NONE = "none"
    EXPLICIT = "explicit"


class ToolTimeout(str, Enum):
    """Timeout presets."""

    FAST = 5
    NORMAL = 15
    SLOW = 30


@dataclass(frozen=True)
class ToolSpec:
    """Static definition of a V2 tool."""

    name: str
    description: str
    namespace: str
    input_schema: Type[BaseModel]
    output_schema: Type[BaseModel]
    effect: ToolEffect
    risk: ToolRisk
    scope: ToolScope
    approval_policy: ApprovalPolicy
    timeout_seconds: int = ToolTimeout.NORMAL
    max_retries: int = 0
    idempotent: bool = False
    examples: List[Dict[str, Any]] = field(default_factory=list)

    def __post_init__(self):
        if self.max_retries > 0 and not self.idempotent:
            raise ValueError(f"Tool {self.name}: retries require idempotency")


@dataclass(frozen=True)
class ToolContext:
    """Server-derived context passed to every tool execution."""

    user_id: str
    trace_id: str
    conversation_id: str
    client_message_id: str
    locale: str = "en-AU"
    timezone: str = "Australia/Sydney"
    request_context: Dict[str, Any] = field(default_factory=dict)


@dataclass(frozen=True)
class ToolResult:
    """Normalized result from a tool execution."""

    success: bool
    data: Dict[str, Any] = field(default_factory=dict)
    summary: Optional[str] = None
    error_code: Optional[str] = None
    error_message: Optional[str] = None


@dataclass(frozen=True)
class ToolCall:
    """A single tool call produced by the model runtime."""

    tool_call_id: str
    tool_name: str
    arguments: Dict[str, Any]


ToolHandler = Callable[[ToolContext, BaseModel], Awaitable[ToolResult]]
