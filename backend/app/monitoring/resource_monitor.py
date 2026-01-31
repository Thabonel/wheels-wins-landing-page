"""
Production resource monitoring and health assessment
"""
import psutil
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional
from dataclasses import dataclass


@dataclass
class ResourceAlert:
    """Resource usage alert"""
    component: str
    level: str  # WARNING, CRITICAL
    message: str
    value: float
    threshold: float
    timestamp: datetime


class ResourceMonitor:
    """Monitor system resources and assess health"""

    def __init__(self):
        self.logger = logging.getLogger(__name__)

        # Health thresholds
        self.thresholds = {
            "memory": {"warning": 65.0, "critical": 80.0},
            "disk": {"warning": 75.0, "critical": 85.0},
            "cpu": {"warning": 85.0, "critical": 95.0}
        }

    def get_system_stats(self) -> Dict[str, float]:
        """Collect current system resource statistics"""

        # Memory statistics
        memory = psutil.virtual_memory()

        # Disk statistics (root filesystem)
        disk = psutil.disk_usage('/')

        # CPU statistics (1-second average)
        cpu_percent = psutil.cpu_percent(interval=1)

        # Process-specific statistics
        process = psutil.Process()
        process_memory = process.memory_info()

        return {
            "memory_percent": memory.percent,
            "memory_used_gb": memory.used / (1024**3),
            "memory_available_gb": memory.available / (1024**3),
            "memory_total_gb": memory.total / (1024**3),

            "disk_percent": (disk.used / disk.total) * 100,
            "disk_used_gb": disk.used / (1024**3),
            "disk_free_gb": disk.free / (1024**3),
            "disk_total_gb": disk.total / (1024**3),

            "cpu_percent": cpu_percent,
            "cpu_count": psutil.cpu_count(),

            "process_memory_mb": process_memory.rss / (1024**2),
            "process_cpu_percent": process.cpu_percent(),

            "timestamp": datetime.now().timestamp()
        }

    def assess_health(self, stats: Dict[str, float]) -> Dict[str, any]:
        """Assess overall system health and generate alerts"""

        alerts = []
        health_scores = []

        # Check memory health
        memory_pct = stats.get("memory_percent", 0)
        if memory_pct >= self.thresholds["memory"]["critical"]:
            alerts.append(ResourceAlert(
                component="memory",
                level="CRITICAL",
                message=f"Critical memory usage: {memory_pct:.1f}%",
                value=memory_pct,
                threshold=self.thresholds["memory"]["critical"],
                timestamp=datetime.now()
            ))
            health_scores.append(0)  # Critical = 0
        elif memory_pct >= self.thresholds["memory"]["warning"]:
            alerts.append(ResourceAlert(
                component="memory",
                level="WARNING",
                message=f"High memory usage: {memory_pct:.1f}%",
                value=memory_pct,
                threshold=self.thresholds["memory"]["warning"],
                timestamp=datetime.now()
            ))
            health_scores.append(50)  # Warning = 50
        else:
            health_scores.append(100)  # Healthy = 100

        # Check disk health
        disk_pct = stats.get("disk_percent", 0)
        if disk_pct >= self.thresholds["disk"]["critical"]:
            alerts.append(ResourceAlert(
                component="disk",
                level="CRITICAL",
                message=f"Critical disk usage: {disk_pct:.1f}%",
                value=disk_pct,
                threshold=self.thresholds["disk"]["critical"],
                timestamp=datetime.now()
            ))
            health_scores.append(0)
        elif disk_pct >= self.thresholds["disk"]["warning"]:
            alerts.append(ResourceAlert(
                component="disk",
                level="WARNING",
                message=f"High disk usage: {disk_pct:.1f}%",
                value=disk_pct,
                threshold=self.thresholds["disk"]["warning"],
                timestamp=datetime.now()
            ))
            health_scores.append(50)
        else:
            health_scores.append(100)

        # Check CPU health
        cpu_pct = stats.get("cpu_percent", 0)
        if cpu_pct >= self.thresholds["cpu"]["critical"]:
            alerts.append(ResourceAlert(
                component="cpu",
                level="CRITICAL",
                message=f"Critical CPU usage: {cpu_pct:.1f}%",
                value=cpu_pct,
                threshold=self.thresholds["cpu"]["critical"],
                timestamp=datetime.now()
            ))
            health_scores.append(0)
        elif cpu_pct >= self.thresholds["cpu"]["warning"]:
            alerts.append(ResourceAlert(
                component="cpu",
                level="WARNING",
                message=f"High CPU usage: {cpu_pct:.1f}%",
                value=cpu_pct,
                threshold=self.thresholds["cpu"]["warning"],
                timestamp=datetime.now()
            ))
            health_scores.append(50)
        else:
            health_scores.append(100)

        # Overall health assessment
        avg_health = sum(health_scores) / len(health_scores) if health_scores else 100

        if avg_health == 100:
            overall_status = "HEALTHY"
        elif avg_health >= 50:
            overall_status = "WARNING"
        else:
            overall_status = "CRITICAL"

        return {
            "status": overall_status,
            "health_score": avg_health,
            "alerts": len(alerts),
            "alert_details": [
                {
                    "component": alert.component,
                    "level": alert.level,
                    "message": alert.message,
                    "value": alert.value,
                    "threshold": alert.threshold
                }
                for alert in alerts
            ],
            "stats": {
                "memory_pct": memory_pct,
                "disk_pct": disk_pct,
                "cpu_pct": cpu_pct
            },
            "timestamp": datetime.now().isoformat()
        }

    def get_health_summary(self) -> Dict[str, any]:
        """Get current health summary"""
        stats = self.get_system_stats()
        return self.assess_health(stats)


# Global monitor instance
resource_monitor = ResourceMonitor()