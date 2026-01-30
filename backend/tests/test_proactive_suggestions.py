import pytest
from unittest.mock import Mock, patch
from app.services.pam.proactive.suggestion_engine import ProactiveSuggestionEngine
from app.services.pam.proactive.triggers import TravelPatternTrigger, FinancialTrigger, CalendarTrigger

@pytest.mark.asyncio
async def test_suggestion_engine_analyzes_travel_patterns():
    engine = ProactiveSuggestionEngine(user_id="test-user")

    # Mock user data
    user_data = {
        "recent_trips": [
            {"destination": "Yellowstone", "fuel_stops": 3, "cost": 450},
            {"destination": "Glacier", "fuel_stops": 2, "cost": 380}
        ],
        "current_location": {"lat": 45.123, "lng": -110.456},
        "fuel_level": 15
    }

    suggestions = await engine.analyze_and_suggest(user_data)

    assert len(suggestions) > 0
    assert any("fuel" in s.message.lower() for s in suggestions)

@pytest.mark.asyncio
async def test_travel_pattern_trigger_detects_low_fuel():
    trigger = TravelPatternTrigger()

    context = {
        "fuel_level": 15,
        "current_location": {"lat": 45.0, "lng": -110.0},
        "next_destination": {"lat": 46.0, "lng": -111.0},
        "distance_to_destination": 120
    }

    should_trigger = await trigger.should_trigger(context)
    assert should_trigger is True

# Error Scenario Tests

@pytest.mark.asyncio
async def test_travel_trigger_handles_invalid_context():
    """Test that TravelPatternTrigger handles invalid context gracefully"""
    trigger = TravelPatternTrigger()

    # Test with None context
    should_trigger = await trigger.should_trigger(None)
    assert should_trigger is False

    # Test with non-dict context
    should_trigger = await trigger.should_trigger("invalid")
    assert should_trigger is False

    # Test with invalid fuel level
    context = {"fuel_level": "invalid", "distance_to_destination": 100}
    should_trigger = await trigger.should_trigger(context)
    assert should_trigger is False  # Should not trigger with invalid fuel

    # Test with negative fuel level
    context = {"fuel_level": -10, "distance_to_destination": 100}
    should_trigger = await trigger.should_trigger(context)
    assert should_trigger is False  # Should not trigger with invalid fuel

    # Test with fuel level > 100
    context = {"fuel_level": 150, "distance_to_destination": 100}
    should_trigger = await trigger.should_trigger(context)
    assert should_trigger is False  # Should normalize to 100, no trigger

@pytest.mark.asyncio
async def test_financial_trigger_handles_invalid_data():
    """Test that FinancialTrigger handles invalid financial data"""
    trigger = FinancialTrigger()

    # Test with invalid spending amount
    context = {"monthly_spending": "invalid", "monthly_budget": 1000}
    should_trigger = await trigger.should_trigger(context)
    assert should_trigger is False

    # Test with negative budget
    context = {"monthly_spending": 800, "monthly_budget": -100}
    should_trigger = await trigger.should_trigger(context)
    assert should_trigger is False

    # Test with invalid recent_expenses type
    context = {"monthly_spending": 800, "monthly_budget": 1000, "recent_expenses": "not a list"}
    should_trigger = await trigger.should_trigger(context)
    assert should_trigger is False

    # Test with mixed valid/invalid expenses
    context = {
        "monthly_spending": 800,
        "monthly_budget": 1000,
        "recent_expenses": [50.0, "invalid", -10, 100.0]
    }
    should_trigger = await trigger.should_trigger(context)
    # Should process only valid expenses [50.0, 100.0] - not enough for spike detection
    assert should_trigger is False

@pytest.mark.asyncio
async def test_calendar_trigger_handles_malformed_dates():
    """Test that CalendarTrigger handles malformed date data gracefully"""
    trigger = CalendarTrigger()

    # Test with invalid date format
    context = {
        "upcoming_events": [
            {"date": "invalid-date", "type": "trip"},
            {"date": "2024-13-45", "type": "trip"}  # Invalid date
        ],
        "weather_forecast": {"clear_days": 2}
    }
    should_trigger = await trigger.should_trigger(context)
    assert should_trigger is False  # Should not trigger due to invalid dates

    # Test with missing date field
    context = {
        "upcoming_events": [
            {"type": "trip"},  # Missing date
            {"date": "", "type": "trip"}  # Empty date
        ],
        "weather_forecast": {"clear_days": 2}
    }
    should_trigger = await trigger.should_trigger(context)
    assert should_trigger is False

    # Test with non-dict events
    context = {
        "upcoming_events": ["not a dict", 123, None],
        "weather_forecast": {"clear_days": 2}
    }
    should_trigger = await trigger.should_trigger(context)
    assert should_trigger is False

    # Test with invalid weather_forecast type
    context = {
        "upcoming_events": [],
        "weather_forecast": "not a dict"
    }
    should_trigger = await trigger.should_trigger(context)
    assert should_trigger is False

# Edge Case Tests

