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

    async def run_monitoring_cycle(
        self,
        remediation_lib=None,
        max_cycles: Optional[int] = None
    ) -> Dict[str, Any]:
        """
        Run a single monitoring cycle: poll → analyze → remediate → notify

        Args:
            remediation_lib: RemediationLibrary instance for taking actions
            max_cycles: Maximum number of cycles to run (None for single cycle)

        Returns:
            Monitoring cycle results
        """
        cycle_start = datetime.now()
        cycle_results = {
            "cycle_start": cycle_start.isoformat(),
            "health_data": None,
            "issues_detected": {},
            "actions_taken": [],
            "notifications_sent": [],
            "polling_interval": self.normal_polling_interval,
            "duration": 0.0,
            "success": True,
            "errors": []
        }

        try:
            # Step 1: Poll health endpoint
            self.logger.debug("📊 Starting monitoring cycle - polling health endpoint")
            health_data = await self.poll_health_endpoint()
            cycle_results["health_data"] = health_data

            if health_data.get("status") == "ERROR":
                cycle_results["errors"].append(f"Health endpoint error: {health_data.get('error')}")
                return cycle_results

            # Step 2: Parse and analyze health data
            parsed_data = self.parse_health_data(health_data)
            thresholds_exceeded = self.detect_thresholds_exceeded(parsed_data)
            cycle_results["issues_detected"] = thresholds_exceeded

            # Step 3: Determine adaptive polling frequency
            polling_interval = self.get_adaptive_polling_frequency(parsed_data)
            cycle_results["polling_interval"] = polling_interval

            # Step 4: Take remediation actions if needed
            if thresholds_exceeded and remediation_lib:
                for component, issue_info in thresholds_exceeded.items():
                    try:
                        # Get recommended actions for this issue
                        issue_data = {
                            "component": component,
                            "level": issue_info["level"],
                            "value": issue_info["value"]
                        }
                        recommended_actions = remediation_lib.get_recommended_actions(issue_data)

                        # Execute the most recommended action
                        if recommended_actions:
                            action_name = recommended_actions[0]
                            self.logger.info(f"🔧 Executing remediation action: {action_name} for {component} {issue_info['level']}")

                            action_result = await remediation_lib.execute_action(action_name, {"component": component})
                            cycle_results["actions_taken"].append({
                                "action": action_name,
                                "component": component,
                                "result": action_result
                            })

                            # Save action history
                            await self.save_action_history(action_result)

                            # Notify about remediation result
                            await self.notify_remediation_result(
                                action=action_name,
                                success=action_result.get("success", False),
                                details=action_result.get("details", ""),
                                component=component
                            )
                            cycle_results["notifications_sent"].append("remediation_result")

                    except Exception as e:
                        error_msg = f"Remediation failed for {component}: {str(e)}"
                        cycle_results["errors"].append(error_msg)
                        self.logger.error(f"❌ {error_msg}")

            # Step 5: Send notifications about detected issues
            for component, issue_info in thresholds_exceeded.items():
                try:
                    action_taken = None
                    if cycle_results["actions_taken"]:
                        action_taken = next((a["action"] for a in cycle_results["actions_taken"] if a["component"] == component), None)

                    await self.notify_issue_detected(
                        component=component,
                        level=issue_info["level"],
                        value=issue_info["value"],
                        threshold=issue_info["threshold"],
                        action_taken=action_taken
                    )
                    cycle_results["notifications_sent"].append("issue_detection")

                except Exception as e:
                    error_msg = f"Notification failed for {component}: {str(e)}"
                    cycle_results["errors"].append(error_msg)
                    self.logger.warning(f"⚠️ {error_msg}")

        except Exception as e:
            cycle_results["success"] = False
            cycle_results["errors"].append(f"Monitoring cycle error: {str(e)}")
            self.logger.error(f"❌ Monitoring cycle failed: {e}")

        finally:
            # Calculate cycle duration
            cycle_results["duration"] = (datetime.now() - cycle_start).total_seconds()

            # Log cycle summary
            issues_count = len(cycle_results["issues_detected"])
            actions_count = len(cycle_results["actions_taken"])
            self.logger.info(f"📈 Monitoring cycle completed: {issues_count} issues detected, {actions_count} actions taken, {cycle_results['duration']:.2f}s")

        return cycle_results

    async def run_autonomous_monitoring(
        self,
        duration_hours: Optional[float] = None,
        max_cycles: Optional[int] = None
    ) -> Dict[str, Any]:
        """
        Run autonomous monitoring with adaptive polling

        Args:
            duration_hours: How long to run monitoring (None for indefinite)
            max_cycles: Maximum number of monitoring cycles (None for unlimited)

        Returns:
            Monitoring session results
        """
        self.logger.info("🤖 Starting autonomous technical monitoring")

        # Initialize remediation library
        from agents.autonomous.remediation_library import RemediationLibrary
        remediation_lib = RemediationLibrary()

        session_start = datetime.now()
        session_results = {
            "session_start": session_start.isoformat(),
            "cycles_completed": 0,
            "total_issues": 0,
            "total_actions": 0,
            "total_notifications": 0,
            "avg_cycle_duration": 0.0,
            "session_errors": [],
            "running": True
        }

        end_time = None
        if duration_hours:
            end_time = session_start + timedelta(hours=duration_hours)

        cycle_count = 0
        total_duration = 0.0

        try:
            while session_results["running"]:
                cycle_count += 1

                # Check termination conditions
                if max_cycles and cycle_count > max_cycles:
                    self.logger.info(f"🏁 Monitoring stopped: reached max cycles ({max_cycles})")
                    break

                if end_time and datetime.now() >= end_time:
                    self.logger.info(f"🏁 Monitoring stopped: reached time limit ({duration_hours}h)")
                    break

                # Run monitoring cycle
                cycle_results = await self.run_monitoring_cycle(remediation_lib)

                # Update session metrics
                session_results["cycles_completed"] = cycle_count
                session_results["total_issues"] += len(cycle_results["issues_detected"])
                session_results["total_actions"] += len(cycle_results["actions_taken"])
                session_results["total_notifications"] += len(cycle_results["notifications_sent"])
                total_duration += cycle_results["duration"]

                # Collect any errors
                if cycle_results["errors"]:
                    session_results["session_errors"].extend(cycle_results["errors"])

                # Wait for next polling interval
                polling_interval = cycle_results["polling_interval"]
                if cycle_count < (max_cycles or float('inf')):  # Don't sleep after last cycle
                    self.logger.debug(f"⏰ Waiting {polling_interval}s until next monitoring cycle")
                    await asyncio.sleep(polling_interval)

        except KeyboardInterrupt:
            self.logger.info("🛑 Monitoring stopped by user")
        except Exception as e:
            session_results["session_errors"].append(f"Session error: {str(e)}")
            self.logger.error(f"❌ Monitoring session error: {e}")
        finally:
            # Calculate final metrics
            if session_results["cycles_completed"] > 0:
                session_results["avg_cycle_duration"] = total_duration / session_results["cycles_completed"]

            session_duration = (datetime.now() - session_start).total_seconds()
            session_results["session_duration"] = session_duration
            session_results["running"] = False

            self.logger.info(f"🏁 Autonomous monitoring completed: {session_results['cycles_completed']} cycles, {session_duration:.1f}s total")

        return session_results

    def get_monitoring_status(self) -> Dict[str, Any]:
        """
        Get current monitoring system status

        Returns:
            Status information about monitoring components
        """
        status = {
            "timestamp": datetime.now().isoformat(),
            "base_url": self.base_url,
            "thresholds": self.thresholds,
            "polling_intervals": {
                "normal": self.normal_polling_interval,
                "issue": self.issue_polling_interval
            },
            "components": {
                "memory_keeper": self.mcp__memory_keeper__context_save is not None,
                "pam_bridge": self.pam_bridge is not None
            }
        }

        # Get PAM bridge metrics if available
        if self.pam_bridge:
            status["pam_metrics"] = self.pam_bridge.get_delivery_metrics()

        return status