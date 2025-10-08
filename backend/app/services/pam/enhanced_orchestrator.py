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
import json
from app.utils.datetime_encoder import DateTimeEncoder

from app.models.domain.pam import (
    PamMemory, PamIntent, PamContext, 
    PamResponse, IntentType, MemoryType
)
from app.services.database import get_database_service
from app.services.cache import cache_service
from app.services.pam.context_manager import ContextManager
from app.services.ai.ai_orchestrator import AIOrchestrator
from app.services.ai.provider_interface import AIMessage, AIResponse, AICapability
from app.observability import observe_agent, observe_llm_call
from app.services.pam.tools.tool_registry import get_tool_registry, initialize_tool_registry
from app.services.pam.tools.tool_capabilities import ToolCapability
from app.core.errors import (
    PAMError, ErrorType, ErrorSeverity, error_handler,
    raise_external_service_error, raise_rate_limit_error
)
from app.services.pam.intelligent_conversation import AdvancedIntelligentConversation

# Import domain-specific nodes
from app.services.pam.nodes.wheels_node import wheels_node
from app.services.pam.nodes.wins_node import wins_node
from app.services.pam.nodes.social_node import social_node
from app.services.pam.nodes.memory_node import memory_node
from app.services.pam.nodes.shop_node import shop_node
from app.services.pam.nodes.you_node import you_node
from app.services.pam.nodes.admin_node import admin_node

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
        self.intelligent_conversation = None  # Advanced AI conversation handler
        
        # Domain-specific node registry
        self.domain_nodes = {
            'wheels': wheels_node,  # Trip planning, routes, vehicle management
            'wins': wins_node,      # Financial management, budgets, expenses
            'social': social_node,  # Community features, social interactions
            'memory': memory_node,  # Context and memory management
            'shop': shop_node,      # Product recommendations, shopping
            'you': you_node,        # Personal calendar, scheduling
            'admin': admin_node     # Administrative functions
        }
        
        # Capability tracking
        self.service_capabilities: Dict[str, ServiceCapability] = {}
        self.is_initialized = False
        
        # Conversation state management
        self.conversation_states = {}  # user_id -> conversation state
        self.conversation_memory = {}  # user_id -> recent messages
        
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
            "provider_health_checks": 0,
            "intelligent_responses": 0
        }

        # Performance optimization: Cache service capabilities to avoid checking every request
        self.last_capability_check = None
        self.capability_cache_ttl_seconds = 60  # Check services max once per minute
        
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
            logger.info("Step 1/7: Initializing AI Service...")
            await self._initialize_ai_service()
            logger.info("✅ Step 1/7: AI Service initialization completed")
            
            # Initialize Intelligent Conversation Service
            logger.info("Step 2/7: Initializing Intelligent Conversation...")
            await self._initialize_intelligent_conversation()
            logger.info("✅ Step 2/7: Intelligent Conversation initialization completed")
            
            # Initialize tool registry for function calling
            logger.info("Step 3/7: Initializing Tool Registry...")
            await self._initialize_tool_registry()
            logger.info("✅ Step 3/7: Tool Registry initialization completed")
            
            # Initialize knowledge service
            logger.info("Step 4/7: Initializing Knowledge Service...")
            await self._initialize_knowledge_service()
            logger.info("✅ Step 4/7: Knowledge Service initialization completed")
            
            # Initialize TTS service
            logger.info("Step 5/7: Initializing TTS Service...")
            await self._initialize_tts_service()
            logger.info("✅ Step 5/7: TTS Service initialization completed")
            
            # Initialize voice streaming
            logger.info("Step 6/7: Initializing Voice Streaming...")
            await self._initialize_voice_streaming()
            logger.info("✅ Step 6/7: Voice Streaming initialization completed")
            
            # Assess initial capabilities
            logger.info("Step 7/7: Assessing Service Capabilities...")
            await self._assess_service_capabilities()
            logger.info("✅ Step 7/7: Service Capabilities assessment completed")
            
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
            if self.ai_orchestrator and hasattr(self.ai_orchestrator, 'providers') and self.ai_orchestrator.providers:
                logger.info(f"✅ AI Orchestrator initialized with {len(self.ai_orchestrator.providers)} providers")
                
                # Check which providers are available
                provider_names = [p.name for p in self.ai_orchestrator.providers]
                logger.info(f"Available AI providers: {provider_names}")
                
                # Update our provider tracking
                service_stats = {}
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
                    service_stats[provider.name] = "available"
                
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
                # Don't raise exception - just log warning and mark as degraded
                logger.warning("⚠️ AI Orchestrator has no providers available")
                self.service_capabilities["ai_service"] = ServiceCapability(
                    name="ai_service",
                    status=ServiceStatus.DEGRADED,
                    confidence=0.3,
                    last_check=datetime.utcnow(),
                    error_message="No AI providers available",
                    metadata={"providers": []}
                )
                # Don't raise exception to allow other services to initialize
                
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
    
    async def _initialize_intelligent_conversation(self):
        """Initialize the intelligent conversation service for AI-powered responses"""
        try:
            logger.info("🧠 Initializing Intelligent Conversation Service...")
            
            # Create instance of AdvancedIntelligentConversation
            self.intelligent_conversation = AdvancedIntelligentConversation()
            
            # Initialize the service
            await self.intelligent_conversation.initialize()
            
            self.service_capabilities["intelligent_conversation"] = ServiceCapability(
                name="intelligent_conversation",
                status=ServiceStatus.HEALTHY,
                confidence=1.0,
                last_check=datetime.utcnow(),
                metadata={"capabilities": ["emotional_intelligence", "context_aware", "learning"]}
            )
            
            logger.info("✅ Intelligent Conversation Service initialized successfully")
            
        except Exception as e:
            logger.error(f"❌ Intelligent Conversation initialization failed: {e}")
            self.service_capabilities["intelligent_conversation"] = ServiceCapability(
                name="intelligent_conversation",
                status=ServiceStatus.UNAVAILABLE,
                confidence=0.0,
                last_check=datetime.utcnow(),
                error_message=str(e)
            )
            # Don't raise - allow degraded mode
            logger.warning("⚠️ PAM will operate with basic responses (no AI intelligence)")
    
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
            from app.services.tts.manager import get_tts_manager, synthesize_for_pam, PAMVoiceProfile
            
            logger.info("🎤 Initializing enhanced TTS Manager...")
            self.tts_manager = get_tts_manager()
            
            # Get TTS engine status from our new manager
            engine_status = self.tts_manager.get_engine_status()
            available_engines = engine_status["available_engines"]
            
            if available_engines > 0:
                self.service_capabilities["tts"] = ServiceCapability(
                    name="tts",
                    status=ServiceStatus.HEALTHY,
                    confidence=min(1.0, available_engines / 3.0),  # Full confidence with all 3 engines
                    last_check=datetime.utcnow(),
                    metadata=engine_status
                )
                logger.info(f"✅ Enhanced TTS Manager integrated with {available_engines} engines")
            else:
                self.service_capabilities["tts"] = ServiceCapability(
                    name="tts",
                    status=ServiceStatus.DEGRADED,
                    confidence=0.3,  # Text-only fallback available
                    last_check=datetime.utcnow(),
                    metadata=engine_status,
                    error_message="No TTS engines available, text-only responses"
                )
                logger.warning("⚠️ TTS Manager initialized but no engines available")
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
    
    async def _update_conversation_memory(self, user_id: str, message: str):
        """Update conversation memory with recent messages"""
        if user_id not in self.conversation_memory:
            self.conversation_memory[user_id] = []
        
        # Keep last 10 messages for context
        self.conversation_memory[user_id].append({
            'message': message,
            'timestamp': datetime.utcnow().isoformat(),
            'type': 'user'
        })
        
        # Limit to last 10 messages
        if len(self.conversation_memory[user_id]) > 10:
            self.conversation_memory[user_id] = self.conversation_memory[user_id][-10:]
    
    def _get_conversation_state(self, user_id: str) -> Dict[str, Any]:
        """Get current conversation state for a user"""
        if user_id not in self.conversation_states:
            self.conversation_states[user_id] = {
                'last_intent': None,
                'last_message_time': None,
                'context': {},
                'follow_up_count': 0
            }
        return self.conversation_states[user_id]
    
    def _update_conversation_state(self, user_id: str, updates: Dict[str, Any]):
        """Update conversation state for a user"""
        if user_id not in self.conversation_states:
            self.conversation_states[user_id] = {}
        
        self.conversation_states[user_id].update(updates)
        self.conversation_states[user_id]['last_message_time'] = datetime.utcnow().isoformat()
    
    def _get_recent_messages(self, user_id: str) -> List[Dict[str, Any]]:
        """Get recent messages from conversation memory"""
        return self.conversation_memory.get(user_id, [])
    
    def _is_followup_message(self, message: str, conversation_state: Dict[str, Any]) -> bool:
        """Determine if this is a follow-up message based on context and timing"""
        # Check if message is short (likely a follow-up)
        if len(message.split()) <= 3:
            # Check if there was a recent message (within 30 seconds)
            if conversation_state.get('last_message_time'):
                # Parse ISO format string back to datetime for comparison
                from datetime import datetime as dt
                last_time = dt.fromisoformat(conversation_state['last_message_time'])
                time_diff = (datetime.utcnow() - last_time).total_seconds()
                if time_diff < 30:
                    return True
        
        # Check for follow-up patterns
        followup_patterns = [
            r'^to\s+',  # "to Hobart"
            r'^from\s+',  # "from Sydney"
            r'^yes',  # "yes"
            r'^no',  # "no"
            r'^what about',  # "what about..."
            r'^how about',  # "how about..."
            r'^and\s+',  # "and also..."
            r'^also',  # "also..."
        ]
        
        import re
        message_lower = message.lower()
        for pattern in followup_patterns:
            if re.match(pattern, message_lower):
                return True
        
        return False
    
    def _classify_intent(self, message: str) -> Optional[str]:
        """Classify message intent to determine which domain node to use"""
        message_lower = message.lower()
        
        # Trip planning and travel-related intents
        trip_keywords = ['trip', 'travel', 'journey', 'route', 'directions', 'navigate', 
                        'plan a trip', 'camping', 'fuel', 'caravan', 'rv', 'drive', 
                        'from', 'destination', 'waypoint', 'road trip']
        if any(keyword in message_lower for keyword in trip_keywords):
            logger.info(f"🚗 Classified as WHEELS intent: {message[:50]}...")
            return 'wheels'
        
        # Financial and budget-related intents
        finance_keywords = ['budget', 'expense', 'income', 'money', 'cost', 'save', 
                           'financial', 'spending', 'receipt', 'bill', 'payment']
        if any(keyword in message_lower for keyword in finance_keywords):
            logger.info(f"💰 Classified as WINS intent: {message[:50]}...")
            return 'wins'
        
        # Social and community intents
        social_keywords = ['friend', 'community', 'share', 'group', 'meet', 'social', 
                          'connect', 'chat with', 'message']
        if any(keyword in message_lower for keyword in social_keywords):
            logger.info(f"👥 Classified as SOCIAL intent: {message[:50]}...")
            return 'social'
        
        # Calendar and scheduling intents
        calendar_keywords = ['calendar', 'schedule', 'appointment', 'event', 'meeting', 
                            'remind', 'tomorrow', 'next week', 'date']
        if any(keyword in message_lower for keyword in calendar_keywords):
            logger.info(f"📅 Classified as YOU intent: {message[:50]}...")
            return 'you'
        
        # Shopping intents
        shop_keywords = ['buy', 'shop', 'product', 'purchase', 'order', 'deal', 
                        'discount', 'store', 'price']
        if any(keyword in message_lower for keyword in shop_keywords):
            logger.info(f"🛒 Classified as SHOP intent: {message[:50]}...")
            return 'shop'
        
        # Admin intents
        admin_keywords = ['admin', 'settings', 'configure', 'system', 'manage', 
                         'permission', 'user management']
        if any(keyword in message_lower for keyword in admin_keywords):
            logger.info(f"⚙️ Classified as ADMIN intent: {message[:50]}...")
            return 'admin'
        
        # Memory/context intents
        memory_keywords = ['remember', 'forget', 'recall', 'history', 'previous', 
                          'last time', 'context']
        if any(keyword in message_lower for keyword in memory_keywords):
            logger.info(f"🧠 Classified as MEMORY intent: {message[:50]}...")
            return 'memory'
        
        # No specific intent detected
        logger.info(f"❓ No specific intent classified for: {message[:50]}...")
        return None
    
    async def _route_to_domain_node(self, intent: str, message: str, context: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Route message to appropriate domain node"""
        try:
            node = self.domain_nodes.get(intent)
            if not node:
                logger.warning(f"No node registered for intent: {intent}")
                return None
            
            logger.info(f"🎯 Routing to {intent} node for processing")
            
            # Call the node's process method
            node_response = await node.process(message, context)
            
            # Ensure response has the required structure
            if isinstance(node_response, dict):
                # Add metadata about which node handled it
                node_response['node_used'] = intent
                node_response['processing_type'] = 'domain_node'
                return node_response
            else:
                logger.warning(f"Invalid response format from {intent} node: {type(node_response)}")
                return None
                
        except Exception as e:
            logger.error(f"Error routing to {intent} node: {e}")
            return None
    
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

        logger.info(f"🎯 Processing message for user: {user_id}")

        try:
            # Check if orchestrator is initialized
            if not self.is_initialized:
                logger.error("❌ Enhanced orchestrator not initialized")
                raise Exception("Enhanced orchestrator not initialized")

            # Assess current service capabilities (with 60s caching)
            await self._assess_service_capabilities()

            # Build enhanced context
            enhanced_context = await self._build_enhanced_context(
                user_id, session_id, context, response_mode, user_location
            )
            
            # Update conversation memory
            await self._update_conversation_memory(user_id, message)

            # Get conversation state for context
            conversation_state = self._get_conversation_state(user_id)
            
            if self.intelligent_conversation:
                try:
                    logger.info("🧠 Using Intelligent Conversation for AI-powered response")
                    
                    # Build context with conversation history
                    ai_context = {
                        'user_id': user_id,
                        'session_id': session_id,
                        'conversation_history': self._get_recent_messages(user_id),
                        'last_intent': conversation_state.get('last_intent'),
                        'current_page': context.get('current_page') if context else None,
                        'user_location': user_location
                    }
                    
                    # First, analyze intent with AI
                    intent_analysis = await self.intelligent_conversation.analyze_intent(message, ai_context)
                    detected_intent = intent_analysis.get('intent')
                    confidence = intent_analysis.get('confidence', 0.5)
                    
                    # Update conversation state with detected intent
                    self._update_conversation_state(user_id, {'last_intent': detected_intent})
                    
                    # Check if this is a follow-up to a previous domain-specific query
                    is_followup = self._is_followup_message(message, conversation_state)
                    
                    # Route to domain node if intent is domain-specific OR it's a follow-up
                    domain_intents = ['wheels', 'wins', 'social', 'shop', 'you', 'admin']
                    if (detected_intent in domain_intents or 
                        (is_followup and conversation_state.get('last_intent') in domain_intents)):
                        
                        # Use previous intent for follow-ups
                        target_intent = detected_intent if detected_intent in domain_intents else conversation_state.get('last_intent')
                        
                        logger.info(f"🎯 Domain intent detected: {target_intent} (confidence: {confidence})")
                        
                        # Add context about this being a follow-up
                        domain_context = {
                            'user_id': user_id,
                            'session_id': session_id,
                            'context': context,
                            'enhanced_context': enhanced_context,
                            'user_location': user_location,
                            'is_followup': is_followup,
                            'conversation_history': self._get_recent_messages(user_id),
                            'last_intent': target_intent
                        }
                        
                        node_response = await self._route_to_domain_node(target_intent, message, domain_context)
                        
                        if node_response:
                            logger.info(f"✅ Successfully processed by {target_intent} node")
                            self.performance_metrics["successful_responses"] += 1
                            
                            # Format response
                            enhanced_response = {
                                "content": node_response.get('content', ''),
                                "type": "chat_response",
                                "confidence": node_response.get('confidence', confidence),
                                "intent": target_intent,
                                "node_used": target_intent,
                                "capabilities_used": ["intelligent_conversation", "domain_node", target_intent],
                                "requires_followup": node_response.get('requires_followup', False),
                                "suggestions": node_response.get('suggestions', []),
                                "actions": node_response.get('actions', []),
                                "processing_type": "intelligent_domain"
                            }
                            
                            return enhanced_response
                    
                    # For general queries or when domain node fails, use intelligent conversation
                    logger.info("💬 Generating intelligent AI response")
                    ai_response = await self.intelligent_conversation.generate_response(
                        message, ai_context, context
                    )
                    
                    self.performance_metrics["intelligent_responses"] += 1
                    
                    enhanced_response = {
                        "content": ai_response.get('content', ''),
                        "type": "chat_response",
                        "confidence": ai_response.get('confidence', 0.9),
                        "intent": detected_intent,
                        "capabilities_used": ["intelligent_conversation"],
                        "suggestions": ai_response.get('suggestions', []),
                        "emotional_insight": ai_response.get('emotional_insight'),
                        "relationship_depth": ai_response.get('relationship_depth'),
                        "processing_type": "intelligent_ai"
                    }
                    
                except Exception as e:
                    logger.error(f"❌ Intelligent Conversation failed: {e}")
                    # Fall back to basic intent classification
                    intent = self._classify_intent(message)
            else:
                # Fallback to basic intent classification if intelligent conversation unavailable
                logger.warning("⚠️ Intelligent Conversation not available, using basic classification")
                intent = self._classify_intent(message)
                
                if intent:
                    logger.info(f"🎯 Basic domain intent detected: {intent}")
                    node_response = await self._route_to_domain_node(intent, message, {
                        'user_id': user_id,
                        'session_id': session_id,
                        'context': context,
                        'enhanced_context': enhanced_context,
                        'user_location': user_location
                    })
                    
                    if node_response:
                        logger.info(f"✅ Successfully processed by {intent} node")
                        enhanced_response = {
                            "content": node_response.get('content', ''),
                            "type": "chat_response",
                            "confidence": node_response.get('confidence', 0.9),
                            "intent": intent,
                            "node_used": intent,
                            "capabilities_used": ["domain_node", intent],
                            "requires_followup": node_response.get('requires_followup', False),
                            "suggestions": node_response.get('suggestions', []),
                            "actions": node_response.get('actions', []),
                            "processing_type": "basic_domain"
                        }
                        self.performance_metrics["successful_responses"] += 1
                        logger.debug(f"✅ Step 3: Basic domain node processing completed")
                        
                        return enhanced_response
            
            # Step 4: Process with AI if no domain node handled it
            logger.debug("Step 4: Processing with AI services...")
            if self.ai_orchestrator and self.providers['openai']['health']:
                logger.info("🧠 Processing with AI Service")
                logger.debug("Step 3: Processing with AI Service...")
                ai_response = await self._process_with_ai_service(
                    message, enhanced_context, user_id, session_id
                )
                enhanced_response = ai_response
                enhanced_response["capabilities_used"] = ["ai_service"]
                self.performance_metrics["ai_service_calls"] += 1
                logger.debug("✅ Step 3: AI Service processing completed")
            elif self.ai_orchestrator:
                # AI service exists but OpenAI is unhealthy - try direct processing
                logger.info("🔄 Attempting direct AI processing (OpenAI degraded)")
                logger.debug(f"AI orchestrator status: {self.ai_orchestrator}, OpenAI health: {self.providers['openai']['health']}")
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
            
        except PAMError as e:
            # We have a properly structured PAM error - use it
            logger.error(f"❌ PAM Error ({e.error_code}): {e.message}")
            error_handler.tracker.record_error(e)
            
            self.performance_metrics["service_fallbacks"] += 1
            
            # Generate user-friendly response with actual error information
            return {
                "content": e.user_message,
                "confidence": 0.2,
                "response_mode": "text_only",
                "error": e.message,  # Technical message for debugging
                "error_code": e.error_code,
                "error_type": e.error_type.value,
                "retry_after": e.retry_after,
                "request_id": e.request_id,
                "service_status": "error",
                "user_guidance": f"Error: {e.user_message}. Please try again."
            }
                
        except Exception as e:
            # Unexpected error - create a PAM error for consistent handling
            pam_error = PAMError(
                message=str(e),
                error_type=ErrorType.INTERNAL_ERROR,
                status_code=500,
                severity=ErrorSeverity.ERROR,
                details={"exception_type": type(e).__name__}
            )
            error_handler.tracker.record_error(pam_error)
            
            logger.error(f"❌ Unexpected error in message processing: {e}")
            logger.error(f"❌ Exception type: {type(e).__name__}")
            import traceback
            logger.error(f"❌ Full traceback: {traceback.format_exc()}")
            
            # Log service statuses for debugging
            try:
                service_status = self._get_service_status_summary()
                logger.error(f"❌ Service status at failure: {service_status}")
            except Exception as status_e:
                logger.error(f"❌ Failed to get service status: {status_e}")
            
            self.performance_metrics["service_fallbacks"] += 1
            
            # Provide informative response with actual error details
            return {
                "content": f"I encountered an issue processing your request. Error: {pam_error.user_message}. Request ID: {pam_error.request_id}",
                "confidence": 0.2,
                "response_mode": "text_only",
                "error": pam_error.message,
                "error_code": pam_error.error_code,
                "error_type": pam_error.error_type.value,
                "request_id": pam_error.request_id,
                "service_status": "error",
                "capabilities_disabled": ["ai_responses"],
                "user_guidance": "If this persists, please contact support with the request ID."
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
            
            if not self.ai_orchestrator:
                logger.error("❌ AI orchestrator not available for direct processing")
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
                AIMessage(role="user", content=f"{message}\n\nContext: {json.dumps(ai_context, cls=DateTimeEncoder)}")
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
            if not self.ai_orchestrator:
                logger.error("❌ AI orchestrator not available for enhanced processing")
                raise Exception("AI service not available")
            
            if not self.ai_orchestrator:
                logger.error("❌ AI orchestrator not initialized")
                raise Exception("AI orchestrator not initialized")
            
            if not hasattr(self.ai_orchestrator, 'providers') or not self.ai_orchestrator.providers:
                logger.warning("⚠️ No AI providers available, but continuing with limited functionality")
                # Don't raise exception - let it try to process with fallback
                
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
                AIMessage(role="user", content=f"{message}\n\nContext: {json.dumps(ai_context, cls=DateTimeEncoder)}")
            ]

            # Note: Tool support will depend on provider capabilities
            completion_kwargs: Dict[str, Any] = {}
            required_capabilities = set()

            if tools:
                completion_kwargs["functions"] = tools
                required_capabilities.add(AICapability.FUNCTION_CALLING)

            ai_response = await self.ai_orchestrator.complete(
                messages=messages,
                temperature=0.7,
                max_tokens=2048,
                required_capabilities=required_capabilities or None,
                **completion_kwargs
            )

            logger.debug(f"📤 AI service response received: {type(ai_response)}")
            logger.debug(f"📤 AI response content length: {len(str(ai_response)) if ai_response else 0}")

            # Handle function calling if present
            tool_results: Optional[Dict[str, Any]] = None
            if hasattr(ai_response, 'function_calls') and ai_response.function_calls:
                tool_results = await self._execute_tool_calls(
                    ai_response.function_calls,
                    user_id,
                    enhanced_context
                )
                
                # Generate final response with tool results
                tool_context = f"""Tool execution completed. Results:
{json.dumps(tool_results, indent=2, cls=DateTimeEncoder)}

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

                if tool_results:
                    response["ai_metadata"]["tool_results"] = tool_results
                    response.setdefault("capabilities_used", []).append("tools")

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
            
            # Parse current_location if it's a string
            current_location_value = context.get('user_location') if context else None
            if isinstance(current_location_value, str) and ',' in current_location_value:
                try:
                    # Parse string like '-33.8983, 151.0944' into dict
                    parts = current_location_value.split(',')
                    current_location_value = {
                        'lat': float(parts[0].strip()),
                        'lng': float(parts[1].strip())
                    }
                except (ValueError, IndexError):
                    logger.warning(f"⚠️ Could not parse location string: {current_location_value}")
                    current_location_value = None
            elif not isinstance(current_location_value, dict):
                current_location_value = None
            
            base_context = PamContext(
                user_id=user_id,
                timestamp=datetime.utcnow(),  # Add required timestamp field
                current_location=current_location_value,
                recent_expenses=[],
                budget_status={},
                travel_plans={},
                vehicle_info=context.get('vehicle_info', {}) if context else {},
                preferences=context.get('user_preferences', {}) if context else {},
                conversation_history=context.get('conversation_history', []) if context else []
            )

            # Determine service availability (reduced logging for performance)
            knowledge_available = (
                self.service_capabilities.get("knowledge", type('obj', (object,), {'status': ServiceStatus.UNAVAILABLE})()).status == ServiceStatus.HEALTHY
            )
            tts_available = (
                self.service_capabilities.get("tts", type('obj', (object,), {'status': ServiceStatus.UNAVAILABLE})()).status == ServiceStatus.HEALTHY
            )
            voice_streaming_available = (
                self.service_capabilities.get("voice_streaming", type('obj', (object,), {'status': ServiceStatus.UNAVAILABLE})()).status == ServiceStatus.HEALTHY
            )

            # Determine conversation mode from context
            conversation_mode = context.get("input_type", "text") if context else "text"

            # Set quality requirements based on mode
            quality_requirements = {
                "response_time_ms": 3000 if conversation_mode == "voice" else 5000,
                "knowledge_depth": 0.8 if response_mode == ResponseMode.ADAPTIVE else 0.6,
                "voice_quality": 0.9 if tts_available else 0.0
            }
        
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
                synthesize_for_pam(
                    text=content,
                    voice_profile=PAMVoiceProfile.PAM_ASSISTANT,
                    user_id=user_id,
                    context=voice_context
                ),
                timeout=self.config["tts_timeout_ms"] / 1000
            )
            
            if tts_response and tts_response.get("success"):
                return {
                    "audio_data": tts_response.get("audio_data"),
                    "generation_time_ms": tts_response.get("duration", 0.0) * 1000,  # Convert to ms
                    "engine_used": tts_response.get("engine_used", "unknown")
                }
            
            return None
            
        except asyncio.TimeoutError:
            logger.warning("⚠️ TTS enhancement timed out")
            return None
        except Exception as e:
            logger.error(f"❌ TTS enhancement error: {e}")
            return None
    
    async def _assess_service_capabilities(self):
        """Assess current service capabilities and health (with caching to reduce overhead)"""

        # Performance optimization: Only check capabilities once per minute
        now = datetime.utcnow()
        if self.last_capability_check:
            time_since_check = (now - self.last_capability_check).total_seconds()
            if time_since_check < self.capability_cache_ttl_seconds:
                # Cache hit - skip expensive health checks
                return

        # Cache miss - perform health checks
        self.last_capability_check = now

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
                engine_status = self.tts_manager.get_engine_status()
                available_engines = engine_status["available_engines"]
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
            capability.last_check = now
    
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
        """Generate specific fallback response with actual error information"""
        error_str = str(error).lower()
        error_type = type(error).__name__
        
        # Check for OpenAI-specific errors and include actual error message
        if "openai" in error_str or "api key" in error_str:
            if "authentication" in error_str or "api key" in error_str:
                return {
                    "content": (
                        f"Authentication error with AI service: {str(error)}. "
                        "The system administrator has been notified. "
                        "Basic app features remain available."
                    ),
                    "confidence": 0.2,
                    "service_status": "auth_error",
                    "capabilities_disabled": ["ai_responses", "intelligent_suggestions", "context_awareness"],
                    "user_guidance": "This is a configuration issue. Please contact support.",
                    "error_details": str(error)
                }
            elif "quota" in error_str or "billing" in error_str:
                return {
                    "content": (
                        f"Service quota exceeded: {str(error)}. "
                        "The usage limit has been reached. "
                        "Please try again later."
                    ),
                    "confidence": 0.2,
                    "service_status": "quota_exceeded",
                    "capabilities_disabled": ["ai_responses", "intelligent_analysis", "personalized_suggestions"],
                    "user_guidance": "Quota will reset at the end of the billing period.",
                    "error_details": str(error)
                }
            elif "rate limit" in error_str or "429" in error_str:
                return {
                    "content": (
                        f"Rate limit exceeded: {str(error)}. "
                        "Please wait before trying again."
                    ),
                    "confidence": 0.4,
                    "service_status": "rate_limited",
                    "capabilities_disabled": ["real_time_responses"],
                    "user_guidance": "Wait 60 seconds before retrying.",
                    "error_details": str(error),
                    "retry_after": 60
                }
        
        # Check for timeout errors
        if "timeout" in error_str:
            return {
                "content": (
                    f"Request timeout: {str(error)}. "
                    "The AI service is taking longer than expected. "
                    "Please try again."
                ),
                "confidence": 0.3,
                "error_details": str(error),
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
        
        # Dynamic fallback response with actual error information
        available_providers = []
        if self.ai_orchestrator and self.ai_orchestrator.providers:
            available_providers = [p.name for p in self.ai_orchestrator.providers]
        
        return {
            "content": (
                f"AI service error: {str(error)}. "
                f"Available providers: {', '.join(available_providers) if available_providers else 'None'}. "
                "Core app features remain functional."
            ),
            "confidence": 0.3,
            "service_status": "error",
            "capabilities_disabled": ["ai_responses", "intelligent_suggestions"],
            "user_guidance": "Error has been logged. Manual features available.",
            "provider_status": available_providers,
            "error_details": str(error),
            "error_type": error_type
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


# Alias for backward compatibility (pam_main.py uses this name)
async def get_pam_orchestrator() -> EnhancedPamOrchestrator:
    """Alias for get_enhanced_orchestrator - maintains backward compatibility"""
    return await get_enhanced_orchestrator()