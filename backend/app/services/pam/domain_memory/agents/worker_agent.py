"""
Worker Agent for Domain Memory System.

Runs REPEATEDLY to make incremental progress on tasks.
Implements the mandatory Startup Protocol to reload context.
"""

import json
import logging
from datetime import datetime
from typing import Any, Dict, List, Optional
from uuid import UUID, uuid4

from ..models import (
    DomainContext,
    EntryType,
    ExecutionResult,
    TaskStatus,
    WorkerRunResult,
    WorkItem,
    WorkItemStatus,
)
from ..storage.database_store import DomainMemoryStore
from .base_agent import BaseAgent

logger = logging.getLogger(__name__)


WORKER_SYSTEM_PROMPT = """You are a task execution agent for PAM (Personal AI Manager), an RV travel assistant.

You are executing a specific work item as part of a larger task. You have access to tools to complete the work.

Your context includes:
- The overall task goal and progress
- The specific work item to execute
- Available tools and their descriptions
- Constraints and safety rules

Guidelines:
1. Focus ONLY on the current work item
2. Use the appropriate tool for the action_type
3. Respect all constraints (budget, time, scope)
4. Follow all safety rules
5. Return a structured result

When you need to execute a tool, respond with JSON:
{
    "action": "execute_tool",
    "tool_name": "the tool to use",
    "parameters": {
        "param1": "value1"
    },
    "reasoning": "Why you're taking this action"
}

When you've completed the work item, respond with JSON:
{
    "action": "complete",
    "success": true,
    "output": {
        "key": "value"
    },
    "summary": "What was accomplished"
}

If you cannot complete the work item, respond with JSON:
{
    "action": "fail",
    "error": "Description of what went wrong",
    "can_retry": true/false,
    "suggestions": ["What to try instead"]
}

Output ONLY valid JSON, no other text."""


