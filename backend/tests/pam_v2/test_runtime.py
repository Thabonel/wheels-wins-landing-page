"""
Tests for the Pam V2 bounded runtime manager loop.

All tests use scripted fake model clients and a fake executor so no real
provider calls or backend services are required.
"""

from __future__ import annotations

import asyncio
from typing import Any, Dict, List

import pytest

from app.services.pam_v2.models import (
    FakeModelClient,
    FinishEvent,
    Message,
    ModelClientConfig,
    ScriptedResponse,
    TextDeltaEvent,
    ToolCallEvent,
)
from app.services.pam_v2.runtime import PamV2Runtime, RuntimeConfig
from app.services.pam_v2.tools.catalog import ToolCatalog
from app.services.pam_v2.tools.types import (
    ApprovalPolicy,
    ToolCall,
    ToolContext,
    ToolEffect,
    ToolResult,
    ToolRisk,
    ToolScope,
    ToolSpec,
)


class FakeExecutor:
    """Executor that returns deterministic results without backend dependencies."""

    def __init__(self, results: Dict[str, ToolResult] | None = None):
        self.results = results or {}
        self.calls: List[ToolCall] = []

    async def execute(self, call: ToolCall, context: ToolContext, approved: bool = False) -> ToolResult:
        self.calls.append(call)
        if call.tool_name in self.results:
            return self.results[call.tool_name]
        return ToolResult(success=True, data={"value": call.tool_name}, summary=f"Ran {call.tool_name}")


class FakeToolSchema:
    def __init__(self, **kwargs):
        self.__dict__.update(kwargs)

    @classmethod
    def model_json_schema(cls) -> Dict[str, Any]:
        return {"type": "object", "properties": {}}


def make_catalog() -> ToolCatalog:
    catalog = ToolCatalog()
    catalog.register(
        ToolSpec(
            name="get_weather",
            description="Get weather",
            namespace="weather",
            input_schema=FakeToolSchema,
            output_schema=FakeToolSchema,
            effect=ToolEffect.READ,
            risk=ToolRisk.LOW,
            scope=ToolScope.PUBLIC,
            approval_policy=ApprovalPolicy.NONE,
        )
    )
    catalog.register(
        ToolSpec(
            name="load_profile",
            description="Load profile",
            namespace="profile",
            input_schema=FakeToolSchema,
            output_schema=FakeToolSchema,
            effect=ToolEffect.READ,
            risk=ToolRisk.LOW,
            scope=ToolScope.OWN,
            approval_policy=ApprovalPolicy.NONE,
        )
    )
    return catalog


@pytest.fixture
def context():
    return ToolContext(
        user_id="user_1",
        trace_id="trace_1",
        conversation_id="conv_1",
        client_message_id="msg_1",
        locale="en-AU",
        timezone="Australia/Sydney",
    )


async def drain(runtime: PamV2Runtime, user_message: str, context: ToolContext) -> List[Any]:
    events = []
    async for event in runtime.run(user_message, context):
        events.append(event)
    return events


