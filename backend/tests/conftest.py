import os
import pytest
import pytest_asyncio
import asyncio
from typing import AsyncGenerator, Generator
from httpx import AsyncClient
from unittest.mock import AsyncMock, MagicMock
from supabase import create_client, Client

# Minimal environment defaults for tests before importing settings
os.environ.setdefault("SECRET_KEY", "test-secret-key")
os.environ.setdefault("DATABASE_URL", "sqlite:///test.db")
os.environ.setdefault("POSTGRES_PASSWORD", "password")
os.environ.setdefault("OPENAI_API_KEY", "test")
os.environ.setdefault("SUPABASE_KEY", "test")

from app.core.config import settings
from app.core.database import get_supabase_client
from app.services.database import DatabaseService
from app.services.cache import CacheService


# Test database configuration
TEST_SUPABASE_URL = "http://localhost:54321"
TEST_SUPABASE_KEY = "test-anon-key"


@pytest.fixture(scope="session")
def event_loop():
    """Create an instance of the default event loop for the test session."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


@pytest_asyncio.fixture
async def test_db() -> AsyncGenerator[Client, None]:
    """Create a test database client."""
    client = create_client(TEST_SUPABASE_URL, TEST_SUPABASE_KEY)

    # Setup: Clear test data
    await cleanup_test_data(client)

    yield client

    # Teardown: Clean up after tests
    await cleanup_test_data(client)


@pytest.fixture
def mock_supabase_client():
    """Mock Supabase client for unit tests."""
    mock_client = MagicMock(spec=Client)

    # Mock common table operations
    mock_table = MagicMock()
    mock_client.table.return_value = mock_table

    # Mock select operations
    mock_table.select.return_value = mock_table
    mock_table.filter.return_value = mock_table
    mock_table.eq.return_value = mock_table
    mock_table.execute.return_value = MagicMock(data=[])

    # Mock insert/update/delete operations
    mock_table.insert.return_value = mock_table
    mock_table.update.return_value = mock_table
    mock_table.delete.return_value = mock_table

    return mock_client


@pytest_asyncio.fixture
async def test_client() -> AsyncGenerator[AsyncClient, None]:
    """Create test HTTP client."""
    from app.main import app

    async with AsyncClient(app=app, base_url="http://test") as client:
        yield client


@pytest.fixture
def mock_database_service():
    """Mock database service."""
    service = MagicMock(spec=DatabaseService)
    service.get_user_profile = AsyncMock(return_value=None)
    service.create_user_profile = AsyncMock()
    service.update_user_profile = AsyncMock()
    return service


@pytest.fixture
def mock_cache_service():
    """Mock cache service."""
    service = MagicMock(spec=CacheService)
    service.get = AsyncMock(return_value=None)
    service.set = AsyncMock()
    service.delete = AsyncMock()
    service.exists = AsyncMock(return_value=False)
    return service


@pytest.fixture
def mock_websocket_manager():
    """Mock WebSocket manager."""
    from app.core.websocket_manager import ConnectionManager as WebSocketManager

    manager = MagicMock(spec=WebSocketManager)
    manager.connect = AsyncMock()
    manager.disconnect = AsyncMock()
    manager.send_personal_message = AsyncMock()
    manager.broadcast = AsyncMock()
    manager.join_room = AsyncMock()
    manager.leave_room = AsyncMock()

    return manager


@pytest.fixture
def sample_user_data():
    """Sample user data for tests."""
    return {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "email": "test@example.com",
        "full_name": "Test User",
        "region": "Australia",
        "preferences": {"notifications": True, "theme": "light"},
    }


@pytest.fixture
def sample_expense_data():
    """Sample expense data for tests."""
    return {
        "id": 1,
        "user_id": "550e8400-e29b-41d4-a716-446655440000",
        "amount": 50.00,
        "category": "fuel",
        "description": "Gas station fill-up",
        "date": "2024-01-15",
    }


@pytest.fixture
def sample_maintenance_data():
    """Sample maintenance record data for tests."""
    return {
        "id": 1,
        "user_id": "550e8400-e29b-41d4-a716-446655440000",
        "task": "Oil Change",
        "date": "2024-01-15",
        "mileage": 50000,
        "cost": 75.00,
        "status": "completed",
        "next_due_date": "2024-04-15",
        "next_due_mileage": 53000,
    }


@pytest.fixture
def sample_chat_data():
    """Sample chat conversation data for tests."""
    return {
        "user_id": "550e8400-e29b-41d4-a716-446655440000",
        "message": "How much did I spend on fuel last month?",
        "intent": "expense_query",
        "confidence": 0.95,
        "session_id": "sess_123456789",
    }


async def cleanup_test_data(client: Client):
    """Clean up test data from database."""
    test_tables = [
        "profiles",
        "expenses",
        "maintenance_records",
        "pam_conversation_memory",
        "budget_categories",
        "food_items",
        "drawers",
        "items",
    ]

    for table in test_tables:
        try:
            await client.table(table).delete().neq("id", "non-existent").execute()
        except Exception:
            # Ignore cleanup errors
            pass


class TestDataFactory:
    """Factory for creating test data."""

    @staticmethod
    def create_user(**kwargs):
        """Create user test data."""
        default_data = {
            "id": "550e8400-e29b-41d4-a716-446655440000",
            "email": "test@example.com",
            "full_name": "Test User",
            "region": "Australia",
        }
        return {**default_data, **kwargs}

    @staticmethod
    def create_expense(**kwargs):
        """Create expense test data."""
        default_data = {
            "user_id": "550e8400-e29b-41d4-a716-446655440000",
            "amount": 25.50,
            "category": "food",
            "description": "Grocery shopping",
            "date": "2024-01-15",
        }
        return {**default_data, **kwargs}

    @staticmethod
    def create_maintenance_record(**kwargs):
        """Create maintenance record test data."""
        default_data = {
            "user_id": "550e8400-e29b-41d4-a716-446655440000",
            "task": "Tire Rotation",
            "date": "2024-01-15",
            "mileage": 48000,
            "cost": 40.00,
            "status": "completed",
        }
        return {**default_data, **kwargs}


@pytest.fixture
def test_data_factory():
    """Test data factory fixture."""
    return TestDataFactory()
