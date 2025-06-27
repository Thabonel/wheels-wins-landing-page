
"""
Database Connection Pool Manager
Optimizes database connections with connection pooling.
"""

import asyncio
from typing import Optional, Dict, Any
from contextlib import asynccontextmanager
from app.core.config import settings
from app.core.logging import setup_logging

logger = setup_logging()

class DatabasePool:
    """Database connection pool manager with optimizations"""
    
    def __init__(self):
        self._pool_lock = asyncio.Lock()
    
    async def initialize(self):
        """Initialize connection pool with optimized settings"""
        if self.pool:
            return
            
        async with self._pool_lock:
            if self.pool:  # Double-check after acquiring lock
                return
                
            try:
                    settings.DATABASE_URL,
                    min_size=5,  # Minimum connections
                    max_size=20,  # Maximum connections
                    max_queries=50000,  # Max queries per connection
                    max_inactive_connection_lifetime=300.0,  # 5 minutes
                    command_timeout=30,  # Command timeout
                    server_settings={
                        'jit': 'off',  # Disable JIT for faster simple queries
                        'application_name': 'pam_backend'
                    }
                )
                logger.info("Database pool initialized successfully")
            except Exception as e:
                logger.error(f"Failed to initialize database pool: {e}")
                raise
    
    @asynccontextmanager
    async def acquire(self):
        """Acquire connection from pool"""
        if not self.pool:
            await self.initialize()
        
        async with self.pool.acquire() as connection:
            yield connection
    
    async def execute(self, query: str, *args):
        """Execute query with connection from pool"""
        async with self.acquire() as conn:
            return await conn.execute(query, *args)
    
    async def fetch(self, query: str, *args):
        """Fetch multiple rows with connection from pool"""
        async with self.acquire() as conn:
            return await conn.fetch(query, *args)
    
    async def fetchrow(self, query: str, *args):
        """Fetch single row with connection from pool"""
        async with self.acquire() as conn:
            return await conn.fetchrow(query, *args)
    
    async def close(self):
        """Close connection pool"""
        if self.pool:
            await self.pool.close()
            self.pool = None
            logger.info("Database pool closed")

# Global pool instance
db_pool = DatabasePool()

async def get_db_pool() -> DatabasePool:
    """Get database pool instance"""
    if not db_pool.pool:
        await db_pool.initialize()
    return db_pool
