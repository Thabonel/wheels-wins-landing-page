
from celery import Celery
from kombu import Queue
import os
from app.core.config import settings
from app.core.logging import get_logger

logger = get_logger(__name__)

# Create Celery app
celery_app = Celery(
    "pam_backend",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL,
    include=[
        "app.workers.tasks.email_tasks",
        "app.workers.tasks.maintenance_tasks",
        "app.workers.tasks.analytics_tasks",
        "app.workers.tasks.cleanup_tasks",
        "app.workers.tasks.notification_tasks",
        "app.workers.tasks.reset_quotas",
        "app.workers.tasks.timer_tasks",
        "app.workers.tasks.pam_proactive_tasks"
    ]
)

# Celery configuration
celery_app.conf.update(
    # Task routing
    task_routes={
        "app.workers.tasks.email_tasks.*": {"queue": "email"},
        "app.workers.tasks.maintenance_tasks.*": {"queue": "maintenance"},
        "app.workers.tasks.analytics_tasks.*": {"queue": "analytics"},
        "app.workers.tasks.cleanup_tasks.*": {"queue": "cleanup"},
        "app.workers.tasks.notification_tasks.*": {"queue": "notifications"},
        "app.workers.tasks.reset_quotas.*": {"queue": "maintenance"},
        "app.workers.tasks.timer_tasks.*": {"queue": "notifications"},
        "app.workers.tasks.pam_proactive_tasks.*": {"queue": "notifications"},
        "check_timer_expiration": {"queue": "notifications"},
        "cleanup_old_timers": {"queue": "cleanup"},
        "dismiss_timer": {"queue": "notifications"},
    },
    
    # Queue definitions
    task_queues=(
        Queue("email", routing_key="email"),
        Queue("maintenance", routing_key="maintenance"),
        Queue("analytics", routing_key="analytics"),
        Queue("cleanup", routing_key="cleanup"),
        Queue("notifications", routing_key="notifications"),
        Queue("default", routing_key="default"),
    ),
    
    # Task settings
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    
    # Worker settings - Memory optimization configuration
    worker_prefetch_multiplier=1,  # Process one task at a time
    task_acks_late=True,
    worker_max_tasks_per_child=100,  # NEW: Aggressive cleanup, recycle workers every 100 tasks (was 1000)

    # NEW: Additional memory optimizations
    worker_max_memory_per_child=500000,  # 500MB limit per worker (new in Celery 5.0+)
    task_reject_on_worker_lost=True,  # Don't retry on worker memory issues
    worker_disable_rate_limits=False,  # Keep rate limiting for stability

    # NEW: Reduce monitoring overhead
    worker_send_task_events=False,  # Reduce monitoring overhead
    task_send_sent_event=False,  # Reduce event data
    
    # Retry settings
    task_default_retry_delay=60,
    task_max_retries=3,
    
    # Beat schedule for periodic tasks
    beat_schedule={
        "maintenance-check-daily": {
            "task": "app.workers.tasks.maintenance_tasks.check_maintenance_reminders",
            "schedule": 86400.0,  # Daily
        },
        "update-fuel-consumption-daily": {
            "task": "app.workers.tasks.maintenance_tasks.update_vehicle_fuel_consumption_from_fillups",
            "schedule": 86400.0,  # Daily - auto-learn MPG from fillups
        },
        "cleanup-expired-data": {
            "task": "app.workers.tasks.cleanup_tasks.cleanup_expired_data",
            "schedule": 3600.0,  # Hourly
        },
        "process-analytics-hourly": {
            "task": "app.workers.tasks.analytics_tasks.process_hourly_analytics",
            "schedule": 3600.0,  # Hourly
        },
        "send-daily-digest": {
            "task": "app.workers.tasks.notification_tasks.send_daily_digest",
            "schedule": 86400.0,  # Daily at midnight
        },
        "reset-monthly-quotas": {
            "task": "reset_monthly_quotas",
            "schedule": 2592000.0,  # Monthly (30 days)
            # Note: In production, use crontab schedule for 1st of month
            # "schedule": crontab(day_of_month=1, hour=0, minute=0),
        },
        "check-quota-health-daily": {
            "task": "check_quota_health",
            "schedule": 86400.0,  # Daily
        },
        # Timer/Alarm expiration check - runs every 30 seconds
        "check-timer-expiration": {
            "task": "check_timer_expiration",
            "schedule": 30.0,  # Every 30 seconds
        },
        # Timer cleanup - runs daily
        "cleanup-old-timers-daily": {
            "task": "cleanup_old_timers",
            "schedule": 86400.0,  # Daily
        },
        # PAM Proactive Autonomous Agent Tasks
        "pam-fuel-monitoring": {
            "task": "app.workers.tasks.pam_proactive_tasks.check_fuel_levels_for_all_users",
            "schedule": 300.0,  # Every 5 minutes
        },
        "pam-budget-analysis": {
            "task": "app.workers.tasks.pam_proactive_tasks.analyze_budget_thresholds",
            "schedule": 3600.0,  # Every hour
        },
        "pam-weather-monitoring": {
            "task": "app.workers.tasks.pam_proactive_tasks.monitor_weather_windows",
            "schedule": 1800.0,  # Every 30 minutes
        },
        "pam-maintenance-monitoring": {
            "task": "app.workers.tasks.pam_proactive_tasks.check_proactive_maintenance_reminders",
            "schedule": 86400.0,  # Daily
        },
        "pam-context-monitoring": {
            "task": "app.workers.tasks.pam_proactive_tasks.monitor_user_context_changes",
            "schedule": 900.0,  # Every 15 minutes
        },
    },
    beat_schedule_filename="celerybeat-schedule",
)

# Error handling
@celery_app.task(bind=True)
def debug_task(self):
    logger.info(f"Request: {self.request!r}")


# NEW: Memory monitoring task
@celery_app.task(bind=True)
def monitor_worker_memory(self):
    """Monitor and log worker memory usage"""
    import psutil
    import logging

    process = psutil.Process()
    memory_mb = process.memory_info().rss / 1024 / 1024

    logger = logging.getLogger(__name__)
    logger.info(f"Worker {self.request.id} memory usage: {memory_mb:.1f} MB")

    # Force garbage collection if memory high
    if memory_mb > 400:  # 400MB threshold
        import gc
        collected = gc.collect()
        logger.warning(f"Worker memory high ({memory_mb:.1f} MB), forced GC collected {collected} objects")

    return {"memory_mb": memory_mb, "pid": process.pid}

if __name__ == "__main__":
    celery_app.start()
