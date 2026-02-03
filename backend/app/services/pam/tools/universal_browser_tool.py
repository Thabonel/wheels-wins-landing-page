"""
Universal Browser Tool - Browser Automation for PAM

Enables PAM to interact with any website - fill forms, click buttons, extract data.
Part of the OpenClaw-inspired universal capabilities.
"""

from typing import Dict, Any, Optional, List
from .base_tool import BaseTool, ToolResult
from .tool_capabilities import ToolCapability
from app.core.logging import get_logger
from app.core.url_validator import validate_url_safe, SSRFProtectionError

logger = get_logger(__name__)

# Blocked domains for safety
BLOCKED_DOMAINS = [
    "paypal.com", "stripe.com", "square.com",  # Payment processors
    "chase.com", "bankofamerica.com", "wellsfargo.com", "citi.com",  # Banks
    "venmo.com", "zelle.com", "cashapp.com",  # Money transfer
    "irs.gov", "ssa.gov",  # Government financial
    "login.gov", "id.me",  # Identity services
]

# Destructive action keywords that require confirmation
DESTRUCTIVE_KEYWORDS = ["delete", "remove", "cancel", "terminate", "close account", "unsubscribe"]

# Tool function definition for Claude
UNIVERSAL_BROWSER_FUNCTION = {
    "name": "universal_browser",
    "description": """Interact with any website - navigate, fill forms, click buttons, extract data. Use this when the user wants to perform actions on a website like booking a campground, filling out a form, or searching for specific information. NOT for simple URL data extraction (use universal_extract for that).""",
    "parameters": {
        "type": "object",
        "properties": {
            "action": {
                "type": "string",
                "enum": [
                    "navigate", "index_page", "click", "type", "fill_form",
                    "extract", "scroll", "screenshot", "get_element_text",
                    "select_option", "pause", "resume"
                ],
                "description": "The browser action to perform"
            },
            "url": {
                "type": "string",
                "description": "URL to navigate to (required for 'navigate' action)"
            },
            "element_index": {
                "type": "integer",
                "description": "Numeric index of element to interact with (from index_page results)"
            },
            "text": {
                "type": "string",
                "description": "Text to type or search for"
            },
            "form_data": {
                "type": "object",
                "description": "Key-value pairs for form filling (field_type -> value)",
                "additionalProperties": {"type": "string"}
            },
            "intent": {
                "type": "string",
                "description": "Natural language description of what to accomplish"
            },
            "scroll_direction": {
                "type": "string",
                "enum": ["up", "down", "to_element"],
                "description": "Direction to scroll"
            },
            "wait_for": {
                "type": "string",
                "description": "Condition to wait for after action (e.g., 'navigation', 'element:5')"
            }
        },
        "required": ["action"]
    }
}


