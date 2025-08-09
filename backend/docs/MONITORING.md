
# PAM Backend Monitoring Documentation

## Overview

This document outlines the monitoring setup for the PAM backend, including metrics collection, alerting, and performance monitoring.

## Architecture

### Components

1. **Prometheus** - Metrics collection and storage
2. **Grafana** - Visualization and dashboards
3. **Sentry** - Error tracking and performance monitoring
4. **AlertManager** - Alert routing and management

### Metrics Collection

#### HTTP Metrics
- `http_requests_total` - Total HTTP requests by method, endpoint, and status
- `http_request_duration_seconds` - Request duration histogram

#### WebSocket Metrics
- `websocket_connections_active` - Active WebSocket connections
- `websocket_messages_total` - Total WebSocket messages by type and direction

#### Database Metrics
- `database_queries_total` - Total database queries by operation and table
- `database_query_duration_seconds` - Query duration histogram
- `database_connections_active` - Active database connections

#### Cache Metrics
- `cache_operations_total` - Cache operations by type and result
- `cache_hit_ratio` - Cache hit ratio gauge

#### System Metrics
- `system_cpu_usage_percent` - CPU usage percentage
- `system_memory_usage_percent` - Memory usage percentage
- `system_disk_usage_percent` - Disk usage percentage

#### Business Metrics
- `active_users_total` - Total active users
- `ai_requests_total` - AI service requests by service and status
- `ai_response_time_seconds` - AI service response time

## Monitoring Endpoints

### Metrics Endpoint
```
GET /api/metrics
```
Returns Prometheus-formatted metrics for scraping.

### Health Metrics
```
GET /api/health/metrics
```
Returns health check metrics in JSON format.

### Alert Status
```
GET /api/alerts/status
```
Returns current alert status and active alerts.

## Alerting Rules

### Critical Alerts

#### High Error Rate
- **Condition**: Error rate > 0.1 errors/second for 2 minutes
- **Severity**: Critical
- **Action**: Immediate investigation required

#### High Memory Usage
- **Condition**: Memory usage > 85% for 5 minutes
- **Severity**: Critical
- **Action**: Scale resources or investigate memory leaks

#### High AI Error Rate
- **Condition**: AI service error rate > 0.1 errors/second for 2 minutes
- **Severity**: Critical
- **Action**: Check AI service health and API keys

### Warning Alerts

#### High Response Time
- **Condition**: 95th percentile response time > 2 seconds for 5 minutes
- **Severity**: Warning
- **Action**: Performance investigation

#### High CPU Usage
- **Condition**: CPU usage > 80% for 5 minutes
- **Severity**: Warning
- **Action**: Monitor and consider scaling

#### Low Cache Hit Ratio
- **Condition**: Cache hit ratio < 80% for 5 minutes
- **Severity**: Warning
- **Action**: Review caching strategy

## Grafana Dashboards

### Main Dashboard Panels

1. **HTTP Request Rate** - Real-time request rate by endpoint
2. **HTTP Response Time** - Response time percentiles
3. **System Resources** - CPU, memory, and disk usage
4. **Database Metrics** - Query rate and connection count
5. **WebSocket Connections** - Active connection count
6. **Cache Hit Ratio** - Current cache performance
7. **Active Users** - Current active user count
8. **AI Request Rate** - AI service usage
9. **AI Response Time** - AI service performance

### Dashboard Access
- **URL**: `http://grafana:3000/d/pam-backend`
- **Refresh**: 30 seconds
- **Time Range**: Last 1 hour (configurable)

## Sentry Integration

### Error Tracking Features

- **Automatic Error Capture** - All unhandled exceptions
- **Performance Monitoring** - Transaction tracing
- **Release Tracking** - Error tracking by deployment
- **User Context** - Error attribution to specific users

### Configuration

```python
# Environment variables
SENTRY_DSN=your_sentry_dsn_here
SENTRY_ENVIRONMENT=production
SENTRY_RELEASE=pam-backend@1.0.0

# Sample rates
SENTRY_TRACES_SAMPLE_RATE=0.1  # 10% of transactions
SENTRY_PROFILES_SAMPLE_RATE=0.1  # 10% of profiles
```

### Error Categories

1. **HTTP Errors** - Request/response errors
2. **Database Errors** - Connection and query errors
3. **AI Service Errors** - External API failures
4. **WebSocket Errors** - Connection and message errors
5. **System Errors** - Resource and configuration errors

## Setup Instructions

### 1. Prometheus Setup

```bash
# Start Prometheus
docker run -d \
  --name prometheus \
  -p 9090:9090 \
  -v ./monitoring/prometheus:/etc/prometheus \
  prom/prometheus
```

### 2. Grafana Setup

```bash
# Start Grafana
docker run -d \
  --name grafana \
  -p 3000:3000 \
  -v ./monitoring/grafana:/var/lib/grafana \
  grafana/grafana
```

### 3. AlertManager Setup

```bash
# Start AlertManager
docker run -d \
  --name alertmanager \
  -p 9093:9093 \
  -v ./monitoring/alertmanager:/etc/alertmanager \
  prom/alertmanager
```

### 4. Application Configuration

```bash
# Set environment variables
export SENTRY_DSN="your_sentry_dsn"
export PROMETHEUS_ENABLED="true"
export METRICS_PORT="8000"
```

## Monitoring Best Practices

### 1. Metric Naming
- Use consistent naming conventions
- Include units in metric names
- Use labels for dimensions

### 2. Alert Configuration
- Set appropriate thresholds
- Include runbook links in alerts
- Use severity levels appropriately

### 3. Dashboard Design
- Group related metrics
- Use appropriate visualization types
- Include time range controls

### 4. Error Tracking
- Add context to error reports
- Use tags for categorization
- Set up alert rules for critical errors

## Troubleshooting

### Common Issues

#### Metrics Not Appearing
1. Check Prometheus target status
2. Verify metrics endpoint accessibility
3. Review firewall settings

#### High Memory Usage Alerts
1. Check for memory leaks
2. Review database connection pooling
3. Analyze large request payloads

#### Database Connection Issues
1. Monitor connection pool size
2. Check database server health
3. Review query performance

### Debugging Commands

```bash
# Check Prometheus targets
curl http://localhost:9090/api/v1/targets

# Test metrics endpoint
curl http://localhost:8000/api/metrics

# Check application logs
docker logs pam-backend

# Monitor system resources
htop
```

## Performance Optimization

### 1. Metrics Collection
- Limit high-cardinality metrics
- Use histogram buckets appropriately
- Consider metric retention policies

### 2. Alert Efficiency
- Avoid alert fatigue
- Use alert routing effectively
- Implement escalation policies

### 3. Dashboard Performance
- Limit time ranges for heavy queries
- Use appropriate refresh intervals
- Optimize query expressions

### Distributed Tracing
The backend uses **OpenTelemetry** for distributed tracing. Set the following environment variables to export spans to your tracing backend:

```bash
OTLP_ENDPOINT=https://your-otel-collector.example.com
OTLP_API_KEY=<optional-api-key>
```

Tracing is automatically enabled when these variables are present and `OBSERVABILITY_ENABLED` is `true`.

## Contact Information

For monitoring-related issues:
- **DevOps Team**: devops@pam-backend.com
- **On-Call**: monitoring-alerts@pam-backend.com
- **Documentation**: https://monitoring.pam-backend.com

**Last Updated**: 2024-01-01
**Version**: 1.0.0
