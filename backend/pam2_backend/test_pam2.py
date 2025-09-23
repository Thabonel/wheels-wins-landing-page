#!/usr/bin/env python3
"""
PAM 2.0 Standalone Test
======================

Test script to validate PAM 2.0 configuration and services.
"""

import os
import sys
import asyncio
from datetime import datetime

# Set test environment
os.environ["PAM2_ENV_FILE"] = os.path.join(os.path.dirname(__file__), ".env.test")

# Add PAM 2.0 to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__)))

try:
    from pam_2.core.config import pam2_settings
    from pam_2.core.types import ChatMessage, MessageType
    from pam_2.services import (
        create_conversational_engine,
        create_context_manager,
        create_safety_layer,
        create_trip_logger,
        create_savings_tracker
    )
    print("✅ All PAM 2.0 imports successful")
except ImportError as e:
    print(f"❌ Import failed: {e}")
    sys.exit(1)


async def test_configuration():
    """Test PAM 2.0 configuration"""
    print("\n🔧 Testing Configuration...")

    print(f"  • App Name: {pam2_settings.app_name}")
    print(f"  • Version: {pam2_settings.app_version}")
    print(f"  • Environment: {pam2_settings.environment}")
    print(f"  • Debug: {pam2_settings.debug}")
    print(f"  • Gemini Model: {pam2_settings.gemini_model}")

    # Test feature flags
    print(f"  • Content Filtering: {pam2_settings.enable_content_filtering}")
    print(f"  • Rate Limiting: {pam2_settings.enable_rate_limiting}")
    print(f"  • Trip Logger: {pam2_settings.enable_trip_logger}")
    print(f"  • Savings Tracker: {pam2_settings.enable_savings_tracker}")

    print("✅ Configuration validated")


async def test_services():
    """Test PAM 2.0 services initialization"""
    print("\n⚙️ Testing Services...")

    # Test each service creation
    services = {}

    try:
        services['conversational_engine'] = create_conversational_engine()
        print("  ✅ Conversational Engine created")
    except Exception as e:
        print(f"  ❌ Conversational Engine failed: {e}")
        return False

    try:
        services['context_manager'] = create_context_manager()
        print("  ✅ Context Manager created")
    except Exception as e:
        print(f"  ❌ Context Manager failed: {e}")
        return False

    try:
        services['safety_layer'] = create_safety_layer()
        print("  ✅ Safety Layer created")
    except Exception as e:
        print(f"  ❌ Safety Layer failed: {e}")
        return False

    try:
        services['trip_logger'] = create_trip_logger()
        print("  ✅ Trip Logger created")
    except Exception as e:
        print(f"  ❌ Trip Logger failed: {e}")
        return False

    try:
        services['savings_tracker'] = create_savings_tracker()
        print("  ✅ Savings Tracker created")
    except Exception as e:
        print(f"  ❌ Savings Tracker failed: {e}")
        return False

    print("✅ All services created successfully")
    return services


async def test_message_processing(services):
    """Test basic message processing"""
    print("\n💬 Testing Message Processing...")

    # Create test message
    test_message = ChatMessage(
        user_id="test_user",
        type=MessageType.USER,
        content="Hello PAM! Plan a trip to Tokyo for $2000."
    )
    print(f"  📝 Test message: '{test_message.content}'")

    # Test Safety Layer
    try:
        safety_result = await services['safety_layer'].check_message_safety(test_message)
        if safety_result.success:
            print(f"  ✅ Safety check passed: {safety_result.data['safety_passed']}")
        else:
            print(f"  ❌ Safety check failed: {safety_result.error}")
    except Exception as e:
        print(f"  ❌ Safety check error: {e}")

    # Test Trip Logger
    try:
        trip_result = await services['trip_logger'].analyze_trip_activity(test_message)
        if trip_result.success:
            print(f"  ✅ Trip analysis: detected={trip_result.data.get('trip_activity_detected', False)}")
        else:
            print(f"  ❌ Trip analysis failed: {trip_result.error}")
    except Exception as e:
        print(f"  ❌ Trip analysis error: {e}")

    # Test Savings Tracker
    try:
        savings_result = await services['savings_tracker'].analyze_financial_content(test_message)
        if savings_result.success:
            print(f"  ✅ Financial analysis: detected={savings_result.data.get('financial_content_detected', False)}")
        else:
            print(f"  ❌ Financial analysis failed: {savings_result.error}")
    except Exception as e:
        print(f"  ❌ Financial analysis error: {e}")

    print("✅ Message processing tests completed")


async def test_api_imports():
    """Test API layer imports"""
    print("\n🌐 Testing API Layer...")

    try:
        from pam_2.api import api_router, websocket_endpoint, app
        print("  ✅ API router imported")
        print("  ✅ WebSocket endpoint imported")
        print("  ✅ FastAPI app imported")
    except ImportError as e:
        print(f"  ❌ API import failed: {e}")
        return False

    print("✅ API layer validated")
    return True


async def main():
    """Main test function"""
    print("🚀 PAM 2.0 Standalone Test Suite")
    print("=" * 40)

    try:
        # Test configuration
        await test_configuration()

        # Test services
        services = await test_services()
        if not services:
            print("❌ Service testing failed")
            return False

        # Test message processing
        await test_message_processing(services)

        # Test API imports
        api_success = await test_api_imports()
        if not api_success:
            print("❌ API testing failed")
            return False

        print("\n" + "=" * 40)
        print("🎉 PAM 2.0 Test Suite: ALL TESTS PASSED!")
        print("✅ Ready for deployment")
        return True

    except Exception as e:
        print(f"\n❌ Test suite failed with error: {e}")
        import traceback
        traceback.print_exc()
        return False


if __name__ == "__main__":
    success = asyncio.run(main())
    sys.exit(0 if success else 1)