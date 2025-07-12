"""
Cross-Service Message Bus - Phase 3 Communication Framework
Enables seamless communication between PAM services with event-driven architecture
"""

import asyncio
import json
from typing import Dict, List, Any, Optional, Callable, Awaitable
from datetime import datetime
from dataclasses import dataclass, asdict
from enum import Enum
import logging
import uuid

logger = logging.getLogger(__name__)

class MessageType(Enum):
    """Types of inter-service messages"""
    SERVICE_HEALTH_CHECK = "service_health_check"
    SERVICE_STATUS_UPDATE = "service_status_update"
    KNOWLEDGE_REQUEST = "knowledge_request"
    KNOWLEDGE_RESPONSE = "knowledge_response"
    TTS_REQUEST = "tts_request"
    TTS_RESPONSE = "tts_response"
    VOICE_STREAMING_REQUEST = "voice_streaming_request"
    CONTEXT_UPDATE = "context_update"
    ERROR_NOTIFICATION = "error_notification"
    PERFORMANCE_METRIC = "performance_metric"
    USER_INTERACTION = "user_interaction"
    SERVICE_DISCOVERY = "service_discovery"

class MessagePriority(Enum):
    """Message priority levels"""
    LOW = "low"
    NORMAL = "normal"
    HIGH = "high"
    URGENT = "urgent"

@dataclass
class ServiceMessage:
    """Inter-service message structure"""
    id: str
    type: MessageType
    source_service: str
    target_service: Optional[str]  # None for broadcast
    priority: MessagePriority
    timestamp: datetime
    payload: Dict[str, Any]
    correlation_id: Optional[str] = None
    ttl_seconds: int = 300  # 5 minutes default TTL
    retry_count: int = 0
    max_retries: int = 3

