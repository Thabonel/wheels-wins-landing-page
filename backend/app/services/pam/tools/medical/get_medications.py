"""Get Medications Tool for PAM

Retrieve user's medication list with refill date warnings.
"""

import logging
from datetime import datetime, timedelta
from typing import Any, Dict
from pydantic import ValidationError

from app.integrations.supabase import get_supabase_client
from app.services.pam.schemas.medical import GetMedicationsInput
from app.services.pam.tools.exceptions import (
    ValidationError as CustomValidationError,
    DatabaseError,
)
from app.services.pam.tools.utils import validate_uuid

logger = logging.getLogger(__name__)

REFILL_WARNING_DAYS = 7


async def get_medications(
    user_id: str,
    active_only: bool = True,
    **kwargs,
) -> Dict[str, Any]:
    """
    Retrieve user's medication list.

    Args:
        user_id: UUID of the user
        active_only: Only return active medications (default True)

    Returns:
        Dict with medication list and refill warnings

    Raises:
        ValidationError: Invalid input parameters
        DatabaseError: Database operation failed
    """
    try:
        validate_uuid(user_id, "user_id")

        try:
            validated = GetMedicationsInput(
                user_id=user_id,
                active_only=active_only,
            )
        except ValidationError as e:
            error_msg = e.errors()[0]["msg"]
            raise CustomValidationError(
                f"Invalid input: {error_msg}",
                context={"validation_errors": e.errors()},
            )

        supabase = get_supabase_client()

        query = (
            supabase.table("medical_medications")
            .select("*")
            .eq("user_id", validated.user_id)
            .order("name")
        )

        if validated.active_only:
            query = query.eq("active", True)

        response = query.execute()
        medications = response.data if response.data else []

        # Check for upcoming refills
        now = datetime.now()
        refill_warning_threshold = now + timedelta(days=REFILL_WARNING_DAYS)
        refill_warnings = []

        for med in medications:
            refill_date_str = med.get("refill_date")
            if refill_date_str:
                try:
                    refill_date = datetime.fromisoformat(
                        refill_date_str.replace("Z", "+00:00")
                    ).replace(tzinfo=None)
                    if refill_date <= refill_warning_threshold:
                        days_until = (refill_date - now).days
                        refill_warnings.append({
                            "medication": med.get("name"),
                            "refill_date": refill_date_str,
                            "days_until_refill": max(days_until, 0),
                            "overdue": days_until < 0,
                        })
                except (ValueError, TypeError):
                    pass

        logger.info(
            f"Retrieved {len(medications)} medications for user {validated.user_id} "
            f"({len(refill_warnings)} refill warnings)"
        )

        return {
            "success": True,
            "medications_found": len(medications),
            "medications": medications,
            "refill_warnings": refill_warnings,
            "filter": "active only" if validated.active_only else "all",
            "message": (
                f"Found {len(medications)} medication(s)"
                + (
                    f" - {len(refill_warnings)} need refill soon!"
                    if refill_warnings
                    else ""
                )
            ),
        }

    except CustomValidationError:
        raise
    except DatabaseError:
        raise
    except Exception as e:
        logger.error(
            "Unexpected error retrieving medications",
            extra={"user_id": user_id},
            exc_info=True,
        )
        raise DatabaseError(
            "Failed to retrieve medications",
            context={"user_id": user_id, "error": str(e)},
        )
