"""
Database Management Tools - Provides full CRUD access to all 39 tables
These tools give PAM complete control over the database
"""
from typing import Any, Dict, List, Optional, Union
from langchain_core.tools import tool
from app.services.pam.database.unified_database_service import get_pam_database_service
from app.core.logging import get_logger

logger = get_logger("pam_database_tools")


@tool
async def pam_create_record(table_name: str, data: Dict[str, Any], user_id: str = None) -> Dict[str, Any]:
    """
    Create a new record in any table. Provides full database write access.
    
    Args:
        table_name: Name of the table (e.g., 'profiles', 'maintenance_records')
        data: Dictionary containing the record data
        user_id: Optional user ID for user-scoped tables
    
    Returns:
        Created record or error message
    """
    try:
        db = await get_pam_database_service()
        
        # Add user_id to data if provided and not already present
        if user_id and 'user_id' not in data:
            data['user_id'] = user_id
        
        table = await db.get_table(table_name)
        result = await table.create(data)
        
        if result.get("success"):
            logger.info(f"Created record in {table_name}: {result.get('data')}")
            return {"success": True, "data": result.get("data"), "table": table_name}
        else:
            return {"success": False, "error": result.get("error"), "table": table_name}
            
    except Exception as e:
        logger.error(f"Failed to create record in {table_name}: {e}")
        return {"success": False, "error": str(e), "table": table_name}


@tool
async def pam_read_records(
    table_name: str, 
    filters: Optional[Dict[str, Any]] = None, 
    limit: Optional[int] = None,
    user_id: Optional[str] = None
) -> Dict[str, Any]:
    """
    Read records from any table with optional filtering.
    
    Args:
        table_name: Name of the table
        filters: Optional filters as key-value pairs or complex filters
        limit: Maximum number of records to return
        user_id: Optional user ID for automatic user filtering
    
    Returns:
        List of records or error message
    """
    try:
        db = await get_pam_database_service()
        
        # Add user filter if applicable
        if user_id and filters is None:
            filters = {"user_id": user_id}
        elif user_id and filters and "user_id" not in filters:
            filters["user_id"] = user_id
        
        table = await db.get_table(table_name)
        result = await table.read(filters=filters, limit=limit)
        
        if result.get("success"):
            return {
                "success": True, 
                "data": result.get("data", []), 
                "count": len(result.get("data", [])),
                "table": table_name,
                "from_cache": result.get("from_cache", False)
            }
        else:
            return {"success": False, "error": result.get("error"), "table": table_name}
            
    except Exception as e:
        logger.error(f"Failed to read from {table_name}: {e}")
        return {"success": False, "error": str(e), "table": table_name}


@tool
async def pam_update_records(
    table_name: str,
    filters: Dict[str, Any],
    data: Dict[str, Any],
    user_id: Optional[str] = None
) -> Dict[str, Any]:
    """
    Update records in any table matching the filters.
    
    Args:
        table_name: Name of the table
        filters: Filters to identify records to update
        data: New data to set
        user_id: Optional user ID for safety filtering
    
    Returns:
        Updated records or error message
    """
    try:
        db = await get_pam_database_service()
        
        # Add user filter for safety if applicable
        if user_id and "user_id" not in filters:
            filters["user_id"] = user_id
        
        table = await db.get_table(table_name)
        result = await table.update(filters=filters, data=data)
        
        if result.get("success"):
            logger.info(f"Updated {result.get('count', 0)} records in {table_name}")
            return {
                "success": True,
                "data": result.get("data", []),
                "count": result.get("count", 0),
                "table": table_name
            }
        else:
            return {"success": False, "error": result.get("error"), "table": table_name}
            
    except Exception as e:
        logger.error(f"Failed to update records in {table_name}: {e}")
        return {"success": False, "error": str(e), "table": table_name}


@tool
async def pam_delete_records(
    table_name: str,
    filters: Dict[str, Any],
    user_id: Optional[str] = None,
    confirm: bool = False
) -> Dict[str, Any]:
    """
    Delete records from any table matching the filters.
    
    Args:
        table_name: Name of the table
        filters: Filters to identify records to delete
        user_id: Optional user ID for safety filtering
        confirm: Must be True to actually delete (safety measure)
    
    Returns:
        Deleted records or error message
    """
    try:
        if not confirm:
            return {
                "success": False,
                "error": "Deletion requires confirm=True for safety",
                "table": table_name
            }
        
        db = await get_pam_database_service()
        
        # Add user filter for safety if applicable
        if user_id and "user_id" not in filters:
            filters["user_id"] = user_id
        
        table = await db.get_table(table_name)
        result = await table.delete(filters=filters)
        
        if result.get("success"):
            logger.info(f"Deleted {result.get('count', 0)} records from {table_name}")
            return {
                "success": True,
                "data": result.get("data", []),
                "count": result.get("count", 0),
                "table": table_name
            }
        else:
            return {"success": False, "error": result.get("error"), "table": table_name}
            
    except Exception as e:
        logger.error(f"Failed to delete records from {table_name}: {e}")
        return {"success": False, "error": str(e), "table": table_name}


