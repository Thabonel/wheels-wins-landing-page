"""
Tests for PAM 2.0 Conversational Engine
"""

import pytest
import asyncio
from unittest.mock import Mock, patch
from datetime import datetime

from ..services.conversational_engine import ConversationalEngine, create_conversational_engine
from ..core.types import ChatMessage, ConversationContext, UserContext, MessageType
from ..core.exceptions import ConversationalEngineError


class TestConversationalEngine:
    """Test suite for Conversational Engine service"""

    @pytest.fixture
    def engine(self):
        """Create ConversationalEngine instance for testing"""
        return create_conversational_engine()

    @pytest.fixture
    def sample_message(self):
        """Sample chat message for testing"""
        return ChatMessage(
            user_id="test-user-123",
            type=MessageType.USER,
            content="I want to plan a trip to Paris",
            timestamp=datetime.now()
        )

    @pytest.fixture
    def sample_context(self):
        """Sample conversation context for testing"""
        return ConversationContext(
            session_id="test-session-123",
            user_context=UserContext(
                user_id="test-user-123",
                preferences={},
                trip_data={},
                financial_data={}
            ),
            messages=[],
            current_topic="travel_planning",
            last_activity=datetime.now()
        )

    @pytest.mark.asyncio
    async def test_engine_initialization(self, engine):
        """Test that engine initializes correctly"""
        assert engine is not None
        assert engine.model_name == "gemini-1.5-flash"
        assert engine.temperature == 0.7

    @pytest.mark.asyncio
    async def test_process_message_basic(self, engine, sample_message):
        """Test basic message processing"""
        result = await engine.process_message(
            user_id=sample_message.user_id,
            message=sample_message.content
        )

        assert result.success is True
        assert "response" in result.data
        assert result.data["response"] is not None
        assert len(result.data["response"]) > 0

    @pytest.mark.asyncio
    async def test_process_message_with_context(self, engine, sample_message, sample_context):
        """Test message processing with conversation context"""
        result = await engine.process_message(
            user_id=sample_message.user_id,
            message=sample_message.content,
            context=sample_context
        )

        assert result.success is True
        assert result.metadata["context_included"] is True

    @pytest.mark.asyncio
    async def test_placeholder_response_generation(self, engine, sample_message):
        """Test placeholder response generation (Phase 1)"""
        # Test different message types
        test_cases = [
            ("I want to plan a trip to Tokyo", ["trip", "travel"]),
            ("Help me budget for vacation", ["budget", "money"]),
            ("I need to save money", ["savings", "save"]),
            ("What's the weather like?", ["PAM 2.0"])
        ]

        for message, expected_keywords in test_cases:
            response = engine._generate_placeholder_response(
                ChatMessage(
                    user_id="test-user",
                    type=MessageType.USER,
                    content=message,
                    timestamp=datetime.now()
                )
            )

            assert any(keyword.lower() in response.lower() for keyword in expected_keywords)

    @pytest.mark.asyncio
    async def test_ui_action_analysis(self, engine):
        """Test UI action analysis based on message content"""
        test_cases = [
            ("plan a trip to Italy", "update_trip"),
            ("check my budget", "update_budget"),
            ("show my savings", "show_savings"),
            ("hello there", "none")
        ]

        for message, expected_action in test_cases:
            action = engine._analyze_ui_action(message, "response")
            assert action == expected_action

    @pytest.mark.asyncio
    async def test_service_health(self, engine):
        """Test service health check"""
        health = await engine.get_service_health()

        assert "service" in health
        assert health["service"] == "conversational_engine"
        assert "status" in health
        assert "model" in health
        assert health["model"] == "gemini-1.5-flash"

    @pytest.mark.asyncio
    async def test_error_handling(self, engine):
        """Test error handling for invalid inputs"""
        with pytest.raises(ConversationalEngineError):
            await engine.process_message(
                user_id="",  # Invalid user ID
                message=""   # Empty message
            )

    @pytest.mark.asyncio
    async def test_gemini_client_mock(self, engine, sample_message):
        """Test with mocked Gemini client (Phase 2)"""
        with patch.object(engine, '_gemini_client') as mock_client:
            mock_client.generate_response.return_value = {
                "response": "Mocked Gemini response about Paris travel",
                "model": "gemini-1.5-flash",
                "tokens_used": 50,
                "response_time_ms": 150
            }

            # Enable client ready flag
            engine._client_ready = True

            result = await engine.process_message(
                user_id=sample_message.user_id,
                message=sample_message.content
            )

            assert result.success is True
            # Should use Gemini client when available
            # (Will use placeholder in Phase 1)

    @pytest.mark.asyncio
    async def test_concurrent_requests(self, engine):
        """Test handling multiple concurrent requests"""
        messages = [
            ("user1", "Plan trip to Japan"),
            ("user2", "Budget for Europe"),
            ("user3", "Save for vacation"),
            ("user4", "Best time to travel"),
            ("user5", "Hotel recommendations")
        ]

        # Create concurrent tasks
        tasks = [
            engine.process_message(user_id=user_id, message=message)
            for user_id, message in messages
        ]

        # Execute concurrently
        results = await asyncio.gather(*tasks)

        # All should succeed
        assert all(result.success for result in results)
        assert len(results) == 5

    @pytest.mark.asyncio
    async def test_response_time_performance(self, engine, sample_message):
        """Test response time performance"""
        start_time = asyncio.get_event_loop().time()

        result = await engine.process_message(
            user_id=sample_message.user_id,
            message=sample_message.content
        )

        end_time = asyncio.get_event_loop().time()
        response_time_ms = (end_time - start_time) * 1000

        assert result.success is True
        # Should be fast for placeholder responses
        assert response_time_ms < 500  # Target: under 500ms

    def test_factory_function(self):
        """Test factory function"""
        engine = create_conversational_engine()
        assert isinstance(engine, ConversationalEngine)
        assert engine.model_name == "gemini-1.5-flash"