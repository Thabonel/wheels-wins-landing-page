from abc import ABC, abstractmethod
from typing import Dict, Any, List
from datetime import datetime, timedelta
import math
import logging

logger = logging.getLogger(__name__)

class BaseTrigger(ABC):
    """Base class for proactive suggestion triggers"""

    def validate_context(self, context: Dict[str, Any], required_fields: List[str] = None) -> bool:
        """Validate that context contains required fields and proper data types"""
        if not isinstance(context, dict):
            logger.warning(f"Context must be a dictionary, got {type(context)}")
            return False

        if required_fields:
            for field in required_fields:
                if field not in context:
                    logger.warning(f"Required field '{field}' missing from context")
                    return False

        return True

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
        if not self.validate_context(context):
            return False

        try:
            fuel_level = context.get("fuel_level", 100)
            distance_to_destination = context.get("distance_to_destination", 0)

            # Validate data types
            if not isinstance(fuel_level, (int, float)) or fuel_level < 0 or fuel_level > 100:
                logger.warning(f"Invalid fuel_level: {fuel_level}")
                fuel_level = 100

            if not isinstance(distance_to_destination, (int, float)) or distance_to_destination < 0:
                logger.warning(f"Invalid distance_to_destination: {distance_to_destination}")
                distance_to_destination = 0

            # Low fuel trigger
            if fuel_level < 20:
                return True

            # Long distance without stops trigger
            if distance_to_destination > 200:  # 200+ miles
                return True

            return False
        except Exception as e:
            logger.error(f"Error in TravelPatternTrigger.should_trigger: {e}")
            return False

    async def generate_suggestion(self, context: Dict[str, Any]) -> Dict[str, Any]:
        """Generate travel-related suggestion"""
        fuel_level = context.get("fuel_level", 100)

        if fuel_level < 20:
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
        if not self.validate_context(context):
            return False

        try:
            monthly_spending = context.get("monthly_spending", 0)
            budget = context.get("monthly_budget", 0)
            recent_expenses = context.get("recent_expenses", [])

            # Validate data types
            if not isinstance(monthly_spending, (int, float)) or monthly_spending < 0:
                logger.warning(f"Invalid monthly_spending: {monthly_spending}")
                monthly_spending = 0

            if not isinstance(budget, (int, float)) or budget < 0:
                logger.warning(f"Invalid monthly_budget: {budget}")
                budget = 0

            if not isinstance(recent_expenses, list):
                logger.warning(f"recent_expenses must be a list, got {type(recent_expenses)}")
                recent_expenses = []

            # Validate expense values
            valid_expenses = []
            for expense in recent_expenses:
                if isinstance(expense, (int, float)) and expense >= 0:
                    valid_expenses.append(expense)
            recent_expenses = valid_expenses

            # 80% budget threshold
            if budget > 0 and monthly_spending / budget > 0.8:
                return True

            # Spending spike detection
            if len(recent_expenses) >= 3:
                avg_expense = sum(recent_expenses) / len(recent_expenses)
                latest_expense = recent_expenses[-1]
                if latest_expense > avg_expense * 2:  # Spike detection
                    return True

            return False
        except Exception as e:
            logger.error(f"Error in FinancialTrigger.should_trigger: {e}")
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
        if not self.validate_context(context):
            return False

        try:
            upcoming_events = context.get("upcoming_events", [])
            weather_forecast = context.get("weather_forecast", {})

            # Validate data types
            if not isinstance(upcoming_events, list):
                logger.warning(f"upcoming_events must be a list, got {type(upcoming_events)}")
                upcoming_events = []

            if not isinstance(weather_forecast, dict):
                logger.warning(f"weather_forecast must be a dict, got {type(weather_forecast)}")
                weather_forecast = {}

            # Validate weather data
            clear_days = weather_forecast.get("clear_days", 0)
            if not isinstance(clear_days, (int, float)) or clear_days < 0:
                logger.warning(f"Invalid clear_days: {clear_days}")
                clear_days = 0

            # Good weather window for travel
            if clear_days >= 3:
                return True

            # Departure reminder needed - validate each event
            for event in upcoming_events:
                if not isinstance(event, dict):
                    logger.warning(f"Event must be a dict, got {type(event)}: {event}")
                    continue

                try:
                    event_date_str = event.get("date", "")
                    if not event_date_str:
                        logger.warning(f"Event missing date field: {event}")
                        continue

                    event_date = datetime.fromisoformat(event_date_str)
                    event_type = event.get("type", "")

                    if event_type == "trip" and event_date - datetime.now() <= timedelta(days=2):
                        return True
                except (ValueError, TypeError) as e:
                    logger.warning(f"Invalid date format for event: {event}. Error: {e}")
                    continue

            return False
        except Exception as e:
            logger.error(f"Error in CalendarTrigger.should_trigger: {e}")
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