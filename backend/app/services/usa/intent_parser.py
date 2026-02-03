"""
Intent Parser for Universal Site Access

Uses Claude to understand user intent and create structured action plans
for browser automation.
"""

import json
import logging
import os
from typing import Optional, List, TYPE_CHECKING

from anthropic import AsyncAnthropic

from .models import (
    ActionPlan,
    ActionStep,
    ActionType,
    WaitCondition,
    PageContext,
    RecoveryStrategy,
)

if TYPE_CHECKING:
    from .element_ref import ElementRef

logger = logging.getLogger(__name__)


INTENT_SYSTEM_PROMPT = """You are an expert at understanding user intent for web automation.
Given a user's request and the current page context with indexed elements, create a precise action plan.

You must respond with valid JSON in this exact format:
{
    "steps": [
        {
            "action_type": "click|type|select|scroll|extract|wait|navigate|submit|hover|fill_form",
            "target_element": <element_index_number_or_null>,
            "value": "<value_to_type_or_select_or_null>",
            "wait_condition": "none|navigation|network_idle|element_visible|element_hidden|text_present|timeout",
            "wait_timeout_ms": <milliseconds>,
            "description": "<what this step does>",
            "on_error": "retry|alternative_selector|reindex_page|scroll_and_retry|wait_and_retry|user_notification|skip|abort"
        }
    ],
    "estimated_time_ms": <total_estimated_time>,
    "confidence": <0.0_to_1.0>,
    "description": "<overall plan description>",
    "requires_confirmation": <true_if_involves_payment_or_submission>,
    "warnings": ["<any_warnings_or_concerns>"]
}

Rules:
1. Use element indices from the provided page elements list
2. For typing, always click the element first, then type
3. For forms, fill all required fields before submitting
4. Wait for page loads after navigation or form submission
5. Set requires_confirmation=true for checkout, payment, or irreversible actions
6. Be conservative with confidence - lower if elements might have changed
7. Include recovery strategies for each step
"""


