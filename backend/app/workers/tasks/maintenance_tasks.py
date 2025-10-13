
from celery import current_app
from app.workers.celery import celery_app
from app.core.logging import get_logger
from app.core.database import get_supabase_client
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

@celery_app.task(bind=True)
def update_vehicle_fuel_consumption_from_fillups(self, vehicle_id: str = None):
    """
    Auto-calculate and update vehicle fuel consumption from fillup history

    Calculates average MPG from the last 10 full-tank fillups and updates
    the vehicle's fuel_consumption_mpg field.

    Args:
        vehicle_id: Specific vehicle ID (optional, updates all vehicles if not provided)
    """
    try:
        logger.info(f"Starting fuel consumption auto-learning for vehicle_id={vehicle_id or 'ALL'}")
        supabase = get_supabase_client()

        # Get vehicles to update
        if vehicle_id:
            vehicles_response = supabase.table("vehicles").select("id, user_id, name").eq("id", vehicle_id).execute()
        else:
            # Get all vehicles that have fuel log entries
            vehicles_response = supabase.table("vehicles").select("id, user_id, name").execute()

        if not vehicles_response.data:
            logger.info("No vehicles found to update")
            return {"vehicles_updated": 0}

        vehicles_updated = 0

        for vehicle in vehicles_response.data:
            try:
                # Get last 10 full-tank fillups for this vehicle
                fillups_response = supabase.table("fuel_log").select(
                    "gallons, miles_since_last_fillup, mpg_calculated, logged_at"
                ).eq(
                    "vehicle_id", vehicle["id"]
                ).eq(
                    "is_full_tank", True
                ).filter(
                    "mpg_calculated", "is", "not.null"
                ).order(
                    "logged_at", desc=True
                ).limit(10).execute()

                fillups = fillups_response.data

                if len(fillups) < 3:
                    logger.info(f"Vehicle {vehicle['name']} ({vehicle['id']}) has < 3 fillups, skipping")
                    continue

                # Calculate average MPG
                total_mpg = sum(fillup["mpg_calculated"] for fillup in fillups)
                avg_mpg = round(total_mpg / len(fillups), 2)

                # Convert to L/100km
                l_per_100km = round(235.214 / avg_mpg, 2)

                # Update vehicle
                update_response = supabase.table("vehicles").update({
                    "fuel_consumption_mpg": avg_mpg,
                    "fuel_consumption_l_per_100km": l_per_100km,
                    "fuel_consumption_source": "calculated_from_fillups",
                    "fuel_consumption_last_updated": datetime.utcnow().isoformat(),
                    "fuel_consumption_sample_size": len(fillups)
                }).eq("id", vehicle["id"]).execute()

                if update_response.data:
                    logger.info(f"Updated vehicle {vehicle['name']} ({vehicle['id']}): {avg_mpg} MPG (from {len(fillups)} fillups)")
                    vehicles_updated += 1

            except Exception as vehicle_error:
                logger.error(f"Failed to update vehicle {vehicle['id']}: {vehicle_error}")
                continue

        logger.info(f"Fuel consumption auto-learning complete: {vehicles_updated} vehicles updated")
        return {
            "vehicles_updated": vehicles_updated,
            "total_vehicles_checked": len(vehicles_response.data)
        }

    except Exception as exc:
        logger.error(f"Failed to update vehicle fuel consumption from fillups: {exc}")
        raise
