"""PAM Tool Consistency Tests

Ensures schemas, execution functions, and prefilter categories stay in sync.
Catches disconnections like missing tool_functions entries or orphan schemas.
"""
import sys
import os
import re

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', 'backend'))

os.environ.setdefault("ENVIRONMENT", "test")
os.environ.setdefault("SUPABASE_URL", "https://test.supabase.co")
os.environ.setdefault("SUPABASE_SERVICE_ROLE_KEY", "test-key")
os.environ.setdefault("ANTHROPIC_API_KEY", "test-key")
os.environ.setdefault("GEMINI_API_KEY", "test-key")
os.environ.setdefault("VITE_SUPABASE_URL", "https://test.supabase.co")

BACKEND_DIR = os.path.join(os.path.dirname(__file__), '..', '..', 'backend')

PAM_PY = os.path.join(
    BACKEND_DIR, 'app', 'services', 'pam', 'core', 'pam.py'
)

TOOLS_DIR = os.path.join(
    BACKEND_DIR, 'app', 'services', 'pam', 'tools'
)

PREFILTER_PY = os.path.join(TOOLS_DIR, 'tool_prefilter.py')


def _read_pam_py() -> str:
    with open(PAM_PY, 'r') as f:
        return f.read()


def _extract_schema_tool_names() -> set:
    """Extract tool names defined in schema blocks via "name": "tool_name" patterns."""
    content = _read_pam_py()
    names = set()
    for match in re.finditer(r'"name":\s*"([a-z_]+)"', content):
        name = match.group(1)
        if name not in {"type", "object", "string", "integer", "boolean", "array"}:
            names.add(name)
    return names


def _extract_tool_functions_keys() -> set:
    """Extract keys from the tool_functions dict."""
    content = _read_pam_py()
    match = re.search(r'tool_functions\s*=\s*\{(.*?)\}', content, re.DOTALL)
    if not match:
        return set()
    block = match.group(1)
    return set(re.findall(r'"([a-z_]+)":', block))


def _get_prefilter_tool_category_keys() -> set:
    """Extract dict keys (tool names) from TOOL_CATEGORIES, ignoring values (category names)."""
    with open(PREFILTER_PY, 'r') as f:
        content = f.read()
    match = re.search(r'TOOL_CATEGORIES\s*=\s*\{(.*?)\}', content, re.DOTALL)
    if not match:
        return set()
    block = match.group(1)
    # Match only dict keys - the quoted string before ":"
    return set(re.findall(r'"([a-z_]+)"\s*:', block))


def _get_prefilter_core_tools() -> set:
    """Extract tool names from CORE_TOOLS set."""
    with open(PREFILTER_PY, 'r') as f:
        content = f.read()
    match = re.search(r'CORE_TOOLS\s*=\s*\{(.*?)\}', content, re.DOTALL)
    if not match:
        return set()
    block = match.group(1)
    return set(re.findall(r'"([a-z_]+)"', block))


def test_every_schema_tool_has_function():
    """Every tool in schema must have a matching entry in tool_functions."""
    schema_names = _extract_schema_tool_names()
    function_keys = _extract_tool_functions_keys()

    missing = schema_names - function_keys
    assert not missing, (
        f"Tools in schema but NOT in tool_functions (will silently fail): {sorted(missing)}"
    )


def test_no_orphan_functions():
    """Every entry in tool_functions must have a corresponding schema."""
    schema_names = _extract_schema_tool_names()
    function_keys = _extract_tool_functions_keys()

    orphans = function_keys - schema_names
    assert not orphans, (
        f"Tools in tool_functions but NOT in schema (dead code): {sorted(orphans)}"
    )


def test_prefilter_covers_all_schema_tools():
    """Every schema tool must be in TOOL_CATEGORIES or CORE_TOOLS."""
    schema_names = _extract_schema_tool_names()
    category_tools = _get_prefilter_tool_category_keys()
    core_tools = _get_prefilter_core_tools()

    covered = category_tools | core_tools
    uncovered = schema_names - covered

    assert not uncovered, (
        f"Tools not in prefilter TOOL_CATEGORIES or CORE_TOOLS "
        f"(won't be offered for text requests): {sorted(uncovered)}"
    )


def test_no_direct_client_creation_in_tools():
    """No tool file should use create_client() directly."""
    violations = []

    for root, dirs, files in os.walk(TOOLS_DIR):
        dirs[:] = [d for d in dirs if d != '__pycache__']
        for fname in files:
            if not fname.endswith('.py'):
                continue
            filepath = os.path.join(root, fname)
            with open(filepath, 'r') as f:
                content = f.read()

            if 'create_client(' in content and 'supabase' in content.lower():
                rel_path = os.path.relpath(filepath, TOOLS_DIR)
                violations.append(rel_path)

    assert not violations, (
        f"Tool files using direct create_client() instead of get_supabase_client(): "
        f"{violations}"
    )


def test_schema_and_functions_counts_match():
    """Schema count and function count should be equal."""
    schema_names = _extract_schema_tool_names()
    function_keys = _extract_tool_functions_keys()

    assert len(schema_names) == len(function_keys), (
        f"Schema has {len(schema_names)} tools, tool_functions has {len(function_keys)}. "
        f"Schema-only: {sorted(schema_names - function_keys)}, "
        f"Functions-only: {sorted(function_keys - schema_names)}"
    )
