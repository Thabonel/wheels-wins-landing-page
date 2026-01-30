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