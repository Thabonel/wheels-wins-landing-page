import pytest
from unittest.mock import Mock, AsyncMock, patch
from datetime import datetime, timedelta
from agents.autonomous.proactive_trip_assistant import ProactiveTripAssistant

class TestProactiveTripAssistant:
    @pytest.fixture
    def assistant(self):
        return ProactiveTripAssistant()

    def test_assistant_initialization(self, assistant):
        """Test assistant initializes with correct configuration"""
        assert assistant.monitoring_interval == 300  # 5 minutes
        assert assistant.calendar_check_interval == 3600  # 1 hour
        assert assistant.location_check_interval == 600  # 10 minutes
        assert assistant.logger is not None

    @pytest.mark.asyncio
    async def test_detect_calendar_travel_events(self, assistant):
        """Test calendar event detection identifies travel events"""
        mock_events = [
            {
                'summary': 'Road trip to Yellowstone',
                'start': {'dateTime': '2024-06-15T09:00:00Z'},
                'end': {'dateTime': '2024-06-20T17:00:00Z'},
                'location': 'Yellowstone National Park'
            },
            {
                'summary': 'Dentist appointment',
                'start': {'dateTime': '2024-06-10T14:00:00Z'},
                'end': {'dateTime': '2024-06-10T15:00:00Z'}
            }
        ]

        with patch.object(assistant, 'fetch_calendar_events', return_value=mock_events):
            travel_events = await assistant.detect_calendar_travel_events()

        assert len(travel_events) == 1
        assert travel_events[0]['summary'] == 'Road trip to Yellowstone'
        assert 'location' in travel_events[0]

    @pytest.mark.asyncio
    async def test_detect_location_changes(self, assistant):
        """Test location change detection from GPS/device data"""
        assistant.last_known_location = {'lat': 40.7128, 'lng': -74.0060}  # NYC
        current_location = {'lat': 34.0522, 'lng': -118.2437}  # LA

        with patch.object(assistant, 'get_current_location', return_value=current_location):
            location_changed = await assistant.detect_location_changes()

        assert location_changed is True
        assert assistant.last_known_location == current_location

    @pytest.mark.asyncio
    async def test_run_monitoring_cycle(self, assistant):
        """Test complete monitoring cycle execution"""
        with patch.object(assistant, 'detect_calendar_travel_events', return_value=[]):
            with patch.object(assistant, 'detect_location_changes', return_value=False):
                with patch.object(assistant, 'check_external_apis', return_value={}):
                    result = await assistant.run_monitoring_cycle()

        assert 'calendar_events' in result
        assert 'location_changed' in result
        assert 'external_data' in result
        assert 'timestamp' in result