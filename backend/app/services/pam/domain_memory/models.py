"""
Pydantic models for Domain Memory Agent System artifacts.
"""

from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional
from uuid import UUID

from pydantic import BaseModel, Field


class TaskStatus(str, Enum):
    PENDING = "pending"
    INITIALIZING = "initializing"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    FAILED = "failed"
    PAUSED = "paused"


class TaskScope(str, Enum):
    USER = "user"
    SYSTEM = "system"


class TaskType(str, Enum):
    TRIP_PLANNING = "trip_planning"
    BUDGET_ANALYSIS = "budget_analysis"
    RECOMMENDATIONS = "recommendations"
    CUSTOM = "custom"


class WorkItemStatus(str, Enum):
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    FAILED = "failed"
    BLOCKED = "blocked"
    SKIPPED = "skipped"


class EntryType(str, Enum):
    ACTION = "action"
    DECISION = "decision"
    ERROR = "error"
    MILESTONE = "milestone"
    ROLLBACK = "rollback"


class WorkItem(BaseModel):
    """Atomic unit of work within a task."""
    id: str
    description: str
    status: WorkItemStatus = WorkItemStatus.PENDING
    action_type: Optional[str] = None
    parameters: Dict[str, Any] = Field(default_factory=dict)
    depends_on: List[str] = Field(default_factory=list)
    estimated_effort: Optional[str] = None
    result: Optional[Dict[str, Any]] = None
    error_message: Optional[str] = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None


class ParsedIntent(BaseModel):
    """Structured representation of user's request."""
    goal: str
    sub_goals: List[str] = Field(default_factory=list)
    deliverables: List[str] = Field(default_factory=list)
    extracted_constraints: Dict[str, Any] = Field(default_factory=dict)
    confidence_score: float = 1.0


class SuccessCriterion(BaseModel):
    """Single criterion for validating task completion."""
    id: str
    description: str
    how_to_verify: str
    is_met: bool = False
    verified_at: Optional[datetime] = None


class TestCase(BaseModel):
    """Test case for validating work item or deliverable."""
    id: str
    description: str
    work_item_id: Optional[str] = None
    steps: List[str] = Field(default_factory=list)
    expected_outcome: str
    actual_outcome: Optional[str] = None
    passed: Optional[bool] = None
    executed_at: Optional[datetime] = None


class BudgetConstraint(BaseModel):
    """Budget-related constraints."""
    max_budget: Optional[float] = None
    currency: str = "USD"
    categories: Dict[str, float] = Field(default_factory=dict)


class TimeConstraint(BaseModel):
    """Time-related constraints."""
    deadline: Optional[datetime] = None
    max_duration_hours: Optional[int] = None
    preferred_times: List[str] = Field(default_factory=list)


class ScopeConstraint(BaseModel):
    """Scope-related constraints."""
    included_regions: List[str] = Field(default_factory=list)
    excluded_regions: List[str] = Field(default_factory=list)
    included_categories: List[str] = Field(default_factory=list)
    excluded_categories: List[str] = Field(default_factory=list)
    custom_filters: Dict[str, Any] = Field(default_factory=dict)


class DomainTask(BaseModel):
    """Main task entity."""
    id: UUID
    user_id: UUID
    task_type: TaskType
    status: TaskStatus = TaskStatus.PENDING
    priority: int = Field(default=5, ge=1, le=10)
    scope: TaskScope = TaskScope.USER
    created_at: datetime
    updated_at: datetime
    completed_at: Optional[datetime] = None
    error_message: Optional[str] = None

    class Config:
        from_attributes = True


class TaskDefinition(BaseModel):
    """Task definition artifact - what needs to be done."""
    id: UUID
    task_id: UUID
    original_request: str
    parsed_intent: ParsedIntent
    work_items: List[WorkItem]
    success_criteria: List[SuccessCriterion]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class TaskState(BaseModel):
    """Current state artifact - where we are now."""
    id: UUID
    task_id: UUID
    current_work_item_id: Optional[str] = None
    completed_items: List[str] = Field(default_factory=list)
    failed_items: List[str] = Field(default_factory=list)
    blocked_items: List[str] = Field(default_factory=list)
    context_snapshot: Dict[str, Any] = Field(default_factory=dict)
    last_worker_run: Optional[datetime] = None
    worker_run_count: int = 0
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ProgressEntry(BaseModel):
    """Single entry in the progress log."""
    id: UUID
    task_id: UUID
    worker_run_id: UUID
    entry_type: EntryType
    work_item_id: Optional[str] = None
    content: str
    metadata: Dict[str, Any] = Field(default_factory=dict)
    created_at: datetime

    class Config:
        from_attributes = True


class TaskConstraints(BaseModel):
    """Constraints artifact - rules and limits."""
    id: UUID
    task_id: UUID
    budget_constraints: Optional[BudgetConstraint] = None
    time_constraints: Optional[TimeConstraint] = None
    scope_constraints: Optional[ScopeConstraint] = None
    safety_rules: List[str] = Field(default_factory=list)
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class TestCriteria(BaseModel):
    """Test criteria artifact - how to validate."""
    id: UUID
    task_id: UUID
    test_cases: List[TestCase]
    validation_queries: List[str] = Field(default_factory=list)
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class DomainContext(BaseModel):
    """Complete context loaded by Worker Agent at startup."""
    task: DomainTask
    definition: TaskDefinition
    state: TaskState
    constraints: TaskConstraints
    tests: TestCriteria
    recent_progress: List[ProgressEntry] = Field(default_factory=list)


class ExecutionResult(BaseModel):
    """Result of executing a work item."""
    work_item_id: str
    success: bool
    output: Optional[Dict[str, Any]] = None
    error_message: Optional[str] = None
    duration_ms: int = 0
    tool_used: Optional[str] = None


class WorkerRunResult(BaseModel):
    """Result of a single Worker Agent run."""
    task_id: UUID
    worker_run_id: UUID
    work_item_executed: Optional[str] = None
    execution_result: Optional[ExecutionResult] = None
    task_completed: bool = False
    task_failed: bool = False
    next_item_available: bool = True
    progress_entries: List[str] = Field(default_factory=list)
    duration_ms: int = 0


class DomainMemoryResponse(BaseModel):
    """Standard response from Domain Memory operations."""
    success: bool
    task_id: Optional[UUID] = None
    message: str
    data: Optional[Dict[str, Any]] = None
    errors: List[str] = Field(default_factory=list)


class CreateTaskRequest(BaseModel):
    """Request to create a new domain memory task."""
    request: str
    task_type: TaskType = TaskType.CUSTOM
    priority: int = Field(default=5, ge=1, le=10)
    scope: TaskScope = TaskScope.USER
    constraints: Optional[Dict[str, Any]] = None


class TaskSummary(BaseModel):
    """Summary of a task for listing."""
    id: UUID
    task_type: TaskType
    status: TaskStatus
    priority: int
    scope: TaskScope
    original_request: str
    work_items_total: int = 0
    work_items_completed: int = 0
    worker_run_count: int = 0
    created_at: datetime
    updated_at: datetime
    completed_at: Optional[datetime] = None
