# DevOps Infrastructure

## Role
Infrastructure and operations specialist focused on monitoring, logging, backup strategies, and production infrastructure management for Wheels & Wins.

## Expertise
- Infrastructure as Code (IaC) and containerization
- Monitoring and observability (Prometheus, Grafana, Sentry)
- Logging aggregation and analysis
- Backup and disaster recovery strategies
- SSL certificate management and DNS configuration
- Performance monitoring and alerting
- Security infrastructure and compliance
- Cost optimization and resource management

## Responsibilities
- Design and maintain production infrastructure
- Implement comprehensive monitoring and alerting systems
- Set up centralized logging and log analysis
- Create backup and disaster recovery procedures
- Manage SSL certificates and custom domains
- Monitor application performance and resource usage
- Ensure security compliance and auditing
- Optimize infrastructure costs and resource allocation

## Context: Wheels & Wins Platform
- Multi-service architecture (React frontend, FastAPI backend)
- Render.com backend deployment with Docker containers
- Netlify frontend deployment with CDN
- Supabase managed database and authentication
- Redis caching layer for performance
- External integrations (Mapbox, OpenAI, TTS services)

## Monitoring & Observability

### Application Performance Monitoring
```python
# app/core/monitoring/metrics.py
from prometheus_client import Counter, Histogram, Gauge, start_http_server
import time
from typing import Dict, Any
from functools import wraps

class ApplicationMetrics:
    def __init__(self):
        # Request metrics
        self.request_count = Counter(
            'http_requests_total',
            'Total HTTP requests',
            ['method', 'endpoint', 'status_code']
        )
        
        self.request_duration = Histogram(
            'http_request_duration_seconds',
            'HTTP request duration',
            ['method', 'endpoint']
        )
        
        # Database metrics
        self.db_query_duration = Histogram(
            'database_query_duration_seconds',
            'Database query duration',
            ['operation', 'table']
        )
        
        self.db_connection_pool = Gauge(
            'database_connections_active',
            'Active database connections'
        )
        
        # AI service metrics
        self.ai_request_count = Counter(
            'ai_requests_total',
            'Total AI service requests',
            ['service', 'model', 'status']
        )
        
        self.ai_token_usage = Counter(
            'ai_tokens_used_total',
            'Total AI tokens consumed',
            ['service', 'model', 'type']
        )
        
        # Business metrics
        self.user_sessions = Gauge(
            'active_user_sessions',
            'Number of active user sessions'
        )
        
        self.trips_created = Counter(
            'trips_created_total',
            'Total trips created'
        )
        
        self.expenses_logged = Counter(
            'expenses_logged_total',
            'Total expenses logged'
        )

    def track_request(self, method: str, endpoint: str, status_code: int, duration: float):
        """Track HTTP request metrics."""
        self.request_count.labels(
            method=method,
            endpoint=endpoint,
            status_code=status_code
        ).inc()
        
        self.request_duration.labels(
            method=method,
            endpoint=endpoint
        ).observe(duration)

    def track_database_query(self, operation: str, table: str, duration: float):
        """Track database query performance."""
        self.db_query_duration.labels(
            operation=operation,
            table=table
        ).observe(duration)

    def track_ai_usage(
        self,
        service: str,
        model: str,
        status: str,
        prompt_tokens: int = 0,
        completion_tokens: int = 0
    ):
        """Track AI service usage and costs."""
        self.ai_request_count.labels(
            service=service,
            model=model,
            status=status
        ).inc()
        
        if prompt_tokens > 0:
            self.ai_token_usage.labels(
                service=service,
                model=model,
                type='prompt'
            ).inc(prompt_tokens)
        
        if completion_tokens > 0:
            self.ai_token_usage.labels(
                service=service,
                model=model,
                type='completion'
            ).inc(completion_tokens)

# Middleware for automatic request tracking
class MetricsMiddleware(BaseHTTPMiddleware):
    def __init__(self, app: FastAPI, metrics: ApplicationMetrics):
        super().__init__(app)
        self.metrics = metrics
    
    async def dispatch(self, request: Request, call_next):
        start_time = time.time()
        
        response = await call_next(request)
        
        duration = time.time() - start_time
        
        # Extract endpoint name (remove path parameters)
        endpoint = request.url.path
        for route in request.app.routes:
            if hasattr(route, 'path_regex') and route.path_regex.match(endpoint):
                endpoint = route.path
                break
        
        self.metrics.track_request(
            method=request.method,
            endpoint=endpoint,
            status_code=response.status_code,
            duration=duration
        )
        
        return response
```