@pytest.mark.asyncio
async def test_travel_trigger_edge_cases():
    """Test edge cases for TravelPatternTrigger"""
    trigger = TravelPatternTrigger()

    # Test exact threshold values
    context = {"fuel_level": 20, "distance_to_destination": 200}
    should_trigger = await trigger.should_trigger(context)
    assert should_trigger is False  # 20 is not < 20, 200 is not > 200

    # Test just below threshold
    context = {"fuel_level": 19.9, "distance_to_destination": 200.1}
    should_trigger = await trigger.should_trigger(context)
    assert should_trigger is True

    # Test zero values
    context = {"fuel_level": 0, "distance_to_destination": 0}
    should_trigger = await trigger.should_trigger(context)
    assert should_trigger is True  # 0 < 20

@pytest.mark.asyncio
async def test_financial_trigger_edge_cases():
    """Test edge cases for FinancialTrigger"""
    trigger = FinancialTrigger()

    # Test exact 80% threshold
    context = {"monthly_spending": 800, "monthly_budget": 1000}  # Exactly 80%
    should_trigger = await trigger.should_trigger(context)
    assert should_trigger is False  # 0.8 is not > 0.8

    # Test just above 80% threshold
    context = {"monthly_spending": 800.01, "monthly_budget": 1000}
    should_trigger = await trigger.should_trigger(context)
    assert should_trigger is True

    # Test zero budget (division by zero protection)
    context = {"monthly_spending": 100, "monthly_budget": 0}
    should_trigger = await trigger.should_trigger(context)
    assert should_trigger is False

    # Test spike detection with exactly 2x average
    context = {
        "monthly_spending": 500,
        "monthly_budget": 1000,
        "recent_expenses": [50.0, 50.0, 100.0]  # avg=66.67, latest=100 (1.5x avg)
    }
    should_trigger = await trigger.should_trigger(context)
    assert should_trigger is False

    # Test spike detection with >2x average
    context = {
        "monthly_spending": 500,
        "monthly_budget": 1000,
        "recent_expenses": [50.0, 50.0, 200.0]  # avg=100, latest=200 (2x avg)
    }
    should_trigger = await trigger.should_trigger(context)
    assert should_trigger is False  # exactly 2x should not trigger

    # Test spike detection with >2x average
    context = {
        "monthly_spending": 500,
        "monthly_budget": 1000,
        "recent_expenses": [50.0, 50.0, 201.0]  # avg=100.33, latest=201 (>2x avg)
    }
    should_trigger = await trigger.should_trigger(context)
    assert should_trigger is True

@pytest.mark.asyncio
async def test_calendar_trigger_edge_cases():
    """Test edge cases for CalendarTrigger"""
    trigger = CalendarTrigger()

    # Test exactly 3 clear days
    context = {
        "upcoming_events": [],
        "weather_forecast": {"clear_days": 3}
    }
    should_trigger = await trigger.should_trigger(context)
    assert should_trigger is True

    # Test just below 3 clear days
    context = {
        "upcoming_events": [],
        "weather_forecast": {"clear_days": 2.9}
    }
    should_trigger = await trigger.should_trigger(context)
    assert should_trigger is False

    # Test missing clear_days field
    context = {
        "upcoming_events": [],
        "weather_forecast": {}
    }
    should_trigger = await trigger.should_trigger(context)
    assert should_trigger is False

# Priority and Sorting Tests

@pytest.mark.asyncio
async def test_suggestion_priority_ordering():
    """Test that suggestions are properly sorted by priority"""
    engine = ProactiveSuggestionEngine(user_id="test-user")

    # Mock context that triggers multiple suggestions
    context = {
        "fuel_level": 15,  # Triggers travel (high priority)
        "monthly_spending": 900,
        "monthly_budget": 1000,  # Triggers financial (medium priority)
        "weather_forecast": {"clear_days": 4}  # Triggers calendar (medium priority)
    }

    suggestions = await engine.analyze_and_suggest(context)

    # Should have multiple suggestions
    assert len(suggestions) > 1

    # First suggestion should be highest priority
    priorities = [s.priority for s in suggestions]

    # Travel trigger generates "high" priority suggestion for low fuel
    assert "high" in priorities

    # Verify proper ordering (urgent > high > medium > low)
    priority_values = {"urgent": 0, "high": 1, "medium": 2, "low": 3}
    for i in range(len(suggestions) - 1):
        current_priority = priority_values.get(suggestions[i].priority, 3)
        next_priority = priority_values.get(suggestions[i + 1].priority, 3)
        assert current_priority <= next_priority

@pytest.mark.asyncio
async def test_suggestion_engine_error_handling():
    """Test that suggestion engine handles individual trigger errors"""
    engine = ProactiveSuggestionEngine(user_id="test-user")

    # Context that could cause errors
    context = {
        "fuel_level": "invalid",
        "monthly_spending": None,
        "weather_forecast": "not a dict"
    }

    # Should not crash even with invalid data
    suggestions = await engine.analyze_and_suggest(context)

    # Might return empty list or partial results, but should not crash
    assert isinstance(suggestions, list)