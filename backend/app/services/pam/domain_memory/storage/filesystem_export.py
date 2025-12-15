"""
Filesystem Exporter for Domain Memory System.

Exports task artifacts to filesystem for debugging and human review.
"""

import json
import logging
import os
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, Optional
from uuid import UUID

from ..models import DomainContext

logger = logging.getLogger(__name__)


class FilesystemExporter:
    """
    Exports domain memory artifacts to filesystem.

    Useful for:
    - Debugging task execution
    - Human review of AI decisions
    - Archiving completed tasks
    - Offline analysis
    """

    def __init__(self, base_path: str = "/tmp/domain_memory"):
        """
        Initialize exporter.

        Args:
            base_path: Base directory for exports
        """
        self.base_path = Path(base_path)
        self.base_path.mkdir(parents=True, exist_ok=True)

    def _get_task_dir(self, task_id: UUID) -> Path:
        """Get directory for a specific task."""
        task_dir = self.base_path / str(task_id)
        task_dir.mkdir(parents=True, exist_ok=True)
        return task_dir

    def _serialize_datetime(self, obj: Any) -> Any:
        """JSON serializer for datetime objects."""
        if isinstance(obj, datetime):
            return obj.isoformat()
        if isinstance(obj, UUID):
            return str(obj)
        raise TypeError(f"Object of type {type(obj)} is not JSON serializable")

    def export_context(
        self,
        context: DomainContext,
        include_progress: bool = True,
    ) -> str:
        """
        Export full task context to filesystem.

        Args:
            context: Full domain context
            include_progress: Whether to include progress log

        Returns:
            Path to exported directory
        """
        task_dir = self._get_task_dir(context.task.id)

        task_data = {
            "id": str(context.task.id),
            "user_id": str(context.task.user_id),
            "task_type": context.task.task_type.value,
            "status": context.task.status.value,
            "priority": context.task.priority,
            "scope": context.task.scope.value,
            "created_at": context.task.created_at.isoformat(),
            "updated_at": context.task.updated_at.isoformat(),
            "completed_at": context.task.completed_at.isoformat() if context.task.completed_at else None,
            "error_message": context.task.error_message,
        }

        with open(task_dir / "task.json", "w") as f:
            json.dump(task_data, f, indent=2)

        definition_data = {
            "original_request": context.definition.original_request,
            "parsed_intent": {
                "goal": context.definition.parsed_intent.goal,
                "sub_goals": context.definition.parsed_intent.sub_goals,
                "deliverables": context.definition.parsed_intent.deliverables,
                "extracted_constraints": context.definition.parsed_intent.extracted_constraints,
                "confidence_score": context.definition.parsed_intent.confidence_score,
            },
            "work_items": [
                {
                    "id": wi.id,
                    "description": wi.description,
                    "status": wi.status.value,
                    "action_type": wi.action_type,
                    "parameters": wi.parameters,
                    "depends_on": wi.depends_on,
                    "estimated_effort": wi.estimated_effort,
                    "result": wi.result,
                    "error_message": wi.error_message,
                }
                for wi in context.definition.work_items
            ],
            "success_criteria": [
                {
                    "id": sc.id,
                    "description": sc.description,
                    "how_to_verify": sc.how_to_verify,
                    "is_met": sc.is_met,
                }
                for sc in context.definition.success_criteria
            ],
        }

        with open(task_dir / "definition.json", "w") as f:
            json.dump(definition_data, f, indent=2)

        state_data = {
            "current_work_item_id": context.state.current_work_item_id,
            "completed_items": context.state.completed_items,
            "failed_items": context.state.failed_items,
            "blocked_items": context.state.blocked_items,
            "context_snapshot": context.state.context_snapshot,
            "worker_run_count": context.state.worker_run_count,
            "last_worker_run": context.state.last_worker_run.isoformat() if context.state.last_worker_run else None,
        }

        with open(task_dir / "state.json", "w") as f:
            json.dump(state_data, f, indent=2)

        constraints_data = {
            "budget_constraints": {
                "max_budget": context.constraints.budget_constraints.max_budget,
                "currency": context.constraints.budget_constraints.currency,
                "categories": context.constraints.budget_constraints.categories,
            } if context.constraints.budget_constraints else None,
            "time_constraints": {
                "deadline": context.constraints.time_constraints.deadline.isoformat() if context.constraints.time_constraints and context.constraints.time_constraints.deadline else None,
                "max_duration_hours": context.constraints.time_constraints.max_duration_hours if context.constraints.time_constraints else None,
            } if context.constraints.time_constraints else None,
            "scope_constraints": {
                "included_regions": context.constraints.scope_constraints.included_regions,
                "excluded_regions": context.constraints.scope_constraints.excluded_regions,
            } if context.constraints.scope_constraints else None,
            "safety_rules": context.constraints.safety_rules,
        }

        with open(task_dir / "constraints.json", "w") as f:
            json.dump(constraints_data, f, indent=2)

        tests_data = {
            "test_cases": [
                {
                    "id": tc.id,
                    "description": tc.description,
                    "work_item_id": tc.work_item_id,
                    "steps": tc.steps,
                    "expected_outcome": tc.expected_outcome,
                    "actual_outcome": tc.actual_outcome,
                    "passed": tc.passed,
                }
                for tc in context.tests.test_cases
            ],
            "validation_queries": context.tests.validation_queries,
        }

        with open(task_dir / "tests.json", "w") as f:
            json.dump(tests_data, f, indent=2)

        if include_progress and context.recent_progress:
            progress_data = [
                {
                    "id": str(e.id),
                    "entry_type": e.entry_type.value,
                    "work_item_id": e.work_item_id,
                    "content": e.content,
                    "metadata": e.metadata,
                    "created_at": e.created_at.isoformat(),
                }
                for e in context.recent_progress
            ]

            with open(task_dir / "progress.json", "w") as f:
                json.dump(progress_data, f, indent=2)

        summary = f"""# Task Summary
Task ID: {context.task.id}
Type: {context.task.task_type.value}
Status: {context.task.status.value}
Priority: {context.task.priority}/10

## Original Request
{context.definition.original_request}

## Goal
{context.definition.parsed_intent.goal}

## Sub-goals
{chr(10).join('- ' + sg for sg in context.definition.parsed_intent.sub_goals) if context.definition.parsed_intent.sub_goals else 'None'}

## Work Items ({len(context.state.completed_items)}/{len(context.definition.work_items)} completed)
{chr(10).join('- [' + ('x' if wi.id in context.state.completed_items else ' ') + '] ' + wi.description for wi in context.definition.work_items)}

## Success Criteria
{chr(10).join('- [' + ('x' if sc.is_met else ' ') + '] ' + sc.description for sc in context.definition.success_criteria)}

## Worker Runs: {context.state.worker_run_count}
Last Run: {context.state.last_worker_run.isoformat() if context.state.last_worker_run else 'Never'}

---
Exported: {datetime.utcnow().isoformat()}
"""

        with open(task_dir / "SUMMARY.md", "w") as f:
            f.write(summary)

        logger.info(f"Exported task {context.task.id} to {task_dir}")
        return str(task_dir)

    def export_progress_entry(
        self,
        task_id: UUID,
        entry_type: str,
        content: str,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> str:
        """
        Append a progress entry to the task's progress file.

        Args:
            task_id: Task identifier
            entry_type: Type of entry
            content: Entry content
            metadata: Optional metadata

        Returns:
            Path to progress file
        """
        task_dir = self._get_task_dir(task_id)
        progress_file = task_dir / "progress.jsonl"

        entry = {
            "timestamp": datetime.utcnow().isoformat(),
            "entry_type": entry_type,
            "content": content,
            "metadata": metadata or {},
        }

        with open(progress_file, "a") as f:
            f.write(json.dumps(entry) + "\n")

        return str(progress_file)

    def list_exports(self) -> list:
        """List all exported task IDs."""
        return [d.name for d in self.base_path.iterdir() if d.is_dir()]

    def cleanup_export(self, task_id: UUID) -> bool:
        """
        Remove exported files for a task.

        Args:
            task_id: Task identifier

        Returns:
            True if cleaned up successfully
        """
        import shutil

        task_dir = self.base_path / str(task_id)
        if task_dir.exists():
            shutil.rmtree(task_dir)
            logger.info(f"Cleaned up export for task {task_id}")
            return True
        return False
