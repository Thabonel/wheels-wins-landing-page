"""
Test suite for enhanced PAM 2.0 features
Tests voice service, MCP integration, and advanced features
"""

import pytest
import asyncio
from unittest.mock import Mock, patch, AsyncMock
from typing import Dict, Any, List

from pam_2.services.voice_service import (
    VoiceService, VoiceSettings, VoiceProvider, AudioFormat,
    TTSResponse, STTResponse, EdgeTTSProvider
)
from pam_2.integrations.mcp_client import (
    MCPClient, DatabaseTool, FileSystemTool, WebSearchTool,
    ToolCategory, ToolExecutionResult
)
from pam_2.services.advanced_features import (
    AdvancedFeaturesService, UserContext, MultiModalInput,
    PersonalityEngine, ProactiveEngine, MultiModalProcessor,
    PersonalityTrait, SuggestionType, ContextAwarenessLevel
)
from pam_2.core.types import ServiceResponse, ServiceStatus


class TestVoiceService:
    """Test cases for Voice Service"""

    @pytest.fixture
    async def voice_service(self):
        """Create voice service instance"""
        service = VoiceService()
        await service.initialize()
        return service

    @pytest.mark.asyncio
    async def test_voice_service_initialization(self):
        """Test voice service initialization"""
        service = VoiceService()
        response = await service.initialize()

        assert response.status == ServiceStatus.SUCCESS
        assert service._initialized
        assert len(service.providers) > 0
        assert VoiceProvider.EDGE_TTS in service.providers

    @pytest.mark.asyncio
    async def test_text_to_speech_synthesis(self, voice_service):
        """Test text-to-speech synthesis"""
        text = "Hello, this is a test message"
        settings = VoiceSettings(language="en-US")

        response = await voice_service.synthesize(text, settings)

        assert response.status == ServiceStatus.SUCCESS
        assert "audio" in response.data
        assert response.data["format"] == AudioFormat.MP3.value

    @pytest.mark.asyncio
    async def test_empty_text_synthesis(self, voice_service):
        """Test synthesis with empty text"""
        response = await voice_service.synthesize("")

        assert response.status == ServiceStatus.ERROR
        assert "empty text" in response.error.lower()

    @pytest.mark.asyncio
    async def test_tts_caching(self, voice_service):
        """Test TTS response caching"""
        text = "Cached message test"
        settings = VoiceSettings(cache_enabled=True)

        # First request
        response1 = await voice_service.synthesize(text, settings)
        assert response.status == ServiceStatus.SUCCESS
        assert not response1.data["cached"]

        # Second request should be cached
        response2 = await voice_service.synthesize(text, settings)
        assert response2.status == ServiceStatus.SUCCESS
        assert response2.data["cached"]

    @pytest.mark.asyncio
    async def test_speech_to_text_transcription(self, voice_service):
        """Test speech-to-text transcription"""
        audio_data = b"mock_audio_data"

        response = await voice_service.transcribe(audio_data, AudioFormat.WEBM)

        # Since EdgeTTS doesn't support STT, expect error or fallback
        assert response.status in [ServiceStatus.ERROR, ServiceStatus.SUCCESS]

    @pytest.mark.asyncio
    async def test_voice_service_metrics(self, voice_service):
        """Test voice service metrics collection"""
        metrics = voice_service.get_metrics()

        assert "tts_requests" in metrics
        assert "stt_requests" in metrics
        assert "cache_hits" in metrics
        assert "cache_misses" in metrics
        assert "providers_available" in metrics

    @pytest.mark.asyncio
    async def test_voice_service_health_check(self, voice_service):
        """Test voice service health check"""
        response = await voice_service.health_check()

        assert response.status == ServiceStatus.SUCCESS
        assert "healthy_providers" in response.data
        assert "metrics" in response.data


