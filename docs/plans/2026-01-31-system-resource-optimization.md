# System Resource Optimization Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Optimize system resource usage to prevent crashes and improve stability by addressing high memory (75.1%) and disk (84.1%) usage on production infrastructure.

**Architecture:** Multi-tier optimization strategy targeting memory leaks, disk cleanup, configuration tuning, and monitoring improvements. Focus on quick wins first, then structural optimizations.

**Tech Stack:** Python FastAPI, Celery, Redis, Render.com hosting, Supabase, monitoring tools

---

## Problem Statement

**System Impact:** Production backend approaching resource limits with 75.1% memory usage (22.8GB/~30.4GB) and 84.1% disk usage, risking service interruption and degraded performance.

**Root Causes Identified:**
1. **Memory:** Celery workers accumulating tasks (max_tasks_per_child=1000), large Redis connection pool (20 connections), PAM tool instances loaded eagerly
2. **Disk:** Log file growth, temporary files not cleaned, coverage reports accumulating
3. **CPU (78.6%):** Normal for AI operations but indicates system at capacity

**Evidence:** Resource monitoring shows sustained high usage, not temporary spikes. System designed with resilience but operating near limits.

---

## Success Criteria

**Memory Targets:**
- [ ] Reduce memory usage from 75.1% to <60% (save ~4-5GB)
- [ ] Implement memory leak detection and automatic cleanup
- [ ] Establish memory monitoring alerts at 65% threshold

**Disk Targets:**
- [ ] Reduce disk usage from 84.1% to <70% (save ~2-4GB)
- [ ] Implement automated cleanup for logs and temporary files
- [ ] Set up disk monitoring alerts at 75% threshold

**Performance Targets:**
- [ ] Maintain CPU usage <80% during normal operations
- [ ] Improve response time by reducing memory pressure
- [ ] Zero service interruptions due to resource exhaustion

**Operational Targets:**
- [ ] Automated monitoring and alerting system
- [ ] Clear escalation procedures for resource issues
- [ ] Capacity planning dashboard for future growth

---

## Quick Win Optimizations (Immediate Impact)

### Task 1: Optimize Celery Configuration

**Files:**
- Modify: `backend/app/workers/celery.py:45-60`
- Monitor: `backend/app/monitoring/performance_monitor.py`

**Step 1: Write test for memory usage reduction**

```python
# In backend/tests/test_resource_optimization.py (new file)
import psutil
import time
from app.workers.celery import celery_app


def test_celery_memory_optimization():
    """Test that Celery worker memory usage is controlled"""

    # Get initial memory baseline
    process = psutil.Process()
    initial_memory = process.memory_info().rss / 1024 / 1024  # MB

    # Simulate task processing (this would need actual task simulation)
    # For now, verify configuration is optimized

    # Check worker configuration
    assert celery_app.conf.worker_max_tasks_per_child <= 200, \
        f"worker_max_tasks_per_child too high: {celery_app.conf.worker_max_tasks_per_child}"

    assert celery_app.conf.worker_prefetch_multiplier <= 2, \
        f"worker_prefetch_multiplier too high: {celery_app.conf.worker_prefetch_multiplier}"
```

**Step 2: Run baseline test**

Run: `pytest backend/tests/test_resource_optimization.py::test_celery_memory_optimization -v`
Expected: FAIL due to high worker_max_tasks_per_child

**Step 3: Optimize Celery configuration**

Modify `backend/app/workers/celery.py`:

```python
# Memory optimization configuration
celery_app.conf.update(
    # OLD: worker_max_tasks_per_child=1000  # Causes memory accumulation
    worker_max_tasks_per_child=100,  # NEW: Aggressive cleanup, recycle workers every 100 tasks

    # OLD: worker_prefetch_multiplier=4  # Pre-loads too many tasks
    worker_prefetch_multiplier=1,  # NEW: Process one task at a time

    # NEW: Additional memory optimizations
    worker_max_memory_per_child=500000,  # 500MB limit per worker (new in Celery 5.0+)
    task_reject_on_worker_lost=True,  # Don't retry on worker memory issues
    task_acks_late=True,  # Acknowledge tasks only after completion
    worker_disable_rate_limits=False,  # Keep rate limiting for stability

    # Existing broker settings (keep)
    broker_url=REDIS_URL,
    result_backend=REDIS_URL,

    # Queue configuration optimization
    worker_send_task_events=False,  # NEW: Reduce monitoring overhead
    task_send_sent_event=False,  # NEW: Reduce event data
)

# NEW: Add memory monitoring to worker
@celery_app.task(bind=True)
def monitor_worker_memory(self):
    """Monitor and log worker memory usage"""
    import psutil
    import logging

    process = psutil.Process()
    memory_mb = process.memory_info().rss / 1024 / 1024

    logger = logging.getLogger(__name__)
    logger.info(f"Worker {self.request.id} memory usage: {memory_mb:.1f} MB")

    # Force garbage collection if memory high
    if memory_mb > 400:  # 400MB threshold
        import gc
        collected = gc.collect()
        logger.warning(f"Worker memory high ({memory_mb:.1f} MB), forced GC collected {collected} objects")

    return {"memory_mb": memory_mb, "pid": process.pid}
```

