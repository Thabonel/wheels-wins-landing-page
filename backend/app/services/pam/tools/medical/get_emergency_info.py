"""Get Emergency Info Tool for PAM

Retrieve user's emergency medical information.
"""

import logging
from typing import Any, Dict
from pydantic import ValidationError

from app.integrations.supabase import get_supabase_client
from app.services.pam.schemas.medical import GetEmergencyInfoInput
from app.services.pam.tools.exceptions import (
    ValidationError as CustomValidationError,
    DatabaseError,
)
from app.services.pam.tools.utils import validate_uuid

logger = logging.getLogger(__name__)


async def get_emergency_info(
    user_id: str,
    **kwargs,
) -> Dict[str, Any]:
    """
    Retrieve user's emergency medical information.

    Args:
        user_id: UUID of the user

    Returns:
        Dict with blood type, allergies, conditions, emergency contacts, doctor, insurance

    Raises:
        ValidationError: Invalid input parameters
        DatabaseError: Database operation failed
    """
    try:
        validate_uuid(user_id, "user_id")

        try:
            validated = GetEmergencyInfoInput(user_id=user_id)
        except ValidationError as e:
            error_msg = e.errors()[0]["msg"]
            raise CustomValidationError(
                f"Invalid input: {error_msg}",
                context={"validation_errors": e.errors()},
            )

        supabase = get_supabase_client()

        response = (
            supabase.table("medical_emergency_info")
            .select("*")
            .eq("user_id", validated.user_id)
            .limit(1)
            .execute()
        )

        if not response.data or len(response.data) == 0:
            logger.info(
                f"No emergency info found for user {validated.user_id}"
            )
            return {
                "success": True,
                "has_emergency_info": False,
                "emergency_info": None,
                "message": "No emergency medical information on file. You can add it in the Medical section of the app.",
            }

        info = response.data[0]

        logger.info(
            f"Retrieved emergency info for user {validated.user_id}"
        )

        return {
            "success": True,
            "has_emergency_info": True,
            "emergency_info": {
                "blood_type": info.get("blood_type"),
                "allergies": info.get("allergies"),
                "medical_conditions": info.get("medical_conditions"),
                "emergency_contacts": info.get("emergency_contacts"),
                "primary_doctor": info.get("primary_doctor"),
                "insurance_info": info.get("insurance_info"),
            },
            "message": "Emergency medical information retrieved successfully.",
        }

    except CustomValidationError:
        raise
    except DatabaseError:
        raise
    except Exception as e:
        logger.error(
            "Unexpected error retrieving emergency info",
            extra={"user_id": user_id},
            exc_info=True,
        )
        raise DatabaseError(
            "Failed to retrieve emergency info",
            context={"user_id": user_id, "error": str(e)},
        )
