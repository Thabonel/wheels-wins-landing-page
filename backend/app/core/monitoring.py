"""
PAM Advanced Monitoring & Metrics System - Phase 5
Comprehensive observability for production PAM deployment
"""

import asyncio
import logging
import time
import psutil
import json
from typing import Dict, Any, List, Optional, Callable
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from enum import Enum
import uuid
from collections import defaultdict, deque

import redis
from prometheus_client import Counter, Histogram, Gauge, CollectorRegistry, generate_latest
import structlog

logger = structlog.get_logger(__name__)


class MetricType(Enum):
    COUNTER = "counter"
    HISTOGRAM = "histogram" 
    GAUGE = "gauge"
    SUMMARY = "summary"


class AlertSeverity(Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


@dataclass
class MetricDefinition:
    name: str
    type: MetricType
    description: str
    labels: List[str] = field(default_factory=list)
    buckets: Optional[List[float]] = None  # For histograms


@dataclass
class HealthCheck:
    name: str
    description: str
    check_function: Callable[[], bool]
    timeout_seconds: int = 30
    critical: bool = False
    interval_seconds: int = 60


@dataclass
class Alert:
    id: str
    severity: AlertSeverity
    component: str
    message: str
    timestamp: datetime
    resolved: bool = False
    resolved_at: Optional[datetime] = None
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class PerformanceMetrics:
    timestamp: datetime
    cpu_percent: float
    memory_percent: float
    memory_used_mb: float
    disk_usage_percent: float
    network_io_mb: float
    response_time_ms: float
    active_connections: int
    queue_size: int
    error_rate: float
    throughput_rps: float


class PAMMonitoringService:
    """
    Comprehensive monitoring service for PAM production deployment
    Handles metrics collection, health checks, alerting, and performance monitoring
    """
    
    def __init__(self, redis_client: Optional[redis.Redis] = None):
        self.redis_client = redis_client or redis.from_url("redis://localhost:6379/3")
        
        # Prometheus registry and metrics
        self.registry = CollectorRegistry()
        self.metrics: Dict[str, Any] = {}
        
        # Health checks
        self.health_checks: Dict[str, HealthCheck] = {}
        self.health_status: Dict[str, Dict[str, Any]] = {}
        
        # Alerting
        self.alerts: Dict[str, Alert] = {}
        self.alert_history: deque = deque(maxlen=1000)
        
        # Performance tracking
        self.performance_history: deque = deque(maxlen=1440)  # 24 hours at 1min intervals
        
        # Request tracking
        self.request_history: deque = deque(maxlen=10000)
        self.error_history: deque = deque(maxlen=1000)
        
        # Initialize core metrics
        self._initialize_core_metrics()
        
        # Initialize health checks
        self._initialize_health_checks()
        
        logger.info("PAM Monitoring Service initialized")
    
    def _initialize_core_metrics(self):
        """Initialize core Prometheus metrics"""
        
        core_metrics = [
            MetricDefinition(
                name="pam_requests_total",
                type=MetricType.COUNTER,
                description="Total PAM requests",
                labels=["user_id", "agent_type", "status"]
            ),
            MetricDefinition(
                name="pam_request_duration_seconds",
                type=MetricType.HISTOGRAM,
                description="PAM request duration in seconds",
                labels=["agent_type", "endpoint"],
                buckets=[0.1, 0.5, 1.0, 2.0, 5.0, 10.0, 30.0]
            ),
            MetricDefinition(
                name="pam_memory_usage_bytes",
                type=MetricType.GAUGE,
                description="PAM memory usage in bytes",
                labels=["component"]
            ),
            MetricDefinition(
                name="pam_cpu_usage_percent",
                type=MetricType.GAUGE,
                description="PAM CPU usage percentage",
                labels=["component"]
            ),
            MetricDefinition(
                name="pam_active_sessions",
                type=MetricType.GAUGE,
                description="Number of active PAM sessions",
                labels=["session_type"]
            ),
            MetricDefinition(
                name="pam_errors_total",
                type=MetricType.COUNTER,
                description="Total PAM errors",
                labels=["error_type", "component", "severity"]
            ),
            MetricDefinition(
                name="pam_agent_performance_score",
                type=MetricType.GAUGE,
                description="PAM agent performance score (0-1)",
                labels=["agent_type"]
            ),
            MetricDefinition(
                name="pam_database_connections",
                type=MetricType.GAUGE,
                description="Number of database connections",
                labels=["database", "status"]
            ),
            MetricDefinition(
                name="pam_cache_hit_ratio",
                type=MetricType.GAUGE,
                description="Cache hit ratio (0-1)",
                labels=["cache_type"]
            ),
            MetricDefinition(
                name="pam_background_tasks_total",
                type=MetricType.COUNTER,
                description="Total background tasks processed",
                labels=["task_type", "status", "priority"]
            )
        ]
        
        # Create Prometheus metrics
        for metric_def in core_metrics:
            if metric_def.type == MetricType.COUNTER:
                self.metrics[metric_def.name] = Counter(
                    metric_def.name,
                    metric_def.description,
                    metric_def.labels,
                    registry=self.registry
                )
            elif metric_def.type == MetricType.HISTOGRAM:
                self.metrics[metric_def.name] = Histogram(
                    metric_def.name,
                    metric_def.description,
                    metric_def.labels,
                    buckets=metric_def.buckets,
                    registry=self.registry
                )
            elif metric_def.type == MetricType.GAUGE:
                self.metrics[metric_def.name] = Gauge(
                    metric_def.name,
                    metric_def.description,
                    metric_def.labels,
                    registry=self.registry
                )
    
    def _initialize_health_checks(self):
        """Initialize system health checks"""
        
        self.health_checks = {
            "redis_connection": HealthCheck(
                name="Redis Connection",
                description="Check Redis connectivity",
                check_function=self._check_redis_health,
                critical=True,
                interval_seconds=30
            ),
            "memory_usage": HealthCheck(
                name="Memory Usage",
                description="Check memory usage levels",
                check_function=self._check_memory_health,
                critical=False,
                interval_seconds=60
            ),
            "cpu_usage": HealthCheck(
                name="CPU Usage",
                description="Check CPU usage levels",
                check_function=self._check_cpu_health,
                critical=False,
                interval_seconds=60
            ),
            "disk_space": HealthCheck(
                name="Disk Space",
                description="Check available disk space",
                check_function=self._check_disk_health,
                critical=True,
                interval_seconds=300
            ),
            "agent_orchestrator": HealthCheck(
                name="Agent Orchestrator",
                description="Check agent orchestrator functionality",
                check_function=self._check_agent_health,
                critical=True,
                interval_seconds=120
            ),
            "database_connections": HealthCheck(
                name="Database Connections",
                description="Check database connection pool",
                check_function=self._check_database_health,
                critical=True,
                interval_seconds=60
            )
        }
    
    # Metric recording methods
    
    def record_request(
        self,
        user_id: str,
        agent_type: str,
        duration_seconds: float,
        status: str,
        endpoint: str = "default"
    ):
        """Record a PAM request"""
        try:
            # Update Prometheus metrics
            self.metrics["pam_requests_total"].labels(
                user_id=user_id[:8] + "..." if len(user_id) > 8 else user_id,  # Truncate for privacy
                agent_type=agent_type,
                status=status
            ).inc()
            
            self.metrics["pam_request_duration_seconds"].labels(
                agent_type=agent_type,
                endpoint=endpoint
            ).observe(duration_seconds)
            
            # Store in request history
            request_data = {
                "timestamp": datetime.utcnow().isoformat(),
                "user_id": user_id,
                "agent_type": agent_type,
                "duration_seconds": duration_seconds,
                "status": status,
                "endpoint": endpoint
            }
            self.request_history.append(request_data)
            
            # Store in Redis for distributed access
            self._store_metric_in_redis("request", request_data)
            
        except Exception as e:
            logger.error("Failed to record request metric", error=str(e))
    
    def record_error(
        self,
        error_type: str,
        component: str,
        severity: str,
        error_details: Dict[str, Any]
    ):
        """Record an error"""
        try:
            # Update Prometheus metrics
            self.metrics["pam_errors_total"].labels(
                error_type=error_type,
                component=component,
                severity=severity
            ).inc()
            
            # Store in error history
            error_data = {
                "timestamp": datetime.utcnow().isoformat(),
                "error_type": error_type,
                "component": component,
                "severity": severity,
                "details": error_details
            }
            self.error_history.append(error_data)
            
            # Create alert for high severity errors
            if severity in ["high", "critical"]:
                alert = Alert(
                    id=str(uuid.uuid4()),
                    severity=AlertSeverity(severity),
                    component=component,
                    message=f"{error_type} in {component}: {error_details.get('message', 'No details')}",
                    timestamp=datetime.utcnow(),
                    metadata=error_details
                )
                self._create_alert(alert)
            
        except Exception as e:
            logger.error("Failed to record error metric", error=str(e))
    
    def update_system_metrics(self):
        """Update system-level metrics"""
        try:
            # CPU and memory usage
            cpu_percent = psutil.cpu_percent()
            memory = psutil.virtual_memory()
            disk = psutil.disk_usage('/')
            
            # Update Prometheus metrics
            self.metrics["pam_cpu_usage_percent"].labels(component="system").set(cpu_percent)
            self.metrics["pam_memory_usage_bytes"].labels(component="system").set(memory.used)
            
            # Network I/O
            try:
                network = psutil.net_io_counters()
                network_io_mb = (network.bytes_sent + network.bytes_recv) / (1024 * 1024)
            except Exception:
                network_io_mb = 0
            
            # Calculate error rate and throughput
            recent_requests = [r for r in self.request_history if 
                             datetime.fromisoformat(r['timestamp']) > datetime.utcnow() - timedelta(minutes=1)]
            recent_errors = [e for e in self.error_history if 
                           datetime.fromisoformat(e['timestamp']) > datetime.utcnow() - timedelta(minutes=1)]
            
            error_rate = len(recent_errors) / max(len(recent_requests), 1)
            throughput_rps = len(recent_requests) / 60.0
            
            # Calculate average response time
            if recent_requests:
                avg_response_time = sum(r['duration_seconds'] for r in recent_requests) / len(recent_requests) * 1000
            else:
                avg_response_time = 0
            
            # Store performance metrics
            perf_metrics = PerformanceMetrics(
                timestamp=datetime.utcnow(),
                cpu_percent=cpu_percent,
                memory_percent=memory.percent,
                memory_used_mb=memory.used / (1024 * 1024),
                disk_usage_percent=disk.percent,
                network_io_mb=network_io_mb,
                response_time_ms=avg_response_time,
                active_connections=0,  # Would be populated from actual connection pools
                queue_size=0,  # Would be populated from actual queues
                error_rate=error_rate,
                throughput_rps=throughput_rps
            )
            
            self.performance_history.append(perf_metrics)
            
            # Store in Redis
            self._store_metric_in_redis("performance", {
                "timestamp": perf_metrics.timestamp.isoformat(),
                "cpu_percent": perf_metrics.cpu_percent,
                "memory_percent": perf_metrics.memory_percent,
                "memory_used_mb": perf_metrics.memory_used_mb,
                "disk_usage_percent": perf_metrics.disk_usage_percent,
                "error_rate": perf_metrics.error_rate,
                "throughput_rps": perf_metrics.throughput_rps
            })
            
            # Check for performance alerts
            self._check_performance_alerts(perf_metrics)
            
        except Exception as e:
            logger.error("Failed to update system metrics", error=str(e))
    
    def set_active_sessions(self, session_type: str, count: int):
        """Update active sessions count"""
        try:
            self.metrics["pam_active_sessions"].labels(session_type=session_type).set(count)
        except Exception as e:
            logger.error("Failed to set active sessions metric", error=str(e))
    
    def record_agent_performance(self, agent_type: str, score: float):
        """Record agent performance score"""
        try:
            self.metrics["pam_agent_performance_score"].labels(agent_type=agent_type).set(score)
        except Exception as e:
            logger.error("Failed to record agent performance", error=str(e))
    
    def record_cache_metrics(self, cache_type: str, hit_ratio: float):
        """Record cache performance metrics"""
        try:
            self.metrics["pam_cache_hit_ratio"].labels(cache_type=cache_type).set(hit_ratio)
        except Exception as e:
            logger.error("Failed to record cache metrics", error=str(e))
    
    def record_background_task(self, task_type: str, priority: str, status: str):
        """Record background task execution"""
        try:
            self.metrics["pam_background_tasks_total"].labels(
                task_type=task_type,
                priority=priority,
                status=status
            ).inc()
        except Exception as e:
            logger.error("Failed to record background task metric", error=str(e))
    
    # Health check methods
    
    async def run_health_checks(self) -> Dict[str, Any]:
        """Run all health checks"""
        results = {}
        overall_status = "healthy"
        
        for name, health_check in self.health_checks.items():
            try:
                start_time = time.time()
                is_healthy = await asyncio.wait_for(
                    asyncio.to_thread(health_check.check_function),
                    timeout=health_check.timeout_seconds
                )
                duration_ms = int((time.time() - start_time) * 1000)
                
                result = {
                    "status": "healthy" if is_healthy else "unhealthy",
                    "duration_ms": duration_ms,
                    "critical": health_check.critical,
                    "description": health_check.description
                }
                
                if not is_healthy:
                    if health_check.critical:
                        overall_status = "critical"
                    elif overall_status == "healthy":
                        overall_status = "degraded"
                
                results[name] = result
                self.health_status[name] = result
                
            except asyncio.TimeoutError:
                result = {
                    "status": "timeout",
                    "duration_ms": health_check.timeout_seconds * 1000,
                    "critical": health_check.critical,
                    "description": health_check.description,
                    "error": "Health check timed out"
                }
                results[name] = result
                overall_status = "critical" if health_check.critical else "degraded"
                
            except Exception as e:
                result = {
                    "status": "error", 
                    "critical": health_check.critical,
                    "description": health_check.description,
                    "error": str(e)
                }
                results[name] = result
                overall_status = "critical" if health_check.critical else "degraded"
        
        return {
            "overall_status": overall_status,
            "checks": results,
            "timestamp": datetime.utcnow().isoformat()
        }
    
    def _check_redis_health(self) -> bool:
        """Check Redis connectivity"""
        try:
            self.redis_client.ping()
            return True
        except Exception:
            return False
    
    def _check_memory_health(self) -> bool:
        """Check memory usage"""
        try:
            memory = psutil.virtual_memory()
            return memory.percent < 85  # Alert if memory usage > 85%
        except Exception:
            return False
    
    def _check_cpu_health(self) -> bool:
        """Check CPU usage"""
        try:
            cpu_percent = psutil.cpu_percent(interval=1)
            return cpu_percent < 80  # Alert if CPU usage > 80%
        except Exception:
            return False
    
    def _check_disk_health(self) -> bool:
        """Check disk space"""
        try:
            disk = psutil.disk_usage('/')
            return disk.percent < 90  # Alert if disk usage > 90%
        except Exception:
            return False
    
    def _check_agent_health(self) -> bool:
        """Check agent orchestrator health"""
        # This would integrate with the actual orchestrator
        # For now, return True if we have recent successful requests
        recent_requests = [r for r in self.request_history if 
                         datetime.fromisoformat(r['timestamp']) > datetime.utcnow() - timedelta(minutes=5)]
        successful_requests = [r for r in recent_requests if r['status'] == 'success']
        
        if not recent_requests:
            return True  # No recent activity, assume healthy
        
        success_rate = len(successful_requests) / len(recent_requests)
        return success_rate > 0.8  # Alert if success rate < 80%
    
    def _check_database_health(self) -> bool:
        """Check database connectivity"""
        # This would integrate with actual database connection pools
        # For now, simulate based on recent errors
        recent_db_errors = [e for e in self.error_history if 
                          e['component'] in ['database', 'supabase'] and
                          datetime.fromisoformat(e['timestamp']) > datetime.utcnow() - timedelta(minutes=5)]
        return len(recent_db_errors) == 0
    
    # Alert management
    
    def _create_alert(self, alert: Alert):
        """Create a new alert"""
        self.alerts[alert.id] = alert
        self.alert_history.append(alert)
        
        # Store in Redis for persistence
        self._store_alert_in_redis(alert)
        
        logger.warning(
            "Alert created",
            alert_id=alert.id,
            severity=alert.severity.value,
            component=alert.component,
            message=alert.message
        )
    
    def resolve_alert(self, alert_id: str) -> bool:
        """Resolve an alert"""
        if alert_id in self.alerts:
            alert = self.alerts[alert_id]
            alert.resolved = True
            alert.resolved_at = datetime.utcnow()
            
            # Update in Redis
            self._store_alert_in_redis(alert)
            
            logger.info("Alert resolved", alert_id=alert_id)
            return True
        
        return False
    
    def get_active_alerts(self, severity: Optional[AlertSeverity] = None) -> List[Alert]:
        """Get active alerts"""
        alerts = [alert for alert in self.alerts.values() if not alert.resolved]
        
        if severity:
            alerts = [alert for alert in alerts if alert.severity == severity]
        
        return sorted(alerts, key=lambda x: x.timestamp, reverse=True)
    
    def _check_performance_alerts(self, metrics: PerformanceMetrics):
        """Check for performance-based alerts"""
        
        # High memory usage alert
        if metrics.memory_percent > 85:
            alert = Alert(
                id=str(uuid.uuid4()),
                severity=AlertSeverity.HIGH if metrics.memory_percent > 95 else AlertSeverity.MEDIUM,
                component="system",
                message=f"High memory usage: {metrics.memory_percent:.1f}%",
                timestamp=datetime.utcnow(),
                metadata={"memory_percent": metrics.memory_percent}
            )
            self._create_alert(alert)
        
        # High error rate alert
        if metrics.error_rate > 0.1:  # 10% error rate
            alert = Alert(
                id=str(uuid.uuid4()),
                severity=AlertSeverity.HIGH if metrics.error_rate > 0.2 else AlertSeverity.MEDIUM,
                component="application",
                message=f"High error rate: {metrics.error_rate:.1%}",
                timestamp=datetime.utcnow(),
                metadata={"error_rate": metrics.error_rate}
            )
            self._create_alert(alert)
        
        # Low throughput alert (if we expect regular traffic)
        if metrics.throughput_rps < 0.1 and datetime.utcnow().hour in range(8, 22):  # Business hours
            alert = Alert(
                id=str(uuid.uuid4()),
                severity=AlertSeverity.LOW,
                component="application",
                message=f"Low throughput: {metrics.throughput_rps:.2f} RPS",
                timestamp=datetime.utcnow(),
                metadata={"throughput_rps": metrics.throughput_rps}
            )
            self._create_alert(alert)
    
    # Data persistence
    
    def _store_metric_in_redis(self, metric_type: str, data: Dict[str, Any]):
        """Store metric data in Redis"""
        try:
            key = f"pam:metrics:{metric_type}:{int(time.time())}"
            self.redis_client.setex(key, 86400, json.dumps(data))  # 24 hour TTL
        except Exception as e:
            logger.error("Failed to store metric in Redis", error=str(e))
    
    def _store_alert_in_redis(self, alert: Alert):
        """Store alert in Redis"""
        try:
            key = f"pam:alert:{alert.id}"
            alert_data = {
                "id": alert.id,
                "severity": alert.severity.value,
                "component": alert.component,
                "message": alert.message,
                "timestamp": alert.timestamp.isoformat(),
                "resolved": alert.resolved,
                "resolved_at": alert.resolved_at.isoformat() if alert.resolved_at else None,
                "metadata": alert.metadata
            }
            self.redis_client.setex(key, 86400 * 7, json.dumps(alert_data))  # 7 day TTL
        except Exception as e:
            logger.error("Failed to store alert in Redis", error=str(e))
    
    # Reporting and dashboards
    
    def get_metrics_summary(self) -> Dict[str, Any]:
        """Get comprehensive metrics summary"""
        try:
            # Recent performance
            recent_perf = list(self.performance_history)[-10:]  # Last 10 readings
            
            if recent_perf:
                avg_cpu = sum(p.cpu_percent for p in recent_perf) / len(recent_perf)
                avg_memory = sum(p.memory_percent for p in recent_perf) / len(recent_perf)
                avg_response_time = sum(p.response_time_ms for p in recent_perf) / len(recent_perf)
                current_error_rate = recent_perf[-1].error_rate if recent_perf else 0
                current_throughput = recent_perf[-1].throughput_rps if recent_perf else 0
            else:
                avg_cpu = avg_memory = avg_response_time = current_error_rate = current_throughput = 0
            
            # Request statistics
            total_requests = len(self.request_history)
            recent_requests = [r for r in self.request_history if 
                             datetime.fromisoformat(r['timestamp']) > datetime.utcnow() - timedelta(hours=1)]
            
            # Error statistics
            total_errors = len(self.error_history)
            recent_errors = [e for e in self.error_history if 
                           datetime.fromisoformat(e['timestamp']) > datetime.utcnow() - timedelta(hours=1)]
            
            return {
                "timestamp": datetime.utcnow().isoformat(),
                "performance": {
                    "avg_cpu_percent": round(avg_cpu, 2),
                    "avg_memory_percent": round(avg_memory, 2),
                    "avg_response_time_ms": round(avg_response_time, 2),
                    "current_error_rate": round(current_error_rate, 4),
                    "current_throughput_rps": round(current_throughput, 2)
                },
                "requests": {
                    "total_requests": total_requests,
                    "requests_last_hour": len(recent_requests),
                    "requests_per_hour": len(recent_requests)
                },
                "errors": {
                    "total_errors": total_errors,
                    "errors_last_hour": len(recent_errors),
                    "error_types": self._get_error_type_counts(recent_errors)
                },
                "alerts": {
                    "active_alerts": len(self.get_active_alerts()),
                    "critical_alerts": len(self.get_active_alerts(AlertSeverity.CRITICAL)),
                    "high_alerts": len(self.get_active_alerts(AlertSeverity.HIGH))
                },
                "health_status": {name: status.get("status", "unknown") 
                                for name, status in self.health_status.items()}
            }
            
        except Exception as e:
            logger.error("Failed to get metrics summary", error=str(e))
            return {"error": str(e)}
    
    def _get_error_type_counts(self, errors: List[Dict[str, Any]]) -> Dict[str, int]:
        """Get error type counts"""
        counts = defaultdict(int)
        for error in errors:
            counts[error['error_type']] += 1
        return dict(counts)
    
    def get_prometheus_metrics(self) -> str:
        """Get metrics in Prometheus format"""
        try:
            return generate_latest(self.registry).decode('utf-8')
        except Exception as e:
            logger.error("Failed to generate Prometheus metrics", error=str(e))
            return ""
    
    async def cleanup_old_data(self, retention_hours: int = 168):  # 7 days default
        """Clean up old metrics and alerts"""
        try:
            cutoff_time = datetime.utcnow() - timedelta(hours=retention_hours)
            
            # Clean up Redis keys
            pattern = "pam:metrics:*"
            keys = self.redis_client.keys(pattern)
            
            for key in keys:
                try:
                    # Extract timestamp from key
                    timestamp = int(key.decode().split(':')[-1])
                    if datetime.fromtimestamp(timestamp) < cutoff_time:
                        self.redis_client.delete(key)
                except Exception:
                    continue
            
            # Clean up old alerts
            pattern = "pam:alert:*"
            keys = self.redis_client.keys(pattern)
            
            for key in keys:
                try:
                    alert_data = json.loads(self.redis_client.get(key))
                    alert_time = datetime.fromisoformat(alert_data['timestamp'])
                    if alert_time < cutoff_time and alert_data.get('resolved'):
                        self.redis_client.delete(key)
                except Exception:
                    continue
            
            logger.info(f"Cleaned up metrics data older than {retention_hours} hours")
            
        except Exception as e:
            logger.error("Failed to clean up old data", error=str(e))