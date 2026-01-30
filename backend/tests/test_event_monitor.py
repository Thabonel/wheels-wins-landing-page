import pytest
import asyncio
from datetime import datetime
from app.services.pam.monitoring.event_monitor import EventMonitor
from app.services.pam.monitoring.event_types import EventType, TravelEvent

def test_event_monitor_initialization():
    monitor = EventMonitor(user_id="test-user")
    assert monitor.user_id == "test-user"
    assert monitor.is_running == False

def test_monitor_can_register_event_handlers():
    monitor = EventMonitor(user_id="test-user")

    def mock_handler(event):
        return f"Handled: {event.type}"

    monitor.register_handler(EventType.LOW_FUEL, mock_handler)
    assert EventType.LOW_FUEL in monitor.handlers

@pytest.mark.asyncio
async def test_monitor_can_trigger_events():
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