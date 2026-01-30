from abc import ABC, abstractmethod
from typing import Dict, Any, List
from datetime import datetime, timedelta
import math

class BaseTrigger(ABC):
    """Base class for proactive suggestion triggers"""

    @abstractmethod
    async def should_trigger(self, context: Dict[str, Any]) -> bool:
        """Determine if this trigger should fire"""
        pass

    @abstractmethod
    async def generate_suggestion(self, context: Dict[str, Any]) -> Dict[str, Any]:
        """Generate suggestion when trigger fires"""
        pass

class TravelPatternTrigger(BaseTrigger):
    """Triggers based on travel patterns and current state"""

    async def should_trigger(self, context: Dict[str, Any]) -> bool:
        """Check if travel assistance is needed"""
        fuel_level = context.get("fuel_level", 100)
        distance_to_destination = context.get("distance_to_destination", 0)

        # Low fuel trigger
        if fuel_level < 30:
            return True

        # Long distance without stops trigger
        if distance_to_destination > 200:  # 200+ miles
            return True

        return False

    async def generate_suggestion(self, context: Dict[str, Any]) -> Dict[str, Any]:
        """Generate travel-related suggestion"""
        fuel_level = context.get("fuel_level", 100)

        if fuel_level < 30:
            return {
                "type": "fuel_alert",
                "priority": "high",
                "message": f"Fuel level at {fuel_level}%. I found 3 gas stations within 15 minutes. The Shell station has the best price at $3.42/gallon.",
                "actions": ["show_fuel_stops", "navigate_to_cheapest", "calculate_savings"],
                "data": {
                    "fuel_level": fuel_level,
                    "suggested_stops": 3,
                    "best_price": 3.42
                }
            }

        return {
            "type": "trip_optimization",
            "priority": "normal",
            "message": "Based on your travel pattern, I can optimize your route to save 45 minutes and $23 in fuel costs.",
            "actions": ["optimize_route", "show_savings", "apply_changes"]
        }

class FinancialTrigger(BaseTrigger):
    """Triggers for budget and expense management"""

    async def should_trigger(self, context: Dict[str, Any]) -> bool:
        """Check if financial guidance is needed"""
        monthly_spending = context.get("monthly_spending", 0)
        budget = context.get("monthly_budget", 0)

        # 80% budget threshold
        if budget > 0 and monthly_spending / budget > 0.8:
            return True

        # Spending spike detection
        recent_expenses = context.get("recent_expenses", [])
        if len(recent_expenses) >= 3:
            avg_expense = sum(recent_expenses) / len(recent_expenses)
            latest_expense = recent_expenses[-1]
            if latest_expense > avg_expense * 2:  # Spike detection
                return True

        return False

    async def generate_suggestion(self, context: Dict[str, Any]) -> Dict[str, Any]:
        """Generate financial suggestion"""
        monthly_spending = context.get("monthly_spending", 0)
        budget = context.get("monthly_budget", 0)

        if budget > 0:
            percentage = (monthly_spending / budget) * 100
            remaining = budget - monthly_spending

            return {
                "type": "budget_alert",
                "priority": "medium",
                "message": f"You've spent {percentage:.0f}% of your monthly budget (${remaining:.2f} remaining). I can suggest some cost-saving alternatives.",
                "actions": ["analyze_expenses", "find_savings", "adjust_budget"],
                "data": {
                    "spent_percentage": percentage,
                    "remaining_budget": remaining
                }
            }

        return {
            "type": "expense_anomaly",
            "priority": "low",
            "message": "I noticed an unusual expense pattern. Would you like me to analyze your spending and suggest optimizations?",
            "actions": ["analyze_patterns", "categorize_expenses", "optimize_spending"]
        }

class CalendarTrigger(BaseTrigger):
    """Triggers for schedule and trip planning"""

    async def should_trigger(self, context: Dict[str, Any]) -> bool:
        """Check if calendar assistance is needed"""
        upcoming_events = context.get("upcoming_events", [])
        weather_forecast = context.get("weather_forecast", {})

        # Good weather window for travel
        if weather_forecast.get("clear_days", 0) >= 3:
            return True

        # Departure reminder needed
        for event in upcoming_events:
            event_date = datetime.fromisoformat(event.get("date", ""))
            if event.get("type") == "trip" and event_date - datetime.now() <= timedelta(days=2):
                return True

        return False

    async def generate_suggestion(self, context: Dict[str, Any]) -> Dict[str, Any]:
        """Generate calendar/schedule suggestion"""
        weather_forecast = context.get("weather_forecast", {})

        if weather_forecast.get("clear_days", 0) >= 3:
            return {
                "type": "weather_opportunity",
                "priority": "medium",
                "message": "Perfect weather window ahead! 3 days of clear skies starting tomorrow. Great time for that Yellowstone trip you mentioned.",
                "actions": ["plan_trip", "check_reservations", "optimize_route"],
                "data": {
                    "clear_days": weather_forecast.get("clear_days"),
                    "suggested_destination": "Yellowstone"
                }
            }

        return {
            "type": "departure_reminder",
            "priority": "high",
            "message": "Your trip to Glacier starts in 2 days. Shall I check your vehicle maintenance status and fuel level?",
            "actions": ["check_maintenance", "plan_departure", "prepare_checklist"]
        }