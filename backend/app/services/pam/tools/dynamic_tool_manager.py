"""
Dynamic Tool Manager - AI-Generated Tools for PAM

Manages dynamically generated tools that PAM creates at runtime.
Part of the OpenClaw-inspired self-improving capabilities.
"""

from typing import Dict, Any, Optional, List, Type
import asyncio
from datetime import datetime, timedelta
from .base_tool import BaseTool, ToolResult
from .tool_capabilities import ToolCapability
from app.core.logging import get_logger

logger = get_logger(__name__)

# Rate limits for tool generation
MAX_GENERATIONS_PER_HOUR = 10
GENERATION_COOLDOWN_SECONDS = 30


class DynamicToolManager:
    """
    Manages the lifecycle of dynamically generated tools.

    Responsibilities:
    - Check if a user request can be handled by existing tools
    - Generate new tools when needed using AI
    - Cache and reuse successful tool patterns
    - Track usage and promote successful patterns
    - Enforce rate limits and security constraints
    """

    def __init__(self):
        self._generator = None
        self._pattern_learner = None
        self._user_generation_counts: Dict[str, List[datetime]] = {}
        self._active_tools: Dict[str, Dict[str, Any]] = {}  # user_id -> {tool_name: tool_info}
        self.is_initialized = False

    async def initialize(self):
        """Initialize the dynamic tool generation system"""
        try:
            from app.services.dynamic_tools import DynamicToolGenerator, PatternLearner
            self._generator = DynamicToolGenerator()
            self._pattern_learner = PatternLearner()
            self.is_initialized = True
            logger.info("DynamicToolManager initialized successfully")
        except ImportError as e:
            logger.warning(f"Dynamic tool generation not available: {e}")
            self.is_initialized = False
        except Exception as e:
            logger.error(f"Failed to initialize DynamicToolManager: {e}")
            self.is_initialized = False

    def can_handle_with_existing_tools(
        self,
        intent: str,
        available_tools: List[str]
    ) -> bool:
        """
        Check if the intent can be handled by existing tools.

        Args:
            intent: User's request/intent
            available_tools: List of available tool names

        Returns:
            True if existing tools can handle it
        """
        # Keywords that suggest need for existing specific tools
        tool_keywords = {
            "weather": ["weather", "temperature", "forecast", "rain", "sunny"],
            "mapbox_navigator": ["route", "directions", "navigate", "campground", "rv park", "map"],
            "create_calendar_event": ["calendar", "event", "schedule", "appointment", "reminder"],
            "universal_extract": ["price", "website", "link", "url", "extract", "look at"],
            "universal_browser": ["fill", "form", "click", "book", "booking", "submit"],
        }

        intent_lower = intent.lower()

        for tool_name, keywords in tool_keywords.items():
            if tool_name in available_tools:
                if any(kw in intent_lower for kw in keywords):
                    return True

        return False

    async def check_rate_limit(self, user_id: str) -> tuple[bool, Optional[str]]:
        """
        Check if user has exceeded generation rate limit.

        Returns:
            (allowed, error_message)
        """
        now = datetime.utcnow()
        hour_ago = now - timedelta(hours=1)

        # Clean old entries
        if user_id in self._user_generation_counts:
            self._user_generation_counts[user_id] = [
                t for t in self._user_generation_counts[user_id]
                if t > hour_ago
            ]
        else:
            self._user_generation_counts[user_id] = []

        count = len(self._user_generation_counts[user_id])

        if count >= MAX_GENERATIONS_PER_HOUR:
            return False, f"Rate limit exceeded. Maximum {MAX_GENERATIONS_PER_HOUR} tool generations per hour."

        # Check cooldown
        if self._user_generation_counts[user_id]:
            last_gen = self._user_generation_counts[user_id][-1]
            cooldown_end = last_gen + timedelta(seconds=GENERATION_COOLDOWN_SECONDS)
            if now < cooldown_end:
                wait_seconds = (cooldown_end - now).seconds
                return False, f"Please wait {wait_seconds} seconds before generating another tool."

        return True, None

    async def generate_tool_for_intent(
        self,
        user_id: str,
        intent: str,
        context: Dict[str, Any]
    ) -> Optional[Dict[str, Any]]:
        """
        Generate a new tool for the given intent.

        Args:
            user_id: User requesting the tool
            intent: Natural language description of what they want
            context: User context (location, preferences, etc.)

        Returns:
            Dict with tool info or None if generation failed
            {
                "tool": BaseTool instance,
                "function_definition": Dict,
                "pattern_id": str,
                "from_cache": bool
            }
        """
        if not self.is_initialized:
            await self.initialize()
            if not self.is_initialized:
                logger.error("Dynamic tool generation not available")
                return None

        # Check rate limit
        allowed, error = await self.check_rate_limit(user_id)
        if not allowed:
            logger.warning(f"Rate limit for user {user_id}: {error}")
            return None

        try:
            # First, try to find a cached pattern
            pattern = await self._pattern_learner.find_similar_pattern(intent)

            if pattern and pattern.success_rate > 0.8:
                logger.info(f"Found cached pattern for intent: {pattern.pattern_id}")
                tool_info = await self._load_tool_from_pattern(pattern)
                if tool_info:
                    tool_info["from_cache"] = True
                    return tool_info

            # Generate new tool
            logger.info(f"Generating new tool for intent: {intent[:50]}...")

            result = await self._generator.generate_or_find_tool(intent, context)

            if result:
                # Record generation
                self._user_generation_counts.setdefault(user_id, []).append(datetime.utcnow())

                # Store in active tools
                tool_name = result["tool"].tool_name
                self._active_tools.setdefault(user_id, {})[tool_name] = {
                    "tool": result["tool"],
                    "pattern_id": result.get("pattern_id"),
                    "created_at": datetime.utcnow()
                }

                result["from_cache"] = False
                return result

            return None

        except Exception as e:
            logger.error(f"Tool generation failed: {e}")
            return None

    async def _load_tool_from_pattern(self, pattern) -> Optional[Dict[str, Any]]:
        """Load a tool from a cached pattern"""
        try:
            from app.services.dynamic_tools.code_validator import SafeCodeCompiler

            compiler = SafeCodeCompiler()
            is_valid, compiled_code, errors = compiler.validate_and_compile(pattern.generated_code)

            if not is_valid:
                logger.warning(f"Cached pattern validation failed: {errors}")
                return None

            # Execute the compiled code to get the tool class
            # Note: This uses Python's compile() and exec() in a controlled sandbox
            # for dynamic tool loading - not shell command execution
            namespace = self._create_safe_namespace()
            code_obj = compile(pattern.generated_code, "<generated_tool>", "exec")

            # Execute in restricted namespace
            self._safe_exec(code_obj, namespace)

            # Find the tool class in the namespace
            tool_class = None
            for item in namespace.values():
                if isinstance(item, type) and issubclass(item, BaseTool) and item != BaseTool:
                    tool_class = item
                    break

            if not tool_class:
                logger.warning("No tool class found in cached pattern")
                return None

            tool_instance = tool_class()
            await tool_instance.initialize()

            return {
                "tool": tool_instance,
                "function_definition": pattern.function_definition,
                "pattern_id": pattern.pattern_id
            }

        except Exception as e:
            logger.error(f"Failed to load tool from pattern: {e}")
            return None

    def _create_safe_namespace(self) -> Dict[str, Any]:
        """Create a restricted namespace for tool execution"""
        import typing
        import datetime as dt
        import json
        import re
        import math
        from decimal import Decimal

        return {
            # Safe builtins
            "__builtins__": {
                "True": True,
                "False": False,
                "None": None,
                "str": str,
                "int": int,
                "float": float,
                "bool": bool,
                "list": list,
                "dict": dict,
                "tuple": tuple,
                "set": set,
                "len": len,
                "range": range,
                "enumerate": enumerate,
                "zip": zip,
                "map": map,
                "filter": filter,
                "sorted": sorted,
                "min": min,
                "max": max,
                "sum": sum,
                "abs": abs,
                "round": round,
                "isinstance": isinstance,
                "issubclass": issubclass,
                "hasattr": hasattr,
                "type": type,
                "Exception": Exception,
                "ValueError": ValueError,
                "TypeError": TypeError,
                "KeyError": KeyError,
            },
            # Safe modules
            "typing": typing,
            "datetime": dt,
            "json": json,
            "re": re,
            "math": math,
            "Decimal": Decimal,
            # PAM base classes
            "BaseTool": BaseTool,
            "ToolResult": ToolResult,
            "Dict": typing.Dict,
            "Any": typing.Any,
            "Optional": typing.Optional,
            "List": typing.List,
        }

    def _safe_exec(self, code_obj, namespace: Dict[str, Any]):
        """Execute code object in a safe manner"""
        # This is intentionally using Python's exec() for dynamic tool loading
        # The code has already been validated by SafeCodeCompiler
        # and runs in a restricted namespace without dangerous builtins
        exec(code_obj, namespace)  # noqa: S102 - Safe use for sandboxed tool loading

    async def record_execution_result(
        self,
        user_id: str,
        tool_name: str,
        success: bool,
        execution_time_ms: float
    ):
        """Record the result of a tool execution for learning"""
        try:
            if user_id in self._active_tools and tool_name in self._active_tools[user_id]:
                pattern_id = self._active_tools[user_id][tool_name].get("pattern_id")
                if pattern_id and self._pattern_learner:
                    await self._pattern_learner.record_execution(
                        pattern_id, success, execution_time_ms
                    )
        except Exception as e:
            logger.error(f"Failed to record execution result: {e}")

    def get_active_tools(self, user_id: str) -> List[Dict[str, Any]]:
        """Get list of active dynamically generated tools for a user"""
        if user_id not in self._active_tools:
            return []

        return [
            {
                "tool_name": tool_name,
                "created_at": info["created_at"].isoformat(),
                "pattern_id": info.get("pattern_id")
            }
            for tool_name, info in self._active_tools[user_id].items()
        ]

    async def cleanup_expired_tools(self, max_age_hours: int = 24):
        """Clean up old dynamically generated tools"""
        cutoff = datetime.utcnow() - timedelta(hours=max_age_hours)

        for user_id in list(self._active_tools.keys()):
            tools_to_remove = [
                name for name, info in self._active_tools[user_id].items()
                if info["created_at"] < cutoff
            ]
            for name in tools_to_remove:
                del self._active_tools[user_id][name]

            if not self._active_tools[user_id]:
                del self._active_tools[user_id]

        logger.info(f"Cleaned up expired dynamic tools")


