"""
PAM Transition System Tools

Tools for interacting with the Life Transition Navigator module.
Enables PAM to help users manage their transition to RV/nomadic life.
"""

# Phase 1: Read-Only Tools
from .progress_tools import get_transition_progress
from .task_tools import get_transition_tasks

# Phase 2: Task Management Tools
from .task_tools import (
    create_transition_task,
    update_transition_task,
    complete_transition_task,
)

# Phase 3: Shakedown & Equipment Tools
from .shakedown_tools import (
    log_shakedown_trip,
    add_shakedown_issue,
    get_shakedown_summary,
)
from .equipment_tools import (
    add_equipment_item,
    mark_equipment_purchased,
    get_equipment_list,
)
from .launch_week_tools import (
    get_launch_week_status,
    complete_launch_task,
)

__all__ = [
    # Phase 1
    "get_transition_progress",
    "get_transition_tasks",
    # Phase 2
    "create_transition_task",
    "update_transition_task",
    "complete_transition_task",
    # Phase 3
    "log_shakedown_trip",
    "add_shakedown_issue",
    "get_shakedown_summary",
    "add_equipment_item",
    "mark_equipment_purchased",
    "get_equipment_list",
    "get_launch_week_status",
    "complete_launch_task",
]
