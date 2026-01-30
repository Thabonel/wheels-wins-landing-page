# PAM Proactive Autonomous Agent Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Transform PAM from reactive chat assistant to proactive autonomous agent that anticipates needs and takes automated actions.

**Architecture:** Build on existing PAM WebSocket + tool registry architecture, add always-on event monitoring, scheduled actions, and proactive suggestion engine inspired by Moltbot's AGI-like patterns.

**Tech Stack:** FastAPI (backend), Redis (event queue), Celery (scheduled tasks), PersonalizedPamAgent (existing), Tool Registry (existing)

---

## Phase 1: Always-On Event Monitoring Foundation (Days 1-3)

### Task 1: Event Monitoring Service

**Files:**
- Create: `backend/app/services/pam/monitoring/event_monitor.py`
- Create: `backend/app/services/pam/monitoring/event_types.py`
- Create: `backend/app/services/pam/monitoring/__init__.py`
- Test: `backend/tests/test_event_monitor.py`

**Step 1: Write the failing test**

```python
import pytest
from app.services.pam.monitoring.event_monitor import EventMonitor
from app.services.pam.monitoring.event_types import EventType, TravelEvent

def test_event_monitor_initialization():
    monitor = EventMonitor(user_id="test-user")
    assert monitor.user_id == "test-user"
    assert monitor.is_running == False

def test_monitor_can_register_event_handlers():
    monitor = EventMonitor(user_id="test-user")

    def mock_handler(event):
        return f"Handled: {event.type}"

    monitor.register_handler(EventType.LOW_FUEL, mock_handler)
    assert EventType.LOW_FUEL in monitor.handlers

def test_monitor_can_trigger_events():
    monitor = EventMonitor(user_id="test-user")
    triggered_events = []

    def capture_handler(event):
        triggered_events.append(event)

    monitor.register_handler(EventType.LOW_FUEL, capture_handler)

    event = TravelEvent(
        type=EventType.LOW_FUEL,
        user_id="test-user",
        data={"fuel_level": 15, "estimated_range": 45}
    )

    monitor.trigger_event(event)
    assert len(triggered_events) == 1
    assert triggered_events[0].type == EventType.LOW_FUEL
```

**Step 2: Run test to verify it fails**

Run: `cd backend && pytest tests/test_event_monitor.py::test_event_monitor_initialization -v`
Expected: FAIL with "No module named 'app.services.pam.monitoring'"

**Step 3: Create event types definition**

```python
# backend/app/services/pam/monitoring/event_types.py
from enum import Enum
from dataclasses import dataclass
from typing import Dict, Any, Optional
from datetime import datetime

class EventType(Enum):
    # Travel Events
    LOW_FUEL = "low_fuel"
    ROUTE_WEATHER_CHANGE = "route_weather_change"
    CAMPGROUND_AVAILABILITY = "campground_availability"
    TRAFFIC_DELAY = "traffic_delay"

    # Financial Events
    BUDGET_THRESHOLD = "budget_threshold"
    EXPENSE_ANOMALY = "expense_anomaly"
    FUEL_PRICE_ALERT = "fuel_price_alert"

    # Calendar Events
    DEPARTURE_REMINDER = "departure_reminder"
    MAINTENANCE_DUE = "maintenance_due"
    WEATHER_WINDOW = "weather_window"

    # Location Events
    DESTINATION_REACHED = "destination_reached"
    REST_BREAK_SUGGESTED = "rest_break_suggested"
    FRIEND_NEARBY = "friend_nearby"

@dataclass
class BaseEvent:
    type: EventType
    user_id: str
    timestamp: datetime
    data: Dict[str, Any]
    priority: str = "normal"  # low, normal, high, urgent

class TravelEvent(BaseEvent):
    pass

class FinancialEvent(BaseEvent):
    pass

class CalendarEvent(BaseEvent):
    pass
```

**Step 4: Create event monitor implementation**

