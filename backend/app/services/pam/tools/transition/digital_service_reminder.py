"""Digital Service Reminder Tool for PAM

Reminds users about pending service cancellations, account consolidations,
and document digitization tasks with smart prioritization.

Example usage:
- "PAM, what services do I need to cancel?"
- "Remind me about my digital life tasks"
- "What's my progress on account consolidation?"
"""

import logging
from datetime import datetime, timedelta
from typing import Any, Dict, Optional

from app.integrations.supabase import get_supabase_client

logger = logging.getLogger(__name__)


async def digital_service_reminder(
    user_id: str,
    service_type: Optional[str] = None,
    include_completed: bool = False,
    **kwargs
) -> Dict[str, Any]:
    """
    Get reminders for pending digital life services
    
    Args:
        user_id: UUID of the user
        service_type: Optional filter (cancellation, consolidation, digitization)
        include_completed: Whether to include completed services
        
    Returns:
        Dict with service reminders and priority tasks
    """
    try:
        # Get Supabase client
        supabase = get_supabase_client()
        
        # Get user's transition profile
        profile_result = supabase.table("transition_profiles").select("id, departure_date").eq("user_id", user_id).maybe_single().execute()
        
        if not profile_result.data:
            return {
                "success": False,
                "error": "No transition profile found"
            }
        
        profile_id = profile_result.data["id"]
        departure_date = datetime.fromisoformat(profile_result.data["departure_date"])
        days_until_departure = (departure_date.date() - datetime.utcnow().date()).days
        
        # Get service statistics
        stats_result = supabase.rpc("get_service_stats", {
            "p_profile_id": profile_id
        }).execute()
        
        stats = stats_result.data[0] if stats_result.data else {}
        
        # Get pending services
        query = supabase.table("transition_services").select("*").eq("profile_id", profile_id)
        
        if service_type:
            query = query.eq("service_type", service_type)
        
        if not include_completed:
            query = query.neq("status", "completed")
        
        services_result = query.order("priority", desc=True).order("created_at").execute()
        services = services_result.data or []
        
        # Categorize and prioritize services
        urgent_services = []
        upcoming_services = []
        overdue_services = []
        
        for service in services:
            if service["service_type"] == "cancellation" and service.get("cancellation_target_date"):
                target_date = datetime.fromisoformat(service["cancellation_target_date"])
                days_until_target = (target_date.date() - datetime.utcnow().date()).days
                
                if days_until_target < 0:
                    overdue_services.append({
                        "name": service["service_name"],
                        "category": service["category"],
                        "days_overdue": abs(days_until_target),
                        "priority": service["priority"]
                    })
                elif days_until_target <= 7:
                    urgent_services.append({
                        "name": service["service_name"],
                        "category": service["category"],
                        "days_remaining": days_until_target,
                        "priority": service["priority"]
                    })
                elif days_until_target <= 30:
                    upcoming_services.append({
                        "name": service["service_name"],
                        "category": service["category"],
                        "days_remaining": days_until_target,
                        "priority": service["priority"]
                    })
        
        # Generate reminders
        reminders = []
        
        if overdue_services:
            reminders.append(f"⚠️ {len(overdue_services)} cancellations are OVERDUE!")
        
        if urgent_services:
            reminders.append(f"🔴 {len(urgent_services)} cancellations due within 7 days")
        
        if upcoming_services:
            reminders.append(f"🟡 {len(upcoming_services)} cancellations due within 30 days")
        
        if stats.get("pending_cancellations", 0) > 0:
            reminders.append(f"📋 {stats['pending_cancellations']} total pending cancellations")
        
        if stats.get("pending_consolidations", 0) > 0:
            reminders.append(f"🔄 {stats['pending_consolidations']} account consolidations in progress")
        
        if stats.get("digitization_percentage", 0) < 100:
            scanned = stats.get("documents_scanned", 0)
            total = stats.get("documents_total", 0)
            reminders.append(f"📄 Document digitization: {scanned}/{total} ({stats['digitization_percentage']}%)")
        
        # Priority actions
        priority_actions = []
        
        if overdue_services:
            for service in overdue_services[:3]:  # Top 3 overdue
                priority_actions.append(f"Cancel {service['name']} ({service['category']}) - {service['days_overdue']} days overdue")
        
        if urgent_services and not overdue_services:
            for service in urgent_services[:3]:  # Top 3 urgent
                priority_actions.append(f"Cancel {service['name']} ({service['category']}) - {service['days_remaining']} days left")
        
        logger.info(f"Generated service reminders for user {user_id}: {len(reminders)} reminders")
        
        return {
            "success": True,
            "stats": stats,
            "days_until_departure": days_until_departure,
            "reminders": reminders,
            "priority_actions": priority_actions,
            "urgent_count": len(urgent_services),
            "overdue_count": len(overdue_services),
            "message": f"You have {len(reminders)} digital life reminders. {len(priority_actions)} priority actions needed."
        }
        
    except Exception as e:
        logger.error(f"Error generating service reminders: {e}", exc_info=True)
        return {
            "success": False,
            "error": str(e)
        }
