import sys
from pathlib import Path
import pytest

backend_path = Path(__file__).resolve().parent.parent / "backend"
if str(backend_path) not in sys.path:
    sys.path.insert(0, str(backend_path))

import os
os.environ.setdefault("SECRET_KEY", "test")
os.environ.setdefault("SUPABASE_KEY", "test")

from app.services.pam.agentic_orchestrator import AgenticOrchestrator, Task, TaskComplexity

class DummyConversation:
    async def analyze_conversation(self, *args, **kwargs):
        return {}

dummy_conv = DummyConversation()

@pytest.mark.asyncio
async def test_optimize_task_order_dependency_priority():
    orchestrator = AgenticOrchestrator(dummy_conv)
    tasks = [
        Task(id="a", description="", user_goal="", complexity=TaskComplexity.SIMPLE,
             required_tools=[], estimated_steps=1, context={}, priority=2),
        Task(id="b", description="", user_goal="", complexity=TaskComplexity.SIMPLE,
             required_tools=[], estimated_steps=1, context={}, priority=1, dependencies=["a"]),
        Task(id="c", description="", user_goal="", complexity=TaskComplexity.SIMPLE,
             required_tools=[], estimated_steps=1, context={}, priority=3)
    ]

    ordered = await orchestrator._optimize_task_order(tasks)
    assert [t.id for t in ordered] == ["a", "b", "c"]
