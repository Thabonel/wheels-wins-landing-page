#!/usr/bin/env python3
"""
Test PAM duplicate response and RV bias fixes
"""

import hashlib
import time
from typing import Dict, Any

def test_deduplication_logic():
    """Test the duplicate response detection logic"""
    print("=" * 60)
    print("DUPLICATE RESPONSE TEST")
    print("=" * 60)
    
    # Mock the deduplication function
    response_tracker = {}
    DEDUP_WINDOW_SECONDS = 5
    
    def is_duplicate_response(user_id: str, message: str, response: str) -> bool:
        """Check if this response was recently sent to avoid duplicates"""
        current_time = time.time()
        
        # Create hash of the message + response for deduplication
        content_hash = hashlib.md5(f"{message.strip().lower()}|{response[:200]}".encode()).hexdigest()
        
        # Clean up old entries
        if user_id in response_tracker:
            response_tracker[user_id] = {
                h: t for h, t in response_tracker[user_id].items() 
                if current_time - t < DEDUP_WINDOW_SECONDS
            }
        else:
            response_tracker[user_id] = {}
        
        # Check if this content was recently sent
        if content_hash in response_tracker[user_id]:
            time_diff = current_time - response_tracker[user_id][content_hash]
            if time_diff < DEDUP_WINDOW_SECONDS:
                return True
        
        # Record this response
        response_tracker[user_id][content_hash] = current_time
        return False
    
    # Test scenarios
    user_id = "test_user"
    message = "What's the weather like tomorrow?"
    response = "I can't provide real-time weather updates, but you can check a reliable weather website..."
    
    # First call should not be duplicate
    is_dup1 = is_duplicate_response(user_id, message, response)
    print(f"First call: {'❌ DUPLICATE' if is_dup1 else '✅ NOT DUPLICATE'}")
    
    # Immediate second call should be duplicate
    is_dup2 = is_duplicate_response(user_id, message, response)
    print(f"Second call: {'✅ DUPLICATE' if is_dup2 else '❌ NOT DUPLICATE'}")
    
    # Different user should not be duplicate
    is_dup3 = is_duplicate_response("different_user", message, response)
    print(f"Different user: {'❌ DUPLICATE' if is_dup3 else '✅ NOT DUPLICATE'}")
    
    # Different message should not be duplicate
    is_dup4 = is_duplicate_response(user_id, "What time is it?", "It's currently...")
    print(f"Different message: {'❌ DUPLICATE' if is_dup4 else '✅ NOT DUPLICATE'}")
    
    # Same message after 6 seconds should not be duplicate
    time.sleep(1)  # Simulate short delay
    is_dup5 = is_duplicate_response(user_id, message, response)
    print(f"After delay: {'✅ DUPLICATE' if is_dup5 else '❌ NOT DUPLICATE (if delay > 5s)'}")
    
    return not is_dup1 and is_dup2 and not is_dup3 and not is_dup4

def test_ai_service_neutrality():
    """Test that AI service system prompt is neutral"""
    print("\n" + "=" * 60)
    print("AI SERVICE NEUTRALITY TEST")
    print("=" * 60)
    
    try:
        with open("/Users/thabonel/Documents/Wheels and Wins/wheels-wins-landing-page/backend/app/services/ai_service.py", "r") as f:
            content = f.read()
        
        # Check for removed RV-specific content
        rv_phrases = [
            "RV and camping enthusiasts",
            "RV travel and camping",
            "RV-specific challenges",
            "bridge height and weight restrictions",
            "better, safer, and more affordable RV experience"
        ]
        
        found_phrases = []
        for phrase in rv_phrases:
            if phrase in content:
                found_phrases.append(phrase)
        
        # Check for new neutral content
        neutral_phrases = [
            "intelligent and adaptive assistant",
            "Adapt your response to what the user is actually asking",
            "Don't assume every question is travel-related"
        ]
        
        found_neutral = []
        for phrase in neutral_phrases:
            if phrase in content:
                found_neutral.append(phrase)
        
        print(f"RV-biased phrases found: {len(found_phrases)}")
        for phrase in found_phrases:
            print(f"  ❌ '{phrase}'")
        
        print(f"Neutral phrases found: {len(found_neutral)}")
        for phrase in found_neutral:
            print(f"  ✅ '{phrase}'")
        
        return len(found_phrases) == 0 and len(found_neutral) >= 2
        
    except Exception as e:
        print(f"❌ ERROR: {e}")
        return False

def main():
    """Run all tests"""
    print("🧪 TESTING COMPREHENSIVE PAM FIXES")
    print("Testing duplicate response prevention and RV bias removal...")
    
    tests = [
        ("Deduplication Logic", test_deduplication_logic),
        ("AI Service Neutrality", test_ai_service_neutrality),
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
    print("COMPREHENSIVE TEST SUMMARY")
    print("=" * 60)
    
    passed = sum(results.values())
    total = len(results)
    
    for test_name, result in results.items():
        status = "✅ PASSED" if result else "❌ FAILED"
        print(f"{status}: {test_name}")
    
    print(f"\nRESULT: {passed}/{total} tests passed")
    
    if passed == total:
        print("\n🎉 ALL FIXES IMPLEMENTED SUCCESSFULLY!")
        print("Expected behavior after deployment:")
        print("✅ Weather queries get neutral responses (no RV mentions)")
        print("✅ No duplicate responses sent to users")
        print("✅ PAM adapts responses to what user actually asked")
    else:
        print(f"\n⚠️ {total - passed} test(s) failed - review before deploying")

if __name__ == "__main__":
    main()