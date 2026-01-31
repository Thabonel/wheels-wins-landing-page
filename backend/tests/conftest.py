"""Pytest configuration and shared fixtures."""
import os
import uuid
from datetime import datetime, timedelta
from typing import Any, Dict, List
from unittest.mock import AsyncMock, MagicMock

import pytest
from faker import Faker

fake = Faker()


@pytest.fixture
def mock_user_id() -> str:
    """Generate a mock UUID for user_id."""
    return str(uuid.uuid4())


@pytest.fixture
def mock_profile(mock_user_id: str) -> Dict[str, Any]:
    """Generate a mock user profile."""
    return {
        "id": mock_user_id,
        "username": fake.user_name(),
        "email": fake.email(),
        "full_name": fake.name(),
        "created_at": datetime.utcnow().isoformat(),
        "updated_at": datetime.utcnow().isoformat(),
    }


@pytest.fixture
def mock_supabase_client():
    """Mock Supabase client for testing."""
    mock_client = MagicMock()

    # Mock table() chain
    mock_table = MagicMock()
    mock_client.table.return_value = mock_table

    # Mock query methods
    mock_table.select.return_value = mock_table
    mock_table.insert.return_value = mock_table
    mock_table.update.return_value = mock_table
    mock_table.delete.return_value = mock_table
    mock_table.eq.return_value = mock_table
    mock_table.neq.return_value = mock_table
    mock_table.gt.return_value = mock_table
    mock_table.gte.return_value = mock_table
    mock_table.lt.return_value = mock_table
    mock_table.lte.return_value = mock_table
    mock_table.like.return_value = mock_table
    mock_table.ilike.return_value = mock_table
    mock_table.is_.return_value = mock_table
    mock_table.in_.return_value = mock_table
    mock_table.contains.return_value = mock_table
    mock_table.order.return_value = mock_table
    mock_table.limit.return_value = mock_table
    mock_table.single.return_value = mock_table
    mock_table.maybe_single.return_value = mock_table

    # Mock execute() to return data
    mock_execute = MagicMock()
    mock_execute.data = []
    mock_table.execute.return_value = mock_execute

    return mock_client


@pytest.fixture
def mock_supabase_response():
    """Mock Supabase response object."""
    def _create_response(data: Any = None, error: Any = None):
        response = MagicMock()
        response.data = data if data is not None else []
        response.error = error
        return response
    return _create_response


@pytest.fixture
def mock_expense(mock_user_id: str) -> Dict[str, Any]:
    """Generate a mock expense record."""
    return {
        "id": str(uuid.uuid4()),
        "user_id": mock_user_id,
        "category": "fuel",
        "amount": round(fake.random.uniform(20.0, 150.0), 2),
        "description": fake.sentence(),
        "date": fake.date_this_month().isoformat(),
        "created_at": datetime.utcnow().isoformat(),
    }


@pytest.fixture
def mock_trip(mock_user_id: str) -> Dict[str, Any]:
    """Generate a mock trip record."""
    return {
        "id": str(uuid.uuid4()),
        "user_id": mock_user_id,
        "title": fake.sentence(nb_words=4),
        "start_location": fake.city(),
        "end_location": fake.city(),
        "start_date": fake.date_this_month().isoformat(),
        "end_date": (fake.date_this_month() + timedelta(days=7)).isoformat(),
        "distance": round(fake.random.uniform(100.0, 1000.0), 1),
        "status": "planned",
        "created_at": datetime.utcnow().isoformat(),
    }


@pytest.fixture
def mock_fuel_entry(mock_user_id: str) -> Dict[str, Any]:
    """Generate a mock fuel log entry."""
    return {
        "id": str(uuid.uuid4()),
        "user_id": mock_user_id,
        "odometer": round(fake.random.uniform(50000.0, 150000.0), 1),
        "volume": round(fake.random.uniform(30.0, 100.0), 2),
        "price_per_unit": round(fake.random.uniform(1.5, 2.5), 2),
        "total_cost": round(fake.random.uniform(50.0, 200.0), 2),
        "fuel_type": "diesel",
        "entry_date": fake.date_this_month().isoformat(),
        "created_at": datetime.utcnow().isoformat(),
    }


@pytest.fixture
def mock_maintenance_record(mock_user_id: str) -> Dict[str, Any]:
    """Generate a mock maintenance record."""
    return {
        "id": str(uuid.uuid4()),
        "user_id": mock_user_id,
        "category": "oil_change",
        "description": fake.sentence(),
        "cost": round(fake.random.uniform(50.0, 500.0), 2),
        "service_date": fake.date_this_month().isoformat(),
        "odometer": round(fake.random.uniform(50000.0, 150000.0), 1),
        "next_service_date": (fake.date_this_month() + timedelta(days=90)).isoformat(),
        "next_service_odometer": round(fake.random.uniform(55000.0, 155000.0), 1),
        "created_at": datetime.utcnow().isoformat(),
    }


@pytest.fixture
def mock_transition_task(mock_user_id: str) -> Dict[str, Any]:
    """Generate a mock transition task."""
    return {
        "id": str(uuid.uuid4()),
        "user_id": mock_user_id,
        "title": fake.sentence(nb_words=5),
        "category": "financial",
        "priority": "high",
        "status": "pending",
        "due_date": (datetime.utcnow() + timedelta(days=14)).isoformat(),
        "created_at": datetime.utcnow().isoformat(),
    }


@pytest.fixture
def mock_ai_client():
    """Mock AI client for testing."""
    mock_client = AsyncMock()
    mock_client.generate_text.return_value = "Mock AI response"
    return mock_client


@pytest.fixture
def mock_httpx_client():
    """Mock httpx client for external API calls."""
    mock_client = AsyncMock()
    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.json.return_value = {"status": "success"}
    mock_response.text = "Mock response text"
    mock_client.get.return_value = mock_response
    mock_client.post.return_value = mock_response
    return mock_client


@pytest.fixture(autouse=True)
def mock_environment(monkeypatch):
    """Set up mock environment variables for all tests."""
    monkeypatch.setenv("ANTHROPIC_API_KEY", "sk-ant-api03-test-api-key-for-testing-purposes-only-abcdefghijklmnopqrstuvwxyz1234567890")
    monkeypatch.setenv("GEMINI_API_KEY", "AIzaSyC-test-gemini-api-key-for-testing-purposes-only-1234567890")
    monkeypatch.setenv("MAPBOX_TOKEN", "pk.test-mapbox-token-for-testing-purposes-only")
    monkeypatch.setenv("SUPABASE_SERVICE_ROLE_KEY", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test-service-role-key")
    monkeypatch.setenv("DATABASE_URL", "postgresql://test:test@localhost:5432/test")


@pytest.fixture
def mock_logger():
    """Mock logger for testing."""
    return MagicMock()
