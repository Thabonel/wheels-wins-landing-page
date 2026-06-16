"""
Tests for the Pam V2 canonical tool catalog, policy engine, and executor.
"""

from __future__ import annotations

import pytest
from pydantic import BaseModel

from app.services.pam_v2.tools import (
    ApprovalPolicy,
    ToolCall,
    ToolContext,
    ToolEffect,
    ToolExecutor,
    ToolResult,
    ToolRisk,
    ToolScope,
    ToolSpec,
    catalog,
    get_catalog,
    get_executor,
    list_namespaces,
    requires_approval,
)
from app.services.pam_v2.tools.policy import authorize_tool


@pytest.fixture
def context() -> ToolContext:
    return ToolContext(
        user_id="user-123",
        trace_id="trace-abc",
        conversation_id="conv-1",
        client_message_id="msg-1",
    )


class TestCatalog:
    def test_catalog_has_six_adapters(self):
        tools = get_catalog().all_tools()
        assert len(tools) == 6
        names = {t.name for t in tools}
        assert names == {
            "load_profile",
            "get_weather",
            "list_calendar_events",
            "optimize_route",
            "find_campgrounds",
            "create_calendar_event",
        }

    def test_namespaces_populated(self):
        namespaces = list_namespaces()
        names = {ns.name for ns in namespaces}
        assert "profile" in names
        assert "travel" in names
        assert "calendar" in names

    def test_get_tool(self):
        tool = get_catalog().get("get_weather")
        assert tool.namespace == "travel"
        assert tool.effect == ToolEffect.READ

    def test_unknown_tool_raises(self):
        with pytest.raises(KeyError):
            get_catalog().get("does_not_exist")


class TestPolicy:
    def test_read_own_data_does_not_require_approval(self, context):
        tool = get_catalog().get("load_profile")
        assert requires_approval(tool) is False

    def test_public_read_does_not_require_approval(self, context):
        tool = get_catalog().get("get_weather")
        assert requires_approval(tool) is False

    def test_explicit_approval_policy_requires_approval(self):
        class In(BaseModel):
            x: str

        class Out(BaseModel):
            y: str

        spec = ToolSpec(
            name="test_write",
            description="test",
            namespace="test",
            input_schema=In,
            output_schema=Out,
            effect=ToolEffect.READ,
            risk=ToolRisk.LOW,
            scope=ToolScope.OWN,
            approval_policy=ApprovalPolicy.EXPLICIT,
        )
        assert requires_approval(spec) is True

    def test_authorize_tool_blocks_admin_scope(self, context):
        class In(BaseModel):
            x: str

        class Out(BaseModel):
            y: str

        spec = ToolSpec(
            name="admin_tool",
            description="test",
            namespace="test",
            input_schema=In,
            output_schema=Out,
            effect=ToolEffect.READ,
            risk=ToolRisk.LOW,
            scope=ToolScope.ADMIN,
            approval_policy=ApprovalPolicy.NONE,
        )
        with pytest.raises(PermissionError):
            authorize_tool(spec, context)

    def test_authorize_tool_blocks_cross_user_own_scope(self, context):
        tool = get_catalog().get("load_profile")
        with pytest.raises(PermissionError):
            authorize_tool(tool, context, target_user_id="user-999")


class TestExecutor:
    @pytest.fixture
    def executor(self) -> ToolExecutor:
        return get_executor()

    @pytest.mark.asyncio
    async def test_unknown_tool_returns_error(self, executor, context):
        call = ToolCall(tool_call_id="tc-1", tool_name="unknown_tool", arguments={})
        result = await executor.execute(call, context)
        assert result.success is False
        assert result.error_code == "unknown_tool"

    @pytest.mark.asyncio
    async def test_unapproved_write_blocked(self, executor, context):
        class In(BaseModel):
            x: str

        class Out(BaseModel):
            y: str

        spec = ToolSpec(
            name="mock_write",
            description="test",
            namespace="test",
            input_schema=In,
            output_schema=Out,
            effect=ToolEffect.WRITE,
            risk=ToolRisk.LOW,
            scope=ToolScope.OWN,
            approval_policy=ApprovalPolicy.NONE,
        )
        catalog.register(spec)
        call = ToolCall(tool_call_id="tc-1", tool_name="mock_write", arguments={"x": "a"})
        result = await executor.execute(call, context)
        assert result.success is False
        assert result.error_code == "approval_required"

    @pytest.mark.asyncio
    async def test_invalid_arguments_return_error(self, executor, context):
        call = ToolCall(
            tool_call_id="tc-1",
            tool_name="get_weather",
            arguments={"location": ""},
        )
        result = await executor.execute(call, context)
        assert result.success is False
        assert result.error_code == "invalid_arguments"


class TestToolSpecValidation:
    def test_retry_requires_idempotency(self):
        class In(BaseModel):
            x: str

        class Out(BaseModel):
            y: str

        with pytest.raises(ValueError):
            ToolSpec(
                name="bad",
                description="test",
                namespace="test",
                input_schema=In,
                output_schema=Out,
                effect=ToolEffect.READ,
                risk=ToolRisk.LOW,
                scope=ToolScope.OWN,
                approval_policy=ApprovalPolicy.NONE,
                max_retries=1,
                idempotent=False,
            )
