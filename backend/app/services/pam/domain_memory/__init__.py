"""
Domain Memory Agent System

Two-agent pattern for long-running tasks with externalized memory:
- InitializerAgent: Bootstraps new tasks, creates artifacts
- WorkerAgent: Makes incremental progress, follows Startup Protocol
"""

from .router import DomainMemoryRouter
from .models import (
    DomainTask,
    TaskDefinition,
    TaskState,
    ProgressEntry,
    TaskConstraints,
    TestCriteria,
    WorkItem,
    ParsedIntent,
    WorkerRunResult,
    DomainMemoryResponse,
)

__all__ = [
    "DomainMemoryRouter",
    "DomainTask",
    "TaskDefinition",
    "TaskState",
    "ProgressEntry",
    "TaskConstraints",
    "TestCriteria",
    "WorkItem",
    "ParsedIntent",
    "WorkerRunResult",
    "DomainMemoryResponse",
]
