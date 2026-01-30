import asyncio
import logging
from typing import Dict, List, Union, Callable, Awaitable, Any, Optional
from dataclasses import dataclass
from datetime import datetime, timedelta
from collections import defaultdict
from app.services.pam.monitoring.event_types import EventType, BaseEvent, EventPriority

logger = logging.getLogger(__name__)

# Type aliases for better type safety
SyncHandler = Callable[[BaseEvent], Any]
AsyncHandler = Callable[[BaseEvent], Awaitable[Any]]
EventHandler = Union[SyncHandler, AsyncHandler]

class EventHandlerError(Exception):
    """Base exception for event handler errors"""
    pass

class RetryableError(EventHandlerError):
    """Exception for errors that can be retried"""
    pass

class FatalError(EventHandlerError):
    """Exception for errors that should stop processing"""
    pass

@dataclass
class EventMonitorConfig:
    """Configuration for EventMonitor behavior"""
    max_queue_size: int = 1000
    heartbeat_interval: float = 1.0
    max_handler_failures: int = 5
    failure_reset_interval: timedelta = timedelta(minutes=5)
    circuit_breaker_threshold: int = 3
    circuit_breaker_timeout: timedelta = timedelta(minutes=1)

@dataclass
class HandlerStats:
    """Statistics for event handler performance"""
    total_calls: int = 0
    successful_calls: int = 0
    failed_calls: int = 0
    consecutive_failures: int = 0
    last_failure_time: Optional[datetime] = None
    circuit_breaker_open: bool = False
    circuit_breaker_open_time: Optional[datetime] = None

