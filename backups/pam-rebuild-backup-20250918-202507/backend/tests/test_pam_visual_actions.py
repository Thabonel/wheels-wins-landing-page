"""
Unit tests for PAM Visual Actions Service
"""

import pytest
from datetime import datetime, timedelta
from unittest.mock import patch, MagicMock

from app.services.pam_visual_actions import PamVisualActionsService


class TestPamVisualActionsService:
    """Test suite for PamVisualActionsService"""
    
    @pytest.fixture
    def service(self):
        """Create a service instance for testing"""
        return PamVisualActionsService()
    
    @pytest.fixture
    def mock_context(self):
        """Create a mock context"""
        return {
            "user_id": "test_user_123",
            "session_id": "session_456",
            "timestamp": datetime.now().isoformat()
        }
    
    def test_parse_appointment_booking(self, service, mock_context):
        """Test appointment booking intent parsing"""
        message = "Book appointment with John tomorrow at 9am"
        
        result = service.parse_intent_to_visual_action(message, mock_context)
        
        assert result is not None
        assert result["type"] == "visual_action"
        assert result["action"]["action"] == "book_appointment"
        assert result["action"]["parameters"]["person"] == "John"
        assert "tomorrow" in result["feedback_message"].lower() or \
               (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%d") in result["feedback_message"]
    
    def test_parse_appointment_with_full_name(self, service, mock_context):
        """Test appointment booking with full name"""
        message = "Schedule meeting with Sarah Johnson next Monday at 2:30pm"
        
        result = service.parse_intent_to_visual_action(message, mock_context)
        
        assert result is not None
        assert result["action"]["parameters"]["person"] == "Sarah Johnson"
    
    def test_parse_expense_logging(self, service, mock_context):
        """Test expense logging intent parsing"""
        message = "I spent $45.50 on fuel"
        
        result = service.parse_intent_to_visual_action(message, mock_context)
        
        assert result is not None
        assert result["type"] == "visual_action"
        assert result["action"]["action"] == "log_expense"
        assert result["action"]["parameters"]["amount"] == 45.50
        assert result["action"]["parameters"]["category"] == "fuel"
    
    def test_parse_expense_without_dollar_sign(self, service, mock_context):
        """Test expense parsing without dollar sign"""
        message = "Paid 100 for groceries"
        
        result = service.parse_intent_to_visual_action(message, mock_context)
        
        assert result is not None
        assert result["action"]["parameters"]["amount"] == 100.0
        assert result["action"]["parameters"]["category"] == "food"
    
    def test_parse_navigation_intent(self, service, mock_context):
        """Test navigation intent parsing"""
        message = "Go to my dashboard"
        
        result = service.parse_intent_to_visual_action(message, mock_context)
        
        assert result is not None
        assert result["type"] == "visual_action"
        assert result["action"]["action"] == "navigate"
        assert result["action"]["parameters"]["route"] == "/you"
    
    def test_parse_trip_planning(self, service, mock_context):
        """Test trip planning intent parsing"""
        message = "Plan a trip to Yellowstone National Park"
        
        result = service.parse_intent_to_visual_action(message, mock_context)
        
        assert result is not None
        assert result["type"] == "visual_action"
        assert result["action"]["action"] == "create_trip"
        assert "Yellowstone" in result["action"]["parameters"]["destination"]
    
    def test_no_matching_intent(self, service, mock_context):
        """Test when no intent matches"""
        message = "What's the weather like?"
        
        result = service.parse_intent_to_visual_action(message, mock_context)
        
        assert result is None
    
    def test_extract_appointment_edge_cases(self, service, mock_context):
        """Test appointment extraction edge cases"""
        # No person name
        message = "Book appointment tomorrow at 9"
        result = service._extract_appointment_details(message, mock_context)
        assert result["action"]["parameters"]["person"] == "Unknown"
        
        # No time specified
        message = "Book appointment with John tomorrow"
        result = service._extract_appointment_details(message, mock_context)
        assert result["action"]["parameters"]["time"] == "09:00"
        
        # Today's date when no date specified
        message = "Book appointment with John"
        result = service._extract_appointment_details(message, mock_context)
        assert result["action"]["parameters"]["date"] == datetime.now().strftime("%Y-%m-%d")
    
    def test_extract_expense_categories(self, service, mock_context):
        """Test expense category detection"""
        test_cases = [
            ("Spent $30 on gas", "fuel"),
            ("Paid $50 for dinner", "food"),
            ("$100 for oil change", "maintenance"),
            ("Bought camping gear for $75", "camping"),
            ("Movie tickets cost $25", "entertainment"),
            ("Got new tools for $60", "supplies"),
            ("Spent $40 on something", "other")
        ]
        
        for message, expected_category in test_cases:
            result = service._extract_expense_details(message, mock_context)
            assert result["action"]["parameters"]["category"] == expected_category, \
                f"Failed for message: {message}"
    
    def test_extract_navigation_routes(self, service, mock_context):
        """Test navigation route mapping"""
        test_cases = [
            ("Go to wheels", "/wheels"),
            ("Open my expenses", "/wins"),
            ("Show me social", "/social"),
            ("Navigate to calendar", "/you"),
            ("Go to shop", "/shop"),
            ("Go to home", "/")
        ]
        
        for message, expected_route in test_cases:
            result = service._extract_navigation_details(message, mock_context)
            assert result["action"]["parameters"]["route"] == expected_route, \
                f"Failed for message: {message}"
    
    @patch('app.services.pam_visual_actions.date_parser')
    def test_date_parsing_error_handling(self, mock_parser, service, mock_context):
        """Test date parsing error handling"""
        mock_parser.parse.side_effect = ValueError("Invalid date")
        
        message = "Book appointment with John on invalid-date at 9am"
        result = service._extract_appointment_details(message, mock_context)
        
        # Should fallback to today's date
        assert result["action"]["parameters"]["date"] == datetime.now().strftime("%Y-%m-%d")
    
    def test_amount_extraction_error_handling(self, service, mock_context):
        """Test amount extraction with invalid input"""
        message = "Spent some money on fuel"
        result = service._extract_expense_details(message, mock_context)
        
        # Should default to 0
        assert result["action"]["parameters"]["amount"] == 0.0
    
    def test_destination_extraction_error_handling(self, service, mock_context):
        """Test destination extraction with edge cases"""
        message = "Plan a trip"
        result = service._extract_trip_details(message, mock_context)
        
        assert result["action"]["parameters"]["destination"] == "Unknown Destination"
    
    def test_action_parsing_methods(self, service):
        """Test individual action parsing methods"""
        # Test appointment action
        args = {"person": "John", "date": "2025-08-10", "time": "14:00"}
        result = service._parse_appointment_action(args)
        assert result["action"] == "book_appointment"
        assert result["parameters"] == args
        
        # Test expense action
        args = {"amount": 50, "category": "fuel"}
        result = service._parse_expense_action(args)
        assert result["action"] == "log_expense"
        assert result["parameters"] == args
        
        # Test navigation action
        args = {"route": "/dashboard"}
        result = service._parse_navigation_action(args)
        assert result["action"] == "navigate"
        assert result["parameters"] == args
    
    def test_complex_messages(self, service, mock_context):
        """Test parsing of complex, real-world messages"""
        complex_messages = [
            ("I need to book an appointment with Dr. Smith tomorrow at 3:30 pm for my annual checkup",
             "book_appointment"),
            ("Just spent thirty five dollars and fifty cents on diesel fuel at the Shell station",
             "log_expense"),
            ("Can you help me plan a road trip to the Grand Canyon next month?",
             "create_trip"),
            ("Please navigate to my financial dashboard to check my budget",
             "navigate")
        ]
        
        for message, expected_action in complex_messages:
            result = service.parse_intent_to_visual_action(message, mock_context)
            assert result is not None, f"Failed to parse: {message}"
            assert result["action"]["action"] == expected_action, \
                f"Wrong action for: {message}"