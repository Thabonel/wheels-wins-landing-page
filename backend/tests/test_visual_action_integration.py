"""
Integration test for AI-powered visual actions
DEPRECATED: This test references OpenAI, but system migrated to Anthropic Claude
TODO: Update to test Claude-based function calling and visual actions
"""

import pytest

# Skip entire module - needs migration to Claude AI
pytestmark = pytest.mark.skip(reason="Test uses deprecated OpenAI references - needs Claude migration")


class TestVisualActionIntegration:
    """Test AI-powered visual action detection"""
    
    @pytest.fixture
    def mock_openai_client(self):
        """Create a mock OpenAI client"""
        client = MagicMock()
        return client
    
    @pytest.fixture
    def service(self, mock_openai_client):
        """Create a service instance with mocked dependencies"""
        with patch('app.core.simple_pam_service.openai') as mock_openai:
            mock_openai.AsyncOpenAI.return_value = mock_openai_client
            service = SimplePamService()
            service.client = mock_openai_client
            service.tools_initialized = False
            service.tools_registry = {}
            return service
    
    @pytest.mark.asyncio
    async def test_function_call_creates_visual_action(self, service):
        """Test that AI function calls create visual actions"""
        # Mock the AI response with a function call
        mock_response = MagicMock()
        mock_response.choices = [MagicMock()]
        mock_response.choices[0].message.content = None
        mock_response.choices[0].message.function_call = MagicMock()
        mock_response.choices[0].message.function_call.name = "book_calendar_appointment"
        mock_response.choices[0].message.function_call.arguments = '{"person": "John", "date": "tomorrow", "time": "12:00"}'
        
        service.client.chat.completions.create = AsyncMock(return_value=mock_response)
        
        # Mock the log interaction method
        service._log_interaction = AsyncMock()
        
        # Test the service
        context = {'user_id': 'test_user'}
        result = await service.get_response(
            message="meet John tomorrow at 12",
            context=context,
            conversation_history=[]
        )
        
        # Verify the result structure
        assert isinstance(result, dict)
        assert "response" in result
        assert "context" in result
        
        # Check if visual action was created
        assert "visual_action" in result["context"]
        visual_action = result["context"]["visual_action"]
        
        # Verify visual action structure
        assert visual_action["type"] == "visual_action"
        assert visual_action["action"]["action"] == "book_appointment"
        assert visual_action["action"]["parameters"]["person"] == "John"
        
    @pytest.mark.asyncio  
    async def test_expense_function_call(self, service):
        """Test expense logging visual action"""
        # Mock the AI response with expense function call
        mock_response = MagicMock()
        mock_response.choices = [MagicMock()]
        mock_response.choices[0].message.content = None
        mock_response.choices[0].message.function_call = MagicMock()
        mock_response.choices[0].message.function_call.name = "log_expense"
        mock_response.choices[0].message.function_call.arguments = '{"amount": 30, "category": "fuel", "description": "Gas for the car"}'
        
        service.client.chat.completions.create = AsyncMock(return_value=mock_response)
        service._log_interaction = AsyncMock()
        
        # Test the service
        context = {'user_id': 'test_user'}
        result = await service.get_response(
            message="I just spent $30 on fuel",
            context=context,
            conversation_history=[]
        )
        
        # Verify visual action was created
        assert "visual_action" in result["context"]
        visual_action = result["context"]["visual_action"]
        
        assert visual_action["action"]["action"] == "log_expense"
        assert visual_action["action"]["parameters"]["amount"] == 30
        assert visual_action["action"]["parameters"]["category"] == "fuel"
        
    @pytest.mark.asyncio
    async def test_navigation_function_call(self, service):
        """Test navigation visual action"""
        # Mock the AI response with navigation function call
        mock_response = MagicMock()
        mock_response.choices = [MagicMock()]
        mock_response.choices[0].message.content = None
        mock_response.choices[0].message.function_call = MagicMock()
        mock_response.choices[0].message.function_call.name = "navigate_to_page"
        mock_response.choices[0].message.function_call.arguments = '{"page": "dashboard", "section": ""}'
        
        service.client.chat.completions.create = AsyncMock(return_value=mock_response)
        service._log_interaction = AsyncMock()
        
        # Test the service
        context = {'user_id': 'test_user'}
        result = await service.get_response(
            message="take me to my dashboard",
            context=context,
            conversation_history=[]
        )
        
        # Verify visual action
        assert "visual_action" in result["context"]
        visual_action = result["context"]["visual_action"]
        
        assert visual_action["action"]["action"] == "navigate"
        assert visual_action["action"]["parameters"]["route"] == "/you"
        
    @pytest.mark.asyncio
    async def test_normal_response_no_visual_action(self, service):
        """Test that normal responses don't create visual actions"""
        # Mock a normal AI response without function calls
        mock_response = MagicMock()
        mock_response.choices = [MagicMock()]
        mock_response.choices[0].message.content = "The weather today is sunny and warm."
        mock_response.choices[0].message.function_call = None
        
        service.client.chat.completions.create = AsyncMock(return_value=mock_response)
        service._log_interaction = AsyncMock()
        
        # Test the service
        context = {'user_id': 'test_user'}
        result = await service.get_response(
            message="what's the weather like?",
            context=context,
            conversation_history=[]
        )
        
        # Verify no visual action was created
        assert "visual_action" not in result["context"]
        assert result["response"] == "The weather today is sunny and warm."