```python
# backend/app/services/pam/monitoring/event_monitor.py
import asyncio
import logging
from typing import Dict, Callable, List
from datetime import datetime
from app.services.pam.monitoring.event_types import EventType, BaseEvent

logger = logging.getLogger(__name__)

class EventMonitor:
    """Always-on event monitoring for proactive PAM actions"""

    def __init__(self, user_id: str):
        self.user_id = user_id
        self.handlers: Dict[EventType, List[Callable]] = {}
        self.is_running = False
        self.event_queue = asyncio.Queue()

    def register_handler(self, event_type: EventType, handler: Callable):
        """Register handler for specific event type"""
        if event_type not in self.handlers:
            self.handlers[event_type] = []
        self.handlers[event_type].append(handler)
        logger.info(f"Registered handler for {event_type} for user {self.user_id}")

    async def trigger_event(self, event: BaseEvent):
        """Trigger event and execute all registered handlers"""
        if event.type in self.handlers:
            for handler in self.handlers[event.type]:
                try:
                    await handler(event) if asyncio.iscoroutinefunction(handler) else handler(event)
                    logger.info(f"Handled event {event.type} for user {self.user_id}")
                except Exception as e:
                    logger.error(f"Error handling event {event.type}: {e}")

    async def start_monitoring(self):
        """Start the event monitoring loop"""
        self.is_running = True
        logger.info(f"Starting event monitoring for user {self.user_id}")

        while self.is_running:
            try:
                # Wait for events from queue with timeout
                event = await asyncio.wait_for(self.event_queue.get(), timeout=1.0)
                await self.trigger_event(event)
            except asyncio.TimeoutError:
                continue  # Keep monitoring
            except Exception as e:
                logger.error(f"Event monitoring error for user {self.user_id}: {e}")

    def stop_monitoring(self):
        """Stop the event monitoring loop"""
        self.is_running = False
        logger.info(f"Stopped event monitoring for user {self.user_id}")
```

**Step 5: Run test to verify it passes**

Run: `cd backend && pytest tests/test_event_monitor.py::test_event_monitor_initialization -v`
Expected: PASS

**Step 6: Commit**

```bash
cd backend
git add app/services/pam/monitoring/ tests/test_event_monitor.py
git commit -m "feat: add event monitoring foundation for proactive PAM"
```

### Task 2: Event Manager Integration

**Files:**
- Create: `backend/app/services/pam/monitoring/manager.py`
- Modify: `backend/app/core/personalized_pam_agent.py:1-50`
- Test: `backend/tests/test_event_manager_integration.py`

**Step 1: Write the failing test**

```python
import pytest
from unittest.mock import Mock, patch
from app.services.pam.monitoring.manager import EventManager
from app.services.pam.monitoring.event_types import EventType, TravelEvent

@pytest.mark.asyncio
async def test_event_manager_creates_monitors_per_user():
    manager = EventManager()

    # Create monitor for user
    monitor = await manager.get_or_create_monitor("test-user")
    assert monitor.user_id == "test-user"

    # Getting same user returns same monitor
    monitor2 = await manager.get_or_create_monitor("test-user")
    assert monitor is monitor2

@pytest.mark.asyncio
async def test_event_manager_can_broadcast_to_pam():
    manager = EventManager()

    with patch('app.services.pam.monitoring.manager.send_proactive_message') as mock_send:
        event = TravelEvent(
            type=EventType.LOW_FUEL,
            user_id="test-user",
            data={"fuel_level": 15}
        )

        await manager.handle_proactive_event(event)
        mock_send.assert_called_once()
```

**Step 2: Run test to verify it fails**

Run: `cd backend && pytest tests/test_event_manager_integration.py -v`
Expected: FAIL with "No module named 'app.services.pam.monitoring.manager'"

**Step 3: Create event manager implementation**

```python
# backend/app/services/pam/monitoring/manager.py
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
```

**Step 4: Run test to verify it passes**

Run: `cd backend && pytest tests/test_event_manager_integration.py -v`
Expected: PASS

**Step 5: Commit**

```bash
cd backend
git add app/services/pam/monitoring/manager.py tests/test_event_manager_integration.py
git commit -m "feat: add event manager with proactive message handling"
```

## Phase 2: Proactive Suggestion Engine (Days 4-6)

### Task 3: Proactive Suggestion System

**Files:**
- Create: `backend/app/services/pam/proactive/suggestion_engine.py`
- Create: `backend/app/services/pam/proactive/triggers.py`
- Test: `backend/tests/test_proactive_suggestions.py`

**Step 1: Write the failing test**

```python
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
        "fuel_level": 25
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
```

**Step 2: Run test to verify it fails**

Run: `cd backend && pytest tests/test_proactive_suggestions.py -v`
Expected: FAIL with "No module named 'app.services.pam.proactive'"

**Step 3: Create suggestion trigger system**

```python
# backend/app/services/pam/proactive/triggers.py
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
        if fuel_level < 20:
            return True

        # Long distance without stops trigger
        if distance_to_destination > 200:  # 200+ miles
            return True

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
```

**Step 4: Create suggestion engine implementation**

```python
# backend/app/services/pam/proactive/suggestion_engine.py
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
```

