import logging
from typing import List, Dict, Any
from dataclasses import dataclass
from datetime import datetime

from app.services.pam.proactive.triggers import (
    TravelPatternTrigger,
    FinancialTrigger,
    CalendarTrigger
)

logger = logging.getLogger(__name__)

@dataclass
class ProactiveSuggestion:
    """Represents a proactive suggestion for the user"""
    type: str
    priority: str  # low, medium, high, urgent
    message: str
    actions: List[str]
    data: Dict[str, Any]
    created_at: datetime

class ProactiveSuggestionEngine:
    """Analyzes user context and generates proactive suggestions"""

    def __init__(self, user_id: str):
        self.user_id = user_id
        self.triggers = [
            TravelPatternTrigger(),
            FinancialTrigger(),
            CalendarTrigger()
        ]

    async def analyze_and_suggest(self, user_data: Dict[str, Any]) -> List[ProactiveSuggestion]:
        """Analyze user data and generate relevant suggestions"""
        suggestions = []

        for trigger in self.triggers:
            try:
                if await trigger.should_trigger(user_data):
                    suggestion_data = await trigger.generate_suggestion(user_data)

                    suggestion = ProactiveSuggestion(
                        type=suggestion_data["type"],
                        priority=suggestion_data["priority"],
                        message=suggestion_data["message"],
                        actions=suggestion_data["actions"],
                        data=suggestion_data.get("data", {}),
                        created_at=datetime.now()
                    )

                    suggestions.append(suggestion)
                    logger.info(f"Generated {suggestion.type} suggestion for user {self.user_id}")

            except Exception as e:
                logger.error(f"Error with trigger {trigger.__class__.__name__}: {e}")
                continue

        # Sort by priority (urgent > high > medium > low)
        priority_order = {"urgent": 0, "high": 1, "medium": 2, "low": 3}
        suggestions.sort(key=lambda s: priority_order.get(s.priority, 3))

        return suggestions

    async def get_user_context(self) -> Dict[str, Any]:
        """Gather current user context for analysis"""
        # TODO: Integrate with existing PAM data sources
        context = {
            "fuel_level": await self._get_fuel_level(),
            "current_location": await self._get_current_location(),
            "monthly_spending": await self._get_monthly_spending(),
            "monthly_budget": await self._get_monthly_budget(),
            "upcoming_events": await self._get_upcoming_events(),
            "weather_forecast": await self._get_weather_forecast(),
            "recent_expenses": await self._get_recent_expenses(),
            "travel_patterns": await self._get_travel_patterns()
        }

        return context

    # Helper methods to fetch data (integrate with existing tools)
    async def _get_fuel_level(self) -> int:
        # TODO: Integrate with existing fuel tracking
        return 75  # Mock data

    async def _get_current_location(self) -> Dict[str, float]:
        # TODO: Integrate with location service
        return {"lat": 45.123, "lng": -110.456}

    async def _get_monthly_spending(self) -> float:
        # TODO: Integrate with manage_finances tool
        return 1250.50

    async def _get_monthly_budget(self) -> float:
        # TODO: Integrate with budget system
        return 1500.00

    async def _get_upcoming_events(self) -> List[Dict]:
        # TODO: Integrate with calendar system
        return []

    async def _get_weather_forecast(self) -> Dict[str, Any]:
        # TODO: Integrate with weather_advisor tool
        return {"clear_days": 4}

    async def _get_recent_expenses(self) -> List[float]:
        # TODO: Integrate with expense tracking
        return [45.67, 32.45, 156.78]

    async def _get_travel_patterns(self) -> Dict[str, Any]:
        # TODO: Analyze user travel history
        return {"avg_trip_length": 250, "preferred_fuel_stops": 2}