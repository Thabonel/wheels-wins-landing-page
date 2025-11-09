"""
Pytest configuration and shared fixtures for PAM tool testing

This module provides shared fixtures and utilities for testing PAM tools across all categories.
"""

import pytest
import asyncio
from datetime import datetime, timedelta
from decimal import Decimal
from typing import Dict, Any, List
from unittest.mock import MagicMock, AsyncMock, patch
import uuid

# Test data constants
TEST_USER_ID = "123e4567-e89b-12d3-a456-426614174000"
TEST_CONVERSATION_ID = "987fcdeb-51a2-43f7-8e9c-123456789abc"
TEST_EXPENSE_ID = "111e4567-e89b-12d3-a456-426614174111"
TEST_TRIP_ID = "222e4567-e89b-12d3-a456-426614174222"
TEST_EVENT_ID = "333e4567-e89b-12d3-a456-426614174333"


# ============================================================================
# EVENT LOOP FIXTURES
# ============================================================================

@pytest.fixture(scope="session")
def event_loop():
    """Create an event loop for async tests"""
    policy = asyncio.get_event_loop_policy()
    loop = policy.new_event_loop()
    yield loop
    loop.close()


# ============================================================================
# DATABASE FIXTURES
# ============================================================================

@pytest.fixture
def mock_supabase_client():
    """Mock Supabase client for testing without actual database calls"""
    mock_client = MagicMock()

    # Mock table() method chain
    mock_table = MagicMock()
    mock_client.table.return_value = mock_table

    # Mock query builders
    mock_table.select.return_value = mock_table
    mock_table.insert.return_value = mock_table
    mock_table.update.return_value = mock_table
    mock_table.delete.return_value = mock_table
    mock_table.eq.return_value = mock_table
    mock_table.gte.return_value = mock_table
    mock_table.lte.return_value = mock_table
    mock_table.order.return_value = mock_table
    mock_table.limit.return_value = mock_table

    # Mock execute() to return success
    mock_execute_result = MagicMock()
    mock_execute_result.data = []
    mock_execute_result.error = None
    mock_table.execute.return_value = mock_execute_result

    # Mock single() for single record queries
    mock_table.single.return_value = mock_table

    return mock_client


@pytest.fixture
def mock_supabase_with_data(mock_supabase_client):
    """Mock Supabase client with pre-populated test data"""
    def _configure_mock_data(table_name: str, data: List[Dict[str, Any]]):
        """Configure mock to return specific data for a table"""
        mock_execute_result = MagicMock()
        mock_execute_result.data = data
        mock_execute_result.error = None

        mock_table = mock_supabase_client.table.return_value
        mock_table.execute.return_value = mock_execute_result

        return mock_supabase_client

    return _configure_mock_data


# ============================================================================
# USER FIXTURES
# ============================================================================

@pytest.fixture
def test_user_id():
    """Standard test user ID"""
    return TEST_USER_ID


@pytest.fixture
def test_user_profile():
    """Mock user profile data"""
    return {
        "id": TEST_USER_ID,
        "email": "test@example.com",
        "full_name": "Test User",
        "nickname": "Tester",
        "vehicle_type": "Class A Motorhome",
        "fuel_type": "diesel",
        "region": "US",
        "preferred_units": "imperial",
        "created_at": datetime.utcnow().isoformat()
    }


# ============================================================================
# BUDGET TOOL FIXTURES
# ============================================================================

@pytest.fixture
def test_expense_data():
    """Sample expense data for testing"""
    return {
        "user_id": TEST_USER_ID,
        "amount": Decimal("75.50"),
        "category": "gas",  # Changed from "fuel" to valid enum value
        "description": "Gas station fill-up",
        "date": datetime.utcnow().date().isoformat(),
        "location": "Phoenix, AZ"
    }


@pytest.fixture
def test_budget_data():
    """Sample budget data for testing"""
    return {
        "user_id": TEST_USER_ID,
        "category": "fuel",
        "amount": Decimal("500.00"),
        "period": "monthly",
        "start_date": datetime.utcnow().date().isoformat()
    }


@pytest.fixture
def test_savings_event():
    """Sample savings event data"""
    return {
        "user_id": TEST_USER_ID,
        "amount_saved": Decimal("15.00"),
        "category": "fuel",
        "description": "Found cheaper gas station",
        "event_type": "gas"
    }


# ============================================================================
# TRIP TOOL FIXTURES
# ============================================================================

@pytest.fixture
def test_trip_data():
    """Sample trip planning data"""
    return {
        "user_id": TEST_USER_ID,
        "origin": "Phoenix, AZ",
        "destination": "Seattle, WA",
        "budget": Decimal("2000.00"),
        "start_date": (datetime.utcnow() + timedelta(days=7)).date().isoformat(),
        "stops": ["Flagstaff, AZ", "Salt Lake City, UT"]
    }


@pytest.fixture
def test_location_data():
    """Sample location data"""
    return {
        "latitude": 33.4484,
        "longitude": -112.0740,
        "city": "Phoenix",
        "region": "AZ",
        "country": "US"
    }


