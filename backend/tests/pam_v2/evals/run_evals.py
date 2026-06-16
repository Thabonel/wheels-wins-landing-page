#!/usr/bin/env python3
"""
Pam V2 evaluation runner.

PRD 01 phase: validates the fixture file format and schema. Once the V2 text
runtime exists (PRD 03), this runner will execute each fixture against the
runtime and assert expected event sequences.
"""

from __future__ import annotations

import json
import sys
from pathlib import Path
from typing import Any, Dict, List

# Add backend root to path when running this script directly.
BACKEND_ROOT = Path(__file__).parents[3]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from app.models.schemas.pam_v2 import (
    PamTurnRequestV2,
    PAM_V2_SCHEMA_VERSION,
)


FIXTURE_PATH = Path(__file__).parent / "fixtures" / "turn_contract_evals.json"


class EvalResult:
    def __init__(self, fixture_id: str, name: str, passed: bool, errors: List[str]):
        self.fixture_id = fixture_id
        self.name = name
        self.passed = passed
        self.errors = errors


def load_fixtures(path: Path = FIXTURE_PATH) -> Dict[str, Any]:
    with path.open("r", encoding="utf-8") as f:
        return json.load(f)


def validate_fixture(fixture: Dict[str, Any]) -> List[str]:
    errors: List[str] = []

    required_keys = {"id", "name", "description", "request", "expected_event_types"}
    missing = required_keys - set(fixture.keys())
    if missing:
        errors.append(f"Missing keys: {sorted(missing)}")
        return errors

    valid_events = {
        "turn_started",
        "text_delta",
        "tool_started",
        "tool_completed",
        "approval_required",
        "action",
        "turn_completed",
        "error",
    }
    for event in fixture["expected_event_types"]:
        if event not in valid_events:
            errors.append(f"Invalid event type: {event}")

    expects_error = fixture.get("expects_error", False)

    try:
        PamTurnRequestV2(**fixture["request"])
        request_valid = True
    except Exception as exc:
        request_valid = False
        if not expects_error:
            errors.append(f"Invalid request: {exc}")

    if expects_error and request_valid:
        errors.append("Expected request to be rejected but it was accepted")

    return errors


def run_evaluations(path: Path = FIXTURE_PATH) -> List[EvalResult]:
    data = load_fixtures(path)

    if data.get("version") != PAM_V2_SCHEMA_VERSION:
        print(
            f"Warning: fixture version {data.get('version')} != "
            f"schema version {PAM_V2_SCHEMA_VERSION}",
            file=sys.stderr,
        )

    results: List[EvalResult] = []
    for fixture in data.get("fixtures", []):
        errors = validate_fixture(fixture)
        results.append(
            EvalResult(
                fixture_id=fixture.get("id", "unknown"),
                name=fixture.get("name", "unknown"),
                passed=len(errors) == 0,
                errors=errors,
            )
        )

    return results


def print_report(results: List[EvalResult]) -> int:
    passed = sum(1 for r in results if r.passed)
    failed = len(results) - passed

    print(f"Pam V2 Contract Evaluation Report")
    print(f"Total: {len(results)} | Passed: {passed} | Failed: {failed}")
    print("-" * 60)

    for result in results:
        status = "PASS" if result.passed else "FAIL"
        print(f"[{status}] {result.fixture_id}: {result.name}")
        for error in result.errors:
            print(f"       - {error}")

    return 0 if failed == 0 else 1


def main() -> int:
    results = run_evaluations()
    return print_report(results)


if __name__ == "__main__":
    sys.exit(main())
