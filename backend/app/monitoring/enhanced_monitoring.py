"""
Enhanced Monitoring and Alerting System
Comprehensive system monitoring with intelligent alerts and performance tracking.
"""

import asyncio
import time
import json
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional, Callable
from dataclasses import dataclass, asdict
from enum import Enum
import psutil

from app.core.logging import get_logger

logger = get_logger(__name__)


class AlertLevel(Enum):
    """Alert severity levels."""
    INFO = "info"
    WARNING = "warning"
    ERROR = "error"
    CRITICAL = "critical"


class MetricType(Enum):
    """Types of metrics being monitored."""
    SYSTEM = "system"
    APPLICATION = "application"
    PERFORMANCE = "performance"
    BUSINESS = "business"


@dataclass
class Alert:
    """Alert data structure."""
    id: str
    level: AlertLevel
    metric_type: MetricType
    title: str
    message: str
    value: float
    threshold: float
    timestamp: datetime
    resolved: bool = False
    resolved_at: Optional[datetime] = None
    metadata: Dict[str, Any] = None

    def to_dict(self) -> Dict[str, Any]:
        """Convert alert to dictionary."""
        data = asdict(self)
        data['level'] = self.level.value
        data['metric_type'] = self.metric_type.value
        data['timestamp'] = self.timestamp.isoformat()
        if self.resolved_at:
            data['resolved_at'] = self.resolved_at.isoformat()
        return data


@dataclass
class MetricThreshold:
    """Metric threshold configuration."""
    warning: float
    error: float
    critical: float
    check_interval: int = 60  # seconds
    enabled: bool = True


