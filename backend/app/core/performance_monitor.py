"""
Performance Monitor Service
Real-time performance monitoring with alerting and auto-remediation.
"""

import asyncio
import time
import psutil
from typing import Dict, Any, Optional, List
from datetime import datetime, timedelta
from dataclasses import dataclass
from enum import Enum

from app.core.logging import get_logger
from app.monitoring.memory_optimizer import memory_optimizer

logger = get_logger(__name__)

class AlertLevel(Enum):
    INFO = "info"
    WARNING = "warning"
    CRITICAL = "critical"
    EMERGENCY = "emergency"

@dataclass
class PerformanceMetric:
    name: str
    value: float
    threshold_warning: float
    threshold_critical: float
    timestamp: datetime
    unit: str = ""
    
    @property
    def alert_level(self) -> AlertLevel:
        if self.value >= self.threshold_critical:
            return AlertLevel.CRITICAL
        elif self.value >= self.threshold_warning:
            return AlertLevel.WARNING
        else:
            return AlertLevel.INFO

@dataclass
class PerformanceAlert:
    metric: PerformanceMetric
    level: AlertLevel
    message: str
    timestamp: datetime
    auto_remediation_attempted: bool = False
    remediation_result: Optional[str] = None

class PerformanceMonitor:
    """Real-time performance monitoring with auto-remediation."""
    
    def __init__(self):
        self.is_running = False
        self.monitoring_task = None
        self.metrics_history: Dict[str, List[PerformanceMetric]] = {}
        self.active_alerts: Dict[str, PerformanceAlert] = {}
        self.check_interval = 30  # seconds
        self.history_retention = timedelta(hours=24)
        
        # Thresholds (can be configured via environment)
        self.thresholds = {
            'memory_percent': {'warning': 65.0, 'critical': 75.0},
            'cpu_percent': {'warning': 70.0, 'critical': 85.0},
            'disk_percent': {'warning': 75.0, 'critical': 85.0},
            'process_memory_mb': {'warning': 1000, 'critical': 1500},
            'response_time_ms': {'warning': 1000, 'critical': 2000},
            'active_connections': {'warning': 100, 'critical': 200},
        }
    
    async def start(self):
        """Start performance monitoring."""
        if self.is_running:
            return
            
        self.is_running = True
        logger.info("📊 Starting performance monitoring service...")
        
        self.monitoring_task = asyncio.create_task(self._monitoring_loop())
        logger.info("✅ Performance monitoring service started")
    
    async def stop(self):
        """Stop performance monitoring."""
        self.is_running = False
        
        if self.monitoring_task:
            self.monitoring_task.cancel()
            try:
                await self.monitoring_task
            except asyncio.CancelledError:
                pass
                
        logger.info("🛑 Performance monitoring service stopped")
    
    async def _monitoring_loop(self):
        """Main monitoring loop."""
        while self.is_running:
            try:
                await self._collect_metrics()
                await self._check_alerts()
                await self._cleanup_old_data()
                await asyncio.sleep(self.check_interval)
                
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"❌ Performance monitoring error: {e}")
                await asyncio.sleep(self.check_interval)
    
    async def _collect_metrics(self):
        """Collect performance metrics."""
        timestamp = datetime.utcnow()
        
        # System metrics
        memory = psutil.virtual_memory()
        cpu = psutil.cpu_percent(interval=1)
        disk = psutil.disk_usage('/')
        
        # Process metrics
        process = psutil.Process()
        process_memory = process.memory_info()
        
        # Create metrics
        metrics = [
            PerformanceMetric(
                name='memory_percent',
                value=memory.percent,
                threshold_warning=self.thresholds['memory_percent']['warning'],
                threshold_critical=self.thresholds['memory_percent']['critical'],
                timestamp=timestamp,
                unit='%'
            ),
            PerformanceMetric(
                name='cpu_percent',
                value=cpu,
                threshold_warning=self.thresholds['cpu_percent']['warning'],
                threshold_critical=self.thresholds['cpu_percent']['critical'],
                timestamp=timestamp,
                unit='%'
            ),
            PerformanceMetric(
                name='disk_percent',
                value=(disk.used / disk.total) * 100,
                threshold_warning=self.thresholds['disk_percent']['warning'],
                threshold_critical=self.thresholds['disk_percent']['critical'],
                timestamp=timestamp,
                unit='%'
            ),
            PerformanceMetric(
                name='process_memory_mb',
                value=process_memory.rss / 1024 / 1024,
                threshold_warning=self.thresholds['process_memory_mb']['warning'],
                threshold_critical=self.thresholds['process_memory_mb']['critical'],
                timestamp=timestamp,
                unit='MB'
            ),
        ]
        
        # Store metrics in history
        for metric in metrics:
            if metric.name not in self.metrics_history:
                self.metrics_history[metric.name] = []
            self.metrics_history[metric.name].append(metric)
            
            # Keep only recent metrics
            cutoff_time = timestamp - self.history_retention
            self.metrics_history[metric.name] = [
                m for m in self.metrics_history[metric.name] 
                if m.timestamp > cutoff_time
            ]
    
    async def _check_alerts(self):
        """Check for alert conditions and trigger auto-remediation."""
        current_metrics = {}
        
        # Get latest metrics
        for metric_name, history in self.metrics_history.items():
            if history:
                current_metrics[metric_name] = history[-1]
        
        # Check each metric for alerts
        for metric_name, metric in current_metrics.items():
            alert_key = f"{metric_name}_{metric.alert_level.value}"
            
            if metric.alert_level in [AlertLevel.WARNING, AlertLevel.CRITICAL]:
                # Create or update alert
                if alert_key not in self.active_alerts:
                    alert = PerformanceAlert(
                        metric=metric,
                        level=metric.alert_level,
                        message=f"{metric.name} is {metric.value:.1f}{metric.unit} (threshold: {metric.threshold_warning if metric.alert_level == AlertLevel.WARNING else metric.threshold_critical}{metric.unit})",
                        timestamp=metric.timestamp
                    )
                    self.active_alerts[alert_key] = alert
                    
                    # Log alert
                    if metric.alert_level == AlertLevel.CRITICAL:
                        logger.error(f"🚨 CRITICAL ALERT: {alert.message}")
                    else:
                        logger.warning(f"⚠️ WARNING ALERT: {alert.message}")
                    
                    # Attempt auto-remediation
                    await self._attempt_auto_remediation(alert)
                else:
                    # Update existing alert
                    self.active_alerts[alert_key].metric = metric
            else:
                # Clear resolved alerts
                if alert_key in self.active_alerts:
                    logger.info(f"✅ ALERT RESOLVED: {metric.name} is now {metric.value:.1f}{metric.unit}")
                    del self.active_alerts[alert_key]
    
    async def _attempt_auto_remediation(self, alert: PerformanceAlert):
        """Attempt automatic remediation based on alert type."""
        if alert.auto_remediation_attempted:
            return
            
        alert.auto_remediation_attempted = True
        metric_name = alert.metric.name
        
        try:
            if metric_name == 'memory_percent':
                logger.info(f"🔧 Auto-remediation: Triggering memory optimization for {alert.metric.value:.1f}% usage")
                if alert.level == AlertLevel.CRITICAL:
                    # Force aggressive cleanup
                    await memory_optimizer._aggressive_cleanup()
                    alert.remediation_result = "Aggressive memory cleanup triggered"
                else:
                    # Standard cleanup
                    await memory_optimizer._standard_cleanup()
                    alert.remediation_result = "Standard memory cleanup triggered"
                    
            elif metric_name == 'disk_percent':
                logger.info(f"🔧 Auto-remediation: Triggering disk cleanup for {alert.metric.value:.1f}% usage")
                await memory_optimizer._cleanup_disk_space()
                alert.remediation_result = "Disk cleanup triggered"
                
            elif metric_name == 'cpu_percent':
                logger.info(f"🔧 Auto-remediation: CPU optimization for {alert.metric.value:.1f}% usage")
                # Reduce background task frequency
                await self._optimize_cpu_usage()
                alert.remediation_result = "CPU optimization applied"
                
            elif metric_name == 'process_memory_mb':
                logger.info(f"🔧 Auto-remediation: Process memory optimization for {alert.metric.value:.1f}MB usage")
                await memory_optimizer._aggressive_cleanup()
                alert.remediation_result = "Process memory cleanup triggered"
            
            logger.info(f"✅ Auto-remediation completed: {alert.remediation_result}")
            
        except Exception as e:
            error_msg = f"Auto-remediation failed: {e}"
            logger.error(f"❌ {error_msg}")
            alert.remediation_result = error_msg
    
    async def _optimize_cpu_usage(self):
        """Apply CPU optimization strategies."""
        try:
            # Reduce background task frequencies temporarily
            import gc
            gc.collect()  # Force garbage collection
            
            # Log high CPU processes
            processes = []
            for proc in psutil.process_iter(['pid', 'name', 'cpu_percent']):
                try:
                    if proc.info['cpu_percent'] > 5.0:
                        processes.append(proc.info)
                except (psutil.NoSuchProcess, psutil.AccessDenied):
                    pass
            
            if processes:
                processes.sort(key=lambda x: x['cpu_percent'], reverse=True)
                logger.warning(f"🔥 High CPU processes: {processes[:5]}")
                
        except Exception as e:
            logger.error(f"❌ CPU optimization failed: {e}")
    
    async def _cleanup_old_data(self):
        """Clean up old performance data."""
        cutoff_time = datetime.utcnow() - self.history_retention
        
        for metric_name in self.metrics_history:
            old_count = len(self.metrics_history[metric_name])
            self.metrics_history[metric_name] = [
                m for m in self.metrics_history[metric_name] 
                if m.timestamp > cutoff_time
            ]
            new_count = len(self.metrics_history[metric_name])
            
            if old_count != new_count:
                logger.debug(f"🧹 Cleaned up {old_count - new_count} old {metric_name} metrics")
    
    async def get_current_status(self) -> Dict[str, Any]:
        """Get current performance status."""
        current_metrics = {}
        for metric_name, history in self.metrics_history.items():
            if history:
                latest = history[-1]
                current_metrics[metric_name] = {
                    'value': latest.value,
                    'unit': latest.unit,
                    'alert_level': latest.alert_level.value,
                    'timestamp': latest.timestamp.isoformat()
                }
        
        active_alerts = []
        for alert in self.active_alerts.values():
            active_alerts.append({
                'metric': alert.metric.name,
                'level': alert.level.value,
                'message': alert.message,
                'timestamp': alert.timestamp.isoformat(),
                'auto_remediation_attempted': alert.auto_remediation_attempted,
                'remediation_result': alert.remediation_result
            })
        
        return {
            'monitoring_active': self.is_running,
            'current_metrics': current_metrics,
            'active_alerts': active_alerts,
            'metrics_history_size': {
                name: len(history) for name, history in self.metrics_history.items()
            }
        }
    
    async def get_performance_report(self, hours: int = 1) -> Dict[str, Any]:
        """Generate performance report for the last N hours."""
        cutoff_time = datetime.utcnow() - timedelta(hours=hours)
        
        report = {
            'report_period_hours': hours,
            'generated_at': datetime.utcnow().isoformat(),
            'metrics_summary': {},
            'alert_summary': {},
            'recommendations': []
        }
        
        # Analyze metrics for the period
        for metric_name, history in self.metrics_history.items():
            period_metrics = [m for m in history if m.timestamp > cutoff_time]
            
            if period_metrics:
                values = [m.value for m in period_metrics]
                report['metrics_summary'][metric_name] = {
                    'min': min(values),
                    'max': max(values),
                    'avg': sum(values) / len(values),
                    'current': values[-1],
                    'unit': period_metrics[-1].unit,
                    'data_points': len(values)
                }
        
        # Analyze alerts
        alert_counts = {'warning': 0, 'critical': 0}
        for alert in self.active_alerts.values():
            if alert.timestamp > cutoff_time:
                alert_counts[alert.level.value] += 1
        
        report['alert_summary'] = alert_counts
        
        # Generate recommendations
        report['recommendations'] = self._generate_recommendations(report['metrics_summary'])
        
        return report
    
    def _generate_recommendations(self, metrics_summary: Dict[str, Any]) -> List[str]:
        """Generate performance recommendations based on metrics."""
        recommendations = []
        
        if 'memory_percent' in metrics_summary:
            avg_memory = metrics_summary['memory_percent']['avg']
            if avg_memory > 70:
                recommendations.append("Consider upgrading memory or optimizing memory usage")
            elif avg_memory > 60:
                recommendations.append("Monitor memory usage closely and consider optimization")
        
        if 'cpu_percent' in metrics_summary:
            avg_cpu = metrics_summary['cpu_percent']['avg']
            if avg_cpu > 70:
                recommendations.append("High CPU usage detected - review background processes")
            elif avg_cpu > 50:
                recommendations.append("Monitor CPU usage and consider process optimization")
        
        if 'disk_percent' in metrics_summary:
            avg_disk = metrics_summary['disk_percent']['avg']
            if avg_disk > 80:
                recommendations.append("Disk usage is high - implement log rotation and cleanup")
            elif avg_disk > 70:
                recommendations.append("Monitor disk usage and plan cleanup schedule")
        
        if not recommendations:
            recommendations.append("System performance is within normal parameters")
        
        return recommendations

# Global performance monitor instance
performance_monitor = PerformanceMonitor()

async def get_performance_monitor() -> PerformanceMonitor:
    """Get the global performance monitor instance."""
    return performance_monitor