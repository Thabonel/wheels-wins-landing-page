#!/usr/bin/env python3
"""
Manual verification script for PAM calendar integration.
This script verifies the calendar tool is properly integrated into PAM.
"""

import sys
import os
import traceback
from typing import Dict, Any

# Add the app directory to Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'app'))

def verify_calendar_tool_import():
    """Verify the calendar tool can be imported."""
    try:
        # Test import of the calendar tool
        from app.services.pam.tools.get_calendar_events import GetCalendarEventsTool
        print("✅ GetCalendarEventsTool import successful")

        # Test tool instantiation
        tool = GetCalendarEventsTool()
        print("✅ GetCalendarEventsTool instantiation successful")

        # Check tool properties
        print(f"   Tool name: {tool.tool_name}")
        print(f"   Tool description: {tool.description}")
        print(f"   Tool capabilities: {tool.capabilities}")

        return True
    except Exception as e:
        print(f"❌ Calendar tool import failed: {e}")
        traceback.print_exc()
        return False

async def verify_tool_registry_includes_calendar():
    """Verify the tool registry includes the calendar tool."""
    try:
        # Test tool registry initialization
        from app.services.pam.tools.tool_registry import initialize_tool_registry, get_tool_registry

        print("🔄 Initializing tool registry...")
        # Initialize the registry properly
        await initialize_tool_registry()

        registry = get_tool_registry()
        print("✅ Tool registry initialization successful")

        # Check if calendar tool is registered
        if 'get_calendar_events' in registry.tools:
            print("✅ get_calendar_events tool found in registry")

            # Check tool definition
            if 'get_calendar_events' in registry.tool_definitions:
                definition = registry.tool_definitions['get_calendar_events']
                print(f"   Tool enabled: {definition.enabled}")
                print(f"   Tool capabilities: {definition.capabilities}")
                print("✅ Calendar tool definition found")
            else:
                print("❌ Calendar tool definition not found")
                return False
        else:
            print("❌ get_calendar_events tool not found in registry")
            available_tools = list(registry.tools.keys())
            print(f"Available tools: {available_tools}")
            return False

        return True
    except Exception as e:
        print(f"❌ Tool registry verification failed: {e}")
        traceback.print_exc()
        return False

def verify_tool_prefilter_includes_calendar():
    """Verify the tool prefilter includes calendar tools."""
    try:
        from app.services.pam.tools.tool_prefilter import ToolPrefilter

        # Access class attributes
        CORE_TOOLS = ToolPrefilter.CORE_TOOLS
        TOOL_DOMAIN_MAPPING = ToolPrefilter.TOOL_DOMAIN_MAPPING
        DOMAIN_KEYWORDS = ToolPrefilter.DOMAIN_KEYWORDS

        # Check if get_calendar_events is in CORE_TOOLS
        if 'get_calendar_events' in CORE_TOOLS:
            print("✅ get_calendar_events found in CORE_TOOLS")
        else:
            print("❌ get_calendar_events not found in CORE_TOOLS")
            return False

        # Check if get_calendar_events is in TOOL_DOMAIN_MAPPING
        if 'get_calendar_events' in TOOL_DOMAIN_MAPPING:
            domain = TOOL_DOMAIN_MAPPING['get_calendar_events']
            print(f"✅ get_calendar_events mapped to domain: {domain}")
        else:
            print("❌ get_calendar_events not found in TOOL_DOMAIN_MAPPING")
            return False

        # Check calendar domain keywords
        if 'calendar' in DOMAIN_KEYWORDS:
            keywords = DOMAIN_KEYWORDS['calendar']
            print(f"✅ Calendar domain has {len(keywords)} keywords")
        else:
            print("❌ Calendar domain not found in DOMAIN_KEYWORDS")
            return False

        return True
    except Exception as e:
        print(f"❌ Tool prefilter verification failed: {e}")
        traceback.print_exc()
        return False

async def verify_calendar_tool_schema():
    """Verify the calendar tool has correct schema."""
    try:
        from app.services.pam.tools.tool_registry import get_tool_registry, initialize_tool_registry

        # Ensure registry is initialized
        await initialize_tool_registry()
        registry = get_tool_registry()

        # Get tool schema
        functions = registry.get_openai_functions()

        # Find calendar function
        calendar_function = None
        for func in functions:
            if func.get('name') == 'get_calendar_events':
                calendar_function = func
                break

        if calendar_function:
            print("✅ Calendar tool function definition found")
            print(f"   Function name: {calendar_function.get('name')}")
            print(f"   Function description: {calendar_function.get('description')}")

            # Check parameters
            parameters = calendar_function.get('parameters', {})
            properties = parameters.get('properties', {})
            print(f"   Parameters: {list(properties.keys())}")

            # Verify expected parameters exist
            expected_params = ['start_date', 'end_date', 'event_type', 'include_past', 'limit']
            for param in expected_params:
                if param in properties:
                    print(f"   ✅ Parameter {param} found")
                else:
                    print(f"   ❌ Parameter {param} missing")

            return True
        else:
            print("❌ Calendar tool function definition not found")
            available_functions = [f.get('name') for f in functions]
            print(f"Available functions: {available_functions}")
            return False

    except Exception as e:
        print(f"❌ Calendar tool schema verification failed: {e}")
        traceback.print_exc()
        return False

async def main():
    """Run all verification checks."""
    print("🔍 PAM Calendar Integration Manual Verification")
    print("=" * 50)

    # Set up minimal environment variables to avoid import errors
    os.environ.setdefault('DATABASE_URL', 'postgresql://localhost/test')
    os.environ.setdefault('SUPABASE_SERVICE_ROLE_KEY', 'test')

    all_passed = True

    print("\n1. Testing Calendar Tool Import...")
    if not verify_calendar_tool_import():
        all_passed = False

    print("\n2. Testing Tool Registry Integration...")
    if not await verify_tool_registry_includes_calendar():
        all_passed = False

    print("\n3. Testing Tool Prefilter Integration...")
    if not verify_tool_prefilter_includes_calendar():
        all_passed = False

    print("\n4. Testing Calendar Tool Schema...")
    if not await verify_calendar_tool_schema():
        all_passed = False

    print("\n" + "=" * 50)
    if all_passed:
        print("🎉 All manual verification checks PASSED!")
        print("✅ PAM Calendar integration is ready for deployment")
    else:
        print("❌ Some verification checks FAILED!")
        print("⚠️ Issues must be fixed before deployment")

    print("\nNext steps:")
    print("- Start backend server: uvicorn app.main:app --reload --port 8000")
    print("- Test WebSocket endpoint: ws://localhost:8000/api/v1/pam/ws/{user_id}")
    print("- Send calendar query: 'What's on my calendar today?'")

    return all_passed

if __name__ == "__main__":
    import asyncio
    success = asyncio.run(main())
    sys.exit(0 if success else 1)