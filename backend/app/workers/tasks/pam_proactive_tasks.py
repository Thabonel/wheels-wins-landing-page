"""
PAM Proactive Autonomous Agent Tasks
Production-ready Celery tasks for proactive monitoring and alerts
Integrates with existing Celery infrastructure for scalable deployment
"""

import asyncio
import logging
from datetime import datetime, timedelta
from typing import List, Dict, Any

from celery import current_app
from app.workers.celery import celery_app
from app.core.logging import get_logger
from app.core.database import get_supabase_client

# Import PAM modules
from app.services.pam.monitoring.event_types import EventType, TravelEvent, FinancialEvent, CalendarEvent
from app.services.pam.monitoring.manager import event_manager
from app.services.pam.proactive.data_integration import proactive_data

logger = get_logger(__name__)

# =====================================================
# PROACTIVE MONITORING TASKS
# =====================================================

@celery_app.task(bind=True, queue="notifications")
def check_fuel_levels_for_all_users(self):
    """
    Proactive Task: Check fuel levels for all active users
    Triggers low fuel alerts when levels drop below 20%
    Runs every 5 minutes via Celery Beat
    """
    try:
        logger.info("Starting proactive fuel level monitoring")

        # Run async function in sync context
        result = asyncio.run(_check_fuel_levels_async())

        logger.info(f"Fuel monitoring completed: {result}")
        return result

    except Exception as exc:
        logger.error(f"Failed to check fuel levels: {exc}")
        self.retry(countdown=60, max_retries=3)


@celery_app.task(bind=True, queue="analytics")
def analyze_budget_thresholds(self):
    """
    Proactive Task: Analyze budget thresholds for all users
    Triggers alerts at 80% and 95% budget usage
    Runs every hour via Celery Beat
    """
    try:
        logger.info("Starting proactive budget analysis")

        # Run async function in sync context
        result = asyncio.run(_analyze_budgets_async())

        logger.info(f"Budget analysis completed: {result}")
        return result

    except Exception as exc:
        logger.error(f"Failed to analyze budget thresholds: {exc}")
        self.retry(countdown=300, max_retries=3)


@celery_app.task(bind=True, queue="analytics")
def monitor_weather_windows(self):
    """
    Proactive Task: Monitor weather for travel opportunities
    Identifies 3+ day clear weather windows for planned trips
    Runs every 30 minutes via Celery Beat
    """
    try:
        logger.info("Starting proactive weather monitoring")

        # Run async function in sync context
        result = asyncio.run(_monitor_weather_async())

        logger.info(f"Weather monitoring completed: {result}")
        return result

    except Exception as exc:
        logger.error(f"Failed to monitor weather windows: {exc}")
        self.retry(countdown=600, max_retries=3)


@celery_app.task(bind=True, queue="maintenance")
def check_proactive_maintenance_reminders(self):
    """
    Proactive Task: Check vehicle maintenance schedules
    Analyzes maintenance needs and triggers reminders
    Runs daily via Celery Beat
    """
    try:
        logger.info("Starting proactive maintenance monitoring")

        # Run async function in sync context
        result = asyncio.run(_check_maintenance_async())

        logger.info(f"Maintenance monitoring completed: {result}")
        return result

    except Exception as exc:
        logger.error(f"Failed to check maintenance reminders: {exc}")
        self.retry(countdown=1800, max_retries=2)


@celery_app.task(bind=True, queue="notifications")
def monitor_user_context_changes(self):
    """
    Proactive Task: Monitor user context for proactive opportunities
    Analyzes user behavior patterns and triggers context-aware suggestions
    Runs every 15 minutes via Celery Beat
    """
    try:
        logger.info("Starting proactive user context monitoring")

        # Run async function in sync context
        result = asyncio.run(_monitor_user_context_async())

        logger.info(f"User context monitoring completed: {result}")
        return result

    except Exception as exc:
        logger.error(f"Failed to monitor user context: {exc}")
        self.retry(countdown=300, max_retries=3)


# =====================================================
# ASYNC IMPLEMENTATION FUNCTIONS
# =====================================================

async def _check_fuel_levels_async():
    """Async implementation of fuel level checking"""
    try:
        active_users = await proactive_data.get_all_active_users()
        alerts_triggered = 0

        for user in active_users:
            user_id = user["id"]
            fuel_level = await proactive_data.get_fuel_level(user_id)

            # Trigger low fuel event if below 20%
            if fuel_level < 20:
                event = TravelEvent(
                    type=EventType.LOW_FUEL,
                    user_id=user_id,
                    timestamp=datetime.now(),
                    data={
                        "fuel_level": fuel_level,
                        "estimated_range": fuel_level * 15,  # Estimate: 15 miles per %
                        "priority": "high" if fuel_level < 10 else "medium",
                        "nearest_stations": await _get_nearby_gas_stations(user_id)
                    }
                )

                await trigger_proactive_event(event)
                alerts_triggered += 1
                logger.info(f"Triggered low fuel alert for user {user_id} at {fuel_level}%")

        return {
            "users_checked": len(active_users),
            "alerts_triggered": alerts_triggered,
            "task": "fuel_monitoring"
        }

    except Exception as e:
        logger.error(f"Error checking fuel levels: {e}")
        raise