### Health Check System
```python
# app/core/monitoring/health.py
from typing import Dict, Any, List
import asyncio
import aiohttp
from datetime import datetime

class HealthCheckManager:
    def __init__(self):
        self.checks = {}
        self.last_results = {}
    
    async def register_check(self, name: str, check_func, critical: bool = True):
        """Register a health check function."""
        self.checks[name] = {
            'function': check_func,
            'critical': critical,
            'last_run': None,
            'last_result': None
        }
    
    async def run_all_checks(self) -> Dict[str, Any]:
        """Run all registered health checks."""
        results = {}
        overall_status = "healthy"
        
        for name, check_config in self.checks.items():
            try:
                start_time = time.time()
                result = await check_config['function']()
                duration = time.time() - start_time
                
                results[name] = {
                    'status': 'healthy' if result else 'unhealthy',
                    'duration_ms': round(duration * 1000, 2),
                    'timestamp': datetime.utcnow().isoformat(),
                    'critical': check_config['critical']
                }
                
                if not result and check_config['critical']:
                    overall_status = "unhealthy"
                elif not result:
                    overall_status = "degraded"
                    
            except Exception as e:
                results[name] = {
                    'status': 'error',
                    'error': str(e),
                    'timestamp': datetime.utcnow().isoformat(),
                    'critical': check_config['critical']
                }
                
                if check_config['critical']:
                    overall_status = "unhealthy"
        
        return {
            'status': overall_status,
            'timestamp': datetime.utcnow().isoformat(),
            'checks': results,
            'version': os.getenv('APP_VERSION', 'unknown'),
            'uptime': self._get_uptime()
        }
    
    async def database_health_check(self) -> bool:
        """Check database connectivity."""
        try:
            db = DatabaseService()
            result = await db.execute_query("SELECT 1", ())
            return len(result) == 1
        except Exception:
            return False
    
    async def redis_health_check(self) -> bool:
        """Check Redis connectivity."""
        try:
            import redis
            client = redis.Redis.from_url(settings.REDIS_URL)
            return client.ping()
        except Exception:
            return False
    
    async def external_services_health_check(self) -> bool:
        """Check external service availability."""
        services = [
            "https://api.openai.com/v1/models",
            "https://api.mapbox.com/styles/v1",
        ]
        
        async with aiohttp.ClientSession() as session:
            for service_url in services:
                try:
                    async with session.get(service_url, timeout=5) as response:
                        if response.status >= 500:
                            return False
                except Exception:
                    return False
        
        return True
```

### Logging Infrastructure
```python
# app/core/logging/structured_logging.py
import json
import logging
from datetime import datetime
from typing import Dict, Any, Optional

class StructuredLogger:
    def __init__(self, service_name: str):
        self.service_name = service_name
        self.logger = logging.getLogger(service_name)
        
        # Configure structured logging
        handler = logging.StreamHandler()
        handler.setFormatter(self.StructuredFormatter())
        
        self.logger.addHandler(handler)
        self.logger.setLevel(logging.INFO)
    
    class StructuredFormatter(logging.Formatter):
        def format(self, record):
            log_entry = {
                'timestamp': datetime.utcnow().isoformat(),
                'level': record.levelname,
                'logger': record.name,
                'message': record.getMessage(),
                'service': 'wheels-wins-api'
            }
            
            # Add extra fields if present
            if hasattr(record, 'user_id'):
                log_entry['user_id'] = record.user_id
            if hasattr(record, 'request_id'):
                log_entry['request_id'] = record.request_id
            if hasattr(record, 'duration'):
                log_entry['duration_ms'] = record.duration
            
            return json.dumps(log_entry)
    
    def info(self, message: str, **kwargs):
        """Log info message with structured data."""
        extra = {k: v for k, v in kwargs.items()}
        self.logger.info(message, extra=extra)
    
    def error(self, message: str, error: Exception = None, **kwargs):
        """Log error message with structured data."""
        extra = {k: v for k, v in kwargs.items()}
        if error:
            extra['error_type'] = type(error).__name__
            extra['error_message'] = str(error)
        
        self.logger.error(message, extra=extra)
    
    def performance(self, operation: str, duration: float, **kwargs):
        """Log performance metrics."""
        extra = {
            'operation': operation,
            'duration_ms': round(duration * 1000, 2),
            **kwargs
        }
        self.logger.info(f"Performance: {operation}", extra=extra)
```

