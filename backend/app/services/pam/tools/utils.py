"""
PAM Tool Utilities

Shared validation and database operation utilities for PAM tools.
"""

import logging
import uuid
from typing import Dict, Any, Optional, List
from datetime import datetime

from app.core.database import get_supabase_client
from app.services.pam.tools.exceptions import (
    ValidationError,
    DatabaseError,
    ResourceNotFoundError,
)

logger = logging.getLogger(__name__)


def validate_uuid(value: str, field_name: str) -> None:
    """
    Validate that a string is a valid UUID.

    Args:
        value: The value to validate
        field_name: The name of the field (for error messages)

    Raises:
        ValidationError: If the value is not a valid UUID
    """
    if not value:
        raise ValidationError(
            f"{field_name} is required",
            context={"field": field_name}
        )

    try:
        uuid.UUID(str(value))
    except (ValueError, AttributeError):
        raise ValidationError(
            f"Invalid {field_name}: must be a valid UUID",
            context={"field": field_name, "value": value}
        )


def validate_positive_number(value: float, field_name: str) -> None:
    """
    Validate that a number is positive.

    Args:
        value: The value to validate
        field_name: The name of the field (for error messages)

    Raises:
        ValidationError: If the value is not positive
    """
    try:
        num = float(value)
        if num <= 0:
            raise ValidationError(
                f"{field_name} must be positive",
                context={"field": field_name, "value": value}
            )
    except (ValueError, TypeError):
        raise ValidationError(
            f"Invalid {field_name}: must be a number",
            context={"field": field_name, "value": value}
        )


def validate_date_format(value: str, field_name: str) -> None:
    """
    Validate that a string is a valid ISO date format.

    Args:
        value: The value to validate (ISO date string)
        field_name: The name of the field (for error messages)

    Raises:
        ValidationError: If the value is not a valid ISO date
    """
    try:
        datetime.fromisoformat(value.replace('Z', '+00:00'))
    except (ValueError, AttributeError):
        raise ValidationError(
            f"Invalid {field_name}: must be in ISO format (YYYY-MM-DD or YYYY-MM-DDTHH:MM:SS)",
            context={"field": field_name, "value": value}
        )


async def safe_db_insert(
    table_name: str,
    data: Dict[str, Any],
    user_id: Optional[str] = None
) -> Dict[str, Any]:
    """
    Safely insert a record into the database.

    Args:
        table_name: Name of the table
        data: Data to insert
        user_id: Optional user_id for logging context

    Returns:
        The inserted record

    Raises:
        DatabaseError: If the insert fails
    """
    try:
        supabase = get_supabase_client()
        result = supabase.table(table_name).insert(data).execute()

        if result.data and len(result.data) > 0:
            return result.data[0]
        else:
            raise DatabaseError(
                f"Failed to insert into {table_name}: no data returned",
                context={"table": table_name, "user_id": user_id}
            )

    except Exception as e:
        logger.error(
            f"Database insert error in {table_name}",
            extra={"table": table_name, "user_id": user_id},
            exc_info=True
        )
        raise DatabaseError(
            f"Failed to insert into {table_name}",
            context={"table": table_name, "user_id": user_id, "error": str(e)}
        )


async def safe_db_update(
    table_name: str,
    record_id: str,
    data: Dict[str, Any],
    user_id: Optional[str] = None
) -> Dict[str, Any]:
    """
    Safely update a record in the database.

    Args:
        table_name: Name of the table
        record_id: ID of the record to update
        data: Data to update
        user_id: Optional user_id for logging context

    Returns:
        The updated record

    Raises:
        DatabaseError: If the update fails
    """
    try:
        supabase = get_supabase_client()
        result = supabase.table(table_name).update(data).eq("id", record_id).execute()

        if result.data and len(result.data) > 0:
            return result.data[0]
        else:
            raise DatabaseError(
                f"Failed to update {table_name}: no data returned",
                context={"table": table_name, "record_id": record_id, "user_id": user_id}
            )

    except Exception as e:
        logger.error(
            f"Database update error in {table_name}",
            extra={"table": table_name, "record_id": record_id, "user_id": user_id},
            exc_info=True
        )
        raise DatabaseError(
            f"Failed to update {table_name}",
            context={"table": table_name, "record_id": record_id, "user_id": user_id, "error": str(e)}
        )


async def safe_db_delete(
    table_name: str,
    record_id: str,
    user_id: Optional[str] = None
) -> None:
    """
    Safely delete a record from the database.

    Args:
        table_name: Name of the table
        record_id: ID of the record to delete
        user_id: Optional user_id for logging context

    Raises:
        DatabaseError: If the delete fails
    """
    try:
        supabase = get_supabase_client()
        result = supabase.table(table_name).delete().eq("id", record_id).execute()

        if not result.data or len(result.data) == 0:
            logger.warning(f"Delete from {table_name} returned no data (record may not exist)")

    except Exception as e:
        logger.error(
            f"Database delete error in {table_name}",
            extra={"table": table_name, "record_id": record_id, "user_id": user_id},
            exc_info=True
        )
        raise DatabaseError(
            f"Failed to delete from {table_name}",
            context={"table": table_name, "record_id": record_id, "user_id": user_id, "error": str(e)}
        )


async def safe_db_select(
    table_name: str,
    filters: Optional[Dict[str, Any]] = None,
    user_id: Optional[str] = None
) -> List[Dict[str, Any]]:
    """
    Safely select records from the database.

    Args:
        table_name: Name of the table
        filters: Optional filters to apply (dict of column: value)
        user_id: Optional user_id for logging context

    Returns:
        List of matching records

    Raises:
        DatabaseError: If the select fails
    """
    try:
        supabase = get_supabase_client()
        query = supabase.table(table_name).select("*")

        if filters:
            for column, value in filters.items():
                query = query.eq(column, value)

        result = query.execute()
        return result.data or []

    except Exception as e:
        logger.error(
            f"Database select error in {table_name}",
            extra={"table": table_name, "filters": filters, "user_id": user_id},
            exc_info=True
        )
        raise DatabaseError(
            f"Failed to select from {table_name}",
            context={"table": table_name, "user_id": user_id, "error": str(e)}
        )
