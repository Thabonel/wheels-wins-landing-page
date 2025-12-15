"""
API Endpoints for Domain Memory System.

Provides REST API for creating, running, and managing long-running tasks.
"""

import logging
from typing import Any, Dict, List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel, Field

from app.services.pam.domain_memory import (
    DomainMemoryRouter,
    DomainMemoryResponse,
)
from app.services.pam.domain_memory.models import (
    CreateTaskRequest,
    TaskScope,
    TaskStatus,
    TaskType,
)
from app.services.pam.domain_memory.router import get_domain_memory_router
from app.services.pam.domain_memory.triggers.webhooks import DomainMemoryWebhookHandler

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/domain-memory", tags=["Domain Memory"])


class CreateTaskBody(BaseModel):
    """Request body for creating a task."""

    request: str = Field(..., description="Natural language task request")
    task_type: TaskType = Field(default=TaskType.CUSTOM, description="Task type")
    scope: TaskScope = Field(default=TaskScope.USER, description="Task scope")
    priority: int = Field(default=5, ge=1, le=10, description="Priority 1-10")
    constraints: Optional[Dict[str, Any]] = Field(default=None, description="Optional constraints")


class RunTaskBody(BaseModel):
    """Request body for running a task."""

    max_iterations: int = Field(default=100, ge=1, le=1000, description="Max worker runs")


class WebhookBody(BaseModel):
    """Request body for webhook events."""

    event_type: str = Field(..., description="Event type")
    payload: Dict[str, Any] = Field(..., description="Event payload")


def get_user_id(request: Request) -> UUID:
    """Extract user ID from request (assumes auth middleware sets this)."""
    user_id = getattr(request.state, "user_id", None)
    if not user_id:
        user = getattr(request.state, "user", None)
        if user:
            user_id = user.get("id") or user.get("sub")

    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not authenticated",
        )

    return UUID(user_id) if isinstance(user_id, str) else user_id


def get_router() -> DomainMemoryRouter:
    """Get domain memory router instance."""
    return get_domain_memory_router()


@router.post("/tasks", response_model=Dict[str, Any])
async def create_task(
    body: CreateTaskBody,
    request: Request,
    dm_router: DomainMemoryRouter = Depends(get_router),
):
    """
    Create a new domain memory task.

    Uses InitializerAgent to parse request and set up all artifacts.
    """
    user_id = get_user_id(request)

    logger.info(f"Creating task for user {user_id}: {body.request[:50]}...")

    response = await dm_router.create_task(
        user_id=user_id,
        request=body.request,
        task_type=body.task_type,
        scope=body.scope,
        priority=body.priority,
        constraints=body.constraints,
    )

    if not response.success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=response.message,
        )

    return {
        "success": True,
        "task_id": str(response.task_id),
        "message": response.message,
        "data": response.data,
    }


@router.get("/tasks", response_model=List[Dict[str, Any]])
async def list_tasks(
    request: Request,
    status_filter: Optional[TaskStatus] = None,
    limit: int = 50,
    dm_router: DomainMemoryRouter = Depends(get_router),
):
    """List tasks for the current user."""
    user_id = get_user_id(request)

    tasks = await dm_router.list_user_tasks(
        user_id=user_id,
        status=status_filter,
        limit=limit,
    )

    return [
        {
            "id": str(t.id),
            "task_type": t.task_type.value,
            "status": t.status.value,
            "priority": t.priority,
            "scope": t.scope.value,
            "original_request": t.original_request,
            "work_items_total": t.work_items_total,
            "work_items_completed": t.work_items_completed,
            "worker_run_count": t.worker_run_count,
            "created_at": t.created_at.isoformat(),
            "updated_at": t.updated_at.isoformat(),
        }
        for t in tasks
    ]


@router.get("/tasks/{task_id}", response_model=Dict[str, Any])
async def get_task_status(
    task_id: UUID,
    dm_router: DomainMemoryRouter = Depends(get_router),
):
    """Get detailed status of a task."""
    status_info = await dm_router.get_task_status(task_id)

    if not status_info:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found",
        )

    return status_info


@router.get("/tasks/{task_id}/context", response_model=Dict[str, Any])
async def get_task_context(
    task_id: UUID,
    dm_router: DomainMemoryRouter = Depends(get_router),
):
    """Get full context of a task (for debugging)."""
    context = await dm_router.get_task_context(task_id)

    if not context:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found",
        )

    return {
        "task": {
            "id": str(context.task.id),
            "status": context.task.status.value,
            "task_type": context.task.task_type.value,
        },
        "definition": {
            "original_request": context.definition.original_request,
            "goal": context.definition.parsed_intent.goal,
            "work_items_count": len(context.definition.work_items),
            "success_criteria_count": len(context.definition.success_criteria),
        },
        "state": {
            "current_work_item_id": context.state.current_work_item_id,
            "completed_items": context.state.completed_items,
            "failed_items": context.state.failed_items,
            "blocked_items": context.state.blocked_items,
            "worker_run_count": context.state.worker_run_count,
        },
        "constraints": {
            "has_budget": context.constraints.budget_constraints is not None,
            "has_time": context.constraints.time_constraints is not None,
            "safety_rules_count": len(context.constraints.safety_rules),
        },
        "recent_progress": [
            {
                "entry_type": e.entry_type.value,
                "content": e.content[:100],
                "created_at": e.created_at.isoformat(),
            }
            for e in context.recent_progress[-5:]
        ],
    }


