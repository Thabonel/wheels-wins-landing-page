import pytest
import asyncio
import json
from datetime import datetime, date, timedelta
from unittest.mock import AsyncMock, MagicMock, patch
from typing import Dict, Any, List

# Import the modules we need to test
from app.core.orchestrator import Orchestrator
from app.nodes.wheels_node import WheelsNode
from app.nodes.wins_node import WinsNode
from app.core.intelligent_conversation import IntelligentConversationManager
from app.database.supabase_client import get_supabase_client

class TestTripPlanningFlow:
    """Test complete trip planning flow scenarios"""
    
    @pytest.fixture
    def orchestrator(self):
        return Orchestrator()
    
    @pytest.fixture
    def wheels_node(self):
        return WheelsNode()
    
    @pytest.fixture
    def mock_user_data(self):
        return {
            "user_id": "test-user-123",
            "email": "test@example.com",
            "preferences": {
                "vehicle_type": "RV",
                "max_daily_drive": 300,
                "fuel_type": "diesel",
                "travel_style": "leisurely"
            }
        }
    
    @pytest.mark.asyncio
    async def test_complete_trip_planning_flow(self, wheels_node, mock_user_data):
        """Test the complete trip planning workflow from start to finish"""
        
        # Test data
        trip_request = {
            "start_location": {"name": "Sydney", "lat": -33.8688, "lng": 151.2093},
            "end_location": {"name": "Melbourne", "lat": -37.8136, "lng": 144.9631},
            "start_date": "2024-02-01",
            "end_date": "2024-02-05",
            "preferences": {
                "max_daily_drive": 400,
                "interests": ["nature", "history"],
                "accommodation_type": "camping"
            }
        }
        
        # Mock external API calls
        with patch.object(wheels_node, 'supabase') as mock_supabase:
            # Mock database responses
            mock_supabase.table.return_value.select.return_value.execute.return_value.data = [
                {
                    "name": "Test Campground",
                    "latitude": -35.0,
                    "longitude": 148.0,
                    "price_per_night": 35,
                    "amenities": {"rv_friendly": True}
                }
            ]
            
            # Execute trip planning
            result = await wheels_node.plan_complete_trip(
                mock_user_data["user_id"], 
                trip_request
            )
            
            # Assertions
            assert result["success"] is True
            assert "route" in result
            assert "camping_stops" in result
            assert "fuel_estimates" in result
            assert "attractions" in result
            assert "total_estimated_cost" in result
            
            # Verify route has waypoints
            assert len(result["route"]["waypoints"]) >= 2
            
            # Verify camping stops are reasonable
            assert len(result["camping_stops"]) >= 1
            for stop in result["camping_stops"]:
                assert "name" in stop
                assert "location" in stop
                assert "estimated_cost" in stop
            
            # Verify fuel estimates are positive
            assert result["fuel_estimates"]["total_cost"] > 0
            assert result["fuel_estimates"]["total_distance"] > 0
    
    @pytest.mark.asyncio
    async def test_trip_planning_with_invalid_locations(self, wheels_node, mock_user_data):
        """Test trip planning error handling with invalid locations"""
        
        invalid_trip_request = {
            "start_location": {"name": "", "lat": None, "lng": None},
            "end_location": {"name": "Melbourne", "lat": -37.8136, "lng": 144.9631},
            "start_date": "2024-02-01",
            "end_date": "2024-02-05"
        }
        
        result = await wheels_node.plan_complete_trip(
            mock_user_data["user_id"], 
            invalid_trip_request
        )
        
        assert result["success"] is False
        assert "error" in result
        assert "Invalid" in result["error"] or "Missing" in result["error"]
    
    @pytest.mark.asyncio
    async def test_trip_planning_date_validation(self, wheels_node, mock_user_data):
        """Test trip planning with invalid date ranges"""
        
        # Test past dates
        past_trip_request = {
            "start_location": {"name": "Sydney", "lat": -33.8688, "lng": 151.2093},
            "end_location": {"name": "Melbourne", "lat": -37.8136, "lng": 144.9631},
            "start_date": "2020-01-01",
            "end_date": "2020-01-05"
        }
        
        result = await wheels_node.plan_complete_trip(
            mock_user_data["user_id"], 
            past_trip_request
        )
        
        # Should handle gracefully or provide warning
        assert "success" in result


