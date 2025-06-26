
import pytest
from httpx import AsyncClient


class TestChatEndpoints:
    """API tests for chat endpoints."""
    
    async def test_chat_message_success(self, test_client: AsyncClient, sample_chat_data):
        """Test successful chat message processing."""
        # Arrange
        chat_request = {
            "message": sample_chat_data["message"],
            "user_id": sample_chat_data["user_id"],
            "session_id": sample_chat_data["session_id"]
        }
        
        # Act
        response = await test_client.post("/api/v1/chat", json=chat_request)
        
        # Assert
        assert response.status_code == 200
        data = response.json()
        assert "response" in data
        assert "intent" in data
        assert data["intent"] == "expense_query"
    
    async def test_chat_message_validation_error(self, test_client: AsyncClient):
        """Test chat message validation error."""
        # Arrange
        invalid_request = {
            "message": "",  # Empty message should fail validation
            "user_id": "invalid-uuid"
        }
        
        # Act
        response = await test_client.post("/api/v1/chat", json=invalid_request)
        
        # Assert
        assert response.status_code == 422
    
    async def test_conversation_history_retrieval(self, test_client: AsyncClient, sample_user_data):
        """Test conversation history retrieval."""
        # Act
        response = await test_client.get(
            f"/api/v1/chat/history/{sample_user_data['id']}"
        )
        
        # Assert
        assert response.status_code == 200
        data = response.json()
        assert "conversations" in data
        assert isinstance(data["conversations"], list)
    
    async def test_chat_session_creation(self, test_client: AsyncClient, sample_user_data):
        """Test chat session creation."""
        # Arrange
        session_request = {
            "user_id": sample_user_data["id"]
        }
        
        # Act
        response = await test_client.post("/api/v1/chat/session", json=session_request)
        
        # Assert
        assert response.status_code == 201
        data = response.json()
        assert "session_id" in data
        assert "created_at" in data
    
    async def test_chat_feedback_submission(self, test_client: AsyncClient, sample_user_data):
        """Test chat feedback submission."""
        # Arrange
        feedback_request = {
            "user_id": sample_user_data["id"],
            "chat_input": "Test message",
            "intent": "test_intent",
            "feedback": "helpful",
            "rating": 5
        }
        
        # Act
        response = await test_client.post("/api/v1/chat/feedback", json=feedback_request)
        
        # Assert
        assert response.status_code == 201
        data = response.json()
        assert data["status"] == "success"
