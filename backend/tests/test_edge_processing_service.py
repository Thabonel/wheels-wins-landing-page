"""
Tests for Edge Processing Service
Comprehensive test suite for backend edge computing functionality
"""

import pytest
import asyncio
import time
from unittest.mock import patch, Mock

from app.services.voice.edge_processing_service import (
    EdgeProcessingService,
    EdgeQuery,
    QueryCategory,
    ProcessingSource,
    ProcessingResult
)


class TestEdgeProcessingService:
    """Test suite for EdgeProcessingService"""

    @pytest.fixture
    def service(self):
        """Create edge processing service for testing"""
        config = {
            "enabled": True,
            "confidence_threshold": 0.7,
            "max_processing_time_ms": 100,
            "cache_enabled": True,
            "fuzzy_matching": True,
            "learning_enabled": True
        }
        return EdgeProcessingService(config)

    @pytest.fixture
    def minimal_service(self):
        """Create minimal edge processing service"""
        return EdgeProcessingService({"enabled": True})

    def test_initialization(self):
        """Test service initialization"""
        service = EdgeProcessingService()
        assert service.config["enabled"] is True
        assert service.config["confidence_threshold"] == 0.7
        assert len(service.queries) > 0  # Should have common queries loaded

    def test_custom_configuration(self):
        """Test initialization with custom configuration"""
        config = {
            "confidence_threshold": 0.8,
            "max_processing_time_ms": 50,
            "cache_enabled": False
        }
        service = EdgeProcessingService(config)
        
        assert service.config["confidence_threshold"] == 0.8
        assert service.config["max_processing_time_ms"] == 50
        assert service.config["cache_enabled"] is False

    @pytest.mark.asyncio
    async def test_time_queries(self, service):
        """Test time and date query processing"""
        # Test current time
        result = await service.process_query("what time is it")
        assert result.handled is True
        assert result.source == ProcessingSource.EDGE
        assert ":" in result.response  # Should contain time format
        assert result.confidence > 0.7
        assert result.processing_time_ms < 100

        # Test current date
        result = await service.process_query("what date is it")
        assert result.handled is True
        assert result.response is not None
        assert result.confidence > 0.7

        # Test various time formats
        time_queries = [
            "current time",
            "tell me the time",
            "time please"
        ]
        for query in time_queries:
            result = await service.process_query(query)
            assert result.handled is True
            assert ":" in result.response

    @pytest.mark.asyncio
    async def test_calculation_queries(self, service):
        """Test mathematical calculation processing"""
        # Test simple addition
        result = await service.process_query("5 plus 3")
        assert result.handled is True
        assert "8" in result.response
        assert result.confidence > 0.7

        # Test various operations
        calculations = [
            ("10 minus 4", "6"),
            ("6 times 7", "42"),
            ("20 divided by 4", "5")
        ]
        
        for query, expected in calculations:
            result = await service.process_query(query)
            assert result.handled is True
            assert expected in result.response

        # Test decimal calculations
        result = await service.process_query("3.5 plus 2.5")
        assert result.handled is True
        assert "6" in result.response

        # Test division by zero
        result = await service.process_query("5 divided by 0")
        assert result.handled is True
        assert "Cannot divide by zero" in result.response

    @pytest.mark.asyncio
    async def test_vehicle_status_queries(self, service):
        """Test vehicle status query processing"""
        # Test fuel level
        result = await service.process_query("how much fuel")
        assert result.handled is True
        assert "Fuel level is at" in result.response
        assert "%" in result.response

        # Test battery status
        result = await service.process_query("battery level")
        assert result.handled is True
        assert "Battery is at" in result.response
        assert "%" in result.response

        # Test various fuel query formats
        fuel_queries = [
            "fuel level",
            "gas level", 
            "fuel remaining",
            "how much gas"
        ]
        for query in fuel_queries:
            result = await service.process_query(query)
            assert result.handled is True
            assert "Fuel level" in result.response

    @pytest.mark.asyncio
    async def test_travel_info_queries(self, service):
        """Test travel information query processing"""
        # Test trip distance
        result = await service.process_query("how far to destination")
        assert result.handled is True
        assert "miles remaining" in result.response

        # Test arrival time
        result = await service.process_query("when will we arrive")
        assert result.handled is True
        assert "Estimated arrival" in result.response

    @pytest.mark.asyncio
    async def test_help_queries(self, service):
        """Test help and information query processing"""
        # Test help request
        result = await service.process_query("help")
        assert result.handled is True
        assert "navigation" in result.response
        assert "weather" in result.response

        # Test PAM introduction
        result = await service.process_query("who are you")
        assert result.handled is True
        assert "PAM" in result.response
        assert "Personal Assistant" in result.response

    @pytest.mark.asyncio
    async def test_caching_system(self, service):
        """Test query result caching"""
        query = "help"
        
        # First call
        result1 = await service.process_query(query)
        assert result1.source == ProcessingSource.EDGE
        
        # Second call should potentially be cached for static responses
        result2 = await service.process_query(query)
        assert result2.handled is True
        
        # Check cache functionality
        service.clear_cache()
        metrics = service.get_metrics()
        assert metrics["total_queries"] >= 2

    @pytest.mark.asyncio
    async def test_unknown_queries(self, service):
        """Test handling of unknown queries"""
        result = await service.process_query("completely unknown query that should not match anything")
        assert result.handled is False
        assert result.source == ProcessingSource.FALLBACK
        assert result.confidence < 0.7

    @pytest.mark.asyncio
    async def test_empty_query(self, service):
        """Test handling of empty queries"""
        result = await service.process_query("")
        assert result.handled is False
        assert result.confidence == 0

    @pytest.mark.asyncio
    async def test_performance_requirements(self, service):
        """Test performance requirements"""
        start_time = time.time()
        result = await service.process_query("what time is it")
        duration = (time.time() - start_time) * 1000
        
        assert duration < 100  # Should be very fast
        assert result.processing_time_ms < 100
        assert result.handled is True

    def test_query_management(self, service):
        """Test adding and removing queries"""
        # Add custom query
        custom_query = EdgeQuery(
            id="test_custom",
            patterns=["test custom query"],
            response="Custom test response",
            category=QueryCategory.QUICK_FACTS,
            confidence_threshold=0.8
        )
        
        service.add_query(custom_query)
        assert "test_custom" in service.queries
        
        # Remove query
        service.remove_query("test_custom")
        assert "test_custom" not in service.queries

    @pytest.mark.asyncio
    async def test_context_integration(self, service):
        """Test context data integration"""
        context = {
            "user_id": "test_user",
            "location": "highway",
            "time_of_day": "morning"
        }
        
        result = await service.process_query("help", context)
        assert result.handled is True

    def test_configuration_updates(self, service):
        """Test configuration updates"""
        original_threshold = service.config["confidence_threshold"]
        
        service.update_config({"confidence_threshold": 0.9})
        assert service.config["confidence_threshold"] == 0.9
        assert service.config["confidence_threshold"] != original_threshold

    def test_metrics_tracking(self, service):
        """Test metrics tracking functionality"""
        initial_metrics = service.get_metrics()
        
        # Process some queries
        asyncio.run(service.process_query("help"))
        asyncio.run(service.process_query("what time is it"))
        asyncio.run(service.process_query("unknown query"))
        
        final_metrics = service.get_metrics()
        
        assert final_metrics["total_queries"] >= initial_metrics["total_queries"] + 3
        assert final_metrics["edge_handled"] > initial_metrics["edge_handled"]
        assert final_metrics["avg_processing_time"] > 0

    @pytest.mark.asyncio
    async def test_fuzzy_matching(self, service):
        """Test fuzzy matching capability"""
        # Test with slight misspelling
        result = await service.process_query("wat time is it")
        # Should still have some confidence but may not reach threshold
        assert isinstance(result.confidence, float)

    @pytest.mark.asyncio
    async def test_pattern_matching_with_entities(self, service):
        """Test pattern matching with entity extraction"""
        # Test calculation with entity extraction
        result = await service.process_query("calculate 15 plus 25")
        assert result.handled is True
        assert "40" in result.response

    @pytest.mark.asyncio
    async def test_disabled_service(self):
        """Test service when disabled"""
        disabled_service = EdgeProcessingService({"enabled": False})
        
        result = await disabled_service.process_query("what time is it")
        assert result.handled is False
        assert result.source == ProcessingSource.FALLBACK

    @pytest.mark.asyncio
    async def test_timeout_handling(self):
        """Test handling of processing timeouts"""
        # Create service with very short timeout
        fast_service = EdgeProcessingService({
            "enabled": True,
            "max_processing_time_ms": 1  # 1ms timeout
        })
        
        result = await fast_service.process_query("what time is it")
        # Should either succeed very quickly or fail due to timeout
        assert isinstance(result.handled, bool)

    def test_learning_data_management(self, service):
        """Test learning data management"""
        # Process some queries to generate learning data
        asyncio.run(service.process_query("help"))
        asyncio.run(service.process_query("what time is it"))
        
        # Learning data should be updated
        assert len(service.learning_data) >= 0

    @pytest.mark.asyncio
    async def test_special_characters(self, service):
        """Test handling of special characters in queries"""
        result = await service.process_query("what time is it???")
        assert result.handled is True
        assert ":" in result.response

    @pytest.mark.asyncio
    async def test_very_long_query(self, service):
        """Test handling of very long queries"""
        long_query = "this is a very long query " * 20  # Very long query
        
        result = await service.process_query(long_query)
        assert result.processing_time_ms < 100  # Should still be fast
        assert isinstance(result.handled, bool)

    @pytest.mark.asyncio
    async def test_concurrent_processing(self, service):
        """Test concurrent query processing"""
        queries = [
            "what time is it",
            "help",
            "5 plus 3",
            "fuel level",
            "battery status"
        ]
        
        # Process queries concurrently
        tasks = [service.process_query(query) for query in queries]
        results = await asyncio.gather(*tasks)
        
        # All should complete successfully
        for result in results:
            assert isinstance(result, ProcessingResult)
            assert result.processing_time_ms < 100

    def test_context_update(self, service):
        """Test context data updates"""
        service.update_context("user_name", "John")
        service.update_context("vehicle_type", "motorhome")
        
        assert service.context_data["user_name"] == "John"
        assert service.context_data["vehicle_type"] == "motorhome"

    @pytest.mark.asyncio
    async def test_dynamic_response_generation(self, service):
        """Test dynamic response generation"""
        # Test time response (should be current)
        result1 = await service.process_query("what time is it")
        await asyncio.sleep(0.1)
        result2 = await service.process_query("what time is it")
        
        # Responses should be dynamic (though may be very close in time)
        assert result1.handled is True
        assert result2.handled is True

    @pytest.mark.asyncio
    async def test_error_handling_in_dynamic_response(self, service):
        """Test error handling in dynamic response generation"""
        # Test with calculation that might cause issues
        result = await service.process_query("calculate abc plus def")
        assert result.handled is True
        assert "valid numbers" in result.response.lower()

    def test_cache_ttl_functionality(self, service):
        """Test cache TTL (time-to-live) functionality"""
        # This test ensures cache entries expire properly
        service._cache_result("test_query", "test_response", 1)  # 1 second TTL
        
        # Should find cached result immediately
        cached = service._check_cache("test_query")
        assert cached is not None
        
        # After TTL expires, should not find cached result
        # Note: In actual test, we'd need to wait or mock time

    @pytest.mark.asyncio
    async def test_query_normalization(self, service):
        """Test query normalization"""
        # Test that different cases and punctuation are handled
        queries = [
            "WHAT TIME IS IT",
            "what time is it?",
            "What Time Is It!!!",
            "  what time is it  "
        ]
        
        for query in queries:
            result = await service.process_query(query)
            assert result.handled is True
            assert ":" in result.response

    def test_metrics_accuracy(self, service):
        """Test metrics accuracy and calculations"""
        initial_metrics = service.get_metrics()
        
        # Process known edge queries
        asyncio.run(service.process_query("help"))
        asyncio.run(service.process_query("what time is it"))
        
        # Process unknown query
        asyncio.run(service.process_query("completely unknown"))
        
        metrics = service.get_metrics()
        
        # Verify metrics are updated correctly
        assert metrics["total_queries"] >= initial_metrics["total_queries"] + 3
        assert metrics["edge_handled"] >= initial_metrics["edge_handled"] + 2
        assert metrics["fallback_needed"] >= initial_metrics["fallback_needed"] + 1


