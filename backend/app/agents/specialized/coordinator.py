"""
PAM Agent Coordinator - Manages multi-agent collaboration and request routing
"""

import asyncio
import logging
from typing import Dict, Any, List, Optional, Tuple
from datetime import datetime
from dataclasses import dataclass

from ..base import PAMAgentConfig, PAMAgentResult
from ..memory import PAMAgentMemory
from .travel_agent import PAMTravelAgent
from .finance_agent import PAMFinanceAgent  
from .social_agent import PAMSocialAgent

logger = logging.getLogger(__name__)


@dataclass
class AgentCapabilityScore:
    """Score and metadata for an agent's ability to handle a request"""
    agent_name: str
    confidence_score: float
    capabilities_matched: List[str]
    reasoning: str


class PAMAgentCoordinator:
    """
    Coordinates multiple specialized PAM agents to provide comprehensive assistance
    Handles request routing, agent collaboration, and response synthesis
    """
    
    def __init__(self, config: PAMAgentConfig, memory: PAMAgentMemory):
        self.config = config
        self.memory = memory
        self.agents: Dict[str, Any] = {}
        
        # Initialize specialized agents
        self._initialize_agents()
        
        logger.info(f"PAM Agent Coordinator initialized with {len(self.agents)} specialized agents")
    
    def _initialize_agents(self):
        """Initialize all specialized agents"""
        try:
            # Initialize Travel Agent
            self.agents['travel'] = PAMTravelAgent(self.config, self.memory)
            logger.info("Travel agent initialized")
            
            # Initialize Finance Agent  
            self.agents['finance'] = PAMFinanceAgent(self.config, self.memory)
            logger.info("Finance agent initialized")
            
            # Initialize Social Agent
            self.agents['social'] = PAMSocialAgent(self.config, self.memory)
            logger.info("Social agent initialized")
            
        except Exception as e:
            logger.error(f"Failed to initialize specialized agents: {e}")
            raise
    
    async def process_request(
        self, 
        user_message: str, 
        context: Dict[str, Any]
    ) -> PAMAgentResult:
        """
        Process user request through the most appropriate agent(s)
        """
        try:
            # Analyze request to determine best agent(s)
            agent_scores = await self._analyze_request_for_agents(user_message, context)
            
            if not agent_scores:
                return PAMAgentResult(
                    success=False,
                    content="Unable to determine appropriate agent for request",
                    metadata={'error': 'No agent scoring available'},
                    confidence=0.0,
                    sources=[],
                    agent_used='coordinator',
                    execution_time_ms=0,
                    tool_calls=[]
                )
            
            # Sort agents by confidence score
            agent_scores.sort(key=lambda x: x.confidence_score, reverse=True)
            best_agent = agent_scores[0]
            
            logger.info(f"Selected {best_agent.agent_name} agent (confidence: {best_agent.confidence_score:.2f})")
            
            # Check if we should use multiple agents (high scores from multiple agents)
            multi_agent_threshold = 0.7
            multi_agents = [score for score in agent_scores if score.confidence_score >= multi_agent_threshold]
            
            if len(multi_agents) > 1:
                logger.info(f"Multi-agent collaboration: {len(multi_agents)} agents above threshold")
                return await self._process_multi_agent_request(user_message, context, multi_agents)
            else:
                # Single agent processing
                return await self._process_single_agent_request(user_message, context, best_agent)
                
        except Exception as e:
            logger.error(f"Coordinator processing error: {e}")
            return PAMAgentResult(
                success=False,
                content=f"Agent coordinator encountered an error: {str(e)}",
                metadata={'error': str(e), 'coordinator': 'multi_agent'},
                confidence=0.0,
                sources=[],
                agent_used='coordinator',
                execution_time_ms=0,
                tool_calls=[]
            )
    
    async def _analyze_request_for_agents(
        self, 
        user_message: str, 
        context: Dict[str, Any]
    ) -> List[AgentCapabilityScore]:
        """
        Analyze user request and score each agent's capability to handle it
        """
        agent_scores = []
        
        try:
            # Get capability scores from each agent
            for agent_name, agent in self.agents.items():
                if hasattr(agent, 'can_handle_request'):
                    confidence = await agent.can_handle_request(user_message, context)
                    
                    # Get agent expertise info
                    expertise = agent.get_domain_expertise()
                    
                    # Determine reasoning
                    reasoning = self._generate_scoring_reasoning(
                        agent_name, confidence, user_message, expertise
                    )
                    
                    agent_scores.append(AgentCapabilityScore(
                        agent_name=agent_name,
                        confidence_score=confidence,
                        capabilities_matched=expertise.get('capabilities', []),
                        reasoning=reasoning
                    ))
            
            # Log scoring results
            for score in agent_scores:
                logger.debug(f"Agent {score.agent_name}: {score.confidence_score:.2f} - {score.reasoning}")
            
            return agent_scores
            
        except Exception as e:
            logger.error(f"Error analyzing request for agents: {e}")
            return []
    
    def _generate_scoring_reasoning(
        self, 
        agent_name: str, 
        confidence: float, 
        user_message: str, 
        expertise: Dict[str, Any]
    ) -> str:
        """Generate human-readable reasoning for agent scoring"""
        
        if confidence >= 0.9:
            return f"High confidence - request strongly matches {agent_name} domain expertise"
        elif confidence >= 0.7:
            return f"Good match - request contains key {agent_name} concepts"
        elif confidence >= 0.5:
            return f"Moderate match - some {agent_name} elements detected"
        elif confidence >= 0.3:
            return f"Low match - minimal {agent_name} relevance"
        else:
            return f"No match - request not relevant to {agent_name} domain"
    
    async def _process_single_agent_request(
        self, 
        user_message: str, 
        context: Dict[str, Any],
        agent_score: AgentCapabilityScore
    ) -> PAMAgentResult:
        """Process request using single best agent"""
        try:
            agent = self.agents[agent_score.agent_name]
            
            # Add coordination metadata to context
            context['coordination'] = {
                'selected_agent': agent_score.agent_name,
                'confidence_score': agent_score.confidence_score,
                'selection_reasoning': agent_score.reasoning,
                'multi_agent': False
            }
            
            # Process request through selected agent
            result = await agent.process_request(user_message, context)
            
            # Enhance result with coordination metadata
            if result.metadata:
                result.metadata.update(context['coordination'])
            else:
                result.metadata = context['coordination']
            
            return result
            
        except Exception as e:
            logger.error(f"Single agent processing error: {e}")
            return PAMAgentResult(
                success=False,
                content=f"Selected agent ({agent_score.agent_name}) encountered an error",
                metadata={'error': str(e), 'selected_agent': agent_score.agent_name},
                confidence=0.0,
                sources=[],
                agent_used=agent_score.agent_name,
                execution_time_ms=0,
                tool_calls=[]
            )
    
    async def _process_multi_agent_request(
        self, 
        user_message: str, 
        context: Dict[str, Any],
        agent_scores: List[AgentCapabilityScore]
    ) -> PAMAgentResult:
        """Process request using multiple agents and synthesize responses"""
        try:
            start_time = datetime.utcnow()
            
            # Process request through multiple agents concurrently
            agent_tasks = []
            for agent_score in agent_scores:
                agent = self.agents[agent_score.agent_name]
                
                # Add multi-agent context
                agent_context = context.copy()
                agent_context['coordination'] = {
                    'multi_agent': True,
                    'agent_role': agent_score.agent_name,
                    'confidence': agent_score.confidence_score,
                    'collaboration_agents': [s.agent_name for s in agent_scores]
                }
                
                task = agent.process_request(user_message, agent_context)
                agent_tasks.append((agent_score.agent_name, task))
            
            # Wait for all agents to complete
            agent_results = {}
            for agent_name, task in agent_tasks:
                try:
                    result = await task
                    agent_results[agent_name] = result
                    logger.info(f"Multi-agent: {agent_name} completed successfully: {result.success}")
                except Exception as e:
                    logger.warning(f"Multi-agent: {agent_name} failed: {e}")
                    agent_results[agent_name] = PAMAgentResult(
                        success=False,
                        content=f"Agent error: {str(e)}",
                        metadata={'error': str(e)},
                        confidence=0.0,
                        sources=[],
                        agent_used=agent_name,
                        execution_time_ms=0,
                        tool_calls=[]
                    )
            
            # Synthesize multi-agent responses
            synthesized_result = await self._synthesize_multi_agent_responses(
                user_message, context, agent_results, agent_scores
            )
            
            execution_time = int((datetime.utcnow() - start_time).total_seconds() * 1000)
            synthesized_result.execution_time_ms = execution_time
            
            return synthesized_result
            
        except Exception as e:
            logger.error(f"Multi-agent processing error: {e}")
            return PAMAgentResult(
                success=False,
                content=f"Multi-agent coordination encountered an error: {str(e)}",
                metadata={'error': str(e), 'coordination': 'multi_agent_failed'},
                confidence=0.0,
                sources=[],
                agent_used='multi_agent_coordinator',
                execution_time_ms=0,
                tool_calls=[]
            )
    
    async def _synthesize_multi_agent_responses(
        self, 
        user_message: str,
        context: Dict[str, Any],
        agent_results: Dict[str, PAMAgentResult],
        agent_scores: List[AgentCapabilityScore]
    ) -> PAMAgentResult:
        """Synthesize responses from multiple agents into coherent answer"""
        
        successful_results = {k: v for k, v in agent_results.items() if v.success}
        
        if not successful_results:
            return PAMAgentResult(
                success=False,
                content="All agents failed to process the request successfully",
                metadata={
                    'multi_agent': True,
                    'failed_agents': list(agent_results.keys()),
                    'errors': {k: v.metadata.get('error', 'Unknown') for k, v in agent_results.items()}
                },
                confidence=0.0,
                sources=[],
                agent_used='multi_agent_coordinator',
                execution_time_ms=0,
                tool_calls=[]
            )
        
        # Combine successful responses
        combined_content = []
        combined_sources = []
        combined_tool_calls = []
        total_confidence = 0.0
        
        # Sort by original confidence scores for response ordering
        score_lookup = {score.agent_name: score.confidence_score for score in agent_scores}
        sorted_results = sorted(
            successful_results.items(), 
            key=lambda x: score_lookup.get(x[0], 0), 
            reverse=True
        )
        
        for agent_name, result in sorted_results:
            agent_confidence = score_lookup.get(agent_name, 0)
            
            # Weight content by confidence
            if result.content and result.content.strip():
                section_header = f"\n## {agent_name.title()} Perspective (confidence: {agent_confidence:.1f}):\n"
                combined_content.append(section_header + result.content)
            
            # Combine metadata
            combined_sources.extend(result.sources or [])
            combined_tool_calls.extend(result.tool_calls or [])
            total_confidence += result.confidence * agent_confidence
        
        # Normalize confidence
        total_agents = len(successful_results)
        normalized_confidence = min(total_confidence / total_agents, 1.0) if total_agents > 0 else 0.0
        
        # Create synthesized response
        final_content = f"""I've analyzed your request from multiple perspectives:
        
{chr(10).join(combined_content)}

---
*This response combines insights from {total_agents} specialized agents to provide comprehensive assistance.*"""
        
        return PAMAgentResult(
            success=True,
            content=final_content,
            metadata={
                'multi_agent': True,
                'agents_used': list(successful_results.keys()),
                'coordination_method': 'parallel_synthesis',
                'individual_confidences': {k: v.confidence for k, v in successful_results.items()},
                'synthesis_quality': 'high' if total_agents >= 2 else 'moderate'
            },
            confidence=normalized_confidence,
            sources=list(set(combined_sources)),
            agent_used='multi_agent_coordinator',
            execution_time_ms=0,  # Will be set by caller
            tool_calls=combined_tool_calls
        )
    
    def get_available_agents(self) -> Dict[str, Dict[str, Any]]:
        """Get information about all available agents"""
        agents_info = {}
        
        for agent_name, agent in self.agents.items():
            if hasattr(agent, 'get_domain_expertise'):
                agents_info[agent_name] = agent.get_domain_expertise()
        
        return agents_info
    
    async def get_coordination_status(self) -> Dict[str, Any]:
        """Get status of the multi-agent coordination system"""
        return {
            "coordinator_active": True,
            "total_agents": len(self.agents),
            "available_agents": list(self.agents.keys()),
            "agent_details": self.get_available_agents(),
            "coordination_strategies": [
                "single_agent_routing",
                "multi_agent_collaboration",
                "parallel_synthesis",
                "confidence_based_selection"
            ],
            "memory_shared": self.memory is not None,
            "config_shared": True
        }