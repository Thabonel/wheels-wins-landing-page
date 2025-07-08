"""Async PostgreSQL connection pooling via ``asyncpg``."""

import os
import asyncio
from contextlib import asynccontextmanager
from typing import Optional, Any

import asyncpg

from app.core.logging import setup_logging

logger = setup_logging()


class DatabasePool:
    """Asynchronous connection pool backed by ``asyncpg``."""

    def __init__(self) -> None:
        self.pool: Optional[asyncpg.Pool] = None
        self._pool_lock = asyncio.Lock()

    async def initialize(self) -> None:
        """Create the connection pool if it doesn't exist."""
        if self.pool:
            return
        async with self._pool_lock:
            if self.pool:
                return
            database_url = os.getenv(
                "DATABASE_URL",
                "postgresql://postgres:postgres@localhost:5432/postgres",
            )
            self.pool = await asyncpg.create_pool(dsn=database_url)
            logger.info("Database pool initialized")

    @asynccontextmanager
    async def acquire(self) -> Any:
        """Yield a pooled connection."""
        if not self.pool:
            await self.initialize()
        assert self.pool is not None
        conn = await self.pool.acquire()
        try:
            yield conn
        finally:
            await self.pool.release(conn)

    async def execute(self, query: str, *args: Any) -> str:
        """Execute a query and return status."""
        async with self.acquire() as conn:
            return await conn.execute(query, *args)

    async def fetch(self, query: str, *args: Any) -> list[Any]:
        """Fetch multiple rows."""
        async with self.acquire() as conn:
            return await conn.fetch(query, *args)

    async def fetchrow(self, query: str, *args: Any) -> Any:
        """Fetch a single row."""
        async with self.acquire() as conn:
            return await conn.fetchrow(query, *args)

    async def close(self) -> None:
        """Close the pool."""
        if self.pool:
            await self.pool.close()
            self.pool = None
            logger.info("Database pool closed")


# Global pool instance used by the application

db_pool = DatabasePool()


async def get_db_pool() -> DatabasePool:
    """Retrieve the global pool, initializing if necessary."""
    if not db_pool.pool:
        await db_pool.initialize()
    return db_pool
