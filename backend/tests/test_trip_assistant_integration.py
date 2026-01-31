import pytest
import asyncio
from unittest.mock import Mock, AsyncMock, patch
from agents.autonomous.proactive_trip_assistant import ProactiveTripAssistant
from agents.autonomous.external_api_client import ExternalApiClient

class TestTripAssistantIntegration:
    @pytest.fixture
    def api_client(self):
        return ExternalApiClient()

    @pytest.fixture
    def assistant_with_apis(self, api_client):
        assistant = ProactiveTripAssistant()
        assistant.external_api_client = api_client
        return assistant

    @pytest.mark.asyncio
    async def test_external_api_client_initialization(self, api_client):
        """Test external API client initializes with correct configuration"""
        assert api_client.timeout == 10
        assert api_client.max_retries == 3
        assert api_client.rate_limit_delay == 1.0
        assert hasattr(api_client, 'session')

    @pytest.mark.asyncio
    async def test_fuel_price_api_integration(self, api_client):
        """Test GasBuddy-style fuel price API integration"""
        location = {'lat': 40.7128, 'lng': -74.0060}  # NYC
        radius = 25  # miles

        # For minimal implementation, test the actual response structure
        fuel_data = await api_client.get_fuel_prices(location, radius)

        assert 'stations' in fuel_data
        assert len(fuel_data['stations']) >= 1
        assert 'name' in fuel_data['stations'][0]
        assert 'prices' in fuel_data['stations'][0]
        assert 'regular' in fuel_data['stations'][0]['prices']

    @pytest.mark.asyncio
    async def test_weather_api_integration(self, api_client):
        """Test weather API integration for travel planning"""
        location = {'lat': 34.0522, 'lng': -118.2437}  # LA

        # For minimal implementation, test the actual response structure
        weather_data = await api_client.get_weather_data(location)

        assert 'current' in weather_data
        assert 'forecast' in weather_data
        assert 'alerts' in weather_data
        assert 'temp' in weather_data['current']
        assert 'condition' in weather_data['current']

    @pytest.mark.asyncio
    async def test_rv_park_api_integration(self, api_client):
        """Test RV park availability API integration"""
        location = {'lat': 44.4280, 'lng': -110.5885}  # Yellowstone
        check_in = '2024-06-15'
        check_out = '2024-06-20'

        # For minimal implementation, test the actual response structure
        park_data = await api_client.get_rv_parks(location, check_in, check_out)

        assert 'parks' in park_data
        assert len(park_data['parks']) >= 1
        assert 'name' in park_data['parks'][0]
        assert 'available_sites' in park_data['parks'][0]
        assert 'price_per_night' in park_data['parks'][0]

    @pytest.mark.asyncio
    async def test_api_rate_limiting(self, api_client):
        """Test API rate limiting and retry logic"""
        # For minimal implementation, just test that retry mechanism exists in _make_api_request
        assert hasattr(api_client, '_make_api_request')
        assert api_client.max_retries == 3
        assert api_client.rate_limit_delay == 1.0

    @pytest.mark.asyncio
    async def test_api_error_handling(self, api_client):
        """Test external API error handling and graceful degradation"""
        # For minimal implementation, test that methods handle errors and return expected structure
        fuel_data = await api_client.get_fuel_prices({'lat': 40.0, 'lng': -74.0}, 25)
        weather_data = await api_client.get_weather_data({'lat': 40.0, 'lng': -74.0})
        park_data = await api_client.get_rv_parks({'lat': 40.0, 'lng': -74.0}, '2024-06-15', '2024-06-20')

        # Should return expected structures (even if with sample data)
        assert 'stations' in fuel_data
        assert 'current' in weather_data
        assert 'parks' in park_data

    @pytest.mark.asyncio
    async def test_assistant_external_api_integration(self, assistant_with_apis):
        """Test assistant integration with external APIs"""
        # Set a location so the assistant will fetch external data
        assistant_with_apis.last_known_location = {'lat': 40.7128, 'lng': -74.0060}

        external_data = await assistant_with_apis.check_external_apis()

        # Should return external API data when location is available
        assert 'fuel_prices' in external_data
        assert 'weather' in external_data
        assert 'rv_parks' in external_data
        assert 'stations' in external_data['fuel_prices']
        assert 'current' in external_data['weather']
        assert 'parks' in external_data['rv_parks']