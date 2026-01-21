"""
Timer and Alarm Background Tasks

Celery tasks for checking and triggering expired timers/alarms.
Runs every 30 seconds to check for timers that have expired.
"""

from celery import current_app
from app.workers.celery import celery_app
from app.core.logging import get_logger
from app.core.database import get_supabase_client
from datetime import datetime, timezone
from typing import List, Dict
import httpx
import os

logger = get_logger(__name__)

# Internal API endpoint for triggering WebSocket notifications
# This allows Celery (separate process) to communicate with FastAPI WebSocket
INTERNAL_API_BASE = os.getenv("INTERNAL_API_BASE", "http://localhost:8000")


@celery_app.task(bind=True, name="check_timer_expiration")
def check_timer_expiration(self):
    """
    Check for expired timers and trigger notifications.

    This task runs every 30 seconds via Celery Beat.
    It queries the database for active timers that have expired,
    marks them as triggered, and sends notifications.
    """
    try:
        logger.info("⏰ Checking for expired timers...")
        supabase = get_supabase_client()

        # Get current time in UTC
        now = datetime.now(timezone.utc)

        # Query active timers that have expired
        response = supabase.table("timers_and_alarms").select(
            "id, user_id, type, label, duration_seconds, scheduled_time, created_at"
        ).eq(
            "status", "active"
        ).lte(
            "scheduled_time", now.isoformat()
        ).execute()

        expired_timers = response.data or []

        if not expired_timers:
            logger.debug("⏰ No expired timers found")
            return {"expired_count": 0, "notified_count": 0}

        logger.info(f"⏰ Found {len(expired_timers)} expired timer(s)")

        notified_count = 0
        failed_count = 0

        for timer in expired_timers:
            timer_id = timer["id"]
            user_id = timer["user_id"]
            label = timer.get("label", "Timer")
            timer_type = timer.get("type", "timer")

            try:
                # Mark timer as triggered
                update_response = supabase.table("timers_and_alarms").update({
                    "status": "triggered",
                    "notification_sent": True
                }).eq("id", timer_id).execute()

                if not update_response.data:
                    logger.warning(f"⚠️ Failed to update timer {timer_id}")
                    failed_count += 1
                    continue

                # Send notification via internal API
                notification_sent = _send_timer_notification(
                    user_id=user_id,
                    timer_id=timer_id,
                    label=label,
                    timer_type=timer_type
                )

                if notification_sent:
                    logger.info(f"✅ Timer {timer_id} triggered and notification sent to user {user_id}")
                    notified_count += 1
                else:
                    logger.warning(f"⚠️ Timer {timer_id} triggered but notification failed")
                    failed_count += 1

            except Exception as e:
                logger.error(f"❌ Error processing timer {timer_id}: {e}")
                failed_count += 1

        logger.info(f"⏰ Timer check complete: {notified_count} notified, {failed_count} failed")
        return {
            "expired_count": len(expired_timers),
            "notified_count": notified_count,
            "failed_count": failed_count
        }

    except Exception as exc:
        logger.error(f"❌ Timer expiration check failed: {exc}")
        raise


def _send_timer_notification(
    user_id: str,
    timer_id: str,
    label: str,
    timer_type: str
) -> bool:
    """
    Send timer expiration notification via internal API.

    The internal API endpoint will forward the notification
    to the user's WebSocket connection if they're online.

    Args:
        user_id: User to notify
        timer_id: ID of the expired timer
        label: Timer label for display
        timer_type: 'timer' or 'alarm'

    Returns:
        True if notification was sent successfully
    """
    try:
        # Build notification payload
        notification = {
            "user_id": user_id,
            "timer_id": timer_id,
            "type": "timer_expired",
            "label": label,
            "timer_type": timer_type,
            "message": f"Your {timer_type} '{label}' has finished!",
            "timestamp": datetime.now(timezone.utc).isoformat()
        }

        # Call internal notification endpoint
        # This endpoint will forward to WebSocket if user is connected
        endpoint = f"{INTERNAL_API_BASE}/api/v1/pam/internal/notify-timer"

        with httpx.Client(timeout=10.0) as client:
            response = client.post(
                endpoint,
                json=notification,
                headers={"X-Internal-Secret": os.getenv("INTERNAL_API_SECRET", "dev-secret")}
            )

            if response.status_code == 200:
                return True
            else:
                logger.warning(f"Notification endpoint returned {response.status_code}: {response.text}")
                return False

    except httpx.ConnectError:
        # API might not be running or endpoint doesn't exist yet
        logger.warning(f"Could not connect to internal API at {INTERNAL_API_BASE}")
        return False
    except Exception as e:
        logger.error(f"Error sending timer notification: {e}")
        return False


@celery_app.task(bind=True, name="cleanup_old_timers")
def cleanup_old_timers(self, days_old: int = 7):
    """
    Clean up old triggered/cancelled timers.

    Removes timers that were triggered or cancelled more than X days ago
    to prevent database bloat.

    Args:
        days_old: Delete timers older than this many days (default 7)
    """
    try:
        logger.info(f"🧹 Cleaning up timers older than {days_old} days...")
        supabase = get_supabase_client()

        from datetime import timedelta
        cutoff_date = datetime.now(timezone.utc) - timedelta(days=days_old)

        # Delete old triggered/cancelled timers
        response = supabase.table("timers_and_alarms").delete().in_(
            "status", ["triggered", "cancelled", "dismissed"]
        ).lt(
            "updated_at", cutoff_date.isoformat()
        ).execute()

        deleted_count = len(response.data) if response.data else 0
        logger.info(f"🧹 Cleaned up {deleted_count} old timers")

        return {"deleted_count": deleted_count}

    except Exception as exc:
        logger.error(f"❌ Timer cleanup failed: {exc}")
        raise


@celery_app.task(bind=True, name="dismiss_timer")
def dismiss_timer(self, timer_id: str, user_id: str):
    """
    Dismiss a triggered timer (user acknowledged it).

    Args:
        timer_id: Timer to dismiss
        user_id: User who owns the timer
    """
    try:
        supabase = get_supabase_client()

        response = supabase.table("timers_and_alarms").update({
            "status": "dismissed"
        }).eq("id", timer_id).eq("user_id", user_id).execute()

        if response.data:
            logger.info(f"✅ Timer {timer_id} dismissed by user {user_id}")
            return {"success": True}
        else:
            logger.warning(f"⚠️ Could not dismiss timer {timer_id}")
            return {"success": False, "error": "Timer not found"}

    except Exception as exc:
        logger.error(f"❌ Timer dismiss failed: {exc}")
        raise
