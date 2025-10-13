# Load Testing Suite

Comprehensive load and stress testing for Wheels & Wins backend.

## Overview

This test suite validates that the system meets Week 3 performance targets:
- **Concurrent Users**: 100+ simultaneous WebSocket connections
- **P95 Latency**: < 2 seconds under load
- **Query Performance**: P95 < 100ms for database queries
- **Success Rate**: > 99% for all operations

## Test Suites

### 1. WebSocket Load Test (`websocket_load_test.py`)

Tests concurrent WebSocket connections and message throughput.

**Usage**:
```bash
# Quick test (10 users, 60 seconds)
python backend/tests/load/websocket_load_test.py

# Full load test (100 users, 5 minutes)
python backend/tests/load/websocket_load_test.py --users 100 --duration 300

# Stress test (200 users, 10 minutes)
python backend/tests/load/websocket_load_test.py --users 200 --duration 600 --url wss://pam-backend.onrender.com/api/v1/pam

# With authentication
python backend/tests/load/websocket_load_test.py --users 50 --token YOUR_JWT_TOKEN
```

**Metrics Collected**:
- Connection success rate
- Connection time (min, max, mean, p95, p99)
- Message latency (min, max, mean, p95, p99)
- Message delivery rate
- Throughput (connections/sec, messages/sec)

**Targets**:
- ✅ 100+ concurrent users
- ✅ P95 latency < 2 seconds
- ✅ Connection success rate > 95%

### 2. Database Stress Test (`database_stress_test.py`)

Tests database performance under high query load.

**Usage**:
```bash
# Quick test (1000 queries)
python backend/tests/load/database_stress_test.py

# Full stress test (10,000 queries)
python backend/tests/load/database_stress_test.py --queries 10000

# Heavy load (50,000 queries, 50 workers)
python backend/tests/load/database_stress_test.py --queries 50000 --workers 50

# Custom database
python backend/tests/load/database_stress_test.py --db postgresql://user:pass@host/db
```

**Metrics Collected**:
- Query success rate
- Query execution time (min, max, mean, p95, p99)
- Connection pool performance
- Throughput (queries/sec)

**Query Mix**:
- 80% reads (SELECT queries with RLS)
- 20% writes (INSERT/UPDATE operations)

**Targets**:
- ✅ P95 query time < 100ms
- ✅ Success rate > 99%
- ✅ Stable performance under load

### 3. Combined Load Test (Future)

Tests full system under realistic load combining WebSocket and database stress.

## Installation

Install required dependencies:

```bash
pip install websockets psycopg2-binary pytest
```

## Running Tests

### Local Development

1. Start backend server:
```bash
cd backend
uvicorn app.main:app --reload
```

2. Run tests:
```bash
# WebSocket test
python backend/tests/load/websocket_load_test.py --users 10

# Database test
python backend/tests/load/database_stress_test.py --queries 1000
```

### Staging Environment

```bash
# WebSocket test against staging
python backend/tests/load/websocket_load_test.py \
  --url wss://wheels-wins-backend-staging.onrender.com/api/v1/pam \
  --users 100 \
  --duration 300

# Database test against staging
python backend/tests/load/database_stress_test.py \
  --db $STAGING_DATABASE_URL \
  --queries 10000
```

### Production Environment

⚠️ **WARNING**: Only run load tests on production during scheduled maintenance windows or with explicit approval.

```bash
# WebSocket test against production (LOW LOAD)
python backend/tests/load/websocket_load_test.py \
  --url wss://pam-backend.onrender.com/api/v1/pam \
  --users 20 \
  --duration 60
```

## CI/CD Integration

### GitHub Actions

```yaml
name: Load Tests
on:
  schedule:
    - cron: '0 0 * * 0'  # Weekly on Sunday
  workflow_dispatch:  # Manual trigger

jobs:
  load-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Setup Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.11'
      - name: Install dependencies
        run: |
          pip install websockets psycopg2-binary
      - name: Run WebSocket load test
        run: |
          python backend/tests/load/websocket_load_test.py \
            --url ${{ secrets.STAGING_WS_URL }} \
            --users 100 \
            --duration 300
      - name: Run database stress test
        run: |
          python backend/tests/load/database_stress_test.py \
            --db ${{ secrets.STAGING_DB_URL }} \
            --queries 10000
```

## Interpreting Results

### Success Criteria

**WebSocket Load Test**:
- ✅ **PASS**: 100+ concurrent users, P95 < 2s, success rate > 95%
- ⚠️  **WARNING**: 50-99 users OR P95 2-3s OR success rate 90-95%
- ❌ **FAIL**: < 50 users OR P95 > 3s OR success rate < 90%

**Database Stress Test**:
- ✅ **PASS**: P95 < 100ms, success rate > 99%
- ⚠️  **WARNING**: P95 100-200ms OR success rate 95-99%
- ❌ **FAIL**: P95 > 200ms OR success rate < 95%

### Common Issues

#### High Latency

**Symptoms**: P95 > 2 seconds

**Possible Causes**:
- Database query optimization needed
- LLM API slow responses
- Insufficient server resources
- Network latency

**Solutions**:
- Add database indexes
- Implement caching
- Scale horizontally
- Use CDN

#### Low Success Rate

**Symptoms**: < 95% success rate

**Possible Causes**:
- Connection pool exhaustion
- Resource limits (CPU, memory)
- Database deadlocks
- Rate limiting too aggressive

**Solutions**:
- Increase connection pool size
- Scale vertically or horizontally
- Optimize queries to reduce lock contention
- Adjust rate limits

#### Connection Timeouts

**Symptoms**: Users fail to connect

**Possible Causes**:
- WebSocket timeout too short
- Server overloaded
- Network issues

**Solutions**:
- Increase WebSocket timeout
- Add more backend instances
- Check network configuration

## Performance Optimization Tips

### Database

1. **Add Indexes**: Check slow query log and add indexes
2. **Connection Pooling**: Use pgBouncer for production
3. **Query Optimization**: Use EXPLAIN ANALYZE
4. **RLS Performance**: Ensure RLS policies use indexed columns

### WebSocket

1. **Keepalive**: Implement ping/pong for connection stability
2. **Message Batching**: Group small messages
3. **Compression**: Enable WebSocket compression
4. **Load Balancing**: Use sticky sessions

### Backend

1. **Async Operations**: Keep I/O operations async
2. **Caching**: Cache frequently accessed data
3. **Rate Limiting**: Protect against abuse
4. **Circuit Breakers**: Prevent cascading failures

## Monitoring Integration

### Metrics to Track

**Application**:
- Request rate (requests/sec)
- Error rate (errors/sec)
- Response time (p50, p95, p99)
- Active connections

**Database**:
- Query duration
- Connection pool usage
- Cache hit rate
- Deadlocks

**Infrastructure**:
- CPU usage
- Memory usage
- Network I/O
- Disk I/O

### Tools

- **Sentry**: Error tracking and performance monitoring
- **Datadog**: Infrastructure and application monitoring
- **Supabase Dashboard**: Database metrics
- **Render Metrics**: Backend performance

## Next Steps

1. Run baseline tests on staging
2. Identify performance bottlenecks
3. Implement optimizations
4. Re-run tests to validate improvements
5. Set up continuous monitoring
6. Schedule regular load tests (weekly)

---

**Last Updated**: January 10, 2025
**Maintained By**: Wheels & Wins DevOps Team
