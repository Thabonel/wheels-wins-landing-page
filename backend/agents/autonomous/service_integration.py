"""
Proactive Trip Assistant Service Integration
Manages lifecycle integration with main.py and provides background monitoring.
"""
import asyncio
import logging
from datetime import datetime
from typing import Dict, Any, Optional
from app.core.logging import get_logger
from .proactive_trip_assistant import ProactiveTripAssistant

logger = get_logger(__name__)


class ProactiveTripAssistantService:
    """
    Service wrapper for ProactiveTripAssistant that handles lifecycle and background monitoring
    """

    def __init__(self):
        """
        Initialize Proactive Trip Assistant Service
        """
        self.assistant = ProactiveTripAssistant()
        self.monitoring_enabled = True
        self.monitoring_interval = 300  # 5 minutes
        self.background_task: Optional[asyncio.Task] = None
        self.logger = logger
        self.service_start_time = None

        # Monitoring metrics
        self.monitoring_metrics = {
            'total_monitoring_cycles': 0,
            'successful_cycles': 0,
            'failed_cycles': 0,
            'avg_cycle_duration': 0.0,
            'last_cycle_time': None,
            'notifications_sent': 0
        }

    async def startup(self) -> Dict[str, Any]:
        """
        Start the proactive trip assistant service

        Returns:
            Service startup result
        """
        try:
            self.service_start_time = datetime.now()

            self.logger.info("🚀 Starting Proactive Trip Assistant Service")

            # Start background monitoring if enabled
            if self.monitoring_enabled:
                await self.start_background_monitoring()

            return {
                'status': 'started',
                'monitoring_enabled': self.monitoring_enabled,
                'startup_time': self.service_start_time.isoformat()
            }

        except Exception as e:
            self.logger.error(f"❌ Failed to start service: {e}")
            return {
                'status': 'failed',
                'error': str(e),
                'startup_time': datetime.now().isoformat()
            }

    async def shutdown(self) -> Dict[str, Any]:
        """
        Shutdown the proactive trip assistant service

        Returns:
            Service shutdown result
        """
        try:
            self.logger.info("🛑 Stopping Proactive Trip Assistant Service")

            # Stop background monitoring
            await self.stop_background_monitoring()

            # Close any open connections
            if hasattr(self.assistant, 'pam_bridge') and self.assistant.pam_bridge:
                await self.assistant.pam_bridge.close()

            shutdown_time = datetime.now()

            return {
                'status': 'stopped',
                'shutdown_time': shutdown_time.isoformat()
            }

        except Exception as e:
            self.logger.error(f"❌ Failed to shutdown service: {e}")
            return {
                'status': 'failed',
                'error': str(e),
                'shutdown_time': datetime.now().isoformat()
            }

    async def start_background_monitoring(self) -> None:
        """
        Start background monitoring task
        """
        try:
            if self.background_task and not self.background_task.done():
                return  # Already running

            self.background_task = asyncio.create_task(self._background_monitoring_loop())
            self.logger.info("📡 Background monitoring started")

        except Exception as e:
            self.logger.error(f"❌ Failed to start background monitoring: {e}")

    async def stop_background_monitoring(self) -> None:
        """
        Stop background monitoring task
        """
        try:
            if self.background_task and not self.background_task.done():
                self.background_task.cancel()
                try:
                    await self.background_task
                except asyncio.CancelledError:
                    pass

            self.background_task = None
            self.logger.info("📡 Background monitoring stopped")

        except Exception as e:
            self.logger.error(f"❌ Failed to stop background monitoring: {e}")

    async def _background_monitoring_loop(self) -> None:
        """
        Background monitoring loop that runs monitoring cycles
        """
        while True:
            try:
                await self._run_single_monitoring_cycle()
                await asyncio.sleep(self.monitoring_interval)

            except asyncio.CancelledError:
                self.logger.info("📡 Background monitoring cancelled")
                break
            except Exception as e:
                self.logger.error(f"❌ Background monitoring error: {e}")
                await asyncio.sleep(self.monitoring_interval)

    async def _run_single_monitoring_cycle(self) -> Dict[str, Any]:
        """
        Run a single monitoring cycle

        Returns:
            Monitoring cycle result
        """
        cycle_start = datetime.now()

        try:
            # Run monitoring cycle through assistant
            result = await self.assistant.run_monitoring_cycle()

            # Update metrics
            cycle_duration = (datetime.now() - cycle_start).total_seconds()
            self.monitoring_metrics['total_monitoring_cycles'] += 1
            self.monitoring_metrics['successful_cycles'] += 1
            self.monitoring_metrics['last_cycle_time'] = cycle_start.isoformat()

            # Update average duration
            total_cycles = self.monitoring_metrics['total_monitoring_cycles']
            current_avg = self.monitoring_metrics['avg_cycle_duration']
            self.monitoring_metrics['avg_cycle_duration'] = (
                (current_avg * (total_cycles - 1) + cycle_duration) / total_cycles
            )

            return result

        except Exception as e:
            # Update failure metrics
            self.monitoring_metrics['total_monitoring_cycles'] += 1
            self.monitoring_metrics['failed_cycles'] += 1

            self.logger.error(f"❌ Monitoring cycle failed: {e}")
            return {
                'error': str(e),
                'timestamp': cycle_start.isoformat()
            }

    def get_status(self) -> Dict[str, Any]:
        """
        Get current service status

        Returns:
            Service status information
        """
        try:
            uptime_seconds = 0
            if self.service_start_time:
                uptime_seconds = (datetime.now() - self.service_start_time).total_seconds()

            background_monitoring_active = (
                self.background_task is not None and not self.background_task.done()
            )

            assistant_status = 'available' if self.assistant else 'unavailable'

            return {
                'service_name': 'ProactiveTripAssistant',
                'monitoring_enabled': self.monitoring_enabled,
                'uptime_seconds': uptime_seconds,
                'background_monitoring_active': background_monitoring_active,
                'assistant_status': assistant_status,
                'timestamp': datetime.now().isoformat()
            }

        except Exception as e:
            return {
                'service_name': 'ProactiveTripAssistant',
                'error': str(e),
                'timestamp': datetime.now().isoformat()
            }

    def get_monitoring_metrics(self) -> Dict[str, Any]:
        """
        Get monitoring metrics

        Returns:
            Current monitoring metrics
        """
        return self.monitoring_metrics.copy()