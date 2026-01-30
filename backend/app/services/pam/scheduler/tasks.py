import asyncio
import logging
from datetime import datetime, timedelta
from typing import List, Dict, Any

from celery import Celery
from app.services.pam.monitoring.event_types import EventType, TravelEvent, FinancialEvent, CalendarEvent
from app.services.pam.monitoring.manager import event_manager
from app.services.pam.proactive.data_integration import proactive_data

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

async def check_fuel_levels_for_all_users():
    """Async version for direct calling (tests, etc.)"""
    return await _check_fuel_levels_async()

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

async def analyze_budget_thresholds():
    """Async version for direct calling (tests, etc.)"""
    return await _analyze_budgets_async()

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

async def monitor_weather_windows():
    """Async version for direct calling (tests, etc.)"""
    return await _monitor_weather_async()

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

# Helper functions using real data integration
async def get_all_active_users() -> List[Dict[str, Any]]:
    """Get list of all active users for monitoring"""
    return await proactive_data.get_all_active_users()

async def get_fuel_level(user_id: str) -> float:
    """Get current fuel level for user"""
    return await proactive_data.get_fuel_level(user_id)

async def get_user_spending_data() -> Dict[str, Dict[str, float]]:
    """Get spending data for all users"""
    return await proactive_data.get_user_spending_data()

async def get_users_with_planned_trips() -> List[Dict[str, Any]]:
    """Get users who have planned trips"""
    return await proactive_data.get_users_with_planned_trips()

async def get_weather_forecast_for_route(user_id: str, route: Dict) -> Dict:
    """Get weather forecast for planned route"""
    try:
        # Extract location from route data
        destination = route.get("destination")
        if destination:
            weather_result = await proactive_data.get_weather_forecast(location=destination, user_id=user_id)
            return weather_result
        else:
            return {"forecast": [], "error": "No destination in route"}
    except Exception as e:
        logger.error(f"Error getting weather forecast for route: {e}")
        return {"forecast": [], "error": str(e)}

async def get_all_users_with_vehicles() -> List[Dict[str, Any]]:
    """Get users with registered vehicles"""
    return await proactive_data.get_all_users_with_vehicles()

def count_consecutive_clear_days(forecast: Dict) -> int:
    """Count consecutive clear weather days"""
    try:
        forecast_list = forecast.get("forecast", [])
        if not forecast_list:
            return 0

        consecutive_clear = 0
        max_consecutive = 0

        for day in forecast_list:
            conditions = day.get("conditions", "").lower()
            if any(word in conditions for word in ["clear", "sunny", "fair"]):
                consecutive_clear += 1
                max_consecutive = max(max_consecutive, consecutive_clear)
            else:
                consecutive_clear = 0

        return max_consecutive
    except Exception as e:
        logger.error(f"Error counting clear days: {e}")
        return 0

def calculate_optimal_departure(forecast: Dict) -> str:
    """Calculate optimal departure time based on weather"""
    try:
        forecast_list = forecast.get("forecast", [])
        if not forecast_list:
            return "conditions_unknown"

        # Find first day with good conditions
        for i, day in enumerate(forecast_list):
            conditions = day.get("conditions", "").lower()
            if any(word in conditions for word in ["clear", "sunny", "fair"]):
                if i == 0:
                    return "today"
                elif i == 1:
                    return "tomorrow_morning"
                else:
                    return f"in_{i}_days"

        return "wait_for_better_weather"
    except Exception as e:
        logger.error(f"Error calculating optimal departure: {e}")
        return "conditions_unknown"

async def analyze_maintenance_needs(vehicle_data: Dict) -> List[Dict]:
    """Analyze vehicle maintenance requirements"""
    return await proactive_data.analyze_maintenance_needs(vehicle_data)

async def trigger_proactive_event(event):
    """Trigger proactive event through event manager"""
    monitor = await event_manager.get_or_create_monitor(event.user_id)
    await monitor.trigger_event(event)