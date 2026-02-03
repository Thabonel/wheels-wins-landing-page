"""
Action Executor for Universal Site Access

Executes browser actions using numeric element references from the element indexer.
"""

import logging
import re
import time
from typing import Dict, Optional, TYPE_CHECKING

from .models import ActionResult, ActionType, FormField, FormResult
from .element_ref import ElementNotFoundError

if TYPE_CHECKING:
    from playwright.async_api import Page
    from .session_manager import BrowserSession

logger = logging.getLogger(__name__)


# Patterns that indicate potential JavaScript injection attacks
_DANGEROUS_PATTERNS = [
    re.compile(r'<script[^>]*>.*?</script>', re.IGNORECASE | re.DOTALL),
    re.compile(r'<script[^>]*>', re.IGNORECASE),
    re.compile(r'</script>', re.IGNORECASE),
    re.compile(r'javascript:', re.IGNORECASE),
    re.compile(r'\bon\w+\s*=', re.IGNORECASE),  # onclick=, onerror=, etc.
    re.compile(r'data:text/html', re.IGNORECASE),
    re.compile(r'<iframe[^>]*>', re.IGNORECASE),
    re.compile(r'<object[^>]*>', re.IGNORECASE),
    re.compile(r'<embed[^>]*>', re.IGNORECASE),
]


def sanitize_input(value: str, field_name: str = "input") -> str:
    """
    Sanitize input to prevent JavaScript injection attacks.

    Args:
        value: The input value to sanitize
        field_name: Name of the field for logging purposes

    Returns:
        Sanitized value with dangerous patterns removed

    Raises:
        ValueError: If the input contains malicious patterns that cannot be safely sanitized
    """
    if not value:
        return value

    original_value = value
    sanitized = value

    for pattern in _DANGEROUS_PATTERNS:
        if pattern.search(sanitized):
            logger.warning(
                f"Potential injection attempt detected in {field_name}, "
                f"pattern: {pattern.pattern}"
            )
            # Remove the dangerous pattern
            sanitized = pattern.sub('', sanitized)

    # If significant content was removed, log it (but don't expose the actual value)
    if len(sanitized) < len(original_value) * 0.5:
        logger.warning(
            f"Significant content removed during sanitization of {field_name}, "
            f"original length: {len(original_value)}, sanitized length: {len(sanitized)}"
        )

    return sanitized.strip()


