"""
PAM Agent Orchestrator using LangGraph
Main entry point for agent-based PAM interactions
"""

from typing import Dict, Any, Optional, List
from langchain_core.messages import HumanMessage, AIMessage
from langchain_openai import ChatOpenAI
from langgraph.prebuilt import create_react_agent
from langgraph.checkpoint.memory import MemorySaver
import asyncio
import time
import logging
from datetime import datetime

from .base import PAMAgentConfig, PAMAgentResult, PAMBaseAgent
from .tools import PAMToolRegistry
from .memory import PAMAgentMemory
from .specialized.coordinator import PAMAgentCoordinator
from .proactive.coordinator import ProactiveIntelligenceCoordinator, ProactiveMode, ProactiveResponse
from ..core.feature_flags import is_feature_enabled

logger = logging.getLogger(__name__)


class PAMAgentOrchestrator:
    """
    Main orchestrator for PAM agent interactions
    Uses LangGraph for agent coordination and tool orchestration
    """
    
    def __init__(self, openai_api_key: str):
        self.openai_api_key = openai_api_key
        self.tool_registry = PAMToolRegistry()
        self.memory = PAMAgentMemory(openai_api_key)  # Pass API key for vector capabilities
        self.agents: Dict[str, Any] = {}
        self.checkpointer = MemorySaver()
        
        # Initialize multi-agent coordinator (Phase 3)
        self.multi_agent_coordinator = None
        self._initialize_multi_agent_system()
        
        # Initialize proactive intelligence coordinator (Phase 4)
        self.proactive_coordinator = None
        self._initialize_proactive_intelligence()
        
        # Initialize the main ReAct agent (fallback)
        self._initialize_main_agent()
    
    def _initialize_multi_agent_system(self):
        """Initialize the multi-agent coordination system (Phase 3)"""
        try:
            # Create agent configuration
            config = PAMAgentConfig(
                agent_id="pam_multi_agent_coordinator",
                name="PAM Multi-Agent Coordinator",
                description="Coordinates multiple specialized PAM agents for comprehensive assistance",
                openai_api_key=self.openai_api_key,
                temperature=0.2,
                max_tokens=4000
            )
            
            # Initialize multi-agent coordinator
            self.multi_agent_coordinator = PAMAgentCoordinator(config, self.memory)
            
            logger.info("Multi-agent coordination system initialized (Phase 3)")
            
        except Exception as e:
            logger.warning(f"Failed to initialize multi-agent system: {e}")
            logger.info("Falling back to single-agent mode")
    
    def _initialize_proactive_intelligence(self):
        """Initialize the proactive intelligence system (Phase 4)"""
        try:
            self.proactive_coordinator = ProactiveIntelligenceCoordinator(
                openai_api_key=self.openai_api_key,
                memory=self.memory
            )
            
            logger.info("Proactive intelligence system initialized (Phase 4)")
            
        except Exception as e:
            logger.warning(f"Failed to initialize proactive intelligence: {e}")
            logger.info("Proactive features will be disabled")
    
    def _initialize_main_agent(self):
        """Initialize the main ReAct agent using LangGraph"""
        try:
            # Create ChatOpenAI model
            model = ChatOpenAI(
                api_key=self.openai_api_key,
                model="gpt-4",
                temperature=0.1,
                max_tokens=4000
            )
            
            # Get all tools for the main agent
            tools = self.tool_registry.get_all_tools()
            
            # Create ReAct agent with tools and memory
            self.main_agent = create_react_agent(
                model=model,
                tools=tools,
                checkpointer=self.checkpointer
            )
            
            logger.info("PAM Agent Orchestrator initialized successfully")
            
        except Exception as e:
            logger.error(f"Failed to initialize PAM Agent Orchestrator: {e}")
            raise
    
    async def process_message(
        self, 
        message: str, 
        user_id: str,
        context: Dict[str, Any] = None
    ) -> PAMAgentResult:
        """
        Process a message through the agent system
        
        Args:
            message: User's message
            user_id: User identifier
            context: Additional context (location, preferences, etc.)
        
        Returns:
            PAMAgentResult with response and metadata
        """
        start_time = time.time()
        
        try:
            # Prepare context for the agent
            enriched_context = await self._enrich_context(user_id, context or {})
            
            # Update proactive intelligence context (Phase 4)
            if self.proactive_coordinator and is_feature_enabled("ENABLE_PAM_PROACTIVE_INTELLIGENCE", user_id):
                try:
                    await self.proactive_coordinator.update_user_context(
                        user_id, enriched_context, "user_message"
                    )
                except Exception as e:
                    logger.warning(f"Failed to update proactive context: {e}")
            
            # Try multi-agent coordination first (Phase 3)
            if self.multi_agent_coordinator and is_feature_enabled("ENABLE_PAM_MULTI_AGENT", user_id):
                try:
                    logger.info(f"Using multi-agent coordination for user {user_id}")
                    
                    multi_agent_result = await self.multi_agent_coordinator.process_request(
                        message, enriched_context
                    )
                    
                    if multi_agent_result.success:
                        execution_time = int((time.time() - start_time) * 1000)
                        multi_agent_result.execution_time_ms = execution_time
                        
                        # Store interaction in memory
                        try:
                            await self.memory.store_interaction(
                                user_id=user_id,
                                user_message=message,
                                agent_response=multi_agent_result.content,
                                context=enriched_context
                            )
                        except Exception as memory_e:
                            logger.warning(f"Failed to store multi-agent interaction: {memory_e}")
                        
                        logger.info(f"Multi-agent processing successful: {multi_agent_result.agent_used}")
                        return multi_agent_result
                    else:
                        logger.warning("Multi-agent processing failed, falling back to single agent")
                        
                except Exception as e:
                    logger.warning(f"Multi-agent coordination error: {e}, falling back to single agent")
            
            # Fallback to single agent processing
            
            # Create conversation thread ID
            thread_id = f"{user_id}_{int(time.time())}"
            
            # Prepare system message with context
            system_prompt = self._build_system_prompt(enriched_context)
            
            # Create input for the agent
            agent_input = {
                "messages": [
                    HumanMessage(content=f"{system_prompt}\n\nUser message: {message}")
                ]
            }
            
            # Configure agent execution
            config = {
                "configurable": {"thread_id": thread_id}
            }
            
            # Execute agent
            result = await self._execute_agent(agent_input, config)
            
            # Process and return result
            execution_time = int((time.time() - start_time) * 1000)
            
            return PAMAgentResult(
                success=True,
                content=result.get('content', ''),
                metadata={
                    'thread_id': thread_id,
                    'context_used': enriched_context,
                    'model_used': 'gpt-4'
                },
                confidence=result.get('confidence', 0.9),
                sources=result.get('sources', []),
                agent_used='main_react_agent',
                execution_time_ms=execution_time,
                tool_calls=result.get('tool_calls', [])
            )
            
        except Exception as e:
            execution_time = int((time.time() - start_time) * 1000)
            logger.error(f"Error processing message: {e}")
            
            return PAMAgentResult(
                success=False,
                content=f"I encountered an error while processing your request: {str(e)}",
                metadata={'error': str(e)},
                confidence=0.0,
                sources=[],
                agent_used='main_react_agent',
                execution_time_ms=execution_time,
                tool_calls=[]
            )
    
    async def _execute_agent(self, agent_input: Dict[str, Any], config: Dict[str, Any]) -> Dict[str, Any]:
        """Execute the agent and extract results"""
        try:
            # Run the agent
            response = await self.main_agent.ainvoke(agent_input, config)
            
            # Extract the final AI message
            messages = response.get('messages', [])
            if not messages:
                return {'content': 'No response generated'}
            
            # Get the last message (should be AI response)
            last_message = messages[-1]
            
            if isinstance(last_message, AIMessage):
                # Extract tool calls if any
                tool_calls = []
                if hasattr(last_message, 'tool_calls') and last_message.tool_calls:
                    tool_calls = [
                        {
                            'tool': call.get('name', 'unknown'),
                            'args': call.get('args', {}),
                            'id': call.get('id', '')
                        } for call in last_message.tool_calls
                    ]
                
                return {
                    'content': last_message.content,
                    'tool_calls': tool_calls,
                    'confidence': 0.9,  # High confidence for successful execution
                    'sources': self._extract_sources_from_messages(messages)
                }
            
            return {'content': str(last_message.content if hasattr(last_message, 'content') else last_message)}
            
        except Exception as e:
            logger.error(f"Agent execution error: {e}")
            return {'content': f'Agent execution failed: {str(e)}'}
    
    def _extract_sources_from_messages(self, messages: List[Any]) -> List[str]:
        """Extract information sources from agent messages"""
        sources = []
        
        for message in messages:
            if hasattr(message, 'additional_kwargs') and message.additional_kwargs:
                # Look for function calls or tool usage
                if 'function_call' in message.additional_kwargs:
                    function_name = message.additional_kwargs['function_call'].get('name')
                    if function_name:
                        sources.append(f"tool:{function_name}")
        
        return sources
    
    async def _enrich_context(self, user_id: str, base_context: Dict[str, Any]) -> Dict[str, Any]:
        """Enrich context with user preferences and history"""
        try:
            # Get user memories and preferences
            user_memories = await self.memory.get_relevant_memories(user_id, base_context.get('query', ''))
            user_preferences = await self.memory.get_user_preferences(user_id)
            
            # Build enriched context
            enriched = {
                **base_context,
                'user_id': user_id,
                'timestamp': datetime.now().isoformat(),
                'memories': user_memories[:5],  # Limit to 5 most relevant
                'preferences': user_preferences,
                'location': base_context.get('location', {}),
                'current_page': base_context.get('current_page', ''),
                'session_data': base_context.get('session_data', {})
            }
            
            return enriched
            
        except Exception as e:
            logger.warning(f"Context enrichment failed: {e}")
            # Return base context if enrichment fails
            return {
                **base_context,
                'user_id': user_id,
                'timestamp': datetime.now().isoformat()
            }
    
    def _build_system_prompt(self, context: Dict[str, Any]) -> str:
        """Build system prompt with context awareness"""
        
        base_prompt = """You are PAM (Personal AI Assistant), an intelligent travel companion for Grey Nomads in Australia. 
        
You help users with:
- Expense tracking and budget management
- Trip planning and route optimization
- Finding campgrounds and accommodations
- Vehicle maintenance reminders
- Community connections and events
- Local recommendations and insights

You have access to specialized tools for these tasks. Always use the appropriate tools when users ask for help with expenses, trip planning, or budget analysis.

Be conversational, helpful, and specific to Australian travel and Grey Nomad lifestyle. Provide practical, actionable advice."""

        # Add context information
        if context.get('location'):
            location_info = context['location']
            base_prompt += f"\n\nUser's current location: {location_info.get('latitude', 'unknown')}, {location_info.get('longitude', 'unknown')}"
        
        if context.get('preferences'):
            preferences = context['preferences']
            base_prompt += f"\n\nUser preferences: {', '.join([f'{k}: {v}' for k, v in preferences.items()][:3])}"
        
        if context.get('memories'):
            memories = context['memories'][:3]  # Most relevant memories
            if memories:
                memory_summaries = []
                for memory in memories:
                    memory_type = memory.get('type', 'memory')
                    content = memory.get('content', '')
                    relevance = memory.get('relevance_score', 0)
                    if content:
                        summary = f"{memory_type}: {content[:120]}... (relevance: {relevance:.2f})"
                        memory_summaries.append(summary)
                
                if memory_summaries:
                    base_prompt += f"\n\nRelevant memories:\n" + "\n".join([f"- {summary}" for summary in memory_summaries])
        
        return base_prompt
    
    async def get_capabilities(self) -> List[str]:
        """Get list of all agent capabilities"""
        base_capabilities = [
            "expense_tracking",
            "budget_analysis", 
            "trip_planning",
            "route_optimization",
            "accommodation_search",
            "travel_recommendations",
            "community_connections",
            "vehicle_maintenance_tracking"
        ]
        
        # Add multi-agent capabilities if available
        if self.multi_agent_coordinator:
            coordinator_status = await self.multi_agent_coordinator.get_coordination_status()
            multi_agent_capabilities = [
                "multi_agent_coordination",
                "specialized_domain_routing",
                "parallel_agent_collaboration",
                "response_synthesis"
            ]
            base_capabilities.extend(multi_agent_capabilities)
        
        # Add proactive intelligence capabilities if available
        if self.proactive_coordinator:
            proactive_capabilities = [
                "proactive_monitoring",
                "predictive_assistance",
                "context_awareness",
                "background_intelligence",
                "enhanced_voice_interaction"
            ]
            base_capabilities.extend(proactive_capabilities)
        
        return base_capabilities
    
    async def get_proactive_suggestions(
        self,
        user_id: str,
        current_query: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """Get proactive suggestions for a user (Phase 4)"""
        
        if not self.proactive_coordinator or not is_feature_enabled("ENABLE_PAM_PROACTIVE_INTELLIGENCE", user_id):
            return []
        
        try:
            suggestions = await self.proactive_coordinator.get_proactive_suggestions(
                user_id, current_query
            )
            
            # Convert to API format
            return [
                {
                    "content": suggestion.content,
                    "type": suggestion.type,
                    "priority": suggestion.priority.name.lower(),
                    "confidence": suggestion.confidence,
                    "sources": suggestion.sources,
                    "requires_action": suggestion.requires_action,
                    "voice_optimized": suggestion.voice_optimized
                }
                for suggestion in suggestions
            ]
            
        except Exception as e:
            logger.error(f"Failed to get proactive suggestions: {e}")
            return []
    
    async def start_proactive_session(
        self,
        user_id: str,
        mode: str = "reactive",
        initial_context: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Start a proactive intelligence session (Phase 4)"""
        
        if not self.proactive_coordinator or not is_feature_enabled("ENABLE_PAM_PROACTIVE_INTELLIGENCE", user_id):
            return {"error": "Proactive intelligence not available"}
        
        try:
            # Convert string mode to enum
            proactive_mode = ProactiveMode(mode.lower())
            
            session = await self.proactive_coordinator.start_proactive_session(
                user_id, proactive_mode, initial_context
            )
            
            return {
                "user_id": session.user_id,
                "mode": session.mode.value,
                "started_at": session.started_at.isoformat(),
                "status": "active"
            }
            
        except Exception as e:
            logger.error(f"Failed to start proactive session: {e}")
            return {"error": str(e)}
    
    async def get_proactive_session_status(self, user_id: str) -> Optional[Dict[str, Any]]:
        """Get proactive session status (Phase 4)"""
        
        if not self.proactive_coordinator:
            return None
        
        try:
            return await self.proactive_coordinator.get_session_status(user_id)
            
        except Exception as e:
            logger.error(f"Failed to get proactive session status: {e}")
            return None
    
    async def end_proactive_session(self, user_id: str) -> bool:
        """End proactive session (Phase 4)"""
        
        if not self.proactive_coordinator:
            return False
        
        try:
            return await self.proactive_coordinator.end_proactive_session(user_id)
            
        except Exception as e:
            logger.error(f"Failed to end proactive session: {e}")
            return False
    
    async def process_voice_interaction(
        self,
        user_id: str,
        voice_input: str,
        context: Dict[str, Any],
        detected_emotion: Optional[str] = None,
        voice_context: Optional[str] = None
    ) -> Dict[str, Any]:
        """Process voice interaction with proactive intelligence (Phase 4)"""
        
        if not self.proactive_coordinator or not is_feature_enabled("ENABLE_PAM_PROACTIVE_INTELLIGENCE", user_id):
            # Fallback to regular text processing
            result = await self.process_message(voice_input, user_id, context)
            return {
                "content": result.content,
                "voice_optimized": False,
                "type": "response"
            }
        
        try:
            # Convert voice context string to enum if provided
            from .proactive.voice_enhanced import VoiceContext
            vc = None
            if voice_context:
                try:
                    vc = VoiceContext(voice_context.lower())
                except ValueError:
                    logger.warning(f"Unknown voice context: {voice_context}")
            
            proactive_response = await self.proactive_coordinator.process_voice_interaction(
                user_id, voice_input, context, detected_emotion, vc
            )
            
            return {
                "content": proactive_response.content,
                "type": proactive_response.type,
                "priority": proactive_response.priority.name.lower(),
                "confidence": proactive_response.confidence,
                "voice_optimized": proactive_response.voice_optimized,
                "requires_action": proactive_response.requires_action,
                "context_used": proactive_response.context_used
            }
            
        except Exception as e:
            logger.error(f"Failed to process voice interaction: {e}")
            # Fallback to regular processing
            result = await self.process_message(voice_input, user_id, context)
            return {
                "content": result.content,
                "voice_optimized": False,
                "type": "response",
                "error": str(e)
            }
    
    async def health_check(self) -> Dict[str, Any]:
        """Health check for the agent system"""
        try:
            # Test basic agent functionality
            test_result = await self.process_message(
                "Hello, are you working?",
                "health_check_user",
                {"test": True}
            )
            
            return {
                "status": "healthy" if test_result.success else "degraded",
                "agent_initialized": self.main_agent is not None,
                "tools_available": len(self.tool_registry.get_all_tools()),
                "memory_enabled": self.memory is not None,
                "last_test_success": test_result.success,
                "test_response_time_ms": test_result.execution_time_ms
            }
            
        except Exception as e:
            return {
                "status": "unhealthy",
                "error": str(e),
                "agent_initialized": False
            }