# Singleton instance with thread-safe initialization
_manager_instance: Optional[DynamicToolManager] = None
_manager_lock = __import__('threading').Lock()


def get_dynamic_tool_manager() -> DynamicToolManager:
    """
    Get the singleton DynamicToolManager instance (thread-safe).

    Uses double-checked locking pattern for efficiency:
    - First check without lock for fast path
    - Second check with lock to prevent race conditions
    """
    global _manager_instance
    if _manager_instance is None:
        with _manager_lock:
            # Double-check after acquiring lock
            if _manager_instance is None:
                _manager_instance = DynamicToolManager()
    return _manager_instance


async def check_and_generate_tool(
    user_id: str,
    intent: str,
    available_tools: List[str],
    context: Dict[str, Any]
) -> Optional[Dict[str, Any]]:
    """
    Convenience function to check if a new tool is needed and generate it.

    This is the main entry point for the PAM agent to use.

    Args:
        user_id: User making the request
        intent: What the user wants to do
        available_tools: Currently available tool names
        context: User context

    Returns:
        Generated tool info or None if not needed/failed
    """
    manager = get_dynamic_tool_manager()

    # Check if existing tools can handle it
    if manager.can_handle_with_existing_tools(intent, available_tools):
        return None

    # Try to generate a new tool
    return await manager.generate_tool_for_intent(user_id, intent, context)
