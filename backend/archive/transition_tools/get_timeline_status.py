"""
PAM Tool: Get Timeline Status

Returns upcoming milestones and timeline status for the user's transition.
Helps users stay on track with key dates and events.
"""

from typing import Dict, Any, List, Optional
from datetime import datetime, date, timedelta
from supabase import create_client
import os
import logging

logger = logging.getLogger(__name__)

# Initialize Supabase client
supabase = create_client(
    os.getenv("SUPABASE_URL", ""),
    os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
)


async def get_timeline_status(
    user_id: str,
    days_ahead: int = 30,
    include_completed: bool = False
) -> Dict[str, Any]:
    """
    Get upcoming milestones and timeline status for the user's transition.

    Args:
        user_id: The user's UUID
        days_ahead: Number of days to look ahead (default: 30)
        include_completed: Whether to include completed milestones

    Returns:
        Dictionary containing:
        - milestones: List of upcoming milestones
        - next_milestone: The very next upcoming milestone
        - overdue_milestones: Milestones that are past due
        - count: Total number of milestones
        - success: Success status
        - message: Human-readable summary
    """
    try:
        # Fetch transition profile
        profile_response = supabase.table("transition_profiles").select("*").eq("user_id", user_id).maybe_single().execute()

        if not profile_response.data:
            return {
                "success": False,
                "message": "No transition profile found.",
                "milestones": [],
                "count": 0
            }

        profile = profile_response.data
        today = date.today()
        future_date = today + timedelta(days=days_ahead)

        # Build query
        query = supabase.table("transition_timeline").select("*").eq("profile_id", profile["id"])

        if not include_completed:
            query = query.eq("is_completed", False)

        # Fetch milestones
        milestones_response = query.order("milestone_date", desc=False).execute()
        all_milestones = milestones_response.data or []

        # Categorize milestones
        upcoming = []
        overdue = []
        completed = []

        for milestone in all_milestones:
            milestone_date = datetime.fromisoformat(milestone["milestone_date"]).date()
            days_away = (milestone_date - today).days

            milestone_info = {
                "id": milestone["id"],
                "name": milestone["milestone_name"],
                "date": milestone["milestone_date"],
                "type": milestone["milestone_type"],
                "is_completed": milestone["is_completed"],
                "days_away": days_away,
                "celebration_message": milestone.get("celebration_message"),
                "tasks_associated_count": milestone.get("tasks_associated_count", 0)
            }

            if milestone["is_completed"]:
                milestone_info["completed_at"] = milestone.get("completed_at")
                completed.append(milestone_info)
            elif days_away < 0:
                overdue.append(milestone_info)
            elif days_away <= days_ahead:
                upcoming.append(milestone_info)

        # Sort by days away
        upcoming.sort(key=lambda x: x["days_away"])
        overdue.sort(key=lambda x: x["days_away"], reverse=True)

        # Find next milestone
        next_milestone = upcoming[0] if upcoming else None

        # Milestone type emojis
        type_emojis = {
            "planning_start": "🎯",
            "three_months": "📅",
            "one_month": "⏰",
            "one_week": "⚡",
            "departure": "🚀",
            "first_night": "🌙",
            "one_month_road": "🎉",
            "custom": "📌"
        }

        # Generate summary message
        if not upcoming and not overdue:
            if completed:
                message = "All milestones completed! Great job!"
            else:
                message = f"No milestones found in the next {days_ahead} days."
        else:
            message_parts = []

            if overdue:
                message_parts.append(f"⚠️ {len(overdue)} milestone(s) overdue")

            if next_milestone:
                emoji = type_emojis.get(next_milestone["type"], "📌")
                days = next_milestone["days_away"]
                if days == 0:
                    time_str = "today!"
                elif days == 1:
                    time_str = "tomorrow!"
                else:
                    time_str = f"in {days} days"

                message_parts.append(f"{emoji} Next: {next_milestone['name']} {time_str}")

            if len(upcoming) > 1:
                message_parts.append(f"Plus {len(upcoming) - 1} more milestone(s) ahead")

            message = "\n".join(message_parts)

        return {
            "success": True,
            "milestones": upcoming,
            "next_milestone": next_milestone,
            "overdue_milestones": overdue,
            "completed_milestones": completed if include_completed else [],
            "count": {
                "upcoming": len(upcoming),
                "overdue": len(overdue),
                "completed": len(completed)
            },
            "message": message
        }

    except Exception as e:
        logger.error(f"Error getting timeline status: {str(e)}")
        return {
            "success": False,
            "message": f"Error retrieving timeline status: {str(e)}",
            "milestones": [],
            "count": 0
        }