class ServiceMessageBus:
    """Event-driven message bus for inter-service communication"""
    
    def __init__(self):
        # Service registry
        self.registered_services: Dict[str, Dict[str, Any]] = {}
        
        # Message handlers by service and message type
        self.message_handlers: Dict[str, Dict[MessageType, Callable]] = {}
        
        # Message queue for asynchronous processing
        self.message_queue: asyncio.Queue = asyncio.Queue()
        
        # In-flight messages for tracking and retry
        self.in_flight_messages: Dict[str, ServiceMessage] = {}
        
        # Message history for debugging (limited size)
        self.message_history: List[ServiceMessage] = []
        self.max_history_size = 1000
        
        # Performance metrics
        self.metrics = {
            "total_messages": 0,
            "successful_deliveries": 0,
            "failed_deliveries": 0,
            "retry_attempts": 0,
            "avg_delivery_time_ms": 0.0
        }
        
        # Background processing task
        self._processing_task = None
        self._running = False
    
    async def start(self):
        """Start the message bus"""
        if not self._running:
            self._running = True
            self._processing_task = asyncio.create_task(self._process_messages())
            logger.info("🚌 PAM Message Bus started")
    
    async def stop(self):
        """Stop the message bus"""
        if self._running:
            self._running = False
            if self._processing_task:
                self._processing_task.cancel()
                try:
                    await self._processing_task
                except asyncio.CancelledError:
                    pass
            logger.info("🛑 PAM Message Bus stopped")
    
    def register_service(
        self,
        service_name: str,
        service_info: Dict[str, Any]
    ):
        """Register a service with the message bus"""
        self.registered_services[service_name] = {
            "info": service_info,
            "registered_at": datetime.utcnow(),
            "last_seen": datetime.utcnow(),
            "status": "active"
        }
        
        if service_name not in self.message_handlers:
            self.message_handlers[service_name] = {}
        
        logger.info(f"📋 Service registered: {service_name}")
        
        # Broadcast service discovery
        asyncio.create_task(self._broadcast_service_discovery(service_name, "registered"))
    
    def unregister_service(self, service_name: str):
        """Unregister a service from the message bus"""
        if service_name in self.registered_services:
            del self.registered_services[service_name]
        
        if service_name in self.message_handlers:
            del self.message_handlers[service_name]
        
        logger.info(f"📤 Service unregistered: {service_name}")
        
        # Broadcast service discovery
        asyncio.create_task(self._broadcast_service_discovery(service_name, "unregistered"))
    
    def register_handler(
        self,
        service_name: str,
        message_type: MessageType,
        handler: Callable[[ServiceMessage], Awaitable[Optional[ServiceMessage]]]
    ):
        """Register a message handler for a service"""
        if service_name not in self.message_handlers:
            self.message_handlers[service_name] = {}
        
        self.message_handlers[service_name][message_type] = handler
        logger.info(f"📬 Handler registered: {service_name} -> {message_type.value}")
    
    async def send_message(
        self,
        message_type: MessageType,
        source_service: str,
        payload: Dict[str, Any],
        target_service: Optional[str] = None,
        priority: MessagePriority = MessagePriority.NORMAL,
        correlation_id: Optional[str] = None,
        ttl_seconds: int = 300
    ) -> str:
        """Send a message through the bus"""
        
        message = ServiceMessage(
            id=str(uuid.uuid4()),
            type=message_type,
            source_service=source_service,
            target_service=target_service,
            priority=priority,
            timestamp=datetime.utcnow(),
            payload=payload,
            correlation_id=correlation_id,
            ttl_seconds=ttl_seconds
        )
        
        # Add to queue based on priority
        await self._queue_message(message)
        
        # Track in-flight message
        self.in_flight_messages[message.id] = message
        
        self.metrics["total_messages"] += 1
        
        logger.debug(f"📨 Message queued: {message.id} ({message_type.value})")
        return message.id
    
    async def _queue_message(self, message: ServiceMessage):
        """Queue message based on priority"""
        # For now, simple FIFO queue - could implement priority queue
        await self.message_queue.put(message)
    
    async def _process_messages(self):
        """Background task to process queued messages"""
        while self._running:
            try:
                # Wait for message with timeout
                message = await asyncio.wait_for(
                    self.message_queue.get(),
                    timeout=1.0
                )
                
                await self._deliver_message(message)
                
            except asyncio.TimeoutError:
                # Continue processing, allows for graceful shutdown
                continue
            except Exception as e:
                logger.error(f"❌ Message processing error: {e}")
    
    async def _deliver_message(self, message: ServiceMessage):
        """Deliver message to target service(s)"""
        start_time = datetime.utcnow()
        
        try:
            # Check TTL
            age_seconds = (datetime.utcnow() - message.timestamp).total_seconds()
            if age_seconds > message.ttl_seconds:
                logger.warning(f"⏰ Message expired: {message.id}")
                self._cleanup_message(message.id, success=False)
                return
            
            # Determine target services
            target_services = []
            if message.target_service:
                if message.target_service in self.message_handlers:
                    target_services = [message.target_service]
                else:
                    logger.warning(f"⚠️ Target service not found: {message.target_service}")
            else:
                # Broadcast to all services except source
                target_services = [
                    service for service in self.message_handlers.keys()
                    if service != message.source_service
                ]
            
            # Deliver to target services
            delivery_tasks = []
            for target_service in target_services:
                if message.type in self.message_handlers[target_service]:
                    handler = self.message_handlers[target_service][message.type]
                    task = asyncio.create_task(
                        self._call_handler(handler, message, target_service)
                    )
                    delivery_tasks.append(task)
            
            # Wait for all deliveries
            if delivery_tasks:
                await asyncio.gather(*delivery_tasks, return_exceptions=True)
                self.metrics["successful_deliveries"] += 1
            else:
                logger.debug(f"📭 No handlers for message: {message.type.value}")
            
            # Calculate delivery time
            delivery_time = (datetime.utcnow() - start_time).total_seconds() * 1000
            self._update_delivery_metrics(delivery_time)
            
            # Cleanup
            self._cleanup_message(message.id, success=True)
            
        except Exception as e:
            logger.error(f"❌ Message delivery failed: {message.id} - {e}")
            await self._handle_delivery_failure(message)
    
    async def _call_handler(
        self,
        handler: Callable,
        message: ServiceMessage,
        target_service: str
    ):
        """Call message handler safely"""
        try:
            # Update service last seen
            if target_service in self.registered_services:
                self.registered_services[target_service]["last_seen"] = datetime.utcnow()
            
            # Call handler
            response = await handler(message)
            
            # Handle response if any
            if response:
                await self._queue_message(response)
            
        except Exception as e:
            logger.error(f"❌ Handler error in {target_service}: {e}")
            
            # Send error notification back to source
            error_message = ServiceMessage(
                id=str(uuid.uuid4()),
                type=MessageType.ERROR_NOTIFICATION,
                source_service="message_bus",
                target_service=message.source_service,
                priority=MessagePriority.HIGH,
                timestamp=datetime.utcnow(),
                payload={
                    "original_message_id": message.id,
                    "error": str(e),
                    "failed_service": target_service
                }
            )
            await self._queue_message(error_message)
    
    async def _handle_delivery_failure(self, message: ServiceMessage):
        """Handle message delivery failure with retry logic"""
        message.retry_count += 1
        self.metrics["retry_attempts"] += 1
        
        if message.retry_count <= message.max_retries:
            # Exponential backoff
            delay = min(2 ** message.retry_count, 30)  # Max 30 seconds
            await asyncio.sleep(delay)
            
            logger.info(f"🔄 Retrying message: {message.id} (attempt {message.retry_count})")
            await self._queue_message(message)
        else:
            logger.error(f"❌ Message failed after {message.max_retries} retries: {message.id}")
            self.metrics["failed_deliveries"] += 1
            self._cleanup_message(message.id, success=False)
    
    def _cleanup_message(self, message_id: str, success: bool):
        """Clean up processed message"""
        if message_id in self.in_flight_messages:
            message = self.in_flight_messages[message_id]
            
            # Add to history
            self.message_history.append(message)
            if len(self.message_history) > self.max_history_size:
                self.message_history = self.message_history[-self.max_history_size:]
            
            # Remove from in-flight
            del self.in_flight_messages[message_id]
    
    def _update_delivery_metrics(self, delivery_time_ms: float):
        """Update delivery performance metrics"""
        total_deliveries = self.metrics["successful_deliveries"]
        if total_deliveries == 1:
            self.metrics["avg_delivery_time_ms"] = delivery_time_ms
        else:
            current_avg = self.metrics["avg_delivery_time_ms"]
            new_avg = ((current_avg * (total_deliveries - 1)) + delivery_time_ms) / total_deliveries
            self.metrics["avg_delivery_time_ms"] = new_avg
    
    async def _broadcast_service_discovery(self, service_name: str, action: str):
        """Broadcast service discovery event"""
        discovery_message = ServiceMessage(
            id=str(uuid.uuid4()),
            type=MessageType.SERVICE_DISCOVERY,
            source_service="message_bus",
            target_service=None,  # Broadcast
            priority=MessagePriority.NORMAL,
            timestamp=datetime.utcnow(),
            payload={
                "service_name": service_name,
                "action": action,
                "services": list(self.registered_services.keys())
            }
        )
        await self._queue_message(discovery_message)
    
    def get_service_status(self) -> Dict[str, Any]:
        """Get current status of all services"""
        status = {
            "message_bus": {
                "running": self._running,
                "registered_services": len(self.registered_services),
                "in_flight_messages": len(self.in_flight_messages),
                "queue_size": self.message_queue.qsize(),
                "metrics": self.metrics
            },
            "services": {}
        }
        
        for service_name, service_info in self.registered_services.items():
            last_seen = service_info["last_seen"]
            seconds_since_seen = (datetime.utcnow() - last_seen).total_seconds()
            
            status["services"][service_name] = {
                "status": "active" if seconds_since_seen < 60 else "inactive",
                "last_seen": last_seen.isoformat(),
                "seconds_since_seen": int(seconds_since_seen),
                "handlers": list(self.message_handlers.get(service_name, {}).keys())
            }
        
        return status
    
    def get_message_history(
        self,
        limit: int = 50,
        message_type: Optional[MessageType] = None,
        service: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """Get message history for debugging"""
        
        filtered_history = self.message_history
        
        # Filter by message type
        if message_type:
            filtered_history = [m for m in filtered_history if m.type == message_type]
        
        # Filter by service
        if service:
            filtered_history = [
                m for m in filtered_history 
                if m.source_service == service or m.target_service == service
            ]
        
        # Return recent messages
        recent_messages = filtered_history[-limit:]
        
        return [
            {
                "id": msg.id,
                "type": msg.type.value,
                "source": msg.source_service,
                "target": msg.target_service,
                "timestamp": msg.timestamp.isoformat(),
                "priority": msg.priority.value,
                "retry_count": msg.retry_count,
                "payload_size": len(json.dumps(msg.payload))
            }
            for msg in recent_messages
        ]

# Global message bus instance
message_bus = ServiceMessageBus()

async def get_message_bus() -> ServiceMessageBus:
    """Get message bus instance"""
    if not message_bus._running:
        await message_bus.start()
    return message_bus