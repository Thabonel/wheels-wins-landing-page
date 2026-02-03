"""
Dynamic Tool Generation System for PAM

This module provides AI-powered runtime tool generation capabilities.
It allows PAM to generate new tools on-the-fly based on user intent,
with comprehensive security validation and sandboxed execution.

Components:
- models: Pydantic models for tool generation requests and results
- templates: Pre-defined tool templates for different use cases
- code_generator: Claude-powered code generation
- code_validator: AST-based security validation and compilation
- sandbox_executor: Safe execution environment with resource limits
- network_controller: Network access validation and rate limiting
- pattern_learner: Caching and learning from tool patterns
- generator: Main orchestrator tying everything together

Usage:
    from app.services.dynamic_tools import get_dynamic_tool_generator

    generator = await get_dynamic_tool_generator()

    result = await generator.generate_or_find_tool(
        intent="Get weather for RV camping spots",
        context={"target_data_sources": ["api.open-meteo.com"]},
        user_id="user-123"
    )

    if result:
        execution = await generator.execute_dynamic_tool(
            tool_result=result,
            user_id="user-123",
            parameters={"location": "Yellowstone National Park"}
        )
"""

# Models
from app.services.dynamic_tools.models import (
    ToolGenerationRequest,
    GeneratedToolCode,
    GeneratedToolPattern,
    ToolExecutionResult,
    SecurityViolation,
    SecurityViolationType,
    ToolGenerationStatus,
    RateLimitStatus,
    CompiledTool,
)

# Templates
from app.services.dynamic_tools.templates import (
    TOOL_TEMPLATES,
    TemplateSelector,
    get_template_selector,
)

# Code Generator
from app.services.dynamic_tools.code_generator import (
    CodeGenerator,
    get_code_generator,
)

# Code Validator
from app.services.dynamic_tools.code_validator import (
    SafeCodeCompiler,
    InjectionPreventer,
    get_safe_compiler,
    FORBIDDEN_FUNCTIONS,
    FORBIDDEN_IMPORTS,
    ALLOWED_IMPORTS,
)

# Sandbox Executor
from app.services.dynamic_tools.sandbox_executor import (
    SandboxedExecutor,
    get_sandboxed_executor,
    MEMORY_LIMIT_MB,
    EXECUTION_TIMEOUT_S,
)

# Network Controller
from app.services.dynamic_tools.network_controller import (
    NetworkAccessController,
    get_network_controller,
    ALLOWED_APIS,
    BLOCKED_PATHS,
)

# Pattern Learner
from app.services.dynamic_tools.pattern_learner import (
    PatternLearner,
    get_pattern_learner,
)

# Main Generator
from app.services.dynamic_tools.generator import (
    DynamicToolGenerator,
    get_dynamic_tool_generator,
    MAX_GENERATIONS_PER_HOUR,
)


__all__ = [
    # Models
    "ToolGenerationRequest",
    "GeneratedToolCode",
    "GeneratedToolPattern",
    "ToolExecutionResult",
    "SecurityViolation",
    "SecurityViolationType",
    "ToolGenerationStatus",
    "RateLimitStatus",
    "CompiledTool",

    # Templates
    "TOOL_TEMPLATES",
    "TemplateSelector",
    "get_template_selector",

    # Code Generator
    "CodeGenerator",
    "get_code_generator",

    # Code Validator
    "SafeCodeCompiler",
    "InjectionPreventer",
    "get_safe_compiler",
    "FORBIDDEN_FUNCTIONS",
    "FORBIDDEN_IMPORTS",
    "ALLOWED_IMPORTS",

    # Sandbox Executor
    "SandboxedExecutor",
    "get_sandboxed_executor",
    "MEMORY_LIMIT_MB",
    "EXECUTION_TIMEOUT_S",

    # Network Controller
    "NetworkAccessController",
    "get_network_controller",
    "ALLOWED_APIS",
    "BLOCKED_PATHS",

    # Pattern Learner
    "PatternLearner",
    "get_pattern_learner",

    # Main Generator
    "DynamicToolGenerator",
    "get_dynamic_tool_generator",
    "MAX_GENERATIONS_PER_HOUR",
]
