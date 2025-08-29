# Health Monitoring Documentation

## Overview

The Wheels & Wins PAM API provides comprehensive health monitoring endpoints for tracking system status, performance metrics, and service dependencies. These endpoints are designed for use by monitoring systems, load balancers, and operations teams.

## Table of Contents

1. [Health Check Endpoints](#health-check-endpoints)
2. [Monitoring Integration](#monitoring-integration)
3. [Response Formats](#response-formats)
4. [Usage Examples](#usage-examples)
5. [Alerting Thresholds](#alerting-thresholds)

## Health Check Endpoints

### Basic Health Check

**Endpoint:** `GET /health`

Simple health check for uptime monitoring.

```json
{
  "status": "healthy",
  "service": "wheels-wins-pam-api",
  "version": "1.0.0",
  "environment": "production",
  "timestamp": "2025-01-08T12:00:00Z"
}
```

### Ping Check

**Endpoint:** `GET /health/ping`

Minimal ping endpoint for network connectivity checks.

```json
{
  "pong": true
}
```

### PAM Service Health

**Endpoint:** `GET /health/pam`

Comprehensive PAM service health check including all dependencies.

```json
{
  "status": "healthy",
  "checks": {
    "openai": {
      "status": "healthy",
      "configured": true,
      "model": "gpt-4-turbo-preview"
    },
    "tts": {
      "status": "healthy",
      "enabled": true,
      "primary_engine": "edge",
      "fallback_enabled": true
    },
    "websocket": {
      "status": "healthy",
      "enabled": true,
      "max_connections": 1000
    },
    "cache": {
      "status": "healthy",
      "type": "redis",
      "connected": true
    },
    "database": {
      "status": "healthy",
      "connected": true
    }
  },
  "issues": [],
  "response_time_ms": 45.2,
  "timestamp": "2025-01-08T12:00:00Z"
}
```

### System Resources

**Endpoint:** `GET /health/system`

System resource utilization metrics.

```json
{
  "status": "healthy",
  "checks": {
    "cpu": {
      "status": "healthy",
      "usage_percent": 45.2,
      "cores": 8
    },
    "memory": {
      "status": "healthy",
      "usage_percent": 62.3,
      "available_gb": 5.4,
      "total_gb": 16.0
    },
    "disk": {
      "status": "healthy",
      "usage_percent": 73.1,
      "free_gb": 120.5,
      "total_gb": 500.0
    },
    "process": {
      "status": "healthy",
      "memory_mb": 512.3,
      "threads": 24,
      "uptime_seconds": 86400
    }
  },
  "issues": [],
  "timestamp": "2025-01-08T12:00:00Z"
}
```

### Circuit Breakers

**Endpoint:** `GET /health/circuit-breakers`

Circuit breaker states for fault tolerance monitoring.

```json
{
  "status": "healthy",
  "breakers": {
    "tts_edge": {
      "state": "CLOSED",
      "failure_count": 0,
      "success_count": 1523,
      "last_failure": null,
      "status": "healthy"
    },
    "tts_coqui": {
      "state": "HALF_OPEN",
      "failure_count": 2,
      "success_count": 5,
      "last_failure": "2025-01-08T11:55:00Z",
      "status": "degraded"
    }
  },
  "issues": [],
  "timestamp": "2025-01-08T12:00:00Z"
}
```

### Rate Limiting

**Endpoint:** `GET /health/rate-limiting`

Rate limiting system status.

```json
{
  "status": "healthy",
  "checks": {
    "enabled": true,
    "backend": {
      "status": "healthy",
      "type": "redis",
      "connected": true
    },
    "limits": {
      "user_per_minute": 60,
      "user_per_hour": 1000,
      "user_per_day": 10000
    }
  },
  "issues": [],
  "timestamp": "2025-01-08T12:00:00Z"
}
```

### Redis Health

**Endpoint:** `GET /health/redis`

Redis cache and session store health.

```json
{
  "timestamp": "2025-01-08T12:00:00Z",
  "configuration": {
    "settings_redis_url": true,
    "env_redis_url": true,
    "settings_url_preview": "redis://***",
    "env_url_preview": "redis://***"
  },
  "cache_service": {
    "initialized": true
  },
  "connection": {
    "status": "connected",
    "ping": "successful",
    "redis_version": "7.0.5",
    "connected_clients": 12,
    "used_memory_human": "45.2M"
  },
  "healthy": true
}
```

### Comprehensive Health

**Endpoint:** `GET /health/all`

Aggregated health check of all services.

```json
{
  "status": "healthy",
  "checks": {
    "pam": { "status": "healthy", ... },
    "system": { "status": "healthy", ... },
    "circuit_breakers": { "status": "healthy", ... },
    "rate_limiting": { "status": "healthy", ... },
    "redis": { "healthy": true, ... }
  },
  "issues": [],
  "metrics": {
    "total_checks": 5,
    "healthy": 5,
    "degraded": 0,
    "unhealthy": 0
  },
  "response_time_ms": 125.3,
  "timestamp": "2025-01-08T12:00:00Z"
}
```

**HTTP Status Codes:**
- `200 OK` - Service is healthy or degraded but operational
- `503 Service Unavailable` - Service is unhealthy

### Detailed Health

**Endpoint:** `GET /health/detailed`

Legacy detailed health check (backward compatibility).

### Kubernetes Probes

#### Readiness Probe

**Endpoint:** `GET /health/ready`

Indicates if the service is ready to accept traffic.

```json
{
  "status": "ready"
}
```

Returns `503` if critical services are unavailable.

#### Liveness Probe

**Endpoint:** `GET /health/live`

Indicates if the service is alive and should not be restarted.

```json
{
  "status": "alive",
  "timestamp": "2025-01-08T12:00:00Z"
}
```

### Prometheus Metrics

**Endpoint:** `GET /health/metrics`

Prometheus-compatible metrics endpoint.

```
# HELP cpu_usage_percent CPU usage percentage
# TYPE cpu_usage_percent gauge
cpu_usage_percent 45.2

# HELP memory_usage_percent Memory usage percentage
# TYPE memory_usage_percent gauge
memory_usage_percent 62.3

# HELP disk_usage_percent Disk usage percentage
# TYPE disk_usage_percent gauge
disk_usage_percent 73.1

# HELP process_memory_bytes Process memory usage in bytes
# TYPE process_memory_bytes gauge
process_memory_bytes 536870912

# HELP process_threads Number of process threads
# TYPE process_threads gauge
process_threads 24

# HELP uptime_seconds Application uptime in seconds
# TYPE uptime_seconds counter
uptime_seconds 86400
```

## Monitoring Integration

### Prometheus Configuration

```yaml
scrape_configs:
  - job_name: 'wheels-wins-pam'
    scrape_interval: 30s
    metrics_path: '/health/metrics'
    static_configs:
      - targets: ['pam-api.wheelswins.com:8000']
```

### Kubernetes Configuration

```yaml
apiVersion: v1
kind: Pod
spec:
  containers:
  - name: pam-api
    livenessProbe:
      httpGet:
        path: /health/live
        port: 8000
      initialDelaySeconds: 30
      periodSeconds: 10
    readinessProbe:
      httpGet:
        path: /health/ready
        port: 8000
      initialDelaySeconds: 10
      periodSeconds: 5
```

### Load Balancer Configuration

```nginx
upstream pam_backend {
    server backend1:8000 max_fails=3 fail_timeout=30s;
    server backend2:8000 max_fails=3 fail_timeout=30s;
}

location /health {
    proxy_pass http://pam_backend;
    proxy_read_timeout 5s;
}
```

## Response Formats

### Health Status Values

- `healthy` - All checks passing, service fully operational
- `degraded` - Some non-critical checks failing, service operational with reduced capacity
- `unhealthy` - Critical checks failing, service not operational

### Common Response Fields

- `status` - Overall health status (healthy/degraded/unhealthy)
- `checks` - Individual component health checks
- `issues` - List of current issues or warnings
- `response_time_ms` - Time taken to perform health checks
- `timestamp` - ISO 8601 timestamp of the check

## Usage Examples

### cURL Examples

```bash
# Basic health check
curl https://api.wheelswins.com/health

# PAM service health
curl https://api.wheelswins.com/health/pam

# System resources
curl https://api.wheelswins.com/health/system

# Comprehensive health
curl https://api.wheelswins.com/health/all

# Prometheus metrics
curl https://api.wheelswins.com/health/metrics
```

### Python Examples

```python
import requests

# Check if service is healthy
response = requests.get("https://api.wheelswins.com/health/all")
health_data = response.json()

if health_data["status"] == "healthy":
    print("Service is healthy")
elif health_data["status"] == "degraded":
    print(f"Service degraded: {health_data['issues']}")
else:
    print(f"Service unhealthy: {health_data['issues']}")
```

### JavaScript Examples

```javascript
// Health check with retry
async function checkHealth(maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch('https://api.wheelswins.com/health/pam');
      const data = await response.json();
      
      if (data.status === 'healthy') {
        return { healthy: true, data };
      }
      
      // Wait before retry if degraded
      if (data.status === 'degraded' && i < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, 5000));
        continue;
      }
      
      return { healthy: false, data };
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }
}
```

## Alerting Thresholds

### Critical Alerts

Trigger immediate alerts when:
- Overall status is `unhealthy`
- Database connection fails
- OpenAI API is unavailable
- Redis connection fails
- CPU usage > 90%
- Memory usage > 90%
- Disk usage > 95%

### Warning Alerts

Trigger warning alerts when:
- Overall status is `degraded`
- Any circuit breaker is OPEN
- Response time > 1000ms
- CPU usage > 75%
- Memory usage > 80%
- Disk usage > 85%

### Alert Configuration Example

```yaml
# Prometheus AlertManager rules
groups:
  - name: pam_health
    rules:
      - alert: PAMServiceUnhealthy
        expr: up{job="wheels-wins-pam"} == 0
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "PAM service is unhealthy"
          description: "PAM API health check failing for 2 minutes"
      
      - alert: HighCPUUsage
        expr: cpu_usage_percent > 75
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High CPU usage detected"
          description: "CPU usage above 75% for 5 minutes"
      
      - alert: HighMemoryUsage
        expr: memory_usage_percent > 80
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High memory usage detected"
          description: "Memory usage above 80% for 5 minutes"
```

## Best Practices

### Health Check Frequency

- **Basic health (`/health`)**: Every 10-30 seconds
- **Comprehensive health (`/health/all`)**: Every 60 seconds
- **System resources (`/health/system`)**: Every 30 seconds
- **Prometheus metrics (`/health/metrics`)**: Every 30 seconds

### Timeout Configuration

- Set health check timeout to 5 seconds
- Retry failed checks 3 times with exponential backoff
- Mark service unhealthy after 3 consecutive failures

### Security Considerations

- Health endpoints are public by default
- Sensitive information (API keys, passwords) is never exposed
- Consider adding authentication for detailed health endpoints in production
- Rate limit health check endpoints to prevent abuse

### Performance Impact

- Health checks are designed to be lightweight
- Cached results where appropriate (TTL: 5 seconds)
- Parallel execution of multiple checks
- Response time monitoring included

## Troubleshooting

### Common Issues

1. **Health check timeouts**
   - Check network connectivity
   - Verify service is not overloaded
   - Check database/Redis connection pools

2. **Degraded status with no clear issues**
   - Check circuit breaker states
   - Review rate limiting configuration
   - Check TTS fallback status

3. **High response times**
   - Check database query performance
   - Review Redis connection latency
   - Monitor concurrent request load

### Debug Mode

Enable debug logging for health checks:

```python
# In settings
LOG_LEVEL=DEBUG
HEALTH_CHECK_DEBUG=true
```

### Health Check Testing

```bash
# Test all health endpoints
./scripts/test_health_endpoints.sh

# Monitor health status continuously
watch -n 5 'curl -s https://api.wheelswins.com/health/all | jq .status'

# Check specific component
curl https://api.wheelswins.com/health/pam | jq '.checks.openai'
```

## Support

For health monitoring issues:
1. Check this documentation
2. Review application logs
3. Check monitoring dashboards
4. Contact the operations team

---

Last Updated: January 2025
Version: 1.0.0