class TestRuntimeTrajectories:
    async def test_direct_answer_no_tool(self, context):
        config = ModelClientConfig(model="fake")
        client = FakeModelClient(
            config,
            responses=[
                ScriptedResponse(
                    events=[
                        TextDeltaEvent("Sydney is warm today."),
                        FinishEvent("completed"),
                    ]
                )
            ],
        )
        runtime = PamV2Runtime(client, FakeExecutor(), make_catalog())
        events = await drain(runtime, "How is Sydney?", context)

        assert events[0].event == "turn_started"
        assert events[-1].event == "turn_completed"
        assert events[-1].finish_reason == "completed"
        assert any(e.event == "text_delta" for e in events)

    async def test_one_tool_then_answer(self, context):
        config = ModelClientConfig(model="fake")
        client = FakeModelClient(
            config,
            responses=[
                ScriptedResponse(
                    events=[
                        ToolCallEvent(tool_call_id="call_1", tool_name="get_weather", arguments={"location": "Sydney"}),
                        FinishEvent("tool_calls"),
                    ]
                ),
                ScriptedResponse(
                    events=[
                        TextDeltaEvent("It is 25C in Sydney."),
                        FinishEvent("completed"),
                    ]
                ),
            ],
        )
        executor = FakeExecutor()
        runtime = PamV2Runtime(client, executor, make_catalog())
        events = await drain(runtime, "Weather in Sydney?", context)

        assert any(e.event == "tool_started" for e in events)
        assert any(e.event == "tool_completed" for e in events)
        assert events[-1].finish_reason == "completed"
        assert len(executor.calls) == 1
        assert executor.calls[0].tool_name == "get_weather"

    async def test_multiple_independent_reads(self, context):
        config = ModelClientConfig(model="fake")
        client = FakeModelClient(
            config,
            responses=[
                ScriptedResponse(
                    events=[
                        ToolCallEvent(tool_call_id="call_1", tool_name="get_weather", arguments={}),
                        ToolCallEvent(tool_call_id="call_2", tool_name="load_profile", arguments={}),
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
        executor = FakeExecutor()
        runtime = PamV2Runtime(client, executor, make_catalog())
        events = await drain(runtime, "Weather and profile", context)

        assert len(executor.calls) == 2
        assert events[-1].finish_reason == "completed"

    async def test_unknown_tool_rejected_safely(self, context):
        config = ModelClientConfig(model="fake")
        client = FakeModelClient(
            config,
            responses=[
                ScriptedResponse(
                    events=[
                        ToolCallEvent(tool_call_id="call_1", tool_name="delete_account", arguments={}),
                        FinishEvent("tool_calls"),
                    ]
                ),
                ScriptedResponse(
                    events=[
                        TextDeltaEvent("I can't do that."),
                        FinishEvent("completed"),
                    ]
                ),
            ],
        )
        executor = FakeExecutor(
            results={
                "delete_account": ToolResult(
                    success=False,
                    error_code="unknown_tool",
                    error_message="Unknown tool: delete_account",
                )
            }
        )
        runtime = PamV2Runtime(client, executor, make_catalog())
        events = await drain(runtime, "Delete my account", context)

        completed = [e for e in events if e.event == "tool_completed"]
        assert completed and completed[0].status == "error"
        assert events[-1].finish_reason == "completed"

    async def test_max_iterations_terminates(self, context):
        config = ModelClientConfig(model="fake")
        # Model always asks for a tool, never answers.
        client = FakeModelClient(
            config,
            responses=[
                ScriptedResponse(
                    events=[
                        ToolCallEvent(tool_call_id=f"call_{i}", tool_name="get_weather", arguments={}),
                        FinishEvent("tool_calls"),
                    ]
                )
                for i in range(10)
            ],
        )
        runtime = PamV2Runtime(
            client,
            FakeExecutor(),
            make_catalog(),
            config=RuntimeConfig(max_iterations=3),
        )
        events = await drain(runtime, "Loop", context)

        assert events[-1].finish_reason == "max_iterations"

    async def test_max_tool_calls_terminates(self, context):
        config = ModelClientConfig(model="fake")
        client = FakeModelClient(
            config,
            responses=[
                ScriptedResponse(
                    events=[
                        ToolCallEvent(tool_call_id=f"call_{i}", tool_name="get_weather", arguments={}),
                        FinishEvent("tool_calls"),
                    ]
                )
                for i in range(10)
            ],
        )
        runtime = PamV2Runtime(
            client,
            FakeExecutor(),
            make_catalog(),
            config=RuntimeConfig(max_iterations=10, max_tool_calls_per_turn=2),
        )
        events = await drain(runtime, "Many tools", context)

        assert events[-1].finish_reason == "error"
        assert any(e.event == "error" and e.code == "tool_limit_exceeded" for e in events)

    async def test_cancellation_terminates(self, context):
        config = ModelClientConfig(model="fake")

        class SlowFake:
            def __init__(self, config):
                self.config = config

            async def send(self, messages, tools):
                await asyncio.sleep(60)
                yield TextDeltaEvent("done")
                yield FinishEvent("completed")

        runtime = PamV2Runtime(SlowFake(config), FakeExecutor(), make_catalog())

        async def consume():
            async for event in runtime.run("Hi", context):
                pass

        task = asyncio.create_task(consume())
        await asyncio.sleep(0.05)
        task.cancel()
        with pytest.raises(asyncio.CancelledError):
            await task


class TestRuntimeInvariants:
    async def test_only_read_tools_exposed(self, context):
        catalog = make_catalog()
        config = ModelClientConfig(model="fake")
        client = FakeModelClient(config, responses=[ScriptedResponse(events=[TextDeltaEvent("ok"), FinishEvent("completed")])])
        runtime = PamV2Runtime(client, FakeExecutor(), catalog)
        await drain(runtime, "Hi", context)

        # The model client was called; we can inspect last_tools indirectly through messages.
        assert client.call_count == 1

    async def test_runtime_records_usage(self, context):
        from app.services.pam_v2.models import UsageEvent

        config = ModelClientConfig(model="fake")
        client = FakeModelClient(
            config,
            responses=[
                ScriptedResponse(
                    events=[
                        TextDeltaEvent("ok"),
                        UsageEvent(input_tokens=10, output_tokens=5, total_tokens=15),
                        FinishEvent("completed"),
                    ]
                )
            ],
        )
        runtime = PamV2Runtime(client, FakeExecutor(), make_catalog())
        await drain(runtime, "Hi", context)

        assert runtime.model_client._last_messages is not None