@pytest.fixture
def mock_weather_api_response():
    """Mock OpenMeteo weather API response"""
    return {
        "latitude": 33.4484,
        "longitude": -112.0740,
        "current_weather": {
            "temperature": 75.0,
            "windspeed": 5.0,
            "weathercode": 0  # Clear sky
        },
        "daily": {
            "time": [
                (datetime.utcnow() + timedelta(days=i)).date().isoformat()
                for i in range(7)
            ],
            "temperature_2m_max": [80, 82, 79, 75, 77, 81, 78],
            "temperature_2m_min": [60, 62, 58, 55, 59, 63, 61],
            "weathercode": [0, 1, 2, 3, 1, 0, 2]
        }
    }


@pytest.fixture
def mock_gas_prices_response():
    """Mock gas price API response"""
    return {
        "stations": [
            {
                "name": "Shell Station",
                "address": "123 Main St",
                "price": 3.45,
                "distance_miles": 2.1
            },
            {
                "name": "Chevron",
                "address": "456 Oak Ave",
                "price": 3.52,
                "distance_miles": 1.8
            }
        ]
    }


# ============================================================================
# CALENDAR TOOL FIXTURES
# ============================================================================

@pytest.fixture
def test_calendar_event():
    """Sample calendar event data"""
    start_date = datetime.utcnow() + timedelta(days=1)
    return {
        "user_id": TEST_USER_ID,
        "title": "Maintenance Appointment",
        "description": "Oil change and tire rotation",
        "start_date": start_date.isoformat(),
        "end_date": (start_date + timedelta(hours=2)).isoformat(),
        "all_day": False,
        "event_type": "maintenance",
        "location_name": "Quick Lube Plus",
        "reminder_minutes": [15, 60],
        "color": "#3b82f6"
    }


# ============================================================================
# SOCIAL TOOL FIXTURES
# ============================================================================

@pytest.fixture
def test_post_data():
    """Sample social post data"""
    return {
        "user_id": TEST_USER_ID,
        "content": "Just found an amazing camping spot!",
        "images": ["https://example.com/image1.jpg"],
        "location_name": "Blue Mountains",
        "latitude": -33.7969,
        "longitude": 150.3064,
        "tags": ["camping", "nature"]
    }


# ============================================================================
# VALIDATION HELPERS
# ============================================================================

@pytest.fixture
def assert_valid_uuid():
    """Helper to validate UUID format"""
    def _validate(value: str) -> bool:
        try:
            uuid.UUID(value)
            return True
        except (ValueError, AttributeError):
            return False
    return _validate


@pytest.fixture
def assert_valid_decimal():
    """Helper to validate Decimal values"""
    def _validate(value: Any, min_val: Decimal = None, max_val: Decimal = None) -> bool:
        if not isinstance(value, Decimal):
            return False
        if min_val is not None and value < min_val:
            return False
        if max_val is not None and value > max_val:
            return False
        return True
    return _validate


# ============================================================================
# MOCK EXTERNAL API FIXTURES
# ============================================================================

@pytest.fixture
def mock_openmeteo_api(mock_weather_api_response):
    """Mock OpenMeteo weather API"""
    with patch('httpx.AsyncClient.get') as mock_get:
        mock_response = AsyncMock()
        mock_response.status_code = 200
        mock_response.json.return_value = mock_weather_api_response
        mock_get.return_value = mock_response
        yield mock_get


@pytest.fixture
def mock_mapbox_api():
    """Mock Mapbox geocoding/routing API"""
    with patch('httpx.AsyncClient.get') as mock_get:
        mock_response = AsyncMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "features": [{
                "center": [-112.0740, 33.4484],
                "place_name": "Phoenix, Arizona, United States"
            }]
        }
        mock_get.return_value = mock_response
        yield mock_get


# ============================================================================
# CLEANUP HELPERS
# ============================================================================

@pytest.fixture
def cleanup_test_data():
    """Cleanup test data after tests (for integration tests with real DB)"""
    created_ids = {
        "expenses": [],
        "trips": [],
        "events": [],
        "posts": []
    }

    yield created_ids

    # Cleanup logic would go here if using real database
    # For now, this is a placeholder for future integration tests
    pass


# ============================================================================
# ERROR HANDLING FIXTURES
# ============================================================================

@pytest.fixture
def mock_supabase_error():
    """Mock Supabase client that raises errors"""
    mock_client = MagicMock()
    mock_table = MagicMock()
    mock_client.table.return_value = mock_table

    # Mock query builders to chain properly
    mock_table.insert.return_value = mock_table
    mock_table.select.return_value = mock_table
    mock_table.update.return_value = mock_table
    mock_table.eq.return_value = mock_table

    mock_execute_result = MagicMock()
    mock_execute_result.data = None
    mock_execute_result.error = {"message": "Database connection failed", "code": "500"}
    mock_table.execute.return_value = mock_execute_result

    return mock_client


@pytest.fixture
def mock_network_timeout():
    """Mock network timeout error"""
    def _timeout_error():
        import httpx
        raise httpx.TimeoutException("Request timed out")
    return _timeout_error
