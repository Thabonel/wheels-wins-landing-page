
from celery import current_app
from app.workers.celery import celery_app
from app.core.logging import get_logger
from app.core.database import get_supabase_client
from datetime import datetime, timedelta

logger = get_logger(__name__)

@celery_app.task(bind=True)
def cleanup_expired_data(self):
    """Clean up expired data from various tables"""
    try:
        logger.info("Starting expired data cleanup")
        supabase = get_supabase_client()
        
        cleanup_results = {}
        
        # Clean up expired audio cache
        cleanup_results["audio_cache"] = _cleanup_expired_audio_cache(supabase)
        
        # Clean up old analytics logs (older than 90 days)
        cleanup_results["analytics_logs"] = _cleanup_old_analytics_logs(supabase)
        
        # Clean up expired sessions
        cleanup_results["sessions"] = _cleanup_expired_sessions(supabase)
        
        # Clean up old conversation memory (older than 1 year)
        cleanup_results["conversation_memory"] = _cleanup_old_conversation_memory(supabase)
        
        # Clean up expired recommendations
        cleanup_results["recommendations"] = _cleanup_expired_recommendations(supabase)
        
        logger.info(f"Cleanup completed: {cleanup_results}")
        return cleanup_results
        
    except Exception as exc:
        logger.error(f"Failed to cleanup expired data: {exc}")
        raise

@celery_app.task(bind=True)
def cleanup_orphaned_records(self):
    """Clean up orphaned records without valid references"""
    try:
        logger.info("Starting orphaned records cleanup")
        supabase = get_supabase_client()
        
        cleanup_results = {}
        
        # Clean up items without valid drawer references
        cleanup_results["orphaned_items"] = _cleanup_orphaned_items(supabase)
        
        # Clean up food items without valid category references
        cleanup_results["orphaned_food_items"] = _cleanup_orphaned_food_items(supabase)
        
        # Clean up meal plans with invalid references
        cleanup_results["orphaned_meal_plans"] = _cleanup_orphaned_meal_plans(supabase)
        
        logger.info(f"Orphaned records cleanup completed: {cleanup_results}")
        return cleanup_results
        
    except Exception as exc:
        logger.error(f"Failed to cleanup orphaned records: {exc}")
        raise

@celery_app.task(bind=True)
def archive_old_data(self):
    """Archive old data to reduce active table sizes"""
    try:
        logger.info("Starting data archival")
        supabase = get_supabase_client()
        
        archive_results = {}
        
        # Archive old expenses (older than 2 years)
        archive_results["expenses"] = _archive_old_expenses(supabase)
        
        # Archive old fuel logs (older than 2 years)
        archive_results["fuel_logs"] = _archive_old_fuel_logs(supabase)
        
        # Archive completed maintenance records (older than 1 year)
        archive_results["maintenance_records"] = _archive_old_maintenance_records(supabase)
        
        logger.info(f"Data archival completed: {archive_results}")
        return archive_results
        
    except Exception as exc:
        logger.error(f"Failed to archive old data: {exc}")
        raise

def _cleanup_expired_audio_cache(supabase):
    """Clean up expired audio cache entries"""
    try:
        response = supabase.table("audio_cache").delete().filter(
            "expires_at", "lt", datetime.now().isoformat()
        ).execute()
        
        count = len(response.data) if response.data else 0
        logger.info(f"Cleaned up {count} expired audio cache entries")
        return count
        
    except Exception as e:
        logger.error(f"Failed to cleanup audio cache: {e}")
        return 0

def _cleanup_old_analytics_logs(supabase):
    """Clean up analytics logs older than 90 days"""
    try:
        cutoff_date = datetime.now() - timedelta(days=90)
        
        response = supabase.table("pam_analytics_logs").delete().filter(
            "created_at", "lt", cutoff_date.isoformat()
        ).execute()
        
        count = len(response.data) if response.data else 0
        logger.info(f"Cleaned up {count} old analytics logs")
        return count
        
    except Exception as e:
        logger.error(f"Failed to cleanup analytics logs: {e}")
        return 0

def _cleanup_expired_sessions(supabase):
    """Clean up expired user sessions"""
    try:
        response = supabase.table("user_active_sessions").delete().filter(
            "expires_at", "lt", datetime.now().isoformat()
        ).execute()
        
        count = len(response.data) if response.data else 0
        logger.info(f"Cleaned up {count} expired sessions")
        return count
        
    except Exception as e:
        logger.error(f"Failed to cleanup sessions: {e}")
        return 0

def _cleanup_old_conversation_memory(supabase):
    """Clean up conversation memory older than 1 year"""
    try:
        cutoff_date = datetime.now() - timedelta(days=365)
        
        response = supabase.table("pam_conversation_memory").delete().filter(
            "created_at", "lt", cutoff_date.isoformat()
        ).execute()
        
        count = len(response.data) if response.data else 0
        logger.info(f"Cleaned up {count} old conversation memories")
        return count
        
    except Exception as e:
        logger.error(f"Failed to cleanup conversation memory: {e}")
        return 0

def _cleanup_expired_recommendations(supabase):
    """Clean up expired recommendations"""
    try:
        response = supabase.table("active_recommendations").delete().filter(
            "expires_at", "lt", datetime.now().isoformat()
        ).execute()
        
        count = len(response.data) if response.data else 0
        logger.info(f"Cleaned up {count} expired recommendations")
        return count
        
    except Exception as e:
        logger.error(f"Failed to cleanup recommendations: {e}")
        return 0

def _cleanup_orphaned_items(supabase):
    """Clean up items without valid drawer references"""
    try:
        # This would require more complex logic to identify orphaned records
        # For now, return 0 as placeholder
        logger.info("Orphaned items cleanup - placeholder")
        return 0
        
    except Exception as e:
        logger.error(f"Failed to cleanup orphaned items: {e}")
        return 0

def _cleanup_orphaned_food_items(supabase):
    """Clean up food items without valid category references"""
    try:
        # Placeholder for orphaned food items cleanup
        logger.info("Orphaned food items cleanup - placeholder")
        return 0
        
    except Exception as e:
        logger.error(f"Failed to cleanup orphaned food items: {e}")
        return 0

def _cleanup_orphaned_meal_plans(supabase):
    """Clean up meal plans with invalid references"""
    try:
        # Placeholder for orphaned meal plans cleanup
        logger.info("Orphaned meal plans cleanup - placeholder")
        return 0
        
    except Exception as e:
        logger.error(f"Failed to cleanup orphaned meal plans: {e}")
        return 0

def _archive_old_expenses(supabase):
    """Archive expenses older than 2 years"""
    try:
        # Placeholder for expense archival
        logger.info("Old expenses archival - placeholder")
        return 0
        
    except Exception as e:
        logger.error(f"Failed to archive expenses: {e}")
        return 0

def _archive_old_fuel_logs(supabase):
    """Archive fuel logs older than 2 years"""
    try:
        # Placeholder for fuel logs archival
        logger.info("Old fuel logs archival - placeholder")
        return 0
        
    except Exception as e:
        logger.error(f"Failed to archive fuel logs: {e}")
        return 0

def _archive_old_maintenance_records(supabase):
    """Archive maintenance records older than 1 year"""
    try:
        # Placeholder for maintenance records archival
        logger.info("Old maintenance records archival - placeholder")
        return 0
        
    except Exception as e:
        logger.error(f"Failed to archive maintenance records: {e}")
        return 0
