"""
Unified Database Service for PAM - Centralized database access layer
Provides full CRUD operations for all 39 tables with caching and optimization
"""
from typing import Dict, Any, List, Optional, Union
from datetime import datetime
import asyncio
from contextlib import asynccontextmanager
from app.database.supabase_client import get_supabase_client, get_supabase_service
from app.core.logging import get_logger
from app.services.cache import cache_service
from app.services.pam.database.performance_optimizer import get_performance_optimizer
import json
import time

logger = get_logger("pam_database_service")


class TableCRUD:
    """Generic CRUD operations for any table"""
    
    def __init__(self, table_name: str, client, cache_enabled: bool = True):
        self.table_name = table_name
        self.client = client
        self.cache_enabled = cache_enabled
        self.logger = get_logger(f"table_crud_{table_name}")
    
    async def create(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new record"""
        try:
            result = self.client.table(self.table_name).insert(data).execute()
            if self.cache_enabled:
                await self._invalidate_cache()
            return {"success": True, "data": result.data[0] if result.data else None}
        except Exception as e:
            self.logger.error(f"Create failed for {self.table_name}: {e}")
            return {"success": False, "error": str(e)}
    
    async def read(self, filters: Dict[str, Any] = None, limit: int = None) -> Dict[str, Any]:
        """Read records with optional filters"""
        start_time = time.time()
        try:
            # Get optimization hints
            optimizer = get_performance_optimizer()
            opt_hints = await optimizer.optimize_query(self.table_name, filters, limit)
            
            # Use optimized cache key
            cache_key = opt_hints["cache_key"]
            
            if self.cache_enabled:
                cached = await cache_service.get(cache_key)
                if cached:
                    optimizer.update_cache_stats(hit=True)
                    query_time = (time.time() - start_time) * 1000
                    return {"success": True, "data": cached, "from_cache": True, "query_time_ms": query_time}
            
            # Build query
            query = self.client.table(self.table_name).select("*")
            
            # Apply filters
            if filters:
                for key, value in filters.items():
                    if isinstance(value, dict):
                        # Handle complex filters like {"gt": 10}
                        for op, val in value.items():
                            if op == "gt":
                                query = query.gt(key, val)
                            elif op == "gte":
                                query = query.gte(key, val)
                            elif op == "lt":
                                query = query.lt(key, val)
                            elif op == "lte":
                                query = query.lte(key, val)
                            elif op == "neq":
                                query = query.neq(key, val)
                            elif op == "in":
                                query = query.in_(key, val)
                    else:
                        query = query.eq(key, value)
            
            if limit:
                query = query.limit(limit)
            
            result = query.execute()
            
            # Cache result with optimized TTL
            if self.cache_enabled and result.data:
                optimizer.update_cache_stats(hit=False)
                # Use longer TTL for frequently accessed tables
                ttl = 600 if self.table_name in ['profiles', 'budgets', 'calendar_events'] else 300
                await cache_service.set(cache_key, result.data, ttl=ttl)
            
            query_time = (time.time() - start_time) * 1000
            return {"success": True, "data": result.data or [], "query_time_ms": query_time}
            
        except Exception as e:
            self.logger.error(f"Read failed for {self.table_name}: {e}")
            return {"success": False, "error": str(e), "data": []}
    
    async def update(self, filters: Dict[str, Any], data: Dict[str, Any]) -> Dict[str, Any]:
        """Update records matching filters"""
        try:
            query = self.client.table(self.table_name).update(data)
            
            # Apply filters
            for key, value in filters.items():
                query = query.eq(key, value)
            
            result = query.execute()
            
            if self.cache_enabled:
                await self._invalidate_cache()
            
            return {"success": True, "data": result.data or [], "count": len(result.data or [])}
            
        except Exception as e:
            self.logger.error(f"Update failed for {self.table_name}: {e}")
            return {"success": False, "error": str(e)}
    
    async def delete(self, filters: Dict[str, Any]) -> Dict[str, Any]:
        """Delete records matching filters"""
        try:
            query = self.client.table(self.table_name).delete()
            
            # Apply filters
            for key, value in filters.items():
                query = query.eq(key, value)
            
            result = query.execute()
            
            if self.cache_enabled:
                await self._invalidate_cache()
            
            return {"success": True, "data": result.data or [], "count": len(result.data or [])}
            
        except Exception as e:
            self.logger.error(f"Delete failed for {self.table_name}: {e}")
            return {"success": False, "error": str(e)}
    
    async def upsert(self, data: Union[Dict[str, Any], List[Dict[str, Any]]]) -> Dict[str, Any]:
        """Insert or update records"""
        try:
            result = self.client.table(self.table_name).upsert(data).execute()
            
            if self.cache_enabled:
                await self._invalidate_cache()
            
            return {"success": True, "data": result.data or []}
            
        except Exception as e:
            self.logger.error(f"Upsert failed for {self.table_name}: {e}")
            return {"success": False, "error": str(e)}
    
    async def count(self, filters: Dict[str, Any] = None) -> Dict[str, Any]:
        """Count records matching filters"""
        try:
            query = self.client.table(self.table_name).select("*", count='exact')
            
            if filters:
                for key, value in filters.items():
                    query = query.eq(key, value)
            
            result = query.execute()
            
            return {"success": True, "count": result.count or 0}
            
        except Exception as e:
            self.logger.error(f"Count failed for {self.table_name}: {e}")
            return {"success": False, "error": str(e), "count": 0}
    
    async def _invalidate_cache(self):
        """Invalidate all cache entries for this table"""
        try:
            # Simple pattern matching for cache invalidation
            await cache_service.delete_pattern(f"{self.table_name}:*")
        except Exception as e:
            self.logger.warning(f"Cache invalidation failed: {e}")


class PamDatabaseService:
    """Unified database service for all PAM operations"""
    
    # Define all 39 tables
    ALL_TABLES = [
        # User Management
        "profiles", "admin_users", "user_active_sessions",
        
        # PAM Core
        "pam_analytics_logs", "pam_conversation_memory", "pam_conversation_sessions",
        "pam_memory", "pam_user_context", "pam_learning_events", "pam_feedback",
        
        # Financial
        "expenses", "budgets", "budget_categories", "income_entries",
        
        # Vehicle & Maintenance
        "maintenance_records", "fuel_log", "fuel_stations",
        
        # Location & Travel
        "local_events", "camping_locations", "calendar_events", "offroad_routes", "manual_waypoints",
        
        # Business & Hustles
        "youtube_hustles", "hustle_ideas", "user_hustle_attempts",
        
        # E-commerce
        "affiliate_products", "affiliate_sales",
        
        # Social
        "social_groups", "group_memberships", "social_posts", "marketplace_listings", "facebook_groups",
        
        # Analytics & Monitoring
        "analytics_summary", "analytics_daily", "active_recommendations",
        
        # Other
        "chat_sessions", "audio_cache"
    ]
    
    # Tables that need service-level access (bypass RLS)
    SERVICE_TABLES = ["admin_users", "pam_analytics_logs", "analytics_summary", "analytics_daily"]
    
    def __init__(self):
        self.client = get_supabase_client()
        self.service_client = get_supabase_service()
        self.logger = logger
        self._table_crud_cache: Dict[str, TableCRUD] = {}
        self._initialized = False
        self._connection_semaphore = asyncio.Semaphore(20)  # Limit concurrent connections
        self._query_batch_queue = asyncio.Queue()
        self._batch_processor_task = None
    
    async def initialize(self):
        """Initialize the database service"""
        if self._initialized:
            return
        
        # Start batch processor
        self._batch_processor_task = asyncio.create_task(self._process_batch_queue())
        
        # Pre-warm frequently accessed table connections
        frequent_tables = ['profiles', 'expenses', 'calendar_events', 'budgets']
        for table in frequent_tables:
            await self.get_table(table)
        
        self.logger.info("Initializing PAM Database Service...")
        
        # Pre-create CRUD instances for frequently used tables
        frequent_tables = ["profiles", "expenses", "budgets", "calendar_events", "pam_memory"]
        for table in frequent_tables:
            await self.get_table(table)
        
        self._initialized = True
        self.logger.info("PAM Database Service initialized successfully")
    
    async def get_table(self, table_name: str, use_service_client: bool = False) -> TableCRUD:
        """Get CRUD operations for a specific table"""
        if table_name not in self.ALL_TABLES:
            raise ValueError(f"Unknown table: {table_name}")
        
        # Check if we should use service client
        if table_name in self.SERVICE_TABLES or use_service_client:
            client = self.service_client
            cache_key = f"{table_name}_service"
        else:
            client = self.client
            cache_key = table_name
        
        # Return cached instance if available
        if cache_key in self._table_crud_cache:
            return self._table_crud_cache[cache_key]
        
        # Create new instance
        crud = TableCRUD(table_name, client)
        self._table_crud_cache[cache_key] = crud
        
        return crud
    
    @asynccontextmanager
    async def transaction(self):
        """Context manager for database transactions"""
        # Note: Supabase doesn't support client-side transactions
        # This is a placeholder for future enhancement
        try:
            yield self
        except Exception as e:
            self.logger.error(f"Transaction failed: {e}")
            raise
    
    async def execute_raw_query(self, query: str, params: Dict[str, Any] = None) -> Dict[str, Any]:
        """Execute raw SQL query (for complex operations)"""
        try:
            # Note: Supabase Python client doesn't support raw queries directly
            # This would need to be implemented via RPC function in database
            return {"success": False, "error": "Raw queries not yet implemented"}
        except Exception as e:
            self.logger.error(f"Raw query failed: {e}")
            return {"success": False, "error": str(e)}
    
    async def bulk_operation(self, operations: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Execute multiple operations in sequence with optimization"""
        # Get optimizer for bulk operation optimization
        optimizer = get_performance_optimizer()
        optimized_ops = await optimizer.optimize_bulk_operations(operations)
        
        results = []
        success = True
        
        # Process with connection limiting
        async with self._connection_semaphore:
            for op in optimized_ops:
                table_name = op.get("table")
                operation = op.get("operation")
                data = op.get("data")
                filters = op.get("filters")
                
                try:
                    table = await self.get_table(table_name)
                    
                    if operation == "create":
                        result = await table.create(data)
                    elif operation == "read":
                        result = await table.read(filters)
                    elif operation == "update":
                        result = await table.update(filters, data)
                    elif operation == "delete":
                        result = await table.delete(filters)
                    elif operation == "upsert":
                        result = await table.upsert(data)
                    else:
                        result = {"success": False, "error": f"Unknown operation: {operation}"}
                    
                    results.append(result)
                    if not result.get("success"):
                        success = False
                        
                except Exception as e:
                    self.logger.error(f"Bulk operation failed: {e}")
                    results.append({"success": False, "error": str(e)})
                    success = False
        
        return {"success": success, "results": results}
    
    async def _process_batch_queue(self):
        """Process batched queries for better performance"""
        while True:
            try:
                # Collect queries for batching
                batch = []
                deadline = asyncio.get_event_loop().time() + 0.01  # 10ms window
                
                while asyncio.get_event_loop().time() < deadline and len(batch) < 10:
                    try:
                        query = await asyncio.wait_for(
                            self._query_batch_queue.get(),
                            timeout=max(0.001, deadline - asyncio.get_event_loop().time())
                        )
                        batch.append(query)
                    except asyncio.TimeoutError:
                        break
                
                if batch:
                    # Process batch
                    await self._execute_batch(batch)
                    
            except Exception as e:
                self.logger.error(f"Batch processor error: {e}")
                await asyncio.sleep(1)
    
    async def _execute_batch(self, batch: List[Dict[str, Any]]):
        """Execute a batch of queries efficiently"""
        # Group by table for better performance
        grouped = {}
        for query in batch:
            table = query['table']
            if table not in grouped:
                grouped[table] = []
            grouped[table].append(query)
        
        # Execute grouped queries
        for table, queries in grouped.items():
            try:
                # Process queries for this table
                for query in queries:
                    # Execute and return result via future
                    result = await self._execute_single_query(query)
                    query['future'].set_result(result)
            except Exception as e:
                # Set exception for all queries in this group
                for query in queries:
                    query['future'].set_exception(e)
    
    async def _execute_single_query(self, query: Dict[str, Any]) -> Dict[str, Any]:
        """Execute a single query from the batch"""
        table = await self.get_table(query['table'])
        operation = query['operation']
        
        if operation == 'read':
            return await table.read(query.get('filters'), query.get('limit'))
        elif operation == 'create':
            return await table.create(query.get('data'))
        elif operation == 'update':
            return await table.update(query.get('filters'), query.get('data'))
        else:
            return {"success": False, "error": f"Unsupported batch operation: {operation}"}
    
    async def get_table_stats(self) -> Dict[str, Any]:
        """Get statistics for all tables"""
        stats = {}
        
        for table in self.ALL_TABLES:
            try:
                crud = await self.get_table(table, use_service_client=True)
                count_result = await crud.count()
                stats[table] = count_result.get("count", 0)
            except Exception as e:
                self.logger.warning(f"Could not get stats for {table}: {e}")
                stats[table] = -1
        
        return stats
    
    async def health_check(self) -> Dict[str, Any]:
        """Check database connection and table accessibility"""
        try:
            # Test basic connectivity
            test_table = await self.get_table("profiles")
            result = await test_table.read(limit=1)
            
            if result.get("success"):
                return {
                    "healthy": True,
                    "message": "Database connection successful",
                    "tables_accessible": len(self.ALL_TABLES)
                }
            else:
                return {
                    "healthy": False,
                    "message": "Database query failed",
                    "error": result.get("error")
                }
                
        except Exception as e:
            return {
                "healthy": False,
                "message": "Database connection failed",
                "error": str(e)
            }


# Singleton instance
_pam_database_service = None

async def get_pam_database_service() -> PamDatabaseService:
    """Get or create the PAM database service singleton"""
    global _pam_database_service
    
    if _pam_database_service is None:
        _pam_database_service = PamDatabaseService()
        await _pam_database_service.initialize()
    
    return _pam_database_service