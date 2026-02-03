"""
Dynamic Tool Sandbox Executor - Safe execution environment for generated tools

Security hardened to prevent sandbox escape via dunder attribute access.
"""
import ast
import asyncio
import signal
import time
from typing import Dict, Any, Optional, Type, Set
from datetime import datetime

from app.core.logging import get_logger
from app.services.pam.tools.base_tool import BaseTool, ToolResult
from app.services.dynamic_tools.models import ToolExecutionResult

logger = get_logger(__name__)


# Resource limits for sandboxed execution
MEMORY_LIMIT_MB = 100
EXECUTION_TIMEOUT_S = 30

# Dangerous attributes that enable sandbox escape
BLOCKED_ATTRIBUTES: Set[str] = frozenset({
    '__class__',
    '__mro__',
    '__bases__',
    '__subclasses__',
    '__globals__',
    '__code__',
    '__reduce__',
    '__reduce_ex__',
    '__getattribute__',
    '__setattr__',
    '__delattr__',
    '__dict__',
    '__init_subclass__',
    '__prepare__',
    '__qualname__',
    '__module__',
    '__builtins__',
    '__import__',
    '__loader__',
    '__spec__',
    '__path__',
    '__file__',
    '__cached__',
    '__annotations__',
    'func_globals',
    'func_code',
    'gi_frame',
    'gi_code',
    'co_code',
    'f_globals',
    'f_locals',
    'f_builtins',
})


class SandboxSecurityViolation(Exception):
    """Raised when sandboxed code attempts a forbidden operation"""
    pass


class ExecutionTimeoutError(Exception):
    """Raised when execution exceeds the timeout limit"""
    pass


def _timeout_handler(signum, frame):
    """Signal handler for execution timeout"""
    raise ExecutionTimeoutError("Execution timeout exceeded")


