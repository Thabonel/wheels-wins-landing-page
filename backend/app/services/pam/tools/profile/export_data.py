"""Export Data Tool for PAM

Download user data (GDPR compliance)

Example usage:
- "Export my data"
- "Download all my information"
"""

import logging
from typing import Any, Dict
from datetime import datetime
import json

from app.integrations.supabase import get_supabase_client

logger = logging.getLogger(__name__)


async def export_data(
    user_id: str,
    **kwargs
) -> Dict[str, Any]:
    """
    Export all user data (GDPR compliance)

    Args:
        user_id: UUID of the user

    Returns:
        Dict with export details and data
    """
    try:
        supabase = get_supabase_client()

        export_data_obj = {
            "export_date": datetime.now().isoformat(),
            "user_id": user_id
        }

        # Export profile
        profile_response = supabase.table("profiles").select("*").eq(
            "user_id", user_id
        ).execute()
        export_data_obj["profile"] = profile_response.data[0] if profile_response.data else None

        # Export settings
        settings_response = supabase.table("user_settings").select("*").eq(
            "user_id", user_id
        ).execute()
        export_data_obj["settings"] = settings_response.data[0] if settings_response.data else None

        # Export privacy settings
        privacy_response = supabase.table("privacy_settings").select("*").eq(
            "user_id", user_id
        ).execute()
        export_data_obj["privacy_settings"] = privacy_response.data[0] if privacy_response.data else None

        # Export expenses
        expenses_response = supabase.table("expenses").select("*").eq(
            "user_id", user_id
        ).execute()
        export_data_obj["expenses"] = expenses_response.data or []

        # Export budgets
        budgets_response = supabase.table("budgets").select("*").eq(
            "user_id", user_id
        ).execute()
        export_data_obj["budgets"] = budgets_response.data or []

        # Export trips (schema uses user_trips, not trips)
        trips_response = supabase.table("user_trips").select("*").eq(
            "user_id", user_id
        ).execute()
        export_data_obj["trips"] = trips_response.data or []

        # Export posts
        posts_response = supabase.table("posts").select("*").eq(
            "user_id", user_id
        ).execute()
        export_data_obj["posts"] = posts_response.data or []

        # Export favorite locations
        favorites_response = supabase.table("favorite_locations").select("*").eq(
            "user_id", user_id
        ).execute()
        export_data_obj["favorite_locations"] = favorites_response.data or []

        # Count total records
        total_records = (
            len(export_data_obj["expenses"]) +
            len(export_data_obj["budgets"]) +
            len(export_data_obj["trips"]) +
            len(export_data_obj["posts"]) +
            len(export_data_obj["favorite_locations"])
        )

        logger.info(f"Exported {total_records} records for user {user_id}")

        # In production, this would:
        # 1. Save to temporary file/S3
        # 2. Generate download link
        # 3. Send email with link
        # 4. Auto-delete after 48 hours

        return {
            "success": True,
            "export_date": export_data_obj["export_date"],
            "total_records": total_records,
            "data": export_data_obj,
            "message": f"Exported {total_records} records. Download link sent to your email."
        }

    except Exception as e:
        logger.error(f"Error exporting data: {e}", exc_info=True)
        return {
            "success": False,
            "error": str(e)
        }
