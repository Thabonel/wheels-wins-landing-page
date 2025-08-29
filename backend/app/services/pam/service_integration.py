"""
Service Integration Layer - Phase 3 Communication Framework
Integrates all PAM services with the message bus for seamless communication
"""

import asyncio
import logging
from typing import Dict, List, Any, Optional
from datetime import datetime

from .message_bus import (
    ServiceMessageBus, ServiceMessage, MessageType, MessagePriority,
    get_message_bus
)

logger = logging.getLogger(__name__)

class PAMServiceIntegration:
    """Integrates PAM services with the communication framework"""
    
    def __init__(self):
        self.message_bus: Optional[ServiceMessageBus] = None
        self.service_name = "pam_integration"
        self.is_initialized = False
        
        # Service health tracking
        self.service_health = {
            "enhanced_orchestrator": {"status": "unknown", "last_check": None},
            "knowledge_service": {"status": "unknown", "last_check": None},
            "tts_service": {"status": "unknown", "last_check": None},
            "voice_streaming": {"status": "unknown", "last_check": None}
        }
        
        # Performance tracking
        self.request_metrics = {
            "total_requests": 0,
            "knowledge_requests": 0,
            "tts_requests": 0,
            "cross_service_calls": 0,
            "avg_response_time_ms": 0.0
        }
    
    async def initialize(self):
        """Initialize service integration"""
        try:
            # Get message bus
            self.message_bus = await get_message_bus()
            
            # Register this service
            self.message_bus.register_service(
                self.service_name,
                {
                    "type": "integration_layer",
                    "version": "1.0.0",
                    "capabilities": ["service_coordination", "health_monitoring", "performance_tracking"],
                    "status": "active"
                }
            )
            
            # Register message handlers
            await self._register_handlers()
            
            # Start health monitoring
            asyncio.create_task(self._monitor_service_health())
            
            self.is_initialized = True
            logger.info("✅ PAM Service Integration initialized")
            
        except Exception as e:
            logger.error(f"❌ Service Integration initialization failed: {e}")
            raise
    
    async def _register_handlers(self):
        """Register message handlers"""
        
        # Health check handler
        self.message_bus.register_handler(
            self.service_name,
            MessageType.SERVICE_HEALTH_CHECK,
            self._handle_health_check
        )
        
        # Service status update handler
        self.message_bus.register_handler(
            self.service_name,
            MessageType.SERVICE_STATUS_UPDATE,
            self._handle_status_update
        )
        
        # Performance metric handler
        self.message_bus.register_handler(
            self.service_name,
            MessageType.PERFORMANCE_METRIC,
            self._handle_performance_metric
        )
        
        # Error notification handler
        self.message_bus.register_handler(
            self.service_name,
            MessageType.ERROR_NOTIFICATION,
            self._handle_error_notification
        )
        
        # Service discovery handler
        self.message_bus.register_handler(
            self.service_name,
            MessageType.SERVICE_DISCOVERY,
            self._handle_service_discovery
        )
    
    async def _handle_health_check(self, message: ServiceMessage) -> Optional[ServiceMessage]:
        """Handle health check requests"""
        source_service = message.source_service
        
        # Update service health
        if source_service in self.service_health:
            self.service_health[source_service]["status"] = "healthy"
            self.service_health[source_service]["last_check"] = datetime.utcnow()
        
        # Respond with our health status
        return ServiceMessage(
            id=f"health_response_{message.id}",
            type=MessageType.SERVICE_STATUS_UPDATE,
            source_service=self.service_name,
            target_service=source_service,
            priority=MessagePriority.NORMAL,
            timestamp=datetime.utcnow(),
            payload={
                "status": "healthy",
                "service": self.service_name,
                "metrics": self.request_metrics,
                "uptime_seconds": (datetime.utcnow() - datetime.utcnow()).total_seconds()
            },
            correlation_id=message.id
        )
    
    async def _handle_status_update(self, message: ServiceMessage) -> Optional[ServiceMessage]:
        """Handle service status updates"""
        source_service = message.source_service
        status = message.payload.get("status", "unknown")
        
        # Update service health
        if source_service in self.service_health:
            self.service_health[source_service]["status"] = status
            self.service_health[source_service]["last_check"] = datetime.utcnow()
        
        logger.info(f"📊 Service status update: {source_service} = {status}")
        return None
    
    async def _handle_performance_metric(self, message: ServiceMessage) -> Optional[ServiceMessage]:
        """Handle performance metrics from services"""
        source_service = message.source_service
        metric_data = message.payload
        
        # Log performance data
        logger.info(f"📈 Performance metric from {source_service}: {metric_data}")
        
        # Could aggregate metrics here for system-wide monitoring
        return None
    
    async def _handle_error_notification(self, message: ServiceMessage) -> Optional[ServiceMessage]:
        """Handle error notifications"""
        source_service = message.source_service
        error_data = message.payload
        
        logger.error(f"❌ Error notification from {source_service}: {error_data}")
        
        # Update service health if it's an error
        if source_service in self.service_health:
            self.service_health[source_service]["status"] = "error"
            self.service_health[source_service]["last_check"] = datetime.utcnow()
        
        return None
    
    async def _handle_service_discovery(self, message: ServiceMessage) -> Optional[ServiceMessage]:
        """Handle service discovery events"""
        service_name = message.payload.get("service_name")
        action = message.payload.get("action")
        
        logger.info(f"🔍 Service discovery: {service_name} {action}")
        return None
    
    async def _monitor_service_health(self):
        """Monitor service health periodically"""
        while self.is_initialized:
            try:
                await asyncio.sleep(30)  # Check every 30 seconds
                
                # Send health check to all services
                await self.message_bus.send_message(
                    MessageType.SERVICE_HEALTH_CHECK,
                    self.service_name,
                    {"timestamp": datetime.utcnow().isoformat()},
                    target_service=None,  # Broadcast
                    priority=MessagePriority.LOW
                )
                
            except Exception as e:
                logger.error(f"❌ Health monitoring error: {e}")
    
    async def coordinate_knowledge_request(
        self,
        user_id: str,
        query: str,
        user_location: Optional[tuple] = None,
        context: str = "general"
    ) -> Dict[str, Any]:
        """Coordinate knowledge service request"""
        
        if not self.message_bus:
            raise Exception("Message bus not initialized")
        
        self.request_metrics["total_requests"] += 1
        self.request_metrics["knowledge_requests"] += 1
        self.request_metrics["cross_service_calls"] += 1
        
        start_time = datetime.utcnow()
        
        try:
            # Send knowledge request
            message_id = await self.message_bus.send_message(
                MessageType.KNOWLEDGE_REQUEST,
                self.service_name,
                {
                    "user_id": user_id,
                    "query": query,
                    "user_location": user_location,
                    "context": context,
                    "request_time": start_time.isoformat()
                },
                target_service="knowledge_service",
                priority=MessagePriority.HIGH,
                ttl_seconds=10  # Quick timeout for knowledge requests
            )
            
            # For demo purposes, simulate response
            # In production, this would wait for actual response
            response_time = (datetime.utcnow() - start_time).total_seconds() * 1000
            self._update_response_time(response_time)
            
            return {
                "success": True,
                "message_id": message_id,
                "processing_time_ms": response_time
            }
            
        except Exception as e:
            logger.error(f"❌ Knowledge request coordination failed: {e}")
            return {
                "success": False,
                "error": str(e)
            }
    
    async def coordinate_tts_request(
        self,
        user_id: str,
        text: str,
        context: str = "general_conversation",
        voice_preferences: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Coordinate TTS service request"""
        
        if not self.message_bus:
            raise Exception("Message bus not initialized")
        
        self.request_metrics["total_requests"] += 1
        self.request_metrics["tts_requests"] += 1
        self.request_metrics["cross_service_calls"] += 1
        
        start_time = datetime.utcnow()
        
        try:
            # Send TTS request
            message_id = await self.message_bus.send_message(
                MessageType.TTS_REQUEST,
                self.service_name,
                {
                    "user_id": user_id,
                    "text": text,
                    "context": context,
                    "voice_preferences": voice_preferences or {},
                    "request_time": start_time.isoformat()
                },
                target_service="tts_service",
                priority=MessagePriority.HIGH,
                ttl_seconds=15  # Reasonable timeout for TTS
            )
            
            # For demo purposes, simulate response
            response_time = (datetime.utcnow() - start_time).total_seconds() * 1000
            self._update_response_time(response_time)
            
            return {
                "success": True,
                "message_id": message_id,
                "processing_time_ms": response_time
            }
            
        except Exception as e:
            logger.error(f"❌ TTS request coordination failed: {e}")
            return {
                "success": False,
                "error": str(e)
            }
    
    async def coordinate_context_update(
        self,
        user_id: str,
        session_id: str,
        context_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Coordinate context updates across services"""
        
        if not self.message_bus:
            raise Exception("Message bus not initialized")
        
        self.request_metrics["cross_service_calls"] += 1
        
        try:
            # Broadcast context update
            message_id = await self.message_bus.send_message(
                MessageType.CONTEXT_UPDATE,
                self.service_name,
                {
                    "user_id": user_id,
                    "session_id": session_id,
                    "context_data": context_data,
                    "timestamp": datetime.utcnow().isoformat()
                },
                target_service=None,  # Broadcast to all services
                priority=MessagePriority.NORMAL
            )
            
            return {
                "success": True,
                "message_id": message_id
            }
            
        except Exception as e:
            logger.error(f"❌ Context update coordination failed: {e}")
            return {
                "success": False,
                "error": str(e)
            }
    
    def _update_response_time(self, response_time_ms: float):
        """Update average response time metric"""
        total_requests = self.request_metrics["total_requests"]
        if total_requests == 1:
            self.request_metrics["avg_response_time_ms"] = response_time_ms
        else:
            current_avg = self.request_metrics["avg_response_time_ms"]
            new_avg = ((current_avg * (total_requests - 1)) + response_time_ms) / total_requests
            self.request_metrics["avg_response_time_ms"] = new_avg
    
    def get_integration_status(self) -> Dict[str, Any]:
        """Get current integration status"""
        return {
            "integration_layer": {
                "initialized": self.is_initialized,
                "service_name": self.service_name,
                "message_bus_connected": self.message_bus is not None,
                "metrics": self.request_metrics
            },
            "service_health": self.service_health,
            "message_bus_status": self.message_bus.get_service_status() if self.message_bus else None
        }
    
    async def shutdown(self):
        """Shutdown service integration"""
        try:
            if self.message_bus:
                self.message_bus.unregister_service(self.service_name)
            
            self.is_initialized = False
            logger.info("✅ PAM Service Integration shutdown completed")
            
        except Exception as e:
            logger.error(f"❌ Service Integration shutdown error: {e}")

# Global service integration instance
service_integration = PAMServiceIntegration()

async def get_service_integration() -> PAMServiceIntegration:
    """Get service integration instance"""
    if not service_integration.is_initialized:
        await service_integration.initialize()
    return service_integration