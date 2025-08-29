#!/usr/bin/env python3
"""
Test script for SimplePamService
Tests the new direct OpenAI integration to ensure it's working correctly
"""

import asyncio
import sys
import os

# Add the backend directory to the Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.core.simple_pam_service import SimplePamService
from app.core.logging import setup_logging, get_logger

setup_logging()
logger = get_logger("test_simple_pam")

async def test_simple_pam():
    """Test SimplePamService with various prompts"""
    
    # Initialize the service
    pam = SimplePamService()
    
    # Test prompts
    test_cases = [
        {
            "name": "Simple greeting",
            "message": "Hello PAM!",
            "context": {"user_id": "test_user", "session_id": "test_session"}
        },
        {
            "name": "Trip planning",
            "message": "I want to plan a trip from Brisbane to Cairns",
            "context": {"user_id": "test_user", "session_id": "test_session"}
        },
        {
            "name": "Budget tracking",
            "message": "How can I track my travel expenses?",
            "context": {"user_id": "test_user", "session_id": "test_session"}
        },
        {
            "name": "Complex request",
            "message": "I'm planning a 2-week caravan trip along the east coast with a budget of $2000. What route would you recommend?",
            "context": {"user_id": "test_user", "session_id": "test_session"}
        }
    ]
    
    print("🧪 Testing SimplePamService...\n")
    
    for test in test_cases:
        print(f"📝 Test: {test['name']}")
        print(f"💬 User: {test['message']}")
        
        try:
            # Get response
            response = await pam.get_response(
                message=test['message'],
                context=test['context']
            )
            
            print(f"🤖 PAM: {response}")
            print(f"✅ Test passed!\n")
            
        except Exception as e:
            print(f"❌ Test failed: {str(e)}\n")
    
    # Test with conversation history
    print("📝 Test: Conversation with history")
    conversation_history = [
        {"role": "user", "content": "I'm planning a trip to the Gold Coast"},
        {"role": "assistant", "content": "The Gold Coast is a great destination! When are you planning to visit?"},
        {"role": "user", "content": "Next month"}
    ]
    
    try:
        response = await pam.get_response(
            message="What camping spots do you recommend?",
            context={"user_id": "test_user", "session_id": "test_session"},
            conversation_history=conversation_history
        )
        
        print(f"💬 User: What camping spots do you recommend?")
        print(f"🤖 PAM: {response}")
        print(f"✅ Conversation history test passed!\n")
        
    except Exception as e:
        print(f"❌ Conversation history test failed: {str(e)}\n")
    
    # Test error handling
    print("📝 Test: Error handling (simulated API failure)")
    # Temporarily set an invalid API key to test error handling
    original_key = pam.client.api_key
    pam.client.api_key = "invalid_key"
    
    try:
        response = await pam.get_response(
            message="Hello",
            context={"user_id": "test_user"}
        )
        print(f"🤖 PAM (fallback): {response}")
        print(f"✅ Error handling test passed!\n")
    except Exception as e:
        print(f"❌ Error handling test failed: {str(e)}\n")
    finally:
        # Restore the original key
        pam.client.api_key = original_key

if __name__ == "__main__":
    print("=" * 60)
    print("SimplePamService Test Suite")
    print("=" * 60)
    print()
    
    # Run the async tests
    asyncio.run(test_simple_pam())
    
    print("=" * 60)
    print("✨ All tests completed!")
    print("=" * 60)