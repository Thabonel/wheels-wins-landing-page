"""
Database Connection Pool Manager
Provides a lightweight async stub for tests.
"""

import asyncio
from contextlib import asynccontextmanager
from typing import Optional, Any

from app.core.logging import setup_logging

logger = setup_logging()

class DatabasePool:
    """Simple async pool stub used during tests."""

    def __init__(self) -> None:
        self.pool: Optional[object] = None
        self._pool_lock = asyncio.Lock()

    async def initialize(self) -> None:
        """Initialize the pool if not already initialized."""
        if self.pool:
            return
        async with self._pool_lock:
            if self.pool:
                return
            # In CI we don't connect to a real database.
            self.pool = object()
            logger.info("Database pool initialized (stub)")

    @asynccontextmanager
    async def acquire(self) -> Any:
        """Yield a connection from the pool."""
        if not self.pool:
            await self.initialize()
        try:
            yield self.pool
        finally:
            pass

    async def execute(self, query: str, *args: Any) -> None:
        """Execute a query placeholder."""
        async with self.acquire():
            return None

    async def fetch(self, query: str, *args: Any) -> list[Any]:
        """Fetch multiple rows placeholder."""
        async with self.acquire():
            return []

    async def fetchrow(self, query: str, *args: Any) -> Any:
        """Fetch single row placeholder."""
        async with self.acquire():
            return None

    async def close(self) -> None:
        """Close the pool."""
        if self.pool:
            self.pool = None
            logger.info("Database pool closed")


# Global pool instance used by the application

db_pool = DatabasePool()


async def get_db_pool() -> DatabasePool:
    """Retrieve the global pool, initializing if necessary."""
    if not db_pool.pool:
        await db_pool.initialize()
    return db_pool
