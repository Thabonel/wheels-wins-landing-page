# 🔴 Redis Configuration Guide for Enhanced Security

## Your Redis Instance

You have Redis set up at: `red-d1venaur433s73fk12j0`

## Configuration Options

### Option 1: Basic Redis Connection (if no authentication required)
```bash
REDIS_URL=redis://red-d1venaur433s73fk12j0:6379
```

### Option 2: Redis with Authentication (most common for cloud services)
```bash
# If your Redis instance requires authentication
REDIS_URL=redis://:your-password@red-d1venaur433s73fk12j0:6379

# Or with username and password
REDIS_URL=redis://username:password@red-d1venaur433s73fk12j0:6379
```

### Option 3: Redis with TLS/SSL (for secure connections)
```bash
# For secure Redis connections
REDIS_URL=rediss://red-d1venaur433s73fk12j0:6380

# Or with authentication and TLS
REDIS_URL=rediss://:your-password@red-d1venaur433s73fk12j0:6380
```

### Option 4: Full Redis URL (if provided by your cloud service)
```bash
# If you have a complete Redis URL from your provider
REDIS_URL=redis://user:pass@red-d1venaur433s73fk12j0.example.com:6379/0
```

## Test Your Redis Connection

### 1. Test Redis Connection Directly
```bash
# Test basic connection (replace with your actual details)
redis-cli -h red-d1venaur433s73fk12j0 -p 6379 ping

# If authentication is required
redis-cli -h red-d1venaur433s73fk12j0 -p 6379 -a your-password ping

# Should return: PONG
```

### 2. Test from Python
Create a test file `test_redis.py`:

```python
import asyncio
import aioredis
import os

async def test_redis_connection():
    # Use your Redis URL
    redis_url = "redis://red-d1venaur433s73fk12j0:6379"  # Update this
    
    try:
        redis = aioredis.from_url(
            redis_url,
            encoding="utf-8",
            decode_responses=True,
            retry_on_timeout=True,
            socket_connect_timeout=10,
            socket_timeout=10
        )
        
        # Test basic operations
        await redis.ping()
        print("✅ Redis connection successful!")
        
        # Test set/get
        await redis.set("test_key", "test_value", ex=60)
        value = await redis.get("test_key")
        print(f"✅ Redis set/get test: {value}")
        
        # Test security monitoring operations
        await redis.zadd("test_threats", {"event1": 1234567890})
        threats = await redis.zrange("test_threats", 0, -1, withscores=True)
        print(f"✅ Redis sorted set test: {threats}")
        
        # Cleanup
        await redis.delete("test_key", "test_threats")
        await redis.close()
        
        print("🎉 All Redis tests passed!")
        
    except Exception as e:
        print(f"❌ Redis connection failed: {e}")
        print("💡 Check your REDIS_URL configuration")

if __name__ == "__main__":
    asyncio.run(test_redis_connection())
```

Run the test:
```bash
cd backend
python test_redis.py
```

## Common Redis Providers Configuration

### Render Redis
```bash
# Render typically provides URLs like:
REDIS_URL=redis://red-d1venaur433s73fk12j0:6379
# or with authentication:
REDIS_URL=redis://:password@red-d1venaur433s73fk12j0:6379
```

### Redis Cloud
```bash
REDIS_URL=redis://:password@red-d1venaur433s73fk12j0.redis.example.com:6379
```

### AWS ElastiCache
```bash
REDIS_URL=redis://red-d1venaur433s73fk12j0.abc123.cache.amazonaws.com:6379
```

### Upstash Redis
```bash
REDIS_URL=rediss://:password@red-d1venaur433s73fk12j0.upstash.io:6380
```

## Troubleshooting Redis Connection Issues

### Issue 1: Connection Timeout
```
Error: ConnectionError: Error connecting to Redis
```

**Solutions:**
- Verify the Redis host and port are correct
- Check if the Redis service is running
- Ensure firewall allows connections on the Redis port
- Try increasing timeout values:

```python
# In your enhanced_rate_limiter.py, update connection settings:
self.redis_client = aioredis.from_url(
    self.redis_url,
    encoding="utf-8",
    decode_responses=True,
    retry_on_timeout=True,
    socket_connect_timeout=30,  # Increased timeout
    socket_timeout=30,          # Increased timeout
    retry_on_error=[ConnectionError, TimeoutError]
)
```

### Issue 2: Authentication Failed
```
Error: AuthenticationError: Authentication required
```

**Solutions:**
- Add password to Redis URL: `redis://:password@host:port`
- Verify the password is correct
- Check if authentication is actually required

### Issue 3: SSL/TLS Required
```
Error: Connection terminated due to security policy
```

**Solutions:**
- Use `rediss://` instead of `redis://` for SSL connections
- Use port 6380 instead of 6379 for SSL
- Add SSL parameters if needed

## Production Configuration

For production deployment, use these environment variables:

```bash
# Basic configuration
REDIS_URL=redis://red-d1venaur433s73fk12j0:6379

# Enhanced configuration with connection pooling
REDIS_MAX_CONNECTIONS=20
REDIS_RETRY_ON_TIMEOUT=true
REDIS_SOCKET_CONNECT_TIMEOUT=10
REDIS_SOCKET_TIMEOUT=10
```

## Verify Security System Integration

Once Redis is configured, test the security system:

```bash
# 1. Start your application
uvicorn app.main:app --host 0.0.0.0 --port 8000

# 2. Check security status
curl http://localhost:8000/api/security/status

# 3. Test rate limiting (make multiple requests quickly)
for i in {1..10}; do curl http://localhost:8000/health; done

# 4. Check Redis for rate limiting data
redis-cli -h red-d1venaur433s73fk12j0 -p 6379 keys "rate_limit:*"
```

## Success Indicators

When Redis is properly configured, you should see these logs:

```
✅ Redis rate limiter initialized successfully
✅ Security monitoring Redis initialized
✅ Enhanced rate limiting enabled
✅ Security monitoring enabled
🛡️ Security score: 95-100/100
```

## Fallback Behavior

If Redis connection fails, the security system will:
- ✅ Continue operating with in-memory storage
- ⚠️ Log warnings about Redis unavailability
- 🔄 Automatically retry Redis connection
- 📊 Provide reduced but functional security monitoring

Your application will remain secure and operational even if Redis is temporarily unavailable.

---

## Next Steps

1. **Determine your exact Redis configuration** (check with your Redis provider)
2. **Update your `.env` file** with the correct `REDIS_URL`
3. **Test the connection** using the test script above
4. **Deploy and monitor** security system logs for confirmation

Need help determining the exact Redis configuration? Check your Redis provider's documentation or contact their support for the complete connection string.