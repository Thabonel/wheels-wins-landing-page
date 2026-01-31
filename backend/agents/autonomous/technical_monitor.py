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