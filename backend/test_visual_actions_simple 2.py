#!/usr/bin/env python3
"""
Simple test script for visual action detection
"""

import sys
sys.path.insert(0, '.')

from app.services.pam_visual_actions import PamVisualActionsService

def test_visual_actions():
    """Test visual action parsing"""
    service = PamVisualActionsService()
    
    print("Testing Visual Action Detection")
    print("=" * 50)
    
    # Test 1: Meeting booking
    print("\nTest 1: Meeting booking")
    message = "meet John tomorrow at 12"
    context = {'user_id': 'test_user'}
    result = service.parse_intent_to_visual_action(message, context)
    
    if result:
        print(f"✅ Detected: {result['action']['action']}")
        print(f"   Person: {result['action']['parameters']['person']}")
        print(f"   Time: {result['action']['parameters']['time']}")
    else:
        print("❌ No visual action detected")
    
    # Test 2: Expense logging
    print("\nTest 2: Expense logging")
    message = "I just spent $30 on fuel"
    result = service.parse_intent_to_visual_action(message, context)
    
    if result:
        print(f"✅ Detected: {result['action']['action']}")
        print(f"   Amount: ${result['action']['parameters']['amount']}")
        print(f"   Category: {result['action']['parameters']['category']}")
    else:
        print("❌ No visual action detected")
    
    # Test 3: Navigation
    print("\nTest 3: Navigation")
    message = "go to my dashboard"
    result = service.parse_intent_to_visual_action(message, context)
    
    if result:
        print(f"✅ Detected: {result['action']['action']}")
        print(f"   Route: {result['action']['parameters']['route']}")
    else:
        print("❌ No visual action detected")
    
    # Test 4: No action (should not detect)
    print("\nTest 4: Non-action message")
    message = "what's the weather like?"
    result = service.parse_intent_to_visual_action(message, context)
    
    if result:
        print(f"❌ Incorrectly detected: {result['action']['action']}")
    else:
        print("✅ Correctly identified as non-action")
    
    print("\n" + "=" * 50)
    print("Visual Action Tests Complete")

if __name__ == "__main__":
    test_visual_actions()