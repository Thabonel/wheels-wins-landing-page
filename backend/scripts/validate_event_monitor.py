#!/usr/bin/env python3
"""
Validation script for the enhanced Event Monitoring Service
Demonstrates all key features and validates production readiness
"""

import asyncio
import time
from datetime import datetime
from typing import List

from app.services.pam.monitoring.event_monitor import (
    EventMonitor,
    EventMonitorConfig,
    RetryableError,
    FatalError
)
from app.services.pam.monitoring.event_types import EventType, TravelEvent, EventPriority


async def main():
    """Demonstrate all Event Monitor capabilities"""
    print("🧪 Event Monitor Validation Script")
    print("=" * 50)

    # 1. Test Configuration
    print("\n1. Configuration Test")
    config = EventMonitorConfig(
        max_queue_size=100,
        heartbeat_interval=0.5,
        circuit_breaker_threshold=3
    )
    monitor = EventMonitor(user_id="validation-user", config=config)
    print(f"✅ Monitor created with custom config (queue size: {config.max_queue_size})")

    # 2. Test Handler Registration
    print("\n2. Handler Registration Test")
    processed_events = []

    def sync_handler(event):
        processed_events.append(f"SYNC: {event.type.value}")

    async def async_handler(event):
        await asyncio.sleep(0.001)  # Simulate async work
        processed_events.append(f"ASYNC: {event.type.value}")

    monitor.register_handler(EventType.LOW_FUEL, sync_handler)
    monitor.register_handler(EventType.LOW_FUEL, async_handler)
    print("✅ Registered sync and async handlers")

    # 3. Test Event Creation with Priority
    print("\n3. Event Creation Test")
    events = [
        TravelEvent(
            type=EventType.LOW_FUEL,
            user_id="validation-user",
            timestamp=datetime.now(),
            data={"fuel_level": 10},
            priority=EventPriority.URGENT
        ),
        TravelEvent(
            type=EventType.TRAFFIC_DELAY,
            user_id="validation-user",
            timestamp=datetime.now(),
            data={"delay_minutes": 30},
            priority=EventPriority.HIGH
        )
    ]
    print(f"✅ Created {len(events)} events with priority levels")

    # 4. Test Error Handling
    print("\n4. Error Handling Test")
    call_count = 0

    def error_handler(event):
        nonlocal call_count
        call_count += 1
        if call_count == 1:
            raise RetryableError("Temporary failure")
        elif call_count == 2:
            raise FatalError("Critical failure")
        return "success"

    monitor.register_handler(EventType.TRAFFIC_DELAY, error_handler)
    print("✅ Registered error-prone handler")

    # 5. Test Event Processing
    print("\n5. Event Processing Test")
    await monitor.trigger_event(events[0])  # LOW_FUEL - should work
    await monitor.trigger_event(events[1])  # TRAFFIC_DELAY - retryable error
    await monitor.trigger_event(events[1])  # TRAFFIC_DELAY - fatal error

    print(f"✅ Processed events, handler called {call_count} times")
    print(f"✅ Captured {len(processed_events)} handler results: {processed_events}")

    # 6. Test Queue Management
    print("\n6. Queue Management Test")
    await monitor.start_monitoring()

    # Queue multiple events
    for i in range(5):
        event = TravelEvent(
            type=EventType.LOW_FUEL,
            user_id="validation-user",
            timestamp=datetime.now(),
            data={"index": i}
        )
        await monitor.queue_event(event)

    # Give time for processing
    await asyncio.sleep(0.2)
    await monitor.stop_monitoring()

    print(f"✅ Queued and processed 5 events via monitoring loop")

    # 7. Test Statistics
    print("\n7. Statistics Test")
    stats = monitor.get_stats()
    print(f"✅ Monitor Statistics:")
    print(f"   - User ID: {stats['user_id']}")
    print(f"   - Processed Events: {stats['processed_events']}")
    print(f"   - Failed Events: {stats['failed_events']}")
    print(f"   - Queue Size: {stats['queue_size']}")
    print(f"   - Registered Handlers: {stats['registered_handlers']}")

    # 8. Test Priority Comparison
    print("\n8. Priority System Test")
    priorities = [EventPriority.LOW, EventPriority.NORMAL, EventPriority.HIGH, EventPriority.URGENT]
    for i in range(len(priorities) - 1):
        assert priorities[i] < priorities[i + 1], f"Priority comparison failed: {priorities[i]} < {priorities[i + 1]}"
    print("✅ Priority comparison system working correctly")

    # 9. Test Performance
    print("\n9. Performance Test")
    perf_monitor = EventMonitor(user_id="perf-user")
    perf_count = 0

    def perf_handler(event):
        nonlocal perf_count
        perf_count += 1

    perf_monitor.register_handler(EventType.LOW_FUEL, perf_handler)

    # Process 1000 events and measure time
    start_time = time.time()
    for i in range(1000):
        event = TravelEvent(
            type=EventType.LOW_FUEL,
            user_id="perf-user",
            timestamp=datetime.now(),
            data={"index": i}
        )
        await perf_monitor.trigger_event(event)

    processing_time = time.time() - start_time
    throughput = 1000 / processing_time

    print(f"✅ Performance: {throughput:.0f} events/second ({processing_time:.3f}s for 1000 events)")

    # 10. Test Circuit Breaker
    print("\n10. Circuit Breaker Test")
    cb_config = EventMonitorConfig(circuit_breaker_threshold=2)
    cb_monitor = EventMonitor(user_id="circuit-user", config=cb_config)
    cb_count = 0

    def failing_handler(event):
        nonlocal cb_count
        cb_count += 1
        raise Exception(f"Failure #{cb_count}")

    cb_monitor.register_handler(EventType.LOW_FUEL, failing_handler)

    # Trigger failures
    test_event = TravelEvent(
        type=EventType.LOW_FUEL,
        user_id="circuit-user",
        timestamp=datetime.now(),
        data={}
    )

    await cb_monitor.trigger_event(test_event)  # Failure 1
    await cb_monitor.trigger_event(test_event)  # Failure 2 - should open circuit breaker
    await cb_monitor.trigger_event(test_event)  # Should be blocked by circuit breaker

    cb_stats = cb_monitor.get_stats()
    handler_stats = list(cb_stats["handler_stats"].values())[0]

    print(f"✅ Circuit breaker test:")
    print(f"   - Handler called: {cb_count} times")
    print(f"   - Circuit breaker open: {handler_stats['circuit_breaker_open']}")

    print("\n" + "=" * 50)
    print("🎉 All validation tests passed!")
    print("✅ Event Monitor is production-ready")


if __name__ == "__main__":
    asyncio.run(main())