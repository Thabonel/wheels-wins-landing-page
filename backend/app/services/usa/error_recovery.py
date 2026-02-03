"""
Error Recovery for Universal Site Access

Implements fallback strategies for handling errors during browser automation:
- Element not found
- Page changes unexpectedly
- Timeouts
- Network errors
"""

import logging
from typing import Optional, TYPE_CHECKING

from .models import (
    ActionStep,
    WorkflowStep,
    RecoveryResult,
    RecoveryStrategy,
)
from .element_indexer import index_page

if TYPE_CHECKING:
    from playwright.async_api import Page
    from .session_manager import BrowserSession

logger = logging.getLogger(__name__)


class ErrorRecovery:
    """
    Handles error recovery for browser automation actions.

    Implements multiple strategies:
    - Retry: Simple retry with delay
    - Alternative selector: Try backup selectors
    - Re-index page: Rebuild element index
    - Scroll and retry: Scroll element into view
    - Wait and retry: Wait for element to appear
    - User notification: Alert user to manual intervention
    """

    def __init__(self, max_retries: int = 3):
        """
        Initialize error recovery handler.

        Args:
            max_retries: Maximum retry attempts per strategy
        """
        self.max_retries = max_retries

    async def handle_element_not_found(
        self,
        action: ActionStep | WorkflowStep,
        page: 'Page',
        session: 'BrowserSession',
    ) -> RecoveryResult:
        """
        Handle case where target element cannot be found.

        Args:
            action: The action that failed
            page: Playwright page instance
            session: Browser session with element cache

        Returns:
            RecoveryResult indicating success and any new element index
        """
        logger.info(f"Attempting recovery for element not found: index {action.target_element if hasattr(action, 'target_element') else action.target}")

        target = action.target_element if hasattr(action, 'target_element') else action.target

        # Strategy 1: Scroll and retry
        result = await self._try_scroll_and_find(target, page, session)
        if result.success:
            return result

        # Strategy 2: Re-index the page
        result = await self._try_reindex_page(target, page, session)
        if result.success:
            return result

        # Strategy 3: Try alternative targets (if provided)
        if hasattr(action, 'alternative_targets') and action.alternative_targets:
            result = await self._try_alternatives(action.alternative_targets, page, session)
            if result.success:
                return result

        # Strategy 4: Wait and retry
        result = await self._try_wait_and_find(target, page, session)
        if result.success:
            return result

        # All strategies failed
        logger.warning(f"All recovery strategies failed for element {target}")
        return RecoveryResult(
            success=False,
            strategy_used=RecoveryStrategy.USER_NOTIFICATION,
            should_continue=False,
            message=f"Element {target} cannot be found. The page may have changed significantly.",
        )

    async def handle_page_change(
        self,
        expected_url: str,
        actual_url: str,
        page: 'Page',
        session: 'BrowserSession',
    ) -> RecoveryResult:
        """
        Handle case where page URL changed unexpectedly.

        Args:
            expected_url: URL we expected to be on
            actual_url: URL we're actually on
            page: Playwright page instance
            session: Browser session

        Returns:
            RecoveryResult with recovery status
        """
        logger.info(f"Page change detected: expected {expected_url}, got {actual_url}")

        # Check if it's a redirect to a similar page
        expected_domain = self._extract_domain(expected_url)
        actual_domain = self._extract_domain(actual_url)

        if expected_domain == actual_domain:
            # Same domain, re-index and continue
            logger.info("Same domain, re-indexing page")
            await self._reindex_page(page, session)

            return RecoveryResult(
                success=True,
                strategy_used=RecoveryStrategy.REINDEX_PAGE,
                should_continue=True,
                message="Page changed but same domain - re-indexed successfully",
                page_reindexed=True,
            )

        # Different domain - could be redirect, error page, or login
        if "login" in actual_url.lower() or "signin" in actual_url.lower():
            return RecoveryResult(
                success=False,
                strategy_used=RecoveryStrategy.USER_NOTIFICATION,
                should_continue=False,
                message="Redirected to login page - authentication required",
            )

        if "error" in actual_url.lower() or "404" in actual_url:
            return RecoveryResult(
                success=False,
                strategy_used=RecoveryStrategy.ABORT,
                should_continue=False,
                message="Redirected to error page",
            )

        # Unknown redirect - notify user
        return RecoveryResult(
            success=False,
            strategy_used=RecoveryStrategy.USER_NOTIFICATION,
            should_continue=False,
            message=f"Unexpected redirect to {actual_url}",
        )

    async def handle_timeout(
        self,
        action: ActionStep | WorkflowStep,
        page: 'Page',
        session: 'BrowserSession',
    ) -> RecoveryResult:
        """
        Handle timeout errors.

        Args:
            action: The action that timed out
            page: Playwright page instance
            session: Browser session

        Returns:
            RecoveryResult with recovery status
        """
        logger.info("Handling timeout error")

        # Check if page is still responsive
        try:
            await page.evaluate("() => true", timeout=2000)
        except Exception:
            logger.warning("Page unresponsive after timeout")
            return RecoveryResult(
                success=False,
                strategy_used=RecoveryStrategy.ABORT,
                should_continue=False,
                message="Page is unresponsive",
            )

        # Page is responsive - check for loading indicators
        is_loading = await page.evaluate('''() => {
            const spinners = document.querySelectorAll(
                '.loading, .spinner, [class*="loading"], [class*="spinner"]'
            );
            return spinners.length > 0;
        }''')

        if is_loading:
            # Wait for loading to complete
            logger.info("Page still loading, waiting...")
            try:
                await page.wait_for_load_state("networkidle", timeout=10000)
                await self._reindex_page(page, session)

                return RecoveryResult(
                    success=True,
                    strategy_used=RecoveryStrategy.WAIT_AND_RETRY,
                    should_continue=True,
                    message="Waited for page to finish loading",
                    page_reindexed=True,
                )
            except Exception:
                pass

        # Try simple retry
        return RecoveryResult(
            success=True,
            strategy_used=RecoveryStrategy.RETRY,
            should_continue=True,
            message="Timeout occurred - retry recommended",
        )

    async def _try_scroll_and_find(
        self,
        target: int,
        page: 'Page',
        session: 'BrowserSession',
    ) -> RecoveryResult:
        """Try scrolling to find element that might be off-screen"""

        try:
            # Scroll down in increments
            for scroll_amount in [300, 600, 1000]:
                await page.evaluate(f"window.scrollBy(0, {scroll_amount})")
                await page.wait_for_timeout(200)

                selector = f'[data-usa-index="{target}"]'
                element = await page.query_selector(selector)
                if element:
                    is_visible = await element.is_visible()
                    if is_visible:
                        logger.info(f"Found element {target} after scrolling")
                        return RecoveryResult(
                            success=True,
                            strategy_used=RecoveryStrategy.SCROLL_AND_RETRY,
                            new_element_index=target,
                            should_continue=True,
                            message="Found element after scrolling",
                        )

            # Scroll back to top
            await page.evaluate("window.scrollTo(0, 0)")

        except Exception as e:
            logger.debug(f"Scroll recovery failed: {e}")

        return RecoveryResult(
            success=False,
            strategy_used=RecoveryStrategy.SCROLL_AND_RETRY,
            should_continue=True,
        )

    async def _try_reindex_page(
        self,
        target: int,
        page: 'Page',
        session: 'BrowserSession',
    ) -> RecoveryResult:
        """Try re-indexing the page to find element with new index"""

        try:
            logger.info("Re-indexing page for error recovery")

            # Get original element text if available
            original_text = ""
            original_ref = session.elements.get(target)
            if original_ref:
                original_text = original_ref.text_signature

            # Re-index
            new_elements = await index_page(page)
            session.elements = {e.index: e for e in new_elements}

            # Try to find element with same text
            if original_text:
                for element in new_elements:
                    if element.text_signature and original_text.lower() in element.text_signature.lower():
                        logger.info(f"Found matching element at new index {element.index}")
                        return RecoveryResult(
                            success=True,
                            strategy_used=RecoveryStrategy.REINDEX_PAGE,
                            new_element_index=element.index,
                            should_continue=True,
                            message=f"Found element at new index {element.index}",
                            page_reindexed=True,
                        )

            # Check if original index still exists
            if target in session.elements:
                return RecoveryResult(
                    success=True,
                    strategy_used=RecoveryStrategy.REINDEX_PAGE,
                    new_element_index=target,
                    should_continue=True,
                    message="Element found after re-index",
                    page_reindexed=True,
                )

        except Exception as e:
            logger.error(f"Re-index recovery failed: {e}")

        return RecoveryResult(
            success=False,
            strategy_used=RecoveryStrategy.REINDEX_PAGE,
            should_continue=True,
            page_reindexed=True,
        )

    async def _try_alternatives(
        self,
        alternatives: list,
        page: 'Page',
        session: 'BrowserSession',
    ) -> RecoveryResult:
        """Try alternative element targets"""

        for alt_index in alternatives:
            try:
                selector = f'[data-usa-index="{alt_index}"]'
                element = await page.query_selector(selector)
                if element:
                    is_visible = await element.is_visible()
                    if is_visible:
                        logger.info(f"Found alternative element at index {alt_index}")
                        return RecoveryResult(
                            success=True,
                            strategy_used=RecoveryStrategy.ALTERNATIVE_SELECTOR,
                            new_element_index=alt_index,
                            should_continue=True,
                            message=f"Using alternative element {alt_index}",
                        )
            except Exception:
                continue

        return RecoveryResult(
            success=False,
            strategy_used=RecoveryStrategy.ALTERNATIVE_SELECTOR,
            should_continue=True,
        )

    async def _try_wait_and_find(
        self,
        target: int,
        page: 'Page',
        session: 'BrowserSession',
        max_wait_ms: int = 5000,
    ) -> RecoveryResult:
        """Wait for element to appear (for dynamic content)"""

        try:
            selector = f'[data-usa-index="{target}"]'
            await page.wait_for_selector(selector, state="visible", timeout=max_wait_ms)

            logger.info(f"Element {target} appeared after waiting")
            return RecoveryResult(
                success=True,
                strategy_used=RecoveryStrategy.WAIT_AND_RETRY,
                new_element_index=target,
                should_continue=True,
                message="Element appeared after waiting",
            )
        except Exception:
            pass

        return RecoveryResult(
            success=False,
            strategy_used=RecoveryStrategy.WAIT_AND_RETRY,
            should_continue=True,
        )

    async def _reindex_page(
        self,
        page: 'Page',
        session: 'BrowserSession',
    ) -> None:
        """Helper to re-index page and update session"""
        new_elements = await index_page(page)
        session.elements = {e.index: e for e in new_elements}
        logger.info(f"Re-indexed page with {len(new_elements)} elements")

    def _extract_domain(self, url: str) -> str:
        """Extract domain from URL"""
        try:
            from urllib.parse import urlparse
            parsed = urlparse(url)
            return parsed.netloc.lower()
        except Exception:
            return url
