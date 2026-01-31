"""
Technical Monitoring Agent - Core Monitoring Foundation
Autonomous agent that monitors system health via existing health endpoints.
"""
import asyncio
import logging
import requests
from datetime import datetime, timedelta
from typing import Dict, Any, Optional
from app.core.logging import get_logger

logger = get_logger(__name__)

# Memory-keeper functions for persistence (will be dynamically loaded)
mcp__memory_keeper__context_save = None
mcp__memory_keeper__context_search = None

def _load_memory_keeper_tools():
    """Dynamically load memory-keeper tools if available"""
    global mcp__memory_keeper__context_save, mcp__memory_keeper__context_search
    try:
        # These would be loaded via ToolSearch in a real implementation
        # For now, we'll simulate the interface
        pass
    except Exception:
        pass


class TechnicalMonitor:
    """
    Core technical monitoring agent that polls health endpoints and detects issues.
    Implements adaptive polling and threshold detection for autonomous decision making.
    """

    def __init__(self, base_url: str = "http://localhost:8000"):
        """
        Initialize Technical Monitor

        Args:
            base_url: Base URL for health endpoint polling
        """
        self.base_url = base_url
        self.logger = logger

        # Monitoring thresholds (aligned with ResourceMonitor thresholds)
        self.thresholds = {
            "memory": {"warning": 65.0, "critical": 80.0},
            "disk": {"warning": 75.0, "critical": 85.0},
            "cpu": {"warning": 85.0, "critical": 95.0}
        }

        # Polling configuration
        self.normal_polling_interval = 30  # 30 seconds during normal operation
        self.issue_polling_interval = 10   # 10 seconds during issues

        # Health endpoint timeout
        self.timeout = 10

        # Memory-keeper tools (will be set by dependency injection or mocking)
        self.mcp__memory_keeper__context_save = None
        self.mcp__memory_keeper__context_search = None

        # PAM bridge for notifications (will be initialized lazily)
        self.pam_bridge = None

    def parse_health_data(self, health_response: Dict[str, Any]) -> Dict[str, Any]:
        """
        Parse health endpoint response data into standardized format

        Args:
            health_response: Raw health endpoint response

        Returns:
            Parsed health data with standardized keys
        """
        try:
            stats = health_response.get("stats", {})

            parsed_data = {
                "status": health_response.get("status", "UNKNOWN"),
                "health_score": health_response.get("health_score", 0),
                "alerts": health_response.get("alerts", 0),
                "memory_pct": stats.get("memory_pct", 0.0),
                "disk_pct": stats.get("disk_pct", 0.0),
                "cpu_pct": stats.get("cpu_pct", 0.0),
                "timestamp": health_response.get("timestamp", datetime.now().isoformat())
            }

            return parsed_data

        except Exception as e:
            self.logger.error(f"❌ Failed to parse health data: {e}")
            return {
                "status": "ERROR",
                "error": f"Parse error: {str(e)}",
                "timestamp": datetime.now().isoformat()
            }

    def detect_thresholds_exceeded(self, health_data: Dict[str, Any]) -> Dict[str, Dict[str, Any]]:
        """
        Detect which thresholds are exceeded and at what level

        Args:
            health_data: Parsed health data

        Returns:
            Dictionary of exceeded thresholds with level and values
        """
        exceeded = {}

        for component in ["memory", "disk", "cpu"]:
            value = health_data.get(f"{component}_pct", 0.0)
            thresholds = self.thresholds[component]

            if value >= thresholds["critical"]:
                exceeded[component] = {
                    "level": "critical",
                    "value": value,
                    "threshold": thresholds["critical"]
                }
            elif value >= thresholds["warning"]:
                exceeded[component] = {
                    "level": "warning",
                    "value": value,
                    "threshold": thresholds["warning"]
                }

        return exceeded

    def get_adaptive_polling_frequency(self, health_data: Dict[str, Any]) -> int:
        """
        Get adaptive polling frequency based on system health

        Args:
            health_data: Current health data

        Returns:
            Polling interval in seconds
        """
        status = health_data.get("status", "UNKNOWN")
        alerts = health_data.get("alerts", 0)

        # Increase frequency during issues
        if status in ["WARNING", "CRITICAL"] or alerts > 0:
            return self.issue_polling_interval

        return self.normal_polling_interval

    async def poll_health_endpoint(self) -> Dict[str, Any]:
        """
        Poll the health endpoint and return response data

        Returns:
            Health endpoint response data or error information
        """
        try:
            health_url = f"{self.base_url}/health/resources"

            # Use asyncio to run the blocking requests call
            loop = asyncio.get_event_loop()
            response = await loop.run_in_executor(
                None,
                lambda: requests.get(health_url, timeout=self.timeout)
            )

            if response.status_code == 200:
                health_data = response.json()
                self.logger.debug(f"📊 Health check successful: {health_data.get('status')}")
                return health_data
            else:
                error_msg = f"Health endpoint returned status {response.status_code}"
                self.logger.error(f"❌ {error_msg}")
                return {
                    "status": "ERROR",
                    "error": error_msg,
                    "timestamp": datetime.now().isoformat()
                }

        except Exception as e:
            error_msg = f"Health endpoint polling failed: {str(e)}"
            self.logger.error(f"❌ {error_msg}")
            return {
                "status": "ERROR",
                "error": error_msg,
                "timestamp": datetime.now().isoformat()
            }

    async def save_action_history(self, action_data: Dict[str, Any]) -> None:
        """
        Save action history to persistent memory using memory-keeper tools

        Args:
            action_data: Action result data to persist
        """
        try:
            if not self.mcp__memory_keeper__context_save:
                self.logger.warning("⚠️ Memory-keeper context_save not available")
                return

            # Use memory-keeper to save action history
            import json
            key = f"monitoring_action_{action_data['action']}_{int(datetime.now().timestamp())}"

            await self.mcp__memory_keeper__context_save({
                "key": key,
                "value": json.dumps(action_data),  # Use JSON for safe serialization
                "category": "progress",
                "priority": "normal",
                "private": False
            })

            self.logger.debug(f"💾 Saved action history: {key}")

        except Exception as e:
            # Graceful degradation - don't fail if memory persistence fails
            self.logger.warning(f"⚠️ Failed to save action history: {e}")

    async def save_health_metrics(self, health_data: Dict[str, Any]) -> None:
        """
        Save health metrics to persistent memory

        Args:
            health_data: Health metrics to persist
        """
        try:
            if not self.mcp__memory_keeper__context_save:
                self.logger.warning("⚠️ Memory-keeper context_save not available")
                return

            import json
            key = f"health_metrics_{int(datetime.now().timestamp())}"

            await self.mcp__memory_keeper__context_save({
                "key": key,
                "value": json.dumps(health_data),
                "category": "note",
                "priority": "normal",
                "private": False
            })

            self.logger.debug(f"💾 Saved health metrics: {key}")

        except Exception as e:
            self.logger.warning(f"⚠️ Failed to save health metrics: {e}")

    async def get_action_history(self, action_name: str) -> Optional[Dict[str, Any]]:
        """
        Retrieve action history for a specific action type

        Args:
            action_name: Name of the action to retrieve history for

        Returns:
            Most recent action data or None if not found
        """
        try:
            if not self.mcp__memory_keeper__context_search:
                self.logger.warning("⚠️ Memory-keeper context_search not available")
                return None

            # Search for recent action history
            results = await self.mcp__memory_keeper__context_search({
                "query": f"monitoring_action_{action_name}",
                "category": "progress",
                "limit": 1,
                "sort": "created_desc"
            })

            if results and len(results) > 0:
                # Parse the stored JSON data safely
                import json
                action_data = json.loads(results[0]["value"])
                return action_data

            return None

        except Exception as e:
            self.logger.warning(f"⚠️ Failed to retrieve action history: {e}")
            return None

    async def analyze_historical_patterns(self, action_name: str) -> Dict[str, Any]:
        """
        Analyze historical patterns for an action type

        Args:
            action_name: Name of the action to analyze

        Returns:
            Analysis including success rate, average duration, etc.
        """
        try:
            if not self.mcp__memory_keeper__context_search:
                self.logger.warning("⚠️ Memory-keeper context_search not available")
                return {
                    "success_rate": 0.0,
                    "avg_duration": 0.0,
                    "total_attempts": 0
                }

            # Get recent history for this action
            results = await self.mcp__memory_keeper__context_search({
                "query": f"monitoring_action_{action_name}",
                "category": "progress",
                "limit": 50,  # Analyze last 50 attempts
                "sort": "created_desc"
            })

            if not results:
                return {
                    "success_rate": 0.0,
                    "avg_duration": 0.0,
                    "total_attempts": 0
                }

            # Analyze the data
            successful_attempts = []
            total_attempts = len(results)
            total_duration = 0.0

            for result in results:
                try:
                    import json
                    action_data = json.loads(result["value"])

                    if action_data.get("success", False):
                        successful_attempts.append(action_data)
                        if "duration" in action_data:
                            total_duration += action_data["duration"]

                except Exception as e:
                    self.logger.warning(f"⚠️ Failed to parse action data: {e}")
                    continue

            success_rate = len(successful_attempts) / total_attempts if total_attempts > 0 else 0.0
            avg_duration = total_duration / len(successful_attempts) if successful_attempts else 0.0

            return {
                "success_rate": success_rate,
                "avg_duration": avg_duration,
                "total_attempts": total_attempts,
                "successful_attempts": len(successful_attempts)
            }

        except Exception as e:
            self.logger.warning(f"⚠️ Failed to analyze historical patterns: {e}")
            return {
                "success_rate": 0.0,
                "avg_duration": 0.0,
                "total_attempts": 0
            }

    async def _init_pam_bridge(self) -> None:
        """Initialize PAM bridge for notifications"""
        try:
            if not self.pam_bridge:
                from agents.autonomous.pam_bridge import PamNotificationBridge
                self.pam_bridge = PamNotificationBridge()
                self.logger.info("📱 PAM bridge initialized for monitoring notifications")
        except Exception as e:
            self.logger.warning(f"⚠️ Failed to initialize PAM bridge: {e}")

    async def notify_issue_detected(
        self,
        component: str,
        level: str,
        value: float,
        threshold: float,
        action_taken: Optional[str] = None
    ) -> None:
        """
        Send notification about detected system issue

        Args:
            component: System component (memory, disk, cpu)
            level: Issue level (warning, critical)
            value: Current value that triggered threshold
            threshold: Threshold that was exceeded
            action_taken: Action taken by monitoring agent (optional)
        """
        try:
            await self._init_pam_bridge()

            if self.pam_bridge:
                severity = "critical" if level == "critical" else "warning"
                message = f"{component.title()} at {value:.1f}% (threshold: {threshold}%)"

                await self.pam_bridge.send_system_alert(
                    component=component,
                    severity=severity,
                    message=message,
                    action_taken=action_taken
                )
            else:
                self.logger.info(f"📊 Issue detected: {component} {level} - {value:.1f}% (no PAM bridge)")

        except Exception as e:
            self.logger.warning(f"⚠️ Failed to send issue notification: {e}")

    async def notify_remediation_result(
        self,
        action: str,
        success: bool,
        details: str,
        component: Optional[str] = None
    ) -> None:
        """
        Send notification about remediation action result

        Args:
            action: Action that was performed
            success: Whether the action succeeded
            details: Result details
            component: Affected component (optional)
        """
        try:
            await self._init_pam_bridge()

            if self.pam_bridge:
                await self.pam_bridge.send_remediation_result(
                    action=action,
                    success=success,
                    details=details,
                    component=component
                )
            else:
                status = "✅" if success else "❌"
                self.logger.info(f"{status} Remediation result: {action} - {details} (no PAM bridge)")

        except Exception as e:
            self.logger.warning(f"⚠️ Failed to send remediation notification: {e}")

    async def get_pam_metrics(self) -> Dict[str, Any]:
        """
        Get PAM bridge delivery metrics

        Returns:
            PAM bridge metrics or empty dict if bridge unavailable
        """
        try:
            if self.pam_bridge:
                return self.pam_bridge.get_delivery_metrics()
            return {"pam_available": False, "bridge_initialized": False}
        except Exception as e:
            self.logger.warning(f"⚠️ Failed to get PAM metrics: {e}")
            return {"error": str(e)}