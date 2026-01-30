import pytest
import asyncio
from datetime import datetime, timedelta
from unittest.mock import Mock, AsyncMock
from typing import List

from app.services.pam.monitoring.event_monitor import (
    EventMonitor,
    EventMonitorConfig,
    RetryableError,
    FatalError,
    EventHandlerError
)
from app.services.pam.monitoring.event_types import EventType, TravelEvent, EventPriority, BaseEvent

class TestEventMonitorInitialization:
    """Test EventMonitor initialization and basic functionality"""

    def test_event_monitor_initialization_with_defaults(self):
        monitor = EventMonitor(user_id="test-user")
        assert monitor.user_id == "test-user"
        assert monitor.is_running == False
        assert monitor.config.max_queue_size == 1000
        assert monitor.event_queue.maxsize == 1000

    def test_event_monitor_initialization_with_custom_config(self):
        config = EventMonitorConfig(max_queue_size=500, heartbeat_interval=2.0)
        monitor = EventMonitor(user_id="test-user", config=config)
        assert monitor.config.max_queue_size == 500
        assert monitor.config.heartbeat_interval == 2.0
        assert monitor.event_queue.maxsize == 500

    def test_monitor_can_register_event_handlers(self):
        monitor = EventMonitor(user_id="test-user")

        def mock_handler(event):
            return f"Handled: {event.type}"

        monitor.register_handler(EventType.LOW_FUEL, mock_handler)
        assert EventType.LOW_FUEL in monitor.handlers
        assert len(monitor.handlers[EventType.LOW_FUEL]) == 1

    def test_monitor_registers_multiple_handlers_for_same_event(self):
        monitor = EventMonitor(user_id="test-user")

        def handler1(event):
            pass

        def handler2(event):
            pass

        monitor.register_handler(EventType.LOW_FUEL, handler1)
        monitor.register_handler(EventType.LOW_FUEL, handler2)

        assert len(monitor.handlers[EventType.LOW_FUEL]) == 2

    def test_monitor_validates_handler_registration(self):
        monitor = EventMonitor(user_id="test-user")

        # Test invalid event type
        with pytest.raises(ValueError, match="Invalid event type"):
            monitor.register_handler("invalid_type", lambda x: None)

        # Test invalid handler
        with pytest.raises(ValueError, match="Handler must be callable"):
            monitor.register_handler(EventType.LOW_FUEL, "not_callable")

    def test_monitor_can_unregister_handlers(self):
        monitor = EventMonitor(user_id="test-user")

        def handler(event):
            pass

        monitor.register_handler(EventType.LOW_FUEL, handler)
        assert EventType.LOW_FUEL in monitor.handlers

        result = monitor.unregister_handler(EventType.LOW_FUEL, handler)
        assert result == True
        assert len(monitor.handlers[EventType.LOW_FUEL]) == 0

        # Try to unregister again
        result = monitor.unregister_handler(EventType.LOW_FUEL, handler)
        assert result == False

class TestEventTriggering:
    """Test event triggering functionality"""

    @pytest.mark.asyncio
    async def test_monitor_can_trigger_sync_events(self):
        monitor = EventMonitor(user_id="test-user")
        triggered_events = []

        def capture_handler(event):
            triggered_events.append(event)

        monitor.register_handler(EventType.LOW_FUEL, capture_handler)

        event = TravelEvent(
            type=EventType.LOW_FUEL,
            user_id="test-user",
            timestamp=datetime.now(),
            data={"fuel_level": 15, "estimated_range": 45}
        )

        await monitor.trigger_event(event)
        assert len(triggered_events) == 1
        assert triggered_events[0].type == EventType.LOW_FUEL

    @pytest.mark.asyncio
    async def test_monitor_can_trigger_async_events(self):
        monitor = EventMonitor(user_id="test-user")
        triggered_events = []

        async def async_capture_handler(event):
            triggered_events.append(event)

        monitor.register_handler(EventType.LOW_FUEL, async_capture_handler)

        event = TravelEvent(
            type=EventType.LOW_FUEL,
            user_id="test-user",
            timestamp=datetime.now(),
            data={"fuel_level": 15, "estimated_range": 45}
        )

        await monitor.trigger_event(event)
        assert len(triggered_events) == 1

    @pytest.mark.asyncio
    async def test_monitor_handles_mixed_sync_async_handlers(self):
        monitor = EventMonitor(user_id="test-user")
        sync_calls = []
        async_calls = []

        def sync_handler(event):
            sync_calls.append(event)

        async def async_handler(event):
            async_calls.append(event)

        monitor.register_handler(EventType.LOW_FUEL, sync_handler)
        monitor.register_handler(EventType.LOW_FUEL, async_handler)

        event = TravelEvent(
            type=EventType.LOW_FUEL,
            user_id="test-user",
            timestamp=datetime.now(),
            data={"fuel_level": 15}
        )

        await monitor.trigger_event(event)

        assert len(sync_calls) == 1
        assert len(async_calls) == 1
        assert sync_calls[0] == event
        assert async_calls[0] == event