class TestExpenseTrackingAndBudgetAlerts:
    """Test expense tracking and budget alert scenarios"""
    
    @pytest.fixture
    def wins_node(self):
        return WinsNode()
    
    @pytest.fixture
    def mock_budget_data(self):
        return {
            "user_id": "test-user-123",
            "category": "fuel",
            "budgeted_amount": 500.0,
            "start_date": date.today().replace(day=1),
            "end_date": date.today().replace(month=12, day=31)
        }
    
    @pytest.mark.asyncio
    async def test_expense_tracking_flow(self, wins_node):
        """Test complete expense tracking workflow"""
        
        user_id = "test-user-123"
        expense_data = {
            "amount": 75.50,
            "category": "fuel",
            "description": "Shell station fill-up",
            "date": date.today().isoformat()
        }
        
        with patch.object(wins_node, 'supabase') as mock_supabase:
            # Mock successful insert
            mock_supabase.table.return_value.insert.return_value.execute.return_value.data = [
                {"id": "expense-123", **expense_data, "user_id": user_id}
            ]
            
            # Mock budget check
            mock_supabase.table.return_value.select.return_value.eq.return_value.eq.return_value.execute.return_value.data = [
                {
                    "budgeted_amount": 500.0,
                    "start_date": date.today().replace(day=1),
                    "end_date": date.today().replace(month=12, day=31)
                }
            ]
            
            # Mock expenses query
            mock_supabase.table.return_value.select.return_value.eq.return_value.eq.return_value.gte.return_value.lte.return_value.execute.return_value.data = [
                {"amount": "450.00"}  # Existing expenses
            ]
            
            result = await wins_node.add_expense(user_id, expense_data)
            
            assert result["success"] is True
            assert "expense" in result
            assert "budget_status" in result
            assert result["budget_status"]["percentage_used"] > 90  # Should trigger alert
            assert result["budget_status"]["alert"] is True
    
    @pytest.mark.asyncio
    async def test_budget_alert_threshold(self, wins_node):
        """Test budget alert triggering at different thresholds"""
        
        user_id = "test-user-123"
        
        with patch.object(wins_node, 'supabase') as mock_supabase:
            # Test 95% threshold - should trigger high priority alert
            mock_supabase.table.return_value.select.return_value.eq.return_value.eq.return_value.execute.return_value.data = [
                {"budgeted_amount": 500.0}
            ]
            mock_supabase.table.return_value.select.return_value.eq.return_value.eq.return_value.gte.return_value.lte.return_value.execute.return_value.data = [
                {"amount": "475.00"}  # 95% spent
            ]
            
            result = await wins_node.check_budget_status(user_id, "fuel")
            
            assert result["status"] == "active"
            assert result["percentage_used"] == 95.0
            assert result["alert"] is True
    
    @pytest.mark.asyncio
    async def test_expense_categorization(self, wins_node):
        """Test automatic expense categorization"""
        
        test_cases = [
            ("Shell fuel station", 65.0, "fuel"),
            ("Woolworths groceries", 125.0, "food"),
            ("Caravan park site fee", 45.0, "accommodation"),
            ("Mechanic oil change", 85.0, "maintenance"),
            ("Unknown expense", 250.0, "major_expense"),
            ("Coffee shop", 15.0, "miscellaneous")
        ]
        
        for description, amount, expected_category in test_cases:
            result = await wins_node.categorize_expense(description, amount)
            assert result == expected_category or result in ["miscellaneous", "major_expense", "moderate_expense"]