class ActionExecutor:
    """
    Executes browser actions on indexed page elements.

    All actions use numeric element references from element_indexer.
    Provides error handling and result reporting for each action.
    """

    def __init__(self, session: 'BrowserSession'):
        """
        Initialize executor with a browser session.

        Args:
            session: Browser session containing page and element cache
        """
        self.session = session

    async def click_element(
        self,
        element_index: int,
        page: 'Page',
        wait_for_navigation: bool = False,
    ) -> ActionResult:
        """
        Click an element by its index.

        Args:
            element_index: Index from element_indexer
            page: Playwright page instance
            wait_for_navigation: Whether to wait for page navigation after click

        Returns:
            ActionResult with success status and any error details
        """
        start_time = time.time()
        logger.info(f"Clicking element [{element_index}]")

        try:
            element_ref = self.session.elements.get(element_index)
            if not element_ref:
                return ActionResult(
                    success=False,
                    action_type=ActionType.CLICK,
                    element_index=element_index,
                    error_message=f"Element index {element_index} not found in session cache",
                )

            # Resolve element handle
            element = await element_ref.resolve(page, self.session)

            # Scroll into view if needed
            await element.scroll_into_view_if_needed()

            # Execute click with optional navigation wait
            if wait_for_navigation:
                async with page.expect_navigation(wait_until="domcontentloaded", timeout=10000):
                    await element.click()
                page_changed = True
                new_url = page.url
            else:
                await element.click()
                page_changed = False
                new_url = None

            execution_time = int((time.time() - start_time) * 1000)
            logger.info(f"Click on [{element_index}] successful in {execution_time}ms")

            return ActionResult(
                success=True,
                action_type=ActionType.CLICK,
                element_index=element_index,
                execution_time_ms=execution_time,
                page_changed=page_changed,
                new_url=new_url,
            )

        except ElementNotFoundError as e:
            logger.warning(f"Element [{element_index}] not found: {e}")
            return ActionResult(
                success=False,
                action_type=ActionType.CLICK,
                element_index=element_index,
                error_message=str(e),
                execution_time_ms=int((time.time() - start_time) * 1000),
            )
        except Exception as e:
            logger.error(f"Click failed on [{element_index}]: {e}")
            return ActionResult(
                success=False,
                action_type=ActionType.CLICK,
                element_index=element_index,
                error_message=str(e),
                execution_time_ms=int((time.time() - start_time) * 1000),
            )

    async def type_text(
        self,
        element_index: int,
        text: str,
        page: 'Page',
        clear_first: bool = True,
        delay_ms: int = 50,
        is_sensitive: bool = False,
    ) -> ActionResult:
        """
        Type text into an element.

        Args:
            element_index: Index from element_indexer
            text: Text to type
            page: Playwright page instance
            clear_first: Whether to clear existing content first
            delay_ms: Delay between keystrokes (for realistic typing)
            is_sensitive: If True, value won't be logged

        Returns:
            ActionResult with success status
        """
        start_time = time.time()

        # Sanitize input to prevent injection attacks
        sanitized_text = sanitize_input(text, f"element_{element_index}")

        # Log appropriately based on sensitivity
        if is_sensitive:
            logger.info(f"Typing sensitive value into element [{element_index}]")
        else:
            # Only show first 20 chars of non-sensitive values
            preview = sanitized_text[:20] + "..." if len(sanitized_text) > 20 else sanitized_text
            logger.info(f"Typing into element [{element_index}]: '{preview}'")

        try:
            element_ref = self.session.elements.get(element_index)
            if not element_ref:
                return ActionResult(
                    success=False,
                    action_type=ActionType.TYPE,
                    element_index=element_index,
                    error_message=f"Element index {element_index} not found",
                )

            element = await element_ref.resolve(page, self.session)
            await element.scroll_into_view_if_needed()

            # Click to focus
            await element.click()

            # Clear if requested
            if clear_first:
                await element.fill("")

            # Type with delay for realistic behavior
            await element.type(sanitized_text, delay=delay_ms)

            execution_time = int((time.time() - start_time) * 1000)
            logger.info(f"Typed into [{element_index}] in {execution_time}ms")

            return ActionResult(
                success=True,
                action_type=ActionType.TYPE,
                element_index=element_index,
                execution_time_ms=execution_time,
            )

        except Exception as e:
            logger.error(f"Type failed on [{element_index}]: {e}")
            return ActionResult(
                success=False,
                action_type=ActionType.TYPE,
                element_index=element_index,
                error_message=str(e),
                execution_time_ms=int((time.time() - start_time) * 1000),
            )

    async def select_option(
        self,
        element_index: int,
        value: str,
        page: 'Page',
        by_label: bool = False,
    ) -> ActionResult:
        """
        Select an option in a dropdown/select element.

        Args:
            element_index: Index from element_indexer
            value: Value or label to select
            page: Playwright page instance
            by_label: If True, match by visible label; if False, by value attribute

        Returns:
            ActionResult with success status
        """
        start_time = time.time()

        # Sanitize the selection value
        sanitized_value = sanitize_input(value, f"select_{element_index}")
        logger.info(f"Selecting '{sanitized_value}' in element [{element_index}]")

        try:
            element_ref = self.session.elements.get(element_index)
            if not element_ref:
                return ActionResult(
                    success=False,
                    action_type=ActionType.SELECT,
                    element_index=element_index,
                    error_message=f"Element index {element_index} not found",
                )

            element = await element_ref.resolve(page, self.session)
            await element.scroll_into_view_if_needed()

            # Select by label or value
            if by_label:
                await element.select_option(label=sanitized_value)
            else:
                await element.select_option(value=sanitized_value)

            execution_time = int((time.time() - start_time) * 1000)
            logger.info(f"Selected in [{element_index}] in {execution_time}ms")

            return ActionResult(
                success=True,
                action_type=ActionType.SELECT,
                element_index=element_index,
                execution_time_ms=execution_time,
            )

        except Exception as e:
            logger.error(f"Select failed on [{element_index}]: {e}")
            return ActionResult(
                success=False,
                action_type=ActionType.SELECT,
                element_index=element_index,
                error_message=str(e),
                execution_time_ms=int((time.time() - start_time) * 1000),
            )

    async def scroll_to_element(
        self,
        element_index: int,
        page: 'Page',
    ) -> ActionResult:
        """
        Scroll an element into view.

        Args:
            element_index: Index from element_indexer
            page: Playwright page instance

        Returns:
            ActionResult with success status
        """
        start_time = time.time()
        logger.info(f"Scrolling to element [{element_index}]")

        try:
            element_ref = self.session.elements.get(element_index)
            if not element_ref:
                return ActionResult(
                    success=False,
                    action_type=ActionType.SCROLL,
                    element_index=element_index,
                    error_message=f"Element index {element_index} not found",
                )

            element = await element_ref.resolve(page, self.session)
            await element.scroll_into_view_if_needed()

            execution_time = int((time.time() - start_time) * 1000)
            logger.info(f"Scrolled to [{element_index}] in {execution_time}ms")

            return ActionResult(
                success=True,
                action_type=ActionType.SCROLL,
                element_index=element_index,
                execution_time_ms=execution_time,
            )

        except Exception as e:
            logger.error(f"Scroll failed for [{element_index}]: {e}")
            return ActionResult(
                success=False,
                action_type=ActionType.SCROLL,
                element_index=element_index,
                error_message=str(e),
                execution_time_ms=int((time.time() - start_time) * 1000),
            )

    async def extract_text(
        self,
        element_index: int,
        page: 'Page',
    ) -> str:
        """
        Extract text content from an element.

        Args:
            element_index: Index from element_indexer
            page: Playwright page instance

        Returns:
            Text content of the element, or empty string on failure
        """
        logger.info(f"Extracting text from element [{element_index}]")

        try:
            element_ref = self.session.elements.get(element_index)
            if not element_ref:
                logger.warning(f"Element index {element_index} not found")
                return ""

            element = await element_ref.resolve(page, self.session)
            text = await element.text_content() or ""
            text = " ".join(text.split())  # Normalize whitespace

            logger.debug(f"Extracted from [{element_index}]: '{text[:100]}'")
            return text

        except Exception as e:
            logger.error(f"Text extraction failed for [{element_index}]: {e}")
            return ""

    async def hover_element(
        self,
        element_index: int,
        page: 'Page',
    ) -> ActionResult:
        """
        Hover over an element.

        Args:
            element_index: Index from element_indexer
            page: Playwright page instance

        Returns:
            ActionResult with success status
        """
        start_time = time.time()
        logger.info(f"Hovering over element [{element_index}]")

        try:
            element_ref = self.session.elements.get(element_index)
            if not element_ref:
                return ActionResult(
                    success=False,
                    action_type=ActionType.HOVER,
                    element_index=element_index,
                    error_message=f"Element index {element_index} not found",
                )

            element = await element_ref.resolve(page, self.session)
            await element.scroll_into_view_if_needed()
            await element.hover()

            execution_time = int((time.time() - start_time) * 1000)
            return ActionResult(
                success=True,
                action_type=ActionType.HOVER,
                element_index=element_index,
                execution_time_ms=execution_time,
            )

        except Exception as e:
            logger.error(f"Hover failed on [{element_index}]: {e}")
            return ActionResult(
                success=False,
                action_type=ActionType.HOVER,
                element_index=element_index,
                error_message=str(e),
                execution_time_ms=int((time.time() - start_time) * 1000),
            )

    async def fill_form(
        self,
        form_data: Dict[int, str],
        page: 'Page',
        submit_after: bool = False,
        submit_element: Optional[int] = None,
        sensitive_fields: Optional[Dict[int, bool]] = None,
    ) -> FormResult:
        """
        Fill multiple form fields at once.

        Args:
            form_data: Dict mapping element_index -> value to fill
            page: Playwright page instance
            submit_after: Whether to submit the form after filling
            submit_element: Element index of submit button (if submit_after=True)
            sensitive_fields: Dict mapping element_index -> True if sensitive (password, etc.)

        Returns:
            FormResult with details of each field fill attempt
        """
        logger.info(f"Filling form with {len(form_data)} fields")
        start_time = time.time()

        field_results: Dict[int, ActionResult] = {}
        fields_filled = 0
        fields_failed = 0
        sensitive_fields = sensitive_fields or {}

        for element_index, value in form_data.items():
            if not value:
                continue

            is_sensitive = sensitive_fields.get(element_index, False)

            # Determine if this is a select or input
            element_ref = self.session.elements.get(element_index)
            if not element_ref:
                field_results[element_index] = ActionResult(
                    success=False,
                    action_type=ActionType.TYPE,
                    element_index=element_index,
                    error_message=f"Element {element_index} not found",
                )
                fields_failed += 1
                continue

            # Select elements need select_option, others use type
            if element_ref.tag == "select":
                result = await self.select_option(element_index, value, page, by_label=True)
            else:
                result = await self.type_text(
                    element_index, value, page, is_sensitive=is_sensitive
                )

            field_results[element_index] = result
            if result.success:
                fields_filled += 1
            else:
                fields_failed += 1

        # Submit if requested
        submitted = False
        if submit_after and submit_element:
            submit_result = await self.click_element(
                submit_element, page, wait_for_navigation=True
            )
            submitted = submit_result.success
            if not submitted:
                logger.warning(f"Form submit failed: {submit_result.error_message}")

        execution_time = int((time.time() - start_time) * 1000)
        success = fields_failed == 0 and (not submit_after or submitted)

        # Log without exposing sensitive field count details
        sensitive_count = sum(1 for idx in form_data.keys() if sensitive_fields.get(idx, False))
        logger.info(
            f"Form fill complete: {fields_filled} filled, {fields_failed} failed, "
            f"sensitive_fields={sensitive_count}, submitted={submitted}, time={execution_time}ms"
        )

        return FormResult(
            success=success,
            fields_filled=fields_filled,
            fields_failed=fields_failed,
            field_results=field_results,
            submitted=submitted,
        )

    async def fill_form_fields(
        self,
        fields: Dict[int, 'FormField'],
        page: 'Page',
        submit_after: bool = False,
        submit_element: Optional[int] = None,
    ) -> FormResult:
        """
        Fill form using FormField objects with built-in sensitivity handling.

        This method automatically handles encrypted sensitive values from FormField
        objects and ensures proper sanitization and logging.

        Args:
            fields: Dict mapping element_index -> FormField with values
            page: Playwright page instance
            submit_after: Whether to submit the form after filling
            submit_element: Element index of submit button (if submit_after=True)

        Returns:
            FormResult with details of each field fill attempt
        """
        form_data: Dict[int, str] = {}
        sensitive_fields: Dict[int, bool] = {}

        for element_index, field in fields.items():
            # Get value using the secure getter (handles decryption)
            value = field.get_value()
            if value:
                form_data[element_index] = value
                sensitive_fields[element_index] = field.sensitive

        return await self.fill_form(
            form_data=form_data,
            page=page,
            submit_after=submit_after,
            submit_element=submit_element,
            sensitive_fields=sensitive_fields,
        )

    async def wait_for_element(
        self,
        element_index: int,
        page: 'Page',
        timeout_ms: int = 5000,
        state: str = "visible",
    ) -> ActionResult:
        """
        Wait for an element to reach a specific state.

        Args:
            element_index: Index from element_indexer
            page: Playwright page instance
            timeout_ms: Maximum wait time in milliseconds
            state: State to wait for ("visible", "hidden", "attached", "detached")

        Returns:
            ActionResult with success status
        """
        start_time = time.time()
        logger.info(f"Waiting for element [{element_index}] to be {state}")

        try:
            element_ref = self.session.elements.get(element_index)
            if not element_ref:
                return ActionResult(
                    success=False,
                    action_type=ActionType.WAIT,
                    element_index=element_index,
                    error_message=f"Element index {element_index} not found",
                )

            # Use selector-based waiting
            selector = f'[data-usa-index="{element_index}"]'
            await page.wait_for_selector(selector, state=state, timeout=timeout_ms)

            execution_time = int((time.time() - start_time) * 1000)
            return ActionResult(
                success=True,
                action_type=ActionType.WAIT,
                element_index=element_index,
                execution_time_ms=execution_time,
            )

        except Exception as e:
            logger.warning(f"Wait for [{element_index}] timed out: {e}")
            return ActionResult(
                success=False,
                action_type=ActionType.WAIT,
                element_index=element_index,
                error_message=f"Timeout waiting for element: {e}",
                execution_time_ms=int((time.time() - start_time) * 1000),
            )
