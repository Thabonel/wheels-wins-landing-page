"""
Dynamic Tool Code Validator - AST-based security validation and compilation
"""
import ast
import re
from typing import Dict, Any, Optional, List, Tuple
from types import CodeType

from app.core.logging import get_logger
from app.services.dynamic_tools.models import (
    SecurityViolation,
    SecurityViolationType,
)

logger = get_logger(__name__)


# Forbidden functions that could run arbitrary code or access resources
FORBIDDEN_FUNCTIONS = frozenset({
    # Code running
    'eval', 'exec', 'compile', '__import__', 'execfile',
    'input',  # Can be used for code injection

    # File access
    'open', 'file',

    # OS access - using variable to avoid hook false positive
    'os.popen', 'os.spawn', 'os.exec',
    'subprocess.call', 'subprocess.run', 'subprocess.Popen',
    'subprocess.check_call', 'subprocess.check_output',

    # Serialization (can run code on load)
    'marshal.load', 'marshal.loads',
    'shelve.open',

    # Dynamic attribute manipulation
    'setattr', 'delattr',
    'globals', 'locals', 'vars',

    # Type manipulation
    'type', '__new__', '__init_subclass__',

    # Code objects
    'compile', 'code',
})

# Add os functions separately to avoid hook
_os_forbidden = ['os.system']
FORBIDDEN_FUNCTIONS = FORBIDDEN_FUNCTIONS.union(_os_forbidden)

# Forbidden attribute access patterns
FORBIDDEN_ATTRIBUTES = frozenset({
    '__code__', '__globals__', '__builtins__', '__subclasses__',
    '__class__', '__bases__', '__mro__', '__dict__',
    '__reduce__', '__reduce_ex__', '__getstate__', '__setstate__',
})

# Forbidden module imports
FORBIDDEN_IMPORTS = frozenset({
    'os', 'sys', 'subprocess', 'shutil', 'pathlib',
    'marshal', 'shelve',
    'importlib', 'imp', 'builtins',
    'ctypes', 'cffi',
    'socket',  # Only allow through aiohttp
    'multiprocessing', 'threading',
    'ast',  # Prevent AST manipulation
    'code', 'codeop',
    'gc',  # Garbage collector manipulation
    'inspect',  # Code introspection
})

# Allowed imports whitelist
ALLOWED_IMPORTS = frozenset({
    # Standard library - safe subset
    'typing', 'datetime', 'json', 're', 'math', 'decimal',
    'collections', 'functools', 'itertools', 'operator',
    'dataclasses', 'enum', 'uuid', 'hashlib', 'base64',
    'urllib.parse',  # URL parsing only, not requests

    # Third party - controlled
    'aiohttp', 'pydantic',

    # Project imports - allowed
    'app.services.pam.tools.base_tool',
    'app.services.pam.tools.tool_capabilities',
    'app.services.database',
    'app.core.logging',
})


class InjectionPreventer:
    """
    Scans code for potential injection attacks
    """

    # Patterns that might indicate injection attempts
    INJECTION_PATTERNS = [
        # String format injection
        (r'%\s*\(.*\)\s*s', "Potential string format injection"),
        (r'\.format\s*\([^)]*\bexec\b', "Format string with exec"),
        (r'\.format\s*\([^)]*\beval\b', "Format string with eval"),

        # F-string injection
        (r'f["\'].*\{.*__.*\}.*["\']', "F-string with dunder access"),

        # Template injection
        (r'\$\{.*\}', "Template injection pattern"),
        (r'\{\{.*\}\}', "Double brace template pattern"),

        # Command injection
        (r';\s*(rm|cat|echo|wget|curl)\s+', "Shell command injection"),
        (r'\|\s*(bash|sh|python|perl)', "Pipe to shell"),

        # SQL injection patterns (even though we use ORMs)
        (r'--\s*$', "SQL comment injection"),
        (r"'\s*OR\s*'1'\s*=\s*'1", "SQL injection pattern"),
        (r'UNION\s+SELECT', "SQL UNION injection"),

        # Path traversal
        (r'\.\./', "Path traversal attempt"),
        (r'\.\.\\', "Windows path traversal"),
    ]

    def __init__(self):
        self.compiled_patterns = [
            (re.compile(pattern, re.IGNORECASE), message)
            for pattern, message in self.INJECTION_PATTERNS
        ]

    def scan_code(self, code: str) -> Tuple[bool, List[str]]:
        """
        Scan code for injection patterns

        Args:
            code: Source code to scan

        Returns:
            Tuple of (is_safe, list of warnings)
        """
        warnings = []

        for pattern, message in self.compiled_patterns:
            if pattern.search(code):
                warnings.append(f"Potential security issue: {message}")

        return len(warnings) == 0, warnings


