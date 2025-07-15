#!/usr/bin/env python3
"""
Test script for PAM UI Actions functionality
Tests the enhanced SimplePamService with UI action generation
"""

import asyncio
import sys
import os
import json

# Add the backend directory to the Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.core.simple_pam_service import SimplePamService
from app.core.logging import setup_logging, get_logger

setup_logging()
logger = get_logger("test_pam_ui_actions")

async def test_pam_ui_actions():
    """Test PAM UI Actions with various scenarios"""
    
    # Initialize the service
    pam = SimplePamService()
    
    # Test cases for UI actions
    test_cases = [
        {
            "name": "Trip Planning - Sydney to Melbourne",
            "message": "Plan a trip from Sydney to Melbourne",
            "expected_actions": ["navigate", "display_route"]
        },
        {
            "name": "Trip Planning - General",
            "message": "I want to plan a road trip",
            "expected_actions": ["navigate"]
        },
        {
            "name": "Calendar Event - Meeting Tomorrow",
            "message": "Schedule a meeting with John tomorrow at 3 PM",
            "expected_actions": ["navigate", "add_calendar_event"]
        },
        {
            "name": "Calendar Event - General",
            "message": "Add an appointment to my calendar",
            "expected_actions": ["navigate"]
        },
        {
            "name": "Expense Tracking - Fuel",
            "message": "I spent $75 on fuel yesterday",
            "expected_actions": ["navigate", "add_expense"]
        },
        {
            "name": "Expense Tracking - General",
            "message": "Help me track my expenses",
            "expected_actions": ["navigate"]
        },
        {
            "name": "General Query - No Actions",
            "message": "What's the weather like?",
            "expected_actions": []
        }
    ]
    
    print("🧪 Testing PAM UI Actions...\n")
    
    for test in test_cases:
        print(f"📝 Test: {test['name']}")
        print(f"💬 User: {test['message']}")
        
        try:
            # Get response with UI actions
            response_data = await pam.process_message(
                user_id="test_user",
                message=test['message'],
                context={"session_id": "test_session"}
            )
            
            print(f"🤖 PAM: {response_data.get('content', 'No response')[:100]}...")
            print(f"🎯 Intent: {response_data.get('intent')}")
            print(f"🎬 Actions: {len(response_data.get('actions', []))} actions generated")
            
            # Analyze actions
            actions = response_data.get('actions', [])
            action_types = [action.get('type') for action in actions]
            
            print(f"   Action types: {action_types}")
            
            # Check if expected actions are present
            expected = test['expected_actions']
            if expected:
                missing_actions = [action for action in expected if action not in action_types]
                unexpected_actions = [action for action in action_types if action not in expected and action != 'message']
                
                if not missing_actions and not unexpected_actions:
                    print("   ✅ Expected actions generated correctly")
                else:
                    if missing_actions:
                        print(f"   ⚠️ Missing expected actions: {missing_actions}")
                    if unexpected_actions:
                        print(f"   ⚠️ Unexpected actions: {unexpected_actions}")
            else:
                if not actions:
                    print("   ✅ No actions expected, none generated")
                else:
                    print(f"   ℹ️ Generated {len(actions)} actions (not expected)")
            
            # Show detailed action payloads for important actions
            for action in actions:
                if action.get('type') in ['display_route', 'add_calendar_event', 'add_expense']:
                    print(f"   📦 {action['type']} payload: {json.dumps(action.get('payload', {}), indent=6)}")
            
            print(f"✅ Test completed!\n")
            
        except Exception as e:
            print(f"❌ Test failed: {str(e)}\n")
    
    # Test UI action generation directly
    print("🔧 Testing UI Action Generation Methods...\n")
    
    # Test route extraction
    route_actions = pam._generate_ui_actions(
        "plan a trip from Brisbane to Cairns",
        "wheels",
        "I'll help you plan that trip!"
    )
    print(f"🗺️ Route Actions: {json.dumps(route_actions, indent=2)}")
    
    # Test calendar extraction
    calendar_actions = pam._generate_ui_actions(
        "schedule a doctor appointment tomorrow at 2:30 PM",
        "calendar", 
        "I'll schedule that for you!"
    )
    print(f"📅 Calendar Actions: {json.dumps(calendar_actions, indent=2)}")
    
    # Test expense extraction
    expense_actions = pam._generate_ui_actions(
        "I spent $125.50 on groceries today",
        "wins",
        "I'll track that expense!"
    )
    print(f"💰 Expense Actions: {json.dumps(expense_actions, indent=2)}")

if __name__ == "__main__":
    print("=" * 70)
    print("PAM UI Actions Test Suite")
    print("=" * 70)
    print()
    
    # Run the async tests
    asyncio.run(test_pam_ui_actions())
    
    print("=" * 70)
    print("✨ All UI action tests completed!")
    print("=" * 70)