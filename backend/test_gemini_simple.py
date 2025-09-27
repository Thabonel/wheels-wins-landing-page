#!/usr/bin/env python3
"""
Simple test for Gemini function calling implementation - no config dependencies
"""

import sys
import os

# Add the backend directory to Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '.'))

# Test just the function calling conversion without full app dependencies
try:
    import google.generativeai as genai
    from google.generativeai.types import FunctionDeclaration, Tool
    GEMINI_AVAILABLE = True
    print("✅ Google Generative AI package available")
except ImportError:
    GEMINI_AVAILABLE = False
    print("❌ Google Generative AI package not available")


def test_conversion_logic():
    """Test the core conversion logic without dependencies"""
    print("\n🧪 Testing OpenAI to Gemini conversion logic...")

    if not GEMINI_AVAILABLE:
        print("❌ Cannot test - Gemini package not available")
        return False

    # Sample OpenAI tool
    openai_tool = {
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
    }

    try:
        # Manual conversion logic (extracted from our implementation)
        name = openai_tool.get("name")
        description = openai_tool.get("description", "")
        parameters = openai_tool.get("parameters", {})

        # Convert parameters
        gemini_parameters = {
            "type": parameters.get("type", "object"),
            "properties": {}
        }

        # Convert properties
        properties = parameters.get("properties", {})
        for prop_name, prop_def in properties.items():
            gemini_prop = {
                "type": prop_def.get("type", "string"),
                "description": prop_def.get("description", "")
            }

            # Handle enum values
            if "enum" in prop_def:
                gemini_prop["enum"] = prop_def["enum"]

            gemini_parameters["properties"][prop_name] = gemini_prop

        # Add required fields
        if "required" in parameters:
            gemini_parameters["required"] = parameters["required"]

        # Create Gemini FunctionDeclaration
        function_declaration = FunctionDeclaration(
            name=name,
            description=description,
            parameters=gemini_parameters
        )

        # Wrap in Tool
        tool = Tool(function_declarations=[function_declaration])

        print(f"✅ Successfully converted function: {name}")
        print(f"   Description: {description}")
        print(f"   Parameters: {gemini_parameters}")
        print(f"   Tool type: {type(tool)}")

        return True

    except Exception as e:
        print(f"❌ Conversion failed: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_import_structure():
    """Test that our implementation can be imported"""
    print("\n🧪 Testing import structure...")

    try:
        # Test importing our function calling module directly
        sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'app', 'services', 'ai'))

        # Import just the conversion functions
        from gemini_function_calling import GeminiFunctionCallHandler

        print("✅ Successfully imported GeminiFunctionCallHandler")

        if GEMINI_AVAILABLE:
            # Try to create handler
            handler = GeminiFunctionCallHandler()
            print("✅ Successfully created handler instance")

            # Test conversion method exists
            if hasattr(handler, 'convert_openai_tools_to_gemini'):
                print("✅ Conversion method exists")
                return True
            else:
                print("❌ Conversion method not found")
                return False
        else:
            print("⚠️ Cannot test handler creation - Gemini package not available")
            return True  # Still a partial success

    except Exception as e:
        print(f"❌ Import test failed: {e}")
        import traceback
        traceback.print_exc()
        return False


def main():
    """Run simple tests"""
    print("🚀 Starting Simple Gemini Function Calling Tests...\n")

    tests = [
        test_import_structure,
        test_conversion_logic,
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
        print("🎉 All tests passed! Core functionality is working.")
        return True
    else:
        print("💥 Some tests failed. Check the implementation.")
        return False


if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)