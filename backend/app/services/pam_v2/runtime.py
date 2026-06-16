"""
Pam V2 bounded manager-agent runtime.

Drives a single provider-neutral model client through a bounded loop, executes
tools via the canonical executor, and yields stable V2 streaming events.
"""

from __future__ import annotations

import asyncio
import json
import time
import uuid
from dataclasses import dataclass, field
from typing import Any, AsyncIterator, Dict, List, Optional
from uuid import UUID

from app.models.schemas.pam_v2 import (
    ApprovalRequiredEvent,
    ErrorEvent,
    PamEventV2,
    ToolCompletedEvent,
    ToolStartedEvent,
    TurnCompletedEvent,
    TurnStartedEvent,
    TextDeltaEvent as TextDeltaEventV2,
)
from app.services.pam_v2.models import (
    FinishEvent,
    Message,
    ModelClient,
    ModelErrorEvent,
    ModelEvent,
    TextDeltaEvent,
    ToolCallDraft,
    ToolCallEvent,
    ToolSchema,
    UsageEvent,
)
from app.services.pam_v2.prompts import PROMPT_VERSION, build_messages
from app.services.pam_v2.state import (
    ConversationRecord,
    ConversationRepository,
    MessageRecord,
    MessageRole,
    ToolCallRecord,
    canonical_arguments_hash,
)
from app.services.pam_v2.tools.catalog import ToolCatalog
from app.services.pam_v2.tools.executor import ToolExecutor
from app.services.pam_v2.tools.types import ToolContext, ToolResult, ToolSpec


@dataclass(frozen=True)
class RuntimeConfig:
    """Bounds for a single V2 turn."""

    max_iterations: int = 5
    max_total_time_seconds: float = 60.0
    max_tool_calls_per_turn: int = 10
    max_output_characters: int = 4000
    max_tools_exposed: int = 20


@dataclass
class RuntimeState:
    """Mutable state for one turn."""

    trace_id: str
    conversation_id: str
    client_message_id: str
    sequence: int = 0
    iteration: int = 0
    tool_call_count: int = 0
    output_chars: int = 0
    start_time: float = field(default_factory=time.monotonic)
    messages: List[Message] = field(default_factory=list)
    usage: Dict[str, int] = field(default_factory=lambda: {"input_tokens": 0, "output_tokens": 0, "total_tokens": 0})

    def next_sequence(self) -> int:
        seq = self.sequence
        self.sequence += 1
        return seq


