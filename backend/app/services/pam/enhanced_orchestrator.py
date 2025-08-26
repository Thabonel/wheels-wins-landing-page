"""
Enhanced PAM Orchestrator - AI Service Integration Framework
Comprehensive service orchestration with OpenAI integration, knowledge base, TTS, and advanced capabilities
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
from app.services.pam.context_manager import ContextManager
from app.services.ai.ai_orchestrator import AIOrchestrator
from app.services.ai.provider_interface import AIMessage, AIResponse
from app.observability import observe_agent, observe_llm_call
from app.services.pam.tools.tool_registry import get_tool_registry, initialize_tool_registry
from app.services.pam.tools.tool_capabilities import ToolCapability
import json

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
    """Enhanced PAM orchestrator with comprehensive AI service integration"""
    
    def __init__(self):
        # AI Orchestrator integration (supports OpenAI + Anthropic)
        self.ai_orchestrator: Optional[AIOrchestrator] = None
        
        # Provider management
        self.providers = {
            'openai': {
                'client': None,
                'health': False,
                'priority': 1,
                'fallback_order': 1,
                'last_health_check': None,
                'error_count': 0,
                'success_count': 0
            }
        }
        
        # Service integrations
        self.knowledge_service = None
        self.tts_manager = None  # Will be initialized in _initialize_tts_service
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
            "service_fallbacks": 0,
            "ai_service_calls": 0,
            "simple_responses": 0,
            "provider_health_checks": 0
        }
        
        # Configuration
        self.config = {
            "max_response_time_ms": 5000,
            "knowledge_timeout_ms": 3000,
            "tts_timeout_ms": 8000,
            "auto_fallback": True,
            "quality_monitoring": True,
            "provider_health_check_interval": 300,  # 5 minutes
            "max_provider_errors": 5
        }
    
    async def initialize(self):
        """Initialize enhanced orchestrator and all services"""
        try:
            logger.info("🚀 Initializing Enhanced PAM Orchestrator with AI Service...")
            
            # Initialize AI Service first (core dependency)
            logger.info("Step 1/6: Initializing AI Service...")
            await self._initialize_ai_service()
            logger.info("✅ Step 1/6: AI Service initialization completed")
            
            # Initialize tool registry for function calling
            logger.info("Step 2/6: Initializing Tool Registry...")
            await self._initialize_tool_registry()
            logger.info("✅ Step 2/6: Tool Registry initialization completed")
            
            # Initialize knowledge service
            logger.info("Step 3/6: Initializing Knowledge Service...")
            await self._initialize_knowledge_service()
            logger.info("✅ Step 3/6: Knowledge Service initialization completed")
            
            # Initialize TTS service
            logger.info("Step 4/6: Initializing TTS Service...")
            await self._initialize_tts_service()
            logger.info("✅ Step 4/6: TTS Service initialization completed")
            
            # Initialize voice streaming
            logger.info("Step 5/6: Initializing Voice Streaming...")
            await self._initialize_voice_streaming()
            logger.info("✅ Step 5/6: Voice Streaming initialization completed")
            
            # Assess initial capabilities
            logger.info("Step 6/6: Assessing Service Capabilities...")
            await self._assess_service_capabilities()
            logger.info("✅ Step 6/6: Service Capabilities assessment completed")
            
            self.is_initialized = True
            logger.info("✅ Enhanced PAM Orchestrator initialized successfully")
            
            # Log available capabilities
            available_services = [name for name, cap in self.service_capabilities.items() 
                                if cap.status == ServiceStatus.HEALTHY]
            logger.info(f"🎯 Available services: {', '.join(available_services)}")
            
        except Exception as e:
            logger.error(f"❌ Enhanced PAM Orchestrator initialization failed at step: {e}")
            logger.error(f"❌ Exception type: {type(e).__name__}")
            logger.error(f"❌ Exception details: {str(e)}")
            import traceback
            logger.error(f"❌ Full traceback: {traceback.format_exc()}")
            raise
    
    async def _initialize_ai_service(self):
        """Initialize AI Orchestrator with multiple provider support"""
        try:
            logger.info("🧠 Initializing AI Orchestrator (OpenAI + Anthropic)...")
            
            # Create new AI orchestrator instance
            logger.debug("Creating AI orchestrator instance...")
            self.ai_orchestrator = AIOrchestrator()
            logger.debug(f"AI orchestrator instance created: {self.ai_orchestrator}")
            
            # Initialize all configured providers
            logger.debug("Initializing AI providers...")
            await self.ai_orchestrator.initialize()
            logger.debug(f"AI orchestrator initialization completed")
            
            # Update provider status based on what initialized
            if self.ai_orchestrator.providers:
                logger.info(f"✅ AI Orchestrator initialized with {len(self.ai_orchestrator.providers)} providers")
                
                # Check which providers are available
                provider_names = [p.name for p in self.ai_orchestrator.providers]
                logger.info(f"Available AI providers: {provider_names}")
                
                # Update our provider tracking
                for provider in self.ai_orchestrator.providers:
                    if provider.name == 'openai':
                        self.providers['openai']['health'] = True
                        self.providers['openai']['last_health_check'] = datetime.utcnow()
                    elif provider.name == 'anthropic':
                        # Add Anthropic to our tracking if not present
                        if 'anthropic' not in self.providers:
                            self.providers['anthropic'] = {
                                'client': None,
                                'health': True,
                                'priority': 2,
                                'fallback_order': 2,
                                'last_health_check': datetime.utcnow(),
                                'error_count': 0,
                                'success_count': 0
                            }
                        else:
                            self.providers['anthropic']['health'] = True
                            self.providers['anthropic']['last_health_check'] = datetime.utcnow()
                    service_stats = {"error": "stats_unavailable"}
                
                # Register AI service capability
                self.service_capabilities["ai_service"] = ServiceCapability(
                    name="ai_service",
                    status=ServiceStatus.HEALTHY,
                    confidence=1.0,
                    last_check=datetime.utcnow(),
                    metadata=service_stats
                )
                
                logger.info("✅ AI Service integrated successfully")
            else:
                raise Exception("AI Service client not available after initialization")
                
        except Exception as e:
            logger.error(f"❌ AI Service initialization failed: {e}")
            logger.error(f"❌ AI service initialization exception type: {type(e).__name__}")
            import traceback
            logger.error(f"❌ AI service initialization traceback: {traceback.format_exc()}")
            
            self.providers['openai']['health'] = False
            self.providers['openai']['error_count'] += 1
            
            self.service_capabilities["ai_service"] = ServiceCapability(
                name="ai_service",
                status=ServiceStatus.UNAVAILABLE,
                confidence=0.0,
                last_check=datetime.utcnow(),
                error_message=str(e)
            )
            raise  # Re-raise to stop initialization
    
    async def _initialize_tool_registry(self):
        """Initialize tool registry for function calling"""
        try:
            logger.info("🔧 Initializing Tool Registry for function calling...")
            
            # Initialize the global tool registry
            logger.debug("Calling initialize_tool_registry()...")
            self.tool_registry = await initialize_tool_registry()
            logger.debug(f"Tool registry instance obtained: {self.tool_registry}")
            
            if self.tool_registry.is_initialized:
                logger.debug("Tool registry is initialized, getting stats...")
                try:
                    tool_stats = self.tool_registry.get_tool_stats()
                    logger.debug(f"Tool stats: {tool_stats}")
                    enabled_tools = tool_stats["registry_stats"]["enabled_tools"]
                    
                    self.service_capabilities["tool_registry"] = ServiceCapability(
                        name="tool_registry",
                        status=ServiceStatus.HEALTHY,
                        confidence=1.0,
                        last_check=datetime.utcnow(),
                        metadata={
                            "total_tools": tool_stats["registry_stats"]["total_tools"],
                            "enabled_tools": enabled_tools,
                            "capabilities": tool_stats["registry_stats"]["capabilities"]
                        }
                    )
                    logger.info(f"✅ Tool Registry initialized with {enabled_tools} tools")
                except Exception as stats_e:
                    logger.error(f"❌ Failed to get tool registry stats: {stats_e}")
                    raise Exception(f"Tool registry stats retrieval failed: {stats_e}")
            else:
                raise Exception(f"Tool registry failed to initialize - is_initialized: {getattr(self.tool_registry, 'is_initialized', 'unknown')}")
                
        except Exception as e:
            logger.error(f"❌ Tool Registry initialization failed: {e}")
            logger.error(f"❌ Tool registry exception type: {type(e).__name__}")
            import traceback
            logger.error(f"❌ Tool registry traceback: {traceback.format_exc()}")
            
            self.service_capabilities["tool_registry"] = ServiceCapability(
                name="tool_registry",
                status=ServiceStatus.UNAVAILABLE,
                confidence=0.0,
                last_check=datetime.utcnow(),
                error_message=str(e)
            )
            raise  # Re-raise to stop initialization
    
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
        """Initialize enhanced TTS service integration with multi-engine support"""
        try:
            from app.services.tts.tts_manager import get_tts_manager
            
            logger.info("🎤 Initializing enhanced TTS Manager...")
            self.tts_manager = get_tts_manager()
            
            # Initialize TTS engines if not already done
            if not self.tts_manager._engines_initialized:
                await self.tts_manager._initialize_engines()
            
            if self.tts_manager.is_initialized:
                # Get TTS health status
                tts_health = self.tts_manager.get_health_status()
                available_engines = tts_health["system_health"]["available_engines"]
                
                if available_engines > 0:
                    self.service_capabilities["tts"] = ServiceCapability(
                        name="tts",
                        status=ServiceStatus.HEALTHY,
                        confidence=min(1.0, available_engines / 3.0),  # Full confidence with all 3 engines
                        last_check=datetime.utcnow(),
                        metadata=tts_health
                    )
                    logger.info(f"✅ Enhanced TTS Manager integrated with {available_engines} engines")
                else:
                    self.service_capabilities["tts"] = ServiceCapability(
                        name="tts",
                        status=ServiceStatus.DEGRADED,
                        confidence=0.3,  # Text-only fallback available
                        last_check=datetime.utcnow(),
                        metadata=tts_health,
                        error_message="No TTS engines available, text-only responses"
                    )
                    logger.warning("⚠️ TTS Manager initialized but no engines available")
            else:
                logger.warning("⚠️ TTS Manager not initialized")
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
        
        logger.info(f"🎯 Processing message: '{message[:100]}...' for user: {user_id}")
        logger.debug(f"🔍 Input context: {context}")
        logger.debug(f"🔍 Response mode: {response_mode}")
        
        try:
            # Check if orchestrator is initialized
            if not self.is_initialized:
                logger.error("❌ Enhanced orchestrator not initialized")
                raise Exception("Enhanced orchestrator not initialized")
            
            # Assess current service capabilities
            logger.debug("Step 1: Assessing service capabilities...")
            await self._assess_service_capabilities()
            logger.debug("✅ Step 1: Service capabilities assessed")
            
            # Build enhanced context
            logger.debug("Step 2: Building enhanced context...")
            enhanced_context = await self._build_enhanced_context(
                user_id, session_id, context, response_mode, user_location
            )
            logger.debug("✅ Step 2: Enhanced context built")
            
            # Process based on service availability
            if self.ai_service and self.providers['openai']['health']:
                logger.info("🧠 Processing with AI Service")
                logger.debug("Step 3: Processing with AI Service...")
                ai_response = await self._process_with_ai_service(
                    message, enhanced_context, user_id, session_id
                )
                enhanced_response = ai_response
                enhanced_response["capabilities_used"] = ["ai_service"]
                self.performance_metrics["ai_service_calls"] += 1
                logger.debug("✅ Step 3: AI Service processing completed")
            elif self.ai_service:
                # AI service exists but OpenAI is unhealthy - try direct processing
                logger.info("🔄 Attempting direct AI processing (OpenAI degraded)")
                logger.debug(f"AI service status: {self.ai_service}, OpenAI health: {self.providers['openai']['health']}")
                logger.debug("Step 3: Processing with direct AI response...")
                try:
                    direct_response = await self._process_direct_ai_response(
                        message, enhanced_context, user_id, session_id
                    )
                    enhanced_response = direct_response
                    logger.debug("✅ Step 3: Direct AI processing completed")
                except Exception as direct_error:
                    logger.warning(f"⚠️ Direct AI processing failed: {direct_error}")
                    # Fall back to simple responses
                    logger.info("📝 Falling back to simple response mode")
                    simple_response = self._generate_simple_response(message, context)
                    enhanced_response = simple_response
                    enhanced_response["capabilities_used"] = ["simple_response"]
                    self.performance_metrics["simple_responses"] += 1
            else:
                # No AI service available - use simple responses
                logger.info("📝 Using simple response mode (AI service unavailable)")
                simple_response = self._generate_simple_response(message, context)
                enhanced_response = simple_response
                enhanced_response["capabilities_used"] = ["simple_response"]
                self.performance_metrics["simple_responses"] += 1
                logger.debug("✅ Step 3: Simple response generated")
            
            # Update performance metrics
            processing_time = (datetime.utcnow() - start_time).total_seconds() * 1000
            self._update_performance_metrics(enhanced_response, processing_time)
            
            logger.info(f"✅ Message processing completed in {processing_time:.2f}ms")
            
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
            logger.error(f"❌ Processing exception type: {type(e).__name__}")
            logger.error(f"❌ Processing exception details: {str(e)}")
            import traceback
            logger.error(f"❌ Processing full traceback: {traceback.format_exc()}")
            
            # Log service statuses for debugging
            try:
                service_status = self._get_service_status_summary()
                logger.error(f"❌ Service status at failure: {service_status}")
            except Exception as status_e:
                logger.error(f"❌ Failed to get service status: {status_e}")
            
            self.performance_metrics["service_fallbacks"] += 1
            
            # Generate specific fallback response based on error type
            fallback_response = self._generate_fallback_response(e, message)
            
            return {
                "content": fallback_response["content"],
                "confidence": fallback_response["confidence"],
                "response_mode": "text_only",
                "error": str(e),
                "error_type": type(e).__name__,
                "service_status": fallback_response["service_status"],
                "capabilities_disabled": fallback_response["capabilities_disabled"],
                "user_guidance": fallback_response["user_guidance"]
            }
    
    async def _process_direct_ai_response(
        self,
        message: str,
        enhanced_context: EnhancedPamContext,
        user_id: str,
        session_id: str
    ) -> Dict[str, Any]:
        """Process message directly with AI service when tools aren't needed"""
        try:
            logger.debug(f"🔄 Starting direct AI processing for message: '{message[:50]}...'")
            
            if not self.ai_service:
                logger.error("❌ AI service not available for direct processing")
                return {
                    "content": "I'm currently unable to process your request. Please try again.",
                    "confidence": 0.3,
                    "response_mode": "text_only",
                    "capabilities_used": ["fallback"],
                    "error": "ai_service_unavailable"
                }
            
            logger.debug(f"✅ AI service available, checking client...")
            if not self.ai_orchestrator or not self.ai_orchestrator.providers:
                logger.error("❌ AI service client not available")
                return {
                    "content": "I'm currently unable to process your request. Please try again.",
                    "confidence": 0.3,
                    "response_mode": "text_only",
                    "capabilities_used": ["fallback"],
                    "error": "ai_client_unavailable"
                }
            
            # Simple AI context without tools
            ai_context = {
                "user_id": user_id,
                "session_id": session_id,
                "conversation_mode": enhanced_context.conversation_mode,
                "user_location": enhanced_context.user_location
            }
            
            logger.debug(f"📋 Direct AI context: {ai_context}")
            logger.debug(f"🤖 Calling AI service process_message...")
            
            # Get response from AI orchestrator (will use Anthropic if OpenAI fails)
            messages = [
                AIMessage(role="system", content="You are PAM, a helpful AI assistant for travel planning and expense management."),
                AIMessage(role="user", content=f"{message}\n\nContext: {json.dumps(ai_context)}")
            ]
            
            ai_response = await self.ai_orchestrator.complete(
                messages=messages,
                temperature=0.7,
                max_tokens=2048
            )
            
            logger.debug(f"📤 AI service response type: {type(ai_response)}")
            logger.debug(f"📤 AI service response: {ai_response}")
            
            if isinstance(ai_response, AIResponse):
                logger.debug(f"✅ Valid AIResponse received, content length: {len(ai_response.content) if ai_response.content else 0}")
                return {
                    "content": ai_response.content,
                    "confidence": ai_response.confidence_score or 0.8,
                    "response_mode": enhanced_context.preferred_response_mode.value,
                    "capabilities_used": ["ai_service_direct"]
                }
            
            logger.debug(f"⚠️ Non-AIResponse received, converting to string")
            return {
                "content": str(ai_response),
                "confidence": 0.7,
                "response_mode": "text_only",
                "capabilities_used": ["ai_service_direct"]
            }
            
        except Exception as e:
            logger.error(f"❌ Direct AI processing failed: {e}")
            logger.error(f"❌ Direct AI processing exception type: {type(e).__name__}")
            import traceback
            logger.error(f"❌ Direct AI processing traceback: {traceback.format_exc()}")
            return {
                "content": "I apologize, but I couldn't process your request. Please try again.",
                "confidence": 0.2,
                "response_mode": "text_only",
                "error": str(e),
                "error_type": type(e).__name__,
                "capabilities_used": ["fallback"]
            }
    
    async def _process_with_ai_service(
        self,
        message: str,
        enhanced_context: EnhancedPamContext,
        user_id: str,
        session_id: str
    ) -> Dict[str, Any]:
        """Process message using the AI Service"""
        try:
            logger.debug(f"🧠 Starting AI service processing for message: '{message[:50]}...'")
            
            # Check AI service availability
            if not self.ai_service:
                logger.error("❌ AI service not available for enhanced processing")
                raise Exception("AI service not available")
            
            if not self.ai_orchestrator or not self.ai_orchestrator.providers:
                logger.error("❌ AI service client not available for enhanced processing")
                raise Exception("AI service client not available")
                
            logger.debug("✅ AI service and client available")
            
            # Prepare context for AI service with savings awareness
            logger.debug("📋 Building AI context...")
            ai_context = {
                "user_id": user_id,
                "session_id": session_id,
                "conversation_mode": enhanced_context.conversation_mode,
                "user_location": enhanced_context.user_location,
                "service_capabilities": {
                    name: {
                        "status": cap.status.value,
                        "confidence": cap.confidence
                    }
                    for name, cap in enhanced_context.service_capabilities.items()
                },
                "quality_requirements": enhanced_context.quality_requirements,
                "pam_mission": {
                    "primary_goal": "Help users save money through intelligent recommendations",
                    "savings_guarantee": "Users should save at least their subscription cost ($29.99/month)",
                    "savings_approach": "Look for cost-saving alternatives, better deals, and smarter spending choices",
                    "attribution_required": "When suggesting money-saving alternatives, use financial tools with savings attribution"
                },
                "savings_context": self._build_savings_context(message)
            }
            
            # Add base context data
            if hasattr(enhanced_context.base_context, '__dict__'):
                logger.debug("📋 Adding base context data...")
                ai_context.update(enhanced_context.base_context.__dict__)
            
            logger.debug(f"📋 AI context prepared with {len(ai_context)} keys")
            
            # Get available tools for function calling
            tools = []
            if hasattr(self, 'tool_registry') and self.tool_registry:
                logger.debug("🔧 Getting tools from registry...")
                try:
                    # Get relevant tool capabilities based on context
                    relevant_capabilities = self._determine_relevant_capabilities(message, enhanced_context)
                    logger.debug(f"🔧 Relevant capabilities: {relevant_capabilities}")
                    tools = self.tool_registry.get_openai_functions(capabilities=relevant_capabilities)
                    logger.debug(f"🔧 Retrieved {len(tools)} tools")
                except Exception as tool_e:
                    logger.warning(f"⚠️ Failed to get tools: {tool_e}")
                    tools = []
            else:
                logger.debug("🔧 No tool registry available")
            
            # Call AI orchestrator with tools for function calling
            logger.debug(f"🤖 Calling AI orchestrator with {len(tools)} tools...")
            messages = [
                AIMessage(role="system", content="You are PAM, a helpful AI assistant with access to various tools for travel planning and expense management."),
                AIMessage(role="user", content=f"{message}\n\nContext: {json.dumps(ai_context)}")
            ]
            
            # Note: Tool support will depend on provider capabilities
            ai_response = await self.ai_orchestrator.complete(
                messages=messages,
                temperature=0.7,
                max_tokens=2048
                # Tools passed separately if provider supports them
            )
            
            logger.debug(f"📤 AI service response received: {type(ai_response)}")
            logger.debug(f"📤 AI response content length: {len(str(ai_response)) if ai_response else 0}")
            
            # Handle function calling if present
            if hasattr(ai_response, 'function_calls') and ai_response.function_calls:
                tool_results = await self._execute_tool_calls(
                    ai_response.function_calls,
                    user_id,
                    enhanced_context
                )
                
                # Generate final response with tool results
                tool_context = f"""Tool execution completed. Results:
{json.dumps(tool_results, indent=2)}

Based on these results, please provide a helpful response to the user's original query: {message}"""
                
                messages = [
                    AIMessage(role="system", content="You are PAM, a helpful AI assistant. Provide a response based on the tool execution results."),
                    AIMessage(role="user", content=tool_context)
                ]
                
                ai_response = await self.ai_orchestrator.complete(
                    messages=messages,
                    temperature=0.7,
                    max_tokens=2048
                )
            
            if isinstance(ai_response, AIResponse):
                # Record provider success (could be OpenAI or Anthropic)
                provider_name = ai_response.provider if hasattr(ai_response, 'provider') else 'openai'
                if provider_name in self.providers:
                    self.providers[provider_name]['success_count'] += 1
                self.providers['openai']['error_count'] = max(0, self.providers['openai']['error_count'] - 1)
                
                response = {
                    "content": ai_response.content,
                    "confidence": ai_response.confidence_score or 0.9,
                    "response_mode": enhanced_context.preferred_response_mode.value,
                    "suggestions": [],
                    "actions": [],
                    "knowledge_enhanced": False,
                    "voice_enabled": enhanced_context.tts_available,
                    "ai_metadata": {
                        "model": ai_response.model,
                        "usage": ai_response.usage,
                        "latency_ms": ai_response.latency_ms,
                        "finish_reason": ai_response.finish_reason
                    }
                }
                
                # Add TTS enhancement if available
                if enhanced_context.tts_available and enhanced_context.preferred_response_mode != ResponseMode.TEXT_ONLY:
                    response["audio_data"] = await self._generate_audio(
                        ai_response.content, enhanced_context
                    )
                    response["voice_enabled"] = True
                    response["capabilities_used"] = response.get("capabilities_used", []) + ["tts"]
                
                return response
            else:
                raise Exception(f"Unexpected AI service response type: {type(ai_response)}")
                
        except Exception as e:
            logger.error(f"❌ AI service processing failed: {e}")
            logger.error(f"❌ AI service exception type: {type(e).__name__}")
            logger.error(f"❌ AI service exception details: {str(e)}")
            import traceback
            logger.error(f"❌ AI service full traceback: {traceback.format_exc()}")
            
            # Record provider failure
            self.providers['openai']['error_count'] += 1
            logger.warning(f"⚠️ OpenAI error count increased to: {self.providers['openai']['error_count']}")
            
            if self.providers['openai']['error_count'] >= self.config['max_provider_errors']:
                self.providers['openai']['health'] = False
                logger.warning("⚠️ OpenAI provider marked unhealthy due to errors")
            
            # Generate specific fallback response
            fallback_response = self._generate_fallback_response(e, message)
            
            return {
                "content": fallback_response["content"],
                "confidence": fallback_response["confidence"],
                "response_mode": "text_only",
                "error": str(e),
                "error_type": type(e).__name__,
                "capabilities_used": ["fallback"],
                "service_status": fallback_response["service_status"],
                "capabilities_disabled": fallback_response["capabilities_disabled"],
                "user_guidance": fallback_response["user_guidance"]
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
        
        logger.debug(f"📋 Building enhanced context for user: {user_id}")
        logger.debug(f"📋 Input context: {context}")
        logger.debug(f"📋 Response mode: {response_mode}")
        logger.debug(f"📋 User location: {user_location}")
        
        try:
            # Build base context directly
            logger.debug("📋 Creating base PamContext...")
            base_context = PamContext(
                user_id=user_id,
                session_id=session_id,
                conversation_history=[],
                user_preferences={},
                current_location=context.get('user_location') if context else None,
                active_trip=None,
                emotional_state="neutral",
                engagement_level="normal"
            )
            logger.debug("✅ Base PamContext created")
            
            # Determine service availability
            logger.debug("📋 Checking service availability...")
            logger.debug(f"📋 Available service capabilities: {list(self.service_capabilities.keys())}")
            
            knowledge_available = (
                self.service_capabilities.get("knowledge", type('obj', (object,), {'status': ServiceStatus.UNAVAILABLE})()).status == ServiceStatus.HEALTHY
            )
            tts_available = (
                self.service_capabilities.get("tts", type('obj', (object,), {'status': ServiceStatus.UNAVAILABLE})()).status == ServiceStatus.HEALTHY
            )
            voice_streaming_available = (
                self.service_capabilities.get("voice_streaming", type('obj', (object,), {'status': ServiceStatus.UNAVAILABLE})()).status == ServiceStatus.HEALTHY
            )
            
            logger.debug(f"📋 Service availability - Knowledge: {knowledge_available}, TTS: {tts_available}, Voice Streaming: {voice_streaming_available}")
            
            # Determine conversation mode from context
            conversation_mode = context.get("input_type", "text") if context else "text"
            logger.debug(f"📋 Conversation mode: {conversation_mode}")
            
            # Set quality requirements based on mode
            quality_requirements = {
                "response_time_ms": 3000 if conversation_mode == "voice" else 5000,
                "knowledge_depth": 0.8 if response_mode == ResponseMode.ADAPTIVE else 0.6,
                "voice_quality": 0.9 if tts_available else 0.0
            }
            logger.debug(f"📋 Quality requirements: {quality_requirements}")
        
        except Exception as e:
            logger.error(f"❌ Failed to build enhanced context: {e}")
            logger.error(f"❌ Context building exception type: {type(e).__name__}")
            import traceback
            logger.error(f"❌ Context building traceback: {traceback.format_exc()}")
            raise
        
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
        """Enhance response with text-to-speech audio using enhanced TTS Manager"""
        
        try:
            # Check if TTS manager is available
            if not hasattr(self, 'tts_manager') or not self.tts_manager:
                logger.debug("🔇 TTS Manager not available")
                return None
            
            # Determine appropriate voice context
            voice_context_mapping = {
                "voice": "general",
                "text": "general",
                "mixed": "general",
                "emergency": "emergency",
                "navigation": "navigation"
            }
            
            voice_context = voice_context_mapping.get(
                enhanced_context.conversation_mode, 
                "general"
            )
            
            # Get user ID from base context
            user_id = enhanced_context.base_context.user_id
            
            # Use enhanced TTS Manager with multi-engine fallback
            logger.debug(f"🎤 Generating TTS for context: {voice_context}, user: {user_id}")
            
            tts_response = await asyncio.wait_for(
                self.tts_manager.synthesize_for_pam(
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
        
        # TTS service health check (using tts_manager instead of tts_service)
        if hasattr(self, 'tts_manager') and self.tts_manager:
            try:
                health = self.tts_manager.get_health_status()
                available_engines = health["system_health"]["available_engines"]
                if available_engines > 0:
                    self.service_capabilities["tts"].status = ServiceStatus.HEALTHY
                    self.service_capabilities["tts"].confidence = min(1.0, available_engines / 3.0)
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
    
    async def health_check_providers(self) -> Dict[str, Any]:
        """Perform health checks on all providers"""
        health_status = {}
        
        for provider_name, provider_info in self.providers.items():
            try:
                if self.ai_orchestrator and self.ai_orchestrator.providers:
                    # Check if provider is available in orchestrator
                    provider_available = any(p.name == provider_name for p in self.ai_orchestrator.providers)
                    is_healthy = provider_available
                    
                    health_status[provider_name] = {
                        "healthy": is_healthy,
                        "last_check": datetime.utcnow().isoformat(),
                        "stats": stats,
                        "error_count": provider_info["error_count"],
                        "success_count": provider_info["success_count"]
                    }
                    
                    # Update provider status
                    self.providers[provider_name]["health"] = is_healthy
                    self.providers[provider_name]["last_health_check"] = datetime.utcnow()
                    
                    if is_healthy:
                        # Reset error count on successful health check
                        self.providers[provider_name]["error_count"] = max(0, provider_info["error_count"] - 1)
                        
                else:
                    health_status[provider_name] = {
                        "healthy": False,
                        "error": "Provider not implemented or unavailable"
                    }
                    
            except Exception as e:
                health_status[provider_name] = {
                    "healthy": False,
                    "error": str(e),
                    "last_check": datetime.utcnow().isoformat()
                }
                
                # Increment error count
                self.providers[provider_name]["error_count"] += 1
                
        self.performance_metrics["provider_health_checks"] += 1
        return health_status
    
    async def get_provider_status(self) -> Dict[str, Any]:
        """Get current status of all providers"""
        return {
            "providers": {
                name: {
                    "health": info["health"],
                    "priority": info["priority"],
                    "error_count": info["error_count"],
                    "success_count": info["success_count"],
                    "last_health_check": info["last_health_check"].isoformat() if info["last_health_check"] else None
                }
                for name, info in self.providers.items()
            },
            "active_provider": self._get_active_provider(),
            "fallback_available": self._has_fallback_provider()
        }
    
    def _get_active_provider(self) -> Optional[str]:
        """Get the currently active provider"""
        healthy_providers = [
            name for name, info in self.providers.items() 
            if info["health"]
        ]
        
        if not healthy_providers:
            return None
            
        # Return provider with highest priority (lowest number)
        return min(healthy_providers, key=lambda x: self.providers[x]["priority"])
    
    def _has_fallback_provider(self) -> bool:
        """Check if fallback providers are available"""
        healthy_count = sum(1 for info in self.providers.values() if info["health"])
        return healthy_count > 1
    
    def _generate_fallback_response(self, error: Exception, message: str) -> Dict[str, Any]:
        """Generate specific fallback response based on error type and user message"""
        error_str = str(error).lower()
        error_type = type(error).__name__
        
        # Check for OpenAI-specific errors
        if "openai" in error_str or "api key" in error_str:
            if "authentication" in error_str or "api key" in error_str:
                return {
                    "content": (
                        "I'm currently unable to access my AI capabilities due to an authentication issue. "
                        "This means I can't provide intelligent responses right now, but I can still help with basic information. "
                        "Please contact support if this persists."
                    ),
                    "confidence": 0.2,
                    "service_status": "degraded",
                    "capabilities_disabled": ["ai_responses", "intelligent_suggestions", "context_awareness"],
                    "user_guidance": "Basic text responses available. AI features temporarily disabled."
                }
            elif "quota" in error_str or "billing" in error_str:
                return {
                    "content": (
                        "I'm currently unable to provide AI-powered responses due to service limits. "
                        "I can still help with basic information and navigation. "
                        "Please try again later or contact support."
                    ),
                    "confidence": 0.2,
                    "service_status": "degraded",
                    "capabilities_disabled": ["ai_responses", "intelligent_analysis", "personalized_suggestions"],
                    "user_guidance": "Basic functionality available. AI responses temporarily limited."
                }
            elif "rate limit" in error_str:
                return {
                    "content": (
                        "I'm currently experiencing high demand and need to slow down my responses. "
                        "Please wait a moment and try again. I'll be back to full capacity shortly."
                    ),
                    "confidence": 0.4,
                    "service_status": "throttled",
                    "capabilities_disabled": ["real_time_responses"],
                    "user_guidance": "Please wait 30 seconds before trying again."
                }
        
        # Check for timeout errors
        if "timeout" in error_str:
            return {
                "content": (
                    "I'm taking longer than usual to process your request due to high server load. "
                    "Please try asking your question again. I'll try to respond more quickly."
                ),
                "confidence": 0.3,
                "service_status": "slow",
                "capabilities_disabled": ["real_time_responses"],
                "user_guidance": "Service is slower than normal. Please retry your request."
            }
        
        # Check for network/connection errors
        if any(term in error_str for term in ["connection", "network", "unreachable"]):
            return {
                "content": (
                    "I'm having trouble connecting to my AI services right now. "
                    "I can still provide basic responses, but my advanced capabilities are temporarily limited. "
                    "Please try again in a few minutes."
                ),
                "confidence": 0.2,
                "service_status": "offline",
                "capabilities_disabled": ["ai_responses", "external_data", "real_time_info"],
                "user_guidance": "Offline mode active. Limited functionality available."
            }
        
        # Provide contextual responses based on user's message
        message_lower = message.lower() if message else ""
        
        if any(word in message_lower for word in ["expense", "cost", "budget", "money"]):
            return {
                "content": (
                    "I'm currently unable to access my smart expense analysis features. "
                    "You can still manually track expenses in the Wins section. "
                    "My AI-powered insights will return once the service is restored."
                ),
                "confidence": 0.3,
                "service_status": "degraded",
                "capabilities_disabled": ["expense_analysis", "budget_insights", "smart_categorization"],
                "user_guidance": "Manual expense tracking still available in the Wins section."
            }
        
        if any(word in message_lower for word in ["route", "trip", "navigate", "direction"]):
            return {
                "content": (
                    "I'm temporarily unable to provide intelligent route planning. "
                    "You can still use the map features and I'll help with basic navigation once my services are restored."
                ),
                "confidence": 0.3,
                "service_status": "degraded",
                "capabilities_disabled": ["smart_routing", "personalized_recommendations", "real_time_traffic"],
                "user_guidance": "Basic map functionality still available in the Wheels section."
            }
        
        # Dynamic fallback response with provider status
        available_providers = []
        if self.ai_orchestrator and self.ai_orchestrator.providers:
            available_providers = [p.name for p in self.ai_orchestrator.providers]
        
        if available_providers:
            provider_info = f"AI provider(s) available: {', '.join(available_providers)}. "
            status_msg = "Temporary processing issue. Please try again."
        else:
            provider_info = "No AI providers currently available. "
            status_msg = "AI services are being initialized. Please try again in a moment."
        
        return {
            "content": (
                f"{provider_info}{status_msg} "
                "Core app features remain fully functional."
            ),
            "confidence": 0.3,
            "service_status": "degraded",
            "capabilities_disabled": ["ai_responses", "intelligent_suggestions"],
            "user_guidance": "Manual features available. AI assistance will resume shortly.",
            "provider_status": available_providers
        }
    
    def _generate_simple_response(self, message: str, context: Dict[str, Any]) -> Dict[str, Any]:
        """Generate simple responses without AI when OpenAI is unavailable"""
        message_lower = message.lower() if message else ""
        
        # Common greeting responses
        if any(word in message_lower for word in ["hello", "hi", "hey", "good morning", "good afternoon"]):
            return {
                "content": (
                    "Hello! I'm currently running in limited mode, but I'm still here to help. "
                    "You can use all the manual features in the Wheels & Wins app, and I'll provide better assistance once my AI services are restored."
                ),
                "confidence": 0.6,
                "response_mode": "text_only",
                "service_status": "limited"
            }
        
        # Help requests
        if any(word in message_lower for word in ["help", "assist", "guide", "how to"]):
            return {
                "content": (
                    "I'm currently in limited mode, but here's how you can use the app:\n\n"
                    "🚐 **Wheels**: Use the map to plan trips and find RV parks\n"
                    "💰 **Wins**: Track expenses and manage your budget\n"
                    "👥 **Social**: Connect with other travelers\n\n"
                    "My AI-powered suggestions will return once service is restored."
                ),
                "confidence": 0.7,
                "response_mode": "text_only",
                "service_status": "limited"
            }
        
        # Expense/money related queries
        if any(word in message_lower for word in ["expense", "cost", "budget", "money", "spent", "spend"]):
            return {
                "content": (
                    "You can manually track expenses in the Wins section of the app. "
                    "While my smart categorization and insights aren't available right now, "
                    "you can still add expenses, view your spending, and manage your budget. "
                    "AI-powered expense analysis will return once my services are restored."
                ),
                "confidence": 0.5,
                "response_mode": "text_only",
                "service_status": "limited"
            }
        
        # Trip/travel related queries
        if any(word in message_lower for word in ["trip", "travel", "route", "drive", "destination", "navigate"]):
            return {
                "content": (
                    "You can use the Wheels section to view maps and search for RV parks and destinations. "
                    "While I can't provide personalized route suggestions right now, "
                    "the basic map functionality is fully available. "
                    "Smart route planning will return once my AI services are restored."
                ),
                "confidence": 0.5,
                "response_mode": "text_only",
                "service_status": "limited"
            }
        
        # Default response for other queries
        return {
            "content": (
                "I'm currently running in limited mode and can't provide intelligent responses to your specific question. "
                "However, all the core app features in Wheels, Wins, and Social sections are fully functional. "
                "Please try using the manual features, or check back in a few minutes when my AI capabilities return."
            ),
            "confidence": 0.3,
            "response_mode": "text_only",
            "service_status": "limited"
        }
    
    async def _generate_audio(self, content: str, enhanced_context: EnhancedPamContext) -> Optional[bytes]:
        """Generate audio using TTS service"""
        try:
            if not hasattr(self, 'tts_manager') or not self.tts_manager:
                return None
                
            tts_result = await self._enhance_with_tts(content, enhanced_context)
            return tts_result.get("audio_data") if tts_result else None
            
        except Exception as e:
            logger.warning(f"⚠️ Audio generation failed: {e}")
            return None
    
    def _determine_relevant_capabilities(self, message: str, context: EnhancedPamContext) -> List[ToolCapability]:
        """Determine relevant tool capabilities based on message and context"""
        capabilities = []
        message_lower = message.lower()
        
        # Financial capabilities with savings awareness
        financial_keywords = ['spend', 'spent', 'expense', 'cost', 'budget', 'money', 'paid', 'bought', 'purchased']
        savings_keywords = ['save', 'saving', 'savings', 'cheaper', 'discount', 'deal', 'bargain', 'budget', 'alternative']
        
        if any(word in message_lower for word in financial_keywords + savings_keywords):
            capabilities.append(ToolCapability.USER_DATA)
            capabilities.append(ToolCapability.FINANCIAL)
        
        # Enhanced savings detection - look for money-saving opportunities
        if any(word in message_lower for word in savings_keywords + ['expensive', 'pricey', 'afford', 'cheap']):
            capabilities.append(ToolCapability.FINANCIAL)
            capabilities.append(ToolCapability.LOCATION_SEARCH)  # For finding cheaper alternatives
        
        # Trip planning capabilities  
        if any(word in message_lower for word in ['route', 'trip', 'drive', 'navigate', 'campground', 'rv park', 'destination']):
            capabilities.append(ToolCapability.LOCATION_SEARCH)
            capabilities.append(ToolCapability.TRIP_PLANNING)
        
        # Weather capabilities
        if any(word in message_lower for word in ['weather', 'forecast', 'rain', 'storm', 'temperature', 'wind']):
            capabilities.append(ToolCapability.EXTERNAL_API)
            capabilities.append(ToolCapability.WEATHER)
        
        # Location search
        if any(word in message_lower for word in ['near', 'nearby', 'find', 'search', 'where', 'restaurant', 'gas', 'fuel']):
            capabilities.append(ToolCapability.LOCATION_SEARCH)
        
        # Default to common capabilities if none detected
        if not capabilities:
            capabilities = [ToolCapability.USER_DATA, ToolCapability.LOCATION_SEARCH, ToolCapability.EXTERNAL_API]
        
        return capabilities
    
    def _build_savings_context(self, message: str) -> Dict[str, Any]:
        """Build savings-specific context for AI processing"""
        message_lower = message.lower()
        
        savings_context = {
            "savings_opportunity_detected": False,
            "financial_context": "general",
            "suggested_approach": "standard",
            "priority": "normal"
        }
        
        # Detect different types of financial contexts
        if any(word in message_lower for word in ['expensive', 'costly', 'pricey', 'too much']):
            savings_context.update({
                "savings_opportunity_detected": True,
                "financial_context": "cost_concern",
                "suggested_approach": "find_alternatives",
                "priority": "high",
                "action_hint": "Look for cheaper alternatives and suggest using financial tools with savings attribution"
            })
        
        elif any(word in message_lower for word in ['budget', 'save money', 'saving', 'cheaper']):
            savings_context.update({
                "savings_opportunity_detected": True,
                "financial_context": "budget_conscious",
                "suggested_approach": "optimize_spending",
                "priority": "high",
                "action_hint": "Provide budget-friendly options and track savings with financial tools"
            })
        
        elif any(word in message_lower for word in ['spent', 'paid', 'bought', 'purchased']):
            savings_context.update({
                "savings_opportunity_detected": True,
                "financial_context": "expense_reporting",
                "suggested_approach": "expense_tracking_with_insights",
                "priority": "medium",
                "action_hint": "Help log expense and suggest future savings opportunities in this category"
            })
        
        elif any(word in message_lower for word in ['fuel', 'gas', 'campground', 'food', 'restaurant']):
            savings_context.update({
                "savings_opportunity_detected": True,
                "financial_context": "travel_expense",
                "suggested_approach": "travel_optimization",
                "priority": "medium",
                "action_hint": "Suggest cost-effective travel options and track potential savings"
            })
        
        return savings_context
    
    async def _execute_tool_calls(
        self,
        tool_calls: List[Dict[str, Any]],
        user_id: str,
        context: EnhancedPamContext
    ) -> Dict[str, Any]:
        """Execute tool calls from AI response"""
        results = {}
        
        for tool_call in tool_calls:
            tool_name = tool_call.get('function', {}).get('name')
            tool_args = tool_call.get('function', {}).get('arguments', {})
            
            if isinstance(tool_args, str):
                import json
                try:
                    tool_args = json.loads(tool_args)
                except:
                    tool_args = {"query": tool_args}
            
            logger.info(f"🔧 Executing tool: {tool_name} with args: {tool_args}")
            
            try:
                # Execute tool through registry
                execution_result = await self.tool_registry.execute_tool(
                    tool_name=tool_name,
                    user_id=user_id,
                    parameters=tool_args,
                    timeout=30
                )
                
                if execution_result.success:
                    results[tool_name] = {
                        "success": True,
                        "result": execution_result.result,
                        "execution_time_ms": execution_result.execution_time_ms
                    }
                else:
                    results[tool_name] = {
                        "success": False,
                        "error": execution_result.error
                    }
                    
            except Exception as e:
                logger.error(f"❌ Tool execution failed for {tool_name}: {e}")
                results[tool_name] = {
                    "success": False,
                    "error": str(e)
                }
        
        return results
    
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