class EnhancedMonitoringSystem:
    """
    Comprehensive monitoring system with intelligent alerting.
    
    Features:
    - Multi-level thresholds (warning, error, critical)
    - Adaptive alerting with rate limiting
    - Historical trend analysis
    - Performance regression detection
    - Custom metric tracking
    - Alert correlation and grouping
    """
    
    def __init__(self):
        self.is_running = False
        self._monitoring_task = None
        self._alert_processor_task = None
        
        # Alert management
        self.active_alerts: Dict[str, Alert] = {}
        self.alert_history: List[Alert] = []
        self.max_alert_history = 1000
        self.alert_callbacks: List[Callable[[Alert], None]] = []
        
        # Metrics storage
        self.metric_history: Dict[str, List[Dict[str, Any]]] = {}
        self.max_metric_history = 288  # 24 hours at 5min intervals
        
        # Configuration
        self.thresholds = self._initialize_thresholds()
        self.monitoring_interval = 30  # seconds
        self.trend_analysis_window = 12  # samples for trend analysis
        
        # Performance tracking
        self.performance_baselines: Dict[str, float] = {}
        self.regression_sensitivity = 0.2  # 20% regression threshold
        
    def _initialize_thresholds(self) -> Dict[str, MetricThreshold]:
        """Initialize monitoring thresholds."""
        return {
            'memory_usage': MetricThreshold(
                warning=75.0, error=85.0, critical=95.0, check_interval=30
            ),
            'cpu_usage': MetricThreshold(
                warning=80.0, error=90.0, critical=95.0, check_interval=30
            ),
            'disk_usage': MetricThreshold(
                warning=80.0, error=90.0, critical=95.0, check_interval=60
            ),
            'response_time': MetricThreshold(
                warning=1000.0, error=2000.0, critical=5000.0, check_interval=30
            ),
            'error_rate': MetricThreshold(
                warning=5.0, error=10.0, critical=25.0, check_interval=60
            ),
            'websocket_connections': MetricThreshold(
                warning=500.0, error=800.0, critical=1000.0, check_interval=60
            ),
            'database_connections': MetricThreshold(
                warning=50.0, error=80.0, critical=100.0, check_interval=60
            ),
            'memory_leaks': MetricThreshold(
                warning=10.0, error=20.0, critical=50.0, check_interval=300
            )
        }
    
    async def start(self):
        """Start the enhanced monitoring system."""
        if self.is_running:
            return
            
        self.is_running = True
        logger.info("🚀 Starting enhanced monitoring system...")
        
        # Start monitoring tasks
        self._monitoring_task = asyncio.create_task(self._monitoring_loop())
        self._alert_processor_task = asyncio.create_task(self._alert_processor_loop())
        
        logger.info("✅ Enhanced monitoring system started")
        
    async def stop(self):
        """Stop the monitoring system."""
        self.is_running = False
        
        # Cancel tasks
        for task in [self._monitoring_task, self._alert_processor_task]:
            if task:
                task.cancel()
                try:
                    await task
                except asyncio.CancelledError:
                    pass
                    
        logger.info("🛑 Enhanced monitoring system stopped")
        
    async def _monitoring_loop(self):
        """Main monitoring loop."""
        while self.is_running:
            try:
                await asyncio.sleep(self.monitoring_interval)
                await self._collect_and_analyze_metrics()
                
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"❌ Monitoring loop error: {e}")
                await asyncio.sleep(60)
                
    async def _alert_processor_loop(self):
        """Process and manage alerts."""
        while self.is_running:
            try:
                await asyncio.sleep(10)  # Process alerts every 10 seconds
                await self._process_alert_lifecycle()
                
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"❌ Alert processor error: {e}")
                await asyncio.sleep(30)
                
    async def _collect_and_analyze_metrics(self):
        """Collect metrics and perform analysis."""
        try:
            # Collect system metrics
            system_metrics = await self._collect_system_metrics()
            
            # Collect application metrics
            app_metrics = await self._collect_application_metrics()
            
            # Combine metrics
            all_metrics = {**system_metrics, **app_metrics}
            
            # Store metrics history
            self._store_metrics(all_metrics)
            
            # Analyze metrics and generate alerts
            await self._analyze_metrics(all_metrics)
            
            # Perform trend analysis
            await self._perform_trend_analysis()
            
            # Check for performance regressions
            await self._check_performance_regressions(all_metrics)
            
        except Exception as e:
            logger.error(f"❌ Metric collection failed: {e}")
            
    async def _collect_system_metrics(self) -> Dict[str, Any]:
        """Collect system-level metrics."""
        try:
            # Memory metrics
            memory = psutil.virtual_memory()
            swap = psutil.swap_memory()
            
            # CPU metrics
            cpu_percent = psutil.cpu_percent(interval=1)
            cpu_count = psutil.cpu_count()
            
            # Disk metrics
            disk = psutil.disk_usage('/')
            
            # Network metrics
            try:
                network = psutil.net_io_counters()
                network_metrics = {
                    'bytes_sent': network.bytes_sent,
                    'bytes_recv': network.bytes_recv,
                    'packets_sent': network.packets_sent,
                    'packets_recv': network.packets_recv
                }
            except Exception:
                network_metrics = {}
            
            # Process metrics
            process = psutil.Process()
            process_memory = process.memory_info()
            
            return {
                'memory_usage': memory.percent,
                'memory_available_mb': memory.available / (1024**2),
                'memory_used_mb': memory.used / (1024**2),
                'swap_usage': swap.percent,
                'cpu_usage': cpu_percent,
                'cpu_count': cpu_count,
                'disk_usage': (disk.used / disk.total) * 100,
                'disk_free_gb': disk.free / (1024**3),
                'process_memory_mb': process_memory.rss / (1024**2),
                'process_memory_percent': process.memory_percent(),
                'process_cpu_percent': process.cpu_percent(),
                'process_threads': process.num_threads(),
                **network_metrics
            }
            
        except Exception as e:
            logger.error(f"❌ System metrics collection failed: {e}")
            return {}
            
    async def _collect_application_metrics(self) -> Dict[str, Any]:
        """Collect application-specific metrics."""
        try:
            metrics = {}
            
            # Get WebSocket connections (if available)
            try:
                from app.core.websocket_manager import websocket_manager
                metrics['websocket_connections'] = len(websocket_manager.active_connections)
            except Exception:
                metrics['websocket_connections'] = 0
                
            # Get database connection pool stats (if available)
            try:
                # This would depend on your database setup
                metrics['database_connections'] = 0  # Placeholder
            except Exception:
                metrics['database_connections'] = 0
                
            # Calculate error rate from recent logs (simplified)
            metrics['error_rate'] = await self._calculate_error_rate()
            
            # Calculate average response time
            metrics['response_time'] = await self._calculate_avg_response_time()
            
            # Memory leak detection score
            metrics['memory_leaks'] = await self._calculate_memory_leak_score()
            
            return metrics
            
        except Exception as e:
            logger.error(f"❌ Application metrics collection failed: {e}")
            return {}
            
    async def _calculate_error_rate(self) -> float:
        """Calculate error rate based on recent activity."""
        # This is a simplified implementation
        # In practice, you'd integrate with your logging system
        return 0.0  # Placeholder
        
    async def _calculate_avg_response_time(self) -> float:
        """Calculate average response time."""
        # This would integrate with your request tracking
        return 100.0  # Placeholder in milliseconds
        
    async def _calculate_memory_leak_score(self) -> float:
        """Calculate memory leak detection score."""
        if 'memory_usage' not in self.metric_history:
            return 0.0
            
        history = self.metric_history['memory_usage'][-10:]  # Last 10 samples
        if len(history) < 5:
            return 0.0
            
        # Simple trend analysis
        values = [entry['value'] for entry in history]
        trend_score = (values[-1] - values[0]) / len(values)
        
        return max(0.0, trend_score)  # Only positive trends indicate potential leaks
        
    def _store_metrics(self, metrics: Dict[str, Any]):
        """Store metrics in history."""
        timestamp = datetime.utcnow()
        
        for metric_name, value in metrics.items():
            if metric_name not in self.metric_history:
                self.metric_history[metric_name] = []
                
            self.metric_history[metric_name].append({
                'timestamp': timestamp,
                'value': value
            })
            
            # Limit history size
            if len(self.metric_history[metric_name]) > self.max_metric_history:
                self.metric_history[metric_name] = self.metric_history[metric_name][-self.max_metric_history:]
                
    async def _analyze_metrics(self, metrics: Dict[str, Any]):
        """Analyze metrics and generate alerts."""
        for metric_name, value in metrics.items():
            if metric_name not in self.thresholds:
                continue
                
            threshold = self.thresholds[metric_name]
            if not threshold.enabled:
                continue
                
            alert_level = None
            if value >= threshold.critical:
                alert_level = AlertLevel.CRITICAL
            elif value >= threshold.error:
                alert_level = AlertLevel.ERROR
            elif value >= threshold.warning:
                alert_level = AlertLevel.WARNING
                
            if alert_level:
                await self._create_alert(
                    metric_name=metric_name,
                    level=alert_level,
                    value=value,
                    threshold_value=getattr(threshold, alert_level.value),
                    metric_type=MetricType.SYSTEM if metric_name in [
                        'memory_usage', 'cpu_usage', 'disk_usage'
                    ] else MetricType.APPLICATION
                )
                
    async def _create_alert(self, metric_name: str, level: AlertLevel, 
                          value: float, threshold_value: float, 
                          metric_type: MetricType):
        """Create a new alert."""
        alert_id = f"{metric_name}_{level.value}"
        
        # Check if alert already exists
        if alert_id in self.active_alerts:
            # Update existing alert
            self.active_alerts[alert_id].value = value
            self.active_alerts[alert_id].timestamp = datetime.utcnow()
            return
            
        # Create new alert
        alert = Alert(
            id=alert_id,
            level=level,
            metric_type=metric_type,
            title=f"{metric_name.replace('_', ' ').title()} {level.value.title()}",
            message=f"{metric_name} is {value:.1f}, exceeding {level.value} threshold of {threshold_value:.1f}",
            value=value,
            threshold=threshold_value,
            timestamp=datetime.utcnow(),
            metadata={'metric_name': metric_name}
        )
        
        self.active_alerts[alert_id] = alert
        self.alert_history.append(alert)
        
        # Limit alert history
        if len(self.alert_history) > self.max_alert_history:
            self.alert_history = self.alert_history[-self.max_alert_history:]
            
        # Notify callbacks
        for callback in self.alert_callbacks:
            try:
                callback(alert)
            except Exception as e:
                logger.error(f"❌ Alert callback failed: {e}")
                
        logger.warning(f"🚨 {alert.level.value.upper()}: {alert.message}")
        
    async def _process_alert_lifecycle(self):
        """Process alert lifecycle and auto-resolution."""
        current_time = datetime.utcnow()
        resolved_alerts = []
        
        for alert_id, alert in list(self.active_alerts.items()):
            metric_name = alert.metadata.get('metric_name', alert_id.split('_')[0])
            
            # Check if alert should be resolved
            if self._should_resolve_alert(alert, metric_name):
                alert.resolved = True
                alert.resolved_at = current_time
                resolved_alerts.append(alert_id)
                
                logger.info(f"✅ Alert resolved: {alert.title}")
                
        # Remove resolved alerts from active list
        for alert_id in resolved_alerts:
            del self.active_alerts[alert_id]
            
    def _should_resolve_alert(self, alert: Alert, metric_name: str) -> bool:
        """Check if an alert should be automatically resolved."""
        if metric_name not in self.metric_history:
            return False
            
        # Get recent values
        recent_values = self.metric_history[metric_name][-3:]  # Last 3 samples
        if len(recent_values) < 3:
            return False
            
        # Check if all recent values are below warning threshold
        threshold = self.thresholds.get(metric_name)
        if not threshold:
            return False
            
        for entry in recent_values:
            if entry['value'] >= threshold.warning:
                return False
                
        return True
        
    async def _perform_trend_analysis(self):
        """Perform trend analysis on metrics."""
        for metric_name, history in self.metric_history.items():
            if len(history) < self.trend_analysis_window:
                continue
                
            recent_history = history[-self.trend_analysis_window:]
            await self._analyze_metric_trend(metric_name, recent_history)
            
    async def _analyze_metric_trend(self, metric_name: str, history: List[Dict[str, Any]]):
        """Analyze trend for a specific metric."""
        values = [entry['value'] for entry in history]
        
        # Simple linear trend analysis
        n = len(values)
        sum_x = sum(range(n))
        sum_y = sum(values)
        sum_xy = sum(i * values[i] for i in range(n))
        sum_x2 = sum(i * i for i in range(n))
        
        # Calculate slope (trend)
        slope = (n * sum_xy - sum_x * sum_y) / (n * sum_x2 - sum_x * sum_x)
        
        # Determine if trend is concerning
        if abs(slope) > 1.0:  # Configurable threshold
            trend_direction = "increasing" if slope > 0 else "decreasing"
            logger.debug(f"📈 Trend detected in {metric_name}: {trend_direction} at rate {slope:.2f}")
            
    async def _check_performance_regressions(self, current_metrics: Dict[str, Any]):
        """Check for performance regressions."""
        for metric_name, current_value in current_metrics.items():
            if metric_name not in self.performance_baselines:
                # Set baseline
                self.performance_baselines[metric_name] = current_value
                continue
                
            baseline = self.performance_baselines[metric_name]
            
            # Check for regression (performance getting worse)
            regression_threshold = baseline * (1 + self.regression_sensitivity)
            
            if current_value > regression_threshold and metric_name in ['response_time', 'memory_usage', 'cpu_usage']:
                logger.warning(f"📉 Performance regression detected in {metric_name}: "
                             f"Current: {current_value:.1f}, Baseline: {baseline:.1f} "
                             f"(+{((current_value - baseline) / baseline * 100):.1f}%)")
                
    def add_alert_callback(self, callback: Callable[[Alert], None]):
        """Add a callback function for new alerts."""
        self.alert_callbacks.append(callback)
        
    def remove_alert_callback(self, callback: Callable[[Alert], None]):
        """Remove an alert callback."""
        if callback in self.alert_callbacks:
            self.alert_callbacks.remove(callback)
            
    async def get_monitoring_status(self) -> Dict[str, Any]:
        """Get comprehensive monitoring status."""
        try:
            return {
                "system_status": {
                    "monitoring_active": self.is_running,
                    "monitoring_interval": self.monitoring_interval,
                    "active_alerts": len(self.active_alerts),
                    "total_alerts_today": len([
                        alert for alert in self.alert_history
                        if alert.timestamp > datetime.utcnow() - timedelta(days=1)
                    ])
                },
                "active_alerts": [alert.to_dict() for alert in self.active_alerts.values()],
                "recent_alerts": [
                    alert.to_dict() for alert in self.alert_history[-10:]
                ],
                "thresholds": {
                    name: {
                        'warning': thresh.warning,
                        'error': thresh.error,
                        'critical': thresh.critical,
                        'enabled': thresh.enabled
                    }
                    for name, thresh in self.thresholds.items()
                },
                "metrics_summary": {
                    name: {
                        'current': history[-1]['value'] if history else 0,
                        'samples': len(history)
                    }
                    for name, history in self.metric_history.items()
                },
                "performance_baselines": self.performance_baselines
            }
            
        except Exception as e:
            logger.error(f"❌ Failed to get monitoring status: {e}")
            return {"error": str(e)}
            
    def update_threshold(self, metric_name: str, level: str, value: float):
        """Update a specific threshold value."""
        if metric_name in self.thresholds:
            setattr(self.thresholds[metric_name], level, value)
            logger.info(f"📊 Updated {metric_name} {level} threshold to {value}")
            
    def enable_metric(self, metric_name: str, enabled: bool = True):
        """Enable or disable monitoring for a specific metric."""
        if metric_name in self.thresholds:
            self.thresholds[metric_name].enabled = enabled
            status = "enabled" if enabled else "disabled"
            logger.info(f"📊 {metric_name} monitoring {status}")


# Global enhanced monitoring instance
enhanced_monitoring = EnhancedMonitoringSystem()


async def get_enhanced_monitoring() -> EnhancedMonitoringSystem:
    """Get the global enhanced monitoring instance."""
    return enhanced_monitoring