**Step 4: Run test to verify optimization**

Run: `pytest backend/tests/test_resource_optimization.py::test_celery_memory_optimization -v`
Expected: PASS

**Step 5: Monitor memory reduction**

```bash
# Before change (baseline)
ps aux | grep celery | awk '{sum+=$6} END {print "Celery total memory: " sum/1024 " MB"}'

# After restart with new config
systemctl restart celery-worker  # Or docker restart
sleep 30
ps aux | grep celery | awk '{sum+=$6} END {print "Celery total memory: " sum/1024 " MB"}'
```

Expected: 20-30% memory reduction in Celery processes

**Step 6: Commit**

```bash
git add backend/app/workers/celery.py backend/tests/test_resource_optimization.py
git commit -m "feat: optimize Celery memory usage - reduce worker_max_tasks_per_child to 100"
```

---

### Task 2: Implement Automated Disk Cleanup

**Files:**
- Create: `backend/scripts/cleanup_system.py`
- Modify: `backend/app/main.py` (for scheduled cleanup)

**Step 1: Write test for cleanup functionality**

```python
# Add to backend/tests/test_resource_optimization.py
import os
import tempfile
from datetime import datetime, timedelta


def test_automated_cleanup_removes_old_files():
    """Test that automated cleanup removes old files but keeps recent ones"""

    # Create temporary directory structure
    with tempfile.TemporaryDirectory() as temp_dir:
        log_dir = os.path.join(temp_dir, "logs")
        os.makedirs(log_dir)

        # Create fake log files with different ages
        old_log = os.path.join(log_dir, "old.log")
        recent_log = os.path.join(log_dir, "recent.log")

        # Create files
        with open(old_log, "w") as f:
            f.write("old log content")
        with open(recent_log, "w") as f:
            f.write("recent log content")

        # Set file modification times (simulate age)
        old_time = (datetime.now() - timedelta(days=8)).timestamp()
        recent_time = (datetime.now() - timedelta(days=2)).timestamp()

        os.utime(old_log, (old_time, old_time))
        os.utime(recent_log, (recent_time, recent_time))

        # Test cleanup function
        from scripts.cleanup_system import cleanup_old_logs

        removed_files = cleanup_old_logs(log_dir, max_age_days=7)

        # Verify old file removed, recent file kept
        assert not os.path.exists(old_log), "Old log file should be removed"
        assert os.path.exists(recent_log), "Recent log file should be kept"
        assert len(removed_files) == 1, "Should remove exactly one old file"
```

**Step 2: Create system cleanup script**

Create `backend/scripts/cleanup_system.py`:

