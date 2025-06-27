
"""
Monitoring Service
Prometheus metrics collection and performance monitoring.
"""

import time
import psutil
from typing import Dict, Any, Optional
from prometheus_client import Counter, Histogram, Gauge, CollectorRegistry, generate_latest
from app.core.config import settings
from app.core.logging import setup_logging

logger = setup_logging()

class MonitoringService:
    """Comprehensive monitoring service with Prometheus metrics"""
    
    def __init__(self):
        self.registry = CollectorRegistry()
        
        # HTTP Request metrics
        self.http_requests_total = Counter(
            'http_requests_total',
            'Total HTTP requests',
            ['method', 'endpoint', 'status_code'],
            registry=self.registry
        )
        
        self.http_request_duration = Histogram(
            'http_request_duration_seconds',
            'HTTP request duration in seconds',
            ['method', 'endpoint'],
            registry=self.registry
        )
        
        # WebSocket metrics
        self.websocket_connections = Gauge(
            'websocket_connections_active',
            'Active WebSocket connections',
            registry=self.registry
        )
        
        self.websocket_messages_total = Counter(
            'websocket_messages_total',
            'Total WebSocket messages',
            ['type', 'direction'],
            registry=self.registry
        )
        
        # Database metrics
        self.database_queries_total = Counter(
            'database_queries_total',
            'Total database queries',
            ['operation', 'table'],
            registry=self.registry
        )
        
        self.database_query_duration = Histogram(
            'database_query_duration_seconds',
            'Database query duration in seconds',
            ['operation', 'table'],
            registry=self.registry
        )
        
        self.database_connections = Gauge(
            'database_connections_active',
            'Active database connections',
            registry=self.registry
        )
        
        # Cache metrics
        self.cache_operations_total = Counter(
            'cache_operations_total',
            'Total cache operations',
            ['operation', 'result'],
            registry=self.registry
        )
        
        self.cache_hit_ratio = Gauge(
            'cache_hit_ratio',
            'Cache hit ratio',
            registry=self.registry
        )
        
        # System metrics
        self.system_cpu_usage = Gauge(
            'system_cpu_usage_percent',
            'System CPU usage percentage',
            registry=self.registry
        )
        
        self.system_memory_usage = Gauge(
            'system_memory_usage_percent',
            'System memory usage percentage',
            registry=self.registry
        )
        
        self.system_disk_usage = Gauge(
            'system_disk_usage_percent',
            'System disk usage percentage',
            registry=self.registry
        )
        
        # Business metrics
        self.active_users = Gauge(
            'active_users_total',
            'Total active users',
            registry=self.registry
        )
        
        self.ai_requests_total = Counter(
            'ai_requests_total',
            'Total AI requests',
            ['service', 'status'],
            registry=self.registry
        )
        
        self.ai_response_time = Histogram(
            'ai_response_time_seconds',
            'AI response time in seconds',
            ['service'],
            registry=self.registry
        )
    
    def record_http_request(self, method: str, endpoint: str, status_code: int, duration: float):
        """Record HTTP request metrics"""
        self.http_requests_total.labels(
            method=method,
            endpoint=endpoint,
            status_code=str(status_code)
        ).inc()
        
        self.http_request_duration.labels(
            method=method,
            endpoint=endpoint
        ).observe(duration)
    
    def record_websocket_connection(self, active_count: int):
        """Record WebSocket connection metrics"""
        self.websocket_connections.set(active_count)
    
    def record_websocket_message(self, message_type: str, direction: str):
        """Record WebSocket message metrics"""
        self.websocket_messages_total.labels(
            type=message_type,
            direction=direction
        ).inc()
    
    def record_database_query(self, operation: str, table: str, duration: float):
        """Record database query metrics"""
        self.database_queries_total.labels(
            operation=operation,
            table=table
        ).inc()
        
        self.database_query_duration.labels(
            operation=operation,
            table=table
        ).observe(duration)
    
    def record_database_connections(self, active_count: int):
        """Record database connection count"""
        self.database_connections.set(active_count)
    
    def record_cache_operation(self, operation: str, hit: bool):
        """Record cache operation metrics"""
        result = "hit" if hit else "miss"
        self.cache_operations_total.labels(
            operation=operation,
            result=result
        ).inc()
    
    def update_cache_hit_ratio(self, ratio: float):
        """Update cache hit ratio"""
        self.cache_hit_ratio.set(ratio)
    
    def update_system_metrics(self):
        """Update system performance metrics"""
        try:
            # CPU usage
            cpu_percent = psutil.cpu_percent(interval=1)
            self.system_cpu_usage.set(cpu_percent)
            
            # Memory usage
            memory = psutil.virtual_memory()
            self.system_memory_usage.set(memory.percent)
            
            # Disk usage
            disk = psutil.disk_usage('/')
            disk_percent = (disk.used / disk.total) * 100
            self.system_disk_usage.set(disk_percent)
            
        except Exception as e:
            logger.warning(f"Error updating system metrics: {e}")
    
    def record_active_users(self, count: int):
        """Record active users count"""
        self.active_users.set(count)
    
    def record_ai_request(self, service: str, status: str, duration: float):
        """Record AI request metrics"""
        self.ai_requests_total.labels(
            service=service,
            status=status
        ).inc()
        
        self.ai_response_time.labels(
            service=service
        ).observe(duration)
    
    def get_metrics(self) -> str:
        """Get Prometheus metrics in text format"""
        return generate_latest(self.registry).decode('utf-8')
    
    def get_health_metrics(self) -> Dict[str, Any]:
        """Get health check metrics"""
        try:
            return {
                "system": {
                    "cpu_percent": psutil.cpu_percent(),
                    "memory_percent": psutil.virtual_memory().percent,
                    "disk_percent": (psutil.disk_usage('/').used / psutil.disk_usage('/').total) * 100
                },
                "timestamp": time.time()
            }
        except Exception as e:
            logger.error(f"Error getting health metrics: {e}")
            return {"error": str(e)}

# Global monitoring instance
monitoring_service = MonitoringService()

async def get_monitoring_service() -> MonitoringService:
    """Get monitoring service instance"""
    return monitoring_service