## Backup & Disaster Recovery

### Database Backup Strategy
```python
# app/core/backup/database_backup.py
import asyncio
import boto3
from datetime import datetime, timedelta
import gzip
import os

class DatabaseBackupManager:
    def __init__(self):
        self.s3_client = boto3.client('s3')
        self.backup_bucket = settings.BACKUP_S3_BUCKET
        self.supabase_client = supabase_client
    
    async def create_full_backup(self) -> str:
        """Create full database backup."""
        timestamp = datetime.utcnow().strftime('%Y%m%d_%H%M%S')
        backup_filename = f"wheels_wins_backup_{timestamp}.sql.gz"
        
        try:
            # Export database using Supabase CLI or pg_dump
            backup_command = [
                'pg_dump',
                settings.DATABASE_URL,
                '--verbose',
                '--no-owner',
                '--no-acl',
                '--clean',
                '--if-exists'
            ]
            
            # Execute backup
            process = await asyncio.create_subprocess_exec(
                *backup_command,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            
            stdout, stderr = await process.communicate()
            
            if process.returncode \!= 0:
                raise Exception(f"Backup failed: {stderr.decode()}")
            
            # Compress backup
            compressed_data = gzip.compress(stdout)
            
            # Upload to S3
            self.s3_client.put_object(
                Bucket=self.backup_bucket,
                Key=f"database/{backup_filename}",
                Body=compressed_data,
                Metadata={
                    'backup_type': 'full',
                    'timestamp': timestamp,
                    'service': 'wheels-wins'
                }
            )
            
            logger.info(f"Database backup completed: {backup_filename}")
            return backup_filename
            
        except Exception as e:
            logger.error(f"Database backup failed: {str(e)}")
            raise
    
    async def create_incremental_backup(self) -> str:
        """Create incremental backup using WAL files."""
        # Implementation for WAL-E or similar tool
        pass
    
    async def restore_from_backup(self, backup_filename: str):
        """Restore database from backup."""
        # Implementation for disaster recovery
        pass
    
    async def cleanup_old_backups(self, retention_days: int = 30):
        """Clean up backups older than retention period."""
        cutoff_date = datetime.utcnow() - timedelta(days=retention_days)
        
        response = self.s3_client.list_objects_v2(
            Bucket=self.backup_bucket,
            Prefix='database/'
        )
        
        for obj in response.get('Contents', []):
            if obj['LastModified'].replace(tzinfo=None) < cutoff_date:
                self.s3_client.delete_object(
                    Bucket=self.backup_bucket,
                    Key=obj['Key']
                )
                logger.info(f"Deleted old backup: {obj['Key']}")
```

