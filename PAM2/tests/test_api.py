"""
PAM 2.0 API Test Suite
======================

Tests for the FastAPI application and endpoints.
"""

import pytest
from fastapi.testclient import TestClient
from unittest.mock import AsyncMock, patch

from pam_2.api.main import app
from pam_2.core.types import ServiceStatus


@pytest.fixture
def client():
    """Create test client"""
    return TestClient(app)


@pytest.fixture
def mock_services():
    """Mock all services for API testing"""
    return {
        "conversational_engine": AsyncMock(),
        "context_manager": AsyncMock(),
        "trip_logger": AsyncMock(),
        "savings_tracker": AsyncMock(),
        "safety_layer": AsyncMock()
    }


class TestHealthEndpoints:
    """Test health check endpoints"""

    def test_root_endpoint(self, client):
        """Test root endpoint"""
        response = client.get("/")
        assert response.status_code == 200
        data = response.json()
        assert "service" in data
        assert "PAM 2.0" in data["service"]
        assert data["status"] == "healthy"

    def test_simple_health_endpoint(self, client):
        """Test simple health endpoint"""
        response = client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"

    def test_detailed_health_endpoint(self, client, mock_services):
        """Test detailed health endpoint"""
        # Mock service health responses
        for service_name, service in mock_services.items():
            service.get_service_health.return_value = {
                "status": "healthy",
                "service": service_name
            }

        with patch("pam_2.api.routes.get_services", return_value=mock_services):
            response = client.get("/api/v1/health")
            assert response.status_code == 200
            data = response.json()
            assert data["status"] == ServiceStatus.HEALTHY.value


class TestChatEndpoints:
    """Test chat API endpoints"""

    def test_chat_endpoint_success(self, client, mock_services):
        """Test successful chat interaction"""
        # Mock safety layer
        mock_services["safety_layer"].check_message_safety.return_value = AsyncMock(
            success=True,
            data={"safety_passed": True}
        )

        # Mock conversational engine
        mock_services["conversational_engine"].process_message.return_value = AsyncMock(
            success=True,
            data={
                "response": "Hello! I'd love to help you plan your Tokyo trip!",
                "ui_action": "none",
                "processing_time_ms": 150,
                "model_used": "gemini-1.5-flash"
            }
        )

        # Mock context manager
        mock_services["context_manager"].retrieve_context.return_value = AsyncMock(
            success=True,
            data=None
        )
        mock_services["context_manager"].add_message_to_context.return_value = AsyncMock(
            success=True
        )

        with patch("pam_2.api.routes.get_services", return_value=mock_services):
            response = client.post("/api/v1/chat", json={
                "user_id": "test_user",
                "message": "Plan a trip to Tokyo for $2000",
                "session_id": "test_session",
                "context_enabled": True
            })

            assert response.status_code == 200
            data = response.json()
            assert data["success"] is True
            assert "response" in data
            assert data["model_used"] == "gemini-1.5-flash"

    def test_chat_endpoint_safety_blocked(self, client, mock_services):
        """Test chat blocked by safety filters"""
        # Mock safety layer to block message
        mock_services["safety_layer"].check_message_safety.return_value = AsyncMock(
            success=True,
            data={"safety_passed": False}
        )

        with patch("pam_2.api.routes.get_services", return_value=mock_services):
            response = client.post("/api/v1/chat", json={
                "user_id": "test_user",
                "message": "Harmful content",
                "session_id": "test_session"
            })

            assert response.status_code == 200
            data = response.json()
            assert data["success"] is False
            assert "blocked by safety filters" in data["error"]

    def test_chat_endpoint_validation_error(self, client):
        """Test chat endpoint with validation errors"""
        response = client.post("/api/v1/chat", json={
            "user_id": "",  # Invalid: empty string
            "message": "Hello"
        })

        assert response.status_code == 422


class TestAnalysisEndpoints:
    """Test analysis API endpoints"""

    def test_trip_analysis_endpoint(self, client, mock_services):
        """Test trip analysis endpoint"""
        mock_services["trip_logger"].analyze_trip_activity.return_value = AsyncMock(
            success=True,
            data={
                "trip_activity_detected": True,
                "activity_score": 0.85,
                "entities": {
                    "destinations": ["Tokyo"],
                    "budgets": ["2000"]
                },
                "confidence": 0.9
            }
        )

        with patch("pam_2.api.routes.get_services", return_value=mock_services):
            response = client.post("/api/v1/analyze/trip", json={
                "user_id": "test_user",
                "message": "Plan a trip to Tokyo for $2000"
            })

            assert response.status_code == 200
            data = response.json()
            assert data["success"] is True
            assert data["trip_activity_detected"] is True
            assert data["activity_score"] == 0.85

    def test_financial_analysis_endpoint(self, client, mock_services):
        """Test financial analysis endpoint"""
        mock_services["savings_tracker"].analyze_financial_content.return_value = AsyncMock(
            success=True,
            data={
                "financial_content_detected": True,
                "financial_score": 0.75,
                "entities": {
                    "amounts": ["500"],
                    "categories": ["groceries"]
                },
                "recommendations": ["Try meal planning to reduce costs"],
                "confidence": 0.8
            }
        )

        with patch("pam_2.api.routes.get_services", return_value=mock_services):
            response = client.post("/api/v1/analyze/financial", json={
                "user_id": "test_user",
                "message": "I spent $500 on groceries"
            })

            assert response.status_code == 200
            data = response.json()
            assert data["success"] is True
            assert data["financial_content_detected"] is True
            assert len(data["recommendations"]) > 0


class TestSafetyEndpoints:
    """Test safety check endpoints"""

    def test_safety_check_endpoint(self, client, mock_services):
        """Test safety check endpoint"""
        mock_services["safety_layer"].check_message_safety.return_value = AsyncMock(
            success=True,
            data={
                "safety_passed": True,
                "checks": {
                    "content_filter": True,
                    "rate_limit": True
                }
            }
        )

        mock_services["safety_layer"].get_user_rate_status.return_value = AsyncMock(
            success=True,
            data={
                "hourly_remaining": 95,
                "minute_remaining": 9
            }
        )

        with patch("pam_2.api.routes.get_services", return_value=mock_services):
            response = client.post("/api/v1/safety/check", json={
                "user_id": "test_user",
                "content": "This is safe content"
            })

            assert response.status_code == 200
            data = response.json()
            assert data["success"] is True
            assert data["safety_passed"] is True
            assert "rate_limit_status" in data


class TestDebugEndpoints:
    """Test debug endpoints (development only)"""

    def test_debug_config_endpoint_development(self, client):
        """Test debug config endpoint in development"""
        # This should be accessible in development mode
        response = client.get("/api/v1/debug/config")
        # The exact status depends on the environment setting
        assert response.status_code in [200, 404]