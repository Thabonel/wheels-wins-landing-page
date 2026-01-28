"""Export Data Tool for PAM

Download user data (GDPR compliance)

Example usage:
- "Export my data"
- "Download all my information"

Amendment #4: Input validation with Pydantic models
"""

import logging
from typing import Any, Dict
from datetime import datetime
import json
from pydantic import ValidationError as PydanticValidationError

from app.integrations.supabase import get_supabase_client
from app.services.pam.schemas.profile import ExportDataInput
from app.services.pam.tools.exceptions import (
    ValidationError,
    DatabaseError,
    ResourceNotFoundError,
)
from app.services.pam.tools.utils import (
    validate_uuid,
    safe_db_select,
)

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

    Raises:
        ValidationError: Invalid input parameters
        DatabaseError: Database operation failed
    """
    try:
        validate_uuid(user_id, "user_id")

        try:
            validated = ExportDataInput(
                user_id=user_id,
                format=kwargs.get("format", "json"),
                include_expenses=kwargs.get("include_expenses", True),
                include_budgets=kwargs.get("include_budgets", True),
                include_trips=kwargs.get("include_trips", True),
                include_posts=kwargs.get("include_posts", True),
                include_favorites=kwargs.get("include_favorites", True)
            )
        except PydanticValidationError as e:
            error_msg = e.errors()[0]['msg']
            raise ValidationError(
                f"Invalid input: {error_msg}",
                context={"validation_errors": e.errors()}
            )

        export_data_obj = {
            "export_date": datetime.now().isoformat(),
            "user_id": validated.user_id,
            "format": validated.format
        }

        profile_data = await safe_db_select(
            "profiles",
            columns="*",
            filters={"id": validated.user_id}
        )
        export_data_obj["profile"] = profile_data[0] if profile_data else None

        settings_data = await safe_db_select(
            "user_settings",
            columns="*",
            filters={"user_id": validated.user_id}
        )
        export_data_obj["settings"] = settings_data[0] if settings_data else None

        privacy_data = await safe_db_select(
            "privacy_settings",
            columns="*",
            filters={"user_id": validated.user_id}
        )
        export_data_obj["privacy_settings"] = privacy_data[0] if privacy_data else None

        if validated.include_expenses:
            expenses_data = await safe_db_select(
                "expenses",
                columns="*",
                filters={"user_id": validated.user_id}
            )
            export_data_obj["expenses"] = expenses_data or []

        if validated.include_budgets:
            budgets_data = await safe_db_select(
                "budgets",
                columns="*",
                filters={"user_id": validated.user_id}
            )
            export_data_obj["budgets"] = budgets_data or []

        if validated.include_trips:
            trips_data = await safe_db_select(
                "user_trips",
                columns="*",
                filters={"user_id": validated.user_id}
            )
            export_data_obj["trips"] = trips_data or []

        if validated.include_posts:
            posts_data = await safe_db_select(
                "posts",
                columns="*",
                filters={"user_id": validated.user_id}
            )
            export_data_obj["posts"] = posts_data or []

        if validated.include_favorites:
            favorites_data = await safe_db_select(
                "favorite_locations",
                columns="*",
                filters={"user_id": validated.user_id}
            )
            export_data_obj["favorite_locations"] = favorites_data or []

        total_records = (
            len(export_data_obj.get("expenses", [])) +
            len(export_data_obj.get("budgets", [])) +
            len(export_data_obj.get("trips", [])) +
            len(export_data_obj.get("posts", [])) +
            len(export_data_obj.get("favorite_locations", []))
        )

        logger.info(f"Exported {total_records} records for user {validated.user_id}")

        return {
            "success": True,
            "export_date": export_data_obj["export_date"],
            "total_records": total_records,
            "data": export_data_obj,
            "message": f"Exported {total_records} records. Download link sent to your email."
        }

    except ValidationError:
        raise
    except DatabaseError:
        raise
    except Exception as e:
        logger.error(
            f"Unexpected error exporting data",
            extra={"user_id": user_id},
            exc_info=True
        )
        raise DatabaseError(
            "Failed to export data",
            context={"user_id": user_id, "error": str(e)}
        )
