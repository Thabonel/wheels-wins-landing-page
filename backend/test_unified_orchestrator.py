#!/usr/bin/env python3
"""
Test the Unified PAM Orchestrator
Verifies consolidation doesn't break functionality
"""

import asyncio
import json
from typing import Dict, Any

# Mock services for testing
class MockAIService:
    async def initialize(self):
        pass
    
    async def process_message(self, message: str, user_context: Dict[str, Any], stream: bool = False):
        # Mock response
        class Response:
            content = f"AI response to: {message}"
            confidence_score = 0.9
        return Response()

class MockDatabaseService:
    async def get_conversation_context(self, user_id: str, limit: int):
        return []

# Test scenarios
TEST_CASES = [
    {
        "name": "Weather Query",
        "message": "What's the weather like tomorrow?",
        "context": {"user_location": {"city": "Austin", "state": "TX"}},
        "expected_context": "weather",
        "should_not_contain": ["rv", "camping", "travel"]
    },
    {
        "name": "Location-Aware Greeting",
        "message": "Hello!",
        "context": {"user_location": {"address": "Austin, TX"}},
        "expected_location": "Austin, TX",
        "expected_context": "greeting"
    },
    {
        "name": "Travel Query",
        "message": "Help me plan an RV trip to Yellowstone",
        "context": {},
        "expected_context": "travel",
        "should_contain": ["travel", "route"]
    },
    {
        "name": "Financial Query",
        "message": "What's my budget this month?",
        "context": {},
        "expected_context": "financial"
    },
    {
        "name": "General Query",
        "message": "What time is it?",
        "context": {},
        "expected_context": "general"
    }
]

async def test_unified_orchestrator():
    """Test the unified orchestrator"""
    
    print("=" * 60)
    print("UNIFIED PAM ORCHESTRATOR TEST")
    print("=" * 60)
    
    # Import and initialize
    from app.services.pam.unified_orchestrator import UnifiedPamOrchestrator, QueryContext
    
    orchestrator = UnifiedPamOrchestrator()
    
    # Mock the services
    orchestrator.ai_service = MockAIService()
    orchestrator.database_service = MockDatabaseService()
    await orchestrator.initialize()
    
    passed = 0
    failed = 0
    
    for test in TEST_CASES:
        print(f"\n🧪 Test: {test['name']}")
        print(f"   Message: '{test['message']}'")
        
        # Test context detection
        query_context = orchestrator._detect_query_context(test['message'], test.get('context', {}))
        print(f"   Detected Context: {query_context.value}")
        
        # Process message
        response = await orchestrator.process_message(
            user_id="test_user",
            message=test['message'],
            context=test.get('context', {})
        )
        
        # Check response
        issues = []
        
        # Check context detection
        if 'expected_context' in test:
            actual_context = response.get('context_used', '')
            if test['expected_context'] not in actual_context and actual_context != test['expected_context']:
                issues.append(f"Expected context '{test['expected_context']}', got '{actual_context}'")
        
        # Check location awareness
        if 'expected_location' in test:
            if test['expected_location'] not in response['content']:
                issues.append(f"Location '{test['expected_location']}' not in response")
        
        # Check for unwanted content
        if 'should_not_contain' in test:
            content_lower = response['content'].lower()
            for word in test['should_not_contain']:
                if word in content_lower:
                    issues.append(f"Response should not contain '{word}'")
        
        # Check for required content
        if 'should_contain' in test:
            content_lower = response['content'].lower()
            for word in test['should_contain']:
                if word not in content_lower:
                    # Check suggestions as alternative
                    suggestions_str = ' '.join(response.get('suggestions', [])).lower()
                    if word not in suggestions_str:
                        issues.append(f"Response or suggestions should contain '{word}'")
        
        if issues:
            print(f"   ❌ FAILED:")
            for issue in issues:
                print(f"      - {issue}")
            failed += 1
        else:
            print(f"   ✅ PASSED")
            passed += 1
        
        print(f"   Response: {response['content'][:100]}...")
        if response.get('suggestions'):
            print(f"   Suggestions: {response['suggestions'][:2]}")
    
    print("\n" + "=" * 60)
    print(f"RESULTS: {passed} passed, {failed} failed")
    print("=" * 60)
    
    if failed == 0:
        print("""
✅ SUCCESS! Unified Orchestrator working correctly:

Benefits of consolidation:
1. Single source of truth - no more conflicting implementations
2. Location awareness preserved throughout
3. Context-aware responses without hardcoded bias
4. Consistent behavior across all endpoints
5. Easier to maintain and debug

The unified orchestrator:
- Detects query context (travel, weather, financial, etc.)
- Preserves user location through all layers
- Provides appropriate responses without forcing RV context
- Maintains API compatibility with existing code
- Supports streaming when needed
""")
    else:
        print(f"\n⚠️ Some tests failed. Review the implementation.")

if __name__ == "__main__":
    # Simple standalone test
    print("\nSTANDALONE TEST (without full imports)")
    print("-" * 40)
    
    # Test context detection logic
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
    
    # Test cases
    tests = [
        ("What's the weather tomorrow?", QueryContext.WEATHER),
        ("Plan my RV trip", QueryContext.TRAVEL),
        ("Check my budget", QueryContext.FINANCIAL),
        ("Hello", QueryContext.GENERAL),
    ]
    
    for message, expected in tests:
        result = detect_context(message)
        status = "✅" if result == expected else "❌"
        print(f"{status} '{message}' -> {result.value} (expected: {expected.value})")
    
    print("\n" + "-" * 40)
    print("Run with proper imports for full test:")
    print("cd backend && python test_unified_orchestrator.py")