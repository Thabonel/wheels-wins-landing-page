import pytest
from unittest.mock import Mock, patch
from datetime import datetime
from app.services.pam.monitoring.manager import EventManager
from app.services.pam.monitoring.event_types import EventType, TravelEvent

@pytest.mark.asyncio
async def test_event_manager_creates_monitors_per_user():
    manager = EventManager()

    # Create monitor for user
    monitor = await manager.get_or_create_monitor("test-user")
    assert monitor.user_id == "test-user"

    # Getting same user returns same monitor
    monitor2 = await manager.get_or_create_monitor("test-user")
    assert monitor is monitor2

@pytest.mark.asyncio
async def test_event_manager_can_broadcast_to_pam():
    manager = EventManager()

    with patch('app.services.pam.monitoring.manager.send_proactive_message') as mock_send:
        event = TravelEvent(
            type=EventType.LOW_FUEL,
            user_id="test-user",
            timestamp=datetime.now(),
            data={"fuel_level": 15}
        )

        await manager.handle_proactive_event(event)
        mock_send.assert_called_once()