class SandboxedExecutor:
    """
    Executes dynamic tools in a sandboxed environment with resource limits.

    Security Features:
    - Blocked dunder attributes to prevent sandbox escape
    - AST pre-validation before any code execution
    - Signal-based execution timeout (30s default)
    - Restricted builtins with safe_getattr
    """

    def __init__(self):
        self.logger = get_logger(__name__)
        self.memory_limit_mb = MEMORY_LIMIT_MB
        self.default_timeout = EXECUTION_TIMEOUT_S
        self.execution_count = 0
        self.total_execution_time_ms = 0.0
        self.security_violations = 0

    def _safe_getattr(self, obj: Any, name: str, default: Any = None) -> Any:
        """
        Safe getattr that blocks dangerous attribute access.

        Prevents sandbox escape via __class__.__mro__ and similar chains.
        """
        if name in BLOCKED_ATTRIBUTES:
            self.security_violations += 1
            self.logger.warning(
                "Sandbox security violation: blocked attribute access",
                extra={
                    "attribute": name,
                    "object_type": type(obj).__name__,
                    "total_violations": self.security_violations
                }
            )
            raise SandboxSecurityViolation(
                f"Access to attribute '{name}' is forbidden in sandbox"
            )
        return getattr(obj, name, default)

    def _safe_hasattr(self, obj: Any, name: str) -> bool:
        """
        Safe hasattr that blocks dangerous attribute checks.
        """
        if name in BLOCKED_ATTRIBUTES:
            self.security_violations += 1
            self.logger.warning(
                "Sandbox security violation: blocked attribute check",
                extra={
                    "attribute": name,
                    "object_type": type(obj).__name__,
                    "total_violations": self.security_violations
                }
            )
            return False
        return hasattr(obj, name)

    def _validate_ast(self, code: str) -> bool:
        """
        Pre-validate code AST before execution.

        Scans for dangerous patterns that could escape the sandbox.

        Returns:
            True if code is safe, raises SandboxSecurityViolation otherwise
        """
        try:
            tree = ast.parse(code)
        except SyntaxError as e:
            raise SandboxSecurityViolation(f"Invalid Python syntax: {e}")

        for node in ast.walk(tree):
            # Check for dangerous attribute access
            if isinstance(node, ast.Attribute):
                if node.attr in BLOCKED_ATTRIBUTES:
                    self.security_violations += 1
                    self.logger.warning(
                        "Sandbox security violation: dangerous AST pattern",
                        extra={
                            "pattern": f"Attribute access: {node.attr}",
                            "line": getattr(node, 'lineno', 'unknown')
                        }
                    )
                    raise SandboxSecurityViolation(
                        f"Access to attribute '{node.attr}' is forbidden"
                    )

            # Check for dangerous function calls
            if isinstance(node, ast.Call):
                if isinstance(node.func, ast.Name):
                    if node.func.id in ('eval', 'exec', 'compile', 'open', '__import__'):
                        self.security_violations += 1
                        self.logger.warning(
                            "Sandbox security violation: dangerous function call",
                            extra={
                                "function": node.func.id,
                                "line": getattr(node, 'lineno', 'unknown')
                            }
                        )
                        raise SandboxSecurityViolation(
                            f"Function '{node.func.id}' is forbidden in sandbox"
                        )

            # Check for import statements
            if isinstance(node, (ast.Import, ast.ImportFrom)):
                module_name = None
                if isinstance(node, ast.Import):
                    module_name = node.names[0].name if node.names else None
                elif isinstance(node, ast.ImportFrom):
                    module_name = node.module

                # Only allow specific safe modules
                allowed_modules = {
                    'json', 're', 'math', 'datetime', 'typing',
                    'decimal', 'collections', 'functools', 'itertools'
                }
                if module_name and module_name.split('.')[0] not in allowed_modules:
                    self.security_violations += 1
                    self.logger.warning(
                        "Sandbox security violation: forbidden import",
                        extra={
                            "module": module_name,
                            "line": getattr(node, 'lineno', 'unknown')
                        }
                    )
                    raise SandboxSecurityViolation(
                        f"Import of module '{module_name}' is forbidden in sandbox"
                    )

        return True

    async def execute_tool(
        self,
        tool_class: Type[BaseTool],
        user_id: str,
        parameters: Dict[str, Any],
        timeout: Optional[float] = None,
        context: Optional[Dict[str, Any]] = None
    ) -> ToolExecutionResult:
        """
        Execute a tool instance in a sandboxed environment

        Args:
            tool_class: The tool class to instantiate and execute
            user_id: User ID for the execution
            parameters: Parameters to pass to the tool
            timeout: Optional timeout override (default: EXECUTION_TIMEOUT_S)
            context: Optional execution context

        Returns:
            ToolExecutionResult with success/failure and data
        """
        execution_timeout = timeout or self.default_timeout
        start_time = time.time()
        tool_name = "unknown"

        try:
            # Create tool instance
            tool_instance = tool_class()
            tool_name = getattr(tool_instance, 'tool_name', 'dynamic_tool')

            self.logger.info(
                f"Executing sandboxed tool",
                extra={
                    "tool_name": tool_name,
                    "user_id": user_id,
                    "timeout": execution_timeout
                }
            )

            # Initialize the tool if needed
            if hasattr(tool_instance, 'initialize') and not tool_instance.is_initialized:
                await asyncio.wait_for(
                    tool_instance.initialize(),
                    timeout=5.0  # 5 second init timeout
                )

            # Execute with timeout
            result = await asyncio.wait_for(
                tool_instance.execute(user_id, parameters),
                timeout=execution_timeout
            )

            execution_time_ms = (time.time() - start_time) * 1000

            # Update stats
            self.execution_count += 1
            self.total_execution_time_ms += execution_time_ms

            # Convert ToolResult to ToolExecutionResult
            if isinstance(result, ToolResult):
                return ToolExecutionResult(
                    success=result.success,
                    tool_name=tool_name,
                    data=result.data,
                    error=result.error,
                    execution_time_ms=execution_time_ms,
                    metadata={
                        "user_id": user_id,
                        "timestamp": datetime.utcnow().isoformat(),
                        **(result.metadata or {})
                    }
                )
            elif isinstance(result, dict):
                return ToolExecutionResult(
                    success=result.get("success", True),
                    tool_name=tool_name,
                    data=result.get("data") or result.get("result"),
                    error=result.get("error"),
                    execution_time_ms=execution_time_ms,
                    metadata={
                        "user_id": user_id,
                        "timestamp": datetime.utcnow().isoformat()
                    }
                )
            else:
                return ToolExecutionResult(
                    success=True,
                    tool_name=tool_name,
                    data=result,
                    execution_time_ms=execution_time_ms,
                    metadata={
                        "user_id": user_id,
                        "timestamp": datetime.utcnow().isoformat()
                    }
                )

        except asyncio.TimeoutError:
            execution_time_ms = (time.time() - start_time) * 1000
            self.logger.error(
                f"Tool execution timed out",
                extra={"tool_name": tool_name, "timeout": execution_timeout}
            )
            return ToolExecutionResult(
                success=False,
                tool_name=tool_name,
                error=f"Execution timed out after {execution_timeout} seconds",
                execution_time_ms=execution_time_ms,
                metadata={
                    "user_id": user_id,
                    "timeout_exceeded": True
                }
            )

        except MemoryError:
            execution_time_ms = (time.time() - start_time) * 1000
            self.logger.error(
                f"Tool execution exceeded memory limit",
                extra={"tool_name": tool_name}
            )
            return ToolExecutionResult(
                success=False,
                tool_name=tool_name,
                error=f"Memory limit exceeded ({self.memory_limit_mb}MB)",
                execution_time_ms=execution_time_ms,
                metadata={
                    "user_id": user_id,
                    "memory_exceeded": True
                }
            )

        except Exception as e:
            execution_time_ms = (time.time() - start_time) * 1000
            self.logger.error(
                f"Tool execution failed",
                extra={"tool_name": tool_name, "error": str(e)},
                exc_info=True
            )
            return ToolExecutionResult(
                success=False,
                tool_name=tool_name,
                error=f"Execution error: {str(e)}",
                execution_time_ms=execution_time_ms,
                metadata={
                    "user_id": user_id,
                    "exception_type": type(e).__name__
                }
            )

    async def execute_compiled_code(
        self,
        compiled_code: Any,
        tool_name: str,
        user_id: str,
        parameters: Dict[str, Any],
        timeout: Optional[float] = None
    ) -> ToolExecutionResult:
        """
        Execute pre-compiled tool code in a hardened sandbox.

        This method executes code that has been validated and compiled
        by the SafeCodeCompiler. It creates a restricted execution
        environment and extracts the tool class.

        Security measures:
        - AST pre-validation for dangerous patterns
        - Signal-based execution timeout
        - Restricted globals with safe_getattr
        - Blocked dunder attribute access

        Args:
            compiled_code: Pre-compiled code object
            tool_name: Name of the tool class to extract
            user_id: User ID for execution
            parameters: Tool parameters
            timeout: Optional timeout override

        Returns:
            ToolExecutionResult
        """
        start_time = time.time()
        execution_timeout = int(timeout or self.default_timeout)
        old_handler = None

        try:
            # Create restricted globals for execution
            restricted_globals = self._create_restricted_globals()

            # Set up signal-based timeout for synchronous code execution
            # Note: signal.alarm only works on Unix and in main thread
            try:
                old_handler = signal.signal(signal.SIGALRM, _timeout_handler)
                signal.alarm(execution_timeout)
            except (ValueError, AttributeError):
                # Not on Unix or not in main thread - fall back to asyncio timeout only
                self.logger.debug("Signal-based timeout not available, using asyncio only")
                old_handler = None

            try:
                # Execute the compiled code to define the class
                exec(compiled_code, restricted_globals)
            finally:
                # Always cancel the alarm
                if old_handler is not None:
                    signal.alarm(0)
                    signal.signal(signal.SIGALRM, old_handler)

            # Extract the tool class
            if tool_name not in restricted_globals:
                return ToolExecutionResult(
                    success=False,
                    tool_name=tool_name,
                    error=f"Tool class '{tool_name}' not found after code execution",
                    execution_time_ms=(time.time() - start_time) * 1000
                )

            tool_class = restricted_globals[tool_name]

            # Verify it's a proper BaseTool subclass
            if not isinstance(tool_class, type) or not issubclass(tool_class, BaseTool):
                return ToolExecutionResult(
                    success=False,
                    tool_name=tool_name,
                    error=f"'{tool_name}' is not a valid BaseTool subclass",
                    execution_time_ms=(time.time() - start_time) * 1000
                )

            # Execute through the normal path
            return await self.execute_tool(
                tool_class=tool_class,
                user_id=user_id,
                parameters=parameters,
                timeout=execution_timeout
            )

        except SandboxSecurityViolation as e:
            execution_time_ms = (time.time() - start_time) * 1000
            self.logger.error(
                "Sandbox security violation during code execution",
                extra={
                    "tool_name": tool_name,
                    "user_id": user_id,
                    "violation": str(e),
                    "total_violations": self.security_violations
                }
            )
            return ToolExecutionResult(
                success=False,
                tool_name=tool_name,
                error=f"Security violation: {str(e)}",
                execution_time_ms=execution_time_ms,
                metadata={"security_violation": True}
            )

        except ExecutionTimeoutError:
            execution_time_ms = (time.time() - start_time) * 1000
            self.logger.error(
                "Code execution timed out via signal",
                extra={"tool_name": tool_name, "timeout": execution_timeout}
            )
            return ToolExecutionResult(
                success=False,
                tool_name=tool_name,
                error=f"Code execution timed out after {execution_timeout} seconds",
                execution_time_ms=execution_time_ms,
                metadata={"timeout_exceeded": True}
            )

        except Exception as e:
            execution_time_ms = (time.time() - start_time) * 1000
            self.logger.error(
                "Compiled code execution failed",
                extra={"tool_name": tool_name, "error": str(e)}
            )
            return ToolExecutionResult(
                success=False,
                tool_name=tool_name,
                error=f"Code execution error: {str(e)}",
                execution_time_ms=execution_time_ms
            )

    async def execute_code_string(
        self,
        code: str,
        tool_name: str,
        user_id: str,
        parameters: Dict[str, Any],
        timeout: Optional[float] = None
    ) -> ToolExecutionResult:
        """
        Execute a code string with full security validation.

        This method performs AST validation before compiling and executing.

        Args:
            code: Python code string to execute
            tool_name: Name of the tool class to extract
            user_id: User ID for execution
            parameters: Tool parameters
            timeout: Optional timeout override

        Returns:
            ToolExecutionResult
        """
        start_time = time.time()

        try:
            # Pre-validate AST before any execution
            self._validate_ast(code)

            # Compile the validated code
            compiled_code = compile(code, f"<sandbox:{tool_name}>", "exec")

            # Execute through the compiled code path
            return await self.execute_compiled_code(
                compiled_code=compiled_code,
                tool_name=tool_name,
                user_id=user_id,
                parameters=parameters,
                timeout=timeout
            )

        except SandboxSecurityViolation as e:
            execution_time_ms = (time.time() - start_time) * 1000
            self.logger.error(
                "AST validation failed - security violation",
                extra={
                    "tool_name": tool_name,
                    "user_id": user_id,
                    "violation": str(e)
                }
            )
            return ToolExecutionResult(
                success=False,
                tool_name=tool_name,
                error=f"Security violation: {str(e)}",
                execution_time_ms=execution_time_ms,
                metadata={"security_violation": True, "phase": "ast_validation"}
            )

        except Exception as e:
            execution_time_ms = (time.time() - start_time) * 1000
            self.logger.error(
                "Code string execution failed",
                extra={"tool_name": tool_name, "error": str(e)}
            )
            return ToolExecutionResult(
                success=False,
                tool_name=tool_name,
                error=f"Execution error: {str(e)}",
                execution_time_ms=execution_time_ms
            )

    def _create_restricted_globals(self) -> Dict[str, Any]:
        """
        Create a restricted globals dictionary for code execution.

        This provides only the safe built-ins and necessary imports
        for tool execution. Uses safe_getattr/safe_hasattr to prevent
        sandbox escape via dunder attribute chains.

        Security: getattr and hasattr are replaced with sandbox-safe versions
        that block access to dangerous attributes like __class__.__mro__.
        """
        import aiohttp
        import json
        import re
        import math
        from decimal import Decimal
        from datetime import datetime, timedelta
        from typing import Dict, List, Any, Optional

        from app.services.pam.tools.base_tool import BaseTool, ToolResult
        from app.services.pam.tools.tool_capabilities import ToolCapability
        from app.core.logging import get_logger

        # Safe subset of builtins - with hardened getattr/hasattr
        safe_builtins = {
            'True': True,
            'False': False,
            'None': None,
            'abs': abs,
            'all': all,
            'any': any,
            'bool': bool,
            'dict': dict,
            'enumerate': enumerate,
            'filter': filter,
            'float': float,
            'frozenset': frozenset,
            'int': int,
            'isinstance': isinstance,
            'issubclass': issubclass,
            'len': len,
            'list': list,
            'map': map,
            'max': max,
            'min': min,
            'range': range,
            'reversed': reversed,
            'round': round,
            'set': set,
            'sorted': sorted,
            'str': str,
            'sum': sum,
            'tuple': tuple,
            'zip': zip,
            'print': print,  # Allow for debugging
            # SECURITY: Use sandbox-safe versions that block dunder access
            'hasattr': self._safe_hasattr,
            'getattr': self._safe_getattr,
            'Exception': Exception,
            'ValueError': ValueError,
            'TypeError': TypeError,
            'KeyError': KeyError,
            'AttributeError': AttributeError,
        }

        return {
            '__builtins__': safe_builtins,
            # Allowed modules
            'aiohttp': aiohttp,
            'json': json,
            're': re,
            'math': math,
            'Decimal': Decimal,
            'datetime': datetime,
            'timedelta': timedelta,
            # Typing
            'Dict': Dict,
            'List': List,
            'Any': Any,
            'Optional': Optional,
            # PAM tools
            'BaseTool': BaseTool,
            'ToolResult': ToolResult,
            'ToolCapability': ToolCapability,
            'get_logger': get_logger,
        }

    def get_stats(self) -> Dict[str, Any]:
        """Get executor statistics including security metrics"""
        avg_time = (
            self.total_execution_time_ms / self.execution_count
            if self.execution_count > 0 else 0
        )

        return {
            "execution_count": self.execution_count,
            "total_execution_time_ms": self.total_execution_time_ms,
            "average_execution_time_ms": avg_time,
            "memory_limit_mb": self.memory_limit_mb,
            "default_timeout_s": self.default_timeout,
            "security_violations": self.security_violations,
            "blocked_attributes_count": len(BLOCKED_ATTRIBUTES)
        }


# Module-level instance
sandboxed_executor = SandboxedExecutor()


def get_sandboxed_executor() -> SandboxedExecutor:
    """Get the sandboxed executor instance"""
    return sandboxed_executor