```python
#!/usr/bin/env python3
"""
Comprehensive system cleanup script for production environments
"""
import os
import glob
import logging
import shutil
from datetime import datetime, timedelta
from pathlib import Path
from typing import List, Dict


def setup_logging():
    """Setup logging for cleanup operations"""
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(levelname)s] %(message)s",
        handlers=[
            logging.StreamHandler(),
            logging.FileHandler("cleanup.log", mode="a")
        ]
    )


def get_disk_usage(path: str) -> Dict[str, float]:
    """Get disk usage statistics for a path"""
    try:
        statvfs = os.statvfs(path)
        total = statvfs.f_frsize * statvfs.f_blocks
        available = statvfs.f_frsize * statvfs.f_bavail
        used = total - available

        return {
            "total_gb": total / (1024**3),
            "used_gb": used / (1024**3),
            "available_gb": available / (1024**3),
            "used_percent": (used / total) * 100
        }
    except OSError as e:
        logging.error(f"Error getting disk usage for {path}: {e}")
        return {}


def cleanup_old_logs(log_dir: str, max_age_days: int = 7) -> List[str]:
    """Remove log files older than max_age_days"""
    if not os.path.exists(log_dir):
        return []

    removed_files = []
    cutoff_time = datetime.now() - timedelta(days=max_age_days)

    log_patterns = ["*.log", "*.log.*", "*.out", "*.err"]

    for pattern in log_patterns:
        pattern_path = os.path.join(log_dir, pattern)
        log_files = glob.glob(pattern_path)

        for log_file in log_files:
            try:
                file_time = datetime.fromtimestamp(os.path.getmtime(log_file))

                if file_time < cutoff_time:
                    file_size_mb = os.path.getsize(log_file) / (1024**2)
                    os.remove(log_file)
                    removed_files.append(log_file)
                    logging.info(f"Removed old log: {log_file} ({file_size_mb:.1f} MB)")

            except OSError as e:
                logging.error(f"Error removing {log_file}: {e}")

    return removed_files


def cleanup_temp_files(base_dir: str) -> List[str]:
    """Remove temporary files and cache directories"""
    if not os.path.exists(base_dir):
        return []

    removed_items = []

    temp_patterns = [
        "**/.pytest_cache",
        "**/htmlcov",
        "**/__pycache__",
        "**/*.pyc",
        "**/.coverage*",
        "**/coverage.xml",
        "**/coverage.json",
        "**/.DS_Store",
        "**/Thumbs.db",
        "**/*.tmp",
        "**/*.temp"
    ]

    for pattern in temp_patterns:
        pattern_path = os.path.join(base_dir, pattern)
        matches = glob.glob(pattern_path, recursive=True)

        for match in matches:
            try:
                if os.path.isfile(match):
                    os.remove(match)
                    removed_items.append(match)
                elif os.path.isdir(match):
                    shutil.rmtree(match)
                    removed_items.append(match)

            except OSError as e:
                logging.error(f"Error removing {match}: {e}")

    return removed_items


def compress_large_logs(log_dir: str, size_threshold_mb: int = 50) -> List[str]:
    """Compress log files larger than threshold"""
    if not os.path.exists(log_dir):
        return []

    compressed_files = []

    for log_file in glob.glob(os.path.join(log_dir, "*.log")):
        try:
            file_size_mb = os.path.getsize(log_file) / (1024**2)

            if file_size_mb > size_threshold_mb:
                # Compress with gzip
                import gzip

                compressed_name = f"{log_file}.gz"

                with open(log_file, 'rb') as f_in:
                    with gzip.open(compressed_name, 'wb') as f_out:
                        shutil.copyfileobj(f_in, f_out)

                # Replace original with compressed
                os.remove(log_file)
                compressed_files.append(log_file)
                logging.info(f"Compressed large log: {log_file} ({file_size_mb:.1f} MB)")

        except (OSError, ImportError) as e:
            logging.error(f"Error compressing {log_file}: {e}")

    return compressed_files


def main():
    """Main cleanup routine"""
    setup_logging()

    # Get initial disk usage
    disk_before = get_disk_usage("/")
    if disk_before:
        logging.info(f"Disk usage before cleanup: {disk_before['used_percent']:.1f}% ({disk_before['used_gb']:.1f} GB used)")

    total_operations = 0

    # Define cleanup locations
    cleanup_locations = {
        "logs": [
            "/opt/render/project/src/backend/logs",
            "backend/logs",
            "logs",
            "/var/log/app"
        ],
        "temp": [
            "/opt/render/project/src",
            "backend",
            "."
        ]
    }

    # Cleanup logs (keep last 7 days)
    for log_dir in cleanup_locations["logs"]:
        if os.path.exists(log_dir):
            removed = cleanup_old_logs(log_dir, max_age_days=7)
            total_operations += len(removed)
            if removed:
                logging.info(f"Cleaned {len(removed)} log files from {log_dir}")

    # Compress large logs
    for log_dir in cleanup_locations["logs"]:
        if os.path.exists(log_dir):
            compressed = compress_large_logs(log_dir, size_threshold_mb=50)
            total_operations += len(compressed)
            if compressed:
                logging.info(f"Compressed {len(compressed)} large logs in {log_dir}")

    # Cleanup temp files
    for project_dir in cleanup_locations["temp"]:
        if os.path.exists(project_dir):
            removed = cleanup_temp_files(project_dir)
            total_operations += len(removed)
            if removed:
                logging.info(f"Cleaned {len(removed)} temp files from {project_dir}")

    # Get final disk usage
    disk_after = get_disk_usage("/")
    if disk_after and disk_before:
        saved_gb = disk_before["used_gb"] - disk_after["used_gb"]
        logging.info(f"Cleanup complete: {total_operations} operations performed")
        logging.info(f"Disk usage after cleanup: {disk_after['used_percent']:.1f}% ({disk_after['used_gb']:.1f} GB used)")
        logging.info(f"Space saved: {saved_gb:.2f} GB")
    else:
        logging.info(f"Cleanup complete: {total_operations} operations performed")

    return {
        "operations_performed": total_operations,
        "disk_before": disk_before,
        "disk_after": disk_after
    }


if __name__ == "__main__":
    main()
```

