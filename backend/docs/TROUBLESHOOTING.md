
# PAM Backend Troubleshooting Guide

## Common Issues and Solutions

This guide covers the most frequently encountered issues when developing, deploying, or running the PAM Backend, along with their solutions.

## Table of Contents

1. [Startup Issues](#startup-issues)
2. [Database Connection Problems](#database-connection-problems)
3. [Authentication Errors](#authentication-errors)
4. [API Response Issues](#api-response-issues)
5. [Performance Problems](#performance-problems)
6. [Docker and Deployment Issues](#docker-and-deployment-issues)
7. [Testing Issues](#testing-issues)
8. [External API Integration Problems](#external-api-integration-problems)
9. [Debugging Tools](#debugging-tools)
10. [Getting Help](#getting-help)

## Startup Issues

### Issue: Application won't start

**Symptoms:**
- FastAPI server fails to start
- Port already in use errors
- Module import errors

**Solutions:**

1. **Check if port is already in use:**
```bash
# Find process using port 8000
lsof -i :8000
# Kill the process
kill -9 <PID>

# Or use a different port
uvicorn app.main:app --reload --port 8001
```

2. **Verify Python path and imports:**
```bash
# Check if app module is importable
python -c "from app.main import app; print('Import successful')"

# Add current directory to Python path if needed
export PYTHONPATH="${PYTHONPATH}:$(pwd)"
```

3. **Check environment variables:**
```bash
# Verify required environment variables are set
python -c "
import os
required_vars = ['SUPABASE_URL', 'SUPABASE_KEY', 'OPENAI_API_KEY']
missing = [var for var in required_vars if not os.getenv(var)]
if missing:
    print(f'Missing environment variables: {missing}')
else:
    print('All required environment variables are set')
"
```

### Issue: Import errors on startup

**Symptoms:**
- `ModuleNotFoundError: No module named 'app'`
- `ImportError: cannot import name 'X' from 'Y'`

**Solutions:**

1. **Install missing dependencies:**
```bash
pip install -r requirements.txt
pip install -r requirements-dev.txt
```

2. **Check virtual environment:**
```bash
# Verify you're in the correct virtual environment
which python
pip list | grep fastapi
```

3. **Fix import paths:**
```python
# Use absolute imports instead of relative
from app.services.chat_service import ChatService  # Good
from .services.chat_service import ChatService     # Avoid in main modules
```

## Database Connection Problems

### Issue: Supabase connection fails

**Symptoms:**
- `Connection refused` errors
- `Authentication failed` errors
- Timeout errors when querying database

**Diagnostic Steps:**
```bash
# Test Supabase connection
python -c "
from app.database.supabase_client import get_supabase_client
try:
    client = get_supabase_client()
    result = client.table('profiles').select('count').execute()
    print('✅ Database connection successful')
    print(f'Result: {result}')
except Exception as e:
    print(f'❌ Database connection failed: {e}')
"
```

**Solutions:**

1. **Verify Supabase credentials:**
```bash
# Check environment variables
echo "SUPABASE_URL: $SUPABASE_URL"
echo "SUPABASE_KEY: $SUPABASE_KEY"

# Verify URL format (should include https://)
# Should look like: https://your-project.supabase.co
```

2. **Check Supabase project status:**
- Log into Supabase dashboard
- Verify project is not paused (free tier limitation)
- Check database activity in Supabase dashboard

3. **Test direct connection:**
```bash
# Use psql to test PostgreSQL connection directly
psql "postgresql://postgres:[YOUR-PASSWORD]@db.your-project.supabase.co:5432/postgres"
```

### Issue: Row Level Security (RLS) blocking queries

**Symptoms:**
- Empty results when data should exist
- `insufficient_privilege` errors
- Queries work in Supabase dashboard but not in app

**Solutions:**

1. **Check RLS policies:**
```sql
-- In Supabase SQL Editor, check existing policies
SELECT schemaname, tablename, policyname, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'your_table_name';
```

2. **Verify user authentication:**
```python
# In your endpoint, check if user is properly authenticated
from app.core.security import get_current_user

@router.get("/protected-endpoint")
async def protected_endpoint(current_user = Depends(get_current_user)):
    print(f"Current user: {current_user}")  # Should not be None
    # ... rest of your code
```

3. **Test with service key (temporarily):**
```python
# For debugging only - use service key to bypass RLS
from supabase import create_client
client = create_client(supabase_url, supabase_service_key)  # Service key, not anon key
```

## Authentication Errors

### Issue: JWT token validation fails

**Symptoms:**
- `Invalid token` errors
- `Token expired` errors
- Authentication works sometimes but not always

**Diagnostic Steps:**
```python
# Test JWT token validation
import jwt
from app.core.config import settings

def debug_jwt_token(token: str):
    try:
        # Decode without verification first to see content
        unverified = jwt.decode(token, options={"verify_signature": False})
        print(f"Token content: {unverified}")
        
        # Now verify
        verified = jwt.decode(
            token, 
            settings.JWT_SECRET_KEY, 
            algorithms=[settings.JWT_ALGORITHM]
        )
        print(f"✅ Token valid: {verified}")
    except jwt.ExpiredSignatureError:
        print("❌ Token expired")
    except jwt.InvalidTokenError as e:
        print(f"❌ Invalid token: {e}")

# Usage
debug_jwt_token("your-jwt-token-here")
```

**Solutions:**

1. **Check JWT configuration:**
```python
# Verify JWT settings in config
from app.core.config import settings
print(f"JWT Secret Key set: {bool(settings.JWT_SECRET_KEY)}")
print(f"JWT Algorithm: {settings.JWT_ALGORITHM}")
print(f"JWT Expire Minutes: {settings.JWT_EXPIRE_MINUTES}")
```

2. **Synchronize time:**
```bash
# JWT tokens are time-sensitive
# Ensure system time is correct
date
sudo ntpdate -s time.nist.gov  # Linux
```

3. **Check token format:**
```bash
# Token should be in format: Bearer <token>
# Not: <token> or Bearer<token>
curl -H "Authorization: Bearer your-token-here" http://localhost:8000/api/protected
```

### Issue: Supabase Auth integration problems

**Symptoms:**
- User authentication works in frontend but not backend
- `User not found` errors
- Auth state inconsistency

**Solutions:**

1. **Verify Supabase Auth setup:**
```python
# Check if user exists in Supabase auth
from app.database.supabase_client import get_supabase_client

client = get_supabase_client()
try:
    # This requires service key, not anon key
    users = client.auth.admin.list_users()
    print(f"Users in auth: {len(users.users)}")
except Exception as e:
    print(f"Error listing users: {e}")
```

2. **Check RLS policies for auth:**
```sql
-- Verify auth-based RLS policies
CREATE POLICY "Users can view own data" 
ON profiles FOR SELECT 
USING (auth.uid() = id);
```

## API Response Issues

### Issue: Slow API responses

**Symptoms:**
- API endpoints taking >5 seconds to respond
- Timeout errors from frontend
- High memory usage

**Diagnostic Steps:**
```python
# Add timing middleware to measure response times
import time
from fastapi import Request

@app.middleware("http")
async def add_process_time_header(request: Request, call_next):
    start_time = time.time()
    response = await call_next(request)
    process_time = time.time() - start_time
    response.headers["X-Process-Time"] = str(process_time)
    if process_time > 2.0:  # Log slow requests
        print(f"SLOW REQUEST: {request.url} took {process_time:.2f}s")
    return response
```

**Solutions:**

1. **Optimize database queries:**
```python
# Instead of multiple individual queries
expenses = []
for category in categories:
    exp = await client.table('expenses').select('*').eq('category', category).execute()
    expenses.extend(exp.data)

# Use single query with filter
expenses = await client.table('expenses').select('*').in_('category', categories).execute()
```

2. **Implement caching:**
```python
from app.services.cache import CacheService

cache = CacheService()

@router.get("/expensive-endpoint")
async def expensive_endpoint(user_id: str):
    cache_key = f"expensive_data:{user_id}"
    
    # Try cache first
    cached_result = await cache.get(cache_key)
    if cached_result:
        return cached_result
    
    # Compute expensive result
    result = await expensive_computation(user_id)
    
    # Cache for 5 minutes
    await cache.set(cache_key, result, ttl=300)
    return result
```

3. **Use background tasks for heavy operations:**
```python
from fastapi import BackgroundTasks

@router.post("/trigger-heavy-task")
async def trigger_heavy_task(background_tasks: BackgroundTasks):
    background_tasks.add_task(heavy_computation_function)
    return {"message": "Task started"}
```

### Issue: CORS errors

**Symptoms:**
- `Access-Control-Allow-Origin` errors in browser
- Preflight request failures
- API works in Postman but not browser

**Solutions:**

1. **Check CORS configuration:**
```python
# In app/main.py
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "https://your-frontend-domain.com"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["*"],
)
```

2. **Debug CORS issues:**
```bash
# Test preflight request
curl -X OPTIONS \
  -H "Origin: http://localhost:3000" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Content-Type" \
  http://localhost:8000/api/v1/chat
```

## Performance Problems

### Issue: High memory usage

**Symptoms:**
- Application memory usage constantly growing
- Out of memory errors
- Container restarts due to memory limits

**Diagnostic Steps:**
```python
# Memory profiling with memory_profiler
# pip install memory-profiler psutil

import psutil
import os

def log_memory_usage():
    process = psutil.Process(os.getpid())
    memory_info = process.memory_info()
    print(f"Memory usage: {memory_info.rss / 1024 / 1024:.2f} MB")

# Add to your endpoints
@router.get("/debug/memory")
async def debug_memory():
    log_memory_usage()
    return {"status": "logged"}
```

**Solutions:**

1. **Check for memory leaks:**
```python
# Use objgraph to find memory leaks
# pip install objgraph

import objgraph
import gc

@router.get("/debug/objects")
async def debug_objects():
    gc.collect()  # Force garbage collection
    objgraph.show_most_common_types(limit=10)
    return {"status": "objects logged"}
```

2. **Optimize data handling:**
```python
# Instead of loading all data into memory
all_expenses = await client.table('expenses').select('*').execute()
for expense in all_expenses.data:  # Large dataset in memory
    process_expense(expense)

# Use pagination or streaming
page_size = 100
offset = 0
while True:
    batch = await client.table('expenses').select('*').range(offset, offset + page_size - 1).execute()
    if not batch.data:
        break
    for expense in batch.data:
        process_expense(expense)
    offset += page_size
```

### Issue: High CPU usage

**Symptoms:**
- CPU usage consistently above 80%
- Slow response times under load
- High load averages

**Solutions:**

1. **Profile CPU usage:**
```python
# Use cProfile for CPU profiling
import cProfile
import pstats

def profile_endpoint():
    profiler = cProfile.Profile()
    profiler.enable()
    
    # Your expensive function here
    result = expensive_function()
    
    profiler.disable()
    stats = pstats.Stats(profiler)
    stats.sort_stats('cumulative')
    stats.print_stats(10)  # Top 10 functions
    
    return result
```

2. **Optimize expensive operations:**
```python
# Use async for I/O bound operations
import asyncio

# Instead of blocking operations
def blocking_operation():
    time.sleep(1)  # Blocks the event loop
    return "result"

# Use async
async def async_operation():
    await asyncio.sleep(1)  # Non-blocking
    return "result"
```

## Docker and Deployment Issues

### Issue: Docker container won't start

**Symptoms:**
- Container exits immediately
- Build failures
- Port binding errors

**Diagnostic Steps:**
```bash
# Check container logs
docker logs pam-backend

# Check if container is running
docker ps -a

# Inspect container
docker inspect pam-backend

# Run container interactively for debugging
docker run -it --entrypoint /bin/bash pam-backend
```

**Solutions:**

1. **Fix Docker build issues:**
```bash
# Build with no cache to see full output
docker build --no-cache -t pam-backend .

# Check if base image is accessible
docker pull python:3.11-slim

# Verify Dockerfile syntax
docker build --dry-run -t pam-backend .
```

2. **Fix port binding issues:**
```bash
# Check what's using the port
netstat -tulpn | grep :8000

# Use different port
docker run -p 8001:8000 pam-backend
```

### Issue: Environment variables not loading

**Symptoms:**
- Configuration not applied
- Default values used instead of environment values
- `KeyError` for expected environment variables

**Solutions:**

1. **Check environment variable loading:**
```bash
# In container, check environment
docker exec pam-backend env | grep -E "(SUPABASE|OPENAI|SECRET)"

# Check if .env file is being read
docker exec pam-backend ls -la /app/.env
```

2. **Debug configuration loading:**
```python
# Add debug output to config.py
from app.core.config import settings

print(f"Environment: {settings.ENVIRONMENT}")
print(f"Debug mode: {settings.DEBUG}")
print(f"Supabase URL set: {bool(settings.SUPABASE_URL)}")
```

## Testing Issues

### Issue: Tests failing inconsistently

**Symptoms:**
- Tests pass locally but fail in CI
- Intermittent test failures
- Database state issues between tests

**Solutions:**

1. **Fix test isolation:**
```python
# Ensure proper test cleanup
@pytest.fixture(autouse=True)
async def cleanup_database():
    # Setup
    yield
    # Cleanup after each test
    client = get_supabase_client()
    await client.table('test_table').delete().neq('id', '').execute()
```

2. **Fix async test issues:**
```python
# Ensure proper async test setup
import pytest
import asyncio

@pytest.fixture(scope="session")
def event_loop():
    """Create an instance of the default event loop for the test session."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()
```

### Issue: Mock objects not working correctly

**Symptoms:**
- Mocks not being called
- External APIs still being called during tests
- Assertion errors on mock calls

**Solutions:**

1. **Fix mock patching:**
```python
# Correct way to patch
from unittest.mock import patch, AsyncMock

# Patch where it's used, not where it's defined
@patch('app.services.chat_service.openai_client')  # Where it's imported
async def test_chat_service(mock_openai):
    mock_openai.chat.completions.create = AsyncMock(return_value=mock_response)
    # Test code here
```

2. **Verify mock assertions:**
```python
# Be specific about what you're testing
mock_openai.chat.completions.create.assert_called_once_with(
    model="gpt-3.5-turbo",
    messages=[{"role": "user", "content": "test message"}]
)
```

## External API Integration Problems

### Issue: OpenAI API errors

**Symptoms:**
- `Rate limit exceeded` errors
- `Invalid API key` errors
- Timeout errors

**Diagnostic Steps:**
```python
# Test OpenAI API directly
import openai
from app.core.config import settings

async def test_openai_connection():
    try:
        client = openai.AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
        response = await client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[{"role": "user", "content": "Hello"}],
            max_tokens=10
        )
        print("✅ OpenAI API working")
        print(f"Response: {response.choices[0].message.content}")
    except Exception as e:
        print(f"❌ OpenAI API error: {e}")

# Run the test
import asyncio
asyncio.run(test_openai_connection())
```

**Solutions:**

1. **Handle rate limiting:**
```python
import asyncio
from tenacity import retry, stop_after_attempt, wait_exponential

@retry(
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=4, max=10)
)
async def call_openai_with_retry(messages):
    return await openai_client.chat.completions.create(
        model="gpt-3.5-turbo",
        messages=messages
    )
```

2. **Implement fallback mechanisms:**
```python
async def generate_response(message: str):
    try:
        # Try OpenAI first
        return await call_openai(message)
    except openai.RateLimitError:
        # Fall back to cached responses or alternative
        return await get_fallback_response(message)
    except Exception as e:
        logger.error(f"OpenAI error: {e}")
        return "I'm sorry, I'm having trouble responding right now."
```

## Debugging Tools

### Application Monitoring

```python
# Add health check endpoint with detailed diagnostics
@router.get("/debug/health")
async def detailed_health_check():
    health_status = {}
    
    # Test database connection
    try:
        client = get_supabase_client()
        await client.table('profiles').select('count').execute()
        health_status['database'] = 'healthy'
    except Exception as e:
        health_status['database'] = f'unhealthy: {e}'
    
    # Test Redis connection
    try:
        from app.services.cache import CacheService
        cache = CacheService()
        await cache.set('health_check', 'ok', ttl=60)
        health_status['cache'] = 'healthy'
    except Exception as e:
        health_status['cache'] = f'unhealthy: {e}'
    
    # Test OpenAI API
    try:
        # Simple API test
        health_status['openai'] = 'healthy'  # Implement actual test
    except Exception as e:
        health_status['openai'] = f'unhealthy: {e}'
    
    return health_status
```

### Logging Configuration

```python
# Enhanced logging for debugging
import logging
import sys

# Configure detailed logging
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(name)s - %(levelname)s - [%(filename)s:%(lineno)d] - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler('debug.log')
    ]
)

# Add request/response logging
@app.middleware("http")
async def log_requests(request: Request, call_next):
    logger.info(f"Request: {request.method} {request.url}")
    logger.debug(f"Headers: {dict(request.headers)}")
    
    response = await call_next(request)
    
    logger.info(f"Response: {response.status_code}")
    return response
```

### Performance Monitoring

```python
# Add performance monitoring
import time
from collections import defaultdict

# Simple performance tracker
performance_stats = defaultdict(list)

@app.middleware("http")
async def track_performance(request: Request, call_next):
    start_time = time.time()
    response = await call_next(request)
    process_time = time.time() - start_time
    
    endpoint = f"{request.method} {request.url.path}"
    performance_stats[endpoint].append(process_time)
    
    # Log slow requests
    if process_time > 1.0:
        logger.warning(f"Slow request: {endpoint} took {process_time:.2f}s")
    
    return response

@router.get("/debug/performance")
async def get_performance_stats():
    stats = {}
    for endpoint, times in performance_stats.items():
        stats[endpoint] = {
            'count': len(times),
            'avg_time': sum(times) / len(times),
            'max_time': max(times),
            'min_time': min(times)
        }
    return stats
```

## Getting Help

### Information to Gather

When seeking help, please provide:

1. **Error messages** (full stack traces)
2. **Environment details** (Python version, OS, Docker version)
3. **Configuration** (sanitized .env file, no secrets)
4. **Steps to reproduce** the issue
5. **Expected vs actual behavior**
6. **Relevant logs** (application logs, container logs)

### Debug Information Script

```python
#!/usr/bin/env python3
"""
Script to gather debug information for troubleshooting.
Run: python debug_info.py
"""

import sys
import os
import platform
import subprocess
import json

def gather_debug_info():
    debug_info = {
        'system': {
            'python_version': sys.version,
            'platform': platform.platform(),
            'architecture': platform.architecture(),
        },
        'environment': {},
        'dependencies': {},
        'docker': {},
        'services': {}
    }
    
    # Environment variables (sanitized)
    env_vars = ['ENVIRONMENT', 'DEBUG', 'PYTHON_PATH']
    for var in env_vars:
        debug_info['environment'][var] = os.getenv(var, 'NOT_SET')
    
    # Check if sensitive vars are set (without revealing values)
    sensitive_vars = ['SUPABASE_URL', 'SUPABASE_KEY', 'OPENAI_API_KEY', 'SECRET_KEY']
    for var in sensitive_vars:
        debug_info['environment'][f'{var}_SET'] = bool(os.getenv(var))
    
    # Python dependencies
    try:
        import pkg_resources
        installed_packages = [f"{d.project_name}=={d.version}" for d in pkg_resources.working_set]
        debug_info['dependencies']['installed'] = installed_packages
    except Exception as e:
        debug_info['dependencies']['error'] = str(e)
    
    # Docker information
    try:
        docker_version = subprocess.check_output(['docker', '--version'], universal_newlines=True)
        debug_info['docker']['version'] = docker_version.strip()
        
        compose_version = subprocess.check_output(['docker-compose', '--version'], universal_newlines=True)
        debug_info['docker']['compose_version'] = compose_version.strip()
    except Exception as e:
        debug_info['docker']['error'] = str(e)
    
    # Service status
    try:
        from app.database.supabase_client import get_supabase_client
        client = get_supabase_client()
        # Simple connection test
        debug_info['services']['supabase'] = 'connected'
    except Exception as e:
        debug_info['services']['supabase'] = f'error: {e}'
    
    return debug_info

if __name__ == "__main__":
    info = gather_debug_info()
    print(json.dumps(info, indent=2))
```

### Common Commands for Troubleshooting

```bash
# System information
uname -a
python --version
pip --version
docker --version
docker-compose --version

# Check running services
docker ps
docker-compose ps

# View logs
docker logs pam-backend --tail 50
docker-compose logs backend

# Check resource usage
docker stats
df -h
free -h

# Network debugging
netstat -tulpn | grep :8000
curl -I http://localhost:8000/api/health

# Database connectivity
psql "postgresql://user:pass@host:5432/db" -c "SELECT 1;"

# Test API endpoints
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password"}'
```

### Support Channels

1. **Check documentation** - README.md, API.md, DEPLOYMENT.md
2. **Search existing issues** - GitHub issues, discussions
3. **Run health checks** - Use built-in diagnostic tools
4. **Create detailed bug report** - Include debug information
5. **Ask for help** - Team Slack, GitHub discussions

Remember: The more detailed information you provide, the faster we can help resolve the issue!