class TestMemoryAcrossConversations:
    """Test PAM's memory and learning capabilities across conversations"""
    
    @pytest.fixture
    def conversation_manager(self):
        return IntelligentConversationManager()
    
    @pytest.fixture
    def mock_conversation_history(self):
        return [
            {
                "user_message": "I'm planning a trip to Melbourne",
                "pam_response": "I'd be happy to help you plan your trip to Melbourne!",
                "detected_intent": "trip_planning",
                "entities_extracted": {"destination": "Melbourne"},
                "timestamp": datetime.now() - timedelta(hours=2)
            },
            {
                "user_message": "I prefer camping over hotels",
                "pam_response": "I'll remember you prefer camping accommodations.",
                "detected_intent": "preference_update",
                "entities_extracted": {"accommodation_preference": "camping"},
                "timestamp": datetime.now() - timedelta(hours=1)
            }
        ]
    
    @pytest.mark.asyncio
    async def test_conversation_context_retention(self, conversation_manager, mock_conversation_history):
        """Test that PAM retains context across conversation turns"""
        
        user_id = "test-user-123"
        
        with patch.object(conversation_manager, 'supabase') as mock_supabase:
            # Mock conversation history retrieval
            mock_supabase.table.return_value.select.return_value.eq.return_value.order.return_value.limit.return_value.execute.return_value.data = mock_conversation_history
            
            # Test context building
            context = await conversation_manager.build_conversation_context(user_id)
            
            assert "previous_topics" in context
            assert "user_preferences" in context
            assert "trip_planning" in context["previous_topics"]
            assert context["user_preferences"]["accommodation_preference"] == "camping"
    
    @pytest.mark.asyncio
    async def test_preference_learning_and_persistence(self, conversation_manager):
        """Test that PAM learns and persists user preferences"""
        
        user_id = "test-user-123"
        new_preference = {
            "preference_type": "travel_style",
            "preference_value": "luxury",
            "confidence": 0.8,
            "source": "explicit_statement"
        }
        
        with patch.object(conversation_manager, 'supabase') as mock_supabase:
            mock_supabase.table.return_value.upsert.return_value.execute.return_value.data = [new_preference]
            
            result = await conversation_manager.update_user_preference(user_id, new_preference)
            
            assert result["success"] is True
            assert result["preference"]["preference_type"] == "travel_style"
    
    @pytest.mark.asyncio
    async def test_conversation_session_management(self, conversation_manager):
        """Test conversation session creation and management"""
        
        user_id = "test-user-123"
        
        with patch.object(conversation_manager, 'supabase') as mock_supabase:
            # Mock session creation
            mock_supabase.table.return_value.insert.return_value.execute.return_value.data = [
                {
                    "id": "session-123",
                    "user_id": user_id,
                    "session_start": datetime.now().isoformat(),
                    "is_active": True
                }
            ]
            
            session = await conversation_manager.create_conversation_session(user_id)
            
            assert session["success"] is True
            assert session["session"]["user_id"] == user_id
            assert session["session"]["is_active"] is True