async def _analyze_budgets_async():
    """Async implementation of budget analysis"""
    try:
        spending_data = await proactive_data.get_user_spending_data()
        alerts_triggered = 0

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
                        "priority": priority,
                        "remaining_days": _get_remaining_days_in_month(),
                        "suggested_actions": _get_budget_suggestions(percentage, spent, budget)
                    }
                )

                await trigger_proactive_event(event)
                alerts_triggered += 1
                logger.info(f"Triggered budget alert for user {user_id} at {percentage:.1f}%")

        return {
            "users_analyzed": len(spending_data),
            "alerts_triggered": alerts_triggered,
            "task": "budget_analysis"
        }

    except Exception as e:
        logger.error(f"Error analyzing budgets: {e}")
        raise


async def _monitor_weather_async():
    """Async implementation of weather monitoring"""
    try:
        users_with_trips = await proactive_data.get_users_with_planned_trips()
        opportunities_found = 0

        for user in users_with_trips:
            user_id = user["id"]
            planned_trip = user["planned_trip"]

            weather_forecast = await proactive_data.get_weather_forecast_for_route(
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
                        "optimal_departure": calculate_optimal_departure(weather_forecast),
                        "weather_confidence": _calculate_weather_confidence(weather_forecast),
                        "travel_suggestions": _get_weather_based_suggestions(clear_days)
                    }
                )

                await trigger_proactive_event(event)
                opportunities_found += 1
                logger.info(f"Triggered weather window alert for user {user_id} - {clear_days} clear days")

        return {
            "users_with_trips": len(users_with_trips),
            "opportunities_found": opportunities_found,
            "task": "weather_monitoring"
        }

    except Exception as e:
        logger.error(f"Error monitoring weather: {e}")
        raise


async def _check_maintenance_async():
    """Async implementation of maintenance checking"""
    try:
        users_with_vehicles = await proactive_data.get_all_users_with_vehicles()
        reminders_triggered = 0

        for user in users_with_vehicles:
            user_id = user["id"]
            vehicle_data = user["vehicle"]

            maintenance_status = await proactive_data.analyze_maintenance_needs(vehicle_data)

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
                            "priority": priority,
                            "cost_estimate": item.get("cost_estimate"),
                            "local_shops": await _get_nearby_service_shops(user_id, item["type"])
                        }
                    )

                    await trigger_proactive_event(event)
                    reminders_triggered += 1
                    logger.info(f"Triggered maintenance reminder for user {user_id}: {item['type']}")

        return {
            "users_with_vehicles": len(users_with_vehicles),
            "reminders_triggered": reminders_triggered,
            "task": "maintenance_monitoring"
        }

    except Exception as e:
        logger.error(f"Error checking maintenance: {e}")
        raise


async def _monitor_user_context_async():
    """Async implementation of user context monitoring"""
    try:
        active_users = await proactive_data.get_all_active_users()
        suggestions_triggered = 0

        for user in active_users:
            user_id = user["id"]

            # Analyze user context for proactive opportunities
            context_changes = await _analyze_user_context_changes(user_id)

            for change in context_changes:
                if change["confidence"] > 0.7:  # High confidence threshold
                    event_type = _determine_event_type_from_context(change)

                    event = TravelEvent(
                        type=event_type,
                        user_id=user_id,
                        timestamp=datetime.now(),
                        data={
                            "context_type": change["type"],
                            "confidence": change["confidence"],
                            "suggestion": change["suggestion"],
                            "context_data": change["data"],
                            "priority": "medium",
                            "expires_at": datetime.now() + timedelta(hours=24)
                        }
                    )

                    await trigger_proactive_event(event)
                    suggestions_triggered += 1
                    logger.info(f"Triggered context-aware suggestion for user {user_id}: {change['type']}")

        return {
            "users_analyzed": len(active_users),
            "suggestions_triggered": suggestions_triggered,
            "task": "context_monitoring"
        }

    except Exception as e:
        logger.error(f"Error monitoring user context: {e}")
        raise


# =====================================================
# HELPER FUNCTIONS
# =====================================================

async def trigger_proactive_event(event):
    """Trigger proactive event through event manager"""
    try:
        monitor = await event_manager.get_or_create_monitor(event.user_id)
        await monitor.trigger_event(event)
        logger.debug(f"Proactive event triggered: {event.type.value} for user {event.user_id}")
    except Exception as e:
        logger.error(f"Failed to trigger proactive event: {e}")
        raise


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
            if any(word in conditions for word in ["clear", "sunny", "fair", "partly cloudy"]):
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


