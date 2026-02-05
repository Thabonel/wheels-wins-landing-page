#!/usr/bin/env python3
"""
Audit Database Function Usage - Scan PAM tools for database utility calls
Maps current usage patterns to identify signature mismatches
"""

import os
import re
import ast
from typing import Dict, List, Any
from pathlib import Path

def analyze_safe_db_calls(file_path: str) -> List[Dict[str, Any]]:
    """Analyze a Python file for safe_db_* function calls"""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()

        # Parse AST to find function calls
        tree = ast.parse(content)
        calls = []

        class FunctionCallVisitor(ast.NodeVisitor):
            def visit_Call(self, node):
                # Check if it's a safe_db_* function call
                if (hasattr(node.func, 'id') and
                    isinstance(node.func.id, str) and
                    node.func.id.startswith('safe_db_')):

                    call_info = {
                        "function": node.func.id,
                        "file": os.path.relpath(file_path),
                        "line": node.lineno,
                        "positional_args": len(node.args),
                        "keyword_args": {},
                        "raw_call": ast.get_source_segment(content, node) or "Could not extract"
                    }

                    # Extract keyword arguments
                    for keyword in node.keywords:
                        if keyword.arg:  # Skip **kwargs
                            call_info["keyword_args"][keyword.arg] = "..."

                    calls.append(call_info)

                self.generic_visit(node)

        visitor = FunctionCallVisitor()
        visitor.visit(tree)
        return calls

    except Exception as e:
        print(f"Error analyzing {file_path}: {e}")
        return []

def scan_pam_tools():
    """Scan all PAM tools for database function usage"""
    backend_path = Path(__file__).parent / "../../backend"
    tools_path = backend_path / "app/services/pam/tools"

    all_calls = []

    # Find all Python files in tools directory
    for py_file in tools_path.rglob("*.py"):
        if py_file.name == "__init__.py":
            continue

        calls = analyze_safe_db_calls(str(py_file))
        all_calls.extend(calls)

    return all_calls

def main():
    """Main audit function"""
    print("🔍 AUDITING PAM DATABASE FUNCTION USAGE")
    print("=" * 60)

    calls = scan_pam_tools()

    if not calls:
        print("❌ No safe_db_* function calls found")
        return

    # Group by function type
    by_function = {}
    for call in calls:
        func_name = call["function"]
        if func_name not in by_function:
            by_function[func_name] = []
        by_function[func_name].append(call)

    # Analyze each function type
    for func_name, func_calls in by_function.items():
        print(f"\n🔧 {func_name.upper()} CALLS ({len(func_calls)} found)")
        print("-" * 40)

        # Collect unique parameter patterns
        patterns = {}
        for call in func_calls:
            pattern_key = tuple(sorted(call["keyword_args"].keys()))
            if pattern_key not in patterns:
                patterns[pattern_key] = []
            patterns[pattern_key].append(call)

        # Show patterns
        for i, (pattern, examples) in enumerate(patterns.items(), 1):
            print(f"   Pattern {i}: {', '.join(pattern) if pattern else 'positional only'}")
            print(f"   Usage: {len(examples)} calls")

            # Show first example
            example = examples[0]
            print(f"   Example: {example['file']}:{example['line']}")
            print(f"   Raw: {example['raw_call'][:80]}...")
            print()

    # Current function signatures for comparison
    print("\n📋 CURRENT FUNCTION SIGNATURES")
    print("=" * 60)
    print("safe_db_select(table, filters, user_id, select='*', order_by=None, order_desc=False, limit=None)")
    print("safe_db_insert(table, data, user_id)")
    print("safe_db_update(table, record_id, data, user_id, id_column='id')")
    print("safe_db_delete(table, record_id, user_id, id_column='id')")

    # Identify signature mismatches
    print(f"\n⚠️  SIGNATURE MISMATCHES DETECTED")
    print("=" * 60)

    mismatches = []
    for call in calls:
        if call["function"] == "safe_db_select":
            issues = []

            if "columns" in call["keyword_args"]:
                issues.append("Uses 'columns' (should be 'select')")
            if "single" in call["keyword_args"]:
                issues.append("Uses 'single' (not supported)")
            if call["positional_args"] < 3:
                issues.append("Missing user_id parameter")

            if issues:
                mismatches.append({
                    "call": call,
                    "issues": issues
                })

    if mismatches:
        for i, mismatch in enumerate(mismatches, 1):
            call = mismatch["call"]
            print(f"{i}. {call['file']}:{call['line']}")
            for issue in mismatch["issues"]:
                print(f"   ❌ {issue}")
            print()
    else:
        print("✅ No signature mismatches found")

    # Summary
    print(f"\n📊 SUMMARY")
    print("=" * 60)
    print(f"Total function calls found: {len(calls)}")
    print(f"Files with database calls: {len(set(call['file'] for call in calls))}")
    print(f"Signature mismatches: {len(mismatches)}")

    if mismatches:
        print(f"\n💡 RECOMMENDED FIXES:")
        print(f"   1. Add 'columns' parameter alias for 'select' in safe_db_select()")
        print(f"   2. Add 'single' parameter to return single record instead of list")
        print(f"   3. Make user_id parameter optional or fix tool calls")

if __name__ == "__main__":
    main()