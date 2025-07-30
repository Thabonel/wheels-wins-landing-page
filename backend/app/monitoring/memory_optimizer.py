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
    """Proactive memory optimization for production deployment."""
    
    def __init__(self):
        self.optimization_interval = 300  # 5 minutes
        self.memory_warning_threshold = 75.0  # Percent
        self.memory_critical_threshold = 85.0  # Percent
        self.is_running = False
        self._optimization_task = None
        
    async def start(self):
        """Start background memory optimization."""
        # EMERGENCY: Check environment variable to disable
        if os.getenv('DISABLE_MEMORY_OPTIMIZER', 'false').lower() == 'true':
            logger.info("🚫 Memory optimizer DISABLED via environment variable")
            return
            
        if os.getenv('DISABLE_MONITORING', 'false').lower() == 'true':
            logger.info("🚫 All monitoring DISABLED via environment variable")
            return
            
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
        """Perform memory optimization."""
        try:
            # Get current memory usage
            memory = psutil.virtual_memory()
            process = psutil.Process()
            process_memory = process.memory_info()
            
            memory_percent = memory.percent
            process_memory_mb = process_memory.rss / 1024 / 1024
            
            logger.debug(f"🔍 Memory check: {memory_percent:.1f}% system, {process_memory_mb:.1f}MB process")
            
            # Determine optimization strategy based on memory usage
            if memory_percent > self.memory_critical_threshold:
                await self._aggressive_cleanup()
            elif memory_percent > self.memory_warning_threshold:
                await self._standard_cleanup()
            else:
                await self._routine_cleanup()
                
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
        await self._clear_module_caches()
        
        # Get updated memory stats
        memory = psutil.virtual_memory()
        process = psutil.Process()
        process_memory_mb = process.memory_info().rss / 1024 / 1024
        
        logger.warning(f"📊 After aggressive cleanup: {memory.percent:.1f}% system, {process_memory_mb:.1f}MB process")
        
    async def _clear_module_caches(self):
        """Clear module-level caches to free memory."""
        try:
            # Clear regex cache
            import re
            re.purge()
            
            # Clear import cache for unused modules (be careful here)
            import sys
            modules_to_clear = []
            for module_name, module in sys.modules.items():
                if module_name.startswith('test_') or 'test' in module_name.lower():
                    modules_to_clear.append(module_name)
                    
            for module_name in modules_to_clear:
                if module_name in sys.modules:
                    del sys.modules[module_name]
                    
            if modules_to_clear:
                logger.info(f"🧹 Cleared {len(modules_to_clear)} test modules from cache")
                
        except Exception as e:
            logger.warning(f"⚠️ Cache clearing warning: {e}")
            
    async def get_memory_stats(self) -> Dict[str, Any]:
        """Get detailed memory statistics."""
        try:
            # System memory
            memory = psutil.virtual_memory()
            swap = psutil.swap_memory()
            
            # Process memory
            process = psutil.Process()
            process_memory = process.memory_info()
            
            # Garbage collection stats
            gc_stats = {
                "collections": gc.get_stats(),
                "counts": gc.get_count(),
                "thresholds": gc.get_threshold()
            }
            
            return {
                "timestamp": datetime.utcnow().isoformat(),
                "system": {
                    "total_mb": memory.total / 1024 / 1024,
                    "available_mb": memory.available / 1024 / 1024,
                    "used_mb": memory.used / 1024 / 1024,
                    "percent": memory.percent,
                    "swap_total_mb": swap.total / 1024 / 1024,
                    "swap_used_mb": swap.used / 1024 / 1024,
                    "swap_percent": swap.percent
                },
                "process": {
                    "rss_mb": process_memory.rss / 1024 / 1024,
                    "vms_mb": process_memory.vms / 1024 / 1024,
                    "percent": process.memory_percent(),
                    "num_threads": process.num_threads()
                },
                "garbage_collection": gc_stats,
                "optimization": {
                    "service_running": self.is_running,
                    "warning_threshold": self.memory_warning_threshold,
                    "critical_threshold": self.memory_critical_threshold,
                    "optimization_interval": self.optimization_interval
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