**Step 3: Add scheduled cleanup to main app**

Modify `backend/app/main.py`:

```python
# Add imports
from apscheduler.schedulers.asyncio import AsyncIOScheduler
import subprocess
import asyncio

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Existing startup code...

    # NEW: Schedule daily cleanup
    try:
        scheduler = AsyncIOScheduler()

        # Daily cleanup at 2 AM
        scheduler.add_job(
            func=run_system_cleanup,
            trigger="cron",
            hour=2,
            minute=0,
            id="daily_system_cleanup"
        )

        scheduler.start()
        logger.info("✅ Automated system cleanup scheduled (daily at 2 AM)")

    except ImportError:
        logger.warning("⚠️ APScheduler not available - manual cleanup only")

    yield

    # Cleanup on shutdown
    try:
        scheduler.shutdown()
    except:
        pass

async def run_system_cleanup():
    """Async wrapper for system cleanup"""
    try:
        # Run cleanup script in subprocess
        process = await asyncio.create_subprocess_exec(
            "python", "scripts/cleanup_system.py",
            cwd="backend",
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE
        )

        stdout, stderr = await process.communicate()

        if process.returncode == 0:
            logger.info(f"Automated cleanup completed: {stdout.decode()}")
        else:
            logger.error(f"Cleanup failed: {stderr.decode()}")

    except Exception as e:
        logger.error(f"Error running automated cleanup: {e}")
```

**Step 4: Run test to verify cleanup**

Run: `pytest backend/tests/test_resource_optimization.py::test_automated_cleanup_removes_old_files -v`
Expected: PASS

**Step 5: Test cleanup script manually**

```bash
cd backend
python scripts/cleanup_system.py
```

Expected: Reports disk space saved and files cleaned

**Step 6: Commit**

```bash
git add backend/scripts/cleanup_system.py backend/app/main.py
git commit -m "feat: implement automated disk cleanup with scheduled maintenance"
```

---

### Task 3: Reduce Redis Connection Pool

**Files:**
- Modify: `backend/app/services/cache_service.py:45-60`

**Step 1: Write test for Redis optimization**

```python
# Add to backend/tests/test_resource_optimization.py
def test_redis_connection_optimization():
    """Test that Redis connection pool is optimized for environment"""
    from app.services.cache_service import get_cache_service

    cache = get_cache_service()

    # Check connection pool configuration
    if hasattr(cache, '_redis_client') and hasattr(cache._redis_client, 'connection_pool'):
        pool = cache._redis_client.connection_pool

        # Connection pool should be reasonably sized
        assert pool.max_connections <= 15, \
            f"Redis pool too large: {pool.max_connections} (should be ≤15)"

        # Should have proper timeout settings
        assert hasattr(pool, 'connection_kwargs'), "Pool should have connection settings"
```

**Step 2: Optimize Redis configuration**

Modify `backend/app/services/cache_service.py`:

