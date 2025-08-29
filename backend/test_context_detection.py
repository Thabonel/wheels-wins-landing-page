#!/usr/bin/env python3
"""
Test context detection logic for neutral PAM responses
"""

from enum import Enum

class QueryContext(Enum):
    """Query context types"""
    TRAVEL = "travel"
    FINANCIAL = "financial"
    WEATHER = "weather"
    GENERAL = "general"
    SOCIAL = "social"
    PROFILE = "profile"

def detect_query_context(message: str) -> QueryContext:
    """Detect the context of the user's query"""
    message_lower = message.lower()
    
    # Travel/RV keywords
    if any(word in message_lower for word in [
        'rv', 'trip', 'route', 'camping', 'travel', 'drive', 'road', 
        'park', 'campground', 'journey', 'destination'
    ]):
        return QueryContext.TRAVEL
        
    # Financial keywords
    if any(word in message_lower for word in [
        'budget', 'expense', 'cost', 'money', 'spend', 'save', 
        'income', 'payment', 'price'
    ]):
        return QueryContext.FINANCIAL
        
    # Weather keywords
    if any(word in message_lower for word in [
        'weather', 'temperature', 'rain', 'forecast', 'storm',
        'cold', 'hot', 'wind', 'tomorrow', 'today'
    ]):
        return QueryContext.WEATHER
        
    # Social keywords
    if any(word in message_lower for word in [
        'group', 'friend', 'meet', 'social', 'community', 'event'
    ]):
        return QueryContext.SOCIAL
        
    # Profile keywords
    if any(word in message_lower for word in [
        'profile', 'settings', 'preferences', 'account', 'my info'
    ]):
        return QueryContext.PROFILE
        
    return QueryContext.GENERAL

def build_neutral_prompt(query_context: QueryContext) -> str:
    """Build a context-aware prompt without RV bias"""
    
    base = "You are PAM, an intelligent assistant. "
    
    if query_context == QueryContext.TRAVEL:
        return base + "Provide helpful travel and route information."
    elif query_context == QueryContext.FINANCIAL:
        return base + "Provide budget and expense management assistance."
    elif query_context == QueryContext.WEATHER:
        return base + "Provide accurate weather information."
    elif query_context == QueryContext.SOCIAL:
        return base + "Help with community and social features."
    elif query_context == QueryContext.PROFILE:
        return base + "Help with user settings and preferences."
    else:
        return base + "Provide helpful, relevant assistance."

# Test cases
TEST_CASES = [
    # Weather queries - should NOT trigger travel context
    ("What's the weather like tomorrow?", QueryContext.WEATHER),
    ("Is it going to rain today?", QueryContext.WEATHER),
    ("What's the temperature outside?", QueryContext.WEATHER),
    
    # General queries - should NOT trigger travel context
    ("Hello!", QueryContext.GENERAL),
    ("What time is it?", QueryContext.GENERAL),
    ("How are you?", QueryContext.GENERAL),
    
    # Travel queries - SHOULD trigger travel context
    ("Help me plan an RV trip", QueryContext.TRAVEL),
    ("Find campgrounds near me", QueryContext.TRAVEL),
    ("Plan a route to Yellowstone", QueryContext.TRAVEL),
    
    # Financial queries
    ("What's my budget?", QueryContext.FINANCIAL),
    ("Track my expenses", QueryContext.FINANCIAL),
    
    # Mixed queries
    ("What's the weather for my trip?", QueryContext.TRAVEL),  # 'trip' triggers travel
    ("Weather forecast", QueryContext.WEATHER),  # Just weather
]

def run_tests():
    """Run context detection tests"""
    print("=" * 60)
    print("PAM CONTEXT DETECTION TEST")
    print("=" * 60)
    
    passed = 0
    failed = 0
    
    for message, expected_context in TEST_CASES:
        detected = detect_query_context(message)
        status = "✅" if detected == expected_context else "❌"
        
        if detected == expected_context:
            passed += 1
        else:
            failed += 1
        
        print(f"{status} '{message}'")
        print(f"   Expected: {expected_context.value}, Got: {detected.value}")
        
        if detected != expected_context:
            prompt = build_neutral_prompt(detected)
            print(f"   Would use prompt: {prompt[:50]}...")
        print()
    
    print("=" * 60)
    print(f"RESULTS: {passed} passed, {failed} failed")
    print("=" * 60)
    
    if failed == 0:
        print("\n✅ SUCCESS! Context detection is working correctly")
        print("Weather queries will NOT trigger RV/travel responses")
    else:
        print("\n⚠️ Some tests failed. Check context detection logic.")
    
    # Show example prompts
    print("\n" + "-" * 40)
    print("EXAMPLE PROMPTS FOR EACH CONTEXT:")
    print("-" * 40)
    
    for context in QueryContext:
        prompt = build_neutral_prompt(context)
        print(f"{context.value.upper()}: {prompt}")

if __name__ == "__main__":
    run_tests()