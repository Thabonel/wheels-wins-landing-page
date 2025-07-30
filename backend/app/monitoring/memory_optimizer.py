"""
Memory Optimization Service
Proactive memory management and garbage collection optimization.
"""

import asyncio
import gc
import os
import psutil
import time
from typing import Dict, Any
from datetime import datetime

from app.core.logging import get_logger

logger = get_logger(__name__)


class MemoryOptimizer:
    """Enhanced proactive memory optimization for production deployment."""
    
    def __init__(self):
        self.optimization_interval = 180  # 3 minutes (more frequent)
        self.memory_warning_threshold = 65.0  # Lower threshold (was 75%)
        self.memory_critical_threshold = 75.0  # Lower threshold (was 85%)
        self.memory_emergency_threshold = 85.0  # New emergency threshold
        self.is_running = False
        self._optimization_task = None
        self.optimization_count = 0
        self.last_emergency_cleanup = 0
        
    async def start(self):
        """Start background memory optimization."""
        if self.is_running:
            return
            
        self.is_running = True
        logger.info("🧹 Starting memory optimization service...")
        
        # Configure garbage collection for optimal performance
        self._configure_gc()
        
        # Start optimization loop
        self._optimization_task = asyncio.create_task(self._optimization_loop())
        logger.info("✅ Memory optimization service started")
        
    async def stop(self):
        """Stop memory optimization."""
        self.is_running = False
        
        if self._optimization_task:
            self._optimization_task.cancel()
            try:
                await self._optimization_task
            except asyncio.CancelledError:
                pass
                
        logger.info("🛑 Memory optimization service stopped")
        
    def _configure_gc(self):
        """Configure garbage collection for optimal performance."""
        # Set more aggressive garbage collection thresholds for production
        # This trades some CPU for better memory management
        gc.set_threshold(500, 10, 10)  # More frequent GC
        
        # Enable garbage collection debug flags in development
        if os.getenv("ENVIRONMENT") == "development":
            gc.set_debug(gc.DEBUG_STATS)
            
        logger.info(f"🗑️ Garbage collection configured: thresholds={gc.get_threshold()}")
        
    async def _optimization_loop(self):
        """Background memory optimization loop."""
        while self.is_running:
            try:
                await asyncio.sleep(self.optimization_interval)
                await self._optimize_memory()
                
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"❌ Memory optimization error: {e}")
                await asyncio.sleep(60)  # Wait before retry
                
    async def _optimize_memory(self):
        """Enhanced memory optimization with emergency handling."""
        try:
            # Get current memory usage
            memory = psutil.virtual_memory()
            process = psutil.Process()
            process_memory = process.memory_info()
            disk = psutil.disk_usage('/')
            
            memory_percent = memory.percent
            process_memory_mb = process_memory.rss / 1024 / 1024
            disk_percent = (disk.used / disk.total) * 100
            
            logger.debug(f"🔍 Memory check: {memory_percent:.1f}% system, {process_memory_mb:.1f}MB process, {disk_percent:.1f}% disk")
            
            # Determine optimization strategy based on memory usage
            if memory_percent > self.memory_emergency_threshold:
                await self._emergency_cleanup()
            elif memory_percent > self.memory_critical_threshold:
                await self._aggressive_cleanup()
            elif memory_percent > self.memory_warning_threshold:
                await self._standard_cleanup()
            else:
                await self._routine_cleanup()
                
            # Handle disk space issues
            if disk_percent > 80.0:
                await self._cleanup_disk_space()
                
            self.optimization_count += 1
                
        except Exception as e:
            logger.error(f"❌ Memory optimization failed: {e}")
            
    async def _routine_cleanup(self):
        """Routine memory cleanup."""
        # Force garbage collection
        collected = gc.collect()
        if collected > 0:
            logger.debug(f"🗑️ Routine GC: collected {collected} objects")
            
    async def _standard_cleanup(self):
        """Standard memory cleanup for warning threshold."""
        logger.info("⚠️ Memory usage above warning threshold - performing standard cleanup")
        
        # Force garbage collection with all generations
        collected = 0
        for generation in range(3):
            collected += gc.collect(generation)
            
        if collected > 0:
            logger.info(f"🗑️ Standard cleanup: collected {collected} objects")
            
        # Get updated memory stats
        memory = psutil.virtual_memory()
        process = psutil.Process()
        process_memory_mb = process.memory_info().rss / 1024 / 1024
        
        logger.info(f"📊 After cleanup: {memory.percent:.1f}% system, {process_memory_mb:.1f}MB process")
        
    async def _aggressive_cleanup(self):
        """Aggressive memory cleanup for critical threshold."""
        logger.warning("🚨 Memory usage critical - performing aggressive cleanup")
        
        # Force garbage collection multiple times
        total_collected = 0
        for _ in range(3):
            for generation in range(3):
                total_collected += gc.collect(generation)
            await asyncio.sleep(0.1)  # Brief pause between cycles
            
        logger.warning(f"🗑️ Aggressive cleanup: collected {total_collected} objects")
        
        # Clear module-level caches if available
        await self._clear_all_caches()
        
        # Get updated memory stats
        memory = psutil.virtual_memory()
        process = psutil.Process()
        process_memory_mb = process.memory_info().rss / 1024 / 1024
        
        logger.warning(f"📊 After aggressive cleanup: {memory.percent:.1f}% system, {process_memory_mb:.1f}MB process")
        
    async def _emergency_cleanup(self):
        """Emergency memory cleanup for critical memory situations."""
        current_time = time.time()
        if current_time - self.last_emergency_cleanup < 60:  # Prevent too frequent emergency cleanups
            logger.warning("🚨 Skipping emergency cleanup - too recent")
            return
            
        logger.error("🚨 EMERGENCY: Memory usage critical - performing emergency cleanup")
        self.last_emergency_cleanup = current_time
        
        # Aggressive garbage collection
        total_collected = 0
        for _ in range(5):  # More cycles than aggressive
            for generation in range(3):
                total_collected += gc.collect(generation)
            await asyncio.sleep(0.05)  # Brief pause
            
        logger.error(f"🗑️ Emergency cleanup: collected {total_collected} objects")
        
        # Clear all possible caches
        await self._clear_all_caches()
        
        # Force system garbage collection
        try:
            import ctypes
            libc = ctypes.CDLL("libc.so.6")
            libc.malloc_trim(0)
            logger.info("🧹 Forced system malloc trim")
        except Exception as e:
            logger.debug(f"Could not force malloc trim: {e}")
        
        # Get updated memory stats
        memory = psutil.virtual_memory()
        process = psutil.Process()
        process_memory_mb = process.memory_info().rss / 1024 / 1024
        
        logger.error(f"📊 After emergency cleanup: {memory.percent:.1f}% system, {process_memory_mb:.1f}MB process")
        
        # If still critical, consider more drastic measures
        if memory.percent > self.memory_emergency_threshold:
            logger.critical("🚨 CRITICAL: Memory still high after emergency cleanup - system may be overloaded")
    
    async def _clear_all_caches(self):
        """Clear all module-level caches and system caches to free memory."""
        try:
            # Clear regex cache
            import re
            re.purge()
            
            # Clear functools LRU caches
            import functools
            import inspect
            import sys
            
            cleared_functions = 0
            for module_name, module in list(sys.modules.items()):
                if module is None:
                    continue
                try:
                    for name in dir(module):
                        obj = getattr(module, name, None)
                        if obj and hasattr(obj, 'cache_clear'):
                            obj.cache_clear()
                            cleared_functions += 1
                except Exception:
                    continue
            
            if cleared_functions > 0:
                logger.info(f"🧹 Cleared {cleared_functions} function caches")
            
            # Clear import cache for unused modules (be more aggressive)
            modules_to_clear = []
            for module_name, module in list(sys.modules.items()):
                if any(pattern in module_name.lower() for pattern in ['test_', 'debug', 'dev', 'mock']):
                    modules_to_clear.append(module_name)
                    
            for module_name in modules_to_clear:
                if module_name in sys.modules:
                    del sys.modules[module_name]
                    
            if modules_to_clear:
                logger.info(f"🧹 Cleared {len(modules_to_clear)} unused modules from cache")
            
            # Clear pycache if possible
            try:
                import shutil
                import os
                for root, dirs, files in os.walk('.'):
                    if '__pycache__' in dirs:
                        pycache_path = os.path.join(root, '__pycache__')
                        shutil.rmtree(pycache_path, ignore_errors=True)
                logger.info("🧹 Cleared Python cache directories")
            except Exception as e:
                logger.debug(f"Could not clear pycache: {e}")
                
        except Exception as e:
            logger.warning(f"⚠️ Enhanced cache clearing warning: {e}")
    
    async def _cleanup_disk_space(self):
        """Clean up disk space when usage is high."""
        try:
            logger.warning("💾 High disk usage detected - cleaning up temporary files")
            
            import tempfile
            import shutil
            import os
            
            # Clean temp directory
            temp_dir = tempfile.gettempdir()
            for root, dirs, files in os.walk(temp_dir):
                for file in files:
                    try:
                        file_path = os.path.join(root, file)
                        if os.path.getmtime(file_path) < time.time() - 86400:  # 24 hours old
                            os.remove(file_path)
                    except Exception:
                        continue
            
            # Clean log files older than 7 days
            for root, dirs, files in os.walk('/tmp'):
                for file in files:
                    if file.endswith('.log'):
                        try:
                            file_path = os.path.join(root, file)
                            if os.path.getmtime(file_path) < time.time() - 604800:  # 7 days
                                os.remove(file_path)
                        except Exception:
                            continue
            
            logger.info("🧹 Completed disk space cleanup")
            
        except Exception as e:
            logger.warning(f"⚠️ Disk cleanup warning: {e}")
            
    async def get_memory_stats(self) -> Dict[str, Any]:
        """Get comprehensive memory and system statistics."""
        try:
            # System memory
            memory = psutil.virtual_memory()
            swap = psutil.swap_memory()
            
            # Process memory
            process = psutil.Process()
            process_memory = process.memory_info()
            
            # CPU and disk stats
            cpu_percent = psutil.cpu_percent(interval=1)
            disk = psutil.disk_usage('/')
            
            # Garbage collection stats
            gc_stats = {
                "collections": gc.get_stats(),
                "counts": gc.get_count(),
                "thresholds": gc.get_threshold()
            }
            
            # Network stats if available
            try:
                network = psutil.net_io_counters()
                network_stats = {
                    "bytes_sent": network.bytes_sent,
                    "bytes_recv": network.bytes_recv,
                    "packets_sent": network.packets_sent,
                    "packets_recv": network.packets_recv
                }
            except Exception:
                network_stats = {"error": "Network stats unavailable"}
            
            return {
                "timestamp": datetime.utcnow().isoformat(),
                "system": {
                    "total_mb": memory.total / 1024 / 1024,
                    "available_mb": memory.available / 1024 / 1024,
                    "used_mb": memory.used / 1024 / 1024,
                    "percent": memory.percent,
                    "swap_total_mb": swap.total / 1024 / 1024,
                    "swap_used_mb": swap.used / 1024 / 1024,
                    "swap_percent": swap.percent,
                    "cpu_percent": cpu_percent,
                    "disk_total_gb": disk.total / 1024 / 1024 / 1024,
                    "disk_used_gb": disk.used / 1024 / 1024 / 1024,
                    "disk_percent": (disk.used / disk.total) * 100
                },
                "process": {
                    "rss_mb": process_memory.rss / 1024 / 1024,
                    "vms_mb": process_memory.vms / 1024 / 1024,
                    "percent": process.memory_percent(),
                    "num_threads": process.num_threads(),
                    "cpu_percent": process.cpu_percent(),
                    "num_fds": process.num_fds() if hasattr(process, 'num_fds') else 0
                },
                "garbage_collection": gc_stats,
                "network": network_stats,
                "optimization": {
                    "service_running": self.is_running,
                    "warning_threshold": self.memory_warning_threshold,
                    "critical_threshold": self.memory_critical_threshold,
                    "emergency_threshold": self.memory_emergency_threshold,
                    "optimization_interval": self.optimization_interval,
                    "optimization_count": self.optimization_count,
                    "last_emergency_cleanup": self.last_emergency_cleanup
                }
            }
            
        except Exception as e:
            logger.error(f"❌ Failed to get memory stats: {e}")
            return {"error": str(e)}


# Global memory optimizer instance
memory_optimizer = MemoryOptimizer()


async def get_memory_optimizer() -> MemoryOptimizer:
    """Get the global memory optimizer instance."""
    return memory_optimizer