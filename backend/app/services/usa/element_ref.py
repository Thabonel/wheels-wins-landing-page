"""
Stable Element References for Universal Site Access

Provides element references that survive DOM changes through a 3-tier fallback system.
"""

from dataclasses import dataclass
from typing import Optional, Dict, TYPE_CHECKING
import logging

if TYPE_CHECKING:
    from playwright.async_api import Page, ElementHandle
    from .session_manager import BrowserSession

logger = logging.getLogger(__name__)


class ElementNotFoundError(Exception):
    """Raised when an element cannot be resolved after all fallback attempts"""
    pass


@dataclass
class ElementRef:
    """
    Stable element reference that survives DOM changes.

    Uses a 3-tier fallback system:
    - Tier 1: data-usa-index attribute (injected)
    - Tier 2: Stable selector (id, data-testid)
    - Tier 3: Text + tag matching

    If all fail, triggers auto re-index and retries once.
    """
    index: int
    tag: str
    text_signature: str
    stable_selector: Optional[str]
    bounding_box: Optional[Dict]

    async def resolve(self, page: 'Page', session: 'BrowserSession') -> 'ElementHandle':
        """
        Resolve element with 3-tier fallback, auto re-index on total failure.

        Args:
            page: Playwright page instance
            session: Browser session containing element cache

        Returns:
            ElementHandle for the resolved element

        Raises:
            ElementNotFoundError: If element cannot be found after all attempts
        """
        # Tier 1: Injected data attribute (most reliable)
        try:
            el = await page.locator(f'[data-usa-index="{self.index}"]').first
            if el:
                is_visible = await el.is_visible()
                if is_visible:
                    logger.debug(f"Element {self.index} resolved via data-usa-index")
                    return el
        except Exception as e:
            logger.debug(f"Tier 1 failed for element {self.index}: {e}")

        # Tier 2: Stable selector (id or data-testid)
        if self.stable_selector:
            try:
                el = await page.locator(self.stable_selector).first
                if el:
                    is_visible = await el.is_visible()
                    if is_visible:
                        logger.debug(f"Element {self.index} resolved via stable selector: {self.stable_selector}")
                        return el
            except Exception as e:
                logger.debug(f"Tier 2 failed for element {self.index}: {e}")

        # Tier 3: Text + tag matching
        if self.text_signature:
            try:
                # Escape special characters in text for selector
                safe_text = self.text_signature[:30].replace('"', '\\"')
                el = await page.locator(f'{self.tag}:has-text("{safe_text}")').first
                if el:
                    is_visible = await el.is_visible()
                    if is_visible:
                        logger.debug(f"Element {self.index} resolved via text matching")
                        return el
            except Exception as e:
                logger.debug(f"Tier 3 failed for element {self.index}: {e}")

        # All fallbacks failed - attempt auto re-index
        logger.info(f"All fallbacks failed for element {self.index}, attempting re-index")

        from .element_indexer import index_page
        new_elements = await index_page(page)
        session.elements = {e.index: e for e in new_elements}

        # Try one more time with fresh index
        new_ref = session.elements.get(self.index)
        if new_ref and new_ref.text_signature == self.text_signature:
            try:
                el = await page.locator(f'[data-usa-index="{self.index}"]').first
                if el:
                    is_visible = await el.is_visible()
                    if is_visible:
                        logger.info(f"Element {self.index} resolved after re-index")
                        return el
            except Exception as e:
                logger.debug(f"Post re-index resolution failed: {e}")

        raise ElementNotFoundError(
            f"Element {self.index} ('{self.text_signature}') no longer exists. "
            "The page may have changed - try index_page again."
        )

    def to_dict(self) -> Dict:
        """Convert to dictionary for JSON serialization"""
        return {
            "index": self.index,
            "tag": self.tag,
            "text": self.text_signature,
            "has_stable_selector": self.stable_selector is not None,
        }
