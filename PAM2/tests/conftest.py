"""
PAM 2.0 Test Configuration
==========================

Pytest configuration and fixtures for PAM 2.0 testing.
"""

import pytest
import asyncio
import os
from unittest.mock import AsyncMock, MagicMock

# Set test environment before any imports
os.environ["PAM2_ENV_FILE"] = os.path.join(os.path.dirname(__file__), "..", ".env.test")

from pam_2.core.types import ChatMessage, MessageType
from pam_2.core.config import PAM2Settings


@pytest.fixture(scope="session")
def event_loop():
    """Create an instance of the default event loop for the test session."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


@pytest.fixture
def test_message():
    """Create a test chat message"""
    return ChatMessage(
        user_id="test_user",
        type=MessageType.USER,
        content="Hello PAM! Plan a trip to Tokyo for $2000."
    )


@pytest.fixture
def financial_message():
    """Create a financial test message"""
    return ChatMessage(
        user_id="test_user",
        type=MessageType.USER,
        content="I spent $500 on groceries this month, is that too much?"
    )


@pytest.fixture
def trip_message():
    """Create a trip planning test message"""
    return ChatMessage(
        user_id="test_user",
        type=MessageType.USER,
        content="Plan a 7-day vacation to Paris with a budget of $3000"
    )


@pytest.fixture
def mock_redis():
    """Create a mock Redis client"""
    mock = AsyncMock()
    mock.get.return_value = None
    mock.set.return_value = True
    mock.exists.return_value = False
    mock.delete.return_value = 1
    return mock


@pytest.fixture
def mock_gemini_client():
    """Create a mock Gemini client"""
    mock = AsyncMock()
    mock.generate_content_async.return_value = MagicMock(
        text="This is a test response from PAM 2.0 AI assistant."
    )
    return mock


@pytest.fixture
def test_config():
    """Create test configuration"""
    return PAM2Settings(
        _env_file=os.path.join(os.path.dirname(__file__), "..", ".env.test")
    )