import asyncio
import logging
from typing import Dict, Optional
from datetime import datetime

from app.services.pam.monitoring.event_monitor import EventMonitor
from app.services.pam.monitoring.event_types import EventType, BaseEvent
from app.core.personalized_pam_agent import PersonalizedPamAgent

logger = logging.getLogger(__name__)

class EventManager:
    """Global manager for all user event monitors"""

    def __init__(self):
        self.monitors: Dict[str, EventMonitor] = {}
        self.pam_agents: Dict[str, PersonalizedPamAgent] = {}

    async def get_or_create_monitor(self, user_id: str) -> EventMonitor:
        """Get existing monitor or create new one for user"""
        if user_id not in self.monitors:
            monitor = EventMonitor(user_id)

            # Register default handlers
            monitor.register_handler(EventType.LOW_FUEL, self._handle_low_fuel)
            monitor.register_handler(EventType.BUDGET_THRESHOLD, self._handle_budget_alert)
            monitor.register_handler(EventType.WEATHER_WINDOW, self._handle_weather_window)

            self.monitors[user_id] = monitor

            # Start monitoring in background
            asyncio.create_task(monitor.start_monitoring())

        return self.monitors[user_id]

    async def handle_proactive_event(self, event: BaseEvent):
        """Send proactive message to PAM for this event"""
        await send_proactive_message(event.user_id, event)

    async def _handle_low_fuel(self, event: BaseEvent):
        """Handle low fuel event - suggest fuel stops"""
        message = f"Your fuel is getting low ({event.data['fuel_level']}%). I found 3 gas stations within 10 miles. Would you like me to show you the route to the cheapest one?"

        await send_proactive_message(event.user_id, {
            "type": "proactive_suggestion",
            "category": "travel_assistance",
            "message": message,
            "actions": ["find_fuel_stops", "calculate_routes", "compare_prices"]
        })

    async def _handle_budget_alert(self, event: BaseEvent):
        """Handle budget threshold event"""
        category = event.data.get('category', 'general')
        spent = event.data.get('spent', 0)
        budget = event.data.get('budget', 0)

        message = f"You've spent ${spent:.2f} of your ${budget:.2f} {category} budget this month. Want me to suggest some cost-saving alternatives for your trip?"

        await send_proactive_message(event.user_id, {
            "type": "proactive_suggestion",
            "category": "financial_guidance",
            "message": message,
            "actions": ["analyze_expenses", "find_savings", "adjust_route"]
        })

    async def _handle_weather_window(self, event: BaseEvent):
        """Handle good weather window for travel"""
        message = f"Perfect travel weather is forecasted for the next 3 days! Your planned route to {event.data.get('destination')} looks ideal. Should I optimize your departure time?"

        await send_proactive_message(event.user_id, {
            "type": "proactive_suggestion",
            "category": "trip_optimization",
            "message": message,
            "actions": ["optimize_departure", "check_campgrounds", "plan_stops"]
        })

async def send_proactive_message(user_id: str, data: dict):
    """Send proactive message via WebSocket to user"""
    # Implementation will connect to existing WebSocket infrastructure
    logger.info(f"Proactive message for {user_id}: {data}")
    pass  # TODO: Connect to WebSocket in next task

# Global event manager instance
event_manager = EventManager()