@router.get("/tasks/{task_id}/progress", response_model=List[Dict[str, Any]])
async def get_task_progress(
    task_id: UUID,
    limit: int = 100,
    dm_router: DomainMemoryRouter = Depends(get_router),
):
    """Get progress log for a task."""
    progress = await dm_router.get_progress_log(task_id, limit=limit)
    return progress


@router.post("/tasks/{task_id}/run-step", response_model=Dict[str, Any])
async def run_task_step(
    task_id: UUID,
    dm_router: DomainMemoryRouter = Depends(get_router),
):
    """Run a single step of task execution."""
    result = await dm_router.run_task_step(task_id)

    return {
        "task_id": str(task_id),
        "work_item_executed": result.work_item_executed,
        "task_completed": result.task_completed,
        "task_failed": result.task_failed,
        "next_item_available": result.next_item_available,
        "duration_ms": result.duration_ms,
        "execution_result": {
            "success": result.execution_result.success,
            "output": result.execution_result.output,
            "error_message": result.execution_result.error_message,
        } if result.execution_result else None,
    }


@router.post("/tasks/{task_id}/run-complete", response_model=Dict[str, Any])
async def run_task_to_completion(
    task_id: UUID,
    body: RunTaskBody,
    dm_router: DomainMemoryRouter = Depends(get_router),
):
    """Run task until completion or failure."""
    results = await dm_router.run_task_to_completion(
        task_id,
        max_iterations=body.max_iterations,
    )

    status_info = await dm_router.get_task_status(task_id)

    return {
        "task_id": str(task_id),
        "status": status_info.get("status") if status_info else "unknown",
        "progress": status_info.get("progress") if status_info else None,
        "worker_runs": len(results),
        "total_duration_ms": sum(r.duration_ms for r in results),
    }


@router.post("/tasks/{task_id}/pause", response_model=Dict[str, Any])
async def pause_task(
    task_id: UUID,
    dm_router: DomainMemoryRouter = Depends(get_router),
):
    """Pause a running task."""
    success = await dm_router.pause_task(task_id)

    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Could not pause task (may not be in pauseable state)",
        )

    return {"success": True, "task_id": str(task_id), "message": "Task paused"}


@router.post("/tasks/{task_id}/resume", response_model=Dict[str, Any])
async def resume_task(
    task_id: UUID,
    dm_router: DomainMemoryRouter = Depends(get_router),
):
    """Resume a paused task."""
    success = await dm_router.resume_task(task_id)

    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Could not resume task (may not be paused)",
        )

    return {"success": True, "task_id": str(task_id), "message": "Task resumed"}


@router.post("/tasks/{task_id}/cancel", response_model=Dict[str, Any])
async def cancel_task(
    task_id: UUID,
    reason: str = "Cancelled by user",
    dm_router: DomainMemoryRouter = Depends(get_router),
):
    """Cancel a task."""
    success = await dm_router.cancel_task(task_id, reason)

    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Could not cancel task",
        )

    return {"success": True, "task_id": str(task_id), "message": "Task cancelled"}


@router.post("/tasks/{task_id}/retry", response_model=Dict[str, Any])
async def retry_task(
    task_id: UUID,
    dm_router: DomainMemoryRouter = Depends(get_router),
):
    """Retry a failed task."""
    result = await dm_router.retry_task(task_id)

    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found",
        )

    return {
        "success": True,
        "task_id": str(task_id),
        "work_item_executed": result.work_item_executed,
    }


@router.delete("/tasks/{task_id}", response_model=Dict[str, Any])
async def delete_task(
    task_id: UUID,
    dm_router: DomainMemoryRouter = Depends(get_router),
):
    """Delete a task and all its artifacts."""
    success = await dm_router.delete_task(task_id)

    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found",
        )

    return {"success": True, "message": "Task deleted"}


@router.post("/webhook", response_model=Dict[str, Any])
async def handle_webhook(
    body: WebhookBody,
    request: Request,
):
    """
    Handle incoming webhook events.

    Supports various event types for task triggering.
    """
    user_id = None
    try:
        user_id = get_user_id(request)
    except HTTPException:
        pass

    handler = DomainMemoryWebhookHandler()

    result = await handler.handle_webhook(
        event_type=body.event_type,
        payload=body.payload,
        user_id=user_id,
    )

    return result


@router.get("/pending", response_model=List[Dict[str, Any]])
async def list_pending_tasks(
    limit: int = 50,
    dm_router: DomainMemoryRouter = Depends(get_router),
):
    """List all pending tasks (admin endpoint for scheduling)."""
    tasks = await dm_router.list_pending_tasks(limit=limit)
    return tasks