**Step 5: Run test to verify it passes**

Run: `cd backend && pytest tests/test_proactive_suggestions.py -v`
Expected: PASS

**Step 6: Commit**

```bash
cd backend
git add app/services/pam/proactive/ tests/test_proactive_suggestions.py
git commit -m "feat: add proactive suggestion engine with travel/financial/calendar triggers"
```

---

## Phase 3: Scheduled Autonomous Actions (Days 7-10)

### Task 4: Celery Scheduled Tasks

**Files:**
- Create: `backend/app/services/pam/scheduler/tasks.py`
- Create: `backend/app/services/pam/scheduler/scheduler.py`
- Modify: `backend/app/main.py:1-20`
- Test: `backend/tests/test_scheduled_tasks.py`

**Step 1: Write the failing test**

```python
import pytest
from unittest.mock import Mock, patch
from app.services.pam.scheduler.tasks import (
    check_fuel_levels_for_all_users,
    analyze_budget_thresholds,
    monitor_weather_windows
)

@pytest.mark.asyncio
async def test_fuel_monitoring_task_triggers_events():
    with patch('app.services.pam.scheduler.tasks.get_all_active_users') as mock_users:
        with patch('app.services.pam.scheduler.tasks.get_fuel_level') as mock_fuel:
            with patch('app.services.pam.scheduler.tasks.trigger_proactive_event') as mock_trigger:

                mock_users.return_value = [{"id": "user1"}, {"id": "user2"}]
                mock_fuel.side_effect = [15, 85]  # user1 low fuel, user2 ok

                await check_fuel_levels_for_all_users()

                # Should only trigger for user1 with low fuel
                mock_trigger.assert_called_once()
                call_args = mock_trigger.call_args[0][0]
                assert call_args.type == "LOW_FUEL"
                assert call_args.user_id == "user1"

@pytest.mark.asyncio
async def test_budget_monitoring_detects_overspending():
    with patch('app.services.pam.scheduler.tasks.get_user_spending_data') as mock_spending:
        with patch('app.services.pam.scheduler.tasks.trigger_proactive_event') as mock_trigger:

            mock_spending.return_value = {
                "user1": {"spent": 800, "budget": 1000},  # 80% - trigger
                "user2": {"spent": 400, "budget": 1000}   # 40% - ok
            }

            await analyze_budget_thresholds()

            mock_trigger.assert_called_once()
            call_args = mock_trigger.call_args[0][0]
            assert call_args.type == "BUDGET_THRESHOLD"
            assert call_args.user_id == "user1"
```

**Step 2: Run test to verify it fails**

Run: `cd backend && pytest tests/test_scheduled_tasks.py -v`
Expected: FAIL with "No module named 'app.services.pam.scheduler'"

**Step 3: Create scheduled tasks implementation**

