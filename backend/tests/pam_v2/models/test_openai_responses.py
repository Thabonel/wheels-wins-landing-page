"""
Tests for the OpenAI Responses API adapter using synthetic SDK events.

No real network calls or API keys are used. The AsyncOpenAI client is mocked
and fed captured-shaped event objects.
"""

from __future__ import annotations

import asyncio
from typing import Any, AsyncIterator, Dict, List
from unittest.mock import AsyncMock, MagicMock

import pytest

from app.services.pam_v2.models import (
    Message,
    ModelClientConfig,
    ToolCallDraft,
    ToolSchema,
)
from app.services.pam_v2.models.openai_responses import (
    OpenAIResponsesClient,
    _to_openai_message,
    _to_openai_tool,
)
from app.services.pam_v2.models.base import (
    FinishEvent,
    ModelErrorEvent,
    TextDeltaEvent,
    ToolCallEvent,
    UsageEvent,
)


def _event(type_name: str, **kwargs: Any) -> Any:
    """Build a synthetic OpenAI stream event as a plain namespace object."""
    from types import SimpleNamespace

    return SimpleNamespace(type=type_name, **kwargs)


def _ns(**kwargs: Any) -> Any:
    """Build a plain namespace for nested synthetic shapes."""
    from types import SimpleNamespace

    return SimpleNamespace(**kwargs)


def _make_openai_mock(events: List[Any]) -> Any:
    """Return an AsyncOpenAI-like mock whose responses.create yields events."""

    class _AsyncIterator:
        def __init__(self, items: List[Any]):
            self._items = items

        def __aiter__(self):
            return self

        async def __anext__(self):
            if not self._items:
                raise StopAsyncIteration
            return self._items.pop(0)

    stream_mock = _AsyncIterator(events)

    responses_mock = MagicMock()
    responses_mock.create = AsyncMock(return_value=stream_mock)

    client_mock = MagicMock()
    client_mock.responses = responses_mock
    return client_mock


async def drain(client: OpenAIResponsesClient, messages: List[Message], tools: List[ToolSchema]) -> List[Any]:
    events: List[Any] = []
    async for event in client.send(messages, tools):
        events.append(event)
    return events


@pytest.fixture
def config():
    return ModelClientConfig(model="gpt-test", temperature=0.5, max_tokens=256)


class TestToolAndMessageConversion:
    def test_tool_schema_to_openai(self, config):
        tool = ToolSchema(
            name="get_weather",
            description="Get weather",
            parameters={
                "type": "object",
                "properties": {"location": {"type": "string"}},
                "required": ["location"],
            },
            strict=True,
        )
        openai_tool = _to_openai_tool(tool)
        assert openai_tool["type"] == "function"
        assert openai_tool["name"] == "get_weather"
        assert openai_tool["strict"] is True

    def test_message_conversion(self, config):
        system = _to_openai_message(Message(role="system", content="You are Pam."))
        assert system == {"role": "system", "content": "You are Pam."}

        tool_out = _to_openai_message(
            Message(role="tool", content='{"temp": 20}', tool_call_id="call_1")
        )
        assert tool_out["type"] == "function_call_output"
        assert tool_out["call_id"] == "call_1"

        assistant = _to_openai_message(
            Message(
                role="assistant",
                content="",
                tool_calls=[ToolCallDraft(tool_call_id="call_1", tool_name="get_weather", arguments={"location": "Sydney"})],
            )
        )
        assert assistant["role"] == "assistant"
        assert assistant["tool_calls"][0]["function"]["name"] == "get_weather"


