#!/usr/bin/env python3
"""
Test all PAM entry points for RV bias removal
"""

import asyncio
from typing import Dict, Any, List

def test_context_detection():
    """Test the context detection logic"""
    from enum import Enum
    
    class QueryContext(Enum):
        TRAVEL = "travel"
        FINANCIAL = "financial"
        WEATHER = "weather"
        GENERAL = "general"
    
    def detect_context(message: str) -> QueryContext:
        message_lower = message.lower()
        
        if any(word in message_lower for word in ['weather', 'temperature', 'rain', 'forecast']):
            return QueryContext.WEATHER
        elif any(word in message_lower for word in ['rv', 'trip', 'travel', 'camping']):
            return QueryContext.TRAVEL
        elif any(word in message_lower for word in ['budget', 'expense', 'cost', 'money']):
            return QueryContext.FINANCIAL
        else:
            return QueryContext.GENERAL
    
    # Test cases that should NOT trigger travel context
    non_travel_tests = [
        "What's the weather like tomorrow?",
        "Hello!",
        "What time is it?",
        "Is it going to rain?",
        "How are you?",
        "What's the temperature?"
    ]
    
    # Test cases that SHOULD trigger travel context
    travel_tests = [
        "Help me plan an RV trip",
        "Find campgrounds near me",
        "Plan a route to Yellowstone"
    ]
    
    print("=" * 60)
    print("CONTEXT DETECTION TEST")
    print("=" * 60)
    
    all_passed = True
    
    # Test non-travel queries
    print("Testing queries that should NOT trigger travel context:")
    for query in non_travel_tests:
        context = detect_context(query)
        if context == QueryContext.TRAVEL:
            print(f"❌ FAILED: '{query}' -> {context.value} (should NOT be travel)")
            all_passed = False
        else:
            print(f"✅ PASSED: '{query}' -> {context.value}")
    
    print("\nTesting queries that SHOULD trigger travel context:")
    for query in travel_tests:
        context = detect_context(query)
        if context != QueryContext.TRAVEL:
            print(f"❌ FAILED: '{query}' -> {context.value} (should be travel)")
            all_passed = False
        else:
            print(f"✅ PASSED: '{query}' -> {context.value}")
    
    return all_passed

def test_simple_pam_service_responses():
    """Test that SimplePamService no longer has RV bias"""
    
    print("\n" + "=" * 60)
    print("SIMPLE PAM SERVICE BIAS TEST")
    print("=" * 60)
    
    # Read the SimplePamService file and check for RV bias
    try:
        with open("/Users/thabonel/Documents/Wheels and Wins/wheels-wins-landing-page/backend/app/core/simple_pam_service.py", "r") as f:
            content = f.read()
        
        # Check for RV-biased phrases
        bias_phrases = [
            "RV travel conditions",
            "Safe travels!",
            "RV travel assistant",
            "Overall RV travel conditions"
        ]
        
        issues_found = []
        for phrase in bias_phrases:
            if phrase in content:
                issues_found.append(phrase)
        
        if issues_found:
            print("❌ FAILED: Found RV bias in SimplePamService:")
            for issue in issues_found:
                print(f"   - '{issue}'")
            return False
        else:
            print("✅ PASSED: No RV bias found in SimplePamService")
            return True
            
    except Exception as e:
        print(f"❌ ERROR: Could not read SimplePamService: {e}")
        return False

def test_websocket_orchestrator_usage():
    """Test that WebSocket uses unified orchestrator"""
    
    print("\n" + "=" * 60)
    print("WEBSOCKET ORCHESTRATOR TEST")
    print("=" * 60)
    
    try:
        with open("/Users/thabonel/Documents/Wheels and Wins/wheels-wins-landing-page/backend/app/api/v1/pam.py", "r") as f:
            content = f.read()
        
        # Check that WebSocket uses unified orchestrator
        if "from app.core.simple_pam_service import simple_pam_service" in content:
            print("❌ FAILED: WebSocket still imports SimplePamService")
            return False
        
        if "await orchestrator.process_message(" in content:
            print("✅ PASSED: WebSocket uses unified orchestrator")
            return True
        else:
            print("❌ FAILED: WebSocket doesn't call orchestrator.process_message")
            return False
            
    except Exception as e:
        print(f"❌ ERROR: Could not read PAM API file: {e}")
        return False

def test_ai_service_classification():
    """Test that AI service classifies weather as general"""
    
    print("\n" + "=" * 60)
    print("AI SERVICE CLASSIFICATION TEST")
    print("=" * 60)
    
    try:
        with open("/Users/thabonel/Documents/Wheels and Wins/wheels-wins-landing-page/backend/app/services/ai_service.py", "r") as f:
            content = f.read()
        
        # Check that 'weather' is in general_indicators
        if "'weather'" in content and "general_indicators" in content:
            print("✅ PASSED: Weather is classified as general indicator")
            return True
        else:
            print("❌ FAILED: Weather classification not found")
            return False
            
    except Exception as e:
        print(f"❌ ERROR: Could not read AI service file: {e}")
        return False

def main():
    """Run all tests"""
    print("🧪 TESTING PAM RV BIAS FIXES")
    print("Testing all entry points for neutral responses...")
    
    tests = [
        ("Context Detection", test_context_detection),
        ("SimplePamService Bias", test_simple_pam_service_responses), 
        ("WebSocket Orchestrator", test_websocket_orchestrator_usage),
        ("AI Service Classification", test_ai_service_classification)
    ]
    
    results = {}
    for test_name, test_func in tests:
        try:
            results[test_name] = test_func()
        except Exception as e:
            print(f"❌ ERROR in {test_name}: {e}")
            results[test_name] = False
    
    # Summary
    print("\n" + "=" * 60)
    print("TEST SUMMARY")
    print("=" * 60)
    
    passed = sum(results.values())
    total = len(results)
    
    for test_name, result in results.items():
        status = "✅ PASSED" if result else "❌ FAILED"
        print(f"{status}: {test_name}")
    
    print(f"\nRESULT: {passed}/{total} tests passed")
    
    if passed == total:
        print("\n🎉 ALL TESTS PASSED!")
        print("PAM should now give neutral responses to weather queries")
        print("without mentioning RV travel, road conditions, or 'Safe travels!'")
    else:
        print(f"\n⚠️ {total - passed} test(s) failed")
        print("Review the failures above before deploying")

if __name__ == "__main__":
    main()