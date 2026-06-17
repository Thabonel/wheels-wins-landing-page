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


class EchoModelClient(ModelClient):
    """Built-in model client that does not require any API key.

    Responds with helpful canned replies about PAM V2 capabilities.
    Used as a fallback when no external AI provider is configured.
    """

    def __init__(self, config: ModelClientConfig):
        self.config = config

    async def send(
        self,
        messages: List[Message],
        tools: List[Any],
    ) -> AsyncIterator[ModelEvent]:
        user_message = ""
        for m in reversed(messages):
            if m.role == "user" and m.content:
                user_message = m.content.lower()
                break

        greeting_keywords = ("hi", "hello", "hey", "howdy", "yo", "sup", "good morning", "good afternoon", "good evening", "how are you", "what's up")
        if any(user_message.strip().startswith(w) for w in greeting_keywords) or user_message.strip() in greeting_keywords:
            response = (
                "Hey there! I'm Pam, your RV trip planning and budget assistant. "
                "I can help you with:\n\n"
                "• Planning road trips and finding routes\n"
                "• Tracking fuel, maintenance, and expenses\n"
                "• Finding campgrounds and national parks\n"
                "• Budget analysis and savings tips\n"
                "• Weather forecasts for your route\n\n"
                "What would you like help with today?"
            )
        elif not user_message.strip():
            response = "I didn't catch that — could you say that again?"
        else:
            response = (
                "I hear you! But I'm currently running in offline mode without a connected AI provider. "
                "I can still answer basic questions and help with trip planning once a model API key is configured.\n\n"
                "In the meantime, you can browse routes, check weather, track expenses, and manage your budget "
                "through the Wheels & Wins dashboard. What would you like to explore?"
            )

        words = response.split(" ")
        while words:
            chunk = " ".join(words[:8])
            words = words[8:]
            yield TextDeltaEvent(chunk + (" " if words else ""))
            await asyncio.sleep(0.05)

        yield FinishEvent("completed")


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