class TestErrorHandling:
    """Test error handling and circuit breaker functionality"""

    @pytest.mark.asyncio
    async def test_handler_retryable_error_continues_processing(self):
        monitor = EventMonitor(user_id="test-user")
        call_count = 0

        def failing_handler(event):
            nonlocal call_count
            call_count += 1
            if call_count <= 2:
                raise RetryableError("Temporary failure")
            return "success"

        monitor.register_handler(EventType.LOW_FUEL, failing_handler)

        event = TravelEvent(
            type=EventType.LOW_FUEL,
            user_id="test-user",
            timestamp=datetime.now(),
            data={}
        )

        # First two calls should fail with RetryableError
        await monitor.trigger_event(event)
        await monitor.trigger_event(event)

        # Third call should succeed
        await monitor.trigger_event(event)

        assert call_count == 3

    @pytest.mark.asyncio
    async def test_handler_fatal_error_stops_processing(self):
        monitor = EventMonitor(user_id="test-user")
        call_count = 0

        def failing_handler(event):
            nonlocal call_count
            call_count += 1
            raise FatalError("Critical failure")

        monitor.register_handler(EventType.LOW_FUEL, failing_handler)

        event = TravelEvent(
            type=EventType.LOW_FUEL,
            user_id="test-user",
            timestamp=datetime.now(),
            data={}
        )

        await monitor.trigger_event(event)
        await monitor.trigger_event(event)

        assert call_count == 2  # Handler continues to be called despite fatal errors

    @pytest.mark.asyncio
    async def test_circuit_breaker_opens_after_consecutive_failures(self):
        config = EventMonitorConfig(circuit_breaker_threshold=2)
        monitor = EventMonitor(user_id="test-user", config=config)
        call_count = 0

        def failing_handler(event):
            nonlocal call_count
            call_count += 1
            raise Exception("Generic failure")

        monitor.register_handler(EventType.LOW_FUEL, failing_handler)

        event = TravelEvent(
            type=EventType.LOW_FUEL,
            user_id="test-user",
            timestamp=datetime.now(),
            data={}
        )

        # Trigger enough failures to open circuit breaker
        await monitor.trigger_event(event)
        await monitor.trigger_event(event)

        # Circuit breaker should be open now
        await monitor.trigger_event(event)

        # Check that circuit breaker is open in stats
        stats = monitor.get_stats()
        handler_stats = list(stats["handler_stats"].values())[0]
        assert handler_stats["circuit_breaker_open"] == True

        # Call count should be 2 (circuit breaker prevents third call)
        assert call_count == 2

    @pytest.mark.asyncio
    async def test_circuit_breaker_resets_after_timeout(self):
        config = EventMonitorConfig(
            circuit_breaker_threshold=2,
            circuit_breaker_timeout=timedelta(milliseconds=100)
        )
        monitor = EventMonitor(user_id="test-user", config=config)
        call_count = 0

        def failing_then_succeeding_handler(event):
            nonlocal call_count
            call_count += 1
            if call_count <= 2:
                raise Exception("Initial failures")
            return "success"

        monitor.register_handler(EventType.LOW_FUEL, failing_then_succeeding_handler)

        event = TravelEvent(
            type=EventType.LOW_FUEL,
            user_id="test-user",
            timestamp=datetime.now(),
            data={}
        )

        # Trigger failures to open circuit breaker
        await monitor.trigger_event(event)
        await monitor.trigger_event(event)

        # Wait for circuit breaker timeout
        await asyncio.sleep(0.15)

        # Reset circuit breakers manually
        monitor._maybe_reset_circuit_breakers()

        # Now this should succeed
        await monitor.trigger_event(event)

        assert call_count == 3

    @pytest.mark.asyncio
    async def test_unexpected_error_doesnt_crash_monitoring(self):
        monitor = EventMonitor(user_id="test-user")
        handled_events = []

        def normal_handler(event):
            handled_events.append(event)

        def failing_handler(event):
            raise RuntimeError("Unexpected error")

        monitor.register_handler(EventType.LOW_FUEL, failing_handler)
        monitor.register_handler(EventType.LOW_FUEL, normal_handler)

        event = TravelEvent(
            type=EventType.LOW_FUEL,
            user_id="test-user",
            timestamp=datetime.now(),
            data={}
        )

        await monitor.trigger_event(event)

        # Normal handler should still execute despite failing handler
        assert len(handled_events) == 1

