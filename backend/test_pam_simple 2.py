#!/usr/bin/env python3
"""
Simple test to verify PAM's context detection logic
"""

def detect_query_context(message: str, context: dict = None) -> str:
    """Detect the context of the user's query to provide appropriate expertise"""
    message_lower = message.lower()
    
    # Travel/RV related keywords
    travel_keywords = [
        'rv', 'caravan', 'motorhome', 'camping', 'campground', 'trip', 'route', 
        'drive', 'road', 'travel', 'journey', 'park', 'hookup', 'boondock',
        'fuel stop', 'rest area', 'scenic', 'destination', 'itinerary', 'miles',
        'highway', 'vacation', 'explore'
    ]
    
    # Financial keywords
    financial_keywords = [
        'budget', 'expense', 'cost', 'money', 'spend', 'save', 'income',
        'financial', 'price', 'afford', 'payment', 'investment', 'bills'
    ]
    
    # Weather/Location keywords  
    weather_keywords = [
        'weather', 'temperature', 'rain', 'sun', 'forecast', 'storm',
        'cold', 'hot', 'wind', 'snow', 'climate', 'tomorrow', 'today'
    ]
    
    # Count keyword matches
    travel_count = sum(1 for keyword in travel_keywords if keyword in message_lower)
    financial_count = sum(1 for keyword in financial_keywords if keyword in message_lower)
    weather_count = sum(1 for keyword in weather_keywords if keyword in message_lower)
    
    # Check current page context if available
    current_page = context.get('current_page', '') if context else ''
    if 'wheels' in current_page.lower() or 'trip' in current_page.lower():
        travel_count += 2  # Boost travel context if on travel pages
    elif 'wins' in current_page.lower() or 'expense' in current_page.lower():
        financial_count += 2  # Boost financial context if on financial pages
    
    # Determine primary context based on keywords and page
    if travel_count > 0 and travel_count >= max(financial_count, weather_count):
        return "travel"
    elif financial_count > 0 and financial_count > weather_count:
        return "financial"
    elif weather_count > 0:
        return "weather"
    else:
        return "general"

# Test cases
TEST_CASES = [
    ("What's the weather like tomorrow?", "weather"),
    ("Hello, how are you?", "general"),
    ("Plan my RV trip to the Grand Canyon", "travel"),
    ("What's my budget this month?", "financial"),
    ("What time is it?", "general"),
    ("Tell me about camping spots", "travel"),
    ("How much did I spend on groceries?", "financial"),
    ("Will it rain today?", "weather"),
    ("Calculate 15% of 200", "general"),
    ("Find RV parks near me", "travel"),
]

print("=" * 60)
print("PAM CONTEXT DETECTION TEST")
print("=" * 60)

passed = 0
failed = 0

for query, expected in TEST_CASES:
    detected = detect_query_context(query)
    status = "✅" if detected == expected else "❌"
    
    if detected == expected:
        passed += 1
    else:
        failed += 1
    
    print(f"{status} Query: '{query}'")
    print(f"   Detected: {detected}, Expected: {expected}")
    print()

print("=" * 60)
print(f"RESULTS: {passed} passed, {failed} failed")
print("=" * 60)

if failed == 0:
    print("""
✅ SUCCESS! PAM now correctly detects query context:
- Weather queries → weather context (no RV bias)
- General queries → general context (no forced specialization)  
- Travel queries → travel context (appropriate RV knowledge)
- Financial queries → financial context (budget focus)

PAM is now truly context-aware and won't inject RV content
into unrelated conversations!
""")
else:
    print(f"⚠️  Some tests failed. Review the detection logic.")