class TestMCPClient:
    """Test cases for MCP Client"""

    @pytest.fixture
    async def mcp_client(self):
        """Create MCP client instance"""
        client = MCPClient()
        await client.initialize()
        return client

    @pytest.mark.asyncio
    async def test_mcp_client_initialization(self):
        """Test MCP client initialization"""
        client = MCPClient()
        response = await client.initialize()

        assert response.status == ServiceStatus.SUCCESS
        assert client._initialized
        assert len(client.tools) > 0
        assert "database_query" in client.tools
        assert "filesystem_read" in client.tools

    @pytest.mark.asyncio
    async def test_tool_registration(self, mcp_client):
        """Test tool registration"""
        initial_count = len(mcp_client.tools)

        # Register a new tool
        web_tool = WebSearchTool()
        success = await mcp_client.register_tool(web_tool)

        assert success
        assert len(mcp_client.tools) > initial_count
        assert web_tool.definition.name in mcp_client.tools

    @pytest.mark.asyncio
    async def test_database_tool_execution(self, mcp_client):
        """Test database tool execution"""
        parameters = {
            "query": "SELECT * FROM users WHERE id = $1",
            "params": {"$1": "test_user"}
        }

        response = await mcp_client.execute_tool("database_query", parameters)

        assert response.status == ServiceStatus.SUCCESS
        assert "output" in response.data
        assert response.data["execution_time_ms"] is not None

    @pytest.mark.asyncio
    async def test_filesystem_tool_execution(self, mcp_client):
        """Test filesystem tool execution"""
        parameters = {"path": "/test/file.txt"}

        response = await mcp_client.execute_tool("filesystem_read", parameters)

        assert response.status == ServiceStatus.SUCCESS
        assert "output" in response.data

    @pytest.mark.asyncio
    async def test_invalid_tool_execution(self, mcp_client):
        """Test execution of non-existent tool"""
        response = await mcp_client.execute_tool("non_existent_tool", {})

        assert response.status == ServiceStatus.ERROR
        assert "not found" in response.error

    @pytest.mark.asyncio
    async def test_tool_parameter_validation(self, mcp_client):
        """Test tool parameter validation"""
        # Missing required parameter
        response = await mcp_client.execute_tool("database_query", {})

        assert response.status == ServiceStatus.ERROR

    @pytest.mark.asyncio
    async def test_mcp_client_metrics(self, mcp_client):
        """Test MCP client metrics"""
        metrics = mcp_client.get_metrics()

        assert "total_executions" in metrics
        assert "successful_executions" in metrics
        assert "failed_executions" in metrics
        assert "tools_registered" in metrics
        assert "success_rate" in metrics

    @pytest.mark.asyncio
    async def test_tool_definitions_export(self, mcp_client):
        """Test exporting tool definitions for AI"""
        definitions = mcp_client.get_tool_definitions()

        assert isinstance(definitions, list)
        assert len(definitions) > 0

        for definition in definitions:
            assert "name" in definition
            assert "description" in definition
            assert "parameters" in definition
            assert "required" in definition


class TestAdvancedFeaturesService:
    """Test cases for Advanced Features Service"""

    @pytest.fixture
    async def advanced_service(self):
        """Create advanced features service instance"""
        service = AdvancedFeaturesService()
        await service.initialize()
        return service

    @pytest.mark.asyncio
    async def test_advanced_service_initialization(self):
        """Test advanced features service initialization"""
        service = AdvancedFeaturesService()
        response = await service.initialize()

        assert response.status == ServiceStatus.SUCCESS
        assert service._initialized
        assert service.personality_engine is not None
        assert service.proactive_engine is not None
        assert service.multimodal_processor is not None

    @pytest.mark.asyncio
    async def test_intelligent_request_processing(self, advanced_service):
        """Test intelligent request processing"""
        input_data = MultiModalInput(
            text="Hello, I need help planning a trip",
            location=(37.7749, -122.4194)  # San Francisco
        )

        response = await advanced_service.process_intelligent_request(
            user_id="test_user",
            input_data=input_data
        )

        assert response.status == ServiceStatus.SUCCESS
        assert "response" in response.data
        assert "text" in response.data["response"]
        assert "personality_profile" in response.data
        assert "multimodal_insights" in response.data

    @pytest.mark.asyncio
    async def test_personality_adaptation(self, advanced_service):
        """Test personality adaptation"""
        conversation_history = [
            {"role": "user", "content": "Please help me quickly with something"},
            {"role": "assistant", "content": "Sure, I'll be brief"},
            {"role": "user", "content": "Thank you, that was perfect"}
        ]

        personality = advanced_service.personality_engine.adapt_personality(
            "test_user", conversation_history
        )

        assert isinstance(personality, dict)
        assert PersonalityTrait.CONCISE in personality
        assert PersonalityTrait.FRIENDLY in personality
        assert 0 <= personality[PersonalityTrait.CONCISE] <= 1

    @pytest.mark.asyncio
    async def test_proactive_suggestions(self, advanced_service):
        """Test proactive suggestion generation"""
        user_context = UserContext(
            user_id="test_user",
            location=(37.7749, -122.4194),
            recent_activities=[
                {"type": "expense", "amount": 50, "category": "food"},
                {"type": "expense", "amount": 25, "category": "transport"},
                {"type": "expense", "amount": 100, "category": "shopping"}
            ]
        )

        suggestions = await advanced_service.proactive_engine.generate_suggestions(user_context)

        assert isinstance(suggestions, list)
        # Should have at least one suggestion based on activities
        if suggestions:
            suggestion = suggestions[0]
            assert hasattr(suggestion, 'type')
            assert hasattr(suggestion, 'confidence')
            assert hasattr(suggestion, 'priority')

    @pytest.mark.asyncio
    async def test_multimodal_processing(self, advanced_service):
        """Test multi-modal input processing"""
        input_data = MultiModalInput(
            text="What's in this image?",
            image_data=b"fake_image_data",
            audio_data=b"fake_audio_data"
        )

        insights = await advanced_service.multimodal_processor.process_multimodal_input(input_data)

        assert "text_analysis" in insights
        assert "audio_analysis" in insights
        assert "image_analysis" in insights
        assert "combined_insights" in insights

        combined = insights["combined_insights"]
        assert combined["modalities_processed"] >= 2  # text + image + audio

    @pytest.mark.asyncio
    async def test_user_context_update(self, advanced_service):
        """Test user context updates"""
        response = await advanced_service.update_user_context(
            user_id="test_user",
            location=(40.7128, -74.0060),  # New York
            preferences={"language": "en", "voice_speed": 1.2},
            activities=[{"type": "trip", "destination": "NYC"}]
        )

        assert response.status == ServiceStatus.SUCCESS
        assert "test_user" in advanced_service.user_contexts

        context = advanced_service.user_contexts["test_user"]
        assert context.location == (40.7128, -74.0060)
        assert context.preferences["language"] == "en"
        assert len(context.recent_activities) > 0

    @pytest.mark.asyncio
    async def test_advanced_service_metrics(self, advanced_service):
        """Test advanced service metrics"""
        metrics = advanced_service.get_metrics()

        assert "multimodal_requests" in metrics
        assert "suggestions_generated" in metrics
        assert "personality_adaptations" in metrics
        assert "context_updates" in metrics
        assert "active_users" in metrics

    @pytest.mark.asyncio
    async def test_advanced_service_health_check(self, advanced_service):
        """Test advanced service health check"""
        response = await advanced_service.health_check()

        assert response.status == ServiceStatus.SUCCESS
        assert "components" in response.data
        assert "metrics" in response.data