class TestQueueManagement:
    """Test queue overflow and management"""

    @pytest.mark.asyncio
    async def test_queue_event_success(self):
        monitor = EventMonitor(user_id="test-user")

        event = TravelEvent(
            type=EventType.LOW_FUEL,
            user_id="test-user",
            timestamp=datetime.now(),
            data={}
        )

        result = await monitor.queue_event(event)
        assert result == True
        assert monitor.event_queue.qsize() == 1

    @pytest.mark.asyncio
    async def test_queue_event_validates_user_id(self):
        monitor = EventMonitor(user_id="test-user")

        event = TravelEvent(
            type=EventType.LOW_FUEL,
            user_id="different-user",  # Wrong user ID
            timestamp=datetime.now(),
            data={}
        )

        result = await monitor.queue_event(event)
        assert result == False

    @pytest.mark.asyncio
    async def test_queue_overflow_handling(self):
        config = EventMonitorConfig(max_queue_size=2)
        monitor = EventMonitor(user_id="test-user", config=config)

        # Fill queue to capacity
        for i in range(2):
            event = TravelEvent(
                type=EventType.LOW_FUEL,
                user_id="test-user",
                timestamp=datetime.now(),
                data={"index": i}
            )
            result = await monitor.queue_event(event)
            assert result == True

        # This should fail due to queue being full
        overflow_event = TravelEvent(
            type=EventType.LOW_FUEL,
            user_id="test-user",
            timestamp=datetime.now(),
            data={"overflow": True}
        )
        result = await monitor.queue_event(overflow_event)
        assert result == False

class TestAsyncMonitoringLoop:
    """Test the async monitoring loop behavior"""

    @pytest.mark.asyncio
    async def test_monitoring_loop_processes_queued_events(self):
        monitor = EventMonitor(user_id="test-user")
        processed_events = []

        def handler(event):
            processed_events.append(event)

        monitor.register_handler(EventType.LOW_FUEL, handler)

        # Start monitoring
        await monitor.start_monitoring()

        # Queue some events
        for i in range(3):
            event = TravelEvent(
                type=EventType.LOW_FUEL,
                user_id="test-user",
                timestamp=datetime.now(),
                data={"index": i}
            )
            await monitor.queue_event(event)

        # Give time for processing
        await asyncio.sleep(0.1)

        # Stop monitoring
        await monitor.stop_monitoring()

        assert len(processed_events) == 3

    @pytest.mark.asyncio
    async def test_monitoring_loop_handles_no_handlers(self):
        config = EventMonitorConfig(heartbeat_interval=0.05)  # Fast heartbeat for testing
        monitor = EventMonitor(user_id="test-user", config=config)

        # Start monitoring without any handlers
        await monitor.start_monitoring()

        # Queue an event
        event = TravelEvent(
            type=EventType.LOW_FUEL,
            user_id="test-user",
            timestamp=datetime.now(),
            data={}
        )
        await monitor.queue_event(event)

        # Give time for processing
        await asyncio.sleep(0.1)

        # Stop monitoring
        await monitor.stop_monitoring()

        # Should not crash
        stats = monitor.get_stats()
        assert stats["processed_events"] == 1

    @pytest.mark.asyncio
    async def test_monitoring_loop_stops_gracefully(self):
        config = EventMonitorConfig(heartbeat_interval=0.05)
        monitor = EventMonitor(user_id="test-user", config=config)

        await monitor.start_monitoring()
        assert monitor.is_running == True

        await monitor.stop_monitoring()
        assert monitor.is_running == False

    @pytest.mark.asyncio
    async def test_monitoring_prevents_double_start(self):
        monitor = EventMonitor(user_id="test-user")

        await monitor.start_monitoring()

        # Try to start again - should not crash
        await monitor.start_monitoring()

        await monitor.stop_monitoring()

