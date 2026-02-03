"""
Workflow Engine for Universal Site Access

Executes multi-step workflows with error recovery, supporting
complex interactions like booking flows and search sequences.
"""

import asyncio
import logging
import time
from typing import List, Dict, Any, Optional, Callable, TYPE_CHECKING

from .models import (
    WorkflowStep,
    WorkflowResult,
    ActionResult,
    ActionType,
    WaitCondition,
    RecoveryStrategy,
)
from .action_executor import ActionExecutor
from app.core.url_validator import validate_url_safe, SSRFProtectionError

if TYPE_CHECKING:
    from playwright.async_api import Page
    from .session_manager import BrowserSession

logger = logging.getLogger(__name__)

# Bounded retry configuration to prevent DoS
MAX_RETRIES = 3
RETRY_BACKOFF = [1, 2, 5]  # Seconds to wait between retries (exponential backoff)


class WorkflowEngine:
    """
    Executes multi-step workflows with error recovery.

    Handles complex sequences like:
    - Booking flows (search -> select -> fill form -> confirm)
    - Search workflows (enter query -> filter -> paginate)
    - Login sequences (navigate -> fill credentials -> submit)
    """

    def __init__(
        self,
        session: 'BrowserSession',
        error_recovery: Optional['ErrorRecovery'] = None,
    ):
        """
        Initialize workflow engine.

        Args:
            session: Browser session with page and element cache
            error_recovery: Optional error recovery handler
        """
        self.session = session
        self.executor = ActionExecutor(session)
        self.error_recovery = error_recovery

    async def execute_workflow(
        self,
        steps: List[WorkflowStep],
        page: 'Page',
        stop_on_error: bool = False,
    ) -> WorkflowResult:
        """
        Execute a sequence of workflow steps.

        Args:
            steps: List of WorkflowStep objects to execute
            page: Playwright page instance
            stop_on_error: If True, stop workflow on first error

        Returns:
            WorkflowResult with execution details
        """
        logger.info(f"Starting workflow with {len(steps)} steps")
        start_time = time.time()

        step_results: List[ActionResult] = []
        extracted_data: Dict[str, Any] = {}
        error_step: Optional[int] = None
        error_message: Optional[str] = None

        for i, step in enumerate(steps):
            logger.info(f"Executing step {i + 1}/{len(steps)}: {step.name}")

            # Check preconditions
            if step.conditions:
                conditions_met = await self._check_conditions(step.conditions, page)
                if not conditions_met:
                    logger.warning(f"Step {i + 1} preconditions not met, skipping")
                    step_results.append(ActionResult(
                        success=False,
                        action_type=step.action,
                        error_message="Preconditions not met",
                    ))
                    if stop_on_error:
                        error_step = i
                        error_message = "Preconditions not met"
                        break
                    continue

            # Execute step with retries
            result = await self._execute_step_with_retry(step, page)
            step_results.append(result)

            # Handle step result
            if not result.success:
                logger.warning(f"Step {i + 1} failed: {result.error_message}")

                if step.on_error == RecoveryStrategy.SKIP:
                    continue
                elif step.on_error == RecoveryStrategy.ABORT:
                    error_step = i
                    error_message = result.error_message
                    break
                elif stop_on_error:
                    error_step = i
                    error_message = result.error_message
                    break
            else:
                # Collect extracted data
                if result.extracted_data:
                    extracted_data[step.name] = result.extracted_data

            # Handle wait condition
            if step.wait_for != WaitCondition.NONE:
                await self._handle_wait_condition(step, page)

        execution_time = int((time.time() - start_time) * 1000)
        success = error_step is None and len(step_results) > 0

        logger.info(
            f"Workflow complete: {len(step_results)}/{len(steps)} steps, "
            f"success={success}, time={execution_time}ms"
        )

        return WorkflowResult(
            success=success,
            steps_completed=len([r for r in step_results if r.success]),
            total_steps=len(steps),
            step_results=step_results,
            error_step=error_step,
            error_message=error_message,
            execution_time_ms=execution_time,
            final_url=page.url,
            extracted_data=extracted_data,
        )

    async def execute_with_retry(
        self,
        operation: Callable,
        operation_name: str,
        max_retries: Optional[int] = None,
        backoff_schedule: Optional[List[int]] = None,
        *args,
        **kwargs,
    ) -> ActionResult:
        """
        Execute an async operation with bounded retries and exponential backoff.

        This method prevents unbounded retry loops that could cause DoS.

        Args:
            operation: Async callable to execute
            operation_name: Human-readable name for logging
            max_retries: Maximum retry attempts (default: MAX_RETRIES)
            backoff_schedule: List of wait times in seconds (default: RETRY_BACKOFF)
            *args, **kwargs: Arguments to pass to operation

        Returns:
            ActionResult from the operation or failure result after max retries
        """
        # Enforce bounded retries to prevent DoS
        effective_max_retries = min(
            max_retries if max_retries is not None else MAX_RETRIES,
            MAX_RETRIES
        )
        effective_backoff = backoff_schedule or RETRY_BACKOFF

        last_result: Optional[ActionResult] = None
        last_error: Optional[str] = None

        for attempt in range(effective_max_retries + 1):  # +1 for initial attempt
            if attempt > 0:
                # Calculate backoff time (use last value if we exceed schedule length)
                backoff_index = min(attempt - 1, len(effective_backoff) - 1)
                backoff_seconds = effective_backoff[backoff_index]

                logger.info(
                    f"Retry {attempt}/{effective_max_retries} for '{operation_name}' "
                    f"after {backoff_seconds}s backoff"
                )
                await asyncio.sleep(backoff_seconds)

            try:
                result = await operation(*args, **kwargs)

                if isinstance(result, ActionResult):
                    if result.success:
                        if attempt > 0:
                            logger.info(
                                f"'{operation_name}' succeeded on attempt {attempt + 1}"
                            )
                        return result
                    last_result = result
                    last_error = result.error_message
                else:
                    # Operation returned non-ActionResult, treat as success
                    return ActionResult(
                        success=True,
                        action_type=ActionType.WAIT,
                        extracted_data=result,
                    )

            except Exception as e:
                last_error = str(e)
                logger.warning(
                    f"'{operation_name}' attempt {attempt + 1} failed: {last_error}"
                )

        # All retries exhausted
        logger.error(
            f"'{operation_name}' failed after {effective_max_retries + 1} attempts. "
            f"Last error: {last_error}"
        )

        return last_result or ActionResult(
            success=False,
            action_type=ActionType.WAIT,
            error_message=f"Max retries ({effective_max_retries}) exceeded for '{operation_name}'. "
                          f"Last error: {last_error}",
        )

    async def _execute_step_with_retry(
        self,
        step: WorkflowStep,
        page: 'Page',
    ) -> ActionResult:
        """
        Execute a step with bounded retry logic.

        Uses MAX_RETRIES as an upper bound regardless of step.max_retries
        to prevent unbounded retry loops that could cause DoS.
        """
        last_result: Optional[ActionResult] = None

        # Enforce bounded retries: use minimum of step's retries and MAX_RETRIES
        effective_retries = min(
            step.max_retries if step.max_retries else MAX_RETRIES,
            MAX_RETRIES
        )

        for attempt in range(effective_retries + 1):  # +1 for initial attempt
            if attempt > 0:
                # Use exponential backoff from RETRY_BACKOFF schedule
                backoff_index = min(attempt - 1, len(RETRY_BACKOFF) - 1)
                backoff_seconds = RETRY_BACKOFF[backoff_index]

                logger.info(
                    f"Retry {attempt}/{effective_retries} for step '{step.name}' "
                    f"after {backoff_seconds}s backoff"
                )
                await asyncio.sleep(backoff_seconds)

            result = await self._execute_single_step(step, page)

            if result.success:
                if attempt > 0:
                    logger.info(f"Step '{step.name}' succeeded on attempt {attempt + 1}")
                return result

            last_result = result

            # Try error recovery if available and we have retries left
            if (
                self.error_recovery
                and step.on_error == RecoveryStrategy.RETRY
                and attempt < effective_retries
            ):
                from .error_recovery import ErrorRecovery
                if isinstance(self.error_recovery, ErrorRecovery):
                    recovery = await self.error_recovery.handle_element_not_found(
                        step, page, self.session
                    )
                    if recovery.success and recovery.new_element_index:
                        step.target = recovery.new_element_index
                        logger.info(
                            f"Error recovery found new element for step '{step.name}': "
                            f"index {recovery.new_element_index}"
                        )

        logger.error(
            f"Step '{step.name}' failed after {effective_retries + 1} attempts. "
            f"Last error: {last_result.error_message if last_result else 'Unknown'}"
        )

        return last_result or ActionResult(
            success=False,
            action_type=step.action,
            error_message=f"Max retries ({effective_retries}) exceeded for step '{step.name}'",
        )

    async def _execute_single_step(
        self,
        step: WorkflowStep,
        page: 'Page',
    ) -> ActionResult:
        """Execute a single workflow step"""

        try:
            if step.action == ActionType.CLICK:
                return await self.executor.click_element(
                    step.target,
                    page,
                    wait_for_navigation=(step.wait_for == WaitCondition.NAVIGATION),
                )

            elif step.action == ActionType.TYPE:
                return await self.executor.type_text(
                    step.target,
                    step.value or "",
                    page,
                )

            elif step.action == ActionType.SELECT:
                return await self.executor.select_option(
                    step.target,
                    step.value or "",
                    page,
                )

            elif step.action == ActionType.SCROLL:
                return await self.executor.scroll_to_element(
                    step.target,
                    page,
                )

            elif step.action == ActionType.HOVER:
                return await self.executor.hover_element(
                    step.target,
                    page,
                )

            elif step.action == ActionType.WAIT:
                await page.wait_for_timeout(step.wait_timeout_ms)
                return ActionResult(
                    success=True,
                    action_type=ActionType.WAIT,
                    execution_time_ms=step.wait_timeout_ms,
                )

            elif step.action == ActionType.NAVIGATE:
                if step.value:
                    # SSRF protection - validate URL before navigation
                    try:
                        validate_url_safe(step.value)
                    except SSRFProtectionError:
                        logger.warning(f"SSRF protection blocked navigation URL: {step.value}")
                        return ActionResult(
                            success=False,
                            action_type=ActionType.NAVIGATE,
                            error_message="The requested URL is not accessible for security reasons.",
                        )

                    await page.goto(step.value, wait_until="domcontentloaded")
                    return ActionResult(
                        success=True,
                        action_type=ActionType.NAVIGATE,
                        page_changed=True,
                        new_url=page.url,
                    )
                return ActionResult(
                    success=False,
                    action_type=ActionType.NAVIGATE,
                    error_message="No URL provided for navigate action",
                )

            elif step.action == ActionType.EXTRACT:
                text = await self.executor.extract_text(step.target, page)
                return ActionResult(
                    success=True,
                    action_type=ActionType.EXTRACT,
                    element_index=step.target,
                    extracted_data=text,
                )

            elif step.action == ActionType.SUBMIT:
                return await self.executor.click_element(
                    step.target,
                    page,
                    wait_for_navigation=True,
                )

            else:
                return ActionResult(
                    success=False,
                    action_type=step.action,
                    error_message=f"Unsupported action type: {step.action}",
                )

        except Exception as e:
            logger.error(f"Step execution error: {e}")
            return ActionResult(
                success=False,
                action_type=step.action,
                error_message=str(e),
            )

    async def _handle_wait_condition(
        self,
        step: WorkflowStep,
        page: 'Page',
    ) -> None:
        """Handle post-action wait conditions"""

        try:
            if step.wait_for == WaitCondition.NAVIGATION:
                await page.wait_for_load_state("domcontentloaded", timeout=step.wait_timeout_ms)

            elif step.wait_for == WaitCondition.NETWORK_IDLE:
                await page.wait_for_load_state("networkidle", timeout=step.wait_timeout_ms)

            elif step.wait_for == WaitCondition.ELEMENT_VISIBLE:
                if step.target:
                    selector = f'[data-usa-index="{step.target}"]'
                    await page.wait_for_selector(selector, state="visible", timeout=step.wait_timeout_ms)

            elif step.wait_for == WaitCondition.ELEMENT_HIDDEN:
                if step.target:
                    selector = f'[data-usa-index="{step.target}"]'
                    await page.wait_for_selector(selector, state="hidden", timeout=step.wait_timeout_ms)

            elif step.wait_for == WaitCondition.TIMEOUT:
                await page.wait_for_timeout(step.wait_timeout_ms)

        except Exception as e:
            logger.warning(f"Wait condition error (continuing): {e}")

    async def _check_conditions(
        self,
        conditions: Dict[str, Any],
        page: 'Page',
    ) -> bool:
        """Check if preconditions are met"""

        try:
            # URL contains check
            if "url_contains" in conditions:
                if conditions["url_contains"] not in page.url:
                    return False

            # Element exists check
            if "element_exists" in conditions:
                index = conditions["element_exists"]
                selector = f'[data-usa-index="{index}"]'
                element = await page.query_selector(selector)
                if not element:
                    return False

            # Text present check
            if "text_present" in conditions:
                text = conditions["text_present"]
                content = await page.content()
                if text.lower() not in content.lower():
                    return False

            return True

        except Exception as e:
            logger.warning(f"Condition check error: {e}")
            return False

    def create_booking_workflow(
        self,
        booking_data: Dict[str, Any],
    ) -> List[WorkflowStep]:
        """
        Create a standard booking workflow.

        Args:
            booking_data: Dict with booking details (dates, guests, etc.)

        Returns:
            List of WorkflowStep objects
        """
        steps = []

        # Search/date selection
        if booking_data.get("check_in_element"):
            steps.append(WorkflowStep(
                name="enter_check_in_date",
                action=ActionType.TYPE,
                target=booking_data["check_in_element"],
                value=booking_data.get("check_in"),
                wait_for=WaitCondition.NONE,
            ))

        if booking_data.get("check_out_element"):
            steps.append(WorkflowStep(
                name="enter_check_out_date",
                action=ActionType.TYPE,
                target=booking_data["check_out_element"],
                value=booking_data.get("check_out"),
                wait_for=WaitCondition.NONE,
            ))

        if booking_data.get("guests_element"):
            steps.append(WorkflowStep(
                name="enter_guests",
                action=ActionType.TYPE if booking_data.get("guests_is_input") else ActionType.SELECT,
                target=booking_data["guests_element"],
                value=str(booking_data.get("guests", 2)),
                wait_for=WaitCondition.NONE,
            ))

        # Search button
        if booking_data.get("search_element"):
            steps.append(WorkflowStep(
                name="click_search",
                action=ActionType.CLICK,
                target=booking_data["search_element"],
                wait_for=WaitCondition.NAVIGATION,
                wait_timeout_ms=15000,
            ))

        return steps

    def create_search_workflow(
        self,
        search_params: Dict[str, Any],
    ) -> List[WorkflowStep]:
        """
        Create a standard search workflow.

        Args:
            search_params: Dict with search query and filter elements

        Returns:
            List of WorkflowStep objects
        """
        steps = []

        # Main search input
        if search_params.get("search_element"):
            steps.append(WorkflowStep(
                name="enter_search_query",
                action=ActionType.TYPE,
                target=search_params["search_element"],
                value=search_params.get("query", ""),
                wait_for=WaitCondition.NONE,
            ))

        # Search submit
        if search_params.get("submit_element"):
            steps.append(WorkflowStep(
                name="submit_search",
                action=ActionType.CLICK,
                target=search_params["submit_element"],
                wait_for=WaitCondition.NAVIGATION,
                wait_timeout_ms=10000,
            ))
        else:
            # Assume enter key triggers search
            steps.append(WorkflowStep(
                name="wait_for_results",
                action=ActionType.WAIT,
                wait_for=WaitCondition.TIMEOUT,
                wait_timeout_ms=2000,
            ))

        # Apply filters if specified
        for filter_name, filter_data in search_params.get("filters", {}).items():
            if filter_data.get("element"):
                steps.append(WorkflowStep(
                    name=f"apply_filter_{filter_name}",
                    action=ActionType.SELECT if filter_data.get("is_select") else ActionType.CLICK,
                    target=filter_data["element"],
                    value=filter_data.get("value"),
                    wait_for=WaitCondition.NETWORK_IDLE,
                    wait_timeout_ms=5000,
                ))

        return steps

    def create_login_workflow(
        self,
        login_data: Dict[str, Any],
    ) -> List[WorkflowStep]:
        """
        Create a standard login workflow.

        Args:
            login_data: Dict with username/password elements and values

        Returns:
            List of WorkflowStep objects
        """
        steps = []

        # Username/email
        if login_data.get("username_element"):
            steps.append(WorkflowStep(
                name="enter_username",
                action=ActionType.TYPE,
                target=login_data["username_element"],
                value=login_data.get("username", ""),
                wait_for=WaitCondition.NONE,
            ))

        # Password
        if login_data.get("password_element"):
            steps.append(WorkflowStep(
                name="enter_password",
                action=ActionType.TYPE,
                target=login_data["password_element"],
                value=login_data.get("password", ""),
                wait_for=WaitCondition.NONE,
            ))

        # Submit
        if login_data.get("submit_element"):
            steps.append(WorkflowStep(
                name="submit_login",
                action=ActionType.CLICK,
                target=login_data["submit_element"],
                wait_for=WaitCondition.NAVIGATION,
                wait_timeout_ms=10000,
                on_error=RecoveryStrategy.ABORT,
            ))

        return steps
