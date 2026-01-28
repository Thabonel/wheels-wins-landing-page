from typing import Dict, Any, Optional
from app.integrations.supabase import get_supabase_client
from app.services.pam.tools.exceptions import (
    ValidationError,
    DatabaseError,
)
from app.services.pam.tools.utils import (
    validate_uuid,
    validate_positive_number,
    validate_date_format,
    safe_db_select,
)
import logging

logger = logging.getLogger(__name__)

DEFAULT_FUEL_LOG_LIMIT = 10

async def get_fuel_log(
    user_id: str,
    limit: int = DEFAULT_FUEL_LOG_LIMIT,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None
) -> Dict[str, Any]:
    try:
        validate_uuid(user_id, "user_id")
        validate_positive_number(limit, "limit")

        if start_date:
            validate_date_format(start_date, "start_date")

        if end_date:
            validate_date_format(end_date, "end_date")

        supabase = get_supabase_client()

        query = (
            supabase.table("fuel_log")
            .select("date, gallons, litres, cost, location, odometer, mpg")
            .eq("user_id", user_id)
            .order("date", desc=True)
            .limit(limit)
        )

        if start_date:
            query = query.gte("date", start_date)
        if end_date:
            query = query.lte("date", end_date)

        result = query.execute()

        logger.info(f"Retrieved {len(result.data)} fuel log entries for user {user_id}")

        return {
            "success": True,
            "fuel_logs": result.data,
            "count": len(result.data)
        }

    except ValidationError:
        raise
    except DatabaseError:
        raise
    except Exception as e:
        logger.error(
            f"Unexpected error getting fuel log",
            extra={"user_id": user_id},
            exc_info=True
        )
        raise DatabaseError(
            "Failed to retrieve fuel log",
            context={"user_id": user_id, "error": str(e)}
        )