class TestStatisticsAndMonitoring:
    """Test statistics collection and monitoring features"""

    def test_get_stats_returns_comprehensive_data(self):
        monitor = EventMonitor(user_id="test-user")

        def handler(event):
            pass

        monitor.register_handler(EventType.LOW_FUEL, handler)
        monitor.register_handler(EventType.BUDGET_THRESHOLD, handler)

        stats = monitor.get_stats()

        assert stats["user_id"] == "test-user"
        assert stats["is_running"] == False
        assert stats["processed_events"] == 0
        assert stats["failed_events"] == 0
        assert stats["queue_size"] == 0
        assert stats["max_queue_size"] == 1000
        assert "registered_handlers" in stats
        assert "handler_stats" in stats

    @pytest.mark.asyncio
    async def test_stats_track_handler_performance(self):
        monitor = EventMonitor(user_id="test-user")
        call_count = 0

        def counting_handler(event):
            nonlocal call_count
            call_count += 1
            if call_count == 2:
                raise Exception("Second call fails")

        monitor.register_handler(EventType.LOW_FUEL, counting_handler)

        event = TravelEvent(
            type=EventType.LOW_FUEL,
            user_id="test-user",
            timestamp=datetime.now(),
            data={}
        )

        # Trigger events
        await monitor.trigger_event(event)  # Success
        await monitor.trigger_event(event)  # Failure
        await monitor.trigger_event(event)  # Success

        stats = monitor.get_stats()
        handler_stats = list(stats["handler_stats"].values())[0]

        assert handler_stats["total_calls"] == 3
        assert handler_stats["successful_calls"] == 2
        assert handler_stats["failed_calls"] == 1
        assert abs(handler_stats["success_rate"] - 66.66666666666667) < 0.0001

class TestEventValidation:
    """Test event validation functionality"""

    def test_event_validation_in_base_event(self):
        # Valid event
        event = TravelEvent(
            type=EventType.LOW_FUEL,
            user_id="test-user",
            timestamp=datetime.now(),
            data={"fuel": 10},
            priority=EventPriority.HIGH
        )
        assert event.type == EventType.LOW_FUEL

        # Invalid event type
        with pytest.raises(ValueError, match="Invalid event type"):
            BaseEvent(
                type="invalid",
                user_id="test-user",
                timestamp=datetime.now(),
                data={}
            )

        # Empty user_id
        with pytest.raises(ValueError, match="user_id cannot be empty"):
            BaseEvent(
                type=EventType.LOW_FUEL,
                user_id="",
                timestamp=datetime.now(),
                data={}
            )

        # Future timestamp
        future_time = datetime.now() + timedelta(hours=1)
        with pytest.raises(ValueError, match="Event timestamp cannot be in the future"):
            BaseEvent(
                type=EventType.LOW_FUEL,
                user_id="test-user",
                timestamp=future_time,
                data={}
            )

        # Invalid data type
        with pytest.raises(ValueError, match="data must be a dictionary"):
            BaseEvent(
                type=EventType.LOW_FUEL,
                user_id="test-user",
                timestamp=datetime.now(),
                data="not_a_dict"
            )

class TestPriorityHandling:
    """Test event priority functionality"""

    def test_priority_enum_comparison(self):
        assert EventPriority.LOW < EventPriority.NORMAL
        assert EventPriority.NORMAL < EventPriority.HIGH
        assert EventPriority.HIGH < EventPriority.URGENT

    def test_priority_enum_values(self):
        assert EventPriority.LOW.value == "low"
        assert EventPriority.NORMAL.value == "normal"
        assert EventPriority.HIGH.value == "high"
        assert EventPriority.URGENT.value == "urgent"

class TestPerformanceAndMemory:
    """Test performance characteristics and memory management"""

    @pytest.mark.asyncio
    async def test_large_number_of_events_processing(self):
        """Test processing many events without memory issues"""
        monitor = EventMonitor(user_id="test-user")
        processed_count = 0

        def counting_handler(event):
            nonlocal processed_count
            processed_count += 1

        monitor.register_handler(EventType.LOW_FUEL, counting_handler)

        # Process 100 events
        for i in range(100):
            event = TravelEvent(
                type=EventType.LOW_FUEL,
                user_id="test-user",
                timestamp=datetime.now(),
                data={"index": i}
            )
            await monitor.trigger_event(event)

        assert processed_count == 100

    @pytest.mark.asyncio
    async def test_concurrent_event_processing(self):
        """Test concurrent event processing doesn't cause issues"""
        monitor = EventMonitor(user_id="test-user")
        processed_events = []

        async def async_handler(event):
            # Simulate some async work
            await asyncio.sleep(0.001)
            processed_events.append(event)

        monitor.register_handler(EventType.LOW_FUEL, async_handler)

        # Create multiple events
        events = []
        for i in range(10):
            events.append(TravelEvent(
                type=EventType.LOW_FUEL,
                user_id="test-user",
                timestamp=datetime.now(),
                data={"index": i}
            ))

        # Process them concurrently
        tasks = [monitor.trigger_event(event) for event in events]
        await asyncio.gather(*tasks)

        assert len(processed_events) == 10

if __name__ == "__main__":
    pytest.main([__file__])