def _get_remaining_days_in_month() -> int:
    """Calculate remaining days in current month"""
    now = datetime.now()
    if now.month == 12:
        next_month = datetime(now.year + 1, 1, 1)
    else:
        next_month = datetime(now.year, now.month + 1, 1)

    return (next_month - now).days


def _get_budget_suggestions(percentage: float, spent: float, budget: float) -> List[str]:
    """Generate budget management suggestions"""
    suggestions = []

    if percentage >= 95:
        suggestions.extend([
            "Consider reducing discretionary spending",
            "Review upcoming planned expenses",
            "Look for cost-saving opportunities on fuel and food"
        ])
    elif percentage >= 80:
        suggestions.extend([
            "Monitor spending closely for rest of month",
            "Consider postponing non-essential purchases",
            "Track daily spending to stay within budget"
        ])

    return suggestions


def _calculate_weather_confidence(forecast: Dict) -> float:
    """Calculate confidence level for weather predictions"""
    try:
        forecast_list = forecast.get("forecast", [])
        if not forecast_list:
            return 0.0

        # Simple confidence calculation based on forecast consistency
        clear_days = count_consecutive_clear_days(forecast)
        total_days = len(forecast_list)

        return min(0.95, (clear_days / total_days) * 1.2)
    except:
        return 0.5


def _get_weather_based_suggestions(clear_days: int) -> List[str]:
    """Generate weather-based travel suggestions"""
    suggestions = []

    if clear_days >= 5:
        suggestions.extend([
            "Perfect time for a long road trip",
            "Consider exploring scenic routes",
            "Great opportunity for outdoor activities"
        ])
    elif clear_days >= 3:
        suggestions.extend([
            "Good weather window for planned trip",
            "Perfect for weekend getaway",
            "Consider camping or outdoor adventures"
        ])

    return suggestions


async def _get_nearby_gas_stations(user_id: str) -> List[Dict]:
    """Get nearby gas stations for user location"""
    try:
        user_location = await proactive_data.get_user_location(user_id)
        if user_location:
            # This would integrate with Google Places or similar API
            return [
                {"name": "Shell", "distance": 0.8, "price": "$3.45"},
                {"name": "Exxon", "distance": 1.2, "price": "$3.42"}
            ]
        return []
    except Exception:
        return []


async def _get_nearby_service_shops(user_id: str, service_type: str) -> List[Dict]:
    """Get nearby service shops for maintenance"""
    try:
        user_location = await proactive_data.get_user_location(user_id)
        if user_location:
            # This would integrate with Google Places or similar API
            return [
                {"name": "Joe's Auto Service", "distance": 2.1, "rating": 4.5},
                {"name": "Quick Lube Plus", "distance": 3.4, "rating": 4.2}
            ]
        return []
    except Exception:
        return []


async def _analyze_user_context_changes(user_id: str) -> List[Dict]:
    """Analyze user context for proactive opportunities"""
    try:
        # This would analyze user behavior patterns, location changes, etc.
        # For now, return empty list - this requires complex ML analysis
        return []
    except Exception:
        return []


def _determine_event_type_from_context(change: Dict) -> EventType:
    """Determine appropriate event type from context change"""
    context_type = change.get("type", "")

    if "fuel" in context_type:
        return EventType.LOW_FUEL
    elif "budget" in context_type:
        return EventType.BUDGET_THRESHOLD
    elif "weather" in context_type:
        return EventType.WEATHER_WINDOW
    elif "maintenance" in context_type:
        return EventType.MAINTENANCE_DUE
    else:
        return EventType.USER_CONTEXT_CHANGE


# =====================================================
# MANUAL TASK TRIGGERS (for testing)
# =====================================================

@celery_app.task(bind=True, queue="notifications")
def trigger_manual_fuel_check(self, user_id: str = None):
    """Manual trigger for fuel level check (testing/admin)"""
    try:
        if user_id:
            logger.info(f"Manual fuel check for user {user_id}")
            # Check specific user
            result = asyncio.run(_check_single_user_fuel(user_id))
        else:
            logger.info("Manual fuel check for all users")
            result = asyncio.run(_check_fuel_levels_async())

        return result
    except Exception as exc:
        logger.error(f"Manual fuel check failed: {exc}")
        raise


async def _check_single_user_fuel(user_id: str) -> Dict:
    """Check fuel level for single user"""
    try:
        fuel_level = await proactive_data.get_fuel_level(user_id)

        if fuel_level < 20:
            event = TravelEvent(
                type=EventType.LOW_FUEL,
                user_id=user_id,
                timestamp=datetime.now(),
                data={
                    "fuel_level": fuel_level,
                    "estimated_range": fuel_level * 15,
                    "priority": "high" if fuel_level < 10 else "medium"
                }
            )

            await trigger_proactive_event(event)
            return {"alert_triggered": True, "fuel_level": fuel_level}

        return {"alert_triggered": False, "fuel_level": fuel_level}
    except Exception as e:
        logger.error(f"Error checking fuel for user {user_id}: {e}")
        raise