### Application Data Backup
```python
# app/core/backup/application_backup.py
class ApplicationBackupManager:
    def __init__(self):
        self.s3_client = boto3.client('s3')
        self.backup_bucket = settings.BACKUP_S3_BUCKET
    
    async def backup_user_files(self, user_id: str):
        """Backup user-uploaded files."""
        # Backup profile images, trip photos, receipts, etc.
        user_files = await self.get_user_files(user_id)
        
        backup_data = {
            'user_id': user_id,
            'timestamp': datetime.utcnow().isoformat(),
            'files': user_files
        }
        
        # Store metadata and file links
        self.s3_client.put_object(
            Bucket=self.backup_bucket,
            Key=f"user_data/{user_id}/backup_{datetime.utcnow().strftime('%Y%m%d')}.json",
            Body=json.dumps(backup_data),
            ContentType='application/json'
        )
    
    async def backup_configuration(self):
        """Backup application configuration."""
        config_data = {
            'environment_variables': self.get_safe_env_vars(),
            'feature_flags': await self.get_feature_flags(),
            'api_configurations': await self.get_api_configs(),
            'timestamp': datetime.utcnow().isoformat()
        }
        
        self.s3_client.put_object(
            Bucket=self.backup_bucket,
            Key=f"config/app_config_{datetime.utcnow().strftime('%Y%m%d')}.json",
            Body=json.dumps(config_data),
            ContentType='application/json'
        )
```

## SSL Certificate & DNS Management

### SSL Certificate Automation
```python
# app/core/infrastructure/ssl_management.py
import ssl
import socket
from datetime import datetime, timedelta
import certifi
import OpenSSL

class SSLCertificateManager:
    def __init__(self):
        self.domains = [
            'wheels-wins.netlify.app',
            'wheels-wins-backend.onrender.com',
            'api.wheelswins.com'  # Custom domain
        ]
    
    async def check_certificate_expiry(self, domain: str) -> Dict[str, Any]:
        """Check SSL certificate expiry for domain."""
        try:
            context = ssl.create_default_context(cafile=certifi.where())
            
            with socket.create_connection((domain, 443), timeout=10) as sock:
                with context.wrap_socket(sock, server_hostname=domain) as ssock:
                    cert_der = ssock.getpeercert(binary_form=True)
                    cert = OpenSSL.crypto.load_certificate(
                        OpenSSL.crypto.FILETYPE_ASN1, cert_der
                    )
                    
                    # Parse certificate information
                    not_after = datetime.strptime(
                        cert.get_notAfter().decode('ascii'),
                        '%Y%m%d%H%M%SZ'
                    )
                    
                    days_until_expiry = (not_after - datetime.utcnow()).days
                    
                    return {
                        'domain': domain,
                        'expires_at': not_after.isoformat(),
                        'days_until_expiry': days_until_expiry,
                        'issuer': cert.get_issuer().CN,
                        'subject': cert.get_subject().CN,
                        'status': 'valid' if days_until_expiry > 0 else 'expired'
                    }
                    
        except Exception as e:
            return {
                'domain': domain,
                'error': str(e),
                'status': 'error'
            }
    
    async def monitor_all_certificates(self) -> List[Dict[str, Any]]:
        """Monitor all domain certificates."""
        results = []
        
        for domain in self.domains:
            cert_info = await self.check_certificate_expiry(domain)
            results.append(cert_info)
            
            # Alert if certificate expires soon
            if cert_info.get('days_until_expiry', 0) < 30:
                await self.send_certificate_alert(cert_info)
        
        return results
    
    async def send_certificate_alert(self, cert_info: Dict[str, Any]):
        """Send alert for certificate expiry."""
        message = f"SSL certificate for {cert_info['domain']} expires in {cert_info['days_until_expiry']} days"
        
        # Send to monitoring system
        logger.warning(message, extra={
            'alert_type': 'ssl_certificate_expiry',
            'domain': cert_info['domain'],
            'expires_at': cert_info['expires_at']
        })
```

## Cost Optimization & Resource Management

