#!/usr/bin/env python3
"""
Test script for PAM Rate Limiting System

This script tests the advanced rate limiting functionality to ensure it works correctly.
Run with: python test_rate_limiting.py
"""

import asyncio
import time
from datetime import datetime
from app.middleware.rate_limiting import (
    AdvancedRateLimiter, 
    MultiTierRateLimiter, 
    check_websocket_rate_limit,
    check_rest_api_rate_limit,
    check_voice_rate_limit,
    check_feedback_rate_limit,
    multi_tier_limiter
)

async def test_basic_rate_limiter():
    """Test basic rate limiter functionality"""
    print("🧪 Testing Basic Rate Limiter...")
    
    # Create a rate limiter with 3 requests per 2 seconds for testing
    limiter = AdvancedRateLimiter(max_requests=3, window_seconds=2)
    
    user_id = "test_user_123"
    
    # Test normal operation
    print("Testing normal operation (should allow first 3 requests):")
    for i in range(3):
        result = await limiter.check_rate_limit(user_id)
        print(f"  Request {i+1}: {'✅ ALLOWED' if result.allowed else '❌ DENIED'} - Remaining: {result.remaining}")
    
    # Test rate limit exceeded
    print("\nTesting rate limit exceeded (4th request should be denied):")
    result = await limiter.check_rate_limit(user_id)
    print(f"  Request 4: {'✅ ALLOWED' if result.allowed else '❌ DENIED'} - {result.reason}")
    
    # Wait for window to reset
    print("\nWaiting 3 seconds for window reset...")
    await asyncio.sleep(3)
    
    # Test after reset
    print("Testing after reset (should allow request again):")
    result = await limiter.check_rate_limit(user_id)
    print(f"  Request after reset: {'✅ ALLOWED' if result.allowed else '❌ DENIED'} - Remaining: {result.remaining}")
    
    print("✅ Basic rate limiter test completed\n")

async def test_multi_tier_limiter():
    """Test multi-tier rate limiter with different limits"""
    print("🧪 Testing Multi-Tier Rate Limiter...")
    
    user_id = "test_user_456"
    
    # Test different rate limiter types
    limit_types = [
        ("websocket", "WebSocket messages"),
        ("rest_api", "REST API calls"), 
        ("voice_synthesis", "Voice synthesis"),
        ("feedback", "Feedback submissions"),
        ("auth", "Authentication attempts")
    ]
    
    for limit_type, description in limit_types:
        print(f"\nTesting {description} ({limit_type}):")
        
        # Get limit for this type
        limiter = multi_tier_limiter.limiters[limit_type]
        max_requests = limiter.max_requests
        
        print(f"  Limit: {max_requests} requests per {limiter.window_seconds} seconds")
        
        # Test up to the limit
        allowed_count = 0
        for i in range(max_requests + 2):  # Try 2 extra to test limit
            result = await multi_tier_limiter.check_limit(limit_type, user_id)
            if result.allowed:
                allowed_count += 1
                print(f"    Request {i+1}: ✅ ALLOWED (remaining: {result.remaining})")
            else:
                print(f"    Request {i+1}: ❌ DENIED - {result.reason}")
        
        print(f"  Result: {allowed_count}/{max_requests + 2} requests allowed ({'✅ CORRECT' if allowed_count == max_requests else '❌ ERROR'})")
    
    print("✅ Multi-tier rate limiter test completed\n")

async def test_sliding_window():
    """Test sliding window behavior"""
    print("🧪 Testing Sliding Window Behavior...")
    
    # Create rate limiter with 2 requests per 3 seconds
    limiter = AdvancedRateLimiter(max_requests=2, window_seconds=3)
    user_id = "test_sliding_window"
    
    print("Making 2 requests immediately:")
    for i in range(2):
        result = await limiter.check_rate_limit(user_id)
        print(f"  Request {i+1}: {'✅ ALLOWED' if result.allowed else '❌ DENIED'}")
    
    print("\nWaiting 1.5 seconds, then trying another request (should be denied):")
    await asyncio.sleep(1.5)
    result = await limiter.check_rate_limit(user_id)
    print(f"  Request 3: {'✅ ALLOWED' if result.allowed else '❌ DENIED'}")
    
    print("\nWaiting another 2 seconds, then trying (should be allowed as first request expires):")
    await asyncio.sleep(2)
    result = await limiter.check_rate_limit(user_id)
    print(f"  Request 4: {'✅ ALLOWED' if result.allowed else '❌ DENIED'}")
    
    print("✅ Sliding window test completed\n")

async def test_cleanup_functionality():
    """Test automatic cleanup of expired requests"""
    print("🧪 Testing Cleanup Functionality...")
    
    limiter = AdvancedRateLimiter(max_requests=5, window_seconds=2, cleanup_interval=1)
    
    # Create requests for multiple users
    for i in range(5):
        user_id = f"cleanup_test_user_{i}"
        await limiter.check_rate_limit(user_id)
    
    print(f"Initial stats: {limiter.get_stats()}")
    
    # Wait for cleanup
    print("Waiting 3 seconds for cleanup...")
    await asyncio.sleep(3)
    
    # Force cleanup by checking rate limit
    await limiter.check_rate_limit("trigger_cleanup_user")
    
    print(f"After cleanup: {limiter.get_stats()}")
    print("✅ Cleanup functionality test completed\n")

async def test_convenience_functions():
    """Test convenience functions"""
    print("🧪 Testing Convenience Functions...")
    
    user_id = "convenience_test_user"
    
    functions = [
        (check_websocket_rate_limit, "WebSocket"),
        (check_rest_api_rate_limit, "REST API"), 
        (check_voice_rate_limit, "Voice synthesis"),
        (check_feedback_rate_limit, "Feedback"),
        (check_auth_rate_limit, "Authentication")
    ]
    
    for func, name in functions:
        if name == "REST API":
            result = await func(user_id, "/test/endpoint")
        else:
            result = await func(user_id)
        print(f"  {name}: {'✅ ALLOWED' if result.allowed else '❌ DENIED'} (remaining: {result.remaining})")
    
    print("✅ Convenience functions test completed\n")

async def performance_test():
    """Test performance with many requests"""
    print("🧪 Running Performance Test...")
    
    limiter = AdvancedRateLimiter(max_requests=1000, window_seconds=60)
    
    start_time = time.time()
    
    # Test 500 requests
    for i in range(500):
        await limiter.check_rate_limit(f"perf_test_user_{i % 10}")  # 10 different users
    
    end_time = time.time()
    duration = end_time - start_time
    
    print(f"  Processed 500 requests in {duration:.3f} seconds")
    print(f"  Average: {500/duration:.1f} requests/second")
    print(f"  Final stats: {limiter.get_stats()}")
    
    print("✅ Performance test completed\n")

async def main():
    """Run all tests"""
    print("🚀 Starting PAM Rate Limiting Tests\n")
    print("=" * 60)
    
    try:
        await test_basic_rate_limiter()
        await test_multi_tier_limiter()
        await test_sliding_window()
        await test_cleanup_functionality()
        await test_convenience_functions()
        await performance_test()
        
        print("=" * 60)
        print("🎉 All rate limiting tests completed successfully!")
        
        # Show final global stats
        print("\n📊 Final Global Statistics:")
        global_stats = multi_tier_limiter.get_all_stats()
        for limit_type, stats in global_stats.items():
            print(f"  {limit_type}: {stats['active_users']} active users, {stats['total_active_requests']} active requests")
            
    except Exception as e:
        print(f"❌ Test failed with error: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(main())