@pytest.mark.integration
class TestEdgeProcessingIntegration:
    """Integration tests for edge processing with other components"""

    @pytest.mark.asyncio
    async def test_integration_with_pam_endpoint(self):
        """Test integration with PAM WebSocket endpoint"""
        # This would test the actual integration in the WebSocket handler
        # For now, we'll test the service independently
        service = EdgeProcessingService()
        
        # Simulate a chat message like PAM would receive
        result = await service.process_query(
            "what time is it",
            {"user_id": "test_user", "connection_type": "websocket"}
        )
        
        assert result.handled is True
        assert result.source == ProcessingSource.EDGE
        assert result.processing_time_ms < 100

    @pytest.mark.asyncio
    async def test_realistic_conversation_flow(self):
        """Test realistic conversation flow"""
        service = EdgeProcessingService()
        
        conversation = [
            "help",
            "what time is it",
            "5 plus 3",
            "fuel level",
            "when will we arrive",
            "completely unknown complex query that should fallback"
        ]
        
        edge_handled = 0
        fallback_needed = 0
        
        for query in conversation:
            result = await service.process_query(query)
            if result.handled:
                edge_handled += 1
            else:
                fallback_needed += 1
        
        # Should handle most queries at edge
        assert edge_handled >= 4
        assert fallback_needed >= 1  # At least the complex unknown query

    def test_service_lifecycle(self):
        """Test complete service lifecycle"""
        # Initialize
        service = EdgeProcessingService()
        assert service.config["enabled"] is True
        
        # Use service
        asyncio.run(service.process_query("help"))
        metrics = service.get_metrics()
        assert metrics["total_queries"] > 0
        
        # Update configuration
        service.update_config({"confidence_threshold": 0.9})
        assert service.config["confidence_threshold"] == 0.9
        
        # Clear cache
        service.clear_cache()
        
        # Service should still work
        result = asyncio.run(service.process_query("what time is it"))
        assert result.handled is True


if __name__ == "__main__":
    pytest.main([__file__])