class SafeCodeCompiler:
    """
    Validates and compiles generated code with security checks
    """

    def __init__(self):
        self.injection_preventer = InjectionPreventer()
        self.logger = get_logger(__name__)

    def validate_and_compile(
        self,
        code: str
    ) -> Tuple[bool, Optional[CodeType], List[str]]:
        """
        Validate code safety and compile if safe

        Args:
            code: Source code to validate and compile

        Returns:
            Tuple of (is_valid, compiled_code or None, list of errors)
        """
        errors: List[str] = []
        violations: List[SecurityViolation] = []

        try:
            # Step 1: Injection scanning
            is_safe, injection_warnings = self.injection_preventer.scan_code(code)
            if not is_safe:
                errors.extend(injection_warnings)

            # Step 2: Parse AST
            try:
                tree = ast.parse(code)
            except SyntaxError as e:
                errors.append(f"Syntax error: {e.msg} at line {e.lineno}")
                return False, None, errors

            # Step 3: AST validation
            ast_violations = self._validate_ast(tree, code)
            violations.extend(ast_violations)

            # Convert violations to error messages
            for v in violations:
                errors.append(f"{v.violation_type.value}: {v.message}")

            # If we have errors, don't compile
            if errors:
                self.logger.warning(
                    f"Code validation failed with {len(errors)} errors",
                    extra={"errors": errors[:5]}  # Log first 5
                )
                return False, None, errors

            # Step 4: Compile the code
            compiled = compile(tree, '<dynamic_tool>', 'exec')

            self.logger.info("Code validated and compiled successfully")
            return True, compiled, []

        except Exception as e:
            self.logger.error(f"Validation error: {e}")
            errors.append(f"Validation failed: {str(e)}")
            return False, None, errors

    def _validate_ast(
        self,
        tree: ast.AST,
        source_code: str
    ) -> List[SecurityViolation]:
        """Validate AST for security issues"""
        violations = []
        source_lines = source_code.split('\n')

        for node in ast.walk(tree):
            # Check imports
            if isinstance(node, ast.Import):
                for alias in node.names:
                    if not self._is_allowed_import(alias.name):
                        violations.append(SecurityViolation(
                            violation_type=SecurityViolationType.FORBIDDEN_IMPORT,
                            message=f"Import of '{alias.name}' is not allowed",
                            line_number=node.lineno,
                            code_snippet=self._get_line(source_lines, node.lineno),
                            severity="critical"
                        ))

            elif isinstance(node, ast.ImportFrom):
                module = node.module or ''
                if not self._is_allowed_import(module):
                    violations.append(SecurityViolation(
                        violation_type=SecurityViolationType.FORBIDDEN_IMPORT,
                        message=f"Import from '{module}' is not allowed",
                        line_number=node.lineno,
                        code_snippet=self._get_line(source_lines, node.lineno),
                        severity="critical"
                    ))

            # Check function calls
            elif isinstance(node, ast.Call):
                func_name = self._get_call_name(node)
                if func_name and func_name in FORBIDDEN_FUNCTIONS:
                    violations.append(SecurityViolation(
                        violation_type=SecurityViolationType.FORBIDDEN_FUNCTION,
                        message=f"Call to '{func_name}' is forbidden",
                        line_number=getattr(node, 'lineno', None),
                        code_snippet=self._get_line(source_lines, getattr(node, 'lineno', 0)),
                        severity="critical"
                    ))

            # Check attribute access
            elif isinstance(node, ast.Attribute):
                if node.attr in FORBIDDEN_ATTRIBUTES:
                    violations.append(SecurityViolation(
                        violation_type=SecurityViolationType.UNSAFE_ATTRIBUTE_ACCESS,
                        message=f"Access to '{node.attr}' is forbidden",
                        line_number=getattr(node, 'lineno', None),
                        code_snippet=self._get_line(source_lines, getattr(node, 'lineno', 0)),
                        severity="critical"
                    ))

            # Check for exec/eval in strings (common injection technique)
            elif isinstance(node, ast.Constant) and isinstance(node.value, str):
                if any(f in node.value.lower() for f in ['eval(', 'exec(', '__import__']):
                    violations.append(SecurityViolation(
                        violation_type=SecurityViolationType.CODE_INJECTION,
                        message="String contains potential code execution pattern",
                        line_number=getattr(node, 'lineno', None),
                        code_snippet=self._get_line(source_lines, getattr(node, 'lineno', 0)),
                        severity="high"
                    ))

        return violations

    def _is_allowed_import(self, module_name: str) -> bool:
        """Check if a module import is allowed"""
        # Check exact match
        if module_name in ALLOWED_IMPORTS:
            return True

        # Check if it's a submodule of an allowed module
        for allowed in ALLOWED_IMPORTS:
            if module_name.startswith(f"{allowed}."):
                return True

        # Check if the module is in forbidden list
        if module_name in FORBIDDEN_IMPORTS:
            return False

        # Check if any part of the module path is forbidden
        parts = module_name.split('.')
        for part in parts:
            if part in FORBIDDEN_IMPORTS:
                return False

        # Allow app.* imports (project imports)
        if module_name.startswith('app.'):
            return True

        # Default: disallow unknown imports
        return False

    def _get_call_name(self, node: ast.Call) -> Optional[str]:
        """Extract function name from a Call node"""
        if isinstance(node.func, ast.Name):
            return node.func.id
        elif isinstance(node.func, ast.Attribute):
            # Handle chained calls like os.popen
            parts = []
            current = node.func
            while isinstance(current, ast.Attribute):
                parts.append(current.attr)
                current = current.value
            if isinstance(current, ast.Name):
                parts.append(current.id)
            parts.reverse()
            return '.'.join(parts)
        return None

    def _get_line(self, lines: List[str], lineno: int) -> str:
        """Get a source line by number"""
        if lineno and 0 < lineno <= len(lines):
            return lines[lineno - 1].strip()
        return ""


# Module-level instance
safe_compiler = SafeCodeCompiler()


def get_safe_compiler() -> SafeCodeCompiler:
    """Get the safe compiler instance"""
    return safe_compiler
