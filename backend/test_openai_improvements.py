#!/usr/bin/env python3
"""
Test script for OpenAI API key configuration improvements
Tests the enhanced validation, error handling, and graceful degradation
"""

import asyncio
import os
import sys
from typing import Dict, Any

# Add the app directory to Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'app'))

from app.core.config import get_settings, Settings
from app.services.ai_service import get_ai_service
from app.services.pam.enhanced_orchestrator import EnhancedPamOrchestrator


def test_config_validation():
    """Test OpenAI API key validation in config"""
    print("🧪 Testing OpenAI API key validation...")
    
    # Test 1: Valid key format
    try:
        # Temporarily set a valid-looking key for testing
        original_key = os.environ.get('OPENAI_API_KEY')
        os.environ['OPENAI_API_KEY'] = 'sk-test123456789012345678901234567890'
        
        settings = Settings()
        print("✅ Valid key format accepted")
        
        # Restore original key
        if original_key:
            os.environ['OPENAI_API_KEY'] = original_key
        else:
            os.environ.pop('OPENAI_API_KEY', None)
            
    except Exception as e:
        print(f"❌ Unexpected error with valid key: {e}")
    
    # Test 2: Invalid key format
    try:
        original_key = os.environ.get('OPENAI_API_KEY')
        os.environ['OPENAI_API_KEY'] = 'invalid-key'
        
        settings = Settings()
        print("❌ Invalid key format was accepted (should have been rejected)")
        
    except ValueError as e:
        if "should start with 'sk-'" in str(e):
            print("✅ Invalid key format correctly rejected")
        else:
            print(f"❌ Wrong error message: {e}")
    except Exception as e:
        print(f"❌ Unexpected error type: {e}")
    finally:
        # Restore original key
        if original_key:
            os.environ['OPENAI_API_KEY'] = original_key
        else:
            os.environ.pop('OPENAI_API_KEY', None)
    
    # Test 3: Missing key
    try:
        original_key = os.environ.get('OPENAI_API_KEY')
        os.environ.pop('OPENAI_API_KEY', None)
        
        settings = Settings()
        print("❌ Missing key was accepted (should have been rejected)")
        
    except ValueError as e:
        if "required for PAM functionality" in str(e):
            print("✅ Missing key correctly rejected")
        else:
            print(f"❌ Wrong error message: {e}")
    except Exception as e:
        print(f"❌ Unexpected error type: {e}")
    finally:
        # Restore original key
        if original_key:
            os.environ['OPENAI_API_KEY'] = original_key


async def test_ai_service_initialization():
    """Test AI service initialization with different key states"""
    print("\n🧪 Testing AI service initialization...")
    
    # Test with current configuration
    try:
        ai_service = get_ai_service()
        success = await ai_service.initialize()
        
        if success:
            print("✅ AI service initialized successfully")
            
            # Test health check
            health_result = await ai_service._health_check()
            if health_result:
                print("✅ Health check passed")
            else:
                print("⚠️ Health check failed (may be expected if key is invalid)")
            
            # Get service stats
            stats = ai_service.get_service_stats()
            print(f"📊 Service status: {stats['service_status']}")
            print(f"📊 OpenAI configured: {stats['openai_key_configured']}")
            print(f"📊 API client ready: {stats['api_configured']}")
            
        else:
            print("⚠️ AI service initialization failed (may be expected)")
            
    except Exception as e:
        print(f"❌ AI service test failed: {e}")


async def test_orchestrator_fallback():
    """Test enhanced orchestrator graceful degradation"""
    print("\n🧪 Testing orchestrator fallback responses...")
    
    try:
        orchestrator = EnhancedPamOrchestrator()
        await orchestrator.initialize()
        
        # Test simple response generation
        test_messages = [
            "Hello",
            "Help me",
            "What are my expenses?",
            "Plan a trip to Yosemite",
            "Random question about quantum physics"
        ]
        
        for message in test_messages:
            print(f"\n📝 Testing message: '{message}'")
            try:
                response = await orchestrator.process_message(
                    message=message,
                    user_id="test_user",
                    session_id="test_session",
                    context={}
                )
                
                print(f"✅ Response: {response['content'][:100]}...")
                print(f"📊 Confidence: {response['confidence']}")
                print(f"📊 Service status: {response.get('service_status', 'unknown')}")
                print(f"📊 Capabilities used: {response.get('capabilities_used', [])}")
                
                if response.get('capabilities_disabled'):
                    print(f"⚠️ Disabled capabilities: {response['capabilities_disabled']}")
                
                if response.get('user_guidance'):
                    print(f"💡 User guidance: {response['user_guidance']}")
                    
            except Exception as e:
                print(f"❌ Message processing failed: {e}")
                
    except Exception as e:
        print(f"❌ Orchestrator test failed: {e}")


def test_error_message_improvements():
    """Test that error messages are specific and helpful"""
    print("\n🧪 Testing error message improvements...")
    
    # Test startup validation
    try:
        settings = get_settings()
        validation_result = settings.validate_on_startup()
        
        print(f"📊 Configuration valid: {validation_result['valid']}")
        
        if validation_result['issues']:
            print("❌ Configuration issues found:")
            for issue in validation_result['issues']:
                print(f"  • {issue}")
        else:
            print("✅ No configuration issues found")
            
        if validation_result['warnings']:
            print("⚠️ Configuration warnings:")
            for warning in validation_result['warnings']:
                print(f"  • {warning}")
                
        print(f"📊 Services status: {validation_result['services']}")
        
    except Exception as e:
        print(f"❌ Validation test failed: {e}")


async def main():
    """Run all tests"""
    print("🚀 Starting OpenAI configuration improvements tests...\n")
    
    # Test configuration validation
    test_config_validation()
    
    # Test AI service improvements
    await test_ai_service_initialization()
    
    # Test orchestrator fallback
    await test_orchestrator_fallback()
    
    # Test error messages
    test_error_message_improvements()
    
    print("\n✅ All tests completed!")


if __name__ == "__main__":
    asyncio.run(main())