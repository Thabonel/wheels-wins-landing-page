"""
PAM Tool: Get Transition Overview

Provides a comprehensive summary of the user's transition status including:
- Days until departure
- Current phase
- Completion percentage
- Task summary
- Financial readiness
- Upcoming milestones
"""

from typing import Dict, Any, Optional
from datetime import datetime, date
from supabase import create_client
import os
import logging

logger = logging.getLogger(__name__)

# Initialize Supabase client
supabase = create_client(
    os.getenv("SUPABASE_URL", ""),
    os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
)


async def get_transition_overview(user_id: str) -> Dict[str, Any]:
    """
    Get a comprehensive overview of the user's transition status.

    Args:
        user_id: The user's UUID

    Returns:
        Dictionary containing:
        - days_until_departure: Number of days until departure
        - current_phase: Current transition phase
        - completion_percentage: Overall completion percentage
        - tasks_summary: Task statistics
        - financial_summary: Financial bucket statistics
        - upcoming_milestones: Next 3 upcoming milestones
        - status: Success status
        - message: Human-readable summary
    """
    try:
        # Fetch transition profile
        profile_response = supabase.table("transition_profiles").select("*").eq("user_id", user_id).maybe_single().execute()

        if not profile_response.data:
            return {
                "success": False,
                "message": "No transition profile found. Would you like to create one?",
                "has_profile": False
            }

        profile = profile_response.data

        # Calculate days until departure
        departure_date = datetime.fromisoformat(profile["departure_date"]).date()
        today = date.today()
        days_until = (departure_date - today).days

        # Fetch task statistics
        tasks_response = supabase.table("transition_tasks").select("*").eq("profile_id", profile["id"]).execute()
        tasks = tasks_response.data or []

        total_tasks = len(tasks)
        completed_tasks = sum(1 for task in tasks if task["is_completed"])
        high_priority_tasks = [task for task in tasks if task["priority"] in ["high", "critical"] and not task["is_completed"]]

        # Fetch financial statistics
        financial_response = supabase.table("transition_financial").select("*").eq("profile_id", profile["id"]).execute()
        financial_items = financial_response.data or []

        total_estimated = sum(float(item["estimated_amount"]) for item in financial_items)
        total_funded = sum(float(item["current_amount"]) for item in financial_items)
        funding_percentage = int((total_funded / total_estimated * 100)) if total_estimated > 0 else 0

        # Fetch upcoming milestones
        milestones_response = (
            supabase.table("transition_timeline")
            .select("*")
            .eq("profile_id", profile["id"])
            .eq("is_completed", False)
            .gte("milestone_date", today.isoformat())
            .order("milestone_date", desc=False)
            .limit(3)
            .execute()
        )
        upcoming_milestones = milestones_response.data or []

        # Generate human-readable summary
        phase_messages = {
            "planning": f"You're in the planning phase with {days_until} days until departure.",
            "preparing": f"You're preparing to launch in {days_until} days!",
            "launching": f"Launch week! Only {days_until} days to go!",
            "on_road": "You're on the road! Welcome to the RV life!"
        }

        summary_message = f"""{phase_messages.get(profile['current_phase'], 'Planning your transition.')}

Completion: {profile['completion_percentage']}% overall ({completed_tasks}/{total_tasks} tasks complete)
Financial Readiness: {funding_percentage}% funded (${total_funded:,.0f} of ${total_estimated:,.0f})
{len(high_priority_tasks)} high-priority tasks remaining
{len(upcoming_milestones)} upcoming milestones"""

        return {
            "success": True,
            "has_profile": True,
            "overview": {
                "days_until_departure": days_until,
                "current_phase": profile["current_phase"],
                "completion_percentage": profile["completion_percentage"],
                "tasks_summary": {
                    "total": total_tasks,
                    "completed": completed_tasks,
                    "remaining": total_tasks - completed_tasks,
                    "high_priority_remaining": len(high_priority_tasks)
                },
                "financial_summary": {
                    "total_estimated": float(total_estimated),
                    "total_funded": float(total_funded),
                    "funding_percentage": funding_percentage,
                    "remaining": float(total_estimated - total_funded)
                },
                "upcoming_milestones": [
                    {
                        "name": m["milestone_name"],
                        "date": m["milestone_date"],
                        "type": m["milestone_type"],
                        "days_away": (datetime.fromisoformat(m["milestone_date"]).date() - today).days
                    }
                    for m in upcoming_milestones
                ]
            },
            "message": summary_message
        }

    except Exception as e:
        logger.error(f"Error getting transition overview: {str(e)}")
        return {
            "success": False,
            "message": f"Error retrieving transition overview: {str(e)}"
        }
