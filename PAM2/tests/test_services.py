"""
PAM 2.0 Services Test Suite
===========================

Comprehensive tests for all PAM 2.0 modular services.
"""

import pytest
from unittest.mock import AsyncMock, patch

from pam_2.core.types import ChatMessage, MessageType
from pam_2.services import (
    create_conversational_engine,
    create_context_manager,
    create_safety_layer,
    create_trip_logger,
    create_savings_tracker
)


class TestConversationalEngine:
    """Test the Conversational Engine service"""

    @pytest.fixture
    def service(self):
        return create_conversational_engine()

    @pytest.mark.asyncio
    async def test_initialization(self, service):
        """Test service initialization"""
        assert service is not None
        # Note: Skip actual initialization in tests to avoid API calls

    @pytest.mark.asyncio
    async def test_process_message(self, service, test_message, mock_gemini_client):
        """Test message processing"""
        with patch.object(service, '_gemini_client', mock_gemini_client):
            result = await service.process_message(
                user_id="test_user",
                message="Hello PAM!",
                context=None,
                session_id="test_session"
            )

            assert result.success is True
            assert "response" in result.data
            assert result.service_name == "conversational_engine"


class TestContextManager:
    """Test the Context Manager service"""

    @pytest.fixture
    def service(self):
        return create_context_manager()

    @pytest.mark.asyncio
    async def test_initialization(self, service):
        """Test service initialization"""
        assert service is not None

    @pytest.mark.asyncio
    async def test_context_operations(self, service, test_message, mock_redis):
        """Test context storage and retrieval"""
        with patch.object(service, '_redis_client', mock_redis):
            # Test adding message to context
            result = await service.add_message_to_context("test_session", test_message)
            assert result.success is True

            # Test retrieving context
            mock_redis.get.return_value = '{"messages": [], "user_id": "test_user"}'
            result = await service.retrieve_context("test_session", "test_user")
            assert result.success is True


class TestSafetyLayer:
    """Test the Safety Layer service"""

    @pytest.fixture
    def service(self):
        return create_safety_layer()

    @pytest.mark.asyncio
    async def test_initialization(self, service):
        """Test service initialization"""
        assert service is not None

    @pytest.mark.asyncio
    async def test_content_safety_check(self, service, test_message):
        """Test content safety checking"""
        # Mock Redis to avoid actual connections
        with patch.object(service, '_client_ready', True), \
             patch.object(service, '_redis_client', AsyncMock()):

            result = await service.check_message_safety(test_message)
            assert result.success is True
            assert "safety_passed" in result.data

    @pytest.mark.asyncio
    async def test_rate_limiting(self, service, test_message, mock_redis):
        """Test rate limiting functionality"""
        service.rate_limiting_enabled = True
        service._client_ready = True

        with patch.object(service, '_redis_client', mock_redis):
            mock_redis.get.return_value = "5"  # Under limit

            result = await service.check_message_safety(test_message)
            assert result.success is True


class TestTripLogger:
    """Test the Trip Logger service"""

    @pytest.fixture
    def service(self):
        return create_trip_logger()

    @pytest.mark.asyncio
    async def test_initialization(self, service):
        """Test service initialization"""
        assert service is not None

    @pytest.mark.asyncio
    async def test_trip_analysis(self, service, trip_message):
        """Test trip activity analysis"""
        result = await service.analyze_trip_activity(trip_message)

        assert result.success is True
        assert "trip_activity_detected" in result.data
        assert result.data["trip_activity_detected"] is True
        assert "activity_score" in result.data
        assert result.data["activity_score"] > 0.5  # Should detect trip content

    @pytest.mark.asyncio
    async def test_entity_extraction(self, service, trip_message):
        """Test entity extraction from trip messages"""
        result = await service.analyze_trip_activity(trip_message)

        assert result.success is True
        entities = result.data.get("entities", {})

        # Should extract destination
        assert "destinations" in entities
        assert any("paris" in dest.lower() for dest in entities["destinations"])

        # Should extract budget
        assert "budgets" in entities
        assert "3000" in entities["budgets"]


class TestSavingsTracker:
    """Test the Savings Tracker service"""

    @pytest.fixture
    def service(self):
        return create_savings_tracker()

    @pytest.mark.asyncio
    async def test_initialization(self, service):
        """Test service initialization"""
        assert service is not None

    @pytest.mark.asyncio
    async def test_financial_analysis(self, service, financial_message):
        """Test financial content analysis"""
        result = await service.analyze_financial_content(financial_message)

        assert result.success is True
        assert "financial_content_detected" in result.data
        assert result.data["financial_content_detected"] is True
        assert "financial_score" in result.data
        assert result.data["financial_score"] > 0.2  # Should detect financial content

    @pytest.mark.asyncio
    async def test_entity_extraction(self, service, financial_message):
        """Test entity extraction from financial messages"""
        result = await service.analyze_financial_content(financial_message)

        assert result.success is True
        entities = result.data.get("entities", {})

        # Should extract amount
        assert "amounts" in entities
        assert "500" in entities["amounts"]

        # Should extract category
        assert "categories" in entities
        assert "groceries" in entities["categories"]

    @pytest.mark.asyncio
    async def test_recommendations(self, service, financial_message):
        """Test financial recommendations generation"""
        result = await service.analyze_financial_content(financial_message)

        assert result.success is True
        recommendations = result.data.get("recommendations", [])

        assert len(recommendations) > 0
        assert any("meal planning" in rec.lower() for rec in recommendations)


@pytest.mark.integration
class TestServiceIntegration:
    """Integration tests for service interactions"""

    @pytest.mark.asyncio
    async def test_full_conversation_flow(self, test_message):
        """Test full conversation flow across services"""
        # Create all services
        safety_layer = create_safety_layer()
        conversational_engine = create_conversational_engine()
        trip_logger = create_trip_logger()
        savings_tracker = create_savings_tracker()

        # Mock external dependencies
        with patch.object(safety_layer, '_client_ready', True), \
             patch.object(safety_layer, '_redis_client', AsyncMock()), \
             patch.object(conversational_engine, '_gemini_client', AsyncMock()):

            # Test safety check
            safety_result = await safety_layer.check_message_safety(test_message)
            assert safety_result.success is True
            assert safety_result.data["safety_passed"] is True

            # Test trip analysis
            trip_result = await trip_logger.analyze_trip_activity(test_message)
            assert trip_result.success is True

            # Test financial analysis
            financial_result = await savings_tracker.analyze_financial_content(test_message)
            assert financial_result.success is True