class UniversalBrowserTool(BaseTool):
    """
    PAM tool for universal browser automation.

    Capabilities:
    - Navigate to any URL
    - Index page elements (OpenClaw numeric refs)
    - Click, type, select on elements by index
    - Fill entire forms with user data
    - Extract text and data from elements
    - Take screenshots for verification
    - Pause/resume for user intervention

    Safety:
    - Blocks banking and payment sites
    - Requires confirmation for destructive actions
    - Rate limited per user
    """

    def __init__(self, user_jwt: Optional[str] = None):
        super().__init__(
            tool_name="universal_browser",
            description="Interact with any website - navigate, fill forms, click buttons",
            capabilities=[ToolCapability.EXTERNAL_API, ToolCapability.BROWSE],
            user_jwt=user_jwt
        )
        self._session_manager = None
        self._action_executor = None
        self._form_detector = None
        self._intent_parser = None

    async def initialize(self):
        """Lazy initialization of USA components"""
        try:
            from app.services.usa import session_manager
            self._session_manager = session_manager
            self.is_initialized = True
            logger.info("UniversalBrowserTool initialized successfully")
        except ImportError as e:
            logger.warning(f"USA service not available: {e}")
            self.is_initialized = False
        except Exception as e:
            logger.error(f"Failed to initialize UniversalBrowserTool: {e}")
            self.is_initialized = False

    async def execute(self, user_id: str, parameters: Dict[str, Any] = None) -> ToolResult:
        """
        Execute browser automation action.

        Args:
            user_id: The user requesting automation
            parameters: Action-specific parameters

        Returns:
            ToolResult with action results
        """
        parameters = parameters or {}
        action = parameters.get("action")

        if not action:
            return self._create_error_result("Action is required")

        # Check initialization
        if not self._session_manager:
            await self.initialize()
            if not self._session_manager:
                return self._create_error_result(
                    "Browser automation service is not available. Please try again later."
                )

        # Route to appropriate handler
        try:
            if action == "navigate":
                return await self._handle_navigate(user_id, parameters)
            elif action == "index_page":
                return await self._handle_index_page(user_id, parameters)
            elif action == "click":
                return await self._handle_click(user_id, parameters)
            elif action == "type":
                return await self._handle_type(user_id, parameters)
            elif action == "fill_form":
                return await self._handle_fill_form(user_id, parameters)
            elif action == "extract":
                return await self._handle_extract(user_id, parameters)
            elif action == "get_element_text":
                return await self._handle_get_text(user_id, parameters)
            elif action == "select_option":
                return await self._handle_select(user_id, parameters)
            elif action == "scroll":
                return await self._handle_scroll(user_id, parameters)
            elif action == "screenshot":
                return await self._handle_screenshot(user_id, parameters)
            elif action == "pause":
                return await self._handle_pause(user_id, parameters)
            elif action == "resume":
                return await self._handle_resume(user_id, parameters)
            else:
                return self._create_error_result(f"Unknown action: {action}")

        except Exception as e:
            logger.error(f"Browser automation error: {e}")
            return self._create_error_result(f"Browser automation error: {str(e)}")

    async def _handle_navigate(self, user_id: str, params: Dict[str, Any]) -> ToolResult:
        """Navigate to a URL"""
        url = params.get("url")
        if not url:
            return self._create_error_result("URL is required for navigate action")

        # SSRF protection - validate URL before any network access
        try:
            validate_url_safe(url)
        except SSRFProtectionError:
            logger.warning(f"SSRF protection blocked navigation to: {url}")
            return self._create_error_result(
                "This URL is not accessible for security reasons. Only public websites can be accessed."
            )

        # Security: Check blocked domains
        if self._is_blocked_domain(url):
            return self._create_error_result(
                "This website is blocked for security reasons. PAM cannot interact with banking, payment, or sensitive financial sites."
            )

        try:
            session = await self._session_manager.get_or_create_session(user_id)
            page = session.page

            await page.goto(url, wait_until="networkidle", timeout=30000)

            # Auto-index the page after navigation
            from app.services.usa import index_page
            elements = await index_page(page)

            return self._create_success_result({
                "navigated_to": url,
                "page_title": await page.title(),
                "elements_indexed": len(elements),
                "element_summary": self._summarize_elements(elements[:10])
            })

        except Exception as e:
            return self._create_error_result(f"Navigation failed: {str(e)}")

    async def _handle_index_page(self, user_id: str, params: Dict[str, Any]) -> ToolResult:
        """Index interactive elements on the current page"""
        try:
            session = await self._session_manager.get_session(user_id)
            if not session:
                return self._create_error_result("No active browser session. Use 'navigate' first.")

            from app.services.usa import index_page
            elements = await index_page(session.page)

            return self._create_success_result({
                "elements_indexed": len(elements),
                "elements": self._format_elements(elements)
            })

        except Exception as e:
            return self._create_error_result(f"Page indexing failed: {str(e)}")

    async def _handle_click(self, user_id: str, params: Dict[str, Any]) -> ToolResult:
        """Click on an element by index"""
        element_index = params.get("element_index")
        if element_index is None:
            return self._create_error_result("element_index is required for click action")

        try:
            session = await self._session_manager.get_session(user_id)
            if not session:
                return self._create_error_result("No active browser session. Use 'navigate' first.")

            page = session.page

            # Find element by data-usa-index
            element = await page.query_selector(f'[data-usa-index="{element_index}"]')
            if not element:
                return self._create_error_result(f"Element [{element_index}] not found. Try 'index_page' to refresh.")

            # Get element text for confirmation
            element_text = await element.text_content() or ""

            # Check for destructive actions
            if any(kw in element_text.lower() for kw in DESTRUCTIVE_KEYWORDS):
                return self._create_success_result({
                    "requires_confirmation": True,
                    "element_text": element_text.strip()[:100],
                    "message": f"This appears to be a destructive action ({element_text[:50]}...). Please confirm you want to proceed."
                })

            await element.click()

            # Wait for any navigation or content change
            await page.wait_for_timeout(1000)

            return self._create_success_result({
                "clicked_element": element_index,
                "element_text": element_text.strip()[:100],
                "current_url": page.url
            })

        except Exception as e:
            return self._create_error_result(f"Click failed: {str(e)}")

    async def _handle_type(self, user_id: str, params: Dict[str, Any]) -> ToolResult:
        """Type text into an element"""
        element_index = params.get("element_index")
        text = params.get("text")

        if element_index is None:
            return self._create_error_result("element_index is required for type action")
        if not text:
            return self._create_error_result("text is required for type action")

        try:
            session = await self._session_manager.get_session(user_id)
            if not session:
                return self._create_error_result("No active browser session. Use 'navigate' first.")

            page = session.page

            element = await page.query_selector(f'[data-usa-index="{element_index}"]')
            if not element:
                return self._create_error_result(f"Element [{element_index}] not found.")

            # Clear existing content and type new text
            await element.click()
            await element.fill(text)

            return self._create_success_result({
                "typed_into_element": element_index,
                "text_length": len(text)
            })

        except Exception as e:
            return self._create_error_result(f"Type failed: {str(e)}")

    async def _handle_fill_form(self, user_id: str, params: Dict[str, Any]) -> ToolResult:
        """Auto-fill a form with user data"""
        form_data = params.get("form_data", {})

        try:
            session = await self._session_manager.get_session(user_id)
            if not session:
                return self._create_error_result("No active browser session. Use 'navigate' first.")

            page = session.page

            # Try to import form detector
            try:
                from app.services.usa.form_detector import FormDetector
                detector = FormDetector()
                fields = await detector.detect_form_fields(page)
                field_mapping = await detector.map_user_data_to_fields(form_data, fields)
            except ImportError:
                # Fallback: simple form filling by input type
                field_mapping = await self._simple_form_mapping(page, form_data)

            filled_count = 0
            errors = []

            for element_index, value in field_mapping.items():
                try:
                    element = await page.query_selector(f'[data-usa-index="{element_index}"]')
                    if element:
                        await element.fill(str(value))
                        filled_count += 1
                except Exception as e:
                    errors.append(f"Field {element_index}: {str(e)}")

            return self._create_success_result({
                "fields_filled": filled_count,
                "total_fields": len(field_mapping),
                "errors": errors if errors else None
            })

        except Exception as e:
            return self._create_error_result(f"Form fill failed: {str(e)}")

    async def _handle_extract(self, user_id: str, params: Dict[str, Any]) -> ToolResult:
        """Extract data from the current page"""
        intent = params.get("intent", "extract all visible text")

        try:
            session = await self._session_manager.get_session(user_id)
            if not session:
                return self._create_error_result("No active browser session. Use 'navigate' first.")

            page = session.page

            # Get page content
            title = await page.title()
            url = page.url

            # Extract main text content
            text_content = await page.evaluate('''
                () => {
                    const main = document.querySelector('main, article, [role="main"], .content, #content');
                    if (main) return main.innerText;
                    return document.body.innerText;
                }
            ''')

            # Truncate if too long
            if len(text_content) > 5000:
                text_content = text_content[:5000] + "...[truncated]"

            return self._create_success_result({
                "url": url,
                "title": title,
                "content": text_content,
                "content_length": len(text_content)
            })

        except Exception as e:
            return self._create_error_result(f"Extraction failed: {str(e)}")

    async def _handle_get_text(self, user_id: str, params: Dict[str, Any]) -> ToolResult:
        """Get text content of a specific element"""
        element_index = params.get("element_index")
        if element_index is None:
            return self._create_error_result("element_index is required")

        try:
            session = await self._session_manager.get_session(user_id)
            if not session:
                return self._create_error_result("No active browser session.")

            element = await session.page.query_selector(f'[data-usa-index="{element_index}"]')
            if not element:
                return self._create_error_result(f"Element [{element_index}] not found.")

            text = await element.text_content()
            return self._create_success_result({
                "element_index": element_index,
                "text": text.strip() if text else ""
            })

        except Exception as e:
            return self._create_error_result(f"Get text failed: {str(e)}")

    async def _handle_select(self, user_id: str, params: Dict[str, Any]) -> ToolResult:
        """Select an option from a dropdown"""
        element_index = params.get("element_index")
        text = params.get("text")

        if element_index is None or not text:
            return self._create_error_result("element_index and text are required for select")

        try:
            session = await self._session_manager.get_session(user_id)
            if not session:
                return self._create_error_result("No active browser session.")

            element = await session.page.query_selector(f'[data-usa-index="{element_index}"]')
            if not element:
                return self._create_error_result(f"Element [{element_index}] not found.")

            await element.select_option(label=text)
            return self._create_success_result({
                "selected": text,
                "element_index": element_index
            })

        except Exception as e:
            return self._create_error_result(f"Select failed: {str(e)}")

    async def _handle_scroll(self, user_id: str, params: Dict[str, Any]) -> ToolResult:
        """Scroll the page"""
        direction = params.get("scroll_direction", "down")
        element_index = params.get("element_index")

        try:
            session = await self._session_manager.get_session(user_id)
            if not session:
                return self._create_error_result("No active browser session.")

            page = session.page

            if direction == "to_element" and element_index is not None:
                element = await page.query_selector(f'[data-usa-index="{element_index}"]')
                if element:
                    await element.scroll_into_view_if_needed()
            elif direction == "down":
                await page.evaluate("window.scrollBy(0, 500)")
            elif direction == "up":
                await page.evaluate("window.scrollBy(0, -500)")

            return self._create_success_result({"scrolled": direction})

        except Exception as e:
            return self._create_error_result(f"Scroll failed: {str(e)}")

    async def _handle_screenshot(self, user_id: str, params: Dict[str, Any]) -> ToolResult:
        """Take a screenshot of the current page"""
        try:
            session = await self._session_manager.get_session(user_id)
            if not session:
                return self._create_error_result("No active browser session.")

            screenshot_bytes = await session.page.screenshot(full_page=False)

            # Return info about screenshot (actual storage would be handled by caller)
            return self._create_success_result({
                "screenshot_taken": True,
                "size_bytes": len(screenshot_bytes),
                "url": session.page.url,
                "title": await session.page.title()
            }, metadata={"screenshot_data": screenshot_bytes})

        except Exception as e:
            return self._create_error_result(f"Screenshot failed: {str(e)}")

    async def _handle_pause(self, user_id: str, params: Dict[str, Any]) -> ToolResult:
        """Pause automation for user intervention"""
        try:
            session = await self._session_manager.get_session(user_id)
            if session:
                session.paused = True

            return self._create_success_result({
                "paused": True,
                "message": "Browser automation paused. The user can now interact with the page manually. Use 'resume' when ready to continue."
            })

        except Exception as e:
            return self._create_error_result(f"Pause failed: {str(e)}")

    async def _handle_resume(self, user_id: str, params: Dict[str, Any]) -> ToolResult:
        """Resume automation after user intervention"""
        try:
            session = await self._session_manager.get_session(user_id)
            if session:
                session.paused = False

                # Re-index the page after manual interaction
                from app.services.usa import index_page
                elements = await index_page(session.page)

                return self._create_success_result({
                    "resumed": True,
                    "current_url": session.page.url,
                    "elements_indexed": len(elements)
                })

            return self._create_error_result("No active session to resume.")

        except Exception as e:
            return self._create_error_result(f"Resume failed: {str(e)}")

    def _is_blocked_domain(self, url: str) -> bool:
        """Check if URL is on the blocked list"""
        try:
            from urllib.parse import urlparse
            domain = urlparse(url).netloc.lower()
            return any(blocked in domain for blocked in BLOCKED_DOMAINS)
        except Exception as e:
            # Log but don't block - safer to allow than block all on parse errors
            self.logger.debug(f"URL parse error in blocked domain check: {e}")
            return False

    def _summarize_elements(self, elements: list) -> List[Dict[str, Any]]:
        """Create a summary of indexed elements for the response"""
        return [
            {
                "index": el.index,
                "tag": el.tag,
                "text": el.text_signature[:50] if el.text_signature else None
            }
            for el in elements
        ]

    def _format_elements(self, elements: list) -> List[Dict[str, Any]]:
        """Format all elements for detailed response"""
        return [
            {
                "index": el.index,
                "tag": el.tag,
                "text": el.text_signature,
                "selector": el.stable_selector
            }
            for el in elements
        ]

    async def _simple_form_mapping(self, page, form_data: Dict[str, Any]) -> Dict[int, str]:
        """Simple form field mapping by input type/name"""
        mapping = {}

        # Get all form inputs
        inputs = await page.query_selector_all('input, select, textarea')

        for i, inp in enumerate(inputs):
            try:
                input_type = await inp.get_attribute("type") or "text"
                name = await inp.get_attribute("name") or ""
                placeholder = await inp.get_attribute("placeholder") or ""

                # Match form_data keys to input fields
                for key, value in form_data.items():
                    key_lower = key.lower()
                    if (key_lower in name.lower() or
                        key_lower in placeholder.lower() or
                        key_lower == input_type):
                        # Get the USA index if available
                        usa_index = await inp.get_attribute("data-usa-index")
                        if usa_index:
                            mapping[int(usa_index)] = value
                            break
            except Exception as e:
                # Log but continue - one bad input shouldn't stop form mapping
                self.logger.debug(f"Error mapping form input {i}: {e}")
                continue

        return mapping


# Export function definition for registration
def get_tool_definition() -> Dict[str, Any]:
    """Get the OpenAI function definition for this tool"""
    return UNIVERSAL_BROWSER_FUNCTION


def create_tool(user_jwt: Optional[str] = None) -> UniversalBrowserTool:
    """Factory function to create tool instance"""
    return UniversalBrowserTool(user_jwt=user_jwt)
