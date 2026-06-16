"""
Scripted fake model client for deterministic V2 runtime tests.

The fake never calls a real provider. It replays pre-defined event sequences
so the runtime, prompt builder, and executor can be tested without keys.
"""

from __future__ import annotations

import asyncio
from dataclasses import dataclass
from typing import Any, AsyncIterator, Callable, Dict, List, Optional

from .base import (
    Message,
    ModelClient,
    ModelClientConfig,
    ModelEvent,
    TextDeltaEvent,
    ToolCallEvent,
    FinishEvent,
)


@dataclass(frozen=True)
class ScriptedResponse:
    """One scripted model invocation: a sequence of events."""

    events: List[ModelEvent]


class FakeModelClient:
    """Deterministic model client that replays scripted turns."""

    def __init__(
        self,
        config: ModelClientConfig,
        responses: Optional[List[ScriptedResponse]] = None,
        matcher: Optional[Callable[[List[Message], List[Any]], Optional[ScriptedResponse]]] = None,
    ):
        self.config = config
        self.responses = list(responses or [])
        self.matcher = matcher
        self._call_count = 0
        self._last_messages: Optional[List[Message]] = None
        self._last_tools: Optional[List[Any]] = None

    @property
    def call_count(self) -> int:
        return self._call_count

    @property
    def last_messages(self) -> Optional[List[Message]]:
        return self._last_messages

    @property
    def last_tools(self) -> Optional[List[Any]]:
        return self._last_tools

    async def send(
        self,
        messages: List[Message],
        tools: List[Any],
    ) -> AsyncIterator[ModelEvent]:
        self._last_messages = list(messages)
        self._last_tools = list(tools)
        self._call_count += 1

        response: Optional[ScriptedResponse] = None
        if self.matcher:
            response = self.matcher(messages, tools)
        if response is None and self._call_count - 1 < len(self.responses):
            response = self.responses[self._call_count - 1]

        if response is None:
            yield TextDeltaEvent("I'm not sure how to help with that.")
            yield FinishEvent("completed")
            return

        for event in response.events:
            if isinstance(event, TextDeltaEvent) and event.delta:
                await asyncio.sleep(0)
            yield event


class SlowFakeModelClient(ModelClient):
    """Fake that yields slowly so cancellation can be asserted."""

    def __init__(self, config: ModelClientConfig, delay: float = 60.0):
        self.config = config
        self.delay = delay

    async def send(
        self,
        messages: List[Message],
        tools: List[Any],
    ) -> AsyncIterator[ModelEvent]:
        try:
            await asyncio.sleep(self.delay)
            yield TextDeltaEvent("done")
            yield FinishEvent("completed")
        except asyncio.CancelledError:
            raise
