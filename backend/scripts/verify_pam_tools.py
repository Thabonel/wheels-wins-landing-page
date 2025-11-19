#!/usr/bin/env python3
"""
PAM Tool Registry Verification Script

Counts registered tools in tool_registry.py and verifies Phase 1 registration.

Usage:
    python backend/scripts/verify_pam_tools.py

Expected Output (Phase 1 Complete):
    - Total tools registered: 17 (6 core + 11 Phase 1)
    - Budget tools: 5
    - Trip tools: 4
    - Calendar tools: 2
"""

import sys
import re
from pathlib import Path
from typing import Dict

# Add backend to path
backend_dir = Path(__file__).parent.parent
sys.path.insert(0, str(backend_dir))


def analyze_tool_registry(file_path: str) -> Dict[str, any]:
    """Analyze tool_registry.py to count registered tools"""

    with open(file_path, 'r') as f:
        content = f.read()

    # Find all tool registrations by searching for function_definition names
    registration_pattern = r'function_definition=\s*\{\s*"name":\s*"([^"]+)"'
    registered_tools = re.findall(registration_pattern, content)

    # Categorize tools by expected Phase 1 tool names
    budget_tools = []
    trip_tools = []
    calendar_tools = []
    core_tools = []
    other_tools = []

    # Define expected Phase 1 tools
    expected_budget = {
        'track_savings', 'analyze_budget', 'compare_vs_budget',
        'predict_end_of_month', 'find_savings_opportunities'
    }
    expected_trip = {
        'find_cheap_gas', 'optimize_route', 'get_road_conditions', 'estimate_travel_time'
    }
    expected_calendar = {
        'update_calendar_event', 'delete_calendar_event'
    }
    core_tool_names = {
        'manage_finances', 'mapbox_navigator', 'weather_advisor',
        'create_calendar_event', 'get_fuel_log', 'search_travel_videos'
    }

    # Categorize each registered tool
    for tool in registered_tools:
        if tool in expected_budget:
            budget_tools.append(tool)
        elif tool in expected_trip:
            trip_tools.append(tool)
        elif tool in expected_calendar:
            calendar_tools.append(tool)
        elif tool in core_tool_names:
            core_tools.append(tool)
        else:
            other_tools.append(tool)

    # Count failed registrations (tools that tried to register but failed)
    failed_pattern = r'logger\.warning\(f"⚠️ Could not register ([^"]+) tool'
    potential_failures = re.findall(failed_pattern, content)

    return {
        'total': len(registered_tools),
        'registered_tools': sorted(registered_tools),
        'budget_tools': sorted(budget_tools),
        'trip_tools': sorted(trip_tools),
        'calendar_tools': sorted(calendar_tools),
        'core_tools': sorted(core_tools),
        'other_tools': sorted(other_tools),
        'potential_failures': sorted(set(potential_failures))
    }


def verify_phase_1_completion(results: Dict[str, any]) -> bool:
    """Verify Phase 1 registration (11 tools: 5 budget + 4 trip + 2 calendar)"""

    expected_budget = 5
    expected_trip = 4
    expected_calendar = 2
    expected_phase_1_total = 11

    budget_count = len(results['budget_tools'])
    trip_count = len(results['trip_tools'])
    calendar_count = len(results['calendar_tools'])
    phase_1_total = budget_count + trip_count + calendar_count

    success = (
        budget_count == expected_budget and
        trip_count == expected_trip and
        calendar_count == expected_calendar
    )

    return success, {
        'expected': {
            'budget': expected_budget,
            'trip': expected_trip,
            'calendar': expected_calendar,
            'total': expected_phase_1_total
        },
        'actual': {
            'budget': budget_count,
            'trip': trip_count,
            'calendar': calendar_count,
            'total': phase_1_total
        }
    }


def print_results(results: Dict[str, any]):
    """Print verification results in readable format"""

    print("=" * 70)
    print("PAM TOOL REGISTRY VERIFICATION")
    print("=" * 70)
    print()

    print(f"📊 TOTAL TOOLS REGISTERED: {results['total']}")
    print()

    print("📋 BREAKDOWN BY CATEGORY:")
    print(f"  • Core tools (already registered): {len(results['core_tools'])}")
    print(f"  • Budget tools (Phase 1): {len(results['budget_tools'])}")
    print(f"  • Trip tools (Phase 1): {len(results['trip_tools'])}")
    print(f"  • Calendar tools (Phase 1): {len(results['calendar_tools'])}")
    if results['other_tools']:
        print(f"  • Other tools: {len(results['other_tools'])}")
    print()

    # Verify Phase 1
    success, comparison = verify_phase_1_completion(results)

    print("✅ PHASE 1 VERIFICATION:")
    print(f"  Expected: {comparison['expected']['budget']} budget + {comparison['expected']['trip']} trip + {comparison['expected']['calendar']} calendar = {comparison['expected']['total']} tools")
    print(f"  Actual:   {comparison['actual']['budget']} budget + {comparison['actual']['trip']} trip + {comparison['actual']['calendar']} calendar = {comparison['actual']['total']} tools")
    print()

    if success:
        print("  ✅ Phase 1 registration COMPLETE!")
    else:
        print("  ❌ Phase 1 registration INCOMPLETE")
        print("     Check for missing tools below")
    print()

    # List all registered tools
    print("🛠️  REGISTERED TOOLS:")

    if results['core_tools']:
        print("\n  Core Tools (6 already registered):")
        for tool in results['core_tools']:
            print(f"    ✓ {tool}")

    if results['budget_tools']:
        print(f"\n  Budget Tools ({len(results['budget_tools'])} Phase 1):")
        for tool in results['budget_tools']:
            print(f"    ✓ {tool}")

    if results['trip_tools']:
        print(f"\n  Trip Tools ({len(results['trip_tools'])} Phase 1):")
        for tool in results['trip_tools']:
            print(f"    ✓ {tool}")

    if results['calendar_tools']:
        print(f"\n  Calendar Tools ({len(results['calendar_tools'])} Phase 1):")
        for tool in results['calendar_tools']:
            print(f"    ✓ {tool}")

    if results['other_tools']:
        print(f"\n  Other Tools ({len(results['other_tools'])}):")
        for tool in results['other_tools']:
            print(f"    ✓ {tool}")

    print()

    # Show potential failures (if any exist)
    if results['potential_failures']:
        print("⚠️  POTENTIAL REGISTRATION FAILURES:")
        for failure in results['potential_failures']:
            print(f"    ! {failure}")
        print()

    print("=" * 70)

    return success


def main():
    """Main verification function"""

    # Find tool_registry.py
    registry_path = backend_dir / "app" / "services" / "pam" / "tools" / "tool_registry.py"

    if not registry_path.exists():
        print(f"❌ ERROR: tool_registry.py not found at {registry_path}")
        sys.exit(1)

    # Analyze registry
    results = analyze_tool_registry(str(registry_path))

    # Print results
    success = print_results(results)

    # Exit with appropriate code
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()
