"""
Site-Agnostic Data Extraction - Browser Engine
Headless browser rendering with Playwright for page capture and accessibility snapshots
Based on OpenClaw's approach to creating numeric element trees

Performance Optimization: Uses BrowserPool to reuse browser instances instead of
creating new ones per request. This significantly reduces latency and resource usage.
"""

import asyncio
from typing import Optional, Dict, Any
from datetime import datetime

from app.core.logging import get_logger
from app.core.url_validator import validate_url_safe, SSRFProtectionError

logger = get_logger(__name__)

# Safe import of Playwright
try:
    from playwright.async_api import async_playwright, Page, Browser, BrowserContext
    from playwright.async_api import TimeoutError as PlaywrightTimeoutError
    PLAYWRIGHT_AVAILABLE = True
except ImportError:
    PLAYWRIGHT_AVAILABLE = False
    PlaywrightTimeoutError = Exception
    logger.warning("Playwright not installed - browser engine will be unavailable")

from .schemas import PageState
from .browser_pool import get_browser_pool, close_browser_pool, PLAYWRIGHT_AVAILABLE as POOL_PLAYWRIGHT_AVAILABLE
from .exceptions import (
    BrowserError,
    BrowserInitializationError,
    NavigationError,
    NavigationTimeoutError,
    PageLoadError,
    ScreenshotError,
    AccessibilitySnapshotError,
    MetadataExtractionError,
)


