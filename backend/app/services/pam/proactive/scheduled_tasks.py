"""
Scheduled Tasks for Proactive PAM System

Enhanced scheduled tasks using real database integration for:
- User monitoring and context analysis
- Proactive suggestion generation
- Fleet maintenance tracking
- Financial pattern analysis
- Travel planning assistance

Uses Celery for distributed task processing with real database queries.
"""

import asyncio
import logging
from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta
from celery import Celery
from celery.schedules import crontab

from app.services.pam.proactive.data_integration import (
    get_proactive_data,
    get_active_users_for_monitoring,
    get_batch_user_data,
    get_comprehensive_user_context
)
from app.services.pam.proactive.suggestion_engine import ProactiveSuggestionEngine
from app.agents.proactive.background_tasks import BackgroundTaskManager, TaskPriority
from app.core.logging import get_logger

logger = get_logger(__name__)


class ProactiveScheduledTasks:
    """
    Manages scheduled tasks for the proactive PAM system

    Uses real database integration to monitor users and generate
    intelligent proactive suggestions based on their actual data.
    """

    def __init__(self, celery_app: Optional[Celery] = None):
        self.celery_app = celery_app
        self.task_manager = BackgroundTaskManager(celery_app)
        self.data_integrator = None

    async def initialize(self):
        """Initialize the scheduled tasks system"""
        try:
            self.data_integrator = await get_proactive_data()
            logger.info("Proactive scheduled tasks initialized successfully")
        except Exception as e:
            logger.error(f"Failed to initialize scheduled tasks: {e}")
            raise

    # =============================================================================
    # USER MONITORING TASKS (Every 15 minutes)
    # =============================================================================

    async def monitor_user_context(self):
        """
        Monitor active users for proactive opportunities

        Runs every 15 minutes to check for:
        - Low fuel levels
        - Budget overruns
        - Upcoming travel events
        - Maintenance needs
        """
        logger.info("Starting user context monitoring")

        try:
            # Get users who should be actively monitored
            active_users = await get_active_users_for_monitoring(limit=50)

            if not active_users:
                logger.info("No active users to monitor")
                return

            logger.info(f"Monitoring {len(active_users)} active users")

            # Process users in batches for efficiency
            batch_size = 10
            for i in range(0, len(active_users), batch_size):
                batch = active_users[i:i + batch_size]
                await self._process_user_batch_monitoring(batch)

            logger.info("User context monitoring completed successfully")

        except Exception as e:
            logger.error(f"Error in user context monitoring: {e}")
            raise

    async def _process_user_batch_monitoring(self, user_batch: List[Dict[str, Any]]):
        """Process a batch of users for monitoring"""
        try:
            user_ids = [user["id"] for user in user_batch]

            # Get comprehensive context for all users in batch
            batch_contexts = await asyncio.gather(
                *[get_comprehensive_user_context(user_id) for user_id in user_ids],
                return_exceptions=True
            )

            # Analyze each user's context
            for user, context in zip(user_batch, batch_contexts):
                if isinstance(context, Exception):
                    logger.warning(f"Failed to get context for user {user['id']}: {context}")
                    continue

                await self._analyze_user_context(user["id"], context)

        except Exception as e:
            logger.error(f"Error processing user batch: {e}")

    async def _analyze_user_context(self, user_id: str, context: Dict[str, Any]):
        """Analyze individual user context for proactive opportunities"""
        try:
            urgent_suggestions = []
            medium_suggestions = []

            # Check fuel level
            fuel_level = context.get("travel", {}).get("fuel_level", 75)
            if fuel_level < 25:
                urgent_suggestions.append({
                    "type": "fuel_low",
                    "priority": "urgent",
                    "message": f"Fuel level is critically low ({fuel_level:.0f}%)",
                    "action": "find_gas_stations"
                })
            elif fuel_level < 50:
                medium_suggestions.append({
                    "type": "fuel_medium",
                    "priority": "medium",
                    "message": f"Fuel level is getting low ({fuel_level:.0f}%)",
                    "action": "plan_fuel_stop"
                })

            # Check budget usage
            financial = context.get("financial", {})
            budget_utilization = financial.get("budget_utilization", 0)
            if budget_utilization > 90:
                urgent_suggestions.append({
                    "type": "budget_exceeded",
                    "priority": "urgent",
                    "message": f"Monthly budget {budget_utilization:.0f}% utilized",
                    "action": "review_expenses"
                })
            elif budget_utilization > 75:
                medium_suggestions.append({
                    "type": "budget_warning",
                    "priority": "medium",
                    "message": f"Monthly budget {budget_utilization:.0f}% utilized",
                    "action": "monitor_spending"
                })

            # Check upcoming travel events
            upcoming_events = context.get("calendar", {}).get("upcoming_events", [])
            travel_events = [e for e in upcoming_events if e.get("requires_travel")]

            for event in travel_events:
                if event.get("planning_priority", 0) > 80:
                    urgent_suggestions.append({
                        "type": "travel_planning",
                        "priority": "urgent",
                        "message": f"Travel event '{event['title']}' needs immediate planning",
                        "action": "plan_travel",
                        "event_data": event
                    })

            # Check maintenance status
            maintenance = context.get("maintenance", {})
            health_score = maintenance.get("health_score", 100)
            overdue_maintenance = maintenance.get("overdue_maintenance", [])

            if overdue_maintenance:
                urgent_suggestions.append({
                    "type": "maintenance_overdue",
                    "priority": "urgent",
                    "message": f"{len(overdue_maintenance)} maintenance items are overdue",
                    "action": "schedule_maintenance",
                    "maintenance_items": overdue_maintenance
                })
            elif health_score < 70:
                medium_suggestions.append({
                    "type": "maintenance_needed",
                    "priority": "medium",
                    "message": f"Vehicle health score is {health_score}/100",
                    "action": "review_maintenance"
                })

            # Submit urgent suggestions immediately
            for suggestion in urgent_suggestions:
                await self.task_manager.submit_task(
                    name=f"Urgent Proactive Suggestion - {suggestion['type']}",
                    task_type="send_proactive_suggestion",
                    data={
                        "user_id": user_id,
                        "suggestion": suggestion,
                        "context_summary": self._create_context_summary(context)
                    },
                    priority=TaskPriority.HIGH,
                    user_id=user_id
                )

            # Submit medium priority suggestions with delay
            for suggestion in medium_suggestions:
                await self.task_manager.submit_task(
                    name=f"Proactive Suggestion - {suggestion['type']}",
                    task_type="send_proactive_suggestion",
                    data={
                        "user_id": user_id,
                        "suggestion": suggestion,
                        "context_summary": self._create_context_summary(context)
                    },
                    priority=TaskPriority.MEDIUM,
                    user_id=user_id,
                    scheduled_for=datetime.now() + timedelta(minutes=30)  # Delay medium priority
                )

            if urgent_suggestions or medium_suggestions:
                logger.info(f"Generated {len(urgent_suggestions + medium_suggestions)} suggestions for user {user_id}")

        except Exception as e:
            logger.error(f"Error analyzing context for user {user_id}: {e}")

    def _create_context_summary(self, context: Dict[str, Any]) -> Dict[str, Any]:
        """Create a concise context summary for suggestions"""
        return {
            "fuel_level": context.get("travel", {}).get("fuel_level"),
            "budget_utilization": context.get("financial", {}).get("budget_utilization"),
            "upcoming_travel_events": len([
                e for e in context.get("calendar", {}).get("upcoming_events", [])
                if e.get("requires_travel")
            ]),
            "maintenance_health": context.get("maintenance", {}).get("health_score"),
            "data_quality": context.get("data_quality", {}),
            "timestamp": datetime.now().isoformat()
        }

    # =============================================================================
    # PATTERN ANALYSIS TASKS (Every 2 hours)
    # =============================================================================

    async def analyze_user_patterns(self):
        """
        Analyze user patterns for predictive insights

        Runs every 2 hours to analyze:
        - Spending patterns and trends
        - Travel behavior and preferences
        - Fuel consumption patterns
        - Maintenance scheduling patterns
        """
        logger.info("Starting user pattern analysis")

        try:
            data_integrator = await get_proactive_data()

            # Get all users with recent activity
            active_users = await get_active_users_for_monitoring(limit=200)

            if not active_users:
                logger.info("No users to analyze patterns for")
                return

            # Analyze patterns in batches
            batch_size = 20
            for i in range(0, len(active_users), batch_size):
                batch = active_users[i:i + batch_size]
                await self._analyze_patterns_batch(batch)

            logger.info("User pattern analysis completed")

        except Exception as e:
            logger.error(f"Error in pattern analysis: {e}")
            raise

    async def _analyze_patterns_batch(self, user_batch: List[Dict[str, Any]]):
        """Analyze patterns for a batch of users"""
        try:
            data_integrator = await get_proactive_data()
            user_ids = [user["id"] for user in user_batch]

            # Get spending data for all users in batch
            spending_data = await data_integrator.get_users_spending_data_batch(user_ids)

            for user in user_batch:
                user_id = user["id"]

                # Analyze spending patterns
                expense_patterns = await data_integrator.get_expense_patterns(user_id, days=60)
                travel_patterns = await data_integrator.get_travel_patterns(user_id)

                # Generate pattern-based insights
                pattern_insights = await self._generate_pattern_insights(
                    user_id, expense_patterns, travel_patterns, spending_data.get(user_id, {})
                )

                # Store insights for future use (could save to database)
                if pattern_insights:
                    await self.task_manager.submit_task(
                        name=f"Pattern Insights - {user_id}",
                        task_type="store_pattern_insights",
                        data={
                            "user_id": user_id,
                            "insights": pattern_insights,
                            "analysis_date": datetime.now().isoformat()
                        },
                        priority=TaskPriority.LOW,
                        user_id=user_id
                    )

        except Exception as e:
            logger.error(f"Error analyzing patterns batch: {e}")

    async def _generate_pattern_insights(self, user_id: str, expense_patterns: Dict, travel_patterns: Dict, spending_data: Dict) -> List[Dict[str, Any]]:
        """Generate insights based on user patterns"""
        insights = []

        try:
            # Spending trend insights
            expense_trend = expense_patterns.get("trends", "stable")
            if expense_trend == "increasing":
                insights.append({
                    "type": "spending_increase",
                    "message": "Your spending has been increasing over the past month",
                    "recommendation": "Consider reviewing your budget categories",
                    "confidence": 0.8
                })

            # Travel frequency insights
            travel_frequency = travel_patterns.get("travel_frequency", "low")
            avg_trip_length = travel_patterns.get("avg_trip_length", 0)

            if travel_frequency == "high" and avg_trip_length > 500:
                insights.append({
                    "type": "frequent_long_trips",
                    "message": f"You frequently take long trips (avg {avg_trip_length} miles)",
                    "recommendation": "Consider fuel efficiency upgrades or route optimization",
                    "confidence": 0.9
                })

            # Fuel efficiency insights
            fuel_efficiency = travel_patterns.get("fuel_efficiency", 0)
            if fuel_efficiency > 0 and fuel_efficiency < 15:  # Below average
                insights.append({
                    "type": "low_fuel_efficiency",
                    "message": f"Your vehicle's fuel efficiency is {fuel_efficiency:.1f} MPG",
                    "recommendation": "Consider maintenance check or driving habits review",
                    "confidence": 0.7
                })

            # Budget vs actual spending insights
            spent = spending_data.get("spent", 0)
            budget = spending_data.get("budget", 0)

            if budget > 0 and spent < budget * 0.5:
                insights.append({
                    "type": "under_budget",
                    "message": f"You're significantly under budget this month",
                    "recommendation": "Consider increasing savings or planning a special trip",
                    "confidence": 0.6
                })

            return insights

        except Exception as e:
            logger.error(f"Error generating pattern insights for {user_id}: {e}")
            return []

    # =============================================================================
    # PREDICTIVE RECOMMENDATIONS (4 times daily)
    # =============================================================================

    async def generate_predictive_recommendations(self):
        """
        Generate predictive recommendations based on user data

        Runs 4 times daily at 8 AM, 12 PM, 4 PM, and 8 PM to provide:
        - Fuel stop recommendations before low levels
        - Budget alerts before overspending
        - Travel planning suggestions for upcoming events
        - Maintenance reminders based on usage patterns
        """
        logger.info("Starting predictive recommendations generation")

        try:
            data_integrator = await get_proactive_data()

            # Get users who should receive predictive recommendations
            active_users = await get_active_users_for_monitoring(limit=100)

            # Get users with planned trips (higher priority for recommendations)
            users_with_trips = await data_integrator.get_users_with_planned_trips(days_ahead=14)

            # Combine and deduplicate users
            all_users = {user["id"]: user for user in active_users}
            for trip_user in users_with_trips:
                all_users[trip_user["id"]] = {**all_users.get(trip_user["id"], {}), **trip_user}

            logger.info(f"Generating predictive recommendations for {len(all_users)} users")

            # Process recommendations in batches
            batch_size = 15
            user_list = list(all_users.values())

            for i in range(0, len(user_list), batch_size):
                batch = user_list[i:i + batch_size]
                await self._generate_recommendations_batch(batch)

            logger.info("Predictive recommendations generation completed")

        except Exception as e:
            logger.error(f"Error generating predictive recommendations: {e}")
            raise

    async def _generate_recommendations_batch(self, user_batch: List[Dict[str, Any]]):
        """Generate recommendations for a batch of users"""
        try:
            for user in user_batch:
                user_id = user["id"]

                # Get comprehensive user context
                context = await get_comprehensive_user_context(user_id)

                # Use the suggestion engine to generate recommendations
                suggestion_engine = ProactiveSuggestionEngine(user_id)
                suggestions = await suggestion_engine.analyze_and_suggest(context)

                # Submit high-priority suggestions immediately
                for suggestion in suggestions:
                    if suggestion.priority in ["urgent", "high"]:
                        await self.task_manager.submit_task(
                            name=f"Predictive Recommendation - {suggestion.type}",
                            task_type="send_proactive_suggestion",
                            data={
                                "user_id": user_id,
                                "suggestion": {
                                    "type": suggestion.type,
                                    "priority": suggestion.priority,
                                    "message": suggestion.message,
                                    "actions": suggestion.actions,
                                    "data": suggestion.data
                                },
                                "is_predictive": True,
                                "generation_time": datetime.now().isoformat()
                            },
                            priority=TaskPriority.HIGH if suggestion.priority == "urgent" else TaskPriority.MEDIUM,
                            user_id=user_id
                        )

        except Exception as e:
            logger.error(f"Error generating recommendations batch: {e}")

    # =============================================================================
    # MAINTENANCE MONITORING (Every 6 hours)
    # =============================================================================

    async def monitor_fleet_maintenance(self):
        """
        Monitor maintenance needs across all user vehicles

        Runs every 6 hours to:
        - Check for overdue maintenance
        - Predict upcoming maintenance needs
        - Generate fleet-wide maintenance insights
        - Alert users about critical maintenance issues
        """
        logger.info("Starting fleet maintenance monitoring")

        try:
            data_integrator = await get_proactive_data()

            # Get comprehensive fleet analysis
            fleet_analysis = await data_integrator.analyze_fleet_maintenance_needs()
            users_needing_maintenance = await data_integrator.get_users_needing_maintenance()

            logger.info(f"Fleet analysis: {fleet_analysis['vehicles_needing_maintenance']}/{fleet_analysis['total_vehicles']} vehicles need maintenance")

            # Process urgent maintenance cases first
            urgent_maintenance_users = [
                user for user in users_needing_maintenance
                if user.get("urgency") == "high"
            ]

            for user in urgent_maintenance_users:
                await self._process_urgent_maintenance(user)

            # Schedule maintenance reminders for medium priority cases
            medium_maintenance_users = [
                user for user in users_needing_maintenance
                if user.get("urgency") == "medium"
            ]

            for user in medium_maintenance_users:
                await self._schedule_maintenance_reminder(user)

            # Generate fleet-wide insights if needed
            if fleet_analysis["vehicles_needing_maintenance"] > 10:
                await self._generate_fleet_insights(fleet_analysis)

            logger.info("Fleet maintenance monitoring completed")

        except Exception as e:
            logger.error(f"Error in fleet maintenance monitoring: {e}")
            raise

    async def _process_urgent_maintenance(self, user: Dict[str, Any]):
        """Process urgent maintenance needs"""
        try:
            user_id = user["id"]
            maintenance_status = user["maintenance_status"]

            # Create urgent maintenance alert
            await self.task_manager.submit_task(
                name=f"Urgent Maintenance Alert - {user_id}",
                task_type="send_proactive_suggestion",
                data={
                    "user_id": user_id,
                    "suggestion": {
                        "type": "urgent_maintenance",
                        "priority": "urgent",
                        "message": f"Critical maintenance needed - {len(maintenance_status.get('overdue_maintenance', []))} overdue items",
                        "actions": ["schedule_maintenance", "view_maintenance_details"],
                        "data": {
                            "overdue_items": maintenance_status.get("overdue_maintenance", []),
                            "health_score": maintenance_status.get("health_score", 0),
                            "vehicle_info": user.get("vehicle", {})
                        }
                    },
                    "is_maintenance_alert": True
                },
                priority=TaskPriority.CRITICAL,
                user_id=user_id
            )

        except Exception as e:
            logger.error(f"Error processing urgent maintenance for user {user.get('id')}: {e}")

    async def _schedule_maintenance_reminder(self, user: Dict[str, Any]):
        """Schedule maintenance reminder for medium priority cases"""
        try:
            user_id = user["id"]
            maintenance_status = user["maintenance_status"]

            # Schedule reminder for next week
            reminder_time = datetime.now() + timedelta(days=7)

            await self.task_manager.submit_task(
                name=f"Maintenance Reminder - {user_id}",
                task_type="send_proactive_suggestion",
                data={
                    "user_id": user_id,
                    "suggestion": {
                        "type": "maintenance_reminder",
                        "priority": "medium",
                        "message": f"Vehicle maintenance recommended - Health score: {maintenance_status.get('health_score', 100)}/100",
                        "actions": ["review_maintenance", "schedule_appointment"],
                        "data": {
                            "upcoming_items": maintenance_status.get("upcoming_maintenance", []),
                            "health_score": maintenance_status.get("health_score", 100),
                            "recommendation_type": "preventive"
                        }
                    },
                    "is_scheduled_reminder": True
                },
                priority=TaskPriority.MEDIUM,
                user_id=user_id,
                scheduled_for=reminder_time
            )

        except Exception as e:
            logger.error(f"Error scheduling maintenance reminder for user {user.get('id')}: {e}")

    async def _generate_fleet_insights(self, fleet_analysis: Dict[str, Any]):
        """Generate fleet-wide maintenance insights"""
        try:
            # Submit fleet analysis task for admin review
            await self.task_manager.submit_task(
                name="Fleet Maintenance Analysis",
                task_type="generate_fleet_report",
                data={
                    "analysis": fleet_analysis,
                    "generated_at": datetime.now().isoformat(),
                    "report_type": "maintenance_overview"
                },
                priority=TaskPriority.LOW
            )

            logger.info("Generated fleet maintenance insights")

        except Exception as e:
            logger.error(f"Error generating fleet insights: {e}")

    # =============================================================================
    # SYSTEM HEALTH AND CLEANUP (Daily at 2 AM)
    # =============================================================================

    async def cleanup_and_health_check(self):
        """
        Daily cleanup and health monitoring

        Runs daily at 2 AM to:
        - Clean up old cached data
        - Monitor system performance
        - Cleanup completed tasks
        - Generate health reports
        """
        logger.info("Starting daily cleanup and health check")

        try:
            data_integrator = await get_proactive_data()

            # Clear old cached data
            await data_integrator.clear_cache()
            logger.info("Cleared cached data")

            # Cleanup old tasks
            await self.task_manager.cleanup_old_tasks(older_than_days=7)
            logger.info("Cleaned up old tasks")

            # Get system health metrics
            health_status = await data_integrator.health_check()
            system_health = await self.task_manager.get_system_health()
            performance_metrics = await data_integrator.get_performance_metrics()

            # Generate health report
            health_report = {
                "data_integration": health_status,
                "task_system": system_health,
                "performance": performance_metrics,
                "timestamp": datetime.now().isoformat()
            }

            # Submit health report
            await self.task_manager.submit_task(
                name="Daily System Health Report",
                task_type="generate_health_report",
                data=health_report,
                priority=TaskPriority.LOW
            )

            # Log summary
            logger.info(f"Daily health check completed - Status: {health_status.get('status', 'unknown')}")

        except Exception as e:
            logger.error(f"Error in daily cleanup and health check: {e}")
            raise