class TestStreamingTranslation:
    async def test_text_only_stream(self, config):
        events = [
            _event("response.created"),
            _event("response.output_text.delta", delta="Hello, ", item_id="msg_1"),
            _event("response.output_text.delta", delta="world!", item_id="msg_1"),
            _event(
                "response.completed",
                response=_ns(
                    usage=_ns(
                        input_tokens=10,
                        output_tokens=5,
                        total_tokens=15,
                    )
                ),
            ),
        ]
        client = OpenAIResponsesClient(config, client=_make_openai_mock(events))
        out = await drain(client, [Message(role="user", content="Hi")], [])

        deltas = "".join(e.delta for e in out if isinstance(e, TextDeltaEvent))
        assert deltas == "Hello, world!"
        assert any(isinstance(e, FinishEvent) for e in out)
        usage = [e for e in out if isinstance(e, UsageEvent)]
        assert usage and usage[0].total_tokens == 15

    async def test_tool_call_stream(self, config):
        events = [
            _event("response.output_item.added", item={"type": "function_call", "call_id": "call_1", "name": "get_weather", "id": "fc_1", "status": "in_progress", "arguments": ""}),
            _event("response.function_call_arguments.delta", delta='{"location": "Sydney"}', item_id="fc_1"),
            _event("response.function_call_arguments.done", arguments='{"location": "Sydney"}', name="get_weather", call_id="call_1", item_id="fc_1"),
            _event("response.completed", response={"usage": {"input_tokens": 20, "output_tokens": 10, "total_tokens": 30}}),
        ]
        tool = ToolSchema(name="get_weather", description="weather", parameters={"type": "object", "properties": {}})
        client = OpenAIResponsesClient(config, client=_make_openai_mock(events))
        out = await drain(client, [Message(role="user", content="Weather?")], [tool])

        tool_events = [e for e in out if isinstance(e, ToolCallEvent)]
        assert len(tool_events) == 1
        assert tool_events[0].tool_name == "get_weather"
        assert tool_events[0].arguments == {"location": "Sydney"}

    async def test_malformed_tool_arguments_return_empty(self, config):
        events = [
            _event("response.function_call_arguments.done", arguments="not-json", name="get_weather", call_id="call_1"),
            _event("response.completed", response={}),
        ]
        client = OpenAIResponsesClient(config, client=_make_openai_mock(events))
        out = await drain(client, [Message(role="user", content="Weather?")], [])

        tool_events = [e for e in out if isinstance(e, ToolCallEvent)]
        assert tool_events[0].arguments == {}

    async def test_configured_model_used(self, config):
        client = OpenAIResponsesClient(config, client=_make_openai_mock([]))
        await drain(client, [Message(role="user", content="Hi")], [])
        call_kwargs = client.client.responses.create.await_args.kwargs  # type: ignore[union-attr]
        assert call_kwargs["model"] == "gpt-test"
        assert call_kwargs["temperature"] == 0.5
        assert call_kwargs["max_output_tokens"] == 256


class TestErrorTranslation:
    async def test_timeout_error(self, config):
        mock_client = MagicMock()
        mock_client.responses.create = AsyncMock(side_effect=TimeoutError("timed out"))
        client = OpenAIResponsesClient(config, client=mock_client)
        out = await drain(client, [Message(role="user", content="Hi")], [])

        error = [e for e in out if isinstance(e, ModelErrorEvent)]
        assert error and error[0].code == "provider_timeout"

    async def test_rate_limit_error(self, config):
        from openai import RateLimitError

        mock_client = MagicMock()
        mock_client.responses.create = AsyncMock(
            side_effect=RateLimitError("rate limit", response=MagicMock(), body=None)
        )
        client = OpenAIResponsesClient(config, client=mock_client)
        out = await drain(client, [Message(role="user", content="Hi")], [])

        error = [e for e in out if isinstance(e, ModelErrorEvent)]
        assert error and error[0].code == "provider_rate_limit"

    async def test_incomplete_stream_maps_to_max_tokens(self, config):
        events = [
            _event("response.incomplete"),
        ]
        client = OpenAIResponsesClient(config, client=_make_openai_mock(events))
        out = await drain(client, [Message(role="user", content="Hi")], [])

        finish = [e for e in out if isinstance(e, FinishEvent)]
        assert finish and finish[0].reason == "max_tokens"


class TestCancellation:
    async def test_cancellation_stops_stream(self, config):
        class _SlowIterator:
            def __aiter__(self):
                return self

            async def __anext__(self):
                await asyncio.sleep(60)
                raise StopAsyncIteration

        mock_client = MagicMock()
        mock_client.responses.create = AsyncMock(return_value=_SlowIterator())

        client = OpenAIResponsesClient(config, client=mock_client)

        async def consume():
            async for _event in client.send([Message(role="user", content="Hi")], []):
                pass

        task = asyncio.create_task(consume())
        await asyncio.sleep(0.05)
        task.cancel()
        with pytest.raises(asyncio.CancelledError):
            await task