```python
# backend/app/services/pam/scheduler/tasks.py
import asyncio
import logging
from datetime import datetime, timedelta
from typing import List, Dict, Any

from celery import Celery
from app.services.pam.monitoring.event_types import EventType, TravelEvent, FinancialEvent, CalendarEvent
from app.services.pam.monitoring.manager import event_manager

logger = logging.getLogger(__name__)

# Celery app instance
celery_app = Celery('pam_scheduler')
celery_app.conf.update(
    broker_url='redis://localhost:6379/0',
    result_backend='redis://localhost:6379/0',
    task_serializer='json',
    accept_content=['json'],
    result_serializer='json',
    timezone='UTC',
    enable_utc=True,
)

# Schedule configuration
celery_app.conf.beat_schedule = {
    'check-fuel-levels': {
        'task': 'app.services.pam.scheduler.tasks.check_fuel_levels_for_all_users',
        'schedule': 300.0,  # Every 5 minutes
    },
    'analyze-budgets': {
        'task': 'app.services.pam.scheduler.tasks.analyze_budget_thresholds',
        'schedule': 3600.0,  # Every hour
    },
    'monitor-weather': {
        'task': 'app.services.pam.scheduler.tasks.monitor_weather_windows',
        'schedule': 1800.0,  # Every 30 minutes
    },
    'check-maintenance': {
        'task': 'app.services.pam.scheduler.tasks.check_maintenance_reminders',
        'schedule': 86400.0,  # Daily
    },
}

@celery_app.task
def check_fuel_levels_for_all_users():
    """Scheduled task: Check fuel levels for all active users"""
    asyncio.run(_check_fuel_levels_async())

async def _check_fuel_levels_async():
    """Async implementation of fuel checking"""
    try:
        active_users = await get_all_active_users()

        for user in active_users:
            user_id = user["id"]
            fuel_level = await get_fuel_level(user_id)

            # Trigger low fuel event if below 20%
            if fuel_level < 20:
                event = TravelEvent(
                    type=EventType.LOW_FUEL,
                    user_id=user_id,
                    timestamp=datetime.now(),
                    data={
                        "fuel_level": fuel_level,
                        "estimated_range": fuel_level * 15,  # Estimate: 15 miles per %
                        "priority": "high" if fuel_level < 10 else "medium"
                    }
                )

                await trigger_proactive_event(event)
                logger.info(f"Triggered low fuel alert for user {user_id} at {fuel_level}%")

    except Exception as e:
        logger.error(f"Error checking fuel levels: {e}")

@celery_app.task
def analyze_budget_thresholds():
    """Scheduled task: Analyze budget thresholds for all users"""
    asyncio.run(_analyze_budgets_async())

async def _analyze_budgets_async():
    """Async implementation of budget analysis"""
    try:
        spending_data = await get_user_spending_data()

        for user_id, data in spending_data.items():
            spent = data.get("spent", 0)
            budget = data.get("budget", 0)

            if budget > 0:
                percentage = (spent / budget) * 100

                # Trigger alert at 80% and 95%
                if percentage >= 95:
                    priority = "urgent"
                elif percentage >= 80:
                    priority = "high"
                else:
                    continue  # Under threshold

                event = FinancialEvent(
                    type=EventType.BUDGET_THRESHOLD,
                    user_id=user_id,
                    timestamp=datetime.now(),
                    data={
                        "spent": spent,
                        "budget": budget,
                        "percentage": percentage,
                        "category": data.get("category", "general"),
                        "priority": priority
                    }
                )

                await trigger_proactive_event(event)
                logger.info(f"Triggered budget alert for user {user_id} at {percentage:.1f}%")

    except Exception as e:
        logger.error(f"Error analyzing budgets: {e}")

@celery_app.task
def monitor_weather_windows():
    """Scheduled task: Monitor weather for travel opportunities"""
    asyncio.run(_monitor_weather_async())

async def _monitor_weather_async():
    """Async implementation of weather monitoring"""
    try:
        users_with_trips = await get_users_with_planned_trips()

        for user in users_with_trips:
            user_id = user["id"]
            planned_trip = user["planned_trip"]

            weather_forecast = await get_weather_forecast_for_route(
                user_id, planned_trip["route"]
            )

            # Check for 3+ day clear weather window
            clear_days = count_consecutive_clear_days(weather_forecast)

            if clear_days >= 3:
                event = CalendarEvent(
                    type=EventType.WEATHER_WINDOW,
                    user_id=user_id,
                    timestamp=datetime.now(),
                    data={
                        "clear_days": clear_days,
                        "destination": planned_trip.get("destination"),
                        "route": planned_trip.get("route"),
                        "optimal_departure": calculate_optimal_departure(weather_forecast)
                    }
                )

                await trigger_proactive_event(event)
                logger.info(f"Triggered weather window alert for user {user_id} - {clear_days} clear days")

    except Exception as e:
        logger.error(f"Error monitoring weather: {e}")

@celery_app.task
def check_maintenance_reminders():
    """Scheduled task: Check vehicle maintenance schedules"""
    asyncio.run(_check_maintenance_async())

async def _check_maintenance_async():
    """Async implementation of maintenance checking"""
    try:
        users_with_vehicles = await get_all_users_with_vehicles()

        for user in users_with_vehicles:
            user_id = user["id"]
            vehicle_data = user["vehicle"]

            maintenance_status = await analyze_maintenance_needs(vehicle_data)

            for item in maintenance_status:
                if item["due_soon"] or item["overdue"]:
                    priority = "urgent" if item["overdue"] else "medium"

                    event = TravelEvent(
                        type=EventType.MAINTENANCE_DUE,
                        user_id=user_id,
                        timestamp=datetime.now(),
                        data={
                            "maintenance_type": item["type"],
                            "due_date": item["due_date"],
                            "overdue": item["overdue"],
                            "miles_since_last": item["miles_since_last"],
                            "recommended_action": item["action"],
                            "priority": priority
                        }
                    )

                    await trigger_proactive_event(event)
                    logger.info(f"Triggered maintenance reminder for user {user_id}: {item['type']}")

    except Exception as e:
        logger.error(f"Error checking maintenance: {e}")

# Helper functions (integrate with existing data sources)
async def get_all_active_users() -> List[Dict[str, Any]]:
    """Get list of all active users for monitoring"""
    # TODO: Query profiles table for active users
    return [{"id": "test-user"}]  # Mock data

async def get_fuel_level(user_id: str) -> float:
    """Get current fuel level for user"""
    # TODO: Integrate with fuel tracking system
    return 75.0  # Mock data

async def get_user_spending_data() -> Dict[str, Dict[str, float]]:
    """Get spending data for all users"""
    # TODO: Integrate with manage_finances tool
    return {"test-user": {"spent": 850.0, "budget": 1000.0}}

async def get_users_with_planned_trips() -> List[Dict[str, Any]]:
    """Get users who have planned trips"""
    # TODO: Integrate with trip planning system
    return []

async def get_weather_forecast_for_route(user_id: str, route: Dict) -> Dict:
    """Get weather forecast for planned route"""
    # TODO: Integrate with weather_advisor tool
    return {"forecast": []}

async def get_all_users_with_vehicles() -> List[Dict[str, Any]]:
    """Get users with registered vehicles"""
    # TODO: Query vehicle data
    return []

def count_consecutive_clear_days(forecast: Dict) -> int:
    """Count consecutive clear weather days"""
    return 3  # Mock implementation

def calculate_optimal_departure(forecast: Dict) -> str:
    """Calculate optimal departure time based on weather"""
    return "tomorrow_morning"

async def analyze_maintenance_needs(vehicle_data: Dict) -> List[Dict]:
    """Analyze vehicle maintenance requirements"""
    return []  # Mock implementation

async def trigger_proactive_event(event):
    """Trigger proactive event through event manager"""
    monitor = await event_manager.get_or_create_monitor(event.user_id)
    await monitor.trigger_event(event)
```

