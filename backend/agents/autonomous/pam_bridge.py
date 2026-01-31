"""
PAM Bridge for Autonomous Technical Monitoring Agent
Handles notification delivery to PAM system with fallback and retry mechanisms.
"""

import asyncio
import json
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional
from app.core.logging import get_logger

logger = get_logger(__name__)

# PAM message bus integration
try:
    from app.services.pam.message_bus import get_message_bus, MessageType, MessagePriority
    PAM_AVAILABLE = True
except ImportError:
    PAM_AVAILABLE = False
    logger.warning("⚠️ PAM message bus not available - notifications will be queued")


class PamNotificationBridge:
    """
    Bridge for sending monitoring notifications to PAM system.
    Handles delivery, fallback, retry, and queueing mechanisms.
    """

    def __init__(self, max_retries: int = 3, retry_delay: float = 2.0):
        """
        Initialize PAM notification bridge

        Args:
            max_retries: Maximum number of retry attempts
            retry_delay: Delay between retry attempts in seconds
        """
        self.logger = logger
        self.max_retries = max_retries
        self.retry_delay = retry_delay

        # Queue for failed notifications
        self.notification_queue: List[Dict[str, Any]] = []

        # Metrics tracking
        self.delivery_metrics = {
            "total_sent": 0,
            "successful_deliveries": 0,
            "failed_deliveries": 0,
            "queued_notifications": 0,
            "retry_attempts": 0
        }

        # Service registration
        self.service_registered = False

    async def send_notification(self, notification_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Send notification to PAM system with fallback handling

        Args:
            notification_data: Notification payload including type, severity, message

        Returns:
            Result dictionary with success status and details
        """
        start_time = datetime.now()

        try:
            if not PAM_AVAILABLE:
                return await self._fallback_queue_notification(notification_data)

            # Ensure service is registered
            if not self.service_registered:
                await self._register_service()

            # Get message bus
            message_bus = await get_message_bus()

            # Map notification to PAM message format
            pam_message = self._map_to_pam_message(notification_data)

            # Attempt delivery with retries
            for attempt in range(self.max_retries + 1):
                try:
                    message_id = await message_bus.send_message(
                        message_type=pam_message["type"],
                        source_service=pam_message["source_service"],
                        payload=pam_message["payload"],
                        priority=pam_message["priority"],
                        ttl_seconds=300  # 5 minutes TTL
                    )

                    # Success
                    duration = (datetime.now() - start_time).total_seconds()
                    self.delivery_metrics["total_sent"] += 1
                    self.delivery_metrics["successful_deliveries"] += 1
                    if attempt > 0:
                        self.delivery_metrics["retry_attempts"] += attempt

                    self.logger.info(f"📱 PAM notification delivered: {message_id} in {duration:.2f}s")

                    return {
                        "success": True,
                        "message_id": message_id,
                        "delivery_time": duration,
                        "attempts": attempt + 1
                    }

                except Exception as e:
                    if attempt < self.max_retries:
                        self.logger.warning(f"⚠️ PAM notification attempt {attempt + 1} failed: {e}")
                        await asyncio.sleep(self.retry_delay * (2 ** attempt))  # Exponential backoff
                        continue
                    else:
                        raise e

        except Exception as e:
            self.logger.error(f"❌ PAM notification failed after {self.max_retries} retries: {e}")
            return await self._fallback_queue_notification(notification_data, str(e))

    def _map_to_pam_message(self, notification_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Map monitoring notification to PAM message format

        Args:
            notification_data: Original notification data

        Returns:
            PAM-formatted message data
        """
        # Map severity to PAM priority
        severity_priority_map = {
            "info": MessagePriority.NORMAL,
            "warning": MessagePriority.HIGH,
            "critical": MessagePriority.URGENT,
            "error": MessagePriority.URGENT
        }

        severity = notification_data.get("severity", "info")
        priority = severity_priority_map.get(severity, MessagePriority.NORMAL)

        # Format message for PAM
        message = self._format_pam_message(notification_data)

        return {
            "type": MessageType.USER_INTERACTION,  # PAM will present to user
            "source_service": "technical_monitor",
            "priority": priority,
            "payload": {
                "interaction_type": "system_notification",
                "source": "autonomous_monitor",
                "message": message,
                "data": notification_data,
                "timestamp": notification_data.get("timestamp", datetime.now().isoformat()),
                "requires_response": False,
                "notification_level": severity
            }
        }

    def _format_pam_message(self, notification_data: Dict[str, Any]) -> str:
        """
        Format notification data into human-readable message for PAM

        Args:
            notification_data: Notification data

        Returns:
            Formatted message string
        """
        msg_type = notification_data.get("type", "system_alert")
        component = notification_data.get("component", "system")
        message = notification_data.get("message", "System notification")
        action_taken = notification_data.get("action_taken")

        if msg_type == "system_alert":
            if action_taken:
                return f"🔧 System Alert: {message}. Action taken: {action_taken}"
            else:
                return f"⚠️ System Alert: {message}"
        elif msg_type == "remediation_success":
            return f"✅ System Recovery: {message}"
        elif msg_type == "remediation_failure":
            return f"❌ System Issue: {message}"
        else:
            return f"🤖 System Monitor: {message}"

    async def _fallback_queue_notification(
        self,
        notification_data: Dict[str, Any],
        error_reason: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Queue notification for later delivery when PAM is unavailable

        Args:
            notification_data: Notification to queue
            error_reason: Reason for fallback (optional)

        Returns:
            Fallback result
        """
        queued_notification = {
            "data": notification_data,
            "queued_at": datetime.now().isoformat(),
            "error_reason": error_reason,
            "retry_count": 0
        }

        self.notification_queue.append(queued_notification)
        self.delivery_metrics["total_sent"] += 1
        self.delivery_metrics["failed_deliveries"] += 1
        self.delivery_metrics["queued_notifications"] += 1

        reason = error_reason or "PAM system unavailable"
        self.logger.warning(f"📬 Notification queued for retry: {reason}")

        return {
            "success": False,
            "message": f"Notification queued for retry - {reason}",
            "queued": True,
            "queue_size": len(self.notification_queue)
        }

    async def _register_service(self):
        """Register monitoring agent as a service with PAM message bus"""
        try:
            if not PAM_AVAILABLE:
                return

            message_bus = await get_message_bus()

            service_info = {
                "name": "technical_monitor",
                "description": "Autonomous Technical Monitoring Agent",
                "version": "1.0.0",
                "capabilities": ["system_monitoring", "auto_remediation", "health_alerts"],
                "endpoints": ["health_check", "metrics"]
            }

            message_bus.register_service("technical_monitor", service_info)
            self.service_registered = True

            self.logger.info("📋 Technical Monitor registered with PAM message bus")

        except Exception as e:
            self.logger.warning(f"⚠️ Failed to register with PAM message bus: {e}")

    async def get_queued_notifications(self) -> List[Dict[str, Any]]:
        """
        Get list of queued notifications waiting for delivery

        Returns:
            List of queued notification data
        """
        return [notification["data"] for notification in self.notification_queue]

    async def retry_queued_notifications(self) -> Dict[str, Any]:
        """
        Attempt to retry delivery of queued notifications

        Returns:
            Retry results summary
        """
        if not self.notification_queue:
            return {"retried": 0, "successful": 0, "still_queued": 0}

        retried = 0
        successful = 0
        failed_queue = []

        for queued_notification in self.notification_queue:
            notification_data = queued_notification["data"]
            queued_notification["retry_count"] += 1

            # Attempt redelivery
            result = await self.send_notification(notification_data)
            retried += 1

            if result["success"]:
                successful += 1
                self.delivery_metrics["queued_notifications"] -= 1
            else:
                # Keep in queue if not too many retries
                if queued_notification["retry_count"] < 5:
                    failed_queue.append(queued_notification)

        # Update queue with failed notifications
        self.notification_queue = failed_queue

        self.logger.info(f"🔄 Notification retry: {successful}/{retried} successful")

        return {
            "retried": retried,
            "successful": successful,
            "still_queued": len(self.notification_queue)
        }

    def get_delivery_metrics(self) -> Dict[str, Any]:
        """
        Get notification delivery metrics

        Returns:
            Metrics dictionary
        """
        success_rate = 0.0
        if self.delivery_metrics["total_sent"] > 0:
            success_rate = self.delivery_metrics["successful_deliveries"] / self.delivery_metrics["total_sent"]

        return {
            **self.delivery_metrics,
            "success_rate": success_rate,
            "pam_available": PAM_AVAILABLE,
            "service_registered": self.service_registered
        }

    async def send_system_alert(
        self,
        component: str,
        severity: str,
        message: str,
        action_taken: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Convenience method to send system alert notification

        Args:
            component: System component (memory, disk, cpu, etc.)
            severity: Alert severity (info, warning, critical, error)
            message: Alert message
            action_taken: Action taken by monitoring agent (optional)

        Returns:
            Delivery result
        """
        notification_data = {
            "type": "system_alert",
            "component": component,
            "severity": severity,
            "message": message,
            "action_taken": action_taken,
            "timestamp": datetime.now().isoformat(),
            "source": "autonomous_monitor"
        }

        return await self.send_notification(notification_data)

    async def send_remediation_result(
        self,
        action: str,
        success: bool,
        details: str,
        component: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Convenience method to send remediation action result

        Args:
            action: Action that was performed
            success: Whether the action succeeded
            details: Result details
            component: Affected component (optional)

        Returns:
            Delivery result
        """
        msg_type = "remediation_success" if success else "remediation_failure"
        severity = "info" if success else "warning"

        notification_data = {
            "type": msg_type,
            "component": component or "system",
            "severity": severity,
            "message": f"{action}: {details}",
            "action": action,
            "success": success,
            "timestamp": datetime.now().isoformat(),
            "source": "autonomous_monitor"
        }

        return await self.send_notification(notification_data)