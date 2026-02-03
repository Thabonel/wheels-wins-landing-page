"""
Browser Instance Pool for Site-Agnostic Data Extraction
Manages a pool of reusable Playwright browser instances to avoid the overhead
of creating new browser instances per request.
"""

import asyncio
from contextlib import asynccontextmanager
from typing import Optional, Dict, Any, TYPE_CHECKING

from app.core.logging import get_logger

logger = get_logger(__name__)

# Safe import of Playwright
try:
    from playwright.async_api import async_playwright, Browser, Playwright
    PLAYWRIGHT_AVAILABLE = True
except ImportError:
    PLAYWRIGHT_AVAILABLE = False
    async_playwright = None
    logger.warning("Playwright not installed - browser pool will be unavailable")

# Type hints for when Playwright is not installed
if TYPE_CHECKING:
    from playwright.async_api import Browser, Playwright


class BrowserPool:
    """
    Pool of reusable browser instances for improved performance.

    Instead of creating a new browser for each request (slow, resource-intensive),
    this pool maintains a set of pre-initialized browser instances that can be
    acquired and released efficiently.

    Features:
    - Queue-based pool with configurable max size
    - Async context manager for safe acquisition/release
    - Graceful handling of crashed browsers
    - Thread-safe operations with asyncio.Lock

    Usage:
        pool = BrowserPool(max_browsers=5)
        await pool.initialize()

        async with pool.acquire() as browser:
            context = await browser.new_context()
            page = await context.new_page()
            # Use page...
            await context.close()

        await pool.close()
    """

    def __init__(self, max_browsers: int = 5):
        """
        Initialize the browser pool.

        Args:
            max_browsers: Maximum number of browser instances in the pool
        """
        self._max_browsers = max_browsers
        self._pool: asyncio.Queue = asyncio.Queue(maxsize=max_browsers)
        self._created_count = 0
        self._lock = asyncio.Lock()
        self._playwright: Optional["Playwright"] = None
        self._initialized = False
        self._closing = False

        logger.info(f"BrowserPool created with max_browsers={max_browsers}")

    async def initialize(self) -> None:
        """
        Initialize Playwright runtime.

        Must be called before acquiring browsers. This sets up the Playwright
        instance but does not create any browsers - they are created on demand.
        """
        if not PLAYWRIGHT_AVAILABLE:
            raise RuntimeError(
                "Playwright is not installed. "
                "Run: pip install playwright && playwright install chromium"
            )

        async with self._lock:
            if self._initialized:
                logger.debug("BrowserPool already initialized")
                return

            logger.info("Initializing Playwright runtime for browser pool")
            self._playwright = await async_playwright().start()
            self._initialized = True
            logger.info("Playwright runtime initialized successfully")

    async def _create_browser(self) -> "Browser":
        """
        Create a new browser instance with optimized settings.

        Returns:
            New Playwright Browser instance
        """
        if not self._playwright:
            raise RuntimeError("BrowserPool not initialized. Call initialize() first.")

        logger.info(f"Creating new browser instance (current count: {self._created_count})")

        browser = await self._playwright.chromium.launch(
            headless=True,
            args=[
                "--disable-gpu",
                "--disable-dev-shm-usage",
                "--disable-setuid-sandbox",
                "--no-sandbox",
                "--disable-web-security",
                "--single-process",  # Better for container environments
            ]
        )

        self._created_count += 1
        logger.info(f"Browser instance created successfully (total: {self._created_count})")

        return browser

    def _is_browser_healthy(self, browser: "Browser") -> bool:
        """
        Check if a browser instance is still usable.

        Args:
            browser: Browser instance to check

        Returns:
            True if browser is connected and healthy
        """
        try:
            return browser.is_connected()
        except Exception as e:
            logger.warning(f"Browser health check failed: {e}")
            return False

    @asynccontextmanager
    async def acquire(self):
        """
        Acquire a browser from the pool.

        This is an async context manager that:
        1. Tries to get an existing browser from the pool (non-blocking)
        2. If pool is empty and under limit, creates a new browser
        3. If at limit, waits for an available browser
        4. Returns the browser to the pool when done (in finally block)
        5. Discards crashed browsers instead of returning them

        Usage:
            async with pool.acquire() as browser:
                # Use browser here
                pass  # Browser automatically returned to pool

        Yields:
            Browser instance ready for use
        """
        if not self._initialized:
            await self.initialize()

        if self._closing:
            raise RuntimeError("BrowserPool is closing, cannot acquire new browsers")

        browser: Optional["Browser"] = None
        browser_acquired_from_pool = False

        try:
            # Try to get browser from pool (non-blocking)
            try:
                browser = self._pool.get_nowait()
                browser_acquired_from_pool = True
                logger.debug(f"Acquired browser from pool (pool size: {self._pool.qsize()})")

                # Verify browser is still healthy
                if not self._is_browser_healthy(browser):
                    logger.warning("Acquired browser is unhealthy, creating new one")
                    async with self._lock:
                        self._created_count -= 1
                    try:
                        await browser.close()
                    except Exception:
                        pass
                    browser = None
                    browser_acquired_from_pool = False

            except asyncio.QueueEmpty:
                pass

            # If no browser from pool, try to create new one
            if browser is None:
                async with self._lock:
                    if self._created_count < self._max_browsers:
                        browser = await self._create_browser()
                    else:
                        # At limit, must wait for available browser
                        logger.info(
                            f"Pool at capacity ({self._created_count}/{self._max_browsers}), "
                            "waiting for available browser"
                        )

            # If still no browser, wait for one from pool
            if browser is None:
                browser = await self._pool.get()
                browser_acquired_from_pool = True
                logger.debug(f"Acquired browser after waiting (pool size: {self._pool.qsize()})")

                # Verify browser is still healthy
                if not self._is_browser_healthy(browser):
                    logger.warning("Waited browser is unhealthy, creating new one")
                    async with self._lock:
                        self._created_count -= 1
                    try:
                        await browser.close()
                    except Exception:
                        pass
                    browser = await self._create_browser()
                    browser_acquired_from_pool = False

            yield browser

        finally:
            # Return browser to pool if it's still healthy
            if browser is not None:
                if self._closing:
                    # Pool is closing, close the browser instead of returning
                    logger.debug("Pool closing, closing browser instead of returning")
                    async with self._lock:
                        self._created_count -= 1
                    try:
                        await browser.close()
                    except Exception as e:
                        logger.warning(f"Error closing browser during pool shutdown: {e}")
                elif self._is_browser_healthy(browser):
                    try:
                        self._pool.put_nowait(browser)
                        logger.debug(f"Returned browser to pool (pool size: {self._pool.qsize()})")
                    except asyncio.QueueFull:
                        # Pool is full (shouldn't happen normally), close the browser
                        logger.warning("Pool full, closing excess browser")
                        async with self._lock:
                            self._created_count -= 1
                        await browser.close()
                else:
                    # Browser crashed during use, don't return to pool
                    logger.warning("Browser crashed during use, not returning to pool")
                    async with self._lock:
                        self._created_count -= 1
                    try:
                        await browser.close()
                    except Exception:
                        pass  # Browser already dead

    async def close(self) -> None:
        """
        Close all browsers and shutdown Playwright.

        This drains the pool and closes all browser instances, then stops
        the Playwright runtime. After calling this, the pool cannot be used
        until initialize() is called again.
        """
        async with self._lock:
            if not self._initialized:
                return

            self._closing = True
            logger.info(f"Closing browser pool (closing {self._created_count} browsers)")

        # Drain and close all browsers in pool
        closed_count = 0
        while True:
            try:
                browser = self._pool.get_nowait()
                try:
                    await browser.close()
                    closed_count += 1
                except Exception as e:
                    logger.warning(f"Error closing browser: {e}")
            except asyncio.QueueEmpty:
                break

        # Stop Playwright
        if self._playwright:
            await self._playwright.stop()
            self._playwright = None

        async with self._lock:
            self._initialized = False
            self._closing = False
            self._created_count = 0

        logger.info(f"Browser pool closed (closed {closed_count} browsers)")

    async def health_check(self) -> Dict[str, Any]:
        """
        Check the health status of the browser pool.

        Returns:
            Dictionary with pool status information
        """
        if not PLAYWRIGHT_AVAILABLE:
            return {
                "status": "unavailable",
                "error": "Playwright not installed",
                "available": False
            }

        if not self._initialized:
            return {
                "status": "not_initialized",
                "available": False,
                "max_browsers": self._max_browsers
            }

        return {
            "status": "healthy",
            "available": True,
            "pool_size": self._pool.qsize(),
            "created_count": self._created_count,
            "max_browsers": self._max_browsers,
            "utilization": f"{self._created_count}/{self._max_browsers}"
        }

    @property
    def pool_size(self) -> int:
        """Current number of available browsers in the pool."""
        return self._pool.qsize()

    @property
    def created_count(self) -> int:
        """Total number of browsers created (in pool + in use)."""
        return self._created_count

    @property
    def is_initialized(self) -> bool:
        """Whether the pool has been initialized."""
        return self._initialized


# Module-level singleton
_browser_pool: Optional[BrowserPool] = None
_pool_lock = asyncio.Lock()


async def get_browser_pool(max_browsers: int = 5) -> BrowserPool:
    """
    Get or create the singleton browser pool.

    This function provides a convenient way to access a shared browser pool
    across the application. The pool is created lazily on first call.

    Args:
        max_browsers: Maximum browsers (only used on first call when creating pool)

    Returns:
        The singleton BrowserPool instance
    """
    global _browser_pool

    if _browser_pool is None:
        async with _pool_lock:
            # Double-check after acquiring lock
            if _browser_pool is None:
                _browser_pool = BrowserPool(max_browsers=max_browsers)
                await _browser_pool.initialize()
                logger.info("Global browser pool created and initialized")

    return _browser_pool


async def close_browser_pool() -> None:
    """
    Close the singleton browser pool.

    Call this during application shutdown to cleanly release resources.
    """
    global _browser_pool

    if _browser_pool is not None:
        await _browser_pool.close()
        _browser_pool = None
        logger.info("Global browser pool closed")