class PamV2Runtime:
    """Bounded manager-agent loop for one text turn."""

    def __init__(
        self,
        model_client: ModelClient,
        executor: ToolExecutor,
        catalog: ToolCatalog,
        config: Optional[RuntimeConfig] = None,
        repo: Optional[ConversationRepository] = None,
        approval_service: Any = None,
    ):
        self.model_client = model_client
        self.executor = executor
        self.catalog = catalog
        self.config = config or RuntimeConfig()
        self.repo = repo
        self.approval_service = approval_service

    async def run(
        self,
        user_message: str,
        tool_context: ToolContext,
        history: Optional[List[Message]] = None,
        extra_context: Optional[Dict[str, Any]] = None,
        approval_token: Optional[str] = None,
    ) -> AsyncIterator[PamEventV2]:
        """Run one bounded turn and yield V2 events."""
        state = RuntimeState(
            trace_id=tool_context.trace_id,
            conversation_id=tool_context.conversation_id,
            client_message_id=tool_context.client_message_id,
        )

        yield TurnStartedEvent(
            event="turn_started",
            trace_id=state.trace_id,
            sequence=state.next_sequence(),
            conversation_id=state.conversation_id,
            client_message_id=state.client_message_id,
        )

        # Persistence: load/create conversation, check duplicate, load history.
        if self.repo is not None:
            conv_id = _to_uuid(tool_context.conversation_id)
            existing = await self.repo.get_conversation(conv_id)
            if existing is None:
                await self.repo.create_conversation(
                    user_id=tool_context.user_id,
                    title=f"Pam V2 - {user_message[:50]}",
                )

            if await self.repo.is_client_message_duplicate(conv_id, tool_context.client_message_id):
                yield ErrorEvent(
                    event="error",
                    trace_id=state.trace_id,
                    sequence=state.next_sequence(),
                    code="duplicate_message",
                    message="This message has already been processed.",
                )
                yield TurnCompletedEvent(
                    event="turn_completed",
                    trace_id=state.trace_id,
                    sequence=state.next_sequence(),
                    conversation_id=state.conversation_id,
                    client_message_id=state.client_message_id,
                    finish_reason="error",
                )
                return

            if history is None:
                loaded = await self.repo.get_conversation_messages(conv_id, limit=50)
                history = _messages_from_records(loaded)

        exposed_tools = self._select_tools()
        state.messages = build_messages(
            user_message=user_message,
            locale=tool_context.locale,
            timezone=tool_context.timezone,
            tools=exposed_tools,
            history=history,
            extra_context={
                "model_provider": "openai",
                "prompt_version": PROMPT_VERSION,
                **(extra_context or {}),
            },
        )

        try:
            async for event in self._loop(state, exposed_tools, tool_context):
                yield event
        except asyncio.CancelledError:
            yield TurnCompletedEvent(
                event="turn_completed",
                trace_id=state.trace_id,
                sequence=state.next_sequence(),
                conversation_id=state.conversation_id,
                client_message_id=state.client_message_id,
                finish_reason="error",
            )
            raise
        except Exception:
            yield ErrorEvent(
                event="error",
                trace_id=state.trace_id,
                sequence=state.next_sequence(),
                code="runtime_error",
                message="An unexpected error occurred. Please try again.",
            )
            yield TurnCompletedEvent(
                event="turn_completed",
                trace_id=state.trace_id,
                sequence=state.next_sequence(),
                conversation_id=state.conversation_id,
                client_message_id=state.client_message_id,
                finish_reason="error",
            )

        # Persist the turn's messages and tool calls.
        if self.repo is not None:
            await self._persist_turn(state, tool_context)

    async def _loop(
        self,
        state: RuntimeState,
        exposed_tools: List[ToolSpec],
        tool_context: ToolContext,
    ) -> AsyncIterator[PamEventV2]:
        tool_schemas = [_to_tool_schema(t) for t in exposed_tools]

        while state.iteration < self.config.max_iterations:
            if time.monotonic() - state.start_time > self.config.max_total_time_seconds:
                yield ErrorEvent(
                    event="error",
                    trace_id=state.trace_id,
                    sequence=state.next_sequence(),
                    code="turn_timeout",
                    message="The request took too long to complete.",
                )
                yield TurnCompletedEvent(
                    event="turn_completed",
                    trace_id=state.trace_id,
                    sequence=state.next_sequence(),
                    conversation_id=state.conversation_id,
                    client_message_id=state.client_message_id,
                    finish_reason="timeout",
                )
                return

            state.iteration += 1
            pending_tool_calls: List[ToolCallEvent] = []
            pending_results: List[ToolResult] = []
            finished = False
            finish_reason = "completed"

            async for model_event in self.model_client.send(state.messages, tool_schemas):
                if isinstance(model_event, TextDeltaEvent):
                    if state.output_chars >= self.config.max_output_characters:
                        finish_reason = "max_tokens"
                        break
                    yield TextDeltaEventV2(
                        event="text_delta",
                        trace_id=state.trace_id,
                        sequence=state.next_sequence(),
                        delta=model_event.delta,
                    )
                    state.output_chars += len(model_event.delta)

                elif isinstance(model_event, ToolCallEvent):
                    if state.tool_call_count >= self.config.max_tool_calls_per_turn:
                        yield ErrorEvent(
                            event="error",
                            trace_id=state.trace_id,
                            sequence=state.next_sequence(),
                            code="tool_limit_exceeded",
                            message="Too many tool calls for this turn.",
                        )
                        yield TurnCompletedEvent(
                            event="turn_completed",
                            trace_id=state.trace_id,
                            sequence=state.next_sequence(),
                            conversation_id=state.conversation_id,
                            client_message_id=state.client_message_id,
                            finish_reason="error",
                        )
                        return

                    state.tool_call_count += 1
                    pending_tool_calls.append(model_event)
                    yield ToolStartedEvent(
                        event="tool_started",
                        trace_id=state.trace_id,
                        sequence=state.next_sequence(),
                        tool_call_id=model_event.tool_call_id,
                        tool_name=model_event.tool_name,
                        namespace=self._namespace_for_tool(model_event.tool_name),
                    )

                    result = await self.executor.execute(
                        call=_to_tool_call(model_event),
                        context=tool_context,
                    )
                    pending_results.append(result)

                    yield ToolCompletedEvent(
                        event="tool_completed",
                        trace_id=state.trace_id,
                        sequence=state.next_sequence(),
                        tool_call_id=model_event.tool_call_id,
                        tool_name=model_event.tool_name,
                        status="success" if result.success else "error",
                        result_summary=result.summary or result.error_message,
                    )

                elif isinstance(model_event, UsageEvent):
                    state.usage["input_tokens"] += model_event.input_tokens
                    state.usage["output_tokens"] += model_event.output_tokens
                    state.usage["total_tokens"] += model_event.total_tokens

                elif isinstance(model_event, FinishEvent):
                    finished = True
                    if model_event.reason in ("max_tokens", "tool_calls"):
                        finish_reason = model_event.reason
                    break

                elif isinstance(model_event, ModelErrorEvent):
                    yield ErrorEvent(
                        event="error",
                        trace_id=state.trace_id,
                        sequence=state.next_sequence(),
                        code=model_event.code,
                        message=model_event.message,
                    )
                    yield TurnCompletedEvent(
                        event="turn_completed",
                        trace_id=state.trace_id,
                        sequence=state.next_sequence(),
                        conversation_id=state.conversation_id,
                        client_message_id=state.client_message_id,
                        finish_reason="error",
                    )
                    return

            if not finished:
                # Stream ended without a finish event; treat as error.
                yield ErrorEvent(
                    event="error",
                    trace_id=state.trace_id,
                    sequence=state.next_sequence(),
                    code="provider_stream_error",
                    message="Model stream ended unexpectedly.",
                )
                yield TurnCompletedEvent(
                    event="turn_completed",
                    trace_id=state.trace_id,
                    sequence=state.next_sequence(),
                    conversation_id=state.conversation_id,
                    client_message_id=state.client_message_id,
                    finish_reason="error",
                )
                return

            if not pending_tool_calls:
                yield TurnCompletedEvent(
                    event="turn_completed",
                    trace_id=state.trace_id,
                    sequence=state.next_sequence(),
                    conversation_id=state.conversation_id,
                    client_message_id=state.client_message_id,
                    finish_reason=finish_reason,  # type: ignore[arg-type]
                )
                return

            # Append assistant message with tool calls and result messages.
            state.messages.append(
                Message(
                    role="assistant",
                    content="",
                    tool_calls=[ToolCallDraft(
                        tool_call_id=tc.tool_call_id,
                        tool_name=tc.tool_name,
                        arguments=tc.arguments,
                    ) for tc in pending_tool_calls],
                )
            )
            for tc, result in zip(pending_tool_calls, pending_results):
                state.messages.append(
                    Message(
                        role="tool",
                        content=json.dumps({
                            "success": result.success,
                            "data": result.data,
                            "error": result.error_message,
                        }),
                        tool_call_id=tc.tool_call_id,
                    )
                )

        # Max iterations reached.
        yield TurnCompletedEvent(
            event="turn_completed",
            trace_id=state.trace_id,
            sequence=state.next_sequence(),
            conversation_id=state.conversation_id,
            client_message_id=state.client_message_id,
            finish_reason="max_iterations",
        )

    async def _persist_turn(
        self,
        state: RuntimeState,
        tool_context: ToolContext,
    ) -> None:
        """Save messages and tool calls from this turn to the repository."""
        if self.repo is None:
            return

        conv_id = _to_uuid(tool_context.conversation_id)

        for msg in state.messages:
            # Skip system messages (not stored).
            if msg.role == "system":
                continue

            record = MessageRecord(
                message_id=uuid.uuid4(),
                conversation_id=conv_id,
                client_message_id=tool_context.client_message_id,
                role=MessageRole(msg.role),
                content=msg.content,
                tool_call_id=msg.tool_call_id,
                tool_name=str(msg.tool_calls[0].tool_name) if msg.tool_calls else None,
                tool_arguments=msg.tool_calls[0].arguments if msg.tool_calls else None,
            )
            await self.repo.add_message(record)

    def _select_tools(self) -> List[ToolSpec]:
        """Return read-only tools, capped by configuration."""
        tools = [t for t in self.catalog.all_tools() if t.effect.value == "read"]
        return tools[: self.config.max_tools_exposed]

    def _namespace_for_tool(self, name: str) -> str:
        try:
            return self.catalog.get(name).namespace
        except KeyError:
            return "unknown"


