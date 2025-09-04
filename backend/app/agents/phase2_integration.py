"""
Phase 2 Integration for LangGraph
Bridges the Phase 2 memory system with existing LangGraph agents
"""

from typing import Dict, Any, Optional, List
from langchain_core.messages import HumanMessage, AIMessage, SystemMessage
from langchain_openai import ChatOpenAI
from langgraph.prebuilt import create_react_agent
from langgraph.checkpoint.memory import MemorySaver
import asyncio
import time
import logging
from datetime import datetime
import os

from .base import PAMAgentConfig, PAMAgentResult, PAMBaseAgent
from .tools import PAMToolRegistry
from .enhanced_tools import EnhancedPAMToolRegistry, integrate_with_existing_tools
from .memory import PAMAgentMemory

logger = logging.getLogger(__name__)


class Phase2EnhancedOrchestrator:
    """
    Enhanced orchestrator that combines existing LangGraph agents with Phase 2 memory intelligence
    """
    
    def __init__(self, openai_api_key: str):
        self.openai_api_key = openai_api_key
        
        # Initialize registries
        self.legacy_tool_registry = PAMToolRegistry()
        self.enhanced_tool_registry = EnhancedPAMToolRegistry()
        
        # Initialize memory systems
        self.legacy_memory = PAMAgentMemory(openai_api_key)
        
        # Initialize checkpointer for conversation persistence
        self.checkpointer = MemorySaver()
        
        # Initialize the Phase 2 enhanced agent
        self.enhanced_agent = None
        self._initialize_enhanced_agent()
    
    def _initialize_enhanced_agent(self):
        """Initialize the Phase 2 enhanced ReAct agent"""
        try:
            # Create ChatOpenAI model with optimized settings
            model = ChatOpenAI(
                api_key=self.openai_api_key,
                model="gpt-4o",  # Use latest GPT-4 variant
                temperature=0.1,  # Low temperature for consistent reasoning
                max_tokens=4000,
                timeout=30.0
            )
            
            # Get existing tools
            existing_tools = self.legacy_tool_registry.get_all_tools()
            
            # Integrate with enhanced tools
            all_tools = integrate_with_existing_tools(existing_tools)
            
            # Create enhanced ReAct agent
            self.enhanced_agent = create_react_agent(
                model=model,
                tools=all_tools,
                checkpointer=self.checkpointer,
                interrupt_before=None,  # No interruptions for smooth flow
                interrupt_after=None
            )
            
            logger.info(f"Phase 2 Enhanced Agent initialized with {len(all_tools)} tools")
            
        except Exception as e:
            logger.error(f"Failed to initialize Phase 2 Enhanced Agent: {e}")
            raise
    
    async def process_with_memory_enhancement(
        self,
        message: str,
        user_id: str,
        context: Dict[str, Any] = None,
        conversation_id: Optional[str] = None
    ) -> PAMAgentResult:
        """
        Process message with Phase 2 memory enhancement
        
        Args:
            message: User's message
            user_id: User identifier
            context: Additional context
            conversation_id: Conversation thread ID
        
        Returns:
            Enhanced PAM agent result
        """
        start_time = time.time()
        
        try:
            # Step 1: Classify intent using enhanced system
            intent_classification = await self._classify_intent_enhanced(
                message=message,
                user_id=user_id,
                context=context or {}
            )
            
            # Step 2: Enrich context with Phase 2 memory system and intent
            enriched_context = await self._enrich_context_phase2(
                user_id=user_id,
                message=message,
                context=context or {},
                intent_classification=intent_classification
            )
            
            # Step 3: Search relevant memories using intent-aware search
            relevant_memories = await self._search_relevant_memories(
                user_id=user_id,
                query=message,
                context=enriched_context,
                intent=intent_classification.intent.value if intent_classification else None
            )
            
            # Step 4: Route to specialized handler if needed
            handler_result = None
            if intent_classification and intent_classification.confidence > 0.8:
                handler_result = await self._route_to_specialized_handler(
                    message=message,
                    user_id=user_id,
                    classification=intent_classification,
                    context=enriched_context
                )
            
            # Step 5: Build enhanced system prompt
            system_prompt = self._build_enhanced_system_prompt(
                enriched_context,
                relevant_memories,
                intent_classification,
                handler_result
            )
            
            # Step 4: Create conversation thread
            thread_id = conversation_id or f"{user_id}_{int(time.time())}"
            
            # Step 5: Prepare enhanced agent input
            agent_input = {
                "messages": [
                    SystemMessage(content=system_prompt),
                    HumanMessage(content=message)
                ]
            }
            
            # Step 6: Configure agent execution
            config = {
                "configurable": {"thread_id": thread_id},
                "recursion_limit": 50,  # Allow for complex reasoning
                "max_execution_time": 60  # 60 second timeout
            }
            
            # Step 7: Execute enhanced agent
            logger.info(f"Executing Phase 2 enhanced agent for user {user_id}")
            result = await self._execute_enhanced_agent(agent_input, config)
            
            # Step 8: Store interaction in Phase 2 memory
            await self._store_enhanced_interaction(
                user_id=user_id,
                user_message=message,
                agent_response=result.content,
                context=enriched_context,
                execution_metadata=result.metadata
            )
            
            # Step 9: Learn from interaction
            await self._learn_from_interaction(
                user_id=user_id,
                message=message,
                response=result.content,
                context=enriched_context
            )
            
            # Step 10: Return enhanced result
            execution_time = int((time.time() - start_time) * 1000)
            result.execution_time_ms = execution_time
            result.metadata["phase2_enhanced"] = True
            result.metadata["memory_enhanced"] = True
            result.metadata["context_enriched"] = True
            
            logger.info(f"Phase 2 enhanced processing completed in {execution_time}ms")
            return result
            
        except Exception as e:
            logger.error(f"Phase 2 enhanced processing failed: {e}")
            
            # Fallback to standard processing
            return await self._fallback_processing(message, user_id, context)
    
    async def _classify_intent_enhanced(
        self,
        message: str,
        user_id: str,
        context: Dict[str, Any]
    ):
        """Classify intent using enhanced intent classification system"""
        try:
            from ..services.pam.intent_classifier import get_intent_classifier
            
            classifier = get_intent_classifier()
            classification = await classifier.classify_intent(
                message=message,
                user_id=user_id,
                context=context
            )
            
            logger.info(f"Intent classified: {classification.intent.value} (confidence: {classification.confidence:.2f})")
            return classification
            
        except Exception as e:
            logger.error(f"Enhanced intent classification failed: {e}")
            return None
    
    async def _route_to_specialized_handler(
        self,
        message: str,
        user_id: str,
        classification,
        context: Dict[str, Any]
    ) -> Optional[Dict[str, Any]]:
        """Route to specialized handler based on intent"""
        try:
            from ..services.pam.intent_handlers import get_intent_router
            
            router = get_intent_router()
            handler_result = await router.route_intent(
                message=message,
                user_id=user_id,
                classification=classification,
                context=context
            )
            
            logger.info(f"Handler result from {handler_result.get('handler', 'unknown')}: {handler_result.get('message', 'No message')[:100]}...")
            return handler_result
            
        except Exception as e:
            logger.error(f"Handler routing failed: {e}")
            return None
    
    async def _enrich_context_phase2(
        self, 
        user_id: str, 
        message: str, 
        context: Dict[str, Any],
        intent_classification=None
    ) -> Dict[str, Any]:
        """Enrich context using Phase 2 intelligence"""
        try:
            # Use enhanced context enrichment tool
            from .enhanced_tools import enhanced_context_enrichment_tool, ContextEnrichmentInput
            
            enrichment_result = await enhanced_context_enrichment_tool(
                ContextEnrichmentInput(
                    user_message=message,
                    current_page=context.get("current_page", "/"),
                    additional_context=context
                )
            )
            
            if enrichment_result["success"]:
                enrichment_details = enrichment_result["enrichment_details"]
                
                # Merge enriched understanding with existing context
                enriched = {
                    **context,
                    "user_id": user_id,
                    "timestamp": datetime.now().isoformat(),
                    "detected_intent": enrichment_details["detected_intent"],
                    "confidence": enrichment_details["confidence"],
                    "context_clues": enrichment_details["context_clues"],
                    "suggested_actions": enrichment_details["suggested_actions"],
                    "processing_time_ms": enrichment_details["processing_time_ms"],
                    "phase2_enriched": True
                }
                
                # Add intent classification if available
                if intent_classification:
                    enriched.update({
                        "intent_classification": {
                            "intent": intent_classification.intent.value,
                            "confidence": intent_classification.confidence,
                            "entities": [e.__dict__ for e in intent_classification.entities],
                            "requires_clarification": intent_classification.requires_clarification,
                            "suggested_handler": intent_classification.suggested_handler
                        }
                    })
                
                logger.info(f"Context enriched with intent: {enriched['detected_intent']} (confidence: {enriched['confidence']})")
                return enriched
            else:
                logger.warning("Context enrichment failed, using basic context")
                return {**context, "user_id": user_id, "timestamp": datetime.now().isoformat()}
                
        except Exception as e:
            logger.error(f"Context enrichment error: {e}")
            return {**context, "user_id": user_id, "timestamp": datetime.now().isoformat()}
    
    async def _search_relevant_memories(
        self,
        user_id: str,
        query: str,
        context: Dict[str, Any],
        intent: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """Search for relevant memories using Phase 2 system"""
        try:
            # Use enhanced memory search tool
            from .enhanced_tools import enhanced_memory_search_tool, MemorySearchInput
            
            # Determine memory types based on intent and context
            memory_types = ["episodic", "semantic"]
            search_intent = intent or context.get("detected_intent", "general")
            
            if search_intent in ["trip_planning", "route_optimization"]:
                memory_types.append("working")  # Include recent planning sessions
            elif search_intent == "expense_tracking":
                # Focus on financial memories
                memory_types = ["episodic", "semantic"]
            
            # Enhance query with intent context
            enhanced_query = query
            if intent:
                enhanced_query = f"{intent}: {query}"
            
            search_result = await enhanced_memory_search_tool(
                MemorySearchInput(
                    query=enhanced_query,
                    memory_types=memory_types,
                    max_results=5,
                    similarity_threshold=0.7
                )
            )
            
            if search_result["success"]:
                memories = search_result["results"]
                logger.info(f"Found {len(memories)} relevant memories")
                return memories
            else:
                logger.warning("Memory search failed, proceeding without memories")
                return []
                
        except Exception as e:
            logger.error(f"Memory search error: {e}")
            return []
    
    def _build_enhanced_system_prompt(
        self,
        context: Dict[str, Any],
        memories: List[Dict[str, Any]],
        intent_classification=None,
        handler_result: Optional[Dict[str, Any]] = None
    ) -> str:
        """Build enhanced system prompt with memory integration"""
        
        # Base system prompt
        base_prompt = """You are PAM, an intelligent AI assistant for Wheels & Wins, specializing in:
- Trip planning and route optimization for RV/caravan travel
- Expense tracking and budget management  
- Travel recommendations and campground suggestions
- Vehicle maintenance and travel tips

You have access to enhanced memory and context understanding capabilities."""
        
        # Add context information
        context_info = ""
        if context.get("detected_intent"):
            context_info += f"\n\nCurrent user intent: {context['detected_intent']}"
            context_info += f"\nConfidence level: {context.get('confidence', 0):.2f}"
        
        if context.get("current_page"):
            context_info += f"\nUser is currently on: {context['current_page']}"
        
        # Add intent classification information
        intent_info = ""
        if intent_classification:
            intent_info += f"\n\nUser Intent Analysis:"
            intent_info += f"\nDetected Intent: {intent_classification.intent.value}"
            intent_info += f"\nConfidence: {intent_classification.confidence:.2f}"
            
            if intent_classification.entities:
                intent_info += f"\nExtracted Entities:"
                for entity in intent_classification.entities[:5]:  # Limit to 5 entities
                    intent_info += f"\n- {entity.type}: {entity.value}"
            
            if intent_classification.requires_clarification:
                intent_info += f"\nNOTE: This request may need clarification"
        
        # Add handler results if available
        handler_info = ""
        if handler_result:
            handler_info += f"\n\nSpecialized Handler Insights:"
            handler_info += f"\nHandler: {handler_result.get('handler', 'unknown')}"
            if handler_result.get('suggested_actions'):
                handler_info += f"\nSuggested Actions: {', '.join(handler_result['suggested_actions'][:3])}"
            if handler_result.get('data'):
                handler_info += f"\nRelevant Data Available: Yes"

        # Add relevant memories
        memory_info = ""
        if memories:
            memory_info += f"\n\nRelevant memories from previous interactions ({len(memories)} found):"
            for i, memory in enumerate(memories[:3]):  # Show top 3 memories
                memory_info += f"\n{i+1}. {memory.get('content', 'Memory content')}"
                if memory.get('similarity_score'):
                    memory_info += f" (similarity: {memory['similarity_score']:.2f})"
        
        # Add capabilities information
        capabilities_info = """

Enhanced Capabilities:
- Search and recall previous conversations and preferences
- Learn from user interactions to provide personalized assistance
- Enrich understanding with contextual awareness
- Store important information for future reference

Use these capabilities proactively to provide the most helpful and personalized assistance."""
        
        # Combine all parts
        full_prompt = base_prompt + context_info + intent_info + handler_info + memory_info + capabilities_info
        
        return full_prompt
    
    async def _execute_enhanced_agent(
        self, 
        agent_input: Dict[str, Any], 
        config: Dict[str, Any]
    ) -> PAMAgentResult:
        """Execute the enhanced agent with proper error handling"""
        try:
            # Execute the agent
            response = await self.enhanced_agent.ainvoke(agent_input, config)
            
            # Extract the final response
            final_message = None
            for msg in reversed(response["messages"]):
                if isinstance(msg, AIMessage):
                    final_message = msg.content
                    break
            
            if not final_message:
                final_message = "I apologize, but I couldn't generate a proper response. Please try again."
            
            # Create result
            result = PAMAgentResult(
                content=final_message,
                success=True,
                agent_used="phase2_enhanced_agent",
                confidence=0.8,
                metadata={
                    "tool_calls": len([msg for msg in response["messages"] if hasattr(msg, "tool_calls") and msg.tool_calls]),
                    "message_count": len(response["messages"]),
                    "thread_id": config["configurable"]["thread_id"],
                    "phase2_enhanced": True
                }
            )
            
            return result
            
        except Exception as e:
            logger.error(f"Enhanced agent execution failed: {e}")
            
            # Return error result
            return PAMAgentResult(
                content=f"I encountered an error while processing your request: {str(e)}",
                success=False,
                agent_used="phase2_enhanced_agent",
                confidence=0.0,
                metadata={"error": str(e), "phase2_enhanced": True}
            )
    
    async def _store_enhanced_interaction(
        self,
        user_id: str,
        user_message: str,
        agent_response: str,
        context: Dict[str, Any],
        execution_metadata: Dict[str, Any]
    ):
        """Store the interaction using Phase 2 memory system"""
        try:
            # Use enhanced memory storage tool
            from .enhanced_tools import enhanced_memory_store_tool, MemoryStoreInput
            
            interaction_content = {
                "user_message": user_message,
                "agent_response": agent_response,
                "detected_intent": context.get("detected_intent", "general"),
                "confidence": context.get("confidence", 0.5),
                "context_clues": context.get("context_clues", []),
                "interaction_timestamp": datetime.now().isoformat(),
                "execution_metadata": execution_metadata
            }
            
            store_result = await enhanced_memory_store_tool(
                MemoryStoreInput(
                    content=interaction_content,
                    memory_type="episodic",  # Conversations are episodic
                    importance=min(0.8, context.get("confidence", 0.5) + 0.3),
                    tags=["conversation", context.get("detected_intent", "general"), "phase2_enhanced"],
                    context={
                        "user_id": user_id,
                        "current_page": context.get("current_page"),
                        "enhanced_processing": True
                    }
                )
            )
            
            if store_result["success"]:
                logger.info(f"Stored enhanced interaction: {store_result['memory_id']}")
            else:
                logger.warning(f"Failed to store interaction: {store_result['message']}")
                
        except Exception as e:
            logger.error(f"Failed to store enhanced interaction: {e}")
    
    async def _learn_from_interaction(
        self,
        user_id: str,
        message: str,
        response: str,
        context: Dict[str, Any]
    ):
        """Learn preferences from the interaction"""
        try:
            # Extract learnable preferences
            detected_intent = context.get("detected_intent", "general")
            confidence = context.get("confidence", 0.5)
            
            # Only learn from high-confidence interactions
            if confidence > 0.7:
                # Use enhanced preference learning tool
                from .enhanced_tools import enhanced_preference_learning_tool, PreferenceLearningInput
                
                learn_result = await enhanced_preference_learning_tool(
                    PreferenceLearningInput(
                        category="communication",
                        preference_key="preferred_interaction_type",
                        preference_value=detected_intent,
                        confidence=confidence,
                        source="conversation_analysis"
                    )
                )
                
                if learn_result["success"]:
                    logger.info(f"Learned preference: {learn_result['preference_details']}")
                else:
                    logger.warning(f"Failed to learn preference: {learn_result['message']}")
                    
        except Exception as e:
            logger.error(f"Failed to learn from interaction: {e}")
    
    async def _fallback_processing(
        self,
        message: str,
        user_id: str,
        context: Dict[str, Any] = None
    ) -> PAMAgentResult:
        """Fallback to basic processing if enhanced processing fails"""
        try:
            logger.info("Using fallback processing")
            
            # Simple response generation
            return PAMAgentResult(
                content=f"I understand you're asking about: {message}. I'm here to help with trip planning, expense tracking, and travel recommendations. Could you please provide more details about what you need assistance with?",
                success=True,
                agent_used="fallback_agent",
                confidence=0.5,
                metadata={"fallback_used": True, "reason": "enhanced_processing_failed"}
            )
            
        except Exception as e:
            logger.error(f"Even fallback processing failed: {e}")
            
            return PAMAgentResult(
                content="I'm experiencing technical difficulties. Please try again in a moment.",
                success=False,
                agent_used="fallback_agent",
                confidence=0.0,
                metadata={"error": str(e), "fallback_failed": True}
            )


# Export for integration
def create_phase2_enhanced_orchestrator(openai_api_key: str) -> Phase2EnhancedOrchestrator:
    """Create and return Phase 2 enhanced orchestrator"""
    return Phase2EnhancedOrchestrator(openai_api_key)


def integrate_phase2_with_existing(existing_orchestrator, openai_api_key: str):
    """
    Integrate Phase 2 capabilities with existing orchestrator
    
    Args:
        existing_orchestrator: Current PAM orchestrator
        openai_api_key: OpenAI API key
    
    Returns:
        Enhanced orchestrator with Phase 2 capabilities
    """
    try:
        # Create Phase 2 orchestrator
        phase2_orchestrator = create_phase2_enhanced_orchestrator(openai_api_key)
        
        # Add Phase 2 method to existing orchestrator
        existing_orchestrator.process_with_phase2_enhancement = phase2_orchestrator.process_with_memory_enhancement
        existing_orchestrator.phase2_orchestrator = phase2_orchestrator
        
        logger.info("Successfully integrated Phase 2 capabilities with existing orchestrator")
        return existing_orchestrator
        
    except Exception as e:
        logger.error(f"Failed to integrate Phase 2 capabilities: {e}")
        return existing_orchestrator