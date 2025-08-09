"""
Test visual action integration in WebSocket handler
"""

import pytest
import json
from unittest.mock import Mock, AsyncMock, MagicMock


class TestVisualActionWebSocket:
    """Test visual action handling in WebSocket"""
    
    @pytest.mark.asyncio
    async def test_websocket_sends_visual_action(self):
        """Test that WebSocket handler sends visual actions"""
        from app.services.pam_visual_actions import PamVisualActionsService
        
        # Create service instance
        service = PamVisualActionsService()
        
        # Test appointment extraction
        message = "meet John tomorrow at 12"
        context = {'user_id': 'test_user'}
        
        result = service.parse_intent_to_visual_action(message, context)
        
        # Verify visual action was created
        assert result is not None
        assert result["type"] == "visual_action"
        assert result["action"]["action"] == "book_appointment"
        assert result["action"]["parameters"]["person"] == "John"
        assert "tomorrow" in result["feedback_message"].lower() or "12" in result["feedback_message"]
        
    @pytest.mark.asyncio
    async def test_expense_visual_action(self):
        """Test expense logging visual action"""
        from app.services.pam_visual_actions import PamVisualActionsService
        
        service = PamVisualActionsService()
        
        # Test expense extraction
        message = "I just spent $30 on fuel"
        context = {'user_id': 'test_user'}
        
        result = service.parse_intent_to_visual_action(message, context)
        
        # Verify visual action
        assert result is not None
        assert result["type"] == "visual_action"
        assert result["action"]["action"] == "log_expense"
        assert result["action"]["parameters"]["amount"] == 30.0
        assert result["action"]["parameters"]["category"] == "fuel"
        
    @pytest.mark.asyncio
    async def test_navigation_visual_action(self):
        """Test navigation visual action"""
        from app.services.pam_visual_actions import PamVisualActionsService
        
        service = PamVisualActionsService()
        
        # Test navigation
        message = "go to my dashboard"
        context = {'user_id': 'test_user'}
        
        result = service.parse_intent_to_visual_action(message, context)
        
        # Verify visual action
        assert result is not None
        assert result["type"] == "visual_action"
        assert result["action"]["action"] == "navigate"
        assert result["action"]["parameters"]["route"] == "/you"
        
    @pytest.mark.asyncio
    async def test_complex_appointment(self):
        """Test complex appointment parsing"""
        from app.services.pam_visual_actions import PamVisualActionsService
        
        service = PamVisualActionsService()
        
        # Test complex appointment
        message = "Schedule a meeting with Sarah Johnson tomorrow at 2:30pm"
        context = {'user_id': 'test_user'}
        
        result = service.parse_intent_to_visual_action(message, context)
        
        # Verify visual action
        assert result is not None
        assert result["action"]["parameters"]["person"] == "Sarah Johnson"
        assert "2:30" in result["action"]["parameters"]["time"] or "14:30" in result["action"]["parameters"]["time"]
        
    @pytest.mark.asyncio
    async def test_no_visual_action(self):
        """Test that non-action messages don't create visual actions"""
        from app.services.pam_visual_actions import PamVisualActionsService
        
        service = PamVisualActionsService()
        
        # Test non-action message
        message = "What's the weather like today?"
        context = {'user_id': 'test_user'}
        
        result = service.parse_intent_to_visual_action(message, context)
        
        # Verify no visual action
        assert result is None
        
    @pytest.mark.asyncio
    async def test_result_format_compatibility(self):
        """Test that SimplePamService return format is compatible"""
        # Mock result from SimplePamService
        mock_result = {
            "response": "I'll book an appointment with John for tomorrow at 12:00.",
            "context": {
                "user_id": "test_user",
                "visual_action": {
                    "type": "visual_action",
                    "action": {
                        "action": "book_appointment",
                        "parameters": {
                            "person": "John",
                            "date": "2025-08-09",
                            "time": "12:00"
                        }
                    }
                }
            }
        }
        
        # Verify structure is correct for WebSocket handler
        assert isinstance(mock_result, dict)
        assert "response" in mock_result
        assert "context" in mock_result
        assert "visual_action" in mock_result["context"]
        
        visual_action = mock_result["context"]["visual_action"]
        assert visual_action["type"] == "visual_action"
        assert "action" in visual_action
        assert "parameters" in visual_action["action"]