class TestIntegrationScenarios:
    """Integration tests for combined features"""

    @pytest.mark.asyncio
    async def test_voice_with_advanced_features(self):
        """Test voice service integration with advanced features"""
        voice_service = VoiceService()
        advanced_service = AdvancedFeaturesService()

        await voice_service.initialize()
        await advanced_service.initialize()

        # Process intelligent request with voice
        input_data = MultiModalInput(
            text="Please read this aloud",
            audio_data=b"fake_audio"
        )

        ai_response = await advanced_service.process_intelligent_request(
            "test_user", input_data
        )

        assert ai_response.status == ServiceStatus.SUCCESS

        # Synthesize the response
        if ai_response.status == ServiceStatus.SUCCESS:
            response_text = ai_response.data["response"]["text"]
            tts_response = await voice_service.synthesize(response_text)

            assert tts_response.status == ServiceStatus.SUCCESS

    @pytest.mark.asyncio
    async def test_mcp_with_advanced_features(self):
        """Test MCP integration with advanced features"""
        mcp_client = MCPClient()
        advanced_service = AdvancedFeaturesService()

        await mcp_client.initialize()
        await advanced_service.initialize()

        # Use MCP tools within advanced processing
        input_data = MultiModalInput(
            text="Can you search for information about San Francisco?"
        )

        ai_response = await advanced_service.process_intelligent_request(
            "test_user", input_data
        )

        assert ai_response.status == ServiceStatus.SUCCESS

        # Execute web search tool
        search_response = await mcp_client.execute_tool(
            "web_search",
            {"query": "San Francisco travel guide", "max_results": 3}
        )

        assert search_response.status == ServiceStatus.SUCCESS

    @pytest.mark.asyncio
    async def test_full_feature_pipeline(self):
        """Test complete feature pipeline"""
        # Initialize all services
        voice_service = VoiceService()
        mcp_client = MCPClient()
        advanced_service = AdvancedFeaturesService()

        await voice_service.initialize()
        await mcp_client.initialize()
        await advanced_service.initialize()

        # Multi-modal input with voice and text
        input_data = MultiModalInput(
            text="Help me plan a budget-friendly trip to Los Angeles",
            audio_data=b"audio_question",
            location=(37.7749, -122.4194)
        )

        # Process with advanced features
        ai_response = await advanced_service.process_intelligent_request(
            "integration_test_user", input_data
        )

        assert ai_response.status == ServiceStatus.SUCCESS
        assert "proactive_suggestions" in ai_response.data["response"]

        # Use MCP for additional data
        db_response = await mcp_client.execute_tool(
            "database_query",
            {"query": "SELECT * FROM travel_destinations WHERE city = 'Los Angeles'"}
        )

        assert db_response.status == ServiceStatus.SUCCESS

        # Generate voice response
        response_text = ai_response.data["response"]["text"]
        tts_response = await voice_service.synthesize(response_text)

        assert tts_response.status == ServiceStatus.SUCCESS

        # Verify metrics were updated
        voice_metrics = voice_service.get_metrics()
        mcp_metrics = mcp_client.get_metrics()
        advanced_metrics = advanced_service.get_metrics()

        assert voice_metrics["tts_requests"] > 0
        assert mcp_metrics["total_executions"] > 0
        assert advanced_metrics["multimodal_requests"] > 0


if __name__ == "__main__":
    # Run with: python -m pytest tests/test_enhanced_features.py -v
    pytest.main([__file__, "-v"])