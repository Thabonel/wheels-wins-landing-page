"""
Base Agent for Domain Memory System.

Provides common functionality for InitializerAgent and WorkerAgent.
"""

import logging
import os
from abc import ABC, abstractmethod
from datetime import datetime
from typing import Any, Dict, List, Optional
from uuid import UUID

from anthropic import AsyncAnthropic

from ..models import (
    DomainContext,
    DomainTask,
    EntryType,
    ProgressEntry,
    TaskStatus,
)
from ..storage.database_store import DomainMemoryStore

logger = logging.getLogger(__name__)


class BaseAgent(ABC):
    """
    Abstract base class for Domain Memory agents.

    Provides:
    - Claude AI client integration
    - Database store access
    - Progress logging
    - Common utilities
    """

    def __init__(
        self,
        store: Optional[DomainMemoryStore] = None,
        model: str = "claude-sonnet-4-5-20250929",
    ):
        """
        Initialize base agent.

        Args:
            store: Database store instance (creates new if not provided)
            model: Claude model to use for AI operations
        """
        self.store = store or DomainMemoryStore()
        self.model = model
        self._client: Optional[AsyncAnthropic] = None

    @property
    def client(self) -> AsyncAnthropic:
        """Lazy-initialize Anthropic client."""
        if self._client is None:
            api_key = os.getenv("ANTHROPIC_API_KEY")
            if not api_key:
                raise ValueError("ANTHROPIC_API_KEY environment variable not set")
            self._client = AsyncAnthropic(api_key=api_key)
        return self._client

    @abstractmethod
    async def run(self, *args, **kwargs) -> Any:
        """Execute the agent's main logic. Must be implemented by subclasses."""
        pass

    async def log_progress(
        self,
        task_id: UUID,
        worker_run_id: UUID,
        entry_type: EntryType,
        content: str,
        work_item_id: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> ProgressEntry:
        """
        Log a progress entry for the task.

        Args:
            task_id: Task identifier
            worker_run_id: Current worker run identifier
            entry_type: Type of progress entry
            content: Description of the progress
            work_item_id: Optional work item this relates to
            metadata: Optional additional data

        Returns:
            Created ProgressEntry
        """
        return await self.store.log_progress(
            task_id=task_id,
            worker_run_id=worker_run_id,
            entry_type=entry_type,
            content=content,
            work_item_id=work_item_id,
            metadata=metadata,
        )

    async def update_task_status(
        self,
        task_id: UUID,
        status: TaskStatus,
        error_message: Optional[str] = None,
    ) -> bool:
        """
        Update task status.

        Args:
            task_id: Task identifier
            status: New status
            error_message: Optional error message if failed

        Returns:
            True if updated successfully
        """
        return await self.store.update_task_status(
            task_id=task_id,
            status=status,
            error_message=error_message,
        )

    async def call_claude(
        self,
        system_prompt: str,
        messages: List[Dict[str, str]],
        max_tokens: int = 4096,
        temperature: float = 0.7,
    ) -> str:
        """
        Call Claude API with given prompts.

        Args:
            system_prompt: System instructions for Claude
            messages: Conversation messages
            max_tokens: Maximum response tokens
            temperature: Response randomness (0-1)

        Returns:
            Claude's response text
        """
        try:
            response = await self.client.messages.create(
                model=self.model,
                max_tokens=max_tokens,
                system=system_prompt,
                messages=messages,
                temperature=temperature,
            )

            if response.content and len(response.content) > 0:
                return response.content[0].text
            return ""

        except Exception as e:
            logger.error(f"Claude API call failed: {e}")
            raise

    async def call_claude_with_tools(
        self,
        system_prompt: str,
        messages: List[Dict[str, str]],
        tools: List[Dict[str, Any]],
        max_tokens: int = 4096,
        temperature: float = 0.7,
    ) -> Dict[str, Any]:
        """
        Call Claude API with tool definitions.

        Args:
            system_prompt: System instructions for Claude
            messages: Conversation messages
            tools: Tool definitions for function calling
            max_tokens: Maximum response tokens
            temperature: Response randomness (0-1)

        Returns:
            Dict with 'text' and 'tool_calls' keys
        """
        try:
            response = await self.client.messages.create(
                model=self.model,
                max_tokens=max_tokens,
                system=system_prompt,
                messages=messages,
                tools=tools,
                temperature=temperature,
            )

            result = {
                "text": "",
                "tool_calls": [],
                "stop_reason": response.stop_reason,
            }

            for block in response.content:
                if block.type == "text":
                    result["text"] += block.text
                elif block.type == "tool_use":
                    result["tool_calls"].append({
                        "id": block.id,
                        "name": block.name,
                        "input": block.input,
                    })

            return result

        except Exception as e:
            logger.error(f"Claude API call with tools failed: {e}")
            raise

    def build_context_summary(self, context: DomainContext) -> str:
        """
        Build a human-readable summary of the task context.

        Args:
            context: Full domain context

        Returns:
            Formatted context summary string
        """
        summary_parts = []

        summary_parts.append(f"Task: {context.task.task_type.value}")
        summary_parts.append(f"Status: {context.task.status.value}")
        summary_parts.append(f"Priority: {context.task.priority}/10")

        summary_parts.append(f"\nOriginal Request: {context.definition.original_request}")
        summary_parts.append(f"Goal: {context.definition.parsed_intent.goal}")

        if context.definition.parsed_intent.sub_goals:
            summary_parts.append("Sub-goals:")
            for sg in context.definition.parsed_intent.sub_goals:
                summary_parts.append(f"  - {sg}")

        total_items = len(context.definition.work_items)
        completed = len(context.state.completed_items)
        failed = len(context.state.failed_items)
        blocked = len(context.state.blocked_items)
        pending = total_items - completed - failed - blocked

        summary_parts.append(f"\nProgress: {completed}/{total_items} work items completed")
        if failed > 0:
            summary_parts.append(f"  Failed: {failed}")
        if blocked > 0:
            summary_parts.append(f"  Blocked: {blocked}")
        if pending > 0:
            summary_parts.append(f"  Pending: {pending}")

        if context.state.current_work_item_id:
            summary_parts.append(f"  Current: {context.state.current_work_item_id}")

        if context.constraints.budget_constraints:
            bc = context.constraints.budget_constraints
            if bc.max_budget:
                summary_parts.append(f"\nBudget: ${bc.max_budget:.2f} {bc.currency}")

        if context.constraints.time_constraints:
            tc = context.constraints.time_constraints
            if tc.deadline:
                summary_parts.append(f"Deadline: {tc.deadline.isoformat()}")

        if context.recent_progress:
            summary_parts.append("\nRecent Progress:")
            for entry in context.recent_progress[-5:]:
                summary_parts.append(f"  [{entry.entry_type.value}] {entry.content[:100]}")

        return "\n".join(summary_parts)

    def get_next_work_item(self, context: DomainContext) -> Optional[str]:
        """
        Determine the next work item to execute.

        Considers dependencies and completed/failed items.

        Args:
            context: Full domain context

        Returns:
            Work item ID or None if no items available
        """
        completed_set = set(context.state.completed_items)
        failed_set = set(context.state.failed_items)
        blocked_set = set(context.state.blocked_items)

        for item in context.definition.work_items:
            if item.id in completed_set or item.id in failed_set:
                continue

            if item.id in blocked_set:
                continue

            deps_met = all(dep in completed_set for dep in item.depends_on)
            if deps_met:
                return item.id

        return None

    def check_success_criteria(self, context: DomainContext) -> bool:
        """
        Check if all success criteria are met.

        Args:
            context: Full domain context

        Returns:
            True if all criteria are met
        """
        for criterion in context.definition.success_criteria:
            if not criterion.is_met:
                return False
        return True

    def format_timestamp(self, dt: Optional[datetime] = None) -> str:
        """Format datetime for logging."""
        if dt is None:
            dt = datetime.utcnow()
        return dt.strftime("%Y-%m-%d %H:%M:%S UTC")
