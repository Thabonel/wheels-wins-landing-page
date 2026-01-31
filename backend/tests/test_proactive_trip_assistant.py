import pytest
from unittest.mock import Mock, AsyncMock, patch
from datetime import datetime, timedelta
from agents.autonomous.proactive_trip_assistant import ProactiveTripAssistant
from agents.autonomous.pattern_learning import TripPatternAnalyzer

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


class TestTripPatternAnalyzer:
    @pytest.fixture
    def pattern_analyzer(self):
        return TripPatternAnalyzer()

    @pytest.fixture
    def sample_trip_data(self):
        return [
            {
                'user_id': 'test-user',
                'start_date': '2024-01-15',
                'end_date': '2024-01-20',
                'destinations': [{'lat': 44.428, 'lng': -110.588, 'name': 'Yellowstone'}],
                'trip_type': 'national_park',
                'budget': 1200,
                'duration_days': 5
            },
            {
                'user_id': 'test-user',
                'start_date': '2024-03-10',
                'end_date': '2024-03-15',
                'destinations': [{'lat': 36.106, 'lng': -112.112, 'name': 'Grand Canyon'}],
                'trip_type': 'national_park',
                'budget': 800,
                'duration_days': 5
            },
            {
                'user_id': 'test-user',
                'start_date': '2024-06-01',
                'end_date': '2024-06-10',
                'destinations': [{'lat': 47.751, 'lng': -120.740, 'name': 'North Cascades'}],
                'trip_type': 'national_park',
                'budget': 1500,
                'duration_days': 9
            }
        ]

    def test_pattern_analyzer_initialization(self, pattern_analyzer):
        """Test pattern analyzer initializes with correct configuration"""
        assert pattern_analyzer.min_trips_for_pattern == 3
        assert pattern_analyzer.pattern_confidence_threshold == 0.7
        assert pattern_analyzer.preference_categories == [
            'trip_type', 'destination_type', 'budget_range', 'duration_range', 'season_preference'
        ]

    @pytest.mark.asyncio
    async def test_analyze_trip_patterns(self, pattern_analyzer, sample_trip_data):
        """Test trip pattern analysis from historical data"""
        patterns = await pattern_analyzer.analyze_trip_patterns(sample_trip_data)

        assert 'trip_type_preference' in patterns
        assert 'budget_patterns' in patterns
        assert 'duration_patterns' in patterns
        assert 'seasonal_patterns' in patterns
        assert 'destination_patterns' in patterns

        # Should detect national park preference
        assert patterns['trip_type_preference']['national_park'] > 0.8

    @pytest.mark.asyncio
    async def test_generate_user_profile(self, pattern_analyzer, sample_trip_data):
        """Test user profile generation from trip patterns"""
        profile = await pattern_analyzer.generate_user_profile('test-user', sample_trip_data)

        assert profile['user_id'] == 'test-user'
        assert 'preferences' in profile
        assert 'confidence_scores' in profile
        assert 'last_updated' in profile

        # Should have identified preferences
        assert 'trip_type' in profile['preferences']
        assert profile['preferences']['trip_type'] == 'national_park'

    @pytest.mark.asyncio
    async def test_predict_next_trip_preferences(self, pattern_analyzer, sample_trip_data):
        """Test prediction of next trip preferences based on patterns"""
        predictions = await pattern_analyzer.predict_next_trip_preferences(sample_trip_data)

        assert 'recommended_destinations' in predictions
        assert 'suggested_budget_range' in predictions
        assert 'optimal_duration' in predictions
        assert 'best_travel_months' in predictions
        assert 'confidence_score' in predictions

    @pytest.mark.asyncio
    async def test_save_learned_patterns(self, pattern_analyzer):
        """Test saving learned patterns to memory-keeper"""
        pattern_data = {
            'user_id': 'test-user',
            'patterns': {'trip_type': 'national_park'},
            'confidence': 0.85
        }

        # Mock memory-keeper save
        pattern_analyzer.mcp__memory_keeper__context_save = AsyncMock()

        await pattern_analyzer.save_learned_patterns(pattern_data)

        pattern_analyzer.mcp__memory_keeper__context_save.assert_called_once()

    @pytest.mark.asyncio
    async def test_load_user_patterns(self, pattern_analyzer):
        """Test loading user patterns from memory-keeper"""
        # Mock memory-keeper search
        mock_patterns = [
            {
                'key': 'user_patterns_test-user',
                'value': '{"trip_type": "national_park", "confidence": 0.85}',
                'created': '2024-01-01T12:00:00Z'
            }
        ]
        pattern_analyzer.mcp__memory_keeper__context_search = AsyncMock(return_value=mock_patterns)

        patterns = await pattern_analyzer.load_user_patterns('test-user')

        assert patterns['trip_type'] == 'national_park'
        assert patterns['confidence'] == 0.85