class EventMonitor:
    """Always-on event monitoring for proactive PAM actions with robust error handling"""

    def __init__(self, user_id: str, config: Optional[EventMonitorConfig] = None):
        self.user_id = user_id
        self.config = config or EventMonitorConfig()
        self.handlers: Dict[EventType, List[EventHandler]] = defaultdict(list)
        self.handler_stats: Dict[str, HandlerStats] = defaultdict(HandlerStats)
        self.is_running = False
        self.event_queue = asyncio.Queue(maxsize=self.config.max_queue_size)
        self._monitoring_task: Optional[asyncio.Task] = None
        self._processed_events = 0
        self._failed_events = 0

    def register_handler(self, event_type: EventType, handler: EventHandler) -> None:
        """Register handler for specific event type with type validation"""
        if not isinstance(event_type, EventType):
            raise ValueError(f"Invalid event type: {event_type}")

        if not callable(handler):
            raise ValueError("Handler must be callable")

        self.handlers[event_type].append(handler)
        handler_key = self._get_handler_key(event_type, handler)
        self.handler_stats[handler_key] = HandlerStats()

        logger.info(f"Registered handler for {event_type.value} for user {self.user_id}")

    def unregister_handler(self, event_type: EventType, handler: EventHandler) -> bool:
        """Unregister a specific handler"""
        if event_type in self.handlers and handler in self.handlers[event_type]:
            self.handlers[event_type].remove(handler)
            handler_key = self._get_handler_key(event_type, handler)
            del self.handler_stats[handler_key]
            logger.info(f"Unregistered handler for {event_type.value} for user {self.user_id}")
            return True
        return False

    async def queue_event(self, event: BaseEvent) -> bool:
        """Queue event for processing with overflow handling"""
        try:
            # Validate event
            if event.user_id != self.user_id:
                raise ValueError(f"Event user_id {event.user_id} does not match monitor user_id {self.user_id}")

            # Try to put event in queue immediately (non-blocking)
            self.event_queue.put_nowait(event)
            logger.debug(f"Queued event {event.type.value} for user {self.user_id}")
            return True

        except asyncio.QueueFull:
            logger.warning(f"Event queue full for user {self.user_id}. Dropping event {event.type.value}")
            self._failed_events += 1
            return False
        except Exception as e:
            logger.error(f"Error queuing event {event.type.value}: {e}")
            self._failed_events += 1
            return False

    async def trigger_event(self, event: BaseEvent) -> None:
        """Trigger event and execute all registered handlers with proper error handling"""
        if event.type not in self.handlers:
            logger.debug(f"No handlers registered for event type {event.type.value}")
            return

        for handler in self.handlers[event.type]:
            handler_key = self._get_handler_key(event.type, handler)
            stats = self.handler_stats[handler_key]

            # Check circuit breaker
            if self._is_circuit_breaker_open(stats):
                logger.warning(f"Circuit breaker open for handler {handler_key}")
                continue

            try:
                stats.total_calls += 1

                # Execute handler based on type
                if asyncio.iscoroutinefunction(handler):
                    await handler(event)
                else:
                    handler(event)

                stats.successful_calls += 1
                stats.consecutive_failures = 0
                logger.debug(f"Successfully handled event {event.type.value} for user {self.user_id}")

            except FatalError as e:
                logger.error(f"Fatal error in handler {handler_key}: {e}")
                stats.failed_calls += 1
                stats.consecutive_failures += 1
                stats.last_failure_time = datetime.now()
                self._maybe_open_circuit_breaker(stats)
                # Fatal errors should stop processing for this handler
                continue

            except RetryableError as e:
                logger.warning(f"Retryable error in handler {handler_key}: {e}")
                stats.failed_calls += 1
                stats.consecutive_failures += 1
                stats.last_failure_time = datetime.now()
                # Could implement retry logic here if needed

            except Exception as e:
                logger.error(f"Unexpected error in handler {handler_key}: {e}", exc_info=True)
                stats.failed_calls += 1
                stats.consecutive_failures += 1
                stats.last_failure_time = datetime.now()
                self._maybe_open_circuit_breaker(stats)
                # Don't let unexpected errors crash the monitoring loop

    async def start_monitoring(self) -> None:
        """Start the event monitoring loop"""
        if self.is_running:
            logger.warning(f"Event monitoring already running for user {self.user_id}")
            return

        self.is_running = True
        logger.info(f"Starting event monitoring for user {self.user_id}")

        self._monitoring_task = asyncio.create_task(self._monitoring_loop())

    async def stop_monitoring(self) -> None:
        """Stop the event monitoring loop gracefully"""
        if not self.is_running:
            return

        self.is_running = False

        if self._monitoring_task and not self._monitoring_task.done():
            self._monitoring_task.cancel()
            try:
                await self._monitoring_task
            except asyncio.CancelledError:
                pass

        logger.info(f"Stopped event monitoring for user {self.user_id}")

    async def _monitoring_loop(self) -> None:
        """Main monitoring loop with proper error handling"""
        while self.is_running:
            try:
                # Wait for events from queue with timeout for heartbeat
                event = await asyncio.wait_for(
                    self.event_queue.get(),
                    timeout=self.config.heartbeat_interval
                )

                await self.trigger_event(event)
                self._processed_events += 1

                # Reset circuit breakers if needed
                self._maybe_reset_circuit_breakers()

            except asyncio.TimeoutError:
                # Heartbeat - check queue health and reset circuit breakers
                self._log_queue_health()
                self._maybe_reset_circuit_breakers()
                continue

            except Exception as e:
                logger.error(f"Critical error in monitoring loop for user {self.user_id}: {e}", exc_info=True)
                self._failed_events += 1
                # Brief pause before continuing to prevent tight error loops
                await asyncio.sleep(0.1)

    def _get_handler_key(self, event_type: EventType, handler: EventHandler) -> str:
        """Generate a unique key for handler statistics"""
        return f"{event_type.value}:{handler.__name__}:{id(handler)}"

    def _is_circuit_breaker_open(self, stats: HandlerStats) -> bool:
        """Check if circuit breaker is open for this handler"""
        if not stats.circuit_breaker_open:
            return False

        if stats.circuit_breaker_open_time is None:
            return False

        # Check if timeout has passed
        if datetime.now() - stats.circuit_breaker_open_time > self.config.circuit_breaker_timeout:
            stats.circuit_breaker_open = False
            stats.circuit_breaker_open_time = None
            logger.info(f"Circuit breaker reset for handler")
            return False

        return True

    def _maybe_open_circuit_breaker(self, stats: HandlerStats) -> None:
        """Open circuit breaker if threshold is reached"""
        if stats.consecutive_failures >= self.config.circuit_breaker_threshold:
            stats.circuit_breaker_open = True
            stats.circuit_breaker_open_time = datetime.now()
            logger.warning(f"Circuit breaker opened due to {stats.consecutive_failures} consecutive failures")

    def _maybe_reset_circuit_breakers(self) -> None:
        """Reset circuit breakers that have timed out"""
        now = datetime.now()
        for handler_key, stats in self.handler_stats.items():
            if (stats.circuit_breaker_open and
                stats.circuit_breaker_open_time and
                now - stats.circuit_breaker_open_time > self.config.circuit_breaker_timeout):
                stats.circuit_breaker_open = False
                stats.circuit_breaker_open_time = None
                logger.info(f"Circuit breaker reset for handler {handler_key}")

    def _log_queue_health(self) -> None:
        """Log queue health metrics"""
        queue_size = self.event_queue.qsize()
        max_size = self.config.max_queue_size
        utilization = (queue_size / max_size) * 100 if max_size > 0 else 0

        if utilization > 80:
            logger.warning(f"High queue utilization for user {self.user_id}: {utilization:.1f}% ({queue_size}/{max_size})")
        elif utilization > 50:
            logger.info(f"Queue utilization for user {self.user_id}: {utilization:.1f}% ({queue_size}/{max_size})")

    def get_stats(self) -> Dict[str, Any]:
        """Get monitoring statistics"""
        return {
            "user_id": self.user_id,
            "is_running": self.is_running,
            "processed_events": self._processed_events,
            "failed_events": self._failed_events,
            "queue_size": self.event_queue.qsize(),
            "max_queue_size": self.config.max_queue_size,
            "registered_handlers": {
                event_type.value: len(handlers)
                for event_type, handlers in self.handlers.items()
            },
            "handler_stats": {
                key: {
                    "total_calls": stats.total_calls,
                    "successful_calls": stats.successful_calls,
                    "failed_calls": stats.failed_calls,
                    "consecutive_failures": stats.consecutive_failures,
                    "success_rate": (stats.successful_calls / stats.total_calls * 100) if stats.total_calls > 0 else 0,
                    "circuit_breaker_open": stats.circuit_breaker_open
                }
                for key, stats in self.handler_stats.items()
            }
        }