
from celery import current_app
from app.workers.celery import celery_app
from app.core.logging import get_logger
from app.database.supabase_client import get_supabase_client
from datetime import datetime, timedelta
from typing import List, Dict

logger = get_logger(__name__)

@celery_app.task(bind=True)
def check_maintenance_reminders(self):
    """Check for upcoming maintenance items and send reminders"""
    try:
        logger.info("Checking maintenance reminders")
        supabase = get_supabase_client()
        
        # Get maintenance items due in next 7 days
        future_date = (datetime.now() + timedelta(days=7)).date()
        
        response = supabase.table("maintenance_records").select(
            "*, profiles!inner(email, full_name)"
        ).filter(
            "next_due_date", "lte", future_date.isoformat()
        ).filter(
            "status", "neq", "completed"
        ).execute()
        
        reminders_sent = 0
        for record in response.data:
            # Import here to avoid circular imports
            from app.workers.tasks.email_tasks import send_maintenance_reminder
            
            send_maintenance_reminder.delay(
                user_email=record["profiles"]["email"],
                maintenance_item=record["task"],
                due_date=record["next_due_date"]
            )
            reminders_sent += 1
        
        logger.info(f"Sent {reminders_sent} maintenance reminders")
        return {"reminders_sent": reminders_sent}
        
    except Exception as exc:
        logger.error(f"Failed to check maintenance reminders: {exc}")
        raise

@celery_app.task(bind=True)
def update_maintenance_status(self):
    """Update maintenance status based on due dates"""
    try:
        logger.info("Updating maintenance status")
        supabase = get_supabase_client()
        
        today = datetime.now().date()
        
        # Mark overdue items
        supabase.table("maintenance_records").update({
            "status": "overdue"
        }).filter(
            "next_due_date", "lt", today.isoformat()
        ).filter(
            "status", "neq", "completed"
        ).execute()
        
        # Mark items due soon
        future_date = (today + timedelta(days=7)).date()
        supabase.table("maintenance_records").update({
            "status": "due_soon"
        }).filter(
            "next_due_date", "gte", today.isoformat()
        ).filter(
            "next_due_date", "lte", future_date.isoformat()
        ).filter(
            "status", "neq", "completed"
        ).execute()
        
        logger.info("Maintenance status updated successfully")
        return {"status": "completed"}
        
    except Exception as exc:
        logger.error(f"Failed to update maintenance status: {exc}")
        raise

@celery_app.task(bind=True)
def generate_maintenance_report(self, user_id: str):
    """Generate maintenance report for user"""
    try:
        logger.info(f"Generating maintenance report for user {user_id}")
        supabase = get_supabase_client()
        
        # Get maintenance records
        response = supabase.table("maintenance_records").select("*").filter(
            "user_id", "eq", user_id
        ).execute()
        
        records = response.data
        
        # Calculate statistics
        total_cost = sum(record.get("cost", 0) for record in records if record.get("cost"))
        completed_tasks = len([r for r in records if r.get("status") == "completed"])
        overdue_tasks = len([r for r in records if r.get("status") == "overdue"])
        
        report = {
            "user_id": user_id,
            "total_records": len(records),
            "total_cost": total_cost,
            "completed_tasks": completed_tasks,
            "overdue_tasks": overdue_tasks,
            "generated_at": datetime.now().isoformat()
        }
        
        logger.info(f"Generated maintenance report for user {user_id}")
        return report
        
    except Exception as exc:
        logger.error(f"Failed to generate maintenance report: {exc}")
        raise