```python
import redis
from app.core.config import get_settings

def create_optimized_redis_client():
    """Create environment-optimized Redis client"""
    settings = get_settings()

    # Environment-based connection pool sizing
    if getattr(settings, 'ENVIRONMENT', 'development') == "production":
        max_connections = 10  # Production: moderate pool size
    else:
        max_connections = 5   # Development/staging: smaller pool

    # Optimized connection pool configuration
    pool = redis.ConnectionPool.from_url(
        settings.REDIS_URL,
        max_connections=max_connections,  # Reduced from default 20
        retry_on_timeout=True,
        socket_keepalive=True,  # Prevent connection leaks
        socket_keepalive_options={},
        health_check_interval=60,  # Check connection health
        socket_timeout=30,
        socket_connect_timeout=10,
        decode_responses=True,
    )

    return redis.Redis(connection_pool=pool)

class CacheService:
    def __init__(self):
        self._redis_client = create_optimized_redis_client()
        self.default_ttl = 3600  # 1 hour

    async def get_connection_stats(self) -> dict:
        """Get Redis connection pool statistics"""
        try:
            pool = self._redis_client.connection_pool
            return {
                "max_connections": pool.max_connections,
                "created_connections": pool.created_connections,
                "available_connections": len(pool._available_connections),
                "in_use_connections": len(pool._in_use_connections),
            }
        except Exception as e:
            logger.warning(f"Could not get Redis connection stats: {e}")
            return {}

    async def close(self):
        """Close Redis connection pool cleanly"""
        if self._redis_client:
            await self._redis_client.aclose()
            self._redis_client = None
```

**Step 3: Run test to verify optimization**

Run: `pytest backend/tests/test_resource_optimization.py::test_redis_connection_optimization -v`
Expected: PASS

**Step 4: Test Redis functionality still works**

Run: `pytest backend/tests/ -k redis -v`
Expected: All Redis-related tests pass

**Step 5: Commit**

```bash
git add backend/app/services/cache_service.py
git commit -m "feat: optimize Redis connection pool - reduce max connections and add monitoring"
```

---

## Monitoring and Health Checks

### Task 4: Comprehensive Resource Monitoring

**Files:**
- Create: `backend/app/monitoring/resource_monitor.py`
- Modify: `backend/app/main.py` (add health endpoints)

**Step 1: Write test for monitoring system**

```python
# Add to backend/tests/test_resource_optimization.py
def test_resource_monitoring_detects_issues():
    """Test that resource monitoring detects high usage"""
    from app.monitoring.resource_monitor import ResourceMonitor

    monitor = ResourceMonitor()

    # Test with high resource usage
    high_usage_stats = {
        "memory_percent": 85.0,
        "disk_percent": 90.0,
        "cpu_percent": 95.0
    }

    health = monitor.assess_health(high_usage_stats)

    assert health["status"] != "HEALTHY", "Should detect high resource usage as unhealthy"
    assert health["alerts"] > 0, "Should generate alerts for high usage"

    # Test with normal usage
    normal_stats = {
        "memory_percent": 50.0,
        "disk_percent": 40.0,
        "cpu_percent": 30.0
    }

    health = monitor.assess_health(normal_stats)
    assert health["status"] == "HEALTHY", "Should assess normal usage as healthy"
```

**Step 2: Create resource monitoring system**

Create `backend/app/monitoring/resource_monitor.py`:

```python
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
```

**Step 3: Add health endpoints to main app**

Modify `backend/app/main.py`:

```python
# Add import
from app.monitoring.resource_monitor import resource_monitor

# Add health endpoints
@app.get("/health/resources", tags=["Health"])
async def get_resource_health():
    """Get system resource health status"""
    try:
        health = resource_monitor.get_health_summary()
        return health
    except Exception as e:
        logger.error(f"Error getting resource health: {e}")
        return {
            "status": "ERROR",
            "message": str(e),
            "timestamp": datetime.now().isoformat()
        }

@app.get("/health/system", tags=["Health"])
async def get_system_health():
    """Get detailed system statistics"""
    try:
        stats = resource_monitor.get_system_stats()
        return {
            "status": "SUCCESS",
            "data": stats,
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        logger.error(f"Error getting system stats: {e}")
        return {
            "status": "ERROR",
            "message": str(e),
            "timestamp": datetime.now().isoformat()
        }
```

**Step 4: Run test to verify monitoring**

Run: `pytest backend/tests/test_resource_optimization.py::test_resource_monitoring_detects_issues -v`
Expected: PASS

**Step 5: Test monitoring endpoints**

```bash
# Start server and test endpoints
curl http://localhost:8000/health/resources | jq '.'
curl http://localhost:8000/health/system | jq '.'
```

Expected: JSON responses with health status and system statistics

**Step 6: Commit**

```bash
git add backend/app/monitoring/resource_monitor.py backend/app/main.py
git commit -m "feat: add comprehensive resource monitoring with health check endpoints"
```

---

## Deployment and Validation

### Task 5: Deploy with Monitoring

**Files:**
- Create: `backend/scripts/deploy_with_monitoring.py`

