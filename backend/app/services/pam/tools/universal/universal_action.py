"""
Universal Action Tool for PAM

Enables PAM to interact with any element on any website using numeric element references.

Supported actions:
- navigate: Go to a URL
- index_page: Index visible interactive elements
- click: Click an element by index
- type: Type text into an element
- get_text: Extract text from an element
- scroll: Scroll the page
- screenshot: Take a screenshot
- pause: Pause for manual user interaction
- resume: Resume after manual interaction
"""

import time
from typing import Dict, Any, Optional, List

from ..base_tool import BaseTool, ToolResult
from ..tool_capabilities import ToolCapability
from app.services.usa import (
    session_manager,
    index_page,
    rate_limiter,
    RateLimitError,
    ElementNotFoundError,
)

# Tool schema for Claude function calling
UNIVERSAL_ACTION_SCHEMA = {
    "name": "universal_action",
    "description": """
    Interact with any element on the current page.

    Workflow:
    1. navigate to URL
    2. index_page to see available elements
    3. click/type/get_text using element numbers

    Always run index_page first to see what's available.
    Use 'pause' to let user take over manually, 'resume' when ready to continue.

    Example: To add an item to a list:
    1. navigate to the page
    2. index_page to find the input field and button
    3. type in the input field (by index)
    4. click the add button (by index)
    """,
    "parameters": {
        "type": "object",
        "properties": {
            "action": {
                "type": "string",
                "enum": [
                    "navigate",
                    "index_page",
                    "click",
                    "type",
                    "get_text",
                    "scroll",
                    "screenshot",
                    "pause",
                    "resume"
                ],
                "description": "Action to perform"
            },
            "element_index": {
                "type": "integer",
                "description": "Element number from index_page result (required for click, type, get_text)"
            },
            "text": {
                "type": "string",
                "description": "Text to type (required for type action)"
            },
            "url": {
                "type": "string",
                "description": "URL to navigate to (required for navigate action)"
            }
        },
        "required": ["action"]
    }
}

# Keywords that indicate destructive actions requiring confirmation
DESTRUCTIVE_KEYWORDS = [
    'delete', 'remove', 'cancel', 'unsubscribe',
    'pay', 'purchase', 'buy', 'checkout', 'submit order',
    'close account', 'deactivate', 'terminate'
]

# Domains blocked for safety
BLOCKED_DOMAINS = [
    'stripe.com', 'paypal.com', 'square.com', 'braintree',
    'chase.com', 'wellsfargo.com', 'bankofamerica.com', 'citibank.com',
    'login.gov', 'irs.gov', 'ssa.gov',
]


