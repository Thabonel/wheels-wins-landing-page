"""
Domain Memory Router - Main entry point for the Domain Memory Agent System.

Orchestrates InitializerAgent and WorkerAgent to handle long-running tasks.
"""

import logging
from typing import Any, Dict, List, Optional
from uuid import UUID

from .agents.initializer_agent import InitializerAgent
from .agents.worker_agent import WorkerAgent, run_worker_until_complete
from .models import (
    CreateTaskRequest,
    DomainContext,
    DomainMemoryResponse,
    TaskScope,
    TaskStatus,
    TaskSummary,
    TaskType,
    WorkerRunResult,
)
from .storage.database_store import DomainMemoryStore

logger = logging.getLogger(__name__)


class DomainMemoryRouter:
    """
    Main router for Domain Memory operations.

    Provides a high-level API for:
    - Creating new tasks (via InitializerAgent)
    - Running tasks (via WorkerAgent)
    - Querying task status and progress
    - Managing task lifecycle
    """

    def __init__(
        self,
        store: Optional[DomainMemoryStore] = None,
        tool_executor: Optional[Any] = None,
    ):
        """
        Initialize the router.

        Args:
            store: Database store instance (creates new if not provided)
            tool_executor: Optional tool executor for WorkerAgent
        """
        self.store = store or DomainMemoryStore()
        self.tool_executor = tool_executor
        self._initializer: Optional[InitializerAgent] = None
        self._worker: Optional[WorkerAgent] = None

    @property
    def initializer(self) -> InitializerAgent:
        """Lazy-initialize InitializerAgent."""
        if self._initializer is None:
            self._initializer = InitializerAgent(store=self.store)
        return self._initializer

    @property
    def worker(self) -> WorkerAgent:
        """Lazy-initialize WorkerAgent."""
        if self._worker is None:
            self._worker = WorkerAgent(
                store=self.store,
                tool_executor=self.tool_executor,
            )
        return self._worker

    async def create_task(
        self,
        user_id: UUID,
        request: str,
        task_type: TaskType = TaskType.CUSTOM,
        scope: TaskScope = TaskScope.USER,
        priority: int = 5,
        constraints: Optional[Dict[str, Any]] = None,
    ) -> DomainMemoryResponse:
        """
        Create a new domain memory task.

        Uses InitializerAgent to parse request and create all artifacts.

        Args:
            user_id: User who owns the task
            request: Natural language task request
            task_type: Type categorization
            scope: User or system scope
            priority: Priority 1-10
            constraints: Optional pre-defined constraints

        Returns:
            DomainMemoryResponse with task_id
        """
        logger.info(f"Creating task for user {user_id}: {request[:50]}...")

        response = await self.initializer.run(
            user_id=user_id,
            request=request,
            task_type=task_type,
            scope=scope,
            priority=priority,
            constraints=constraints,
        )

        return response

    async def create_task_from_request(
        self,
        user_id: UUID,
        request: CreateTaskRequest,
    ) -> DomainMemoryResponse:
        """
        Create task from a structured request object.

        Args:
            user_id: User who owns the task
            request: Structured task request

        Returns:
            DomainMemoryResponse with task_id
        """
        return await self.create_task(
            user_id=user_id,
            request=request.request,
            task_type=request.task_type,
            scope=request.scope,
            priority=request.priority,
            constraints=request.constraints,
        )

    async def run_task_step(self, task_id: UUID) -> WorkerRunResult:
        """
        Run a single step of task execution.

        Uses WorkerAgent with Startup Protocol.

        Args:
            task_id: Task to execute

        Returns:
            WorkerRunResult with execution details
        """
        logger.info(f"Running task step for {task_id}")
        return await self.worker.run(task_id)

    async def run_task_to_completion(
        self,
        task_id: UUID,
        max_iterations: int = 100,
    ) -> List[WorkerRunResult]:
        """
        Run task until completion or failure.

        Args:
            task_id: Task to complete
            max_iterations: Maximum worker runs

        Returns:
            List of all WorkerRunResults
        """
        logger.info(f"Running task {task_id} to completion")

        return await run_worker_until_complete(
            task_id=task_id,
            store=self.store,
            max_iterations=max_iterations,
            tool_executor=self.tool_executor,
        )

    async def get_task_status(self, task_id: UUID) -> Optional[Dict[str, Any]]:
        """
        Get current task status and progress.

        Args:
            task_id: Task to query

        Returns:
            Status dict or None if not found
        """
        task = await self.store.get_task(task_id)
        if not task:
            return None

        state = await self.store.get_state(task_id)
        definition = await self.store.get_definition(task_id)

        total_items = len(definition.work_items) if definition else 0
        completed = len(state.completed_items) if state else 0
        failed = len(state.failed_items) if state else 0

        return {
            "task_id": str(task_id),
            "status": task.status.value,
            "task_type": task.task_type.value,
            "priority": task.priority,
            "scope": task.scope.value,
            "progress": {
                "total_items": total_items,
                "completed": completed,
                "failed": failed,
                "pending": total_items - completed - failed,
                "percentage": (completed / total_items * 100) if total_items > 0 else 0,
            },
            "current_work_item": state.current_work_item_id if state else None,
            "worker_runs": state.worker_run_count if state else 0,
            "last_worker_run": state.last_worker_run.isoformat() if state and state.last_worker_run else None,
            "created_at": task.created_at.isoformat(),
            "updated_at": task.updated_at.isoformat(),
            "completed_at": task.completed_at.isoformat() if task.completed_at else None,
            "error_message": task.error_message,
        }

    async def get_task_context(self, task_id: UUID) -> Optional[DomainContext]:
        """
        Get full task context.

        Args:
            task_id: Task to query

        Returns:
            DomainContext or None
        """
        return await self.store.load_full_context(task_id)

    async def list_user_tasks(
        self,
        user_id: UUID,
        status: Optional[TaskStatus] = None,
        limit: int = 50,
    ) -> List[TaskSummary]:
        """
        List tasks for a user.

        Args:
            user_id: User to query
            status: Optional status filter
            limit: Maximum results

        Returns:
            List of TaskSummary objects
        """
        return await self.store.list_user_tasks(
            user_id=user_id,
            status=status,
            limit=limit,
        )

    async def list_pending_tasks(self, limit: int = 50) -> List[Dict[str, Any]]:
        """
        List all pending tasks (for scheduling).

        Args:
            limit: Maximum results

        Returns:
            List of pending task info
        """
        tasks = await self.store.list_pending_tasks(limit=limit)

        return [
            {
                "task_id": str(t.id),
                "user_id": str(t.user_id),
                "task_type": t.task_type.value,
                "priority": t.priority,
                "scope": t.scope.value,
                "created_at": t.created_at.isoformat(),
            }
            for t in tasks
        ]

    async def pause_task(self, task_id: UUID) -> bool:
        """
        Pause a running task.

        Args:
            task_id: Task to pause

        Returns:
            True if paused successfully
        """
        task = await self.store.get_task(task_id)
        if not task:
            return False

        if task.status not in [TaskStatus.PENDING, TaskStatus.IN_PROGRESS]:
            return False

        return await self.store.update_task_status(task_id, TaskStatus.PAUSED)

    async def resume_task(self, task_id: UUID) -> bool:
        """
        Resume a paused task.

        Args:
            task_id: Task to resume

        Returns:
            True if resumed successfully
        """
        task = await self.store.get_task(task_id)
        if not task:
            return False

        if task.status != TaskStatus.PAUSED:
            return False

        return await self.store.update_task_status(task_id, TaskStatus.PENDING)

    async def cancel_task(self, task_id: UUID, reason: str = "Cancelled by user") -> bool:
        """
        Cancel a task.

        Args:
            task_id: Task to cancel
            reason: Cancellation reason

        Returns:
            True if cancelled successfully
        """
        task = await self.store.get_task(task_id)
        if not task:
            return False

        if task.status in [TaskStatus.COMPLETED, TaskStatus.FAILED]:
            return False

        return await self.store.update_task_status(
            task_id, TaskStatus.FAILED, f"Cancelled: {reason}"
        )

    async def retry_task(self, task_id: UUID) -> Optional[WorkerRunResult]:
        """
        Retry a failed task.

        Resets failed items to pending and runs worker.

        Args:
            task_id: Task to retry

        Returns:
            WorkerRunResult or None if task not found
        """
        task = await self.store.get_task(task_id)
        if not task:
            return None

        state = await self.store.get_state(task_id)
        if not state:
            return None

        await self.store.update_state(
            task_id=task_id,
            failed_items=[],
            blocked_items=[],
        )

        await self.store.update_task_status(task_id, TaskStatus.PENDING)

        return await self.run_task_step(task_id)

    async def delete_task(self, task_id: UUID) -> bool:
        """
        Delete a task and all its artifacts.

        Args:
            task_id: Task to delete

        Returns:
            True if deleted successfully
        """
        return await self.store.delete_task(task_id)

    async def get_progress_log(
        self,
        task_id: UUID,
        limit: int = 100,
    ) -> List[Dict[str, Any]]:
        """
        Get progress log entries for a task.

        Args:
            task_id: Task to query
            limit: Maximum entries

        Returns:
            List of progress entry dicts
        """
        entries = await self.store.get_progress(task_id, limit=limit)

        return [
            {
                "id": str(e.id),
                "entry_type": e.entry_type.value,
                "work_item_id": e.work_item_id,
                "content": e.content,
                "metadata": e.metadata,
                "created_at": e.created_at.isoformat(),
            }
            for e in entries
        ]