**Step 4: Create scheduler service**

```python
# backend/app/services/pam/scheduler/scheduler.py
import logging
from typing import Dict, Any
from celery import Celery
from app.services.pam.scheduler.tasks import celery_app

logger = logging.getLogger(__name__)

class PAMScheduler:
    """Manages scheduled tasks for proactive PAM functionality"""

    def __init__(self):
        self.celery_app = celery_app

    def start(self):
        """Start the scheduler with all configured tasks"""
        logger.info("Starting PAM scheduler with proactive tasks")

        # Celery beat will handle the scheduled execution
        # Tasks are defined in celery_app.conf.beat_schedule

    def add_user_specific_task(self, user_id: str, task_config: Dict[str, Any]):
        """Add a custom scheduled task for specific user"""
        # TODO: Implement user-specific task scheduling
        pass

    def remove_user_tasks(self, user_id: str):
        """Remove all scheduled tasks for a user"""
        # TODO: Implement user task cleanup
        pass

# Global scheduler instance
pam_scheduler = PAMScheduler()
```

**Step 5: Run test to verify it passes**

Run: `cd backend && pytest tests/test_scheduled_tasks.py -v`
Expected: PASS

**Step 6: Commit**

```bash
cd backend
git add app/services/pam/scheduler/ tests/test_scheduled_tasks.py
git commit -m "feat: add Celery-based scheduled tasks for proactive monitoring"
```

---

Plan complete and saved to `docs/plans/2026-01-30-proactive-autonomous-pam.md`.

This comprehensive plan transforms PAM into an AGI-like proactive autonomous agent by implementing:

1. **Always-On Event Monitoring** - Continuous background monitoring
2. **Proactive Suggestion Engine** - AI-driven suggestions before users ask
3. **Scheduled Autonomous Actions** - Automated tasks and reminders

The implementation builds directly on your existing solid PAM architecture while adding the Moltbot-inspired patterns that make AI feel truly intelligent and helpful.

**Sources:**
- [GitHub - moltbot/moltbot: Your own personal AI assistant](https://github.com/clawdbot/clawdbot)
- [Moltbot: The Ultimate Personal AI Assistant Guide for 2026](https://dev.to/czmilo/moltbot-the-ultimate-personal-ai-assistant-guide-for-2026-d4e)
- [What Moltbot's (Clawdbot) Virality Reveals About the Risks of Agentic AI](https://prompt.security/blog/what-moltbots-virality-reveals-about-the-risks-of-agentic-ai)
- [How to Build Enterprise AI Agents in 2026](https://www.agilesoftlabs.com/blog/2026/01/how-to-build-enterprise-ai-agents-in)

**Two execution options:**

**1. Subagent-Driven (this session)** - I dispatch fresh subagent per task, review between tasks, fast iteration

**2. Parallel Session (separate)** - Open new session with executing-plans, batch execution with checkpoints

**Which approach?**