def _to_tool_schema(tool: ToolSpec) -> ToolSchema:
    """Convert a canonical ToolSpec to a provider-neutral schema."""
    return ToolSchema(
        name=tool.name,
        description=tool.description,
        parameters=tool.input_schema.model_json_schema(),
    )


def _to_tool_call(event: ToolCallEvent) -> Any:
    """Convert a model ToolCallEvent to an executor ToolCall."""
    from app.services.pam_v2.tools.types import ToolCall

    return ToolCall(
        tool_call_id=event.tool_call_id,
        tool_name=event.tool_name,
        arguments=event.arguments,
    )


def _to_uuid(value: str) -> UUID:
    """Safely convert a string to UUID. Falls back to a namespace-based UUID."""
    if isinstance(value, UUID):
        return value
    try:
        return UUID(value)
    except (ValueError, AttributeError):
        return uuid.uuid5(uuid.NAMESPACE_DNS, f"pam-v2-{value}")


def _messages_from_records(records: List[MessageRecord]) -> List[Message]:
    """Convert repository MessageRecords to runtime Message objects."""
    result: List[Message] = []
    for rec in records:
        if rec.role in (MessageRole.USER, MessageRole.ASSISTANT, MessageRole.SYSTEM):
            result.append(
                Message(
                    role=rec.role.value,
                    content=rec.content,
                )
            )
    return result
