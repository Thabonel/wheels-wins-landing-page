"""
Database storage for Domain Memory artifacts using Supabase.
"""

from datetime import datetime
from typing import Any, Dict, List, Optional
from uuid import UUID, uuid4

import logging

from app.database.supabase_client import get_supabase_service

logger = logging.getLogger(__name__)

from ..models import (
    BudgetConstraint,
    DomainContext,
    DomainTask,
    EntryType,
    ParsedIntent,
    ProgressEntry,
    ScopeConstraint,
    SuccessCriterion,
    TaskConstraints,
    TaskDefinition,
    TaskScope,
    TaskState,
    TaskStatus,
    TaskSummary,
    TaskType,
    TestCase,
    TestCriteria,
    TimeConstraint,
    WorkItem,
    WorkItemStatus,
)


class DomainMemoryStore:
    """Database operations for Domain Memory artifacts."""

    def __init__(self):
        self.supabase = get_supabase_service()

    def _to_str(self, value) -> str:
        """Convert UUID or string to string for database operations."""
        if isinstance(value, UUID):
            return str(value)
        return value

    async def create_task(
        self,
        user_id,
        task_type: TaskType,
        scope: TaskScope = TaskScope.USER,
        priority: int = 5,
    ) -> DomainTask:
        """Create a new domain memory task."""
        now = datetime.utcnow()
        data = {
            "user_id": self._to_str(user_id),
            "task_type": task_type.value,
            "status": TaskStatus.PENDING.value,
            "priority": priority,
            "scope": scope.value,
            "created_at": now.isoformat(),
            "updated_at": now.isoformat(),
        }

        result = self.supabase.table("domain_memory_tasks").insert(data).execute()

        if not result.data:
            raise ValueError("Failed to create task")

        row = result.data[0]
        return DomainTask(
            id=UUID(row["id"]),
            user_id=UUID(row["user_id"]),
            task_type=TaskType(row["task_type"]),
            status=TaskStatus(row["status"]),
            priority=row["priority"],
            scope=TaskScope(row["scope"]),
            created_at=datetime.fromisoformat(row["created_at"].replace("Z", "+00:00")),
            updated_at=datetime.fromisoformat(row["updated_at"].replace("Z", "+00:00")),
        )

    async def get_task(self, task_id) -> Optional[DomainTask]:
        """Get a task by ID."""
        result = (
            self.supabase.table("domain_memory_tasks")
            .select("*")
            .eq("id", self._to_str(task_id))
            .maybe_single()
            .execute()
        )

        if not result.data:
            return None

        row = result.data
        return DomainTask(
            id=UUID(row["id"]),
            user_id=UUID(row["user_id"]),
            task_type=TaskType(row["task_type"]),
            status=TaskStatus(row["status"]),
            priority=row["priority"],
            scope=TaskScope(row["scope"]),
            created_at=datetime.fromisoformat(row["created_at"].replace("Z", "+00:00")),
            updated_at=datetime.fromisoformat(row["updated_at"].replace("Z", "+00:00")),
            completed_at=(
                datetime.fromisoformat(row["completed_at"].replace("Z", "+00:00"))
                if row.get("completed_at")
                else None
            ),
            error_message=row.get("error_message"),
        )

    async def update_task_status(
        self,
        task_id,
        status: TaskStatus,
        error_message: Optional[str] = None,
    ) -> bool:
        """Update task status."""
        data: Dict[str, Any] = {
            "status": status.value,
            "updated_at": datetime.utcnow().isoformat(),
        }

        if status == TaskStatus.COMPLETED:
            data["completed_at"] = datetime.utcnow().isoformat()

        if error_message:
            data["error_message"] = error_message

        result = (
            self.supabase.table("domain_memory_tasks")
            .update(data)
            .eq("id", self._to_str(task_id))
            .execute()
        )

        return bool(result.data)

    async def list_user_tasks(
        self,
        user_id,
        status: Optional[TaskStatus] = None,
        limit: int = 50,
    ) -> List[TaskSummary]:
        """List tasks for a user."""
        query = (
            self.supabase.table("domain_memory_tasks")
            .select("*")
            .eq("user_id", self._to_str(user_id))
            .order("created_at", desc=True)
            .limit(limit)
        )

        if status:
            query = query.eq("status", status.value)

        result = query.execute()

        summaries = []
        for row in result.data or []:
            definition = await self.get_definition(row["id"])
            state = await self.get_state(row["id"])

            work_items_total = len(definition.work_items) if definition else 0
            work_items_completed = len(state.completed_items) if state else 0

            summaries.append(
                TaskSummary(
                    id=UUID(row["id"]),
                    task_type=TaskType(row["task_type"]),
                    status=TaskStatus(row["status"]),
                    priority=row["priority"],
                    scope=TaskScope(row["scope"]),
                    original_request=(
                        definition.original_request if definition else ""
                    ),
                    work_items_total=work_items_total,
                    work_items_completed=work_items_completed,
                    worker_run_count=state.worker_run_count if state else 0,
                    created_at=datetime.fromisoformat(
                        row["created_at"].replace("Z", "+00:00")
                    ),
                    updated_at=datetime.fromisoformat(
                        row["updated_at"].replace("Z", "+00:00")
                    ),
                    completed_at=(
                        datetime.fromisoformat(row["completed_at"].replace("Z", "+00:00"))
                        if row.get("completed_at")
                        else None
                    ),
                )
            )

        return summaries

    async def list_pending_tasks(self, limit: int = 20) -> List[DomainTask]:
        """List all pending or in-progress tasks ordered by priority."""
        result = (
            self.supabase.table("domain_memory_tasks")
            .select("*")
            .in_("status", [TaskStatus.PENDING.value, TaskStatus.IN_PROGRESS.value])
            .order("priority", desc=True)
            .order("created_at", desc=False)
            .limit(limit)
            .execute()
        )

        tasks = []
        for row in result.data or []:
            tasks.append(
                DomainTask(
                    id=UUID(row["id"]),
                    user_id=UUID(row["user_id"]),
                    task_type=TaskType(row["task_type"]),
                    status=TaskStatus(row["status"]),
                    priority=row["priority"],
                    scope=TaskScope(row["scope"]),
                    created_at=datetime.fromisoformat(
                        row["created_at"].replace("Z", "+00:00")
                    ),
                    updated_at=datetime.fromisoformat(
                        row["updated_at"].replace("Z", "+00:00")
                    ),
                )
            )

        return tasks

    async def create_definition(
        self,
        task_id,
        original_request: str,
        parsed_intent: ParsedIntent,
        work_items: List[WorkItem],
        success_criteria: List[SuccessCriterion],
    ) -> TaskDefinition:
        """Create task definition artifact."""
        now = datetime.utcnow()
        data = {
            "task_id": self._to_str(task_id),
            "original_request": original_request,
            "parsed_intent": parsed_intent.model_dump(),
            "work_items": [item.model_dump() for item in work_items],
            "success_criteria": [crit.model_dump() for crit in success_criteria],
            "created_at": now.isoformat(),
            "updated_at": now.isoformat(),
        }

        result = (
            self.supabase.table("domain_memory_definitions").insert(data).execute()
        )

        if not result.data:
            raise ValueError("Failed to create definition")

        row = result.data[0]
        return TaskDefinition(
            id=UUID(row["id"]),
            task_id=UUID(row["task_id"]),
            original_request=row["original_request"],
            parsed_intent=ParsedIntent(**row["parsed_intent"]),
            work_items=[WorkItem(**item) for item in row["work_items"]],
            success_criteria=[
                SuccessCriterion(**crit) for crit in row["success_criteria"]
            ],
            created_at=datetime.fromisoformat(row["created_at"].replace("Z", "+00:00")),
            updated_at=datetime.fromisoformat(row["updated_at"].replace("Z", "+00:00")),
        )

    async def get_definition(self, task_id) -> Optional[TaskDefinition]:
        """Get task definition by task ID."""
        result = (
            self.supabase.table("domain_memory_definitions")
            .select("*")
            .eq("task_id", self._to_str(task_id))
            .maybe_single()
            .execute()
        )

        if not result.data:
            return None

        row = result.data
        return TaskDefinition(
            id=UUID(row["id"]),
            task_id=UUID(row["task_id"]),
            original_request=row["original_request"],
            parsed_intent=ParsedIntent(**row["parsed_intent"]),
            work_items=[WorkItem(**item) for item in row["work_items"]],
            success_criteria=[
                SuccessCriterion(**crit) for crit in row["success_criteria"]
            ],
            created_at=datetime.fromisoformat(row["created_at"].replace("Z", "+00:00")),
            updated_at=datetime.fromisoformat(row["updated_at"].replace("Z", "+00:00")),
        )

    async def update_work_items(
        self, task_id, work_items: List[WorkItem]
    ) -> bool:
        """Update work items in definition."""
        data = {
            "work_items": [item.model_dump() for item in work_items],
            "updated_at": datetime.utcnow().isoformat(),
        }

        result = (
            self.supabase.table("domain_memory_definitions")
            .update(data)
            .eq("task_id", self._to_str(task_id))
            .execute()
        )

        return bool(result.data)

    async def create_state(self, task_id) -> TaskState:
        """Create initial state artifact."""
        now = datetime.utcnow()
        data = {
            "task_id": self._to_str(task_id),
            "completed_items": [],
            "failed_items": [],
            "blocked_items": [],
            "context_snapshot": {},
            "worker_run_count": 0,
            "created_at": now.isoformat(),
            "updated_at": now.isoformat(),
        }

        result = self.supabase.table("domain_memory_states").insert(data).execute()

        if not result.data:
            raise ValueError("Failed to create state")

        row = result.data[0]
        return TaskState(
            id=UUID(row["id"]),
            task_id=UUID(row["task_id"]),
            current_work_item_id=row.get("current_work_item_id"),
            completed_items=row.get("completed_items", []),
            failed_items=row.get("failed_items", []),
            blocked_items=row.get("blocked_items", []),
            context_snapshot=row.get("context_snapshot", {}),
            last_worker_run=None,
            worker_run_count=row.get("worker_run_count", 0),
            created_at=datetime.fromisoformat(row["created_at"].replace("Z", "+00:00")),
            updated_at=datetime.fromisoformat(row["updated_at"].replace("Z", "+00:00")),
        )

    async def get_state(self, task_id) -> Optional[TaskState]:
        """Get state by task ID."""
        result = (
            self.supabase.table("domain_memory_states")
            .select("*")
            .eq("task_id", self._to_str(task_id))
            .maybe_single()
            .execute()
        )

        if not result.data:
            return None

        row = result.data
        return TaskState(
            id=UUID(row["id"]),
            task_id=UUID(row["task_id"]),
            current_work_item_id=row.get("current_work_item_id"),
            completed_items=row.get("completed_items", []),
            failed_items=row.get("failed_items", []),
            blocked_items=row.get("blocked_items", []),
            context_snapshot=row.get("context_snapshot", {}),
            last_worker_run=(
                datetime.fromisoformat(row["last_worker_run"].replace("Z", "+00:00"))
                if row.get("last_worker_run")
                else None
            ),
            worker_run_count=row.get("worker_run_count", 0),
            created_at=datetime.fromisoformat(row["created_at"].replace("Z", "+00:00")),
            updated_at=datetime.fromisoformat(row["updated_at"].replace("Z", "+00:00")),
        )

    async def update_state(
        self,
        task_id,
        current_work_item_id: Optional[str] = None,
        completed_items: Optional[List[str]] = None,
        failed_items: Optional[List[str]] = None,
        blocked_items: Optional[List[str]] = None,
        context_snapshot: Optional[Dict[str, Any]] = None,
        increment_run_count: bool = False,
    ) -> bool:
        """Update state artifact."""
        task_id_str = self._to_str(task_id)
        data: Dict[str, Any] = {"updated_at": datetime.utcnow().isoformat()}

        if current_work_item_id is not None:
            data["current_work_item_id"] = current_work_item_id

        if completed_items is not None:
            data["completed_items"] = completed_items

        if failed_items is not None:
            data["failed_items"] = failed_items

        if blocked_items is not None:
            data["blocked_items"] = blocked_items

        if context_snapshot is not None:
            data["context_snapshot"] = context_snapshot

        if increment_run_count:
            data["last_worker_run"] = datetime.utcnow().isoformat()
            current_state = await self.get_state(task_id_str)
            if current_state:
                data["worker_run_count"] = current_state.worker_run_count + 1

        result = (
            self.supabase.table("domain_memory_states")
            .update(data)
            .eq("task_id", task_id_str)
            .execute()
        )

        return bool(result.data)

    async def create_constraints(
        self,
        task_id,
        budget_constraints: Optional[BudgetConstraint] = None,
        time_constraints: Optional[TimeConstraint] = None,
        scope_constraints: Optional[ScopeConstraint] = None,
        safety_rules: Optional[List[str]] = None,
    ) -> TaskConstraints:
        """Create constraints artifact."""
        now = datetime.utcnow()
        data = {
            "task_id": self._to_str(task_id),
            "budget_constraints": (
                budget_constraints.model_dump() if budget_constraints else None
            ),
            "time_constraints": (
                time_constraints.model_dump() if time_constraints else None
            ),
            "scope_constraints": (
                scope_constraints.model_dump() if scope_constraints else None
            ),
            "safety_rules": safety_rules or [],
            "created_at": now.isoformat(),
            "updated_at": now.isoformat(),
        }

        result = (
            self.supabase.table("domain_memory_constraints").insert(data).execute()
        )

        if not result.data:
            raise ValueError("Failed to create constraints")

        row = result.data[0]
        return TaskConstraints(
            id=UUID(row["id"]),
            task_id=UUID(row["task_id"]),
            budget_constraints=(
                BudgetConstraint(**row["budget_constraints"])
                if row.get("budget_constraints")
                else None
            ),
            time_constraints=(
                TimeConstraint(**row["time_constraints"])
                if row.get("time_constraints")
                else None
            ),
            scope_constraints=(
                ScopeConstraint(**row["scope_constraints"])
                if row.get("scope_constraints")
                else None
            ),
            safety_rules=row.get("safety_rules", []),
            created_at=datetime.fromisoformat(row["created_at"].replace("Z", "+00:00")),
            updated_at=datetime.fromisoformat(row["updated_at"].replace("Z", "+00:00")),
        )

    async def get_constraints(self, task_id) -> Optional[TaskConstraints]:
        """Get constraints by task ID."""
        result = (
            self.supabase.table("domain_memory_constraints")
            .select("*")
            .eq("task_id", self._to_str(task_id))
            .maybe_single()
            .execute()
        )

        if not result.data:
            return None

        row = result.data
        return TaskConstraints(
            id=UUID(row["id"]),
            task_id=UUID(row["task_id"]),
            budget_constraints=(
                BudgetConstraint(**row["budget_constraints"])
                if row.get("budget_constraints")
                else None
            ),
            time_constraints=(
                TimeConstraint(**row["time_constraints"])
                if row.get("time_constraints")
                else None
            ),
            scope_constraints=(
                ScopeConstraint(**row["scope_constraints"])
                if row.get("scope_constraints")
                else None
            ),
            safety_rules=row.get("safety_rules", []),
            created_at=datetime.fromisoformat(row["created_at"].replace("Z", "+00:00")),
            updated_at=datetime.fromisoformat(row["updated_at"].replace("Z", "+00:00")),
        )

    async def create_tests(
        self,
        task_id,
        test_cases: List[TestCase],
        validation_queries: Optional[List[str]] = None,
    ) -> TestCriteria:
        """Create test criteria artifact."""
        now = datetime.utcnow()
        data = {
            "task_id": self._to_str(task_id),
            "test_cases": [tc.model_dump() for tc in test_cases],
            "validation_queries": validation_queries or [],
            "created_at": now.isoformat(),
            "updated_at": now.isoformat(),
        }

        result = self.supabase.table("domain_memory_tests").insert(data).execute()

        if not result.data:
            raise ValueError("Failed to create tests")

        row = result.data[0]
        return TestCriteria(
            id=UUID(row["id"]),
            task_id=UUID(row["task_id"]),
            test_cases=[TestCase(**tc) for tc in row["test_cases"]],
            validation_queries=row.get("validation_queries", []),
            created_at=datetime.fromisoformat(row["created_at"].replace("Z", "+00:00")),
            updated_at=datetime.fromisoformat(row["updated_at"].replace("Z", "+00:00")),
        )

    async def get_tests(self, task_id) -> Optional[TestCriteria]:
        """Get test criteria by task ID."""
        result = (
            self.supabase.table("domain_memory_tests")
            .select("*")
            .eq("task_id", self._to_str(task_id))
            .maybe_single()
            .execute()
        )

        if not result.data:
            return None

        row = result.data
        return TestCriteria(
            id=UUID(row["id"]),
            task_id=UUID(row["task_id"]),
            test_cases=[TestCase(**tc) for tc in row["test_cases"]],
            validation_queries=row.get("validation_queries", []),
            created_at=datetime.fromisoformat(row["created_at"].replace("Z", "+00:00")),
            updated_at=datetime.fromisoformat(row["updated_at"].replace("Z", "+00:00")),
        )

    async def update_tests(self, task_id, test_cases: List[TestCase]) -> bool:
        """Update test cases."""
        data = {
            "test_cases": [tc.model_dump() for tc in test_cases],
            "updated_at": datetime.utcnow().isoformat(),
        }

        result = (
            self.supabase.table("domain_memory_tests")
            .update(data)
            .eq("task_id", self._to_str(task_id))
            .execute()
        )

        return bool(result.data)

    async def log_progress(
        self,
        task_id,
        worker_run_id: UUID,
        entry_type: EntryType,
        content: str,
        work_item_id: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> ProgressEntry:
        """Add entry to progress log."""
        data = {
            "task_id": self._to_str(task_id),
            "worker_run_id": str(worker_run_id),
            "entry_type": entry_type.value,
            "work_item_id": work_item_id,
            "content": content,
            "metadata": metadata or {},
            "created_at": datetime.utcnow().isoformat(),
        }

        result = self.supabase.table("domain_memory_progress").insert(data).execute()

        if not result.data:
            raise ValueError("Failed to log progress")

        row = result.data[0]
        return ProgressEntry(
            id=UUID(row["id"]),
            task_id=UUID(row["task_id"]),
            worker_run_id=UUID(row["worker_run_id"]),
            entry_type=EntryType(row["entry_type"]),
            work_item_id=row.get("work_item_id"),
            content=row["content"],
            metadata=row.get("metadata", {}),
            created_at=datetime.fromisoformat(row["created_at"].replace("Z", "+00:00")),
        )

    async def get_progress(
        self, task_id, limit: int = 100
    ) -> List[ProgressEntry]:
        """Get progress log entries for a task."""
        result = (
            self.supabase.table("domain_memory_progress")
            .select("*")
            .eq("task_id", self._to_str(task_id))
            .order("created_at", desc=True)
            .limit(limit)
            .execute()
        )

        entries = []
        for row in result.data or []:
            entries.append(
                ProgressEntry(
                    id=UUID(row["id"]),
                    task_id=UUID(row["task_id"]),
                    worker_run_id=UUID(row["worker_run_id"]),
                    entry_type=EntryType(row["entry_type"]),
                    work_item_id=row.get("work_item_id"),
                    content=row["content"],
                    metadata=row.get("metadata", {}),
                    created_at=datetime.fromisoformat(
                        row["created_at"].replace("Z", "+00:00")
                    ),
                )
            )

        return entries

    async def load_full_context(self, task_id) -> Optional[DomainContext]:
        """Load all artifacts for a task (Worker Startup Protocol)."""
        task_id_str = self._to_str(task_id)
        task = await self.get_task(task_id_str)
        if not task:
            return None

        definition = await self.get_definition(task_id_str)
        state = await self.get_state(task_id_str)
        constraints = await self.get_constraints(task_id_str)
        tests = await self.get_tests(task_id_str)
        progress = await self.get_progress(task_id_str, limit=50)

        if not all([definition, state, constraints, tests]):
            logger.warning(f"Incomplete artifacts for task {task_id}")
            return None

        return DomainContext(
            task=task,
            definition=definition,
            state=state,
            constraints=constraints,
            tests=tests,
            recent_progress=progress,
        )

    async def delete_task(self, task_id) -> bool:
        """Delete a task and all its artifacts (cascade)."""
        result = (
            self.supabase.table("domain_memory_tasks")
            .delete()
            .eq("id", self._to_str(task_id))
            .execute()
        )

        return bool(result.data)