class BrowserEngine:
    """
    Headless browser engine using Playwright with browser pooling.

    Captures rendered HTML and creates accessibility snapshots for AI analysis.
    Uses a shared browser pool for improved performance - browsers are reused
    across requests instead of being created fresh each time.

    The engine supports two modes:
    - Pool mode (default): Uses shared browser pool for optimal performance
    - Legacy mode: Creates dedicated browser instance (for backward compatibility)
    """

    def __init__(self, use_pool: bool = True):
        """
        Initialize the browser engine.

        Args:
            use_pool: Whether to use browser pooling (default: True).
                     Set to False for backward compatibility or isolated testing.
        """
        self._use_pool = use_pool
        self._lock = asyncio.Lock()

        # Legacy mode fields (when use_pool=False)
        self._browser: Optional["Browser"] = None
        self._context: Optional["BrowserContext"] = None
        self._playwright = None

        if self._use_pool:
            logger.info("BrowserEngine initialized with browser pooling enabled")
        else:
            logger.info("BrowserEngine initialized in legacy mode (no pooling)")

    async def _ensure_browser(self) -> None:
        """Initialize browser if not already running (legacy mode only).

        In pool mode, the pool handles browser initialization.

        Raises:
            BrowserInitializationError: If Playwright is not installed or browser fails to start.
        """
        if self._use_pool:
            # Pool mode - pool handles initialization
            return

        if not PLAYWRIGHT_AVAILABLE:
            error = BrowserInitializationError(
                "Playwright is not installed. Run: pip install playwright && playwright install chromium"
            )
            logger.error(str(error), exc_info=True)
            raise error

        async with self._lock:
            if self._browser is None:
                try:
                    logger.info("Initializing Playwright browser (legacy mode)")
                    self._playwright = await async_playwright().start()
                    self._browser = await self._playwright.chromium.launch(
                        headless=True,
                        args=[
                            "--disable-gpu",
                            "--disable-dev-shm-usage",
                            "--disable-setuid-sandbox",
                            "--no-sandbox",
                            "--disable-web-security",
                        ]
                    )
                    self._context = await self._browser.new_context(
                        viewport={"width": 1920, "height": 1080},
                        user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
                    )
                    logger.info("Playwright browser initialized successfully (legacy mode)")
                except Exception as e:
                    error = BrowserInitializationError(
                        str(e),
                        context={"original_error": type(e).__name__}
                    )
                    logger.error(str(error), exc_info=True)
                    raise error from e

    async def close(self) -> None:
        """Close browser and cleanup resources"""
        if self._use_pool:
            # Pool mode - browser lifecycle managed by pool
            # Individual engine close is a no-op; pool.close() handles cleanup
            logger.debug("BrowserEngine close called (pool mode - no action needed)")
            return

        # Legacy mode cleanup
        async with self._lock:
            if self._context:
                await self._context.close()
                self._context = None
            if self._browser:
                await self._browser.close()
                self._browser = None
            if self._playwright:
                await self._playwright.stop()
                self._playwright = None
            logger.info("Browser engine closed (legacy mode)")

    async def capture_page_state(
        self,
        url: str,
        wait_for_network_idle: bool = True,
        timeout_ms: int = 30000,
        take_screenshot: bool = False
    ) -> PageState:
        """
        Capture complete page state including HTML and accessibility snapshot

        Args:
            url: URL to capture
            wait_for_network_idle: Wait for network to be idle
            timeout_ms: Navigation timeout in milliseconds
            take_screenshot: Whether to capture a screenshot

        Returns:
            PageState with rendered HTML, accessibility snapshot, and metadata

        Raises:
            SSRFProtectionError: If URL targets internal/private network
        """
        # SSRF protection - validate URL before any network access
        try:
            validate_url_safe(url)
        except SSRFProtectionError as e:
            error = NavigationError(
                "URL blocked by SSRF protection",
                url=url,
                context={"reason": "internal_network_access"}
            )
            logger.warning(str(error))
            raise error from e

        if self._use_pool:
            return await self._capture_page_state_with_pool(
                url, wait_for_network_idle, timeout_ms, take_screenshot
            )
        else:
            return await self._capture_page_state_legacy(
                url, wait_for_network_idle, timeout_ms, take_screenshot
            )

    async def _capture_page_state_with_pool(
        self,
        url: str,
        wait_for_network_idle: bool,
        timeout_ms: int,
        take_screenshot: bool
    ) -> PageState:
        """Capture page state using browser pool for improved performance."""
        pool = await get_browser_pool()
        start_time = datetime.utcnow()

        async with pool.acquire() as browser:
            # Create a fresh context for isolation
            context = await browser.new_context(
                viewport={"width": 1920, "height": 1080},
                user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
            )

            try:
                page = await context.new_page()

                try:
                    return await self._do_capture_page_state(
                        page, url, wait_for_network_idle, timeout_ms,
                        take_screenshot, start_time
                    )
                finally:
                    await page.close()
            finally:
                await context.close()

    async def _capture_page_state_legacy(
        self,
        url: str,
        wait_for_network_idle: bool,
        timeout_ms: int,
        take_screenshot: bool
    ) -> PageState:
        """Capture page state using legacy single-browser mode."""
        await self._ensure_browser()

        page = await self._context.new_page()
        start_time = datetime.utcnow()

        try:
            return await self._do_capture_page_state(
                page, url, wait_for_network_idle, timeout_ms,
                take_screenshot, start_time
            )
        finally:
            await page.close()

    async def _do_capture_page_state(
        self,
        page: "Page",
        url: str,
        wait_for_network_idle: bool,
        timeout_ms: int,
        take_screenshot: bool,
        start_time: datetime
    ) -> PageState:
        """Core page capture logic shared between pool and legacy modes."""
        try:
            logger.info(f"Capturing page state for: {url}")

            # Navigate to page with specific error handling
            try:
                response = await page.goto(
                    url,
                    wait_until="networkidle" if wait_for_network_idle else "domcontentloaded",
                    timeout=timeout_ms
                )
            except PlaywrightTimeoutError as e:
                error = NavigationTimeoutError(
                    url=url,
                    timeout_ms=timeout_ms,
                    operation="page_navigation",
                    context={"wait_until": "networkidle" if wait_for_network_idle else "domcontentloaded"}
                )
                logger.error(str(error), exc_info=True)
                raise error from e

            if not response:
                error = PageLoadError(url=url, context={"reason": "no_response_received"})
                logger.error(str(error), exc_info=True)
                raise error

            # Check for error status codes
            if response.status >= 400:
                error = NavigationError(
                    f"HTTP error status {response.status}",
                    url=url,
                    status_code=response.status
                )
                logger.error(str(error), exc_info=True)
                raise error

            # Wait for DOM stability
            await self._wait_for_dom_stability(page)

            # Get page title
            title = await page.title()

            # Get rendered HTML
            html = await page.content()

            # Create accessibility snapshot (OpenClaw-style numeric element tree)
            snapshot = await self.create_accessibility_snapshot(page, url)

            # Capture screenshot if requested
            screenshot_bytes = None
            if take_screenshot:
                screenshot_bytes = await self.take_screenshot(page, url)

            # Extract metadata
            metadata = await self._extract_metadata(page, response, url)

            page_state = PageState(
                url=url,
                html=html,
                snapshot=snapshot,
                screenshot=screenshot_bytes,
                title=title,
                metadata=metadata,
                captured_at=start_time
            )

            logger.info(f"Page state captured successfully: {url} (title: {title})")
            return page_state

        except (BrowserError, NavigationError, NavigationTimeoutError, PageLoadError):
            # Re-raise our custom exceptions as-is
            raise
        except Exception as e:
            # Wrap unexpected errors in BrowserError for consistent handling
            error = BrowserError(
                f"Unexpected error during page capture: {str(e)}",
                url=url,
                context={"original_error": type(e).__name__}
            )
            logger.error(str(error), exc_info=True)
            raise error from e

    async def create_accessibility_snapshot(self, page: "Page", url: str = None) -> str:
        """
        Create OpenClaw-style accessibility snapshot with numeric element indices

        This creates a structured text representation of the page's accessibility tree,
        with each interactive/content element assigned a numeric index for easy reference.

        Args:
            page: Playwright Page object
            url: URL being captured (for error context)

        Returns:
            String representation of accessibility tree with numeric indices

        Raises:
            AccessibilitySnapshotError: If snapshot creation fails critically
        """
        try:
            # Get accessibility tree from Playwright
            accessibility_tree = await page.accessibility.snapshot(interesting_only=True)

            if not accessibility_tree:
                logger.warning(f"Empty accessibility tree returned for {url or 'unknown URL'}")
                return "[Empty accessibility tree]"

            # Convert to OpenClaw-style numeric format
            lines = []
            element_index = [0]  # Use list to allow mutation in nested function

            def process_node(node: Dict[str, Any], depth: int = 0) -> None:
                """Process accessibility node and children recursively"""
                role = node.get("role", "unknown")
                name = node.get("name", "")
                value = node.get("value", "")

                # Skip certain roles that add noise
                skip_roles = {"generic", "none", "presentation"}
                if role in skip_roles and not name:
                    # Still process children even if skipping this node
                    for child in node.get("children", []):
                        process_node(child, depth)
                    return

                # Build element representation
                indent = "  " * depth
                index = element_index[0]
                element_index[0] += 1

                # Format: [index] role: "name" (value)
                parts = [f"[{index}]", role]
                if name:
                    # Truncate long names
                    display_name = name[:100] + "..." if len(name) > 100 else name
                    parts.append(f': "{display_name}"')
                if value:
                    display_value = value[:50] + "..." if len(value) > 50 else value
                    parts.append(f" ({display_value})")

                lines.append(f"{indent}{''.join(parts)}")

                # Process children
                for child in node.get("children", []):
                    process_node(child, depth + 1)

            process_node(accessibility_tree)

            snapshot = "\n".join(lines)
            logger.debug(f"Created accessibility snapshot with {element_index[0]} elements")
            return snapshot

        except Exception as e:
            error = AccessibilitySnapshotError(
                url=url or "unknown",
                reason=str(e),
                context={"original_error": type(e).__name__}
            )
            logger.error(str(error), exc_info=True)
            raise error from e

    async def take_screenshot(self, page: "Page", url: str = None) -> bytes:
        """
        Take a screenshot of the current page

        Args:
            page: Playwright Page object
            url: URL being captured (for error context)

        Returns:
            Screenshot as bytes (PNG format)

        Raises:
            ScreenshotError: If screenshot capture fails
        """
        try:
            screenshot = await page.screenshot(
                type="png",
                full_page=False,  # Just visible viewport
                animations="disabled"
            )
            logger.debug("Screenshot captured successfully")
            return screenshot
        except Exception as e:
            error = ScreenshotError(
                url=url or "unknown",
                reason=str(e),
                context={"original_error": type(e).__name__}
            )
            logger.error(str(error), exc_info=True)
            raise error from e

    async def _wait_for_dom_stability(self, page: "Page", timeout_ms: int = 5000) -> None:
        """
        Wait for DOM to stabilize (no new elements being added)

        This method attempts to wait for loading indicators to disappear but does not
        raise errors if they are not found - loading indicators may not exist on all pages.

        Args:
            page: Playwright Page object
            timeout_ms: Maximum time to wait for stability
        """
        # Wait for common loading indicators to disappear
        loading_selectors = [
            "[class*='loading']",
            "[class*='spinner']",
            "[class*='skeleton']",
            ".loading",
            ".spinner"
        ]

        for selector in loading_selectors:
            try:
                await page.wait_for_selector(
                    selector,
                    state="hidden",
                    timeout=2000
                )
                logger.debug(f"Loading indicator '{selector}' hidden or not found")
            except PlaywrightTimeoutError:
                # Selector still visible after timeout - page may have persistent loading indicators
                logger.debug(f"Loading indicator '{selector}' still visible after timeout, continuing")
            except Exception as e:
                # Selector not found or other non-critical error - this is expected for most pages
                logger.debug(f"Loading indicator check for '{selector}': {type(e).__name__}")

        # Additional small wait for any final renders
        await asyncio.sleep(0.5)

    async def _extract_metadata(self, page: "Page", response, url: str = None) -> Dict[str, Any]:
        """
        Extract page metadata including meta tags, OpenGraph, and response info

        Metadata extraction errors are logged but do not fail the overall operation,
        as metadata is supplementary information.

        Args:
            page: Playwright Page object
            response: Playwright Response object
            url: URL being captured (for error context)

        Returns:
            Dictionary of metadata (may be partial if some extractions fail)
        """
        metadata = {
            "status_code": response.status,
            "content_type": response.headers.get("content-type", ""),
            "final_url": page.url,  # After any redirects
        }

        # Extract meta tags
        try:
            meta_tags = await page.evaluate("""
                () => {
                    const metas = {};
                    document.querySelectorAll('meta').forEach(meta => {
                        const name = meta.getAttribute('name') || meta.getAttribute('property');
                        const content = meta.getAttribute('content');
                        if (name && content) {
                            metas[name] = content;
                        }
                    });
                    return metas;
                }
            """)
            metadata["meta_tags"] = meta_tags
        except Exception as e:
            error = MetadataExtractionError(
                str(e), url=url, field="meta_tags",
                context={"original_error": type(e).__name__}
            )
            logger.warning(str(error), exc_info=True)
            metadata["meta_tags"] = {}

        # Extract canonical URL
        try:
            canonical = await page.evaluate("""
                () => {
                    const link = document.querySelector('link[rel="canonical"]');
                    return link ? link.getAttribute('href') : null;
                }
            """)
            if canonical:
                metadata["canonical_url"] = canonical
        except Exception as e:
            error = MetadataExtractionError(
                str(e), url=url, field="canonical_url",
                context={"original_error": type(e).__name__}
            )
            logger.warning(str(error), exc_info=True)

        # Extract language
        try:
            lang = await page.evaluate("""
                () => document.documentElement.lang || document.querySelector('html').getAttribute('lang')
            """)
            if lang:
                metadata["language"] = lang
        except Exception as e:
            error = MetadataExtractionError(
                str(e), url=url, field="language",
                context={"original_error": type(e).__name__}
            )
            logger.warning(str(error), exc_info=True)

        return metadata

    async def health_check(self) -> Dict[str, Any]:
        """Check browser engine health status"""
        try:
            if not PLAYWRIGHT_AVAILABLE:
                return {
                    "status": "unavailable",
                    "error": "Playwright not installed",
                    "available": False
                }

            if self._use_pool:
                # Get pool health status
                pool = await get_browser_pool()
                pool_health = await pool.health_check()
                return {
                    "status": pool_health.get("status", "unknown"),
                    "available": pool_health.get("available", False),
                    "mode": "pool",
                    "pool_size": pool_health.get("pool_size", 0),
                    "created_count": pool_health.get("created_count", 0),
                    "max_browsers": pool_health.get("max_browsers", 0),
                    "utilization": pool_health.get("utilization", "0/0")
                }
            else:
                # Legacy mode health check
                await self._ensure_browser()
                return {
                    "status": "healthy",
                    "available": True,
                    "mode": "legacy",
                    "browser_connected": self._browser is not None and self._browser.is_connected()
                }
        except Exception as e:
            return {
                "status": "error",
                "error": str(e),
                "available": False
            }


# Shutdown helper for application cleanup
async def shutdown_browser_pool() -> None:
    """
    Shutdown the global browser pool.

    Call this during application shutdown to cleanly release all browser resources.
    """
    await close_browser_pool()
