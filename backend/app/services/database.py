
import asyncio
import logging
from typing import Optional, Dict, Any, List, Callable, TypeVar, Generic
from contextlib import asynccontextmanager
from functools import wraps
import time
from datetime import datetime, timedelta

from supabase import create_client, Client
from postgrest import APIError
import httpx

from backend.app.core.config import settings
from backend.app.core.exceptions import DatabaseError, ExternalServiceError

logger = logging.getLogger(__name__)

T = TypeVar('T')

class ConnectionPool:
    """Simple connection pool for Supabase clients"""
    
    def __init__(self, max_connections: int = 10):
        self.max_connections = max_connections
        self.connections: List[Client] = []
        self.available_connections: List[Client] = []
        self.in_use_connections: set = set()
        self._lock = asyncio.Lock()
    
    async def get_connection(self) -> Client:
        async with self._lock:
            if self.available_connections:
                conn = self.available_connections.pop()
                self.in_use_connections.add(conn)
                return conn
            
            if len(self.connections) < self.max_connections:
                conn = create_client(settings.SUPABASE_URL, settings.SUPABASE_KEY)
                self.connections.append(conn)
                self.in_use_connections.add(conn)
                return conn
            
            # Wait for a connection to become available
            while not self.available_connections:
                await asyncio.sleep(0.1)
            
            conn = self.available_connections.pop()
            self.in_use_connections.add(conn)
            return conn
    
    async def return_connection(self, conn: Client):
        async with self._lock:
            if conn in self.in_use_connections:
                self.in_use_connections.remove(conn)
                self.available_connections.append(conn)

class QueryPerformanceLogger:
    """Log query performance and slow queries"""
    
    def __init__(self, slow_query_threshold: float = 1.0):
        self.slow_query_threshold = slow_query_threshold
    
    def log_query(self, query_type: str, table: str, duration: float, success: bool):
        if duration > self.slow_query_threshold:
            logger.warning(
                f"Slow query detected: {query_type} on {table} took {duration:.2f}s",
                extra={
                    "query_type": query_type,
                    "table": table,
                    "duration": duration,
                    "success": success
                }
            )
        else:
            logger.debug(
                f"Query: {query_type} on {table} completed in {duration:.2f}s",
                extra={
                    "query_type": query_type,
                    "table": table,
                    "duration": duration,
                    "success": success
                }
            )

def with_retry(max_retries: int = 3, backoff_factor: float = 1.0):
    """Decorator for automatic retry logic with exponential backoff"""
    
    def decorator(func: Callable[..., T]) -> Callable[..., T]:
        @wraps(func)
        async def wrapper(*args, **kwargs) -> T:
            last_exception = None
            
            for attempt in range(max_retries + 1):
                try:
                    return await func(*args, **kwargs)
                except (APIError, httpx.RequestError, Exception) as e:
                    last_exception = e
                    
                    if attempt == max_retries:
                        break
                    
                    # Calculate backoff delay
                    delay = backoff_factor * (2 ** attempt)
                    logger.warning(
                        f"Query attempt {attempt + 1} failed, retrying in {delay}s: {str(e)}"
                    )
                    await asyncio.sleep(delay)
            
            # If we get here, all retries failed
            logger.error(f"All {max_retries + 1} query attempts failed: {str(last_exception)}")
            raise DatabaseError(
                message="Database query failed after retries",
                details={"original_error": str(last_exception), "max_retries": max_retries}
            )
        
        return wrapper
    return decorator

