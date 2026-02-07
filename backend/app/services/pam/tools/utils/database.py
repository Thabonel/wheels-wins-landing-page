"""
Database Utilities

Reusable database operations with consistent error handling.
"""

from typing import Dict, Any, List, Optional, Union
import logging

from app.core.database import get_supabase_client
from app.services.pam.tools.exceptions import (
    DatabaseError,
    AuthorizationError,
    ResourceNotFoundError,
)

logger = logging.getLogger(__name__)


async def get_user_profile(user_id: str) -> Dict[str, Any]:
    """
    Get user profile by ID.

    Args:
        user_id: User's UUID

    Returns:
        User profile data

    Raises:
        AuthorizationError: If user not found
        DatabaseError: If database operation fails
    """
    try:
        supabase = get_supabase_client()
        result = supabase.table("profiles").select("*").eq("id", user_id).single().execute()

        if not result.data:
            raise AuthorizationError(
                "User not found",
                context={"user_id": user_id}
            )

        return result.data

    except AuthorizationError:
        raise
    except Exception as e:
        logger.error(f"Database error fetching user profile", extra={"user_id": user_id}, exc_info=True)
        raise DatabaseError(
            "Failed to retrieve user profile",
            context={"user_id": user_id, "error": str(e)}
        )


async def safe_db_insert(
    table: str,
    data: Dict[str, Any],
    user_id: str
) -> Dict[str, Any]:
    """
    Safely insert record into database with error handling.

    Args:
        table: Table name
        data: Data to insert
        user_id: User ID (for logging/context)

    Returns:
        Inserted record

    Raises:
        DatabaseError: If insert fails
    """
    try:
        supabase = get_supabase_client()
        result = supabase.table(table).insert(data).execute()

        if not result.data:
            raise DatabaseError(
                f"Failed to insert into {table}",
                context={"table": table, "user_id": user_id}
            )

        return result.data[0]

    except Exception as e:
        logger.error(
            f"Database error inserting into {table}",
            extra={"table": table, "user_id": user_id},
            exc_info=True
        )
        raise DatabaseError(
            f"Database error inserting into {table}",
            context={"table": table, "user_id": user_id, "error": str(e)}
        )


async def safe_db_update(
    table: str,
    record_id: Any,
    data: Dict[str, Any],
    user_id: str,
    id_column: str = "id"
) -> Dict[str, Any]:
    """
    Safely update record in database with error handling.

    Args:
        table: Table name
        record_id: Record ID to update
        data: Data to update
        user_id: User ID (for logging/context)
        id_column: ID column name (default: 'id')

    Returns:
        Updated record

    Raises:
        ResourceNotFoundError: If record not found
        DatabaseError: If update fails
    """
    try:
        supabase = get_supabase_client()
        result = supabase.table(table).update(data).eq(id_column, record_id).execute()

        if not result.data:
            raise ResourceNotFoundError(
                f"Record not found in {table}",
                context={"table": table, id_column: record_id, "user_id": user_id}
            )

        return result.data[0]

    except ResourceNotFoundError:
        raise
    except Exception as e:
        logger.error(
            f"Database error updating {table}",
            extra={"table": table, id_column: record_id, "user_id": user_id},
            exc_info=True
        )
        raise DatabaseError(
            f"Database error updating {table}",
            context={"table": table, id_column: record_id, "user_id": user_id, "error": str(e)}
        )


async def safe_db_delete(
    table: str,
    record_id: Any,
    user_id: str,
    id_column: str = "id"
) -> None:
    """
    Safely delete record from database with error handling.

    Args:
        table: Table name
        record_id: Record ID to delete
        user_id: User ID (for logging/context)
        id_column: ID column name (default: 'id')

    Raises:
        DatabaseError: If delete fails
    """
    try:
        supabase = get_supabase_client()
        supabase.table(table).delete().eq(id_column, record_id).execute()

    except Exception as e:
        logger.error(
            f"Database error deleting from {table}",
            extra={"table": table, id_column: record_id, "user_id": user_id},
            exc_info=True
        )
        raise DatabaseError(
            f"Database error deleting from {table}",
            context={"table": table, id_column: record_id, "user_id": user_id, "error": str(e)}
        )


async def safe_db_select(
    table: str,
    filters: Optional[Dict[str, Any]] = None,
    user_id: Optional[str] = None,
    # Support both 'select' and 'columns' for backward compatibility
    select: str = "*",
    columns: Optional[str] = None,
    # Add 'single' parameter for single record return
    single: bool = False,
    # Existing optional parameters
    order_by: Optional[str] = None,
    order_desc: bool = False,
    limit: Optional[int] = None
) -> Union[List[Dict[str, Any]], Dict[str, Any], None]:
    """
    Safely select records from database with error handling.
    Updated with backward compatibility for all PAM tool usage patterns.

    Args:
        table: Table name
        filters: Dict of column: value filters (optional for backward compatibility)
        user_id: User ID (optional for logging/context)
        select: Columns to select (default: '*')
        columns: Alias for select parameter (backward compatibility)
        single: Return single record instead of list
        order_by: Column to order by (optional)
        order_desc: Sort descending (default: False)
        limit: Limit number of results (optional)

    Returns:
        List of matching records, or single record if single=True

    Raises:
        DatabaseError: If select fails
    """
    try:
        # Handle parameter compatibility
        if columns is not None:
            select = columns

        if filters is None:
            filters = {}

        supabase = get_supabase_client()
        query = supabase.table(table).select(select)

        # Apply filters
        for column, value in filters.items():
            query = query.eq(column, value)

        # Apply ordering
        if order_by:
            query = query.order(order_by, desc=order_desc)

        # Apply limit
        if limit:
            query = query.limit(limit)

        result = query.execute()
        data = result.data or []

        # Handle single record return
        if single:
            return data[0] if data else None

        return data

    except Exception as e:
        logger.error(
            f"Database error selecting from {table}",
            extra={"table": table, "filters": filters, "user_id": user_id},
            exc_info=True
        )
        raise DatabaseError(
            f"Database error selecting from {table}",
            context={"table": table, "filters": filters, "user_id": user_id, "error": str(e)}
        )
