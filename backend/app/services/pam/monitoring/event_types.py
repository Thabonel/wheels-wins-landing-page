from enum import Enum
from dataclasses import dataclass, field
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

class EventPriority(Enum):
    """Event priority levels for proper handling and ordering"""
    LOW = "low"
    NORMAL = "normal"
    HIGH = "high"
    URGENT = "urgent"

    def __lt__(self, other):
        """Enable priority comparison for queue ordering"""
        if not isinstance(other, EventPriority):
            return NotImplemented
        priority_order = [self.LOW, self.NORMAL, self.HIGH, self.URGENT]
        return priority_order.index(self) < priority_order.index(other)

@dataclass
class BaseEvent:
    type: EventType
    user_id: str
    timestamp: datetime
    data: Dict[str, Any]
    priority: EventPriority = EventPriority.NORMAL

    def __post_init__(self):
        """Validate event data after initialization"""
        if not isinstance(self.type, EventType):
            raise ValueError(f"Invalid event type: {self.type}")
        if not self.user_id or not self.user_id.strip():
            raise ValueError("user_id cannot be empty")
        if not isinstance(self.priority, EventPriority):
            raise ValueError(f"Invalid priority: {self.priority}")
        if not isinstance(self.data, dict):
            raise ValueError("data must be a dictionary")
        if self.timestamp > datetime.now():
            raise ValueError("Event timestamp cannot be in the future")

class TravelEvent(BaseEvent):
    pass

class FinancialEvent(BaseEvent):
    pass

class CalendarEvent(BaseEvent):
    pass