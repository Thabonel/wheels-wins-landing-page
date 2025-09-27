import json
from datetime import datetime
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock

import pytest

from app.models.domain.pam import PamContext
from app.services.ai.provider_interface import AIResponse, AICapability
from app.services.pam.enhanced_orchestrator import (
    EnhancedPamContext,
    EnhancedPamOrchestrator,
    ResponseMode,
)
from app.services.pam.tools.tool_registry import ToolExecutionResult


@pytest.mark.asyncio
async def test_tool_call_triggers_registry_and_supabase_data():
    orchestrator = EnhancedPamOrchestrator()

    mock_ai_orchestrator = MagicMock()
    tool_definitions = [
        {
            "name": "manage_finances",
            "description": "Manage budgets",
            "parameters": {},
        }
    ]

    supabase_payload = {
        "summary": {"total_expenses": 250.0, "currency": "USD"},
        "success": True,
    }

    mock_tool_registry = SimpleNamespace()
    mock_tool_registry.get_openai_functions = MagicMock(return_value=tool_definitions)
    mock_tool_registry.execute_tool = AsyncMock(
        return_value=ToolExecutionResult(
            success=True,
            tool_name="manage_finances",
            execution_time_ms=12.0,
            result=supabase_payload,
        )
    )

    first_response = AIResponse(
        content="",
        model="gpt-5",
        provider="openai",
        usage={"prompt_tokens": 0, "completion_tokens": 0, "total_tokens": 0},
        latency_ms=10.0,
        finish_reason="function_call",
        function_calls=[
            {
                "id": "call_1",
                "type": "function",
                "function": {
                    "name": "manage_finances",
                    "arguments": json.dumps({"action": "fetch_summary"}),
                },
            }
        ],
    )

    followup_response = AIResponse(
        content="Here is your recent spending.",
        model="gpt-5",
        provider="openai",
        usage={"prompt_tokens": 0, "completion_tokens": 0, "total_tokens": 0},
        latency_ms=8.0,
        finish_reason="stop",
    )

    mock_ai_orchestrator.complete = AsyncMock(
        side_effect=[first_response, followup_response]
    )

    orchestrator.ai_orchestrator = mock_ai_orchestrator
    orchestrator.tool_registry = mock_tool_registry

    pam_context = PamContext(user_id="user-1", timestamp=datetime.utcnow())
    enhanced_context = EnhancedPamContext(
        base_context=pam_context,
        knowledge_available=False,
        tts_available=False,
        voice_streaming_active=False,
        user_location=None,
        preferred_response_mode=ResponseMode.TEXT_ONLY,
        service_capabilities={},
        conversation_mode="text",
        quality_requirements={},
    )

    result = await orchestrator._process_with_ai_service(
        message="How much have I spent on fuel this month?",
        enhanced_context=enhanced_context,
        user_id="user-1",
        session_id="session-1",
    )

    complete_mock = orchestrator.ai_orchestrator.complete
    first_call = complete_mock.await_args_list[0]

    assert first_call.kwargs["functions"] == tool_definitions
    assert AICapability.FUNCTION_CALLING in first_call.kwargs["required_capabilities"]

    second_call = complete_mock.await_args_list[1]
    assert "functions" not in second_call.kwargs
    tool_context_message = second_call.kwargs["messages"][1].content
    assert "\"total_expenses\": 250.0" in tool_context_message

    orchestrator.tool_registry.execute_tool.assert_awaited_once_with(
        tool_name="manage_finances",
        user_id="user-1",
        parameters={"action": "fetch_summary"},
        timeout=30,
    )

    assert result["content"] == followup_response.content
    assert result["ai_metadata"]["tool_results"]["manage_finances"]["result"] == supabase_payload
    assert "tools" in result.get("capabilities_used", [])