# =============================================================================
# CELERY TASK REGISTRATION
# =============================================================================

def register_celery_tasks(celery_app: Celery):
    """Register scheduled tasks with Celery"""

    scheduled_tasks = ProactiveScheduledTasks(celery_app)

    @celery_app.task(name="pam.proactive.monitor_user_context")
    async def monitor_user_context_task():
        await scheduled_tasks.initialize()
        return await scheduled_tasks.monitor_user_context()

    @celery_app.task(name="pam.proactive.analyze_user_patterns")
    async def analyze_user_patterns_task():
        await scheduled_tasks.initialize()
        return await scheduled_tasks.analyze_user_patterns()

    @celery_app.task(name="pam.proactive.generate_predictive_recommendations")
    async def generate_predictive_recommendations_task():
        await scheduled_tasks.initialize()
        return await scheduled_tasks.generate_predictive_recommendations()

    @celery_app.task(name="pam.proactive.monitor_fleet_maintenance")
    async def monitor_fleet_maintenance_task():
        await scheduled_tasks.initialize()
        return await scheduled_tasks.monitor_fleet_maintenance()

    @celery_app.task(name="pam.proactive.cleanup_and_health_check")
    async def cleanup_and_health_check_task():
        await scheduled_tasks.initialize()
        return await scheduled_tasks.cleanup_and_health_check()

    # Set up beat schedule
    celery_app.conf.beat_schedule = {
        'monitor-user-context': {
            'task': 'pam.proactive.monitor_user_context',
            'schedule': crontab(minute='*/15'),  # Every 15 minutes
        },
        'analyze-user-patterns': {
            'task': 'pam.proactive.analyze_user_patterns',
            'schedule': crontab(minute=0, hour='*/2'),  # Every 2 hours
        },
        'generate-predictive-recommendations': {
            'task': 'pam.proactive.generate_predictive_recommendations',
            'schedule': crontab(minute=30, hour='8,12,16,20'),  # 4 times daily
        },
        'monitor-fleet-maintenance': {
            'task': 'pam.proactive.monitor_fleet_maintenance',
            'schedule': crontab(minute=0, hour='*/6'),  # Every 6 hours
        },
        'daily-cleanup-and-health-check': {
            'task': 'pam.proactive.cleanup_and_health_check',
            'schedule': crontab(minute=0, hour=2),  # Daily at 2 AM
        }
    }

    logger.info("Proactive PAM scheduled tasks registered with Celery")


# Global instance
proactive_scheduler = ProactiveScheduledTasks()

# Export main components
__all__ = [
    "ProactiveScheduledTasks",
    "register_celery_tasks",
    "proactive_scheduler"
]