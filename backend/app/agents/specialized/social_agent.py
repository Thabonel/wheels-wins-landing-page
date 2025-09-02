"""
PAM Social Agent - Specialized agent for community connections and social interactions
"""

import asyncio
import logging
from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta
from langchain_core.messages import HumanMessage, AIMessage
from langchain_openai import ChatOpenAI
from langgraph.prebuilt import create_react_agent
from langgraph.checkpoint.memory import MemorySaver

from ..base import PAMBaseAgent, PAMAgentConfig, PAMAgentResult
from ..memory import PAMAgentMemory

logger = logging.getLogger(__name__)


class PAMSocialAgent(PAMBaseAgent):
    """
    Specialized agent for community connections, social interactions, and Grey Nomad networking
    """
    
    def __init__(self, config: PAMAgentConfig, memory: PAMAgentMemory):
        super().__init__(config, memory)
        self.agent_type = "social_specialist"
        self.domain = "social"
        
        # Social-specific capabilities
        self.capabilities = [
            "community_connections",
            "event_discovery",
            "meetup_coordination",
            "social_recommendations",
            "group_travel_planning",
            "local_community_integration",
            "safety_networking", 
            "experience_sharing",
            "companion_finding",
            "social_activity_suggestions"
        ]
        
        # Initialize specialized social agent
        self._initialize_social_agent()
        
        logger.info(f"PAM Social Agent initialized with {len(self.capabilities)} capabilities")
    
    def _initialize_social_agent(self):
        """Initialize the social-specific ReAct agent"""
        try:
            model = ChatOpenAI(
                api_key=self.config.openai_api_key,
                model="gpt-4",
                temperature=0.3,  # Balanced for social creativity and accuracy
                max_tokens=3000
            )
            
            # Social-specific tools (would include community APIs, event discovery, etc.)
            social_tools = []  # Will be expanded with social tools
            
            # Create specialized social agent
            self.agent = create_react_agent(
                model=model,
                tools=social_tools,
                checkpointer=MemorySaver()
            )
            
            logger.info("Social agent ReAct system initialized")
            
        except Exception as e:
            logger.error(f"Failed to initialize social agent: {e}")
            raise
    
    async def process_message(
        self, 
        message: str, 
        context: Dict[str, Any],
        user_id: str
    ) -> PAMAgentResult:
        """Process message - required by PAMBaseAgent interface"""
        return await self.process_request(message, context)
    
    async def process_request(
        self, 
        user_message: str, 
        context: Dict[str, Any]
    ) -> PAMAgentResult:
        """
        Process social and community-related requests
        """
        try:
            # Build social-specific system prompt
            system_prompt = self._build_social_system_prompt(context)
            
            # Get social context and community connections
            social_context = await self._get_social_context(
                context.get('user_id', ''), 
                user_message
            )
            
            # Create agent input with social context
            agent_input = {
                "messages": [
                    HumanMessage(content=f"{system_prompt}\n\nSocial Context:\n{social_context}\n\nUser Request: {user_message}")
                ]
            }
            
            # Execute social agent
            start_time = datetime.utcnow()
            response = await self.agent.ainvoke(
                agent_input, 
                {"configurable": {"thread_id": f"social_{context.get('user_id', 'anon')}_{int(start_time.timestamp())}"}}
            )
            
            # Process response
            execution_time = int((datetime.utcnow() - start_time).total_seconds() * 1000)
            
            if response and response.get('messages'):
                last_message = response['messages'][-1]
                content = last_message.content if hasattr(last_message, 'content') else str(last_message)
                
                return PAMAgentResult(
                    success=True,
                    content=content,
                    metadata={
                        'agent_type': self.agent_type,
                        'domain': self.domain,
                        'capabilities_used': self._extract_used_capabilities(user_message),
                        'social_context_items': len(social_context.split('\n')) if social_context else 0,
                        'community_focus': self._detect_community_focus(user_message)
                    },
                    confidence=0.9,
                    sources=['social_agent', 'community_data'],
                    agent_used=self.agent_type,
                    execution_time_ms=execution_time,
                    tool_calls=self._extract_tool_calls(response)
                )
            else:
                return PAMAgentResult(
                    success=False,
                    content="Social agent failed to generate response",
                    metadata={'error': 'No response from social agent'},
                    confidence=0.0,
                    sources=[],
                    agent_used=self.agent_type,
                    execution_time_ms=execution_time,
                    tool_calls=[]
                )
                
        except Exception as e:
            logger.error(f"Social agent processing error: {e}")
            return PAMAgentResult(
                success=False,
                content=f"Community advisor encountered an error: {str(e)}",
                metadata={'error': str(e), 'agent_type': self.agent_type},
                confidence=0.0,
                sources=[],
                agent_used=self.agent_type,
                execution_time_ms=0,
                tool_calls=[]
            )
    
    def _build_social_system_prompt(self, context: Dict[str, Any]) -> str:
        """Build social-specific system prompt"""
        
        base_prompt = """You are PAM's Community Connector, specialized in Grey Nomad social networks and community building.

Your expertise includes:
- Grey Nomad community events and gatherings
- Social meetup coordination and planning
- Safety networking and buddy systems
- Local community integration strategies
- Group travel coordination
- Experience sharing and storytelling
- Companion finding for solo travelers
- Social activity recommendations
- Community resource sharing
- Inter-generational connections

You understand:
- Grey Nomad culture and values
- Safety considerations for solo travelers
- Accessibility needs for older adults
- Regional community differences
- Seasonal gathering patterns
- Technology comfort levels
- Privacy and safety boundaries
- Cultural sensitivities

Always provide:
- Safe and appropriate social connections
- Respectful community engagement advice
- Privacy-conscious recommendations
- Age-appropriate activity suggestions
- Inclusive and welcoming approaches
- Local community insights
- Safety-first networking strategies"""

        # Add location-based community context
        if context.get('user_location'):
            base_prompt += "\n\nConsider local community characteristics and regional social patterns"
        
        # Add seasonal context for community activities
        current_season = self._get_current_season()
        base_prompt += f"\n\nCurrent season: {current_season} (consider seasonal community activities and gathering patterns)"
        
        return base_prompt
    
    async def _get_social_context(self, user_id: str, query: str) -> str:
        """Get social and community-specific context"""
        try:
            if not self.memory or not user_id:
                return ""
            
            # Get social and community related memories
            memories = await self.memory.get_relevant_memories(user_id, query, limit=5)
            
            social_context = []
            for memory in memories:
                if memory.get('type') in ['social', 'community', 'experience', 'meetup', 'connection']:
                    content = memory.get('content', '')
                    relevance = memory.get('relevance_score', 0)
                    if content and relevance > 0.5:
                        social_context.append(f"- {content[:150]} (relevance: {relevance:.2f})")
            
            # Get user social preferences
            user_prefs = await self.memory.get_user_preferences(user_id)
            social_prefs = []
            
            social_pref_keys = ['social_style', 'community_participation', 'privacy_level', 'group_size_preference']
            for key in social_pref_keys:
                if key in user_prefs and user_prefs[key]:
                    social_prefs.append(f"- {key}: {user_prefs[key]}")
            
            # Add community participation history (simulated)
            participation_history = await self._get_participation_history(user_id)
            
            # Combine context
            context_parts = []
            if social_context:
                context_parts.append("Recent Social Memories:")
                context_parts.extend(social_context)
            
            if social_prefs:
                context_parts.append("\nSocial Preferences:")
                context_parts.extend(social_prefs)
            
            if participation_history:
                context_parts.append("\nCommunity Participation:")
                context_parts.extend(participation_history)
            
            return "\n".join(context_parts) if context_parts else ""
            
        except Exception as e:
            logger.warning(f"Failed to get social context: {e}")
            return ""
    
    async def _get_participation_history(self, user_id: str) -> List[str]:
        """Get community participation patterns"""
        # This would integrate with actual community data
        # For now, return example participation patterns
        
        patterns = [
            "- Participates in evening campfire gatherings (frequent)",
            "- Prefers smaller group activities (5-10 people)",
            "- Active in community knowledge sharing",
            "- Safety-conscious about new connections"
        ]
        
        return patterns
    
    def _get_current_season(self) -> str:
        """Determine current season for community activity context"""
        month = datetime.now().month
        
        # Australian seasons
        if month in [12, 1, 2]:
            return "Summer"
        elif month in [3, 4, 5]:
            return "Autumn"  
        elif month in [6, 7, 8]:
            return "Winter"
        else:
            return "Spring"
    
    def _detect_community_focus(self, user_message: str) -> str:
        """Detect the type of community focus in the user's request"""
        message_lower = user_message.lower()
        
        if any(word in message_lower for word in ['safety', 'safe', 'security', 'protect']):
            return "safety_networking"
        elif any(word in message_lower for word in ['meet', 'connect', 'friends', 'people']):
            return "social_connection"
        elif any(word in message_lower for word in ['event', 'gathering', 'meetup', 'activity']):
            return "events_activities"
        elif any(word in message_lower for word in ['group', 'together', 'convoy', 'travel']):
            return "group_coordination"
        elif any(word in message_lower for word in ['local', 'community', 'town', 'area']):
            return "local_integration"
        else:
            return "general_social"
    
    def _extract_used_capabilities(self, user_message: str) -> List[str]:
        """Extract which social capabilities were likely used"""
        message_lower = user_message.lower()
        used_capabilities = []
        
        capability_keywords = {
            "community_connections": ["meet", "connect", "friends", "people", "community"],
            "event_discovery": ["event", "gathering", "activity", "happening", "festival"],
            "meetup_coordination": ["meetup", "get together", "organize", "plan", "coordinate"],
            "safety_networking": ["safe", "safety", "security", "buddy", "check-in"],
            "group_travel_planning": ["group", "together", "convoy", "travel", "caravan"],
            "local_community_integration": ["local", "town", "community", "area", "residents"]
        }
        
        for capability, keywords in capability_keywords.items():
            if any(keyword in message_lower for keyword in keywords):
                used_capabilities.append(capability)
        
        return used_capabilities if used_capabilities else ["general_social_advice"]
    
    def _extract_tool_calls(self, response: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Extract tool calls from agent response"""
        tool_calls = []
        
        if response and response.get('messages'):
            for message in response['messages']:
                if hasattr(message, 'tool_calls') and message.tool_calls:
                    for call in message.tool_calls:
                        tool_calls.append({
                            'tool': call.get('name', 'unknown'),
                            'args': call.get('args', {}),
                            'id': call.get('id', '')
                        })
        
        return tool_calls
    
    async def get_capabilities(self) -> List[str]:
        """Get capabilities - required by PAMBaseAgent interface"""
        return self.capabilities
    
    def get_domain_expertise(self) -> Dict[str, Any]:
        """Get information about this agent's domain expertise"""
        return {
            "domain": self.domain,
            "agent_type": self.agent_type,
            "capabilities": self.capabilities,
            "specialization": "Grey Nomad community connections and social networking",
            "tools_available": [],  # Will be expanded with social tools
            "context_sources": ["social_history", "community_participation", "safety_preferences"],
            "typical_use_cases": [
                "Find travel companions",
                "Discover local community events",
                "Coordinate group activities",
                "Safety networking setup",
                "Local community integration",
                "Social activity recommendations"
            ]
        }
    
    async def can_handle_request(self, user_message: str, context: Dict[str, Any]) -> float:
        """
        Determine if this agent can handle the request
        Returns confidence score 0-1
        """
        message_lower = user_message.lower()
        
        # High confidence keywords
        high_confidence_words = [
            "meet", "connect", "friends", "people", "community", "social", "group",
            "event", "gathering", "meetup", "activity", "together", "convoy",
            "safety", "buddy", "companion", "local", "residents"
        ]
        
        # Medium confidence keywords
        medium_confidence_words = [
            "lonely", "alone", "isolated", "help", "support", "share", "talk",
            "advice", "recommend", "suggest", "join", "participate"
        ]
        
        high_matches = sum(1 for word in high_confidence_words if word in message_lower)
        medium_matches = sum(1 for word in medium_confidence_words if word in message_lower)
        
        if high_matches >= 2:
            return 0.9
        elif high_matches >= 1:
            return 0.8  
        elif medium_matches >= 2:
            return 0.6
        elif medium_matches >= 1:
            return 0.4
        else:
            return 0.1