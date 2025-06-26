
from celery import current_app
from app.workers.celery import celery_app
from app.core.logging import get_logger
from app.database.supabase_client import get_supabase_client
from datetime import datetime, timedelta
from typing import List, Dict

logger = get_logger(__name__)

@celery_app.task(bind=True)
def send_daily_digest(self):
    """Send daily digest to active users"""
    try:
        logger.info("Sending daily digest notifications")
        supabase = get_supabase_client()
        
        # Get active users who have opted in for notifications
        response = supabase.table("profiles").select(
            "user_id, email, full_name, notification_preferences"
        ).filter(
            "status", "eq", "active"
        ).execute()
        
        users = response.data
        sent_count = 0
        
        for user in users:
            # Check if user wants daily digest
            prefs = user.get("notification_preferences", {})
            if prefs.get("daily_digest", True):
                digest_data = _generate_user_digest(user["user_id"])
                
                # Send digest email
                from app.workers.tasks.email_tasks import send_digest_email
                send_digest_email.delay(
                    user_email=user["email"],
                    user_name=user.get("full_name", "Traveler"),
                    digest_data=digest_data
                )
                sent_count += 1
        
        logger.info(f"Sent daily digest to {sent_count} users")
        return {"digests_sent": sent_count}
        
    except Exception as exc:
        logger.error(f"Failed to send daily digest: {exc}")
        raise

@celery_app.task(bind=True)
def send_budget_alerts(self):
    """Send budget alerts to users who are approaching limits"""
    try:
        logger.info("Checking for budget alerts")
        supabase = get_supabase_client()
        
        # Get users with budget categories
        response = supabase.table("budget_categories").select(
            "*, profiles!inner(email, full_name)"
        ).execute()
        
        categories = response.data
        alerts_sent = 0
        
        for category in categories:
            usage_percentage = (category["spent_amount"] / category["budgeted_amount"]) * 100
            
            # Send alert if over 80% of budget used
            if usage_percentage >= 80:
                from app.workers.tasks.email_tasks import send_budget_alert
                send_budget_alert.delay(
                    user_email=category["profiles"]["email"],
                    category=category["name"],
                    percentage_used=usage_percentage
                )
                alerts_sent += 1
        
        logger.info(f"Sent {alerts_sent} budget alerts")
        return {"alerts_sent": alerts_sent}
        
    except Exception as exc:
        logger.error(f"Failed to send budget alerts: {exc}")
        raise

@celery_app.task(bind=True)
def send_trip_reminders(self):
    """Send trip reminders for upcoming planned trips"""
    try:
        logger.info("Sending trip reminders")
        supabase = get_supabase_client()
        
        # Get trips starting in the next 3 days
        upcoming_date = (datetime.now() + timedelta(days=3)).date()
        
        response = supabase.table("calendar_events").select(
            "*, profiles!inner(email, full_name)"
        ).filter(
            "type", "eq", "trip"
        ).filter(
            "date", "lte", upcoming_date.isoformat()
        ).filter(
            "date", "gte", datetime.now().date().isoformat()
        ).execute()
        
        trips = response.data
        reminders_sent = 0
        
        for trip in trips:
            _send_trip_reminder_notification(trip)
            reminders_sent += 1
        
        logger.info(f"Sent {reminders_sent} trip reminders")
        return {"reminders_sent": reminders_sent}
        
    except Exception as exc:
        logger.error(f"Failed to send trip reminders: {exc}")
        raise

@celery_app.task(bind=True)
def send_social_notifications(self):
    """Send notifications for social activities"""
    try:
        logger.info("Sending social notifications")
        supabase = get_supabase_client()
        
        notifications_sent = 0
        
        # Check for new group messages, post likes, etc.
        # This would require more complex logic based on user preferences
        
        logger.info(f"Sent {notifications_sent} social notifications")
        return {"notifications_sent": notifications_sent}
        
    except Exception as exc:
        logger.error(f"Failed to send social notifications: {exc}")
        raise

