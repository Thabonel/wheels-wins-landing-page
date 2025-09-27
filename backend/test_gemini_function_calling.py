#!/usr/bin/env python3
"""
Test script for Gemini function calling implementation
"""

import asyncio
import sys
import os

# Add the backend directory to Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '.'))

from app.services.ai.gemini_function_calling import get_gemini_function_handler


def test_openai_to_gemini_conversion():
    """Test converting OpenAI tools to Gemini format"""
    print("🧪 Testing OpenAI to Gemini tool conversion...")

    # Sample OpenAI tools
    openai_tools = [
        {
            "name": "get_weather",
            "description": "Get current weather for a location",
            "parameters": {
                "type": "object",
                "properties": {
                    "location": {
                        "type": "string",
                        "description": "Location name or coordinates"
                    },
                    "units": {
                        "type": "string",
                        "enum": ["metric", "imperial"],
                        "description": "Temperature units"
                    }
                },
                "required": ["location"]
            }
        },
        {
            "name": "manage_finances",
            "description": "Manage expenses and budgets",
            "parameters": {
                "type": "object",
                "properties": {
                    "action": {
                        "type": "string",
                        "enum": ["log_expense", "get_budget", "analyze_spending"],
                        "description": "Financial action to perform"
                    },
                    "amount": {
                        "type": "number",
                        "minimum": 0,
                        "description": "Amount in dollars"
                    },
                    "category": {
                        "type": "string",
                        "description": "Expense category"
                    }
                },
                "required": ["action"]
            }
        }
    ]

    try:
        # Initialize handler
        handler = get_gemini_function_handler()
        print("✅ Handler initialized successfully")

        # Convert tools
        gemini_tools = handler.convert_openai_tools_to_gemini(openai_tools)
        print(f"✅ Converted {len(openai_tools)} OpenAI tools to {len(gemini_tools)} Gemini tools")

        # Inspect the conversion
        if gemini_tools:
            tool = gemini_tools[0]
            print(f"✅ First tool has {len(tool.function_declarations)} function declarations")

            for func_decl in tool.function_declarations:
                print(f"   - Function: {func_decl.name}")
                print(f"     Description: {func_decl.description}")
                print(f"     Parameters: {func_decl.parameters}")

        return True

    except Exception as e:
        print(f"❌ Test failed: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_function_call_extraction():
    """Test extracting function calls from mock Gemini response"""
    print("\n🧪 Testing function call extraction...")

    try:
        handler = get_gemini_function_handler()

        # Create a mock response object
        class MockPart:
            def __init__(self, name, args):
                self.function_call = MockFunctionCall(name, args)

        class MockFunctionCall:
            def __init__(self, name, args):
                self.name = name
                self.args = args

        class MockContent:
            def __init__(self, parts):
                self.parts = parts

        class MockCandidate:
            def __init__(self, content):
                self.content = content

        class MockResponse:
            def __init__(self, candidates):
                self.candidates = candidates

        # Create mock response with function call
        mock_part = MockPart("get_weather", {"location": "Sydney", "units": "metric"})
        mock_content = MockContent([mock_part])
        mock_candidate = MockCandidate(mock_content)
        mock_response = MockResponse([mock_candidate])

        # Extract function calls
        function_calls = handler.extract_function_calls(mock_response)
        print(f"✅ Extracted {len(function_calls)} function calls")

        for call in function_calls:
            print(f"   - Function: {call['name']}")
            print(f"     Arguments: {call['arguments']}")

        return True

    except Exception as e:
        print(f"❌ Test failed: {e}")
        import traceback
        traceback.print_exc()
        return False


async def main():
    """Run all tests"""
    print("🚀 Starting Gemini Function Calling Tests...\n")

    tests = [
        test_openai_to_gemini_conversion,
        test_function_call_extraction,
    ]

    passed = 0
    total = len(tests)

    for test in tests:
        if test():
            passed += 1
            print("✅ PASSED\n")
        else:
            print("❌ FAILED\n")

    print(f"📊 Test Results: {passed}/{total} tests passed")

    if passed == total:
        print("🎉 All tests passed! Gemini function calling is working.")
        return True
    else:
        print("💥 Some tests failed. Check the implementation.")
        return False


if __name__ == "__main__":
    success = asyncio.run(main())
    sys.exit(0 if success else 1)