"""
Performance Monitoring Service
Comprehensive monitoring for memory usage, database connections, and system performance
"""

import asyncio
import gc
import logging
import psutil
import time
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional
from dataclasses import dataclass, asdict

from app.core.config import get_settings
from app.core.logging import get_logger

logger = get_logger(__name__)
settings = get_settings()

@dataclass
class MemoryProfile:
    """Memory usage profile snapshot"""
    timestamp: datetime
    total_memory_mb: float
    available_memory_mb: float
    used_memory_mb: float
    memory_percent: float
    swap_memory_mb: float
    swap_percent: float
    process_memory_mb: float
    process_memory_percent: float

@dataclass
class PerformanceSnapshot:
    """Complete system performance snapshot"""
    timestamp: datetime
    memory: MemoryProfile
    cpu_percent: float
    disk_usage_percent: float
    active_connections: int
    database_pool_size: int
    cache_size_mb: float
    garbage_collection_stats: Dict[str, Any]
    python_object_count: int

class PerformanceMonitorService:
    """Advanced performance monitoring with memory optimization"""
    
    def __init__(self):
        self.monitoring_active = False
        self.performance_history: List[PerformanceSnapshot] = []
        self.max_history_size = 100
        self.memory_alerts: List[Dict] = []
        self.optimization_recommendations: List[str] = []
        
        # Performance thresholds
        self.memory_warning_threshold = 90.0  # 90% - Adjusted for container-level monitoring
        self.memory_critical_threshold = 95.0  # 95% - Adjusted for container-level monitoring
        self.memory_optimization_threshold = 80.0  # 80% - Keep optimization threshold for Python process
        
    async def start_monitoring(self, interval_seconds: int = 60):
        """Start continuous performance monitoring"""
        if self.monitoring_active:
            logger.warning("⚠️ Performance monitoring already active")
            return
            
        self.monitoring_active = True
        logger.info(f"🔍 Starting performance monitoring (interval: {interval_seconds}s)")
        
        asyncio.create_task(self._monitoring_loop(interval_seconds))
        
    async def stop_monitoring(self):
        """Stop performance monitoring"""
        self.monitoring_active = False
        logger.info("🛑 Performance monitoring stopped")
        
    async def _monitoring_loop(self, interval_seconds: int):
        """Main monitoring loop"""
        while self.monitoring_active:
            try:
                snapshot = await self.capture_performance_snapshot()
                await self._analyze_performance(snapshot)
                await self._check_memory_optimization_needed(snapshot)
                
                # Maintain history size
                if len(self.performance_history) >= self.max_history_size:
                    self.performance_history.pop(0)
                    
                self.performance_history.append(snapshot)
                
                await asyncio.sleep(interval_seconds)
                
            except Exception as e:
                logger.error(f"❌ Error in performance monitoring loop: {e}")
                await asyncio.sleep(interval_seconds)
                
    async def capture_performance_snapshot(self) -> PerformanceSnapshot:
        """Capture comprehensive performance snapshot"""
        try:
            # System memory info
            memory_info = psutil.virtual_memory()
            swap_info = psutil.swap_memory()
            
            # Current process memory
            process = psutil.Process()
            process_memory = process.memory_info()
            
            memory_profile = MemoryProfile(
                timestamp=datetime.utcnow(),
                total_memory_mb=memory_info.total / (1024 * 1024),
                available_memory_mb=memory_info.available / (1024 * 1024),
                used_memory_mb=memory_info.used / (1024 * 1024),
                memory_percent=memory_info.percent,
                swap_memory_mb=swap_info.used / (1024 * 1024),
                swap_percent=swap_info.percent,
                process_memory_mb=process_memory.rss / (1024 * 1024),
                process_memory_percent=(process_memory.rss / memory_info.total) * 100
            )
            
            # CPU and disk info
            cpu_percent = psutil.cpu_percent()
            disk_usage = psutil.disk_usage('/')
            
            # Database connections (approximate)
            try:
                from app.services.database import DatabaseService
                db_service = DatabaseService()
                db_pool_size = getattr(db_service, 'pool_size', 0)
            except:
                db_pool_size = 0
                
            # WebSocket connections
            try:
                from app.core.websocket_manager import manager as websocket_manager
                websocket_connections = len(websocket_manager.active_connections)
            except:
                websocket_connections = 0
                
            # Cache size estimation
            try:
                from app.services.cache_service import cache_service
                cache_stats = await cache_service.get_stats()
                cache_size_mb = cache_stats.get('memory_usage_mb', 0)
            except:
                cache_size_mb = 0
                
            # Garbage collection stats
            gc_stats = {
                'objects_collected': len(gc.get_objects()),
                'garbage_count': len(gc.garbage),
                'generation_counts': gc.get_count()
            }
            
            snapshot = PerformanceSnapshot(
                timestamp=datetime.utcnow(),
                memory=memory_profile,
                cpu_percent=cpu_percent,
                disk_usage_percent=(disk_usage.used / disk_usage.total) * 100,
                active_connections=websocket_connections,
                database_pool_size=db_pool_size,
                cache_size_mb=cache_size_mb,
                garbage_collection_stats=gc_stats,
                python_object_count=len(gc.get_objects())
            )
            
            return snapshot
            
        except Exception as e:
            logger.error(f"❌ Error capturing performance snapshot: {e}")
            raise
            
    async def _analyze_performance(self, snapshot: PerformanceSnapshot):
        """Analyze performance metrics and generate alerts"""
        memory_percent = snapshot.memory.memory_percent
        
        # Memory usage alerts
        if memory_percent >= self.memory_critical_threshold:
            alert = {
                "level": "CRITICAL",
                "timestamp": snapshot.timestamp,
                "metric": "memory_usage",
                "value": memory_percent,
                "threshold": self.memory_critical_threshold,
                "message": f"Critical memory usage: {memory_percent:.1f}% (threshold: {self.memory_critical_threshold}%)"
            }
            self.memory_alerts.append(alert)
            logger.error(f"🚨 {alert['message']}")
            
        elif memory_percent >= self.memory_warning_threshold:
            alert = {
                "level": "WARNING", 
                "timestamp": snapshot.timestamp,
                "metric": "memory_usage",
                "value": memory_percent,
                "threshold": self.memory_warning_threshold,
                "message": f"High memory usage: {memory_percent:.1f}% (threshold: {self.memory_warning_threshold}%)"
            }
            self.memory_alerts.append(alert)
            logger.warning(f"⚠️ {alert['message']}")
            
        # Process-specific memory analysis
        process_memory_mb = snapshot.memory.process_memory_mb
        if process_memory_mb > 1000:  # 1GB
            logger.warning(f"⚠️ High process memory usage: {process_memory_mb:.1f}MB")
            
        # Object count analysis
        if snapshot.python_object_count > 1000000:  # 1 million objects
            logger.warning(f"⚠️ High Python object count: {snapshot.python_object_count:,}")
            
    async def _check_memory_optimization_needed(self, snapshot: PerformanceSnapshot):
        """Check if memory optimization should be performed"""
        memory_percent = snapshot.memory.memory_percent
        
        if memory_percent >= self.memory_optimization_threshold:
            logger.info(f"🧹 Memory optimization triggered at {memory_percent:.1f}%")
            await self.optimize_memory_usage()
            
    async def optimize_memory_usage(self):
        """Perform memory optimization operations"""
        try:
            optimization_start = time.time()
            initial_memory = psutil.virtual_memory().percent
            
            logger.info("🧹 Starting memory optimization...")
            
            # 1. Force garbage collection
            collected_objects = 0
            for generation in range(3):
                collected = gc.collect(generation)
                collected_objects += collected
                
            logger.info(f"🗑️ Garbage collection: {collected_objects} objects collected")
            
            # 2. Clear application caches
            try:
                from app.services.cache_service import cache_service
                await cache_service.clear_expired()
                logger.info("🗑️ Cleared expired cache entries")
            except Exception as e:
                logger.warning(f"⚠️ Cache cleanup failed: {e}")
                
            # 3. Close idle database connections
            try:
                from app.core.database_pool import db_pool
                if hasattr(db_pool, 'cleanup_idle_connections'):
                    await db_pool.cleanup_idle_connections()
                    logger.info("🗑️ Cleaned up idle database connections")
            except Exception as e:
                logger.warning(f"⚠️ Database connection cleanup failed: {e}")
                
            # 4. Log large objects for investigation
            await self._log_memory_hogs()
            
            # Calculate optimization results
            optimization_time = time.time() - optimization_start
            final_memory = psutil.virtual_memory().percent
            memory_freed = initial_memory - final_memory
            
            logger.info(f"✅ Memory optimization completed in {optimization_time:.2f}s")
            logger.info(f"📊 Memory usage: {initial_memory:.1f}% → {final_memory:.1f}% ({memory_freed:+.1f}%)")
            
            # Add to recommendations
            self.optimization_recommendations.append(
                f"Memory optimization at {datetime.utcnow().isoformat()}: "
                f"freed {memory_freed:.1f}% memory in {optimization_time:.2f}s"
            )
            
        except Exception as e:
            logger.error(f"❌ Memory optimization failed: {e}")
            
    async def _log_memory_hogs(self):
        """Log information about memory-intensive objects"""
        try:
            import sys
            
            # Get object type counts
            type_counts = {}
            for obj in gc.get_objects():
                obj_type = type(obj).__name__
                type_counts[obj_type] = type_counts.get(obj_type, 0) + 1
                
            # Sort by count and log top memory consumers
            top_types = sorted(type_counts.items(), key=lambda x: x[1], reverse=True)[:10]
            
            logger.info("🔍 Top Python object types by count:")
            for obj_type, count in top_types:
                logger.info(f"   {obj_type}: {count:,} objects")
                
            # Log total memory usage by category
            total_size = sum(sys.getsizeof(obj) for obj in gc.get_objects())
            logger.info(f"🔍 Total Python object memory: {total_size / (1024*1024):.1f}MB")
            
        except Exception as e:
            logger.warning(f"⚠️ Memory hog analysis failed: {e}")
            
    async def get_performance_report(self, hours: int = 24) -> Dict[str, Any]:
        """Generate comprehensive performance report"""
        try:
            cutoff_time = datetime.utcnow() - timedelta(hours=hours)
            recent_snapshots = [
                s for s in self.performance_history 
                if s.timestamp >= cutoff_time
            ]
            
            if not recent_snapshots:
                return {"error": "No performance data available"}
                
            # Calculate statistics
            memory_values = [s.memory.memory_percent for s in recent_snapshots]
            cpu_values = [s.cpu_percent for s in recent_snapshots]
            process_memory_values = [s.memory.process_memory_mb for s in recent_snapshots]
            
            # Recent alerts
            recent_alerts = [
                alert for alert in self.memory_alerts
                if alert['timestamp'] >= cutoff_time
            ]
            
            report = {
                "report_period": f"Last {hours} hours",
                "snapshot_count": len(recent_snapshots),
                "memory_analysis": {
                    "current_usage_percent": memory_values[-1] if memory_values else 0,
                    "average_usage_percent": sum(memory_values) / len(memory_values) if memory_values else 0,
                    "peak_usage_percent": max(memory_values) if memory_values else 0,
                    "min_usage_percent": min(memory_values) if memory_values else 0,
                },
                "process_memory_analysis": {
                    "current_mb": process_memory_values[-1] if process_memory_values else 0,
                    "average_mb": sum(process_memory_values) / len(process_memory_values) if process_memory_values else 0,
                    "peak_mb": max(process_memory_values) if process_memory_values else 0,
                },
                "cpu_analysis": {
                    "current_percent": cpu_values[-1] if cpu_values else 0,
                    "average_percent": sum(cpu_values) / len(cpu_values) if cpu_values else 0,
                    "peak_percent": max(cpu_values) if cpu_values else 0,
                },
                "alerts": {
                    "total_alerts": len(recent_alerts),
                    "critical_alerts": len([a for a in recent_alerts if a['level'] == 'CRITICAL']),
                    "warning_alerts": len([a for a in recent_alerts if a['level'] == 'WARNING']),
                    "recent_alerts": recent_alerts[-5:] if recent_alerts else []
                },
                "optimizations": {
                    "recommendations": self.optimization_recommendations[-10:],
                    "total_optimizations": len(self.optimization_recommendations)
                },
                "current_snapshot": asdict(recent_snapshots[-1]) if recent_snapshots else None
            }
            
            return report
            
        except Exception as e:
            logger.error(f"❌ Error generating performance report: {e}")
            return {"error": str(e)}

# Global performance monitor instance
performance_monitor = PerformanceMonitorService()