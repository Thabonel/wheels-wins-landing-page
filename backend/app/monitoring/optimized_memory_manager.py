"""
Optimized Memory Management Service
Enhanced memory optimization with better patterns, thresholds, and cleanup strategies.
"""

import asyncio
import gc
import os
import psutil
import time
import tempfile
import shutil
import sys
from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta
from pathlib import Path

from app.core.logging import get_logger

logger = get_logger(__name__)


class OptimizedMemoryManager:
    """
    Enhanced memory management with intelligent patterns and optimizations.
    
    Key improvements:
    - Adaptive thresholds based on system capacity
    - Better cleanup strategies with prioritization
    - Disk space management with intelligent file cleanup
    - Memory leak detection and prevention
    - Performance monitoring integration
    """
    
    def __init__(self):
        # Dynamic thresholds based on system memory
        self.system_memory_gb = psutil.virtual_memory().total / (1024**3)
        self._configure_adaptive_thresholds()
        
        # Optimized intervals
        self.optimization_interval = self._calculate_optimal_interval()
        self.emergency_interval = 30  # Emergency checks every 30s
        
        # State tracking
        self.is_running = False
        self._optimization_task = None
        self._emergency_task = None
        self.optimization_count = 0
        self.last_emergency_cleanup = 0
        self.memory_leak_detection = True
        
        # Performance tracking
        self.cleanup_performance = {}
        self.memory_history = []
        self.max_history_size = 100
        
        # Cleanup priorities
        self.cleanup_strategies = {
            'routine': self._routine_cleanup,
            'standard': self._standard_cleanup,
            'aggressive': self._aggressive_cleanup,
            'emergency': self._emergency_cleanup
        }
        
    def _configure_adaptive_thresholds(self):
        """Configure memory thresholds based on system capacity."""
        if self.system_memory_gb <= 1:  # Low memory system
            self.memory_warning_threshold = 70.0
            self.memory_critical_threshold = 80.0
            self.memory_emergency_threshold = 90.0
        elif self.system_memory_gb <= 4:  # Medium memory system
            self.memory_warning_threshold = 75.0
            self.memory_critical_threshold = 85.0
            self.memory_emergency_threshold = 95.0
        else:  # High memory system
            self.memory_warning_threshold = 80.0
            self.memory_critical_threshold = 90.0
            self.memory_emergency_threshold = 97.0
            
        logger.info(f"📊 Adaptive thresholds configured for {self.system_memory_gb:.1f}GB system: "
                   f"Warning: {self.memory_warning_threshold}%, "
                   f"Critical: {self.memory_critical_threshold}%, "
                   f"Emergency: {self.memory_emergency_threshold}%")
        
    def _calculate_optimal_interval(self) -> int:
        """Calculate optimal cleanup interval based on system resources."""
        if self.system_memory_gb <= 1:
            return 120  # 2 minutes for low memory
        elif self.system_memory_gb <= 4:
            return 180  # 3 minutes for medium memory
        else:
            return 300  # 5 minutes for high memory
            
    async def start(self):
        """Start optimized memory management."""
        if self.is_running:
            return
            
        self.is_running = True
        logger.info("🚀 Starting optimized memory management service...")
        
        # Configure garbage collection
        self._configure_optimal_gc()
        
        # Start monitoring tasks
        self._optimization_task = asyncio.create_task(self._optimization_loop())
        self._emergency_task = asyncio.create_task(self._emergency_monitor())
        
        logger.info("✅ Optimized memory management service started")
        
    async def stop(self):
        """Stop memory management service."""
        self.is_running = False
        
        # Cancel tasks
        for task in [self._optimization_task, self._emergency_task]:
            if task:
                task.cancel()
                try:
                    await task
                except asyncio.CancelledError:
                    pass
                    
        logger.info("🛑 Optimized memory management service stopped")
        
    def _configure_optimal_gc(self):
        """Configure garbage collection for optimal performance."""
        # Adaptive GC thresholds based on system memory
        if self.system_memory_gb <= 1:
            # Aggressive GC for low memory
            gc.set_threshold(400, 8, 8)
        elif self.system_memory_gb <= 4:
            # Balanced GC for medium memory
            gc.set_threshold(700, 10, 10)
        else:
            # Conservative GC for high memory
            gc.set_threshold(1000, 15, 15)
            
        # Enable automatic gc for generation 0
        gc.enable()
        
        thresholds = gc.get_threshold()
        logger.info(f"🗑️ Optimal GC configured: thresholds={thresholds}")
        
    async def _optimization_loop(self):
        """Main optimization loop with intelligent scheduling."""
        while self.is_running:
            try:
                await asyncio.sleep(self.optimization_interval)
                await self._intelligent_cleanup()
                
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"❌ Optimization loop error: {e}")
                await asyncio.sleep(60)
                
    async def _emergency_monitor(self):
        """Emergency memory monitoring loop."""
        while self.is_running:
            try:
                await asyncio.sleep(self.emergency_interval)
                
                memory_percent = psutil.virtual_memory().percent
                if memory_percent > self.memory_emergency_threshold:
                    await self._handle_emergency()
                    
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"❌ Emergency monitor error: {e}")
                await asyncio.sleep(30)
                
    async def _intelligent_cleanup(self):
        """Intelligent cleanup based on system state and history."""
        try:
            # Collect current metrics
            metrics = await self._collect_metrics()
            self._update_memory_history(metrics)
            
            # Detect memory leaks
            if self.memory_leak_detection:
                await self._detect_memory_leaks()
            
            # Choose cleanup strategy
            strategy = self._choose_cleanup_strategy(metrics)
            
            # Execute cleanup
            start_time = time.time()
            await self.cleanup_strategies[strategy]()
            cleanup_time = time.time() - start_time
            
            # Track performance
            self.cleanup_performance[strategy] = {
                'last_duration': cleanup_time,
                'last_execution': datetime.utcnow(),
                'execution_count': self.cleanup_performance.get(strategy, {}).get('execution_count', 0) + 1
            }
            
            self.optimization_count += 1
            
            # Handle disk cleanup if needed
            if metrics['disk_percent'] > 85.0:
                await self._intelligent_disk_cleanup()
                
        except Exception as e:
            logger.error(f"❌ Intelligent cleanup failed: {e}")
            
    def _choose_cleanup_strategy(self, metrics: Dict[str, Any]) -> str:
        """Choose optimal cleanup strategy based on current metrics."""
        memory_percent = metrics['memory_percent']
        
        # Check for rapid memory growth
        if len(self.memory_history) >= 3:
            recent_trend = self.memory_history[-3:]
            memory_growth = recent_trend[-1]['memory_percent'] - recent_trend[0]['memory_percent']
            
            if memory_growth > 10:  # Rapid growth detected
                logger.warning(f"🚨 Rapid memory growth detected: +{memory_growth:.1f}% in 3 cycles")
                return 'aggressive'
        
        # Standard threshold-based selection
        if memory_percent > self.memory_emergency_threshold:
            return 'emergency'
        elif memory_percent > self.memory_critical_threshold:
            return 'aggressive'
        elif memory_percent > self.memory_warning_threshold:
            return 'standard'
        else:
            return 'routine'
            
    async def _routine_cleanup(self):
        """Optimized routine cleanup."""
        # Light garbage collection
        collected = gc.collect(0)  # Only generation 0
        
        if collected > 10:  # Only log if significant
            logger.debug(f"🧹 Routine cleanup: {collected} objects")
            
    async def _standard_cleanup(self):
        """Enhanced standard cleanup."""
        logger.info("⚠️ Standard memory cleanup initiated")
        
        # Progressive garbage collection
        total_collected = 0
        for generation in range(3):
            collected = gc.collect(generation)
            total_collected += collected
            if generation < 2:  # Brief pause except for last generation
                await asyncio.sleep(0.05)
                
        # Clear specific caches
        await self._clear_function_caches()
        
        # Post-cleanup metrics
        memory = psutil.virtual_memory()
        process_memory = psutil.Process().memory_info().rss / (1024**2)
        
        logger.info(f"📊 Standard cleanup completed: {total_collected} objects collected, "
                   f"Memory: {memory.percent:.1f}%, Process: {process_memory:.1f}MB")
                   
    async def _aggressive_cleanup(self):
        """Optimized aggressive cleanup."""
        logger.warning("🚨 Aggressive memory cleanup initiated")
        
        # Multi-pass garbage collection
        total_collected = 0
        for pass_num in range(2):
            for generation in range(3):
                collected = gc.collect(generation)
                total_collected += collected
            await asyncio.sleep(0.1)
            
        # Clear all caches
        await self._clear_all_caches()
        
        # Clear unused modules
        await self._clear_unused_modules()
        
        # Force memory optimization
        await self._force_memory_optimization()
        
        # Post-cleanup metrics
        memory = psutil.virtual_memory()
        process_memory = psutil.Process().memory_info().rss / (1024**2)
        
        logger.warning(f"📊 Aggressive cleanup completed: {total_collected} objects collected, "
                      f"Memory: {memory.percent:.1f}%, Process: {process_memory:.1f}MB")
                      
    async def _emergency_cleanup(self):
        """Emergency cleanup with all optimizations."""
        current_time = time.time()
        if current_time - self.last_emergency_cleanup < 45:  # Rate limiting
            return
            
        logger.error("🚨 EMERGENCY memory cleanup initiated")
        self.last_emergency_cleanup = current_time
        
        # Intensive garbage collection
        total_collected = 0
        for pass_num in range(3):
            for generation in range(3):
                collected = gc.collect(generation)
                total_collected += collected
            await asyncio.sleep(0.05)
            
        # Clear everything possible
        await self._clear_all_caches()
        await self._clear_unused_modules()
        await self._force_memory_optimization()
        await self._emergency_disk_cleanup()
        
        # System-level optimizations
        await self._system_level_cleanup()
        
        # Post-cleanup metrics
        memory = psutil.virtual_memory()
        process_memory = psutil.Process().memory_info().rss / (1024**2)
        
        logger.error(f"📊 Emergency cleanup completed: {total_collected} objects collected, "
                    f"Memory: {memory.percent:.1f}%, Process: {process_memory:.1f}MB")
                    
        # Alert if still critical
        if memory.percent > self.memory_critical_threshold:
            logger.critical("🚨 CRITICAL: Memory still high after emergency cleanup - system overloaded")
            
    async def _handle_emergency(self):
        """Handle emergency memory situations."""
        logger.error("🚨 Emergency memory situation detected")
        await self._emergency_cleanup()
        
    async def _clear_function_caches(self):
        """Clear function-level caches efficiently."""
        cleared_count = 0
        
        # Clear regex cache
        import re
        re.purge()
        
        # Clear lru_cache functions
        for module_name, module in list(sys.modules.items()):
            if module is None or 'test' in module_name.lower():
                continue
                
            try:
                for attr_name in dir(module):
                    try:
                        attr = getattr(module, attr_name)
                        if hasattr(attr, 'cache_clear'):
                            attr.cache_clear()
                            cleared_count += 1
                    except (AttributeError, TypeError):
                        continue
            except Exception:
                continue
                
        if cleared_count > 0:
            logger.info(f"🧹 Cleared {cleared_count} function caches")
            
    async def _clear_all_caches(self):
        """Clear all possible caches."""
        await self._clear_function_caches()
        
        # Clear import cache for debugging modules
        debug_modules = []
        for module_name in list(sys.modules.keys()):
            if any(pattern in module_name.lower() for pattern in 
                  ['test_', 'debug', 'dev', 'mock', '_test', 'pytest']):
                debug_modules.append(module_name)
                
        for module_name in debug_modules:
            if module_name in sys.modules:
                del sys.modules[module_name]
                
        if debug_modules:
            logger.info(f"🧹 Cleared {len(debug_modules)} debug modules")
            
    async def _clear_unused_modules(self):
        """Clear unused modules intelligently."""
        # Get list of modules imported more than 5 minutes ago but not recently used
        import importlib.util
        
        modules_to_clear = []
        current_time = time.time()
        
        for module_name, module in list(sys.modules.items()):
            if module is None:
                continue
                
            # Skip core modules
            if any(core in module_name for core in ['app.', 'fastapi', 'uvicorn', 'asyncio']):
                continue
                
            # Check if module has been used recently (rough heuristic)
            if hasattr(module, '__file__') and module.__file__:
                try:
                    mtime = os.path.getmtime(module.__file__)
                    if current_time - mtime > 300:  # 5 minutes
                        modules_to_clear.append(module_name)
                except (OSError, TypeError):
                    continue
                    
        # Clear selected modules
        for module_name in modules_to_clear[:20]:  # Limit to prevent issues
            try:
                del sys.modules[module_name]
            except KeyError:
                continue
                
        if modules_to_clear:
            logger.info(f"🧹 Cleared {len(modules_to_clear)} unused modules")
            
    async def _force_memory_optimization(self):
        """Force system-level memory optimization."""
        try:
            # Try to trim malloc
            import ctypes
            try:
                libc = ctypes.CDLL("libc.so.6")
                libc.malloc_trim(0)
                logger.debug("🧹 Forced malloc trim")
            except OSError:
                # Try alternative approach for different systems
                try:
                    libc = ctypes.CDLL("libc.dylib")  # macOS
                    if hasattr(libc, 'malloc_trim'):
                        libc.malloc_trim(0)
                except OSError:
                    pass
                    
        except Exception as e:
            logger.debug(f"Could not force memory optimization: {e}")
            
    async def _intelligent_disk_cleanup(self):
        """Intelligent disk space cleanup."""
        logger.warning("💾 Intelligent disk cleanup initiated")
        
        cleanup_targets = [
            ('/tmp', 24 * 3600, ['*.tmp', '*.log', '*.cache']),  # 1 day
            (tempfile.gettempdir(), 12 * 3600, ['*']),  # 12 hours
            ('./__pycache__', 0, ['*.pyc', '*.pyo']),  # Immediate
            ('./logs', 7 * 24 * 3600, ['*.log']),  # 7 days
        ]
        
        total_freed = 0
        for directory, max_age, patterns in cleanup_targets:
            try:
                freed = await self._cleanup_directory(directory, max_age, patterns)
                total_freed += freed
            except Exception as e:
                logger.debug(f"Could not cleanup {directory}: {e}")
                
        logger.info(f"💾 Disk cleanup completed: {total_freed / (1024**2):.1f}MB freed")
        
    async def _cleanup_directory(self, directory: str, max_age: int, patterns: List[str]) -> int:
        """Clean up a specific directory."""
        if not os.path.exists(directory):
            return 0
            
        total_freed = 0
        current_time = time.time()
        cutoff_time = current_time - max_age
        
        for root, dirs, files in os.walk(directory):
            for file in files:
                file_path = os.path.join(root, file)
                try:
                    # Check age
                    if os.path.getmtime(file_path) < cutoff_time:
                        # Check pattern
                        if any(file.endswith(pattern.replace('*', '')) for pattern in patterns if '*' in pattern):
                            file_size = os.path.getsize(file_path)
                            os.remove(file_path)
                            total_freed += file_size
                except (OSError, IOError):
                    continue
                    
        return total_freed
        
    async def _emergency_disk_cleanup(self):
        """Emergency disk cleanup for critical situations."""
        logger.error("💾 Emergency disk cleanup initiated")
        
        # More aggressive cleanup
        await self._intelligent_disk_cleanup()
        
        # Clear all pycache directories
        for root, dirs, files in os.walk('.'):
            if '__pycache__' in dirs:
                try:
                    shutil.rmtree(os.path.join(root, '__pycache__'), ignore_errors=True)
                except Exception:
                    continue
                    
    async def _system_level_cleanup(self):
        """System-level cleanup optimizations."""
        try:
            # Clear DNS cache if possible
            try:
                import socket
                socket.getaddrinfo.cache_clear()
            except AttributeError:
                pass
                
            # Clear SSL context cache
            try:
                import ssl
                ssl._create_default_https_context.cache_clear()
            except AttributeError:
                pass
                
        except Exception as e:
            logger.debug(f"System-level cleanup warning: {e}")
            
    async def _detect_memory_leaks(self):
        """Detect potential memory leaks."""
        if len(self.memory_history) < 10:
            return
            
        # Check for consistent upward trend
        recent_memory = [entry['memory_percent'] for entry in self.memory_history[-10:]]
        
        # Simple leak detection: consistent growth over 10 samples
        growth_count = 0
        for i in range(1, len(recent_memory)):
            if recent_memory[i] > recent_memory[i-1]:
                growth_count += 1
                
        if growth_count >= 8:  # 80% of samples show growth
            logger.warning("📈 Potential memory leak detected - consistent upward trend")
            
            # Get top memory consumers
            try:
                import tracemalloc
                if tracemalloc.is_tracing():
                    snapshot = tracemalloc.take_snapshot()
                    top_stats = snapshot.statistics('lineno')[:5]
                    
                    logger.warning("🔍 Top memory consumers:")
                    for stat in top_stats:
                        logger.warning(f"  {stat}")
            except Exception as e:
                logger.debug(f"Could not get memory traceback: {e}")
                
    async def _collect_metrics(self) -> Dict[str, Any]:
        """Collect comprehensive system metrics."""
        memory = psutil.virtual_memory()
        process = psutil.Process()
        process_memory = process.memory_info()
        disk = psutil.disk_usage('/')
        
        return {
            'timestamp': datetime.utcnow(),
            'memory_percent': memory.percent,
            'memory_available_mb': memory.available / (1024**2),
            'process_memory_mb': process_memory.rss / (1024**2),
            'process_memory_percent': process.memory_percent(),
            'disk_percent': (disk.used / disk.total) * 100,
            'cpu_percent': psutil.cpu_percent(interval=0.1),
            'gc_counts': gc.get_count(),
        }
        
    def _update_memory_history(self, metrics: Dict[str, Any]):
        """Update memory history for trend analysis."""
        self.memory_history.append(metrics)
        
        # Keep only recent history
        if len(self.memory_history) > self.max_history_size:
            self.memory_history = self.memory_history[-self.max_history_size:]
            
    async def get_optimization_stats(self) -> Dict[str, Any]:
        """Get comprehensive optimization statistics."""
        try:
            current_metrics = await self._collect_metrics()
            
            return {
                "current_metrics": current_metrics,
                "configuration": {
                    "system_memory_gb": self.system_memory_gb,
                    "warning_threshold": self.memory_warning_threshold,
                    "critical_threshold": self.memory_critical_threshold,
                    "emergency_threshold": self.memory_emergency_threshold,
                    "optimization_interval": self.optimization_interval,
                    "gc_thresholds": gc.get_threshold()
                },
                "performance": {
                    "optimization_count": self.optimization_count,
                    "cleanup_performance": self.cleanup_performance,
                    "last_emergency_cleanup": self.last_emergency_cleanup,
                    "service_running": self.is_running
                },
                "history": {
                    "memory_history_size": len(self.memory_history),
                    "recent_trend": self.memory_history[-5:] if len(self.memory_history) >= 5 else self.memory_history
                }
            }
            
        except Exception as e:
            logger.error(f"❌ Failed to get optimization stats: {e}")
            return {"error": str(e)}


# Global optimized memory manager instance
optimized_memory_manager = OptimizedMemoryManager()


async def get_optimized_memory_manager() -> OptimizedMemoryManager:
    """Get the global optimized memory manager instance."""
    return optimized_memory_manager