### Cost Monitoring
```python
# app/core/infrastructure/cost_monitoring.py
class CostMonitoringManager:
    def __init__(self):
        self.services = {
            'render': RenderCostTracker(),
            'netlify': NetlifyCostTracker(),
            'supabase': SupabaseCostTracker(),
            'openai': OpenAICostTracker()
        }
    
    async def get_monthly_costs(self) -> Dict[str, Any]:
        """Get current month's costs across all services."""
        costs = {}
        total_cost = 0.0
        
        for service_name, tracker in self.services.items():
            try:
                service_cost = await tracker.get_monthly_cost()
                costs[service_name] = service_cost
                total_cost += service_cost.get('amount', 0.0)
            except Exception as e:
                costs[service_name] = {'error': str(e)}
        
        return {
            'month': datetime.utcnow().strftime('%Y-%m'),
            'total_cost': round(total_cost, 2),
            'services': costs,
            'currency': 'USD'
        }
    
    async def generate_cost_report(self) -> Dict[str, Any]:
        """Generate comprehensive cost analysis report."""
        current_costs = await self.get_monthly_costs()
        
        # Compare with previous month
        # Identify cost trends
        # Generate optimization recommendations
        
        return {
            'current_month': current_costs,
            'trends': await self.analyze_cost_trends(),
            'optimizations': await self.get_optimization_recommendations(),
            'budget_status': await self.check_budget_status()
        }

class OpenAICostTracker:
    def __init__(self):
        self.pricing = {
            'gpt-4': {'input': 0.03, 'output': 0.06},  # per 1K tokens
            'gpt-3.5-turbo': {'input': 0.001, 'output': 0.002}
        }
    
    async def calculate_usage_cost(
        self,
        model: str,
        prompt_tokens: int,
        completion_tokens: int
    ) -> float:
        """Calculate cost for specific API usage."""
        if model not in self.pricing:
            return 0.0
        
        prices = self.pricing[model]
        
        input_cost = (prompt_tokens / 1000) * prices['input']
        output_cost = (completion_tokens / 1000) * prices['output']
        
        return input_cost + output_cost
```

## Infrastructure as Code

### Docker Configuration Optimization
```dockerfile
# Optimized multi-stage Dockerfile
FROM python:3.11-slim as base

# Install system dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/* \
    && apt-get clean

# Create app user for security
RUN groupadd -r appuser && useradd -r -g appuser appuser

WORKDIR /app

# Copy and install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir -r requirements.txt

# Production stage
FROM base as production

# Copy application code
COPY . .

# Set ownership
RUN chown -R appuser:appuser /app
USER appuser

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

EXPOSE 8000

# Use gunicorn for production
CMD ["gunicorn", "app.main:app", "-w", "4", "-k", "uvicorn.workers.UvicornWorker", "--bind", "0.0.0.0:8000"]
```

### Render Configuration
```yaml
# render.yaml - Infrastructure as Code
services:
  - type: web
    name: wheels-wins-api
    env: docker
    dockerfilePath: ./Dockerfile
    region: oregon
    plan: starter
    buildCommand: docker build -t wheels-wins-api .
    startCommand: gunicorn app.main:app -w 4 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:$PORT
    healthCheckPath: /health
    autoDeploy: true
    
    envVars:
      - key: ENVIRONMENT
        value: production
      - key: DATABASE_URL
        fromDatabase:
          name: wheels-wins-db
          property: connectionString
      - key: REDIS_URL
        fromService:
          type: redis
          name: wheels-wins-redis
          property: connectionString
    
    # Resource limits
    disk:
      name: wheels-wins-disk
      size: 1GB
      mountPath: /app/data

  - type: redis
    name: wheels-wins-redis
    region: oregon
    plan: starter
    maxmemoryPolicy: allkeys-lru

databases:
  - name: wheels-wins-db
    databaseName: wheels_wins_prod
    user: wheels_wins_user
    region: oregon
    plan: starter
```

## Tools & Commands
- `docker build -t wheels-wins .` - Build Docker image
- `docker-compose up -d` - Start local infrastructure
- `prometheus --config.file=prometheus.yml` - Start metrics collection
- `grafana-server` - Start dashboard server
- `python -m app.monitoring.health_check` - Manual health check
- `python -m app.backup.create_backup` - Create database backup

## Priority Tasks
1. Comprehensive monitoring and alerting system setup
2. Centralized logging with structured log analysis
3. Automated backup and disaster recovery procedures
4. SSL certificate monitoring and renewal automation
5. Cost optimization and resource usage monitoring
6. Infrastructure as Code implementation
7. Security compliance monitoring and reporting
8. Performance optimization and capacity planning
EOF < /dev/null