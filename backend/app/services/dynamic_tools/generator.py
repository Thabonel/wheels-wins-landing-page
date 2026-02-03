"""
Dynamic Tool Generator - Main orchestrator for AI-powered tool generation
"""
import asyncio
from typing import Dict, Any, Optional
from datetime import datetime, timedelta
from collections import defaultdict

from app.core.logging import get_logger
from app.services.pam.tools.base_tool import BaseTool
from app.services.dynamic_tools.models import (
    ToolGenerationRequest,
    GeneratedToolCode,
    CompiledTool,
    RateLimitStatus,
)
from app.services.dynamic_tools.templates import get_template_selector
from app.services.dynamic_tools.code_generator import get_code_generator
from app.services.dynamic_tools.code_validator import get_safe_compiler
from app.services.dynamic_tools.sandbox_executor import get_sandboxed_executor
from app.services.dynamic_tools.pattern_learner import get_pattern_learner
from app.services.dynamic_tools.network_controller import get_network_controller

logger = get_logger(__name__)


# Rate limiting configuration
MAX_GENERATIONS_PER_HOUR = 10


class DynamicToolGenerator:
    """
    Main orchestrator for dynamic tool generation.

    This class coordinates the entire tool generation pipeline:
    1. Check for cached patterns
    2. Generate new tool code if needed
    3. Validate and compile the code
    4. Return the tool ready for execution

    Features:
    - Pattern caching for frequently requested tools
    - Rate limiting per user
    - Security validation
    - Sandboxed execution
    """

    def __init__(self):
        self.logger = get_logger(__name__)
        self.is_initialized = False

        # Components (initialized lazily)
        self.template_selector = None
        self.code_generator = None
        self.safe_compiler = None
        self.sandboxed_executor = None
        self.pattern_learner = None
        self.network_controller = None

        # Rate limiting tracking: user_id -> list of generation timestamps
        self.user_generations: Dict[str, list] = defaultdict(list)

        # Temporary tool registry for dynamic tools
        self.registered_tools: Dict[str, CompiledTool] = {}

        # Statistics
        self.stats = {
            "total_generation_requests": 0,
            "cache_hits": 0,
            "successful_generations": 0,
            "failed_generations": 0,
            "rate_limited_requests": 0
        }

    async def initialize(self):
        """Initialize all components"""
        try:
            self.logger.info("Initializing DynamicToolGenerator...")

            # Initialize components
            self.template_selector = get_template_selector()
            self.code_generator = await get_code_generator()
            self.safe_compiler = get_safe_compiler()
            self.sandboxed_executor = get_sandboxed_executor()
            self.pattern_learner = await get_pattern_learner()
            self.network_controller = get_network_controller()

            self.is_initialized = True
            self.logger.info("DynamicToolGenerator initialized successfully")

        except Exception as e:
            self.logger.error(f"DynamicToolGenerator initialization failed: {e}")
            raise

    async def generate_or_find_tool(
        self,
        intent: str,
        context: Dict[str, Any] = None,
        user_id: Optional[str] = None
    ) -> Optional[Dict[str, Any]]:
        """
        Generate a new tool or find a cached one based on user intent.

        Args:
            intent: User's description of what the tool should do
            context: Additional context (data sources, output format, etc.)
            user_id: User ID for rate limiting

        Returns:
            Dictionary with:
            - tool: BaseTool instance
            - function_definition: OpenAI function schema
            - pattern_id: Cache pattern ID (if cached)
            - from_cache: Whether this was a cache hit

            Returns None if generation fails or is rate limited.
        """
        if not self.is_initialized:
            await self.initialize()

        self.stats["total_generation_requests"] += 1
        context = context or {}

        try:
            # Check rate limiting
            if user_id:
                rate_status = self._check_rate_limit(user_id)
                if rate_status.is_limited:
                    self.stats["rate_limited_requests"] += 1
                    self.logger.warning(
                        f"Rate limited",
                        extra={"user_id": user_id, "limit": rate_status.max_generations_per_hour}
                    )
                    return None

            # Step 1: Check for cached pattern
            cached_pattern = await self.pattern_learner.find_similar_pattern(intent)

            if cached_pattern:
                self.logger.info(
                    f"Cache hit for intent",
                    extra={"pattern_id": cached_pattern.id, "intent": intent[:50]}
                )
                self.stats["cache_hits"] += 1

                # Compile and return cached pattern
                is_valid, compiled, errors = self.safe_compiler.validate_and_compile(
                    cached_pattern.generated_code
                )

                if is_valid and compiled:
                    # Extract tool class name from code
                    import re
                    class_match = re.search(r'class\s+(\w+)\(BaseTool\)', cached_pattern.generated_code)
                    tool_name = class_match.group(1) if class_match else "DynamicTool"

                    return {
                        "tool_code": cached_pattern.generated_code,
                        "tool_name": tool_name,
                        "compiled_code": compiled,
                        "function_definition": cached_pattern.function_definition,
                        "pattern_id": cached_pattern.id,
                        "from_cache": True
                    }

            # Step 2: Generate new tool
            self.logger.info(
                f"Generating new tool",
                extra={"intent": intent[:50], "user_id": user_id}
            )

            # Create generation request
            request = ToolGenerationRequest(
                user_intent=intent,
                context=context,
                target_data_sources=context.get("target_data_sources", []),
                expected_output_format=context.get("expected_output_format"),
                user_id=user_id
            )

            # Generate code
            generated = await self.code_generator.generate_tool_code(request)

            if not generated.validation_passed or not generated.code:
                self.stats["failed_generations"] += 1
                self.logger.error(
                    f"Code generation failed",
                    extra={"errors": generated.validation_errors}
                )
                return None

            # Step 3: Validate and compile
            is_valid, compiled, errors = self.safe_compiler.validate_and_compile(
                generated.code
            )

            if not is_valid:
                self.stats["failed_generations"] += 1
                self.logger.error(
                    f"Code validation failed",
                    extra={"errors": errors[:5]}
                )
                return None

            # Step 4: Generate function definition
            function_def = await self.code_generator.generate_function_definition(
                generated.code,
                intent
            )

            # Step 5: Save pattern for future use
            pattern_id = await self.pattern_learner.save_pattern(
                intent=intent,
                template=generated.template_used,
                code=generated.code,
                function_def=function_def
            )

            # Record generation for rate limiting
            if user_id:
                self.user_generations[user_id].append(datetime.utcnow())

            self.stats["successful_generations"] += 1

            self.logger.info(
                f"Tool generated successfully",
                extra={
                    "tool_name": generated.tool_name,
                    "template": generated.template_used,
                    "pattern_id": pattern_id
                }
            )

            return {
                "tool_code": generated.code,
                "tool_name": generated.tool_name,
                "compiled_code": compiled,
                "function_definition": function_def,
                "pattern_id": pattern_id,
                "from_cache": False
            }

        except Exception as e:
            self.stats["failed_generations"] += 1
            self.logger.error(f"Tool generation failed: {e}", exc_info=True)
            return None

    async def execute_dynamic_tool(
        self,
        tool_result: Dict[str, Any],
        user_id: str,
        parameters: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Execute a dynamically generated tool.

        Args:
            tool_result: Result from generate_or_find_tool()
            user_id: User ID for execution
            parameters: Parameters to pass to the tool

        Returns:
            Execution result dictionary
        """
        if not tool_result:
            return {
                "success": False,
                "error": "No tool provided"
            }

        try:
            # Execute the compiled code
            result = await self.sandboxed_executor.execute_compiled_code(
                compiled_code=tool_result["compiled_code"],
                tool_name=tool_result["tool_name"],
                user_id=user_id,
                parameters=parameters
            )

            # Record execution result for pattern learning
            if tool_result.get("pattern_id"):
                await self.pattern_learner.record_execution(
                    pattern_id=tool_result["pattern_id"],
                    success=result.success,
                    execution_time_ms=result.execution_time_ms
                )

            return {
                "success": result.success,
                "data": result.data,
                "error": result.error,
                "execution_time_ms": result.execution_time_ms,
                "metadata": result.metadata
            }

        except Exception as e:
            self.logger.error(f"Dynamic tool execution failed: {e}")
            return {
                "success": False,
                "error": str(e)
            }

    async def register_with_pam(
        self,
        tool_result: Dict[str, Any],
        tool_registry
    ) -> bool:
        """
        Register a dynamic tool with the PAM tool registry.

        This enables the tool to be used by the AI for function calling.

        Args:
            tool_result: Result from generate_or_find_tool()
            tool_registry: The PAM tool registry instance

        Returns:
            True if registration successful
        """
        if not tool_result:
            return False

        try:
            from app.services.pam.tools.tool_capabilities import ToolCapability

            # Create a wrapper class that executes the compiled code
            tool_name = tool_result["tool_name"]
            compiled_code = tool_result["compiled_code"]
            function_def = tool_result["function_definition"]

            # Store in temporary registry
            self.registered_tools[tool_name] = CompiledTool(
                tool_name=tool_name,
                code_object=compiled_code,
                tool_class=None,  # We use compiled code instead
                function_definition=function_def,
                pattern_id=tool_result.get("pattern_id")
            )

            # Register with PAM tool registry if available
            if hasattr(tool_registry, 'register_dynamic_tool'):
                await tool_registry.register_dynamic_tool(
                    tool_name=function_def["name"],
                    function_definition=function_def,
                    executor=lambda uid, params: self.execute_dynamic_tool(
                        tool_result, uid, params
                    )
                )

            self.logger.info(
                f"Registered dynamic tool with PAM",
                extra={"tool_name": tool_name}
            )

            return True

        except Exception as e:
            self.logger.error(f"Failed to register tool with PAM: {e}")
            return False

    def _check_rate_limit(self, user_id: str) -> RateLimitStatus:
        """Check rate limiting for a user"""
        now = datetime.utcnow()
        hour_ago = now - timedelta(hours=1)

        # Clean old entries
        self.user_generations[user_id] = [
            ts for ts in self.user_generations[user_id]
            if ts > hour_ago
        ]

        generations = len(self.user_generations[user_id])
        is_limited = generations >= MAX_GENERATIONS_PER_HOUR

        return RateLimitStatus(
            user_id=user_id,
            generations_this_hour=generations,
            max_generations_per_hour=MAX_GENERATIONS_PER_HOUR,
            reset_time=hour_ago + timedelta(hours=1),
            is_limited=is_limited
        )

    def get_stats(self) -> Dict[str, Any]:
        """Get generator statistics"""
        return {
            **self.stats,
            "is_initialized": self.is_initialized,
            "registered_tools": len(self.registered_tools),
            "pattern_learner_stats": self.pattern_learner.get_stats() if self.pattern_learner else {},
            "executor_stats": self.sandboxed_executor.get_stats() if self.sandboxed_executor else {}
        }


# Module-level instance
dynamic_tool_generator = DynamicToolGenerator()


async def get_dynamic_tool_generator() -> DynamicToolGenerator:
    """Get the dynamic tool generator instance"""
    if not dynamic_tool_generator.is_initialized:
        await dynamic_tool_generator.initialize()
    return dynamic_tool_generator