@tool
async def pam_upsert_records(
    table_name: str,
    data: Union[Dict[str, Any], List[Dict[str, Any]]],
    user_id: Optional[str] = None
) -> Dict[str, Any]:
    """
    Insert or update records in any table (upsert operation).
    
    Args:
        table_name: Name of the table
        data: Single record or list of records to upsert
        user_id: Optional user ID to add to records
    
    Returns:
        Upserted records or error message
    """
    try:
        db = await get_pam_database_service()
        
        # Add user_id to data if provided
        if user_id:
            if isinstance(data, dict):
                if 'user_id' not in data:
                    data['user_id'] = user_id
            elif isinstance(data, list):
                for record in data:
                    if 'user_id' not in record:
                        record['user_id'] = user_id
        
        table = await db.get_table(table_name)
        result = await table.upsert(data)
        
        if result.get("success"):
            logger.info(f"Upserted records in {table_name}")
            return {"success": True, "data": result.get("data", []), "table": table_name}
        else:
            return {"success": False, "error": result.get("error"), "table": table_name}
            
    except Exception as e:
        logger.error(f"Failed to upsert records in {table_name}: {e}")
        return {"success": False, "error": str(e), "table": table_name}


@tool
async def pam_count_records(
    table_name: str,
    filters: Optional[Dict[str, Any]] = None,
    user_id: Optional[str] = None
) -> Dict[str, Any]:
    """
    Count records in any table with optional filtering.
    
    Args:
        table_name: Name of the table
        filters: Optional filters as key-value pairs
        user_id: Optional user ID for automatic user filtering
    
    Returns:
        Record count or error message
    """
    try:
        db = await get_pam_database_service()
        
        # Add user filter if applicable
        if user_id:
            if filters is None:
                filters = {"user_id": user_id}
            elif "user_id" not in filters:
                filters["user_id"] = user_id
        
        table = await db.get_table(table_name)
        result = await table.count(filters=filters)
        
        if result.get("success"):
            return {
                "success": True,
                "count": result.get("count", 0),
                "table": table_name
            }
        else:
            return {"success": False, "error": result.get("error"), "table": table_name}
            
    except Exception as e:
        logger.error(f"Failed to count records in {table_name}: {e}")
        return {"success": False, "error": str(e), "table": table_name}


@tool
async def pam_bulk_database_operation(operations: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Execute multiple database operations in sequence.
    
    Args:
        operations: List of operations, each containing:
            - table: Table name
            - operation: One of 'create', 'read', 'update', 'delete', 'upsert'
            - data: Data for the operation (for create, update, upsert)
            - filters: Filters for the operation (for read, update, delete)
    
    Returns:
        Results of all operations
    """
    try:
        db = await get_pam_database_service()
        result = await db.bulk_operation(operations)
        
        return {
            "success": result.get("success", False),
            "results": result.get("results", []),
            "total_operations": len(operations)
        }
        
    except Exception as e:
        logger.error(f"Failed to execute bulk operations: {e}")
        return {"success": False, "error": str(e)}


@tool
async def pam_get_database_stats() -> Dict[str, Any]:
    """
    Get record counts for all tables in the database.
    
    Returns:
        Dictionary with table names and their record counts
    """
    try:
        db = await get_pam_database_service()
        stats = await db.get_table_stats()
        
        return {
            "success": True,
            "stats": stats,
            "total_tables": len(stats),
            "total_records": sum(v for v in stats.values() if v >= 0)
        }
        
    except Exception as e:
        logger.error(f"Failed to get database stats: {e}")
        return {"success": False, "error": str(e)}


@tool
async def pam_check_database_health() -> Dict[str, Any]:
    """
    Check database connection and accessibility.
    
    Returns:
        Health status of the database
    """
    try:
        db = await get_pam_database_service()
        health = await db.health_check()
        
        return health
        
    except Exception as e:
        logger.error(f"Failed to check database health: {e}")
        return {
            "healthy": False,
            "message": "Health check failed",
            "error": str(e)
        }