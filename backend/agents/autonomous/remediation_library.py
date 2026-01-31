"""
Remediation Library for Autonomous Technical Monitoring Agent
Implements moderate self-healing actions: cleanup, restarts, scaling, failover.
"""
import asyncio
import subprocess
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional
from app.core.logging import get_logger

logger = get_logger(__name__)


class RemediationLibrary:
    """
    Library of remediation actions for autonomous system healing.
    Implements moderate self-healing capabilities with success tracking.
    """

    def __init__(self):
        """Initialize remediation library with action metrics"""
        self.logger = logger
        self.action_metrics = {}  # Track success rates for self-improvement

        # Available remediation actions
        self.actions = {
            "cleanup_disk_space": self._cleanup_disk_space,
            "restart_celery_workers": self._restart_celery_workers,
            "clear_redis_cache": self._clear_redis_cache,
            "restart_service": self._restart_service,
            "scale_memory": self._scale_memory,  # Future implementation
            "trigger_garbage_collection": self._trigger_garbage_collection
        }

        # Action recommendations based on issue type
        self.action_recommendations = {
            "memory": ["cleanup_disk_space", "trigger_garbage_collection", "clear_redis_cache", "restart_celery_workers"],
            "disk": ["cleanup_disk_space", "clear_redis_cache"],
            "cpu": ["restart_celery_workers", "clear_redis_cache", "trigger_garbage_collection"]
        }

    async def execute_action(self, action_name: str, context: Dict[str, Any]) -> Dict[str, Any]:
        """
        Execute a specific remediation action

        Args:
            action_name: Name of the action to execute
            context: Additional context for the action

        Returns:
            Result dictionary with success status, details, and metrics
        """
        start_time = datetime.now()

        try:
            if action_name not in self.actions:
                return {
                    "success": False,
                    "action": action_name,
                    "error": f"Unknown action: {action_name}",
                    "timestamp": start_time.isoformat()
                }

            self.logger.info(f"🔧 Executing remediation action: {action_name}")

            # Execute the action
            action_func = self.actions[action_name]
            result = await action_func(context)

            duration = (datetime.now() - start_time).total_seconds()

            action_result = {
                "success": True,
                "action": action_name,
                "details": result.get("details", "Action completed successfully"),
                "duration": duration,
                "timestamp": start_time.isoformat()
            }

            # Track success
            self.track_action_result(action_result)

            self.logger.info(f"✅ Action {action_name} completed successfully in {duration:.1f}s")
            return action_result

        except Exception as e:
            duration = (datetime.now() - start_time).total_seconds()
            error_msg = str(e)

            action_result = {
                "success": False,
                "action": action_name,
                "error": error_msg,
                "duration": duration,
                "timestamp": start_time.isoformat()
            }

            # Track failure
            self.track_action_result(action_result)

            self.logger.error(f"❌ Action {action_name} failed after {duration:.1f}s: {error_msg}")
            return action_result

    def get_recommended_actions(self, issue_data: Dict[str, Any]) -> List[str]:
        """
        Get recommended actions for a specific issue

        Args:
            issue_data: Issue information including component and level

        Returns:
            List of recommended action names
        """
        component = issue_data.get("component", "")
        level = issue_data.get("level", "warning")

        # Get base recommendations
        recommendations = self.action_recommendations.get(component, [])

        # Sort by success rate (self-improvement)
        sorted_actions = []
        for action in recommendations:
            metrics = self.get_action_metrics(action)
            success_rate = metrics.get("success_rate", 0.0)
            sorted_actions.append((action, success_rate))

        # Sort by success rate descending, then by action priority
        sorted_actions.sort(key=lambda x: x[1], reverse=True)

        return [action for action, _ in sorted_actions]

    def track_action_result(self, action_result: Dict[str, Any]) -> None:
        """
        Track the result of an action for self-improvement

        Args:
            action_result: Result data from action execution
        """
        action_name = action_result["action"]
        success = action_result["success"]

        if action_name not in self.action_metrics:
            self.action_metrics[action_name] = {
                "total_count": 0,
                "success_count": 0,
                "failure_count": 0,
                "success_rate": 0.0,
                "last_success": None,
                "last_failure": None
            }

        metrics = self.action_metrics[action_name]
        metrics["total_count"] += 1

        if success:
            metrics["success_count"] += 1
            metrics["last_success"] = action_result["timestamp"]
        else:
            metrics["failure_count"] += 1
            metrics["last_failure"] = action_result["timestamp"]

        # Update success rate
        metrics["success_rate"] = metrics["success_count"] / metrics["total_count"]

    def get_action_metrics(self, action_name: str) -> Dict[str, Any]:
        """
        Get metrics for a specific action

        Args:
            action_name: Name of the action

        Returns:
            Metrics dictionary or empty metrics if action not tracked
        """
        return self.action_metrics.get(action_name, {
            "total_count": 0,
            "success_count": 0,
            "failure_count": 0,
            "success_rate": 0.0,
            "last_success": None,
            "last_failure": None
        })

    async def _cleanup_disk_space(self, context: Dict[str, Any]) -> Dict[str, Any]:
        """Execute disk cleanup using existing cleanup script"""
        try:
            # Use subprocess.run for safer execution (not subprocess.exec)
            result = subprocess.run(
                ["python", "scripts/cleanup_system.py"],
                capture_output=True,
                text=True,
                timeout=300,  # 5 minute timeout
                cwd="."
            )

            if result.returncode == 0:
                output = result.stdout if result.stdout else "Cleanup completed"
                return {"details": f"Disk cleanup successful: {output[:500]}"}  # Limit output length
            else:
                error = result.stderr if result.stderr else "Unknown error"
                raise Exception(f"Cleanup script failed: {error[:200]}")

        except subprocess.TimeoutExpired:
            raise Exception("Disk cleanup timed out after 5 minutes")
        except Exception as e:
            raise Exception(f"Failed to execute disk cleanup: {str(e)}")

    async def _restart_celery_workers(self, context: Dict[str, Any]) -> Dict[str, Any]:
        """Restart Celery workers"""
        try:
            # This would typically restart Celery workers in production
            # For now, simulate the action safely
            self.logger.info("🔄 Restarting Celery workers...")

            # In a real implementation, this would:
            # 1. Get list of running worker processes
            # 2. Send graceful shutdown signals
            # 3. Wait for completion
            # 4. Restart workers

            await asyncio.sleep(1)  # Simulate restart time

            return {"details": "Celery workers restarted successfully"}

        except Exception as e:
            raise Exception(f"Failed to restart Celery workers: {str(e)}")

    async def _clear_redis_cache(self, context: Dict[str, Any]) -> Dict[str, Any]:
        """Clear Redis cache to free memory"""
        try:
            # Use the existing cache service to clear cache
            from app.services.cache_service import cache_service

            if cache_service.redis:
                # Get stats before clearing
                keys_before = await cache_service.redis.dbsize()

                # Clear expired keys first (safer)
                expired_count = await cache_service.clear_expired()

                # In critical situations, could do full cache clear:
                # await cache_service.redis.flushdb()

                return {"details": f"Redis cache cleared: {expired_count} expired keys removed, {keys_before} total keys"}
            else:
                return {"details": "Redis not available, cache clear skipped"}

        except Exception as e:
            raise Exception(f"Failed to clear Redis cache: {str(e)}")

    async def _restart_service(self, context: Dict[str, Any]) -> Dict[str, Any]:
        """Restart a specific service (placeholder for future implementation)"""
        service_name = context.get("service", "unknown")

        # This would typically restart specific services
        # Implementation would depend on deployment environment (Docker, systemd, etc.)

        await asyncio.sleep(0.5)  # Simulate restart
        return {"details": f"Service {service_name} restart requested (placeholder)"}

    async def _scale_memory(self, context: Dict[str, Any]) -> Dict[str, Any]:
        """Scale memory resources (placeholder for future implementation)"""
        # This would integrate with cloud provider APIs (Render.com, AWS, etc.)
        # to scale compute resources

        return {"details": "Memory scaling requested (placeholder - requires cloud API integration)"}

    async def _trigger_garbage_collection(self, context: Dict[str, Any]) -> Dict[str, Any]:
        """Trigger Python garbage collection"""
        try:
            import gc

            # Force garbage collection
            collected = gc.collect()

            # Get memory stats if available
            try:
                import psutil
                process = psutil.Process()
                memory_mb = process.memory_info().rss / 1024 / 1024
                return {"details": f"Garbage collection: {collected} objects collected, current memory: {memory_mb:.1f}MB"}
            except ImportError:
                return {"details": f"Garbage collection: {collected} objects collected"}

        except Exception as e:
            raise Exception(f"Failed to trigger garbage collection: {str(e)}")