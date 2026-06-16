"""
Provider-neutral model client protocol for Pam V2.

No OpenAI, Anthropic, or provider-specific shapes leak past an adapter that
implements ModelClient. The runtime consumes the normalized events defined
here and drives the canonical tool executor.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, AsyncIterator, Dict, List, Optional, Protocol, Union


@dataclass(frozen=True)
class Message:
    """A single message in the provider-neutral conversation."""

    role: str  # "system", "user", "assistant", or "tool"
    content: Optional[str] = None
    tool_calls: Optional[List["ToolCallDraft"]] = None
    tool_call_id: Optional[str] = None
    name: Optional[str] = None


@dataclass(frozen=True)
class ToolCallDraft:
    """A tool call attached to an assistant message (for re-submitting history)."""

    tool_call_id: str
    tool_name: str
    arguments: Dict[str, Any]


@dataclass(frozen=True)
class ToolSchema:
    """Provider-neutral function tool definition."""

    name: str
    description: str
    parameters: Dict[str, Any]
    type: str = "function"
    strict: Optional[bool] = None


@dataclass(frozen=True)
class TextDeltaEvent:
    """Incremental text from the model."""

    delta: str


@dataclass(frozen=True)
class ToolCallEvent:
    """A complete tool call requested by the model."""

    tool_call_id: str
    tool_name: str
    arguments: Dict[str, Any]


@dataclass(frozen=True)
class UsageEvent:
    """Token usage for the model invocation when available."""

    input_tokens: int = 0
    output_tokens: int = 0
    total_tokens: int = 0


@dataclass(frozen=True)
class FinishEvent:
    """Model invocation finished."""

    reason: str  # e.g. "completed", "max_tokens", "tool_calls", "stop"


@dataclass(frozen=True)
class ModelErrorEvent:
    """Provider-reported error translated to a safe code."""

    code: str
    message: str


ModelEvent = Union[
    TextDeltaEvent,
    ToolCallEvent,
    UsageEvent,
    FinishEvent,
    ModelErrorEvent,
]


@dataclass(frozen=True)
class ModelClientConfig:
    """Configuration shared across provider adapters."""

    model: str
    temperature: float = 0.7
    max_tokens: int = 1024
    timeout_seconds: float = 30.0
    api_key: Optional[str] = None
    base_url: Optional[str] = None
    extra: Dict[str, Any] = field(default_factory=dict)


class ModelClient(Protocol):
    """Protocol implemented by every V2 model provider adapter."""

    async def send(
        self,
        messages: List[Message],
        tools: List[ToolSchema],
    ) -> AsyncIterator[ModelEvent]:
        """
        Send messages and available tools to the model.

        Yields normalized events in order. The stream must be cancellable: an
        asyncio.CancelledError raised into the caller must stop the adapter
        from further network work and provider charges.
        """
        ...
