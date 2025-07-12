"""
Enhanced PAM Orchestrator - Phase 3 Integration Framework
Comprehensive service orchestration with knowledge base, TTS, and advanced capabilities
"""

import asyncio
import uuid
from typing import Dict, List, Any, Optional, Tuple, Union
from datetime import datetime, timedelta
from dataclasses import dataclass
from enum import Enum
import logging

from app.models.domain.pam import (
    PamMemory, PamIntent, PamContext, 
    PamResponse, IntentType, MemoryType
)
from app.services.database import get_database_service
from app.services.cache import cache_service
from app.services.pam.orchestrator import PamOrchestrator
from app.services.pam.context_manager import ContextManager
from app.observability import observe_agent, observe_llm_call

logger = logging.getLogger(__name__)

class ServiceStatus(Enum):
    """Service availability status"""
    HEALTHY = "healthy"
    DEGRADED = "degraded"
    UNAVAILABLE = "unavailable"
    INITIALIZING = "initializing"

class ResponseMode(Enum):
    """PAM response modes"""
    TEXT_ONLY = "text_only"
    VOICE_ONLY = "voice_only"
    MULTIMODAL = "multimodal"
    ADAPTIVE = "adaptive"

@dataclass
class ServiceCapability:
    """Represents a service capability"""
    name: str
    status: ServiceStatus
    confidence: float
    last_check: datetime
    error_message: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None

@dataclass
class EnhancedPamContext:
    """Enhanced context with all service capabilities"""
    base_context: PamContext
    knowledge_available: bool
    tts_available: bool
    voice_streaming_active: bool
    user_location: Optional[Tuple[float, float]]
    preferred_response_mode: ResponseMode
    service_capabilities: Dict[str, ServiceCapability]
    conversation_mode: str  # "text", "voice", "mixed"
    quality_requirements: Dict[str, float]