class DatabaseService:
    """Singleton Supabase client with advanced features"""
    
    _instance: Optional['DatabaseService'] = None
    _initialized: bool = False
    
    def __new__(cls) -> 'DatabaseService':
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance
    
    def __init__(self):
        if not self._initialized:
            self._client: Optional[Client] = None
            self._pool: Optional[ConnectionPool] = None
            self._performance_logger = QueryPerformanceLogger()
            self._health_check_cache: Dict[str, Any] = {}
            self._health_check_ttl = timedelta(minutes=5)
            DatabaseService._initialized = True
    
    def initialize(self) -> 'DatabaseService':
        """Initialize the database service"""
        try:
            if not settings.SUPABASE_URL or not settings.SUPABASE_KEY:
                raise DatabaseError(
                    message="Missing Supabase configuration",
                    details={"url_provided": bool(settings.SUPABASE_URL), "key_provided": bool(settings.SUPABASE_KEY)}
                )
            
            self._client = create_client(settings.SUPABASE_URL, settings.SUPABASE_KEY)
            self._pool = ConnectionPool(max_connections=settings.DATABASE_POOL_SIZE)
            
            logger.info("Database service initialized successfully")
            return self
            
        except Exception as e:
            logger.error(f"Failed to initialize database service: {str(e)}")
            raise DatabaseError(
                message="Failed to initialize database connection",
                details={"error": str(e)}
            )
    
    @property
    def client(self) -> Client:
        """Get the main Supabase client"""
        if not self._client:
            self.initialize()
        return self._client
    
    @asynccontextmanager
    async def get_connection(self):
        """Get a connection from the pool"""
        if not self._pool:
            self.initialize()
        
        conn = await self._pool.get_connection()
        try:
            yield conn
        finally:
            await self._pool.return_connection(conn)
    
    @with_retry(max_retries=3, backoff_factor=0.5)
    async def execute_query(
        self,
        table: str,
        operation: str,
        query_builder: Callable[[Any], Any],
        use_pool: bool = False
    ) -> Any:
        """Execute a query with performance logging and retry logic"""
        start_time = time.time()
        success = False
        
        try:
            if use_pool:
                async with self.get_connection() as conn:
                    query = getattr(conn.table(table), operation)
                    result = query_builder(query).execute()
            else:
                query = getattr(self.client.table(table), operation)
                result = query_builder(query).execute()
            
            success = True
            return result
            
        except APIError as e:
            logger.error(f"Supabase API error in {operation} on {table}: {str(e)}")
            raise DatabaseError(
                message=f"Database operation failed: {operation}",
                details={"table": table, "error": str(e)}
            )
        except Exception as e:
            logger.error(f"Unexpected error in {operation} on {table}: {str(e)}")
            raise DatabaseError(
                message="Unexpected database error",
                details={"table": table, "operation": operation, "error": str(e)}
            )
        finally:
            duration = time.time() - start_time
            self._performance_logger.log_query(operation, table, duration, success)
    
    async def health_check(self) -> Dict[str, Any]:
        """Perform comprehensive database health check"""
        # Check cache first
        cache_key = "health_check"
        now = datetime.utcnow()
        
        if (cache_key in self._health_check_cache and 
            now - self._health_check_cache[cache_key]['timestamp'] < self._health_check_ttl):
            return self._health_check_cache[cache_key]['result']
        
        health_status = {
            "status": "healthy",
            "timestamp": now.isoformat(),
            "checks": {}
        }
        
        try:
            # Test basic connectivity
            start_time = time.time()
            result = self.client.table('profiles').select('count').limit(1).execute()
            connectivity_time = time.time() - start_time
            
            health_status["checks"]["connectivity"] = {
                "status": "ok",
                "response_time_ms": round(connectivity_time * 1000, 2)
            }
            
            # Test connection pool if enabled
            if self._pool:
                start_time = time.time()
                async with self.get_connection() as conn:
                    conn.table('profiles').select('count').limit(1).execute()
                pool_time = time.time() - start_time
                
                health_status["checks"]["connection_pool"] = {
                    "status": "ok",
                    "response_time_ms": round(pool_time * 1000, 2),
                    "active_connections": len(self._pool.in_use_connections),
                    "available_connections": len(self._pool.available_connections)
                }
        
        except Exception as e:
            health_status["status"] = "unhealthy"
            health_status["checks"]["connectivity"] = {
                "status": "failed",
                "error": str(e)
            }
            logger.error(f"Database health check failed: {str(e)}")
        
        # Cache the result
        self._health_check_cache[cache_key] = {
            "result": health_status,
            "timestamp": now
        }
        
        return health_status
    
    @asynccontextmanager
    async def transaction(self):
        """Simple transaction context manager (note: Supabase doesn't support transactions in REST API)"""
        # This is a placeholder for transaction support
        # In a real implementation, you'd need to use the Supabase database directly
        # or implement application-level transaction logic
        logger.warning("Transaction support not fully implemented - using single operations")
        yield self.client
    
    async def batch_insert(self, table: str, data: List[Dict[str, Any]]) -> Any:
        """Batch insert with retry logic"""
        return await self.execute_query(
            table=table,
            operation="insert",
            query_builder=lambda query: query.insert(data)
        )
    
    async def batch_update(self, table: str, data: List[Dict[str, Any]], match_column: str) -> List[Any]:
        """Batch update operations"""
        results = []
        for item in data:
            match_value = item.pop(match_column)
            result = await self.execute_query(
                table=table,
                operation="update",
                query_builder=lambda query: query.update(item).eq(match_column, match_value)
            )
            results.append(result)
        return results

# Global database service instance
db_service = DatabaseService()

def get_database() -> DatabaseService:
    """Get the database service instance"""
    if not db_service._initialized:
        db_service.initialize()
    return db_service

def get_supabase_client() -> Client:
    """Get Supabase client (backward compatibility)"""
    return get_database().client

# Initialize on import
db_service.initialize()
