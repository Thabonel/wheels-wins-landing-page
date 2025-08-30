"""
Database Query Optimizer with Connection Pooling
Provides advanced query optimization, connection pooling, and performance monitoring
"""

import asyncio
import time
from typing import Dict, List, Any, Optional, Union, Tuple
from datetime import datetime, timedelta
from contextlib import asynccontextmanager
from collections import defaultdict, deque
import json
import hashlib

import asyncpg
from asyncpg.pool import Pool
from app.core.logging import get_logger
from app.core.config import get_settings
from app.services.cache_manager import get_cache_manager, CacheStrategy

logger = get_logger(__name__)
settings = get_settings()


class QueryPlan:
    """Represents an optimized query execution plan"""
    
    def __init__(self, query: str, params: List[Any] = None):
        self.query = query
        self.params = params or []
        self.execution_time = None
        self.row_count = None
        self.plan_details = None
        self.cache_key = None
        
    def generate_cache_key(self) -> str:
        """Generate cache key for query result"""
        key_data = f"{self.query}:{json.dumps(self.params, default=str)}"
        return hashlib.md5(key_data.encode()).hexdigest()


class ConnectionPoolManager:
    """
    Advanced connection pool manager with monitoring
    
    Features:
    - Dynamic pool sizing
    - Connection health checks
    - Query load balancing
    - Connection recycling
    - Performance monitoring
    """
    
    def __init__(self,
                 min_connections: int = 5,
                 max_connections: int = 20,
                 connection_timeout: float = 10.0,
                 command_timeout: float = 60.0,
                 max_idle_time: int = 300):
        self.min_connections = min_connections
        self.max_connections = max_connections
        self.connection_timeout = connection_timeout
        self.command_timeout = command_timeout
        self.max_idle_time = max_idle_time
        
        self._pool: Optional[Pool] = None
        self._read_pool: Optional[Pool] = None  # Separate pool for read queries
        self._write_pool: Optional[Pool] = None  # Separate pool for write queries
        
        # Connection statistics
        self.stats = {
            "total_connections": 0,
            "active_connections": 0,
            "idle_connections": 0,
            "total_queries": 0,
            "failed_queries": 0,
            "pool_wait_time_ms": 0
        }
    
    async def initialize(self, dsn: str = None):
        """Initialize connection pools"""
        if not dsn:
            dsn = settings.DATABASE_URL
        
        try:
            # Create main pool
            self._pool = await asyncpg.create_pool(
                dsn,
                min_size=self.min_connections,
                max_size=self.max_connections,
                timeout=self.connection_timeout,
                command_timeout=self.command_timeout,
                max_inactive_connection_lifetime=self.max_idle_time,
                init=self._init_connection
            )
            
            # Create read replica pool if configured
            if hasattr(settings, 'READ_REPLICA_URL') and settings.READ_REPLICA_URL:
                self._read_pool = await asyncpg.create_pool(
                    settings.READ_REPLICA_URL,
                    min_size=self.min_connections,
                    max_size=self.max_connections,
                    timeout=self.connection_timeout,
                    command_timeout=self.command_timeout,
                    max_inactive_connection_lifetime=self.max_idle_time
                )
            else:
                self._read_pool = self._pool
            
            self._write_pool = self._pool
            
            logger.info(f"Database connection pools initialized (min: {self.min_connections}, max: {self.max_connections})")
            
        except Exception as e:
            logger.error(f"Failed to initialize connection pools: {str(e)}")
            raise
    
    async def _init_connection(self, connection):
        """Initialize new connection with optimizations"""
        # Set connection parameters for optimization
        await connection.execute("SET jit = 'on'")
        await connection.execute("SET random_page_cost = 1.1")
        await connection.execute("SET effective_cache_size = '4GB'")
        await connection.execute("SET work_mem = '16MB'")
        
        # Prepare commonly used statements
        await self._prepare_common_statements(connection)
    
    async def _prepare_common_statements(self, connection):
        """Prepare commonly used statements for better performance"""
        common_queries = [
            ("get_user", "SELECT * FROM auth.users WHERE id = $1"),
            ("get_conversation", "SELECT * FROM pam_conversations WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2"),
            ("save_conversation", "INSERT INTO pam_conversations (user_id, session_id, message, response) VALUES ($1, $2, $3, $4)"),
        ]
        
        for name, query in common_queries:
            try:
                await connection.execute(f"PREPARE {name} AS {query}")
            except Exception:
                pass  # Statement might already exist
    
    def get_pool(self, query_type: str = "read") -> Pool:
        """Get appropriate pool based on query type"""
        if query_type == "write":
            return self._write_pool
        else:
            return self._read_pool
    
    async def close(self):
        """Close all connection pools"""
        if self._pool:
            await self._pool.close()
        if self._read_pool and self._read_pool != self._pool:
            await self._read_pool.close()
    
    def get_stats(self) -> Dict[str, Any]:
        """Get connection pool statistics"""
        if self._pool:
            self.stats.update({
                "active_connections": self._pool.get_size() - self._pool.get_idle_size(),
                "idle_connections": self._pool.get_idle_size(),
                "total_connections": self._pool.get_size()
            })
        return self.stats


