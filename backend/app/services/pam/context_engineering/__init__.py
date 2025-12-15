"""
Agentic Context Engineering Module.

Implements the 9 core principles for treating LLM context as a compiled runtime object.

Components:
- ContextCompiler: Assembles context from 4 tiers for each LLM call
- SessionCompactor: Schema-driven summarization of session state
- SubAgentOrchestrator: Planner/Executor pattern with scoped contexts
"""

from .context_compiler import ContextCompiler, CompiledContext, CompilationConfig
from .session_compactor import SessionCompactor
from .sub_agent_orchestrator import SubAgentOrchestrator, ExecutionPlan, ExecutionResult

__all__ = [
    "ContextCompiler",
    "CompiledContext",
    "CompilationConfig",
    "SessionCompactor",
    "SubAgentOrchestrator",
    "ExecutionPlan",
    "ExecutionResult",
]
