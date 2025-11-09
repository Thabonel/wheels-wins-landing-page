"""Update Settings Tool for PAM

Change user preferences and settings

Example usage:
- "Enable email notifications"
- "Turn off push notifications"

Amendment #4: Input validation with Pydantic models
"""

import logging
from typing import Any, Dict, Optional
from datetime import datetime
from pydantic import ValidationError

from app.integrations.supabase import get_supabase_client
from app.services.pam.schemas.profile import UpdateSettingsInput

logger = logging.getLogger(__name__)


async def update_settings(
    user_id: str,
    email_notifications: Optional[bool] = None,
    push_notifications: Optional[bool] = None,
    theme: Optional[str] = None,
    language: Optional[str] = None,
    budget_alerts: Optional[bool] = None,
    trip_reminders: Optional[bool] = None,
    **kwargs
) -> Dict[str, Any]:
    """
    Update user settings and preferences

    Args:
        user_id: UUID of the user
        email_notifications: Optional email notification setting
        push_notifications: Optional push notification setting
        theme: Optional theme (light, dark, auto)
        language: Optional language code
        budget_alerts: Optional budget alert setting
        trip_reminders: Optional trip reminder setting

    Returns:
        Dict with updated settings
    """
    try:
        # Validate inputs using Pydantic schema
        try:
            validated = UpdateSettingsInput(
                user_id=user_id,
                email_notifications=email_notifications,
                push_notifications=push_notifications,
                theme=theme,
                language=language,
                budget_alerts=budget_alerts,
                trip_reminders=trip_reminders
            )
        except ValidationError as e:
            # Extract first error message for user-friendly response
            error_msg = e.errors()[0]['msg']
            return {
                "success": False,
                "error": f"Invalid input: {error_msg}"
            }

        supabase = get_supabase_client()

        # Build update data (only include provided fields)
        update_data = {
            "updated_at": datetime.now().isoformat()
        }

        if validated.email_notifications is not None:
            update_data["email_notifications"] = validated.email_notifications
        if validated.push_notifications is not None:
            update_data["push_notifications"] = validated.push_notifications
        if validated.theme is not None:
            update_data["theme"] = validated.theme.value  # ✅ Extract enum value
        if validated.language is not None:
            update_data["language"] = validated.language
        if validated.budget_alerts is not None:
            update_data["budget_alerts"] = validated.budget_alerts
        if validated.trip_reminders is not None:
            update_data["trip_reminders"] = validated.trip_reminders

        # Update or insert settings
        response = supabase.table("user_settings").upsert({
            "user_id": validated.user_id,
            **update_data
        }).execute()

        if response.data:
            settings = response.data[0]
            logger.info(f"Updated settings for user {validated.user_id}")

            return {
                "success": True,
                "settings": settings,
                "message": "Settings updated successfully"
            }
        else:
            logger.error(f"Failed to update settings: {response}")
            return {
                "success": False,
                "error": "Failed to update settings"
            }

    except Exception as e:
        logger.error(f"Error updating settings: {e}", exc_info=True)
        return {
            "success": False,
            "error": str(e)
        }
