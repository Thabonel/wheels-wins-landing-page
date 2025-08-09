"""
Integration Manager for Optimized Backend Components
Manages the integration of new optimized monitoring and memory management components.
"""

import asyncio
from typing import Dict, Any
from datetime import datetime

from app.core.logging import get_logger
from app.monitoring.optimized_memory_manager import get_optimized_memory_manager
from app.monitoring.enhanced_monitoring import get_enhanced_monitoring

logger = get_logger(__name__)


class BackendIntegrationManager:
    """
    Manages the integration and coordination of optimized backend components.
    
    Features:
    - Coordinated startup/shutdown of optimized services
    - Health check aggregation
    - Performance metrics collection
    - Alert coordination between services
    """
    
    def __init__(self):
        self.is_initialized = False
        self.services = {}
        self.startup_time = None
        
    async def initialize(self):
        """Initialize all optimized backend components."""
        if self.is_initialized:
            return
            
        logger.info("🚀 Initializing optimized backend components...")
        self.startup_time = datetime.utcnow()
        
        try:
            # Initialize optimized memory manager
            memory_manager = await get_optimized_memory_manager()
            await memory_manager.start()
            self.services['memory_manager'] = memory_manager
            logger.info("✅ Optimized memory manager initialized")
            
            # Initialize enhanced monitoring
            monitoring = await get_enhanced_monitoring()
            await monitoring.start()
            self.services['monitoring'] = monitoring
            logger.info("✅ Enhanced monitoring system initialized")
            
            # Set up alert integration
            monitoring.add_alert_callback(self._handle_monitoring_alert)
            
            self.is_initialized = True
            logger.info("✅ All optimized backend components initialized successfully")
            
        except Exception as e:
            logger.error(f"❌ Failed to initialize backend components: {e}")
            raise
            
    async def shutdown(self):
        """Shutdown all optimized components gracefully."""
        if not self.is_initialized:
            return
            
        logger.info("🛑 Shutting down optimized backend components...")
        
        shutdown_tasks = []
        for service_name, service in self.services.items():
            if hasattr(service, 'stop'):
                task = asyncio.create_task(service.stop())
                shutdown_tasks.append(task)
                logger.info(f"🛑 Shutting down {service_name}...")
                
        # Wait for all services to shutdown
        if shutdown_tasks:
            await asyncio.gather(*shutdown_tasks, return_exceptions=True)
            
        self.services.clear()
        self.is_initialized = False
        logger.info("✅ All optimized backend components shut down")
        
    async def get_health_status(self) -> Dict[str, Any]:
        """Get comprehensive health status of all components."""
        if not self.is_initialized:
            return {"status": "not_initialized", "services": {}}
            
        uptime_seconds = (datetime.utcnow() - self.startup_time).total_seconds()
        
        health_status = {
            "status": "healthy",
            "uptime_seconds": uptime_seconds,
            "startup_time": self.startup_time.isoformat(),
            "services": {}
        }
        
        # Check memory manager health
        if 'memory_manager' in self.services:
            try:
                memory_stats = await self.services['memory_manager'].get_optimization_stats()
                health_status["services"]["memory_manager"] = {
                    "status": "healthy" if self.services['memory_manager'].is_running else "stopped",
                    "optimization_count": memory_stats.get("performance", {}).get("optimization_count", 0),
                    "last_optimization": memory_stats.get("current_metrics", {}).get("timestamp")
                }
            except Exception as e:
                health_status["services"]["memory_manager"] = {
                    "status": "error",
                    "error": str(e)
                }
                
        # Check monitoring system health
        if 'monitoring' in self.services:
            try:
                monitoring_status = await self.services['monitoring'].get_monitoring_status()
                health_status["services"]["monitoring"] = {
                    "status": "healthy" if self.services['monitoring'].is_running else "stopped",
                    "active_alerts": monitoring_status.get("system_status", {}).get("active_alerts", 0),
                    "total_alerts_today": monitoring_status.get("system_status", {}).get("total_alerts_today", 0)
                }
            except Exception as e:
                health_status["services"]["monitoring"] = {
                    "status": "error",
                    "error": str(e)
                }
                
        # Determine overall health
        service_statuses = [
            service_health.get("status", "unknown") 
            for service_health in health_status["services"].values()
        ]
        
        if "error" in service_statuses:
            health_status["status"] = "degraded"
        elif "stopped" in service_statuses:
            health_status["status"] = "partial"
            
        return health_status
        
    async def get_performance_metrics(self) -> Dict[str, Any]:
        """Get comprehensive performance metrics from all components."""
        if not self.is_initialized:
            return {"error": "Components not initialized"}
            
        metrics = {
            "timestamp": datetime.utcnow().isoformat(),
            "memory_optimization": {},
            "monitoring_system": {}
        }
        
        # Get memory optimization metrics
        if 'memory_manager' in self.services:
            try:
                memory_stats = await self.services['memory_manager'].get_optimization_stats()
                metrics["memory_optimization"] = memory_stats
            except Exception as e:
                metrics["memory_optimization"] = {"error": str(e)}
                
        # Get monitoring system metrics
        if 'monitoring' in self.services:
            try:
                monitoring_status = await self.services['monitoring'].get_monitoring_status()
                metrics["monitoring_system"] = monitoring_status
            except Exception as e:
                metrics["monitoring_system"] = {"error": str(e)}
                
        return metrics
        
    def _handle_monitoring_alert(self, alert):
        """Handle alerts from the monitoring system."""
        logger.warning(f"🚨 Monitoring Alert: {alert.title} - {alert.message}")
        
        # You could add additional alert handling here, such as:
        # - Sending notifications
        # - Triggering automated responses
        # - Logging to external systems
        
    async def optimize_system(self):
        """Trigger manual system optimization."""
        if not self.is_initialized:
            logger.warning("⚠️ Cannot optimize - components not initialized")
            return False
            
        logger.info("🔧 Triggering manual system optimization...")
        
        # Trigger memory optimization if available
        if 'memory_manager' in self.services:
            try:
                # Force a cleanup cycle
                memory_manager = self.services['memory_manager']
                if hasattr(memory_manager, '_aggressive_cleanup'):
                    await memory_manager._aggressive_cleanup()
                    logger.info("✅ Manual memory optimization completed")
            except Exception as e:
                logger.error(f"❌ Manual memory optimization failed: {e}")
                
        return True
        
    async def update_monitoring_thresholds(self, thresholds: Dict[str, Dict[str, float]]):
        """Update monitoring thresholds dynamically."""
        if 'monitoring' not in self.services:
            logger.warning("⚠️ Monitoring service not available")
            return False
            
        monitoring = self.services['monitoring']
        
        for metric_name, levels in thresholds.items():
            for level, value in levels.items():
                if level in ['warning', 'error', 'critical']:
                    monitoring.update_threshold(metric_name, level, value)
                    
        logger.info(f"✅ Updated monitoring thresholds for {len(thresholds)} metrics")
        return True


# Global integration manager instance
integration_manager = BackendIntegrationManager()


async def get_integration_manager() -> BackendIntegrationManager:
    """Get the global integration manager instance."""
    return integration_manager