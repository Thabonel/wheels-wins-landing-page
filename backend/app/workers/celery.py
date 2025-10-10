
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
        "app.workers.tasks.notification_tasks"
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
    
    # Worker settings
    worker_prefetch_multiplier=1,
    task_acks_late=True,
    worker_max_tasks_per_child=1000,
    
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
    },
    beat_schedule_filename="celerybeat-schedule",
)

# Error handling
@celery_app.task(bind=True)
def debug_task(self):
    logger.info(f"Request: {self.request!r}")

if __name__ == "__main__":
    celery_app.start()