class UniversalActionTool(BaseTool):
    """
    Universal Site Access tool for PAM.

    Enables interaction with any website element using numeric references.
    """

    def __init__(self, user_jwt: Optional[str] = None):
        super().__init__(
            tool_name="universal_action",
            description="Interact with any element on any website",
            capabilities=[ToolCapability.BROWSER_AUTOMATION],
            user_jwt=user_jwt
        )

    async def execute(self, user_id: str, parameters: Dict[str, Any] = None) -> ToolResult:
        """
        Execute universal action.

        Args:
            user_id: The user ID
            parameters: Action parameters including:
                - action: The action to perform
                - element_index: Element number (for click, type, get_text)
                - text: Text to type (for type action)
                - url: URL (for navigate action)

        Returns:
            ToolResult with action outcome
        """
        if not parameters:
            return self._create_error_result("No parameters provided")

        action = parameters.get("action")
        if not action:
            return self._create_error_result("Action is required")

        element_index = parameters.get("element_index")
        text = parameters.get("text")
        url = parameters.get("url")

        self.logger.info(f"Executing universal_action: {action} for user {user_id}")

        # Rate limit check
        try:
            rate_limiter.check(user_id)
        except RateLimitError as e:
            return self._create_error_result(
                f"Rate limited. Please wait {e.retry_after} seconds.",
                metadata={"retry_after": e.retry_after, "status": "rate_limited"}
            )

        # Domain blocklist check for navigate
        if action == "navigate" and url:
            if self._is_blocked_domain(url):
                return self._create_error_result(
                    "Navigation to payment/banking sites is not allowed for safety.",
                    metadata={"status": "blocked", "url": url}
                )

        try:
            # Get or create session
            session = await session_manager.get_or_create(user_id)

            # Check if session is paused
            if session.paused and action not in ("resume", "screenshot"):
                return self._create_success_result(
                    {
                        "status": "paused",
                        "message": "Session is paused. User is in manual control. Use 'resume' to continue."
                    }
                )

            # Execute action
            result = await self._execute_action(
                session, user_id, action, element_index, text, url
            )
            return result

        except ElementNotFoundError as e:
            return self._create_error_result(str(e), metadata={"status": "element_not_found"})
        except Exception as e:
            self.logger.error(f"Error executing {action}: {e}")
            return self._create_error_result(str(e), metadata={"status": "error", "action": action})

    async def _execute_action(
        self,
        session,
        user_id: str,
        action: str,
        element_index: Optional[int],
        text: Optional[str],
        url: Optional[str]
    ) -> ToolResult:
        """Execute the specific action"""

        if action == "navigate":
            return await self._action_navigate(session, user_id, url)

        elif action == "index_page":
            return await self._action_index_page(session, user_id)

        elif action == "click":
            return await self._action_click(session, user_id, element_index)

        elif action == "type":
            return await self._action_type(session, user_id, element_index, text)

        elif action == "get_text":
            return await self._action_get_text(session, element_index)

        elif action == "scroll":
            return await self._action_scroll(session, user_id)

        elif action == "screenshot":
            return await self._action_screenshot(session, user_id)

        elif action == "pause":
            return await self._action_pause(session)

        elif action == "resume":
            return await self._action_resume(session, user_id)

        else:
            return self._create_error_result(f"Unknown action: {action}")

    async def _action_navigate(self, session, user_id: str, url: Optional[str]) -> ToolResult:
        """Navigate to URL"""
        if not url:
            return self._create_error_result("URL is required for navigate action")

        await session.page.goto(url, wait_until="domcontentloaded", timeout=30000)
        screenshot_url = await self._take_screenshot(session, user_id)

        return self._create_success_result({
            "status": "navigated",
            "url": url,
            "screenshot": screenshot_url
        })

    async def _action_index_page(self, session, user_id: str) -> ToolResult:
        """Index visible elements on page"""
        elements = await index_page(session.page)
        session.elements = {e.index: e for e in elements}
        screenshot_url = await self._take_screenshot(session, user_id)

        return self._create_success_result({
            "status": "indexed",
            "element_count": len(elements),
            "elements": [e.to_dict() for e in elements],
            "screenshot": screenshot_url
        })

    async def _action_click(self, session, user_id: str, element_index: Optional[int]) -> ToolResult:
        """Click an element"""
        if element_index is None:
            return self._create_error_result("element_index is required for click action")

        ref = session.elements.get(element_index)
        if not ref:
            return self._create_error_result(
                f"Element {element_index} not found. Run index_page first."
            )

        # Check for destructive action
        if self._is_destructive(ref.text_signature):
            return self._create_success_result({
                "status": "confirmation_required",
                "message": f"This will click '{ref.text_signature}' which appears destructive. Please confirm with user first.",
                "element": element_index,
                "element_text": ref.text_signature
            })

        el = await ref.resolve(session.page, session)
        await el.click()

        # Wait for any navigation/loading
        try:
            await session.page.wait_for_load_state("domcontentloaded", timeout=10000)
        except Exception:
            pass  # Page might not navigate

        screenshot_url = await self._take_screenshot(session, user_id)

        return self._create_success_result({
            "status": "clicked",
            "element": element_index,
            "screenshot": screenshot_url
        })

    async def _action_type(
        self, session, user_id: str, element_index: Optional[int], text: Optional[str]
    ) -> ToolResult:
        """Type text into an element"""
        if element_index is None:
            return self._create_error_result("element_index is required for type action")
        if not text:
            return self._create_error_result("text is required for type action")

        ref = session.elements.get(element_index)
        if not ref:
            return self._create_error_result(
                f"Element {element_index} not found. Run index_page first."
            )

        el = await ref.resolve(session.page, session)
        await el.fill(text)
        screenshot_url = await self._take_screenshot(session, user_id)

        return self._create_success_result({
            "status": "typed",
            "element": element_index,
            "text": text,
            "screenshot": screenshot_url
        })

    async def _action_get_text(self, session, element_index: Optional[int]) -> ToolResult:
        """Extract text from an element"""
        if element_index is None:
            return self._create_error_result("element_index is required for get_text action")

        ref = session.elements.get(element_index)
        if not ref:
            return self._create_error_result(
                f"Element {element_index} not found. Run index_page first."
            )

        el = await ref.resolve(session.page, session)
        content = await el.text_content()
        content = ' '.join(content.split()) if content else ""

        return self._create_success_result({
            "status": "extracted",
            "element": element_index,
            "text": content[:500]  # Limit for context window
        })

    async def _action_scroll(self, session, user_id: str) -> ToolResult:
        """Scroll the page down"""
        await session.page.evaluate("window.scrollBy(0, 500)")
        screenshot_url = await self._take_screenshot(session, user_id)

        return self._create_success_result({
            "status": "scrolled",
            "screenshot": screenshot_url
        })

    async def _action_screenshot(self, session, user_id: str) -> ToolResult:
        """Take a screenshot"""
        screenshot_url = await self._take_screenshot(session, user_id)

        return self._create_success_result({
            "status": "screenshot",
            "url": screenshot_url
        })

    async def _action_pause(self, session) -> ToolResult:
        """Pause session for manual user interaction"""
        session.paused = True

        return self._create_success_result({
            "status": "paused",
            "message": "Session paused. User can now interact manually. Use 'resume' when ready to continue."
        })

    async def _action_resume(self, session, user_id: str) -> ToolResult:
        """Resume session after manual interaction"""
        session.paused = False

        # Re-index after manual interaction
        elements = await index_page(session.page)
        session.elements = {e.index: e for e in elements}
        screenshot_url = await self._take_screenshot(session, user_id)

        return self._create_success_result({
            "status": "resumed",
            "message": "Session resumed. Page has been re-indexed.",
            "element_count": len(elements),
            "screenshot": screenshot_url
        })

    async def _take_screenshot(self, session, user_id: str) -> str:
        """Take screenshot and return URL path"""
        timestamp = int(time.time())
        filename = f"usa_{user_id}_{timestamp}.png"
        path = f"/tmp/{filename}"

        try:
            await session.page.screenshot(path=path, full_page=False)
            return f"/api/v1/usa/screenshots/{filename}"
        except Exception as e:
            self.logger.error(f"Failed to take screenshot: {e}")
            return ""

    def _is_destructive(self, text: str) -> bool:
        """Check if element text suggests a destructive action"""
        if not text:
            return False
        text_lower = text.lower()
        return any(kw in text_lower for kw in DESTRUCTIVE_KEYWORDS)

    def _is_blocked_domain(self, url: str) -> bool:
        """Check if URL is a blocked domain"""
        url_lower = url.lower()
        return any(blocked in url_lower for blocked in BLOCKED_DOMAINS)
