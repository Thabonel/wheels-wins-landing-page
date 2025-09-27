"""
PAM 2.0 Function Tools
Function calling tools for Google Gemini integration
"""

from .weather import get_weather, get_weather_forecast, WEATHER_FUNCTIONS
from .trip_planning import (
    get_destination_info,
    estimate_trip_cost,
    suggest_itinerary,
    TRIP_PLANNING_FUNCTIONS
)

# All available functions for Gemini function calling
ALL_FUNCTIONS = WEATHER_FUNCTIONS + TRIP_PLANNING_FUNCTIONS

# Function registry for execution
FUNCTION_REGISTRY = {
    "get_weather": get_weather,
    "get_weather_forecast": get_weather_forecast,
    "get_destination_info": get_destination_info,
    "estimate_trip_cost": estimate_trip_cost,
    "suggest_itinerary": suggest_itinerary
}

__all__ = [
    "get_weather",
    "get_weather_forecast",
    "get_destination_info",
    "estimate_trip_cost",
    "suggest_itinerary",
    "ALL_FUNCTIONS",
    "FUNCTION_REGISTRY",
    "WEATHER_FUNCTIONS",
    "TRIP_PLANNING_FUNCTIONS"
]