class WorkerAgent(BaseAgent):
    """
    Worker Agent - Runs REPEATEDLY to make incremental progress.

    Implements the mandatory Startup Protocol:
    1. Load ALL artifacts from database
    2. Read full context before any action
    3. Execute ONE work item
    4. Update state and log progress
    5. Exit (will be called again for next item)
    """

    def __init__(
        self,
        store: Optional[DomainMemoryStore] = None,
        model: str = "claude-sonnet-4-5-20250929",
        tool_executor: Optional[Any] = None,
    ):
        """
        Initialize worker agent.

        Args:
            store: Database store instance
            model: Claude model to use
            tool_executor: Optional tool executor for running PAM tools
        """
        super().__init__(store=store, model=model)
        self.tool_executor = tool_executor

    async def run(self, task_id: UUID) -> WorkerRunResult:
        """
        Execute one iteration of the worker.

        Implements Startup Protocol:
        1. Load full context
        2. Determine next work item
        3. Execute work item
        4. Update state
        5. Return result

        Args:
            task_id: Task to work on

        Returns:
            WorkerRunResult with execution details
        """
        worker_run_id = uuid4()
        start_time = datetime.utcnow()

        result = WorkerRunResult(
            task_id=task_id,
            worker_run_id=worker_run_id,
        )

        try:
            context = await self._startup_protocol(task_id, worker_run_id)

            if context is None:
                result.task_failed = True
                return result

            if context.task.status == TaskStatus.COMPLETED:
                result.task_completed = True
                result.next_item_available = False
                return result

            if context.task.status == TaskStatus.FAILED:
                result.task_failed = True
                result.next_item_available = False
                return result

            next_item_id = self.get_next_work_item(context)

            if next_item_id is None:
                if self.check_success_criteria(context):
                    await self.update_task_status(task_id, TaskStatus.COMPLETED)
                    result.task_completed = True
                    await self.log_progress(
                        task_id=task_id,
                        worker_run_id=worker_run_id,
                        entry_type=EntryType.MILESTONE,
                        content="All work items completed. Task finished successfully.",
                    )
                else:
                    await self.log_progress(
                        task_id=task_id,
                        worker_run_id=worker_run_id,
                        entry_type=EntryType.DECISION,
                        content="No executable work items available. Some criteria not met.",
                    )
                result.next_item_available = False
                return result

            work_item = next(
                (wi for wi in context.definition.work_items if wi.id == next_item_id),
                None,
            )

            if work_item is None:
                logger.error(f"Work item {next_item_id} not found")
                result.next_item_available = False
                return result

            await self.store.update_state(
                task_id=task_id,
                current_work_item_id=next_item_id,
            )

            await self.update_task_status(task_id, TaskStatus.IN_PROGRESS)

            await self.log_progress(
                task_id=task_id,
                worker_run_id=worker_run_id,
                entry_type=EntryType.ACTION,
                content=f"Starting work item: {work_item.description[:100]}",
                work_item_id=next_item_id,
            )

            execution_result = await self._execute_work_item(
                context, work_item, worker_run_id
            )

            result.work_item_executed = next_item_id
            result.execution_result = execution_result

            if execution_result.success:
                completed_items = context.state.completed_items + [next_item_id]
                await self.store.update_state(
                    task_id=task_id,
                    completed_items=completed_items,
                    current_work_item_id=None,
                )

                await self._update_work_item_status(
                    task_id, next_item_id, WorkItemStatus.COMPLETED, execution_result.output
                )

                await self.log_progress(
                    task_id=task_id,
                    worker_run_id=worker_run_id,
                    entry_type=EntryType.MILESTONE,
                    content=f"Completed work item: {work_item.description[:50]}",
                    work_item_id=next_item_id,
                    metadata=execution_result.output,
                )
            else:
                failed_items = context.state.failed_items + [next_item_id]
                await self.store.update_state(
                    task_id=task_id,
                    failed_items=failed_items,
                    current_work_item_id=None,
                )

                await self._update_work_item_status(
                    task_id, next_item_id, WorkItemStatus.FAILED,
                    error_message=execution_result.error_message
                )

                await self.log_progress(
                    task_id=task_id,
                    worker_run_id=worker_run_id,
                    entry_type=EntryType.ERROR,
                    content=f"Failed work item: {execution_result.error_message}",
                    work_item_id=next_item_id,
                )

            remaining = self.get_next_work_item(context)
            result.next_item_available = remaining is not None

        except Exception as e:
            logger.error(f"Worker run failed: {e}")
            result.task_failed = True

            await self.log_progress(
                task_id=task_id,
                worker_run_id=worker_run_id,
                entry_type=EntryType.ERROR,
                content=f"Worker run error: {str(e)}",
            )

        finally:
            await self.store.update_state(
                task_id=task_id,
                last_worker_run=datetime.utcnow(),
            )

            end_time = datetime.utcnow()
            result.duration_ms = int((end_time - start_time).total_seconds() * 1000)

        return result

    async def _startup_protocol(
        self,
        task_id: UUID,
        worker_run_id: UUID,
    ) -> Optional[DomainContext]:
        """
        Execute mandatory Startup Protocol.

        MUST read all artifacts before any action.

        Args:
            task_id: Task to load
            worker_run_id: Current run identifier

        Returns:
            Full DomainContext or None if loading fails
        """
        logger.info(f"Starting Startup Protocol for task {task_id}")

        context = await self.store.load_full_context(task_id)

        if context is None:
            await self.log_progress(
                task_id=task_id,
                worker_run_id=worker_run_id,
                entry_type=EntryType.ERROR,
                content="Startup Protocol failed: Could not load task context",
            )
            return None

        await self.store.update_state(
            task_id=task_id,
            worker_run_count=context.state.worker_run_count + 1,
        )

        await self.log_progress(
            task_id=task_id,
            worker_run_id=worker_run_id,
            entry_type=EntryType.ACTION,
            content=f"Startup Protocol complete. Run #{context.state.worker_run_count + 1}",
            metadata={
                "completed_items": len(context.state.completed_items),
                "failed_items": len(context.state.failed_items),
                "total_items": len(context.definition.work_items),
            },
        )

        return context

    async def _execute_work_item(
        self,
        context: DomainContext,
        work_item: WorkItem,
        worker_run_id: UUID,
    ) -> ExecutionResult:
        """
        Execute a single work item.

        Args:
            context: Full task context
            work_item: Work item to execute
            worker_run_id: Current run identifier

        Returns:
            ExecutionResult with outcome
        """
        start_time = datetime.utcnow()

        try:
            if self.tool_executor and work_item.action_type:
                result = await self._execute_with_tool(context, work_item)
            else:
                result = await self._execute_with_claude(context, work_item)

            end_time = datetime.utcnow()
            result.duration_ms = int((end_time - start_time).total_seconds() * 1000)

            return result

        except Exception as e:
            end_time = datetime.utcnow()
            return ExecutionResult(
                work_item_id=work_item.id,
                success=False,
                error_message=str(e),
                duration_ms=int((end_time - start_time).total_seconds() * 1000),
            )

    async def _execute_with_tool(
        self,
        context: DomainContext,
        work_item: WorkItem,
    ) -> ExecutionResult:
        """Execute work item using PAM tool system."""
        try:
            tool_name = work_item.action_type
            parameters = work_item.parameters.copy()

            parameters["user_id"] = str(context.task.user_id)

            result = await self.tool_executor.execute(
                tool_name=tool_name,
                parameters=parameters,
            )

            return ExecutionResult(
                work_item_id=work_item.id,
                success=result.get("success", True),
                output=result,
                tool_used=tool_name,
            )

        except Exception as e:
            return ExecutionResult(
                work_item_id=work_item.id,
                success=False,
                error_message=f"Tool execution failed: {str(e)}",
                tool_used=work_item.action_type,
            )

    async def _execute_with_claude(
        self,
        context: DomainContext,
        work_item: WorkItem,
    ) -> ExecutionResult:
        """Execute work item using Claude for reasoning."""
        context_summary = self.build_context_summary(context)

        user_message = f"""Execute this work item:

Work Item ID: {work_item.id}
Description: {work_item.description}
Action Type: {work_item.action_type or 'custom'}
Parameters: {json.dumps(work_item.parameters, indent=2)}

Task Context:
{context_summary}

Constraints:
- Budget: {context.constraints.budget_constraints}
- Time: {context.constraints.time_constraints}
- Safety Rules: {', '.join(context.constraints.safety_rules) if context.constraints.safety_rules else 'None'}

Execute this work item and return the result."""

        messages = [{"role": "user", "content": user_message}]

        response = await self.call_claude(
            system_prompt=WORKER_SYSTEM_PROMPT,
            messages=messages,
            max_tokens=2048,
            temperature=0.3,
        )

        try:
            json_start = response.find("{")
            json_end = response.rfind("}") + 1
            if json_start >= 0 and json_end > json_start:
                json_str = response[json_start:json_end]
                result_data = json.loads(json_str)

                action = result_data.get("action", "complete")

                if action == "complete":
                    return ExecutionResult(
                        work_item_id=work_item.id,
                        success=result_data.get("success", True),
                        output=result_data.get("output", {}),
                    )
                elif action == "fail":
                    return ExecutionResult(
                        work_item_id=work_item.id,
                        success=False,
                        error_message=result_data.get("error", "Unknown error"),
                    )
                elif action == "execute_tool":
                    if self.tool_executor:
                        tool_result = await self.tool_executor.execute(
                            tool_name=result_data.get("tool_name"),
                            parameters=result_data.get("parameters", {}),
                        )
                        return ExecutionResult(
                            work_item_id=work_item.id,
                            success=tool_result.get("success", True),
                            output=tool_result,
                            tool_used=result_data.get("tool_name"),
                        )
                    else:
                        return ExecutionResult(
                            work_item_id=work_item.id,
                            success=False,
                            error_message="Tool execution requested but no executor available",
                        )

        except json.JSONDecodeError:
            pass

        return ExecutionResult(
            work_item_id=work_item.id,
            success=True,
            output={"raw_response": response[:500]},
        )

    async def _update_work_item_status(
        self,
        task_id: UUID,
        work_item_id: str,
        status: WorkItemStatus,
        result: Optional[Dict[str, Any]] = None,
        error_message: Optional[str] = None,
    ) -> bool:
        """Update work item status in definition."""
        definition = await self.store.get_definition(task_id)
        if not definition:
            return False

        updated_items = []
        for item in definition.work_items:
            if item.id == work_item_id:
                item.status = status
                item.result = result
                item.error_message = error_message
                if status == WorkItemStatus.COMPLETED:
                    item.completed_at = datetime.utcnow()
                elif status == WorkItemStatus.IN_PROGRESS:
                    item.started_at = datetime.utcnow()
            updated_items.append(item)

        return await self.store.update_work_items(task_id, updated_items)


async def run_worker_until_complete(
    task_id: UUID,
    store: Optional[DomainMemoryStore] = None,
    max_iterations: int = 100,
    tool_executor: Optional[Any] = None,
) -> List[WorkerRunResult]:
    """
    Convenience function to run worker until task completes.

    Args:
        task_id: Task to complete
        store: Database store instance
        max_iterations: Maximum worker runs
        tool_executor: Optional tool executor

    Returns:
        List of all WorkerRunResults
    """
    worker = WorkerAgent(store=store, tool_executor=tool_executor)
    results = []

    for i in range(max_iterations):
        result = await worker.run(task_id)
        results.append(result)

        if result.task_completed or result.task_failed:
            break

        if not result.next_item_available:
            break

    return results