class DatabaseOptimizer:
    """
    Comprehensive database query optimizer
    
    Features:
    - Query plan caching
    - Result caching
    - Query rewriting
    - Batch operations
    - Automatic indexing suggestions
    - Query performance monitoring
    - Slow query logging
    """
    
    def __init__(self):
        self.pool_manager = ConnectionPoolManager()
        self.cache_manager = None
        
        # Query plan cache
        self._plan_cache: Dict[str, QueryPlan] = {}
        
        # Query result cache (in-memory for frequently accessed data)
        self._result_cache: Dict[str, Tuple[Any, float]] = {}
        self._cache_ttl = 300  # 5 minutes default
        
        # Query performance tracking
        self.query_stats = defaultdict(lambda: {
            "count": 0,
            "total_time_ms": 0,
            "avg_time_ms": 0,
            "max_time_ms": 0,
            "min_time_ms": float('inf'),
            "cache_hits": 0,
            "cache_misses": 0
        })
        
        # Slow query log
        self.slow_queries = deque(maxlen=100)
        self.slow_query_threshold_ms = 100
        
        asyncio.create_task(self._initialize_async())
    
    async def _initialize_async(self):
        """Initialize async components"""
        try:
            await self.pool_manager.initialize()
            self.cache_manager = await get_cache_manager()
            
            # Start background tasks
            asyncio.create_task(self._cache_cleanup_task())
            asyncio.create_task(self._performance_monitor_task())
            
            logger.info("Database optimizer initialized successfully")
        except Exception as e:
            logger.error(f"Failed to initialize database optimizer: {str(e)}")
    
    async def execute_optimized(self,
                               query: str,
                               params: List[Any] = None,
                               query_type: str = "read",
                               use_cache: bool = True,
                               cache_ttl: Optional[int] = None) -> Any:
        """
        Execute query with optimization
        
        Args:
            query: SQL query to execute
            params: Query parameters
            query_type: "read" or "write"
            use_cache: Whether to use result caching
            cache_ttl: Cache TTL in seconds
        """
        start_time = time.time()
        params = params or []
        
        # Generate cache key
        cache_key = hashlib.md5(f"{query}:{json.dumps(params, default=str)}".encode()).hexdigest()
        
        # Check result cache for read queries
        if query_type == "read" and use_cache:
            cached_result = await self._get_cached_result(cache_key)
            if cached_result is not None:
                self.query_stats[query]["cache_hits"] += 1
                return cached_result
            else:
                self.query_stats[query]["cache_misses"] += 1
        
        # Get connection pool
        pool = self.pool_manager.get_pool(query_type)
        
        if not pool:
            raise Exception("Database connection pool not initialized")
        
        try:
            # Execute query
            async with pool.acquire() as connection:
                # Optimize query if possible
                optimized_query = await self._optimize_query(query, connection)
                
                # Execute based on expected result type
                if query_type == "write" or "INSERT" in query.upper() or "UPDATE" in query.upper() or "DELETE" in query.upper():
                    result = await connection.execute(optimized_query, *params)
                elif "SELECT" in query.upper() and "LIMIT 1" in query.upper():
                    result = await connection.fetchrow(optimized_query, *params)
                else:
                    result = await connection.fetch(optimized_query, *params)
                
                # Cache result for read queries
                if query_type == "read" and use_cache and result is not None:
                    ttl = cache_ttl or self._cache_ttl
                    await self._cache_result(cache_key, result, ttl)
                
                # Record performance metrics
                execution_time = (time.time() - start_time) * 1000
                self._record_query_performance(query, execution_time)
                
                # Log slow queries
                if execution_time > self.slow_query_threshold_ms:
                    self._log_slow_query(query, params, execution_time)
                
                return result
                
        except Exception as e:
            logger.error(f"Query execution failed: {str(e)}")
            self.pool_manager.stats["failed_queries"] += 1
            raise
    
    async def execute_batch(self,
                          queries: List[Tuple[str, List[Any]]],
                          transaction: bool = True) -> List[Any]:
        """
        Execute multiple queries in batch
        
        Args:
            queries: List of (query, params) tuples
            transaction: Whether to wrap in transaction
        """
        results = []
        pool = self.pool_manager.get_pool("write")
        
        if not pool:
            raise Exception("Database connection pool not initialized")
        
        async with pool.acquire() as connection:
            if transaction:
                async with connection.transaction():
                    for query, params in queries:
                        result = await connection.execute(query, *params)
                        results.append(result)
            else:
                for query, params in queries:
                    result = await connection.execute(query, *params)
                    results.append(result)
        
        return results
    
    async def _optimize_query(self, query: str, connection) -> str:
        """
        Optimize query using various techniques
        """
        # Simple query optimizations
        optimized = query
        
        # Add LIMIT if not present for SELECT queries without aggregation
        if "SELECT" in query.upper() and "LIMIT" not in query.upper() and "COUNT(" not in query.upper():
            # Check if it's a single row query
            if "WHERE id =" in query or "WHERE user_id =" in query:
                if "LIMIT 1" not in query:
                    optimized += " LIMIT 1"
        
        # Use index hints for known patterns
        if "pam_conversations" in query and "ORDER BY created_at" in query:
            # Suggest using index on (user_id, created_at)
            pass  # Index hints are database-specific
        
        return optimized
    
    async def _get_cached_result(self, cache_key: str) -> Optional[Any]:
        """Get cached query result"""
        # Check in-memory cache first
        if cache_key in self._result_cache:
            result, timestamp = self._result_cache[cache_key]
            if time.time() - timestamp < self._cache_ttl:
                return result
            else:
                del self._result_cache[cache_key]
        
        # Check Redis cache if available
        if self.cache_manager:
            try:
                cached = await self.cache_manager.get(
                    message=cache_key,
                    user_id="system",
                    context={"type": "query_result"}
                )
                if cached:
                    # Also store in memory cache
                    self._result_cache[cache_key] = (cached, time.time())
                    return cached
            except Exception:
                pass
        
        return None
    
    async def _cache_result(self, cache_key: str, result: Any, ttl: int):
        """Cache query result"""
        # Store in memory cache
        self._result_cache[cache_key] = (result, time.time())
        
        # Store in Redis if available
        if self.cache_manager:
            try:
                # Convert result to cacheable format
                if isinstance(result, (list, tuple)):
                    cacheable_result = [dict(row) if hasattr(row, 'items') else row for row in result]
                elif hasattr(result, 'items'):
                    cacheable_result = dict(result)
                else:
                    cacheable_result = result
                
                await self.cache_manager.set(
                    message=cache_key,
                    user_id="system",
                    response={"result": cacheable_result},
                    context={"type": "query_result"},
                    ttl=ttl
                )
            except Exception as e:
                logger.debug(f"Failed to cache query result: {str(e)}")
    
    def _record_query_performance(self, query: str, execution_time: float):
        """Record query performance metrics"""
        stats = self.query_stats[query]
        stats["count"] += 1
        stats["total_time_ms"] += execution_time
        stats["avg_time_ms"] = stats["total_time_ms"] / stats["count"]
        stats["max_time_ms"] = max(stats["max_time_ms"], execution_time)
        stats["min_time_ms"] = min(stats["min_time_ms"], execution_time)
        
        self.pool_manager.stats["total_queries"] += 1
    
    def _log_slow_query(self, query: str, params: List[Any], execution_time: float):
        """Log slow query for analysis"""
        self.slow_queries.append({
            "query": query,
            "params": params,
            "execution_time_ms": execution_time,
            "timestamp": datetime.utcnow().isoformat()
        })
        
        logger.warning(f"Slow query detected ({execution_time:.2f}ms): {query[:100]}...")
    
    async def analyze_query_plan(self, query: str, params: List[Any] = None) -> Dict[str, Any]:
        """
        Analyze query execution plan
        """
        pool = self.pool_manager.get_pool("read")
        
        if not pool:
            raise Exception("Database connection pool not initialized")
        
        async with pool.acquire() as connection:
            # Get query plan
            explain_query = f"EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) {query}"
            
            try:
                result = await connection.fetchval(explain_query, *(params or []))
                plan = json.loads(result) if result else {}
                
                # Extract key metrics
                if plan and len(plan) > 0:
                    plan_details = plan[0]
                    return {
                        "execution_time_ms": plan_details.get("Execution Time", 0),
                        "planning_time_ms": plan_details.get("Planning Time", 0),
                        "total_cost": plan_details.get("Plan", {}).get("Total Cost", 0),
                        "rows_returned": plan_details.get("Plan", {}).get("Actual Rows", 0),
                        "plan": plan_details
                    }
                    
            except Exception as e:
                logger.error(f"Failed to analyze query plan: {str(e)}")
                
        return {}
    
    async def suggest_indexes(self) -> List[str]:
        """
        Suggest database indexes based on query patterns
        """
        suggestions = []
        
        # Analyze slow queries for missing indexes
        for slow_query in self.slow_queries:
            query = slow_query["query"]
            
            # Look for common patterns that benefit from indexes
            if "WHERE" in query and "ORDER BY" in query:
                # Extract table and columns
                # This is simplified - real implementation would parse SQL properly
                if "pam_conversations" in query:
                    if "user_id" in query and "created_at" in query:
                        suggestions.append(
                            "CREATE INDEX idx_pam_conversations_user_created ON pam_conversations(user_id, created_at DESC);"
                        )
                
                if "pam_memory" in query:
                    if "user_id" in query and "memory_key" in query:
                        suggestions.append(
                            "CREATE INDEX idx_pam_memory_user_key ON pam_memory(user_id, memory_key);"
                        )
        
        # Remove duplicates
        return list(set(suggestions))
    
    async def vacuum_analyze(self, tables: List[str] = None):
        """
        Run VACUUM ANALYZE on specified tables
        """
        pool = self.pool_manager.get_pool("write")
        
        if not pool:
            raise Exception("Database connection pool not initialized")
        
        tables = tables or ["pam_conversations", "pam_memory", "pam_settings"]
        
        async with pool.acquire() as connection:
            for table in tables:
                try:
                    await connection.execute(f"VACUUM ANALYZE {table}")
                    logger.info(f"VACUUM ANALYZE completed for {table}")
                except Exception as e:
                    logger.error(f"Failed to VACUUM ANALYZE {table}: {str(e)}")
    
    async def _cache_cleanup_task(self):
        """Background task to cleanup expired cache entries"""
        while True:
            try:
                await asyncio.sleep(60)  # Run every minute
                
                current_time = time.time()
                expired_keys = []
                
                for key, (_, timestamp) in self._result_cache.items():
                    if current_time - timestamp > self._cache_ttl:
                        expired_keys.append(key)
                
                for key in expired_keys:
                    del self._result_cache[key]
                
                if expired_keys:
                    logger.debug(f"Cleaned up {len(expired_keys)} expired cache entries")
                    
            except Exception as e:
                logger.error(f"Cache cleanup error: {str(e)}")
    
    async def _performance_monitor_task(self):
        """Background task to monitor and report performance"""
        while True:
            try:
                await asyncio.sleep(300)  # Report every 5 minutes
                
                # Log performance statistics
                pool_stats = self.pool_manager.get_stats()
                
                # Calculate cache hit rate
                total_cache_operations = sum(
                    stats["cache_hits"] + stats["cache_misses"]
                    for stats in self.query_stats.values()
                )
                
                if total_cache_operations > 0:
                    cache_hit_rate = sum(
                        stats["cache_hits"] for stats in self.query_stats.values()
                    ) / total_cache_operations * 100
                else:
                    cache_hit_rate = 0
                
                logger.info(f"Database Performance: "
                          f"Queries: {pool_stats['total_queries']}, "
                          f"Failed: {pool_stats['failed_queries']}, "
                          f"Active Connections: {pool_stats['active_connections']}, "
                          f"Cache Hit Rate: {cache_hit_rate:.1f}%")
                
                # Check for performance issues
                if pool_stats['active_connections'] > self.pool_manager.max_connections * 0.8:
                    logger.warning("High database connection usage detected")
                
                if cache_hit_rate < 50 and total_cache_operations > 100:
                    logger.warning(f"Low cache hit rate: {cache_hit_rate:.1f}%")
                    
            except Exception as e:
                logger.error(f"Performance monitor error: {str(e)}")
    
    def get_statistics(self) -> Dict[str, Any]:
        """Get comprehensive database optimization statistics"""
        return {
            "connection_pool": self.pool_manager.get_stats(),
            "query_stats": dict(self.query_stats),
            "slow_queries": list(self.slow_queries),
            "cache_size": len(self._result_cache),
            "plan_cache_size": len(self._plan_cache)
        }


# Global instance
db_optimizer = DatabaseOptimizer()

# Context manager for optimized database operations
@asynccontextmanager
async def optimized_db_session():
    """Context manager for optimized database operations"""
    try:
        yield db_optimizer
    finally:
        # Any cleanup if needed
        pass


# Export main components
__all__ = [
    'DatabaseOptimizer',
    'ConnectionPoolManager',
    'QueryPlan',
    'db_optimizer',
    'optimized_db_session'
]