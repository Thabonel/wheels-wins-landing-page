"""Tests for PAM vector memory integration."""
import pytest
from unittest.mock import AsyncMock, MagicMock


@pytest.mark.asyncio
async def test_conversation_stored_in_vector_memory():
    """PAM should store conversation turns in vector memory when available."""
    from app.core.personalized_pam_agent import PersonalizedPamAgent, UserContext, ConversationMode

    agent = PersonalizedPamAgent()
    agent._vector_memory = AsyncMock()
    agent._vector_memory.store_conversation_memory.return_value = {"success": True}

    ctx = UserContext(
        user_id="test-123",
        profile={},
        vehicle_info={},
        travel_preferences={},
        conversation_history=[],
        conversation_mode=ConversationMode.GENERAL_TRAVEL,
        is_rv_traveler=False,
        vehicle_capabilities={},
        preferred_transport_modes=[],
    )

    await agent._update_conversation_history(
        ctx, "What's the weather?", {"content": "Sunny in Sydney"}
    )

    agent._vector_memory.store_conversation_memory.assert_called_once()
    call_args = agent._vector_memory.store_conversation_memory.call_args
    assert call_args.kwargs["user_message"] == "What's the weather?"
    assert "Sunny" in call_args.kwargs["agent_response"]


@pytest.mark.asyncio
async def test_vector_memory_failure_is_non_blocking():
    """Vector memory failures should not break conversation flow."""
    from app.core.personalized_pam_agent import PersonalizedPamAgent, UserContext, ConversationMode

    agent = PersonalizedPamAgent()
    agent._vector_memory = AsyncMock()
    agent._vector_memory.store_conversation_memory.side_effect = Exception("Redis down")

    ctx = UserContext(
        user_id="test-123",
        profile={},
        vehicle_info={},
        travel_preferences={},
        conversation_history=[],
        conversation_mode=ConversationMode.GENERAL_TRAVEL,
        is_rv_traveler=False,
        vehicle_capabilities={},
        preferred_transport_modes=[],
    )

    # Should not raise even though vector memory fails
    await agent._update_conversation_history(
        ctx, "Hello", {"content": "Hi there"}
    )

    # Conversation history should still be updated
    assert len(ctx.conversation_history) == 2
