"""
Celery Tasks for Domain Memory System.

Provides scheduled and async task execution via Celery.
"""

import asyncio
import logging
from typing import Any, Dict, List, Optional
from uuid import UUID

from celery import shared_task

from ..router import DomainMemoryRouter, get_domain_memory_router
from ..models import TaskStatus

logger = logging.getLogger(__name__)


def run_async(coro):
    """Helper to run async code in sync Celery tasks."""
    try:
        loop = asyncio.get_event_loop()
    except RuntimeError:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
    return loop.run_until_complete(coro)


@shared_task(
    name="domain_memory.run_task_step",
    bind=True,
    max_retries=3,
    default_retry_delay=60,
)
def run_task_step_async(self, task_id: str) -> Dict[str, Any]:
    """
    Run a single step of a domain memory task.

    Celery task that executes one WorkerAgent run.

    Args:
        task_id: UUID string of the task

    Returns:
        Dict with execution results
    """
    logger.info(f"Celery: Running task step for {task_id}")

    try:
        task_uuid = UUID(task_id)
        router = get_domain_memory_router()

        result = run_async(router.run_task_step(task_uuid))

        return {
            "task_id": task_id,
            "success": True,
            "work_item_executed": result.work_item_executed,
            "task_completed": result.task_completed,
            "task_failed": result.task_failed,
            "next_item_available": result.next_item_available,
            "duration_ms": result.duration_ms,
        }

    except Exception as e:
        logger.error(f"Celery task step failed: {e}")
        self.retry(exc=e)


@shared_task(
    name="domain_memory.run_task_to_completion",
    bind=True,
    max_retries=1,
)
def run_task_to_completion_async(
    self,
    task_id: str,
    max_iterations: int = 100,
) -> Dict[str, Any]:
    """
    Run a task to completion.

    Celery task that executes WorkerAgent until done.

    Args:
        task_id: UUID string of the task
        max_iterations: Maximum worker runs

    Returns:
        Dict with completion results
    """
    logger.info(f"Celery: Running task {task_id} to completion")

    try:
        task_uuid = UUID(task_id)
        router = get_domain_memory_router()

        results = run_async(router.run_task_to_completion(
            task_uuid,
            max_iterations=max_iterations,
        ))

        status = run_async(router.get_task_status(task_uuid))

        return {
            "task_id": task_id,
            "success": status.get("status") == "completed",
            "status": status.get("status"),
            "progress": status.get("progress"),
            "worker_runs": len(results),
            "total_duration_ms": sum(r.duration_ms for r in results),
        }

    except Exception as e:
        logger.error(f"Celery task completion failed: {e}")
        raise


@shared_task(
    name="domain_memory.process_pending_tasks",
    bind=True,
)
def process_pending_tasks(
    self,
    limit: int = 10,
    scope: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Process all pending tasks (scheduled via Celery Beat).

    Picks up pending tasks and runs one step for each.

    Args:
        limit: Maximum tasks to process
        scope: Optional scope filter ('user' or 'system')

    Returns:
        Dict with processing results
    """
    logger.info(f"Celery Beat: Processing up to {limit} pending tasks")

    try:
        router = get_domain_memory_router()

        pending = run_async(router.list_pending_tasks(limit=limit))

        if scope:
            pending = [t for t in pending if t.get("scope") == scope]

        results = []
        for task_info in pending:
            task_id = task_info["task_id"]

            try:
                result = run_async(router.run_task_step(UUID(task_id)))
                results.append({
                    "task_id": task_id,
                    "success": True,
                    "work_item_executed": result.work_item_executed,
                    "completed": result.task_completed,
                    "failed": result.task_failed,
                })
            except Exception as e:
                logger.error(f"Failed to process task {task_id}: {e}")
                results.append({
                    "task_id": task_id,
                    "success": False,
                    "error": str(e),
                })

        return {
            "processed": len(results),
            "results": results,
        }

    except Exception as e:
        logger.error(f"Celery Beat processing failed: {e}")
        raise


@shared_task(name="domain_memory.cleanup_old_tasks")
def cleanup_old_tasks(days_old: int = 30) -> Dict[str, Any]:
    """
    Clean up old completed/failed tasks.

    Runs periodically to remove stale data.

    Args:
        days_old: Delete tasks older than this

    Returns:
        Dict with cleanup results
    """
    logger.info(f"Celery: Cleaning up tasks older than {days_old} days")

    return {
        "cleaned": 0,
        "message": "Cleanup not yet implemented",
    }


CELERY_BEAT_SCHEDULE = {
    "domain-memory-process-pending": {
        "task": "domain_memory.process_pending_tasks",
        "schedule": 60.0,
        "kwargs": {"limit": 10},
    },
    "domain-memory-cleanup": {
        "task": "domain_memory.cleanup_old_tasks",
        "schedule": 86400.0,
        "kwargs": {"days_old": 30},
    },
}