class EnhancedPamOrchestrator:
    """Enhanced PAM orchestrator with comprehensive service integration"""
    
    def __init__(self):
        # Base orchestrator
        self.base_orchestrator = PamOrchestrator()
        
        # Service integrations
        self.knowledge_service = None
        self.tts_service = None
        self.voice_streaming_manager = None
        
        # Capability tracking
        self.service_capabilities: Dict[str, ServiceCapability] = {}
        self.is_initialized = False
        
        # Performance tracking
        self.performance_metrics = {
            "total_requests": 0,
            "successful_responses": 0,
            "avg_response_time_ms": 0.0,
            "knowledge_enhanced_responses": 0,
            "voice_responses": 0,
            "multimodal_responses": 0,
            "service_fallbacks": 0
        }
        
        # Configuration
        self.config = {
            "max_response_time_ms": 5000,
            "knowledge_timeout_ms": 3000,
            "tts_timeout_ms": 8000,
            "auto_fallback": True,
            "quality_monitoring": True
        }
    
    async def initialize(self):
        """Initialize enhanced orchestrator and all services"""
        try:
            logger.info("🚀 Initializing Enhanced PAM Orchestrator...")
            
            # Initialize base orchestrator
            await self.base_orchestrator.initialize()
            
            # Initialize knowledge service
            await self._initialize_knowledge_service()
            
            # Initialize TTS service
            await self._initialize_tts_service()
            
            # Initialize voice streaming
            await self._initialize_voice_streaming()
            
            # Assess initial capabilities
            await self._assess_service_capabilities()
            
            self.is_initialized = True
            logger.info("✅ Enhanced PAM Orchestrator initialized successfully")
            
            # Log available capabilities
            available_services = [name for name, cap in self.service_capabilities.items() 
                                if cap.status == ServiceStatus.HEALTHY]
            logger.info(f"🎯 Available services: {', '.join(available_services)}")
            
        except Exception as e:
            logger.error(f"❌ Enhanced PAM Orchestrator initialization failed: {e}")
            raise
    
    async def _initialize_knowledge_service(self):
        """Initialize knowledge service integration"""
        try:
            from app.tools.knowledge_tool import knowledge_tool
            
            if knowledge_tool.is_initialized:
                self.knowledge_service = knowledge_tool
                self.service_capabilities["knowledge"] = ServiceCapability(
                    name="knowledge",
                    status=ServiceStatus.HEALTHY,
                    confidence=1.0,
                    last_check=datetime.utcnow()
                )
                logger.info("✅ Knowledge service integrated")
            else:
                logger.warning("⚠️ Knowledge service not available")
                self.service_capabilities["knowledge"] = ServiceCapability(
                    name="knowledge",
                    status=ServiceStatus.UNAVAILABLE,
                    confidence=0.0,
                    last_check=datetime.utcnow(),
                    error_message="Knowledge tool not initialized"
                )
        except ImportError as e:
            logger.warning(f"⚠️ Knowledge service import failed: {e}")
            self.service_capabilities["knowledge"] = ServiceCapability(
                name="knowledge",
                status=ServiceStatus.UNAVAILABLE,
                confidence=0.0,
                last_check=datetime.utcnow(),
                error_message=str(e)
            )
    
    async def _initialize_tts_service(self):
        """Initialize TTS service integration"""
        try:
            from app.services.tts.tts_service import tts_service
            
            if tts_service.is_initialized:
                self.tts_service = tts_service
                self.service_capabilities["tts"] = ServiceCapability(
                    name="tts",
                    status=ServiceStatus.HEALTHY,
                    confidence=1.0,
                    last_check=datetime.utcnow()
                )
                logger.info("✅ TTS service integrated")
            else:
                logger.warning("⚠️ TTS service not available")
                self.service_capabilities["tts"] = ServiceCapability(
                    name="tts",
                    status=ServiceStatus.UNAVAILABLE,
                    confidence=0.0,
                    last_check=datetime.utcnow(),
                    error_message="TTS service not initialized"
                )
        except ImportError as e:
            logger.warning(f"⚠️ TTS service import failed: {e}")
            self.service_capabilities["tts"] = ServiceCapability(
                name="tts",
                status=ServiceStatus.UNAVAILABLE,
                confidence=0.0,
                last_check=datetime.utcnow(),
                error_message=str(e)
            )
    
    async def _initialize_voice_streaming(self):
        """Initialize voice streaming integration"""
        try:
            # Voice streaming is managed separately through WebSocket endpoints
            # We'll track its availability through health checks
            self.service_capabilities["voice_streaming"] = ServiceCapability(
                name="voice_streaming",
                status=ServiceStatus.HEALTHY,  # Assume available if endpoints exist
                confidence=0.9,
                last_check=datetime.utcnow()
            )
            logger.info("✅ Voice streaming capability registered")
        except Exception as e:
            logger.warning(f"⚠️ Voice streaming setup failed: {e}")
            self.service_capabilities["voice_streaming"] = ServiceCapability(
                name="voice_streaming",
                status=ServiceStatus.UNAVAILABLE,
                confidence=0.0,
                last_check=datetime.utcnow(),
                error_message=str(e)
            )
    
    @observe_agent(name="enhanced_pam_process", metadata={"agent_type": "enhanced_pam"})
    async def process_message(
        self,
        user_id: str,
        message: str,
        session_id: str = None,
        context: Dict[str, Any] = None,
        response_mode: ResponseMode = ResponseMode.ADAPTIVE,
        user_location: Optional[Tuple[float, float]] = None
    ) -> Dict[str, Any]:
        """Enhanced message processing with all service integrations"""
        
        start_time = datetime.utcnow()
        self.performance_metrics["total_requests"] += 1
        
        try:
            # Assess current service capabilities
            await self._assess_service_capabilities()
            
            # Build enhanced context
            enhanced_context = await self._build_enhanced_context(
                user_id, session_id, context, response_mode, user_location
            )
            
            # Process through base orchestrator first
            base_response = await self.base_orchestrator.process_message(
                user_id, message, session_id, context
            )
            
            # Enhance response with available services
            enhanced_response = await self._enhance_response(
                message, base_response, enhanced_context
            )
            
            # Update performance metrics
            processing_time = (datetime.utcnow() - start_time).total_seconds() * 1000
            self._update_performance_metrics(enhanced_response, processing_time)
            
            # Return comprehensive response
            return {
                "content": enhanced_response["content"],
                "confidence": enhanced_response["confidence"],
                "response_mode": enhanced_response.get("response_mode", response_mode.value),
                "audio_data": enhanced_response.get("audio_data"),
                "knowledge_enhanced": enhanced_response.get("knowledge_enhanced", False),
                "voice_enabled": enhanced_response.get("voice_enabled", False),
                "suggestions": enhanced_response.get("suggestions", []),
                "actions": enhanced_response.get("actions", []),
                "processing_time_ms": int(processing_time),
                "service_status": self._get_service_status_summary(),
                "capabilities_used": enhanced_response.get("capabilities_used", [])
            }
            
        except Exception as e:
            logger.error(f"❌ Enhanced message processing failed: {e}")
            self.performance_metrics["service_fallbacks"] += 1
            
            # Fallback to base orchestrator
            try:
                fallback_response = await self.base_orchestrator.process_message(
                    user_id, message, session_id, context
                )
                
                return {
                    "content": fallback_response.content,
                    "confidence": fallback_response.confidence * 0.7,  # Reduced confidence
                    "response_mode": "text_only",
                    "error": "Some services unavailable, using fallback response",
                    "service_status": "degraded"
                }
                
            except Exception as fallback_error:
                logger.error(f"❌ Fallback processing also failed: {fallback_error}")
                
                return {
                    "content": "I apologize, but I'm experiencing technical difficulties. Please try again in a moment.",
                    "confidence": 0.1,
                    "response_mode": "text_only",
                    "error": str(e),
                    "service_status": "unavailable"
                }
    
    async def _build_enhanced_context(
        self,
        user_id: str,
        session_id: str,
        context: Dict[str, Any],
        response_mode: ResponseMode,
        user_location: Optional[Tuple[float, float]]
    ) -> EnhancedPamContext:
        """Build enhanced context with all available service information"""
        
        # Get base context from base orchestrator
        base_context = await self.base_orchestrator._get_enhanced_context(
            user_id, session_id, context
        )
        
        # Determine service availability
        knowledge_available = (
            self.service_capabilities.get("knowledge", {}).status == ServiceStatus.HEALTHY
        )
        tts_available = (
            self.service_capabilities.get("tts", {}).status == ServiceStatus.HEALTHY
        )
        voice_streaming_available = (
            self.service_capabilities.get("voice_streaming", {}).status == ServiceStatus.HEALTHY
        )
        
        # Determine conversation mode from context
        conversation_mode = context.get("input_type", "text") if context else "text"
        
        # Set quality requirements based on mode
        quality_requirements = {
            "response_time_ms": 3000 if conversation_mode == "voice" else 5000,
            "knowledge_depth": 0.8 if response_mode == ResponseMode.ADAPTIVE else 0.6,
            "voice_quality": 0.9 if tts_available else 0.0
        }
        
        return EnhancedPamContext(
            base_context=base_context,
            knowledge_available=knowledge_available,
            tts_available=tts_available,
            voice_streaming_active=voice_streaming_available and conversation_mode == "voice",
            user_location=user_location,
            preferred_response_mode=response_mode,
            service_capabilities=self.service_capabilities,
            conversation_mode=conversation_mode,
            quality_requirements=quality_requirements
        )
    
    async def _enhance_response(
        self,
        message: str,
        base_response: PamResponse,
        enhanced_context: EnhancedPamContext
    ) -> Dict[str, Any]:
        """Enhance base response with knowledge, TTS, and other services"""
        
        enhanced_response = {
            "content": base_response.content,
            "confidence": base_response.confidence,
            "suggestions": base_response.suggestions or [],
            "actions": base_response.actions or [],
            "capabilities_used": []
        }
        
        # Knowledge enhancement
        if enhanced_context.knowledge_available:
            try:
                knowledge_enhancement = await self._enhance_with_knowledge(
                    message, base_response.content, enhanced_context
                )
                
                if knowledge_enhancement.get("enhanced"):
                    enhanced_response["content"] = knowledge_enhancement["content"]
                    enhanced_response["knowledge_enhanced"] = True
                    enhanced_response["capabilities_used"].append("knowledge")
                    self.performance_metrics["knowledge_enhanced_responses"] += 1
                    
            except Exception as e:
                logger.warning(f"⚠️ Knowledge enhancement failed: {e}")
        
        # TTS enhancement
        if enhanced_context.tts_available and enhanced_context.preferred_response_mode != ResponseMode.TEXT_ONLY:
            try:
                tts_enhancement = await self._enhance_with_tts(
                    enhanced_response["content"], enhanced_context
                )
                
                if tts_enhancement:
                    enhanced_response["audio_data"] = tts_enhancement["audio_data"]
                    enhanced_response["voice_enabled"] = True
                    enhanced_response["capabilities_used"].append("tts")
                    self.performance_metrics["voice_responses"] += 1
                    
            except Exception as e:
                logger.warning(f"⚠️ TTS enhancement failed: {e}")
        
        # Determine final response mode
        if enhanced_response.get("knowledge_enhanced") and enhanced_response.get("voice_enabled"):
            enhanced_response["response_mode"] = "multimodal"
            self.performance_metrics["multimodal_responses"] += 1
        elif enhanced_response.get("voice_enabled"):
            enhanced_response["response_mode"] = "voice_only"
        else:
            enhanced_response["response_mode"] = "text_only"
        
        return enhanced_response
    
    async def _enhance_with_knowledge(
        self,
        message: str,
        base_content: str,
        enhanced_context: EnhancedPamContext
    ) -> Dict[str, Any]:
        """Enhance response with knowledge base information"""
        
        try:
            # Determine context from base context
            context_mapping = {
                "route_planning": "travel_planning",
                "campground_search": "travel_planning", 
                "budget_query": "budget_management",
                "expense_log": "budget_management",
                "general_chat": "general_conversation",
                "social_interaction": "social_interaction"
            }
            
            # Extract intent from base context conversation history
            recent_intents = enhanced_context.base_context.conversation_history[-3:] if enhanced_context.base_context.conversation_history else []
            context_key = "general_conversation"
            
            for intent in recent_intents:
                if intent in context_mapping:
                    context_key = context_mapping[intent]
                    break
            
            # Use knowledge service to enhance response
            if enhanced_context.user_location:
                knowledge_data = await asyncio.wait_for(
                    self.knowledge_service.get_local_recommendations(
                        user_location=enhanced_context.user_location,
                        query=message,
                        radius_km=20.0
                    ),
                    timeout=self.config["knowledge_timeout_ms"] / 1000
                )
            else:
                knowledge_data = await asyncio.wait_for(
                    self.knowledge_service.search_knowledge(
                        query=message,
                        max_results=3
                    ),
                    timeout=self.config["knowledge_timeout_ms"] / 1000
                )
            
            # Process knowledge data
            if knowledge_data and not knowledge_data.get("error"):
                enhanced_content = base_content
                
                # Add location recommendations
                if "recommendations" in knowledge_data:
                    recommendations = knowledge_data["recommendations"][:3]
                    if recommendations:
                        enhanced_content += "\n\n🎯 **Local Recommendations:**\n"
                        for i, rec in enumerate(recommendations, 1):
                            name = rec.get("name", "Location")
                            rating = rec.get("rating", "N/A")
                            enhanced_content += f"{i}. **{name}** (Rating: {rating})\n"
                
                # Add knowledge search results
                elif "results" in knowledge_data:
                    results = knowledge_data["results"][:2]
                    if results:
                        enhanced_content += "\n\n📚 **Additional Information:**\n"
                        for result in results:
                            content = result.get("content", "")[:150] + "..."
                            enhanced_content += f"• {content}\n"
                
                return {
                    "enhanced": True,
                    "content": enhanced_content
                }
            
            return {"enhanced": False, "content": base_content}
            
        except asyncio.TimeoutError:
            logger.warning("⚠️ Knowledge enhancement timed out")
            return {"enhanced": False, "content": base_content}
        except Exception as e:
            logger.error(f"❌ Knowledge enhancement error: {e}")
            return {"enhanced": False, "content": base_content}
    
    async def _enhance_with_tts(
        self,
        content: str,
        enhanced_context: EnhancedPamContext
    ) -> Optional[Dict[str, Any]]:
        """Enhance response with text-to-speech audio"""
        
        try:
            # Determine appropriate context for voice
            voice_context_mapping = {
                "voice": "voice_conversation",
                "text": "general_conversation",
                "mixed": "general_conversation"
            }
            
            voice_context = voice_context_mapping.get(
                enhanced_context.conversation_mode, 
                "general_conversation"
            )
            
            # Get user ID from base context
            user_id = enhanced_context.base_context.user_id
            
            # Synthesize speech
            tts_response = await asyncio.wait_for(
                self.tts_service.synthesize_for_pam(
                    text=content,
                    user_id=user_id,
                    context=voice_context,
                    stream=False
                ),
                timeout=self.config["tts_timeout_ms"] / 1000
            )
            
            if tts_response and tts_response.success:
                return {
                    "audio_data": tts_response.audio_data,
                    "generation_time_ms": tts_response.generation_time_ms,
                    "engine_used": tts_response.engine_used.value if tts_response.engine_used else "unknown"
                }
            
            return None
            
        except asyncio.TimeoutError:
            logger.warning("⚠️ TTS enhancement timed out")
            return None
        except Exception as e:
            logger.error(f"❌ TTS enhancement error: {e}")
            return None
    
    async def _assess_service_capabilities(self):
        """Assess current service capabilities and health"""
        
        # Knowledge service health check
        if self.knowledge_service:
            try:
                # Quick health check
                health = await self.knowledge_service.get_system_status()
                if health.get("initialized", False):
                    self.service_capabilities["knowledge"].status = ServiceStatus.HEALTHY
                    self.service_capabilities["knowledge"].confidence = 1.0
                else:
                    self.service_capabilities["knowledge"].status = ServiceStatus.DEGRADED
                    self.service_capabilities["knowledge"].confidence = 0.5
            except Exception as e:
                self.service_capabilities["knowledge"].status = ServiceStatus.UNAVAILABLE
                self.service_capabilities["knowledge"].error_message = str(e)
        
        # TTS service health check
        if self.tts_service:
            try:
                health = await self.tts_service.get_service_status()
                if health.get("initialized", False):
                    self.service_capabilities["tts"].status = ServiceStatus.HEALTHY
                    self.service_capabilities["tts"].confidence = 1.0
                else:
                    self.service_capabilities["tts"].status = ServiceStatus.DEGRADED
                    self.service_capabilities["tts"].confidence = 0.5
            except Exception as e:
                self.service_capabilities["tts"].status = ServiceStatus.UNAVAILABLE
                self.service_capabilities["tts"].error_message = str(e)
        
        # Update last check time
        for capability in self.service_capabilities.values():
            capability.last_check = datetime.utcnow()
    
    def _update_performance_metrics(self, response: Dict[str, Any], processing_time_ms: float):
        """Update performance metrics"""
        
        if "error" not in response:
            self.performance_metrics["successful_responses"] += 1
        
        # Update average response time
        total_requests = self.performance_metrics["total_requests"]
        current_avg = self.performance_metrics["avg_response_time_ms"]
        new_avg = ((current_avg * (total_requests - 1)) + processing_time_ms) / total_requests
        self.performance_metrics["avg_response_time_ms"] = new_avg
    
    def _get_service_status_summary(self) -> Dict[str, Any]:
        """Get summary of service statuses"""
        
        summary = {
            "overall_status": "healthy",
            "services": {},
            "capabilities_available": 0,
            "capabilities_total": len(self.service_capabilities)
        }
        
        healthy_count = 0
        for name, capability in self.service_capabilities.items():
            summary["services"][name] = {
                "status": capability.status.value,
                "confidence": capability.confidence,
                "last_check": capability.last_check.isoformat(),
                "error": capability.error_message
            }
            
            if capability.status == ServiceStatus.HEALTHY:
                healthy_count += 1
        
        summary["capabilities_available"] = healthy_count
        
        # Determine overall status
        if healthy_count == 0:
            summary["overall_status"] = "unavailable"
        elif healthy_count < len(self.service_capabilities):
            summary["overall_status"] = "degraded"
        
        return summary
    
    async def get_comprehensive_status(self) -> Dict[str, Any]:
        """Get comprehensive system status"""
        
        await self._assess_service_capabilities()
        
        return {
            "enhanced_orchestrator": {
                "initialized": self.is_initialized,
                "version": "3.0.0",
                "capabilities": self._get_service_status_summary()
            },
            "performance_metrics": self.performance_metrics,
            "configuration": self.config,
            "timestamp": datetime.utcnow().isoformat()
        }
    
    async def shutdown(self):
        """Shutdown enhanced orchestrator"""
        try:
            logger.info("🛑 Shutting down Enhanced PAM Orchestrator...")
            
            # Shutdown doesn't affect service instances (they're managed separately)
            self.is_initialized = False
            
            logger.info("✅ Enhanced PAM Orchestrator shutdown completed")
            
        except Exception as e:
            logger.error(f"❌ Enhanced PAM Orchestrator shutdown error: {e}")

# Global enhanced orchestrator instance
enhanced_orchestrator = EnhancedPamOrchestrator()

async def get_enhanced_orchestrator() -> EnhancedPamOrchestrator:
    """Get enhanced orchestrator instance"""
    if not enhanced_orchestrator.is_initialized:
        await enhanced_orchestrator.initialize()
    return enhanced_orchestrator