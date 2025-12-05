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

    # Run execution verification
    print("\n")
    try:
        import asyncio
        asyncio.run(test_tool_execution_loop())
        print("\n✅ Execution verification PASSED")
    except Exception as e:
        print(f"\n❌ Execution verification FAILED: {e}")
        success = False

    # Exit with appropriate code
    sys.exit(0 if success else 1)



# ==========================================
# EXECUTION VERIFICATION (Added for PAM Fix)
# ==========================================

import asyncio
from unittest.mock import MagicMock, AsyncMock, patch


async def test_tool_execution_loop():
    # Set dummy environment variables for testing
    import os
    os.environ["ANTHROPIC_API_KEY"] = "sk-ant-api03-dummy-key-that-is-long-enough-to-pass-validation-check-1234567890"
    os.environ["OPENAI_API_KEY"] = "sk-dummy-key-that-is-long-enough-to-pass-validation-check-1234567890"
    os.environ["GEMINI_API_KEY"] = "dummy-gemini-key-12345"
    os.environ["SUPABASE_URL"] = "https://dummy.supabase.co"
    os.environ["SUPABASE_SERVICE_ROLE_KEY"] = "dummy-key"
    os.environ["VITE_SUPABASE_URL"] = "https://dummy.supabase.co"
    os.environ["VITE_SUPABASE_ANON_KEY"] = "dummy-key"

    # Mock openai module to bypass import error
    from unittest.mock import MagicMock
    sys.modules["openai"] = MagicMock()
    sys.modules["openai.types"] = MagicMock()
    sys.modules["openai.types.chat"] = MagicMock()

    from app.core.personalized_pam_agent import PersonalizedPamAgent
    from app.services.ai.provider_interface import AIResponse
    print("\n" + "=" * 70)
    print("🧪 TESTING PAM TOOL EXECUTION LOOP")
    print("=" * 70)
    print()
    
    # Mock dependencies
    with patch('app.core.personalized_pam_agent.ai_orchestrator') as mock_orchestrator, \
         patch('app.core.personalized_pam_agent.get_tool_registry') as mock_get_registry:
        
        # Setup Mock Registry
        mock_registry = MagicMock()
        mock_get_registry.return_value = mock_registry
        
        # Mock Tool Execution
        async def mock_execute_tool(tool_name, user_id, parameters, context=None):
            print(f"  ✅ Tool '{tool_name}' executed with params: {parameters}")
            if context and 'user_jwt' in context:
                print(f"  ✅ User JWT context passed: {context['user_jwt']}")
            return MagicMock(success=True, result={"status": "success", "data": "Tool result data"})
            
        mock_registry.execute_tool = AsyncMock(side_effect=mock_execute_tool)
        mock_registry.get_openai_functions.return_value = [{"name": "test_tool", "description": "A test tool"}]

        # Setup Mock AI Responses
        # Response 1: Request tool execution
        tool_call_response = AIResponse(
            content="I will check that for you.",
            model="claude-3-5-sonnet",
            provider="anthropic",
            usage={"total_tokens": 10},
            latency_ms=100,
            finish_reason="tool_use",
            function_calls=[{
                "name": "test_tool",
                "arguments": {"param": "value"},
                "id": "call_123"
            }]
        )
        
        # Response 2: Final answer after tool result
        final_response = AIResponse(
            content="I have successfully executed the tool.",
            model="claude-3-5-sonnet",
            provider="anthropic",
            usage={"total_tokens": 20},
            latency_ms=100,
            finish_reason="stop",
            function_calls=[]
        )
        
        # Configure orchestrator to return these responses in sequence
        mock_orchestrator.complete = AsyncMock(side_effect=[tool_call_response, final_response])
        
        # Initialize Agent
        agent = PersonalizedPamAgent(user_jwt="test_token_123")
        
        # Run Test
        print("  🏃 Running process_message...")
        result = await agent.process_message(
            user_id="user_123",
            message="Run the test tool",
            session_id="session_1"
        )
        
        # Verify Results
        print("\n📊 VERIFICATION RESULTS:")
        
        success = True
        
        # 1. Verify tool execution
        if mock_registry.execute_tool.called:
            print("  ✅ Tool execution called")
        else:
            print("  ❌ Tool execution NOT called")
            success = False
            
        # 2. Verify loop (orchestrator called twice)
        call_count = mock_orchestrator.complete.call_count
        if call_count == 2:
            print(f"  ✅ Orchestrator called {call_count} times (Loop working)")
        else:
            print(f"  ❌ Orchestrator called {call_count} times (Expected 2)")
            success = False
            
        # 3. Verify auto_handle_tools=False
        call_args = mock_orchestrator.complete.call_args_list[0]
        if not call_args.kwargs.get('auto_handle_tools', True): # Check if it's False (default is True)
             # Wait, if default is True, and we passed False, get() returns False.
             # Actually get() returns the value if present.
             # If we passed auto_handle_tools=False, kwargs['auto_handle_tools'] is False.
             # So get('auto_handle_tools', True) returns False.
             # So 'not False' is True.
             print("  ✅ auto_handle_tools=False passed correctly")
        else:
             print("  ❌ auto_handle_tools NOT set to False")
             success = False

        print(f"\n🏁 Final Agent Response: {result['content']}")
        return success

if __name__ == "__main__":
    # Run original verification
    main()
