"""
Webhook Handler for Domain Memory System.

Provides event-driven task triggering via webhooks.
"""

import hashlib
import hmac
import logging
from datetime import datetime
from typing import Any, Dict, Optional
from uuid import UUID

from ..models import TaskScope, TaskType
from ..router import get_domain_memory_router

logger = logging.getLogger(__name__)


class DomainMemoryWebhookHandler:
    """
    Handles incoming webhooks to trigger domain memory tasks.

    Supports:
    - Task creation from external events
    - Task step execution
    - Task status queries
    - Webhook signature verification
    """

    def __init__(self, webhook_secret: Optional[str] = None):
        """
        Initialize webhook handler.

        Args:
            webhook_secret: Optional secret for signature verification
        """
        self.webhook_secret = webhook_secret
        self.router = get_domain_memory_router()

    def verify_signature(
        self,
        payload: bytes,
        signature: str,
        timestamp: Optional[str] = None,
    ) -> bool:
        """
        Verify webhook signature.

        Args:
            payload: Raw request body
            signature: Provided signature
            timestamp: Optional timestamp for replay protection

        Returns:
            True if signature is valid
        """
        if not self.webhook_secret:
            logger.warning("Webhook secret not configured, skipping verification")
            return True

        if timestamp:
            try:
                ts = int(timestamp)
                now = int(datetime.utcnow().timestamp())
                if abs(now - ts) > 300:
                    logger.warning("Webhook timestamp too old")
                    return False
                signed_payload = f"{timestamp}.{payload.decode()}"
            except (ValueError, UnicodeDecodeError):
                return False
        else:
            signed_payload = payload.decode() if isinstance(payload, bytes) else payload

        expected_sig = hmac.new(
            self.webhook_secret.encode(),
            signed_payload.encode(),
            hashlib.sha256,
        ).hexdigest()

        return hmac.compare_digest(expected_sig, signature)

    async def handle_webhook(
        self,
        event_type: str,
        payload: Dict[str, Any],
        user_id: Optional[UUID] = None,
    ) -> Dict[str, Any]:
        """
        Handle incoming webhook event.

        Args:
            event_type: Type of event
            payload: Event payload
            user_id: Optional user context

        Returns:
            Response dict
        """
        logger.info(f"Webhook received: {event_type}")

        handlers = {
            "task.create": self._handle_create_task,
            "task.run_step": self._handle_run_step,
            "task.run_complete": self._handle_run_complete,
            "task.pause": self._handle_pause,
            "task.resume": self._handle_resume,
            "task.cancel": self._handle_cancel,
            "task.status": self._handle_status,
            "trip.planned": self._handle_trip_planned,
            "expense.created": self._handle_expense_created,
            "budget.exceeded": self._handle_budget_exceeded,
        }

        handler = handlers.get(event_type)
        if not handler:
            return {
                "success": False,
                "error": f"Unknown event type: {event_type}",
            }

        try:
            return await handler(payload, user_id)
        except Exception as e:
            logger.error(f"Webhook handler error: {e}")
            return {
                "success": False,
                "error": str(e),
            }

    async def _handle_create_task(
        self,
        payload: Dict[str, Any],
        user_id: Optional[UUID],
    ) -> Dict[str, Any]:
        """Handle task creation webhook."""
        if not user_id and "user_id" in payload:
            user_id = UUID(payload["user_id"])

        if not user_id:
            return {"success": False, "error": "user_id required"}

        request = payload.get("request")
        if not request:
            return {"success": False, "error": "request required"}

        task_type = TaskType(payload.get("task_type", "custom"))
        scope = TaskScope(payload.get("scope", "user"))
        priority = payload.get("priority", 5)

        response = await self.router.create_task(
            user_id=user_id,
            request=request,
            task_type=task_type,
            scope=scope,
            priority=priority,
        )

        return {
            "success": response.success,
            "task_id": str(response.task_id) if response.task_id else None,
            "message": response.message,
        }

    async def _handle_run_step(
        self,
        payload: Dict[str, Any],
        user_id: Optional[UUID],
    ) -> Dict[str, Any]:
        """Handle run step webhook."""
        task_id = payload.get("task_id")
        if not task_id:
            return {"success": False, "error": "task_id required"}

        result = await self.router.run_task_step(UUID(task_id))

        return {
            "success": True,
            "task_id": task_id,
            "work_item_executed": result.work_item_executed,
            "task_completed": result.task_completed,
            "next_item_available": result.next_item_available,
        }

    async def _handle_run_complete(
        self,
        payload: Dict[str, Any],
        user_id: Optional[UUID],
    ) -> Dict[str, Any]:
        """Handle run to completion webhook."""
        task_id = payload.get("task_id")
        if not task_id:
            return {"success": False, "error": "task_id required"}

        max_iterations = payload.get("max_iterations", 100)
        results = await self.router.run_task_to_completion(
            UUID(task_id),
            max_iterations=max_iterations,
        )

        status = await self.router.get_task_status(UUID(task_id))

        return {
            "success": status.get("status") == "completed",
            "task_id": task_id,
            "status": status.get("status"),
            "worker_runs": len(results),
        }

    async def _handle_pause(
        self,
        payload: Dict[str, Any],
        user_id: Optional[UUID],
    ) -> Dict[str, Any]:
        """Handle task pause webhook."""
        task_id = payload.get("task_id")
        if not task_id:
            return {"success": False, "error": "task_id required"}

        success = await self.router.pause_task(UUID(task_id))
        return {"success": success, "task_id": task_id}

    async def _handle_resume(
        self,
        payload: Dict[str, Any],
        user_id: Optional[UUID],
    ) -> Dict[str, Any]:
        """Handle task resume webhook."""
        task_id = payload.get("task_id")
        if not task_id:
            return {"success": False, "error": "task_id required"}

        success = await self.router.resume_task(UUID(task_id))
        return {"success": success, "task_id": task_id}

    async def _handle_cancel(
        self,
        payload: Dict[str, Any],
        user_id: Optional[UUID],
    ) -> Dict[str, Any]:
        """Handle task cancel webhook."""
        task_id = payload.get("task_id")
        if not task_id:
            return {"success": False, "error": "task_id required"}

        reason = payload.get("reason", "Cancelled via webhook")
        success = await self.router.cancel_task(UUID(task_id), reason)
        return {"success": success, "task_id": task_id}

    async def _handle_status(
        self,
        payload: Dict[str, Any],
        user_id: Optional[UUID],
    ) -> Dict[str, Any]:
        """Handle task status query webhook."""
        task_id = payload.get("task_id")
        if not task_id:
            return {"success": False, "error": "task_id required"}

        status = await self.router.get_task_status(UUID(task_id))
        if status is None:
            return {"success": False, "error": "Task not found"}

        return {"success": True, **status}

    async def _handle_trip_planned(
        self,
        payload: Dict[str, Any],
        user_id: Optional[UUID],
    ) -> Dict[str, Any]:
        """Handle trip planned event - creates follow-up tasks."""
        if not user_id and "user_id" in payload:
            user_id = UUID(payload["user_id"])

        if not user_id:
            return {"success": False, "error": "user_id required"}

        trip_details = payload.get("trip", {})
        destination = trip_details.get("destination", "destination")

        request = f"Prepare for trip to {destination}: check weather, find cheap gas stations, suggest campgrounds"

        response = await self.router.create_task(
            user_id=user_id,
            request=request,
            task_type=TaskType.TRIP_PLANNING,
            priority=7,
        )

        return {
            "success": response.success,
            "task_id": str(response.task_id) if response.task_id else None,
            "message": "Trip preparation task created",
        }

    async def _handle_expense_created(
        self,
        payload: Dict[str, Any],
        user_id: Optional[UUID],
    ) -> Dict[str, Any]:
        """Handle expense created event - triggers budget analysis."""
        if not user_id and "user_id" in payload:
            user_id = UUID(payload["user_id"])

        if not user_id:
            return {"success": False, "error": "user_id required"}

        expense = payload.get("expense", {})
        amount = expense.get("amount", 0)
        category = expense.get("category", "unknown")

        if amount > 100:
            request = f"Analyze impact of ${amount} {category} expense on monthly budget"

            response = await self.router.create_task(
                user_id=user_id,
                request=request,
                task_type=TaskType.BUDGET_ANALYSIS,
                priority=5,
            )

            return {
                "success": response.success,
                "task_id": str(response.task_id) if response.task_id else None,
            }

        return {"success": True, "message": "Expense below threshold, no task created"}

    async def _handle_budget_exceeded(
        self,
        payload: Dict[str, Any],
        user_id: Optional[UUID],
    ) -> Dict[str, Any]:
        """Handle budget exceeded event - creates savings recommendation task."""
        if not user_id and "user_id" in payload:
            user_id = UUID(payload["user_id"])

        if not user_id:
            return {"success": False, "error": "user_id required"}

        category = payload.get("category", "overall")
        overage = payload.get("overage_amount", 0)

        request = f"Budget exceeded in {category} by ${overage}. Find ways to reduce spending and recommend savings opportunities."

        response = await self.router.create_task(
            user_id=user_id,
            request=request,
            task_type=TaskType.RECOMMENDATIONS,
            priority=8,
        )

        return {
            "success": response.success,
            "task_id": str(response.task_id) if response.task_id else None,
            "message": "Budget recovery task created",
        }
