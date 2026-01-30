import pytest
from unittest.mock import Mock, patch
from app.services.pam.proactive.suggestion_engine import ProactiveSuggestionEngine
from app.services.pam.proactive.triggers import TravelPatternTrigger

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
    assert should_trigger == True