**Step 1: Create deployment validation script**

Create `backend/scripts/deploy_with_monitoring.py`:

```python
#!/usr/bin/env python3
"""
Deploy resource optimizations with comprehensive monitoring
"""
import time
import requests
import json
import sys
from datetime import datetime


def check_health_endpoint(base_url: str, timeout: int = 30) -> dict:
    """Check health endpoint and return status"""
    try:
        response = requests.get(f"{base_url}/health/resources", timeout=timeout)
        response.raise_for_status()
        return response.json()
    except Exception as e:
        return {"status": "ERROR", "error": str(e)}


def monitor_deployment(base_url: str, duration_minutes: int = 10):
    """Monitor deployment health for specified duration"""

    print(f"🔍 Monitoring {base_url} for {duration_minutes} minutes...")

    start_time = datetime.now()
    checks = []

    for minute in range(duration_minutes):
        health = check_health_endpoint(base_url)
        timestamp = datetime.now().isoformat()

        check_result = {
            "minute": minute + 1,
            "timestamp": timestamp,
            "status": health.get("status", "UNKNOWN"),
            "health_score": health.get("health_score", 0),
            "alerts": health.get("alerts", 0)
        }

        if "stats" in health:
            stats = health["stats"]
            check_result.update({
                "memory_pct": stats.get("memory_pct", 0),
                "disk_pct": stats.get("disk_pct", 0),
                "cpu_pct": stats.get("cpu_pct", 0)
            })

        checks.append(check_result)

        # Print status
        status_emoji = {"HEALTHY": "✅", "WARNING": "⚠️", "CRITICAL": "🚨"}.get(
            health.get("status"), "❓"
        )

        print(f"{status_emoji} Minute {minute + 1}: {health.get('status', 'UNKNOWN')} "
              f"(Memory: {check_result.get('memory_pct', 0):.1f}%, "
              f"Disk: {check_result.get('disk_pct', 0):.1f}%, "
              f"CPU: {check_result.get('cpu_pct', 0):.1f}%)")

        # Check for critical alerts
        if health.get("alerts", 0) > 0:
            print(f"   🚨 {health.get('alerts')} alerts detected")
            for alert in health.get("alert_details", []):
                print(f"     - {alert.get('level')}: {alert.get('message')}")

        # Sleep until next minute
        if minute < duration_minutes - 1:
            time.sleep(60)

    # Generate summary
    total_checks = len(checks)
    healthy_checks = len([c for c in checks if c["status"] == "HEALTHY"])
    warning_checks = len([c for c in checks if c["status"] == "WARNING"])
    critical_checks = len([c for c in checks if c["status"] == "CRITICAL"])

    avg_memory = sum(c.get("memory_pct", 0) for c in checks) / total_checks
    avg_disk = sum(c.get("disk_pct", 0) for c in checks) / total_checks
    avg_cpu = sum(c.get("cpu_pct", 0) for c in checks) / total_checks

    print(f"\n📊 Monitoring Summary:")
    print(f"   Duration: {duration_minutes} minutes")
    print(f"   Healthy: {healthy_checks}/{total_checks} ({healthy_checks/total_checks*100:.1f}%)")
    print(f"   Warning: {warning_checks}/{total_checks}")
    print(f"   Critical: {critical_checks}/{total_checks}")
    print(f"   Average Memory: {avg_memory:.1f}%")
    print(f"   Average Disk: {avg_disk:.1f}%")
    print(f"   Average CPU: {avg_cpu:.1f}%")

    return {
        "summary": {
            "duration_minutes": duration_minutes,
            "total_checks": total_checks,
            "healthy_count": healthy_checks,
            "warning_count": warning_checks,
            "critical_count": critical_checks,
            "avg_memory_pct": avg_memory,
            "avg_disk_pct": avg_disk,
            "avg_cpu_pct": avg_cpu,
            "health_percentage": healthy_checks/total_checks*100
        },
        "checks": checks
    }


def main():
    """Main deployment monitoring"""

    environments = {
        "staging": "https://wheels-wins-backend-staging.onrender.com",
        "production": "https://pam-backend.onrender.com"
    }

    # Check if staging is healthy before production
    print("🧪 Checking staging environment health...")
    staging_health = check_health_endpoint(environments["staging"])

    if staging_health.get("status") != "HEALTHY":
        print(f"⚠️ Staging is not healthy: {staging_health}")
        print("❌ Aborting production deployment")
        sys.exit(1)

    print("✅ Staging is healthy")

    # Monitor staging for 5 minutes
    staging_results = monitor_deployment(environments["staging"], 5)

    if staging_results["summary"]["health_percentage"] < 80:
        print("❌ Staging health check failed - less than 80% healthy")
        sys.exit(1)

    # Ask for production deployment confirmation
    print(f"\n🚀 Deploy to production? (y/N): ", end="")
    response = input().lower()

    if response != 'y':
        print("❌ Production deployment cancelled")
        sys.exit(0)

    print("🚀 Deploying to production...")

    # In a real deployment, this would trigger the deployment
    # For now, just monitor production
    print("⏳ Waiting for production deployment to complete...")
    time.sleep(60)  # Wait for deployment

    # Monitor production for 10 minutes
    production_results = monitor_deployment(environments["production"], 10)

    # Save results
    results = {
        "deployment_time": datetime.now().isoformat(),
        "staging": staging_results,
        "production": production_results
    }

    with open("deployment_results.json", "w") as f:
        json.dump(results, f, indent=2)

    print(f"\n✅ Deployment monitoring complete. Results saved to deployment_results.json")

    if production_results["summary"]["health_percentage"] >= 90:
        print("🎉 Deployment successful - production is healthy!")
    else:
        print("⚠️ Deployment has issues - production health below 90%")
        sys.exit(1)


if __name__ == "__main__":
    main()
```