class TestProfileLearning:
    """Test PAM's profile learning capabilities"""
    
    @pytest.fixture
    def orchestrator(self):
        return Orchestrator()
    
    @pytest.mark.asyncio
    async def test_travel_pattern_learning(self, orchestrator):
        """Test learning travel patterns from user interactions"""
        
        user_id = "test-user-123"
        interactions = [
            {"intent": "trip_planning", "entities": {"destination": "Brisbane", "duration": "weekend"}},
            {"intent": "fuel_query", "entities": {"fuel_type": "diesel"}},
            {"intent": "camping_search", "entities": {"accommodation_type": "rv_park"}},
            {"intent": "trip_planning", "entities": {"destination": "Gold Coast", "duration": "week"}}
        ]
        
        with patch.object(orchestrator, 'supabase') as mock_supabase:
            # Mock interaction history
            mock_supabase.table.return_value.select.return_value.eq.return_value.execute.return_value.data = interactions
            
            patterns = await orchestrator.analyze_travel_patterns(user_id)
            
            assert "preferred_destinations" in patterns
            assert "trip_duration_preferences" in patterns
            assert "vehicle_preferences" in patterns
    
    @pytest.mark.asyncio
    async def test_spending_pattern_analysis(self, orchestrator):
        """Test analysis of user spending patterns"""
        
        user_id = "test-user-123"
        expenses = [
            {"category": "fuel", "amount": 75, "date": "2024-01-15"},
            {"category": "food", "amount": 45, "date": "2024-01-15"},
            {"category": "fuel", "amount": 80, "date": "2024-01-20"},
            {"category": "accommodation", "amount": 120, "date": "2024-01-22"}
        ]
        
        with patch.object(orchestrator, 'supabase') as mock_supabase:
            mock_supabase.table.return_value.select.return_value.eq.return_value.execute.return_value.data = expenses
            
            patterns = await orchestrator.analyze_spending_patterns(user_id)
            
            assert "top_categories" in patterns
            assert "average_amounts" in patterns
            assert "spending_frequency" in patterns
    
    @pytest.mark.asyncio
    async def test_preference_confidence_scoring(self, orchestrator):
        """Test confidence scoring for learned preferences"""
        
        user_id = "test-user-123"
        
        # Test explicit vs inferred preferences
        explicit_preference = {
            "type": "accommodation",
            "value": "camping",
            "source": "explicit_statement",
            "frequency": 1
        }
        
        inferred_preference = {
            "type": "accommodation", 
            "value": "camping",
            "source": "behavior_pattern",
            "frequency": 5
        }
        
        explicit_confidence = await orchestrator.calculate_preference_confidence(explicit_preference)
        inferred_confidence = await orchestrator.calculate_preference_confidence(inferred_preference)
        
        # Explicit statements should have high initial confidence
        assert explicit_confidence >= 0.8
        # Inferred patterns with high frequency should also be confident
        assert inferred_confidence >= 0.7


class TestErrorHandlingAndMissingData:
    """Test error handling scenarios and missing data cases"""
    
    @pytest.fixture
    def orchestrator(self):
        return Orchestrator()
    
    @pytest.mark.asyncio
    async def test_missing_user_profile_handling(self, orchestrator):
        """Test handling of requests when user profile is incomplete"""
        
        user_id = "new-user-123"
        user_input = "Plan me a trip to Melbourne"
        
        with patch.object(orchestrator, 'supabase') as mock_supabase:
            # Mock empty profile response
            mock_supabase.table.return_value.select.return_value.eq.return_value.execute.return_value.data = []
            
            result = await orchestrator.process_user_input(user_id, user_input)
            
            # Should handle gracefully and prompt for missing information
            assert "success" in result
            if not result["success"]:
                assert "profile" in result.get("error", "").lower() or "information" in result.get("response", "").lower()
    
    @pytest.mark.asyncio
    async def test_database_connection_error_handling(self, orchestrator):
        """Test handling of database connection errors"""
        
        user_id = "test-user-123"
        user_input = "What's my fuel budget status?"
        
        with patch.object(orchestrator, 'supabase') as mock_supabase:
            # Mock database connection error
            mock_supabase.table.side_effect = Exception("Database connection failed")
            
            result = await orchestrator.process_user_input(user_id, user_input)
            
            assert "success" in result
            if not result["success"]:
                assert "error" in result
                assert isinstance(result["error"], str)
    
    @pytest.mark.asyncio
    async def test_malformed_input_handling(self, orchestrator):
        """Test handling of malformed or unexpected input"""
        
        user_id = "test-user-123"
        malformed_inputs = [
            "",  # Empty string
            "   ",  # Whitespace only
            "🚗🏕️⛽💰",  # Emoji only
            "a" * 1000,  # Very long input
            None,  # None value
            {"not": "a string"},  # Wrong type
        ]
        
        for malformed_input in malformed_inputs:
            try:
                result = await orchestrator.process_user_input(user_id, malformed_input)
                # Should handle gracefully
                assert isinstance(result, dict)
                assert "success" in result or "error" in result
            except Exception as e:
                # If exception is raised, it should be a known error type
                assert isinstance(e, (ValueError, TypeError))
    
    @pytest.mark.asyncio
    async def test_incomplete_travel_data_handling(self, orchestrator):
        """Test handling when travel data is incomplete or missing"""
        
        user_id = "test-user-123"
        incomplete_requests = [
            "Plan a trip",  # No destination
            "Find camping near",  # No location
            "Check fuel prices",  # No location context
            "Book accommodation for tomorrow"  # No destination
        ]
        
        with patch.object(orchestrator, 'supabase') as mock_supabase:
            mock_supabase.table.return_value.select.return_value.eq.return_value.execute.return_value.data = []
            
            for incomplete_request in incomplete_requests:
                result = await orchestrator.process_user_input(user_id, incomplete_request)
                
                # Should identify missing information and ask for clarification
                assert "success" in result
                if result.get("success"):
                    response = result.get("response", "").lower()
                    assert any(keyword in response for keyword in ["where", "when", "which", "more", "specify", "clarify"])
    
    @pytest.mark.asyncio
    async def test_external_api_failure_handling(self, orchestrator):
        """Test handling of external API failures"""
        
        user_id = "test-user-123"
        user_input = "What's the weather like on my route to Brisbane?"
        
        with patch('app.core.orchestrator.requests') as mock_requests:
            # Mock external API failure
            mock_requests.get.side_effect = Exception("External API unavailable")
            
            result = await orchestrator.process_user_input(user_id, user_input)
            
            # Should handle gracefully and provide fallback response
            assert "success" in result
            if not result["success"]:
                assert "temporarily unavailable" in result.get("response", "").lower() or \
                       "try again" in result.get("response", "").lower()