class IntentParser:
    """
    Parses user intent into actionable browser automation plans.

    Uses Claude to understand natural language requests and map them
    to specific page elements and actions.
    """

    def __init__(self):
        api_key = os.getenv("ANTHROPIC_API_KEY") or os.getenv("ANTHROPIC-WHEELS-KEY")
        if not api_key:
            logger.warning("ANTHROPIC_API_KEY not set - intent parsing unavailable")
            self._client = None
        else:
            self._client = AsyncAnthropic(api_key=api_key)

        try:
            from app.config.ai_providers import ANTHROPIC_MODEL
            self._model = ANTHROPIC_MODEL
        except ImportError:
            self._model = "claude-sonnet-4-5-20250929"

        logger.info(f"IntentParser initialized with model: {self._model}")

    async def parse_intent(
        self,
        user_request: str,
        page_context: PageContext,
        elements: Optional[List['ElementRef']] = None,
        user_data: Optional[dict] = None,
    ) -> ActionPlan:
        """
        Parse user intent and create an action plan.

        Args:
            user_request: Natural language description of what user wants to do
            page_context: Current page context (URL, title, etc.)
            elements: List of indexed elements on the page
            user_data: Optional user profile data for form filling

        Returns:
            ActionPlan with steps to execute

        Raises:
            ValueError: If intent cannot be parsed
        """
        if not self._client:
            raise ValueError("AI client not configured - cannot parse intent")

        logger.info(f"Parsing intent: {user_request[:100]}...")

        prompt = self._build_prompt(user_request, page_context, elements, user_data)

        try:
            response = await self._client.messages.create(
                model=self._model,
                max_tokens=2048,
                temperature=0.1,  # Low temperature for consistent parsing
                system=INTENT_SYSTEM_PROMPT,
                messages=[{"role": "user", "content": prompt}],
            )

            response_text = response.content[0].text if response.content else ""
            logger.debug(f"Claude response: {response_text[:500]}")

            return self._parse_response(response_text)

        except Exception as e:
            logger.error(f"Intent parsing failed: {e}")
            raise ValueError(f"Failed to parse intent: {e}")

    def _build_prompt(
        self,
        user_request: str,
        page_context: PageContext,
        elements: Optional[List['ElementRef']],
        user_data: Optional[dict],
    ) -> str:
        """Build the prompt for Claude with all context"""

        # Format page context
        context_str = f"""
Current Page:
- URL: {page_context.url}
- Title: {page_context.title}
- Domain: {page_context.domain}
- Page Type: {page_context.page_type or 'unknown'}
- Element Count: {page_context.element_count}
- Forms Detected: {page_context.forms_detected}
- Has Captcha: {page_context.has_captcha}
- Requires Login: {page_context.requires_login}
"""

        # Format elements
        elements_str = "No elements indexed."
        if elements:
            element_lines = []
            for el in elements[:30]:  # Limit to avoid token overflow
                el_dict = el.to_dict() if hasattr(el, 'to_dict') else {
                    'index': el.index,
                    'tag': el.tag,
                    'text': el.text_signature
                }
                element_lines.append(
                    f"  [{el_dict['index']}] <{el_dict['tag']}> {el_dict.get('text', '')[:50]}"
                )
            elements_str = "Indexed Elements:\n" + "\n".join(element_lines)

        # Format user data if available
        user_str = ""
        if user_data:
            safe_data = {
                k: v for k, v in user_data.items()
                if k not in ('password', 'credit_card', 'cvv', 'ssn')
            }
            user_str = f"\nUser Profile Data:\n{json.dumps(safe_data, indent=2)}"

        return f"""User Request: {user_request}

{context_str}

{elements_str}
{user_str}

Create an action plan to accomplish the user's request. Respond only with valid JSON."""

    def _parse_response(self, response_text: str) -> ActionPlan:
        """Parse Claude's JSON response into an ActionPlan"""

        # Extract JSON from response (handle markdown code blocks)
        json_str = response_text.strip()
        if json_str.startswith("```"):
            lines = json_str.split("\n")
            json_lines = []
            in_json = False
            for line in lines:
                if line.startswith("```json"):
                    in_json = True
                    continue
                elif line.startswith("```"):
                    in_json = False
                    continue
                if in_json:
                    json_lines.append(line)
            json_str = "\n".join(json_lines)

        try:
            data = json.loads(json_str)
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse JSON: {e}\nResponse: {response_text[:500]}")
            raise ValueError(f"Invalid JSON response from AI: {e}")

        # Parse steps
        steps = []
        for step_data in data.get("steps", []):
            step = ActionStep(
                action_type=ActionType(step_data.get("action_type", "click")),
                target_element=step_data.get("target_element"),
                value=step_data.get("value"),
                wait_condition=WaitCondition(
                    step_data.get("wait_condition", "none")
                ),
                wait_timeout_ms=step_data.get("wait_timeout_ms", 5000),
                description=step_data.get("description", ""),
                on_error=RecoveryStrategy(
                    step_data.get("on_error", "retry")
                ),
            )
            steps.append(step)

        if not steps:
            raise ValueError("No steps generated in action plan")

        return ActionPlan(
            steps=steps,
            estimated_time_ms=data.get("estimated_time_ms", len(steps) * 1000),
            confidence=data.get("confidence", 0.5),
            description=data.get("description", ""),
            requires_confirmation=data.get("requires_confirmation", False),
            warnings=data.get("warnings", []),
        )

    async def simplify_intent(
        self,
        user_request: str,
    ) -> dict:
        """
        Quick intent classification without full planning.

        Args:
            user_request: User's natural language request

        Returns:
            dict with intent_type, target_description, and value
        """
        if not self._client:
            return {
                "intent_type": "unknown",
                "target_description": user_request,
                "value": None,
            }

        simple_prompt = f"""Classify this web automation request into one category:
- search: User wants to search for something
- fill_form: User wants to fill out a form
- click: User wants to click something specific
- navigate: User wants to go to a different page
- extract: User wants to get information from the page
- scroll: User wants to scroll the page
- unknown: Cannot determine intent

Request: {user_request}

Respond with JSON: {{"intent_type": "...", "target_description": "...", "value": "..."}}"""

        try:
            response = await self._client.messages.create(
                model=self._model,
                max_tokens=256,
                temperature=0,
                messages=[{"role": "user", "content": simple_prompt}],
            )

            text = response.content[0].text if response.content else "{}"
            if text.startswith("```"):
                text = text.split("```")[1].replace("json", "").strip()

            return json.loads(text)
        except Exception as e:
            logger.warning(f"Simple intent parsing failed: {e}")
            return {
                "intent_type": "unknown",
                "target_description": user_request,
                "value": None,
            }
