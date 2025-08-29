"""
Metrics Cache System
Caches system metrics collected in background to avoid blocking health checks.
"""

import asyncio
import time
from datetime import datetime
from typing import Dict, Any, Optional
from dataclasses import dataclass, asdict
import psutil

from app.core.logging import get_logger

logger = get_logger(__name__)


@dataclass
class CachedMetrics:
    """Cached system metrics."""
    timestamp: str
    cpu_percent: float
    memory_usage_mb: float
    memory_percent: float
    disk_usage_percent: float
    collection_time_ms: float
    is_stale: bool = False


class MetricsCache:
    """Background metrics collection and caching system."""
    
    def __init__(self):
        self._cached_metrics: Optional[CachedMetrics] = None
        self._collection_interval = 5  # seconds
        self._stale_threshold = 30  # seconds
        self._is_running = False
        self._collection_task: Optional[asyncio.Task] = None
        
    async def start(self):
        """Start background metrics collection."""
        if self._is_running:
            return
            
        self._is_running = True
        logger.info("📊 Starting background metrics collection...")
        
        # Collect initial metrics
        await self._collect_metrics()
        
        # Start background task
        self._collection_task = asyncio.create_task(self._collection_loop())
        logger.info("✅ Background metrics collection started")
        
    async def stop(self):
        """Stop background metrics collection."""
        self._is_running = False
        
        if self._collection_task:
            self._collection_task.cancel()
            try:
                await self._collection_task
            except asyncio.CancelledError:
                pass
                
        logger.info("🛑 Background metrics collection stopped")
        
    async def get_metrics(self) -> Dict[str, Any]:
        """Get cached metrics instantly without blocking."""
        if not self._cached_metrics:
            # First time - collect metrics synchronously
            await self._collect_metrics()
            
        # Check if metrics are stale
        if self._cached_metrics:
            age = time.time() - self._get_timestamp_seconds(self._cached_metrics.timestamp)
            if age > self._stale_threshold:
                self._cached_metrics.is_stale = True
                
        return asdict(self._cached_metrics) if self._cached_metrics else {
            "error": "No metrics available",
            "timestamp": datetime.utcnow().isoformat()
        }
        
    async def _collect_metrics(self):
        """Collect system metrics."""
        start_time = time.time()
        
        try:
            # Collect metrics without blocking
            # CPU percent with interval=None uses last known value
            cpu_percent = psutil.cpu_percent(interval=None)
            
            # Memory metrics
            memory = psutil.virtual_memory()
            memory_usage_mb = memory.used / 1024 / 1024
            memory_percent = memory.percent
            
            # Disk metrics
            disk = psutil.disk_usage('/')
            disk_usage_percent = disk.percent
            
            collection_time_ms = (time.time() - start_time) * 1000
            
            self._cached_metrics = CachedMetrics(
                timestamp=datetime.utcnow().isoformat(),
                cpu_percent=cpu_percent,
                memory_usage_mb=memory_usage_mb,
                memory_percent=memory_percent,
                disk_usage_percent=disk_usage_percent,
                collection_time_ms=collection_time_ms,
                is_stale=False
            )
            
            logger.debug(f"📊 Metrics collected in {collection_time_ms:.2f}ms")
            
        except Exception as e:
            logger.error(f"❌ Error collecting metrics: {e}")
            
    async def _collection_loop(self):
        """Background loop for collecting metrics."""
        while self._is_running:
            try:
                await asyncio.sleep(self._collection_interval)
                await self._collect_metrics()
                
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"❌ Error in metrics collection loop: {e}")
                await asyncio.sleep(1)  # Brief pause before retry
                
    def _get_timestamp_seconds(self, iso_timestamp: str) -> float:
        """Convert ISO timestamp to seconds since epoch."""
        try:
            dt = datetime.fromisoformat(iso_timestamp.replace('Z', '+00:00'))
            return dt.timestamp()
        except Exception:
            return time.time()


# Global metrics cache instance
metrics_cache = MetricsCache()


async def get_metrics_cache() -> MetricsCache:
    """Get the global metrics cache instance."""
    return metrics_cache