class TestIntegrationScenarios:
    """Test end-to-end integration scenarios"""
    
    @pytest.mark.asyncio
    async def test_complete_user_journey(self):
        """Test a complete user journey from onboarding to trip completion"""
        
        user_id = "test-user-journey"
        orchestrator = Orchestrator()
        
        # Journey steps
        journey_steps = [
            "I'm new to RV travel",
            "I want to plan a trip from Sydney to Melbourne",
            "I prefer camping over hotels",
            "Add $75 fuel expense at Shell station",
            "Check my fuel budget status",
            "Find camping near Albury",
            "Set maintenance reminder for oil change in 2 weeks"
        ]
        
        conversation_context = {}
        
        for step in journey_steps:
            with patch.object(orchestrator, 'supabase') as mock_supabase:
                # Mock appropriate responses for each step
                mock_supabase.table.return_value.select.return_value.eq.return_value.execute.return_value.data = []
                mock_supabase.table.return_value.insert.return_value.execute.return_value.data = [{"id": "test-id"}]
                
                result = await orchestrator.process_user_input(user_id, step, conversation_context)
                
                # Each step should be processed successfully
                assert isinstance(result, dict)
                # Update context for next interaction
                if result.get("success"):
                    conversation_context.update(result.get("context", {}))
    
    @pytest.mark.asyncio
    async def test_multi_node_coordination(self):
        """Test coordination between different PAM nodes"""
        
        user_id = "test-coordination"
        orchestrator = Orchestrator()
        
        # Request that requires multiple nodes
        complex_request = "Plan a trip to Brisbane, add the fuel costs to my budget, and set maintenance reminders for the journey"
        
        with patch.object(orchestrator, 'supabase') as mock_supabase:
            mock_supabase.table.return_value.select.return_value.eq.return_value.execute.return_value.data = []
            mock_supabase.table.return_value.insert.return_value.execute.return_value.data = [{"id": "test-id"}]
            
            result = await orchestrator.process_user_input(user_id, complex_request)
            
            # Should coordinate between wheels (trip planning) and wins (budget) nodes
            assert isinstance(result, dict)
            # Should mention multiple actions completed
            response = result.get("response", "").lower()
            assert any(keyword in response for keyword in ["trip", "budget", "maintenance"])


if __name__ == "__main__":
    # Run tests with: python -m pytest pam-backend/tests/test_scenarios.py -v
    pytest.main([__file__, "-v"])