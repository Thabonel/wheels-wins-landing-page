#!/usr/bin/env python3
"""
PAM Automated Test Execution Script
Cross-platform test runner with JSON reporting for CI/CD
"""

import sys
import subprocess
import argparse
import json
from pathlib import Path
from datetime import datetime
from typing import Dict, Any


def check_pytest_installed() -> bool:
    """Check if pytest is installed"""
    try:
        subprocess.run(
            ["pytest", "--version"],
            capture_output=True,
            check=True
        )
        return True
    except (subprocess.CalledProcessError, FileNotFoundError):
        return False


def run_tests(args: argparse.Namespace) -> Dict[str, Any]:
    """Run pytest tests and return results"""

    # Build pytest command
    cmd = [
        "pytest",
        "app/tests/test_budget_tools.py",
        "app/tests/test_trip_tools.py",
        "app/tests/test_calendar_tools.py",
        "app/tests/test_social_tools.py"
    ]

    # Add markers
    if args.quick:
        cmd.extend(["-m", "critical"])

    # Add verbosity
    if args.verbose:
        cmd.append("-vv")
    else:
        cmd.append("-v")

    # Add coverage
    if args.coverage:
        cmd.extend([
            "--cov=app/services/pam/tools",
            "--cov-report=html",
            "--cov-report=term",
            "--cov-report=json"
        ])

    # Add JSON output for CI/CD
    if args.json:
        cmd.extend(["--json-report", "--json-report-file=test_results.json"])

    # Run tests
    print(f"Running command: {' '.join(cmd)}")
    print()

    start_time = datetime.utcnow()
    result = subprocess.run(cmd, capture_output=False)
    end_time = datetime.utcnow()

    duration_seconds = (end_time - start_time).total_seconds()

    # Build result dict
    test_result = {
        "success": result.returncode == 0,
        "exit_code": result.returncode,
        "duration_seconds": duration_seconds,
        "timestamp": start_time.isoformat(),
        "command": " ".join(cmd)
    }

    # Read coverage if generated
    if args.coverage and Path("coverage.json").exists():
        with open("coverage.json") as f:
            coverage_data = json.load(f)
            test_result["coverage"] = {
                "total_statements": coverage_data["totals"]["num_statements"],
                "covered": coverage_data["totals"]["covered_lines"],
                "missing": coverage_data["totals"]["missing_lines"],
                "percent_covered": coverage_data["totals"]["percent_covered"]
            }

    return test_result


def main():
    """Main entry point"""
    parser = argparse.ArgumentParser(
        description="PAM Automated Test Execution Script"
    )
    parser.add_argument(
        "--quick",
        action="store_true",
        help="Run only critical tests"
    )
    parser.add_argument(
        "--coverage",
        action="store_true",
        help="Generate coverage report"
    )
    parser.add_argument(
        "--verbose",
        action="store_true",
        help="Show detailed output"
    )
    parser.add_argument(
        "--json",
        action="store_true",
        help="Output results as JSON (for CI/CD)"
    )
    parser.add_argument(
        "--output",
        type=str,
        help="Output file for JSON results"
    )

    args = parser.parse_args()

    # Check pytest installation
    if not check_pytest_installed():
        print("❌ Error: pytest is not installed")
        print()
        print("Please install pytest first:")
        print("  pip install pytest pytest-asyncio pytest-cov")
        sys.exit(1)

    # Change to backend directory
    backend_dir = Path(__file__).parent.parent
    import os
    os.chdir(backend_dir)

    print("=== PAM Automated Test Suite ===")
    print()
    print(f"Current directory: {Path.cwd()}")
    print()

    # Run tests
    result = run_tests(args)

    # Output results
    if args.json or args.output:
        output_file = args.output or "test_results.json"
        with open(output_file, "w") as f:
            json.dump(result, f, indent=2)
        print()
        print(f"Results written to: {output_file}")

    # Print summary
    print()
    if result["success"]:
        print("✓ All tests passed!")
        if args.coverage and "coverage" in result:
            print(f"  Coverage: {result['coverage']['percent_covered']:.1f}%")
        sys.exit(0)
    else:
        print("✗ Some tests failed")
        sys.exit(result["exit_code"])


if __name__ == "__main__":
    main()
