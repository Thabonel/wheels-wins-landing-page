"""Get Medical Records Tool for PAM

Retrieve user's uploaded medical records and documents.
"""

import logging
from typing import Any, Dict, Optional
from pydantic import ValidationError

from app.integrations.supabase import get_supabase_client
from app.services.pam.schemas.medical import GetMedicalRecordsInput
from app.services.pam.tools.exceptions import (
    ValidationError as CustomValidationError,
    DatabaseError,
)
from app.services.pam.tools.utils import validate_uuid

logger = logging.getLogger(__name__)

MAX_RECORDS = 50


async def get_medical_records(
    user_id: str,
    record_type: Optional[str] = None,
    limit: int = 20,
    **kwargs,
) -> Dict[str, Any]:
    """
    Retrieve user's medical records, optionally filtered by type.

    Args:
        user_id: UUID of the user
        record_type: Optional filter (lab_result, prescription, doctor_note, imaging, vaccination, other)
        limit: Max records to return (default 20)

    Returns:
        Dict with list of medical records (metadata only, not full OCR text)

    Raises:
        ValidationError: Invalid input parameters
        DatabaseError: Database operation failed
    """
    try:
        validate_uuid(user_id, "user_id")

        try:
            validated = GetMedicalRecordsInput(
                user_id=user_id,
                record_type=record_type,
                limit=limit,
            )
        except ValidationError as e:
            error_msg = e.errors()[0]["msg"]
            raise CustomValidationError(
                f"Invalid input: {error_msg}",
                context={"validation_errors": e.errors()},
            )

        supabase = get_supabase_client()

        query = (
            supabase.table("medical_records")
            .select("id,type,title,summary,tags,test_date,created_at")
            .eq("user_id", validated.user_id)
            .order("created_at", desc=True)
            .limit(validated.limit)
        )

        if validated.record_type:
            query = query.eq("type", validated.record_type)

        response = query.execute()
        records = response.data if response.data else []

        logger.info(
            f"Retrieved {len(records)} medical records for user {validated.user_id}"
        )

        return {
            "success": True,
            "records_found": len(records),
            "records": records,
            "filter": validated.record_type or "all",
            "message": (
                f"Found {len(records)} medical record(s)"
                + (f" of type '{validated.record_type}'" if validated.record_type else "")
            ),
        }

    except CustomValidationError:
        raise
    except DatabaseError:
        raise
    except Exception as e:
        logger.error(
            "Unexpected error retrieving medical records",
            extra={"user_id": user_id},
            exc_info=True,
        )
        raise DatabaseError(
            "Failed to retrieve medical records",
            context={"user_id": user_id, "error": str(e)},
        )
