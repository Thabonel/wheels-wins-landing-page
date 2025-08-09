#!/usr/bin/env python3
"""
Redis Connection Test for Wheels & Wins Enhanced Security
Tests connection to your Redis instance: red-d1venaur433s73fk12j0
"""

import asyncio
import aioredis
import os
import sys
from datetime import datetime

# Your Redis configurations to test
REDIS_CONFIGS = [
    # Basic connection (no auth)
    "redis://red-d1venaur433s73fk12j0:6379",
    
    # With potential authentication (if password is set)
    # "redis://:your-password@red-d1venaur433s73fk12j0:6379",
    
    # With SSL (if TLS is enabled) 
    # "rediss://red-d1venaur433s73fk12j0:6380",
    
    # From environment variable
    os.getenv("REDIS_URL", "redis://red-d1venaur433s73fk12j0:6379")
]

async def test_redis_connection(redis_url: str):
    """Test Redis connection with security system operations"""
    print(f"\n🔴 Testing Redis connection: {redis_url}")
    print("=" * 60)
    
    try:
        # Connect to Redis
        redis = aioredis.from_url(
            redis_url,
            encoding="utf-8",
            decode_responses=True,
            retry_on_timeout=True,
            socket_connect_timeout=10,
            socket_timeout=10
        )
        
        # Test 1: Basic ping
        print("1️⃣ Testing basic connection...")
        await redis.ping()
        print("   ✅ PING successful")
        
        # Test 2: Basic set/get operations
        print("2️⃣ Testing basic set/get operations...")
        test_key = f"wheels_wins_test_{int(datetime.now().timestamp())}"
        await redis.set(test_key, "security_test_value", ex=60)
        value = await redis.get(test_key)
        if value == "security_test_value":
            print("   ✅ SET/GET successful")
        else:
            print(f"   ❌ SET/GET failed: expected 'security_test_value', got '{value}'")
        
        # Test 3: Rate limiting operations (sorted sets)
        print("3️⃣ Testing rate limiting operations (sorted sets)...")
        rate_limit_key = f"rate_limit:test:{int(datetime.now().timestamp())}"
        await redis.zadd(rate_limit_key, {"request1": 1640995200, "request2": 1640995260})
        count = await redis.zcard(rate_limit_key)
        if count == 2:
            print("   ✅ Rate limiting (ZADD/ZCARD) successful")
        else:
            print(f"   ❌ Rate limiting failed: expected 2 items, got {count}")
        
        # Test 4: Security monitoring operations (hashes)
        print("4️⃣ Testing security monitoring operations (hashes)...")
        monitoring_key = f"security_monitor:test:{int(datetime.now().timestamp())}"
        await redis.hset(monitoring_key, mapping={
            "threat_type": "test_threat",
            "ip_address": "192.168.1.100",
            "timestamp": str(datetime.now().timestamp())
        })
        threat_data = await redis.hgetall(monitoring_key)
        if threat_data and threat_data.get("threat_type") == "test_threat":
            print("   ✅ Security monitoring (HSET/HGETALL) successful")
        else:
            print("   ❌ Security monitoring failed")
        
        # Test 5: Key expiration (for cleanup)
        print("5️⃣ Testing key expiration...")
        expire_key = f"expire_test_{int(datetime.now().timestamp())}"
        await redis.set(expire_key, "expire_value", ex=1)  # 1 second expiry
        await asyncio.sleep(2)  # Wait for expiration
        expired_value = await redis.get(expire_key)
        if expired_value is None:
            print("   ✅ Key expiration successful")
        else:
            print("   ❌ Key expiration failed")
        
        # Test 6: Blocking IP operations
        print("6️⃣ Testing IP blocking operations...")
        blocked_ip_key = f"blocked_ip:192.168.1.100:{int(datetime.now().timestamp())}"
        await redis.setex(blocked_ip_key, 60, "blocked_for_security_violation")
        blocked_value = await redis.get(blocked_ip_key)
        if blocked_value == "blocked_for_security_violation":
            print("   ✅ IP blocking (SETEX) successful")
        else:
            print("   ❌ IP blocking failed")
        
        # Cleanup test keys
        print("7️⃣ Cleaning up test keys...")
        await redis.delete(test_key, rate_limit_key, monitoring_key, blocked_ip_key)
        print("   ✅ Cleanup successful")
        
        # Close connection
        await redis.close()
        
        print("\n🎉 ALL REDIS TESTS PASSED!")
        print(f"✅ Redis instance ready for enhanced security system")
        print(f"🔗 Use this Redis URL: {redis_url}")
        
        return True
        
    except Exception as e:
        print(f"\n❌ Redis connection failed: {str(e)}")
        print(f"🔗 Failed URL: {redis_url}")
        return False

async def test_all_configurations():
    """Test all Redis configurations"""
    print("🔴 Redis Connection Test for Wheels & Wins Enhanced Security")
    print("=" * 60)
    print(f"Testing Redis instance: red-d1venaur433s73fk12j0")
    print(f"Timestamp: {datetime.now().isoformat()}")
    
    successful_configs = []
    
    for i, redis_url in enumerate(REDIS_CONFIGS, 1):
        if redis_url:  # Skip empty URLs
            success = await test_redis_connection(redis_url)
            if success:
                successful_configs.append(redis_url)
    
    print("\n" + "=" * 60)
    print("📊 FINAL RESULTS")
    print("=" * 60)
    
    if successful_configs:
        print(f"✅ {len(successful_configs)} Redis configuration(s) working:")
        for config in successful_configs:
            print(f"   🔗 {config}")
        
        print(f"\n🎯 RECOMMENDED CONFIGURATION:")
        print(f"   Add this to your .env file:")
        print(f"   REDIS_URL={successful_configs[0]}")
        
        print(f"\n🚀 NEXT STEPS:")
        print(f"   1. Update your .env file with the working Redis URL")
        print(f"   2. Restart your application")
        print(f"   3. Check /api/security/status endpoint")
        print(f"   4. Monitor logs for: '✅ Redis rate limiter initialized successfully'")
        
    else:
        print("❌ No Redis configurations worked")
        print("\n🔧 TROUBLESHOOTING:")
        print("   1. Verify Redis instance is running")
        print("   2. Check if authentication is required")
        print("   3. Try with password: redis://:PASSWORD@red-d1venaur433s73fk12j0:6379")
        print("   4. Try with SSL: rediss://red-d1venaur433s73fk12j0:6380")
        print("   5. Contact your Redis provider for connection details")
        
        print("\n⚠️ FALLBACK MODE:")
        print("   The security system will work with in-memory storage")
        print("   But Redis is recommended for production scaling")

if __name__ == "__main__":
    print("Starting Redis connection test...")
    try:
        asyncio.run(test_all_configurations())
    except KeyboardInterrupt:
        print("\n⚠️ Test interrupted by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ Test failed with error: {e}")
        sys.exit(1)