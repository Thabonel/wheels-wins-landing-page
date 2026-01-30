import asyncio
import logging
from typing import Dict, Callable, List
from datetime import datetime
from app.services.pam.monitoring.event_types import EventType, BaseEvent

logger = logging.getLogger(__name__)

class EventMonitor:
    """Always-on event monitoring for proactive PAM actions"""

    def __init__(self, user_id: str):
        self.user_id = user_id
        self.handlers: Dict[EventType, List[Callable]] = {}
        self.is_running = False
        self.event_queue = asyncio.Queue()

    def register_handler(self, event_type: EventType, handler: Callable):
        """Register handler for specific event type"""
        if event_type not in self.handlers:
            self.handlers[event_type] = []
        self.handlers[event_type].append(handler)
        logger.info(f"Registered handler for {event_type} for user {self.user_id}")

    def trigger_event(self, event: BaseEvent):
        """Trigger event and execute all registered handlers (synchronous version for tests)"""
        if event.type in self.handlers:
            for handler in self.handlers[event.type]:
                try:
                    if asyncio.iscoroutinefunction(handler):
                        # For async handlers, we need to run them in an event loop
                        try:
                            loop = asyncio.get_event_loop()
                            if loop.is_running():
                                asyncio.create_task(handler(event))
                            else:
                                loop.run_until_complete(handler(event))
                        except RuntimeError:
                            # No event loop running, create a new one
                            asyncio.run(handler(event))
                    else:
                        handler(event)
                    logger.info(f"Handled event {event.type} for user {self.user_id}")
                except Exception as e:
                    logger.error(f"Error handling event {event.type}: {e}")

    async def trigger_event_async(self, event: BaseEvent):
        """Trigger event and execute all registered handlers (async version)"""
        if event.type in self.handlers:
            for handler in self.handlers[event.type]:
                try:
                    await handler(event) if asyncio.iscoroutinefunction(handler) else handler(event)
                    logger.info(f"Handled event {event.type} for user {self.user_id}")
                except Exception as e:
                    logger.error(f"Error handling event {event.type}: {e}")

    async def start_monitoring(self):
        """Start the event monitoring loop"""
        self.is_running = True
        logger.info(f"Starting event monitoring for user {self.user_id}")

        while self.is_running:
            try:
                # Wait for events from queue with timeout
                event = await asyncio.wait_for(self.event_queue.get(), timeout=1.0)
                await self.trigger_event_async(event)
            except asyncio.TimeoutError:
                continue  # Keep monitoring
            except Exception as e:
                logger.error(f"Event monitoring error for user {self.user_id}: {e}")

    def stop_monitoring(self):
        """Stop the event monitoring loop"""
        self.is_running = False
        logger.info(f"Stopped event monitoring for user {self.user_id}")