@celery_app.task(bind=True)
def send_weather_alerts(self, user_id: str, location: str):
    """Send weather alerts for user's location"""
    try:
        logger.info(f"Sending weather alert for user {user_id}")
        supabase = get_supabase_client()
        
        # Get user info
        response = supabase.table("profiles").select(
            "email, full_name"
        ).filter("user_id", "eq", user_id).execute()
        
        if not response.data:
            return {"error": "User not found"}
        
        user = response.data[0]
        
        # Get weather data (placeholder - would integrate with weather API)
        weather_alert = _get_weather_alert(location)
        
        if weather_alert:
            _send_weather_notification(user["email"], user["full_name"], weather_alert)
            return {"weather_alert_sent": True}
        
        return {"weather_alert_sent": False}
        
    except Exception as exc:
        logger.error(f"Failed to send weather alert: {exc}")
        raise

def _generate_user_digest(user_id: str) -> Dict:
    """Generate daily digest data for user"""
    try:
        supabase = get_supabase_client()
        
        # Get recent activity, expenses, upcoming events, etc.
        digest = {
            "date": datetime.now().date().isoformat(),
            "recent_expenses": _get_recent_expenses(supabase, user_id),
            "upcoming_events": _get_upcoming_events(supabase, user_id),
            "maintenance_reminders": _get_maintenance_reminders(supabase, user_id),
            "budget_status": _get_budget_status(supabase, user_id),
            "travel_recommendations": _get_travel_recommendations(supabase, user_id)
        }
        
        return digest
        
    except Exception as e:
        logger.error(f"Failed to generate digest for user {user_id}: {e}")
        return {}

def _get_recent_expenses(supabase, user_id: str) -> List:
    """Get recent expenses for user"""
    try:
        response = supabase.table("expenses").select("*").filter(
            "user_id", "eq", user_id
        ).order("date", desc=True).limit(5).execute()
        
        return response.data
        
    except Exception:
        return []

def _get_upcoming_events(supabase, user_id: str) -> List:
    """Get upcoming events for user"""
    try:
        upcoming_date = (datetime.now() + timedelta(days=7)).date()
        
        response = supabase.table("calendar_events").select("*").filter(
            "user_id", "eq", user_id
        ).filter(
            "date", "gte", datetime.now().date().isoformat()
        ).filter(
            "date", "lte", upcoming_date.isoformat()
        ).execute()
        
        return response.data
        
    except Exception:
        return []

def _get_maintenance_reminders(supabase, user_id: str) -> List:
    """Get maintenance reminders for user"""
    try:
        response = supabase.table("maintenance_records").select("*").filter(
            "user_id", "eq", user_id
        ).filter(
            "status", "in", ("due_soon", "overdue")
        ).execute()
        
        return response.data
        
    except Exception:
        return []

def _get_budget_status(supabase, user_id: str) -> Dict:
    """Get budget status for user"""
    try:
        response = supabase.table("budget_categories").select("*").filter(
            "user_id", "eq", user_id
        ).execute()
        
        categories = response.data
        total_budget = sum(cat["budgeted_amount"] for cat in categories)
        total_spent = sum(cat["spent_amount"] for cat in categories)
        
        return {
            "total_budget": total_budget,
            "total_spent": total_spent,
            "remaining": total_budget - total_spent,
            "categories_count": len(categories)
        }
        
    except Exception:
        return {}

def _get_travel_recommendations(supabase, user_id: str) -> List:
    """Get travel recommendations for user"""
    try:
        response = supabase.table("active_recommendations").select("*").filter(
            "user_id", "eq", user_id
        ).filter(
            "expires_at", "gt", datetime.now().isoformat()
        ).limit(3).execute()
        
        return response.data
        
    except Exception:
        return []

def _send_trip_reminder_notification(trip: Dict):
    """Send trip reminder notification"""
    try:
        # This would send push notification, email, or SMS
        logger.info(f"Trip reminder sent for: {trip.get('title')}")
        
    except Exception as e:
        logger.error(f"Failed to send trip reminder: {e}")

def _get_weather_alert(location: str) -> Dict:
    """Get weather alert for location (placeholder)"""
    # This would integrate with a weather API
    return {
        "location": location,
        "alert_type": "severe_weather",
        "description": "Severe weather warning in your area"
    }

def _send_weather_notification(email: str, name: str, alert: Dict):
    """Send weather notification"""
    try:
        # Send weather alert email/notification
        logger.info(f"Weather alert sent to {email}")
        
    except Exception as e:
        logger.error(f"Failed to send weather notification: {e}")