_router_instance: Optional[DomainMemoryRouter] = None


def get_domain_memory_router(
    tool_executor: Optional[Any] = None,
) -> DomainMemoryRouter:
    """
    Get singleton router instance.

    Args:
        tool_executor: Optional tool executor

    Returns:
        DomainMemoryRouter instance
    """
    global _router_instance
    if _router_instance is None:
        _router_instance = DomainMemoryRouter(tool_executor=tool_executor)
    return _router_instance


async def create_and_run_task(
    user_id: UUID,
    request: str,
    task_type: TaskType = TaskType.CUSTOM,
    run_immediately: bool = True,
    max_iterations: int = 100,
) -> Dict[str, Any]:
    """
    Convenience function to create and optionally run a task.

    Args:
        user_id: User who owns the task
        request: Natural language request
        task_type: Task type
        run_immediately: Whether to run to completion
        max_iterations: Max worker runs if running immediately

    Returns:
        Dict with task_id, status, and results
    """
    router = get_domain_memory_router()

    create_response = await router.create_task(
        user_id=user_id,
        request=request,
        task_type=task_type,
    )

    if not create_response.success:
        return {
            "success": False,
            "task_id": str(create_response.task_id) if create_response.task_id else None,
            "error": create_response.message,
        }

    task_id = create_response.task_id

    if not run_immediately:
        return {
            "success": True,
            "task_id": str(task_id),
            "status": "pending",
            "message": "Task created. Run with run_task_step() or schedule via Celery.",
        }

    results = await router.run_task_to_completion(
        task_id=task_id,
        max_iterations=max_iterations,
    )

    final_status = await router.get_task_status(task_id)

    return {
        "success": final_status.get("status") == "completed",
        "task_id": str(task_id),
        "status": final_status.get("status"),
        "progress": final_status.get("progress"),
        "worker_runs": len(results),
        "results": [
            {
                "work_item": r.work_item_executed,
                "success": r.execution_result.success if r.execution_result else None,
                "duration_ms": r.duration_ms,
            }
            for r in results
            if r.work_item_executed
        ],
    }