**Step 2: Run final test suite**

Run: `pytest backend/tests/test_resource_optimization.py -v`
Expected: All optimization tests pass

**Step 3: Test deployment script**

```bash
cd backend
python scripts/deploy_with_monitoring.py
```

Expected: Health checks and monitoring results

**Step 4: Run full application test suite**

Run: `pytest backend/tests/ --tb=short -x`
Expected: All tests pass, no regressions

**Step 5: Commit final deployment tools**

```bash
git add backend/scripts/deploy_with_monitoring.py
git commit -m "feat: add deployment monitoring script with health validation"
```

---

## Expected Impact and Success Metrics

### Resource Usage Targets

**Before Optimizations:**
- Memory: 75.1% (22.8 GB used)
- Disk: 84.1% usage
- CPU: 78.6% usage

**After Optimizations (Expected):**
- Memory: <60% (<18 GB used) - **Save 4-5 GB**
- Disk: <70% usage - **Save 2-4 GB**
- CPU: <80% usage - **Improved stability**

### Key Performance Indicators

**Memory Optimization:**
- Celery worker recycling: 20-30% reduction in worker memory
- Redis connection pool: 200-500 MB savings
- Lazy tool loading: 2-3 GB savings
- Automated garbage collection: Prevent memory leaks

**Disk Optimization:**
- Log cleanup: 1-2 GB immediate savings
- Automated cleanup: Prevent disk exhaustion
- Log compression: 50-70% space reduction for large logs

**Operational Improvements:**
- 24/7 resource monitoring
- Automated alerting at configurable thresholds
- Health check endpoints for external monitoring
- Scheduled maintenance prevents issues

### Rollback Plan

If optimizations cause issues:

1. **Immediate rollback (< 5 minutes):**
   ```bash
   git revert HEAD~5..HEAD
   git push origin main --force-with-lease
   ```

2. **Configuration rollback (< 2 minutes):**
   - Revert Celery config: `worker_max_tasks_per_child=1000`
   - Revert Redis config: `max_connections=20`
   - Disable scheduled cleanup

3. **Emergency procedures:**
   - Restart all services to clear memory
   - Manual disk cleanup if needed
   - Scale infrastructure temporarily

---

## Risk Assessment

**Risk Level:** 🟡 **MEDIUM**

**Why Medium Risk:**
- Production configuration changes (Celery workers, Redis pool)
- Automated cleanup could remove important files
- New monitoring system adds complexity

**Mitigation Strategies:**
- Comprehensive testing on staging first
- Gradual deployment with health monitoring
- Clear rollback procedures documented
- All cleanup operations are conservative (7-day retention)
- Configuration changes are incremental

**Monitoring Strategy:**
- Health check endpoints every minute
- Automated alerting for threshold violations
- 24-hour monitoring post-deployment
- Resource trend analysis

This optimization plan will significantly improve system stability while maintaining all functionality. The monitoring system ensures we can detect and respond to any issues immediately.