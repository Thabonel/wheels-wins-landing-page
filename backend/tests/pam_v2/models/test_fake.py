"""
Tests for the provider-neutral model client protocol and scripted fake.
"""

from __future__ import annotations

import asyncio

import pytest

from app.services.pam_v2.models import (
    FakeModelClient,
    FinishEvent,
    Message,
    ModelClientConfig,
    ScriptedResponse,
    SlowFakeModelClient,
    TextDeltaEvent,
    ToolCallEvent,
    ToolSchema,
    UsageEvent,
)


@pytest.fixture
def config():
    return ModelClientConfig(model="fake-model", temperature=0.5, max_tokens=256)


async def drain(client, messages, tools):
    events = []
    async for event in client.send(messages, tools):
        events.append(event)
    return events


class TestFakeModelClient:
    async def test_text_only_turn(self, config):
        client = FakeModelClient(
            config,
            responses=[
                ScriptedResponse(
                    events=[
                        TextDeltaEvent("Hello, "),
                        TextDeltaEvent("world!"),
                        FinishEvent("completed"),
                    ]
                )
            ],
        )
        events = await drain(client, [Message(role="user", content="Hi")], [])

        assert [type(e).__name__ for e in events] == [
            "TextDeltaEvent",
            "TextDeltaEvent",
            "FinishEvent",
        ]
        assert "".join(e.delta for e in events if isinstance(e, TextDeltaEvent)) == "Hello, world!"
        assert client.call_count == 1
        assert client.last_messages == [Message(role="user", content="Hi")]
        assert client.last_tools == []

    async def test_tool_call_turn(self, config):
        client = FakeModelClient(
            config,
            responses=[
                ScriptedResponse(
                    events=[
                        TextDeltaEvent(""),
                        ToolCallEvent(
                            tool_call_id="call_1",
                            tool_name="get_weather",
                            arguments={"location": "Sydney"},
                        ),
                        FinishEvent("tool_calls"),
                    ]
                )
            ],
        )
        tool = ToolSchema(
            name="get_weather",
            description="weather",
            parameters={"type": "object", "properties": {}},
        )
        events = await drain(client, [Message(role="user", content="Weather?")], [tool])

        tool_events = [e for e in events if isinstance(e, ToolCallEvent)]
        assert len(tool_events) == 1
        assert tool_events[0].tool_name == "get_weather"
        assert tool_events[0].arguments == {"location": "Sydney"}
        assert client.last_tools == [tool]

    async def test_multiple_turns(self, config):
        client = FakeModelClient(
            config,
            responses=[
                ScriptedResponse(
                    events=[
                        ToolCallEvent(
                            tool_call_id="call_1",
                            tool_name="load_profile",
                            arguments={},
                        ),
                        FinishEvent("tool_calls"),
                    ]
                ),
                ScriptedResponse(
                    events=[
                        TextDeltaEvent("Done."),
                        FinishEvent("completed"),
                    ]
                ),
            ],
        )
        events1 = await drain(client, [Message(role="user", content="Who am I?")], [])
        events2 = await drain(client, events1, [])

        assert any(isinstance(e, ToolCallEvent) for e in events1)
        assert any(isinstance(e, TextDeltaEvent) for e in events2)
        assert client.call_count == 2

    async def test_model_config_is_exposed(self, config):
        client = FakeModelClient(config)
        assert client.config.model == "fake-model"
        assert client.config.temperature == 0.5
        assert client.config.max_tokens == 256

    async def test_matcher_selects_response(self, config):
        def matcher(messages, tools):
            if messages and messages[-1].content == "special":
                return ScriptedResponse(events=[TextDeltaEvent("matched"), FinishEvent("completed")])
            return None

        client = FakeModelClient(config, matcher=matcher)
        events = await drain(client, [Message(role="user", content="special")], [])
        assert "".join(e.delta for e in events if isinstance(e, TextDeltaEvent)) == "matched"


class TestSlowFakeModelClient:
    async def test_cancellation_stops_stream(self, config):
        client = SlowFakeModelClient(config, delay=60.0)

        async def consume():
            async for _event in client.send([Message(role="user", content="Hi")], []):
                pass

        task = asyncio.create_task(consume())
        await asyncio.sleep(0.05)
        task.cancel()
        with pytest.raises(asyncio.CancelledError):
            await task

        assert task.cancelled()
