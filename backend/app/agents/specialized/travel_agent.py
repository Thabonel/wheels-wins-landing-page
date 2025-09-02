"""
PAM Travel Agent - Specialized agent for travel planning, routes, and recommendations
"""

import asyncio
import logging
from typing import Dict, Any, List, Optional
from datetime import datetime
from langchain_core.messages import HumanMessage, AIMessage
from langchain_openai import ChatOpenAI
from langgraph.prebuilt import create_react_agent
from langgraph.checkpoint.memory import MemorySaver

from ..base import PAMBaseAgent, PAMAgentConfig, PAMAgentResult
from ..tools import TripPlanningInput, trip_planning_tool
from ..memory import PAMAgentMemory

logger = logging.getLogger(__name__)


class PAMTravelAgent(PAMBaseAgent):
    """
    Specialized agent for travel planning, route optimization, and destination recommendations
    Focuses on Australian Grey Nomad travel patterns and preferences
    """
    
    def __init__(self, config: PAMAgentConfig, memory: PAMAgentMemory):
        super().__init__(config, memory)
        self.agent_type = "travel_specialist"
        self.domain = "travel"
        
        # Travel-specific capabilities
        self.capabilities = [
            "route_planning",
            "destination_recommendations", 
            "accommodation_search",
            "attraction_discovery",
            "weather_integration",
            "fuel_planning",
            "road_conditions",
            "campground_booking",
            "travel_timing_optimization"
        ]
        
        # Initialize specialized travel agent
        self._initialize_travel_agent()
        
        logger.info(f"PAM Travel Agent initialized with {len(self.capabilities)} capabilities")
    
    def _initialize_travel_agent(self):
        """Initialize the travel-specific ReAct agent"""
        try:
            model = ChatOpenAI(
                api_key=self.config.openai_api_key,
                model="gpt-4",
                temperature=0.2,  # More creative for travel recommendations
                max_tokens=3000
            )
            
            # Travel-specific tools
            travel_tools = [trip_planning_tool]
            
            # Create specialized travel agent
            self.agent = create_react_agent(
                model=model,
                tools=travel_tools,
                checkpointer=MemorySaver()
            )
            
            logger.info("Travel agent ReAct system initialized")
            
        except Exception as e:
            logger.error(f"Failed to initialize travel agent: {e}")
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
        Process travel-related requests with specialized knowledge
        """
        try:
            # Build travel-specific system prompt
            system_prompt = self._build_travel_system_prompt(context)
            
            # Get travel memories and context
            travel_memories = await self._get_travel_context(
                context.get('user_id', ''), 
                user_message
            )
            
            # Create agent input with travel context
            agent_input = {
                "messages": [
                    HumanMessage(content=f"{system_prompt}\n\nTravel Context:\n{travel_memories}\n\nUser Request: {user_message}")
                ]
            }
            
            # Execute travel agent
            start_time = datetime.utcnow()
            response = await self.agent.ainvoke(
                agent_input, 
                {"configurable": {"thread_id": f"travel_{context.get('user_id', 'anon')}_{int(start_time.timestamp())}"}}
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
                        'travel_context_items': len(travel_memories.split('\n')) if travel_memories else 0
                    },
                    confidence=0.95,
                    sources=['travel_agent', 'travel_tools'],
                    agent_used=self.agent_type,
                    execution_time_ms=execution_time,
                    tool_calls=self._extract_tool_calls(response)
                )
            else:
                return PAMAgentResult(
                    success=False,
                    content="Travel agent failed to generate response",
                    metadata={'error': 'No response from travel agent'},
                    confidence=0.0,
                    sources=[],
                    agent_used=self.agent_type,
                    execution_time_ms=execution_time,
                    tool_calls=[]
                )
                
        except Exception as e:
            logger.error(f"Travel agent processing error: {e}")
            return PAMAgentResult(
                success=False,
                content=f"Travel planning assistant encountered an error: {str(e)}",
                metadata={'error': str(e), 'agent_type': self.agent_type},
                confidence=0.0,
                sources=[],
                agent_used=self.agent_type,
                execution_time_ms=0,
                tool_calls=[]
            )
    
    def _build_travel_system_prompt(self, context: Dict[str, Any]) -> str:
        """Build travel-specific system prompt"""
        
        base_prompt = """You are PAM's Travel Specialist, an expert in Australian Grey Nomad travel.

Your expertise includes:
- Route planning and optimization for caravans/RVs
- Campground and accommodation recommendations
- Seasonal travel timing and weather considerations
- Fuel and water stop planning
- Road conditions and vehicle-appropriate routes
- Tourist attractions and hidden gems
- Local regulations and camping restrictions
- Community events and Grey Nomad gatherings

You understand:
- Vehicle limitations (height, weight, turning radius)
- Power requirements (powered vs unpowered sites)
- Water and waste management needs
- Budget considerations for extended travel
- Safety for older travelers
- Accessibility requirements

Always provide:
- Practical, actionable travel advice
- Cost estimates where relevant
- Safety considerations
- Alternative options
- Local insider knowledge"""

        # Add location context if available
        if context.get('user_location'):
            location = context['user_location']
            base_prompt += f"\n\nUser's current location: {location.get('latitude', 'unknown')}, {location.get('longitude', 'unknown')}"
        
        # Add seasonal context
        current_month = datetime.now().strftime('%B')
        base_prompt += f"\n\nCurrent month: {current_month} (consider seasonal travel implications)"
        
        return base_prompt
    
    async def _get_travel_context(self, user_id: str, query: str) -> str:
        """Get travel-specific context and memories"""
        try:
            if not self.memory or not user_id:
                return ""
            
            # Get travel-specific memories
            memories = await self.memory.get_relevant_memories(user_id, query, limit=5)
            
            travel_context = []
            for memory in memories:
                if memory.get('type') in ['trip_memory', 'travel_experience', 'accommodation', 'route']:
                    content = memory.get('content', '')
                    relevance = memory.get('relevance_score', 0)
                    if content and relevance > 0.5:
                        travel_context.append(f"- {content[:150]} (relevance: {relevance:.2f})")
            
            # Get user preferences related to travel
            user_prefs = await self.memory.get_user_preferences(user_id)
            travel_prefs = []
            
            travel_pref_keys = ['vehicle_type', 'accommodation_preference', 'travel_style', 'preferred_regions']
            for key in travel_pref_keys:
                if key in user_prefs and user_prefs[key]:
                    travel_prefs.append(f"- {key}: {user_prefs[key]}")
            
            # Combine context
            context_parts = []
            if travel_context:
                context_parts.append("Recent Travel Memories:")
                context_parts.extend(travel_context)
            
            if travel_prefs:
                context_parts.append("\nTravel Preferences:")
                context_parts.extend(travel_prefs)
            
            return "\n".join(context_parts) if context_parts else ""
            
        except Exception as e:
            logger.warning(f"Failed to get travel context: {e}")
            return ""
    
    def _extract_used_capabilities(self, user_message: str) -> List[str]:
        """Extract which travel capabilities were likely used"""
        message_lower = user_message.lower()
        used_capabilities = []
        
        capability_keywords = {
            "route_planning": ["route", "directions", "drive", "travel to", "how to get"],
            "destination_recommendations": ["recommend", "suggest", "where to", "places to visit"],
            "accommodation_search": ["stay", "camp", "caravan park", "accommodation", "sleep"],
            "weather_integration": ["weather", "forecast", "rain", "temperature", "conditions"],
            "fuel_planning": ["fuel", "petrol", "diesel", "gas", "refuel"],
            "attraction_discovery": ["attractions", "things to do", "sights", "activities", "visit"]
        }
        
        for capability, keywords in capability_keywords.items():
            if any(keyword in message_lower for keyword in keywords):
                used_capabilities.append(capability)
        
        return used_capabilities if used_capabilities else ["general_travel_advice"]
    
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
            "specialization": "Australian Grey Nomad travel planning and recommendations",
            "tools_available": ["trip_planning_tool"],
            "context_sources": ["travel_memories", "route_history", "accommodation_preferences"],
            "typical_use_cases": [
                "Route planning between cities",
                "Campground recommendations",
                "Seasonal travel advice", 
                "Fuel and supply planning",
                "Weather-based travel decisions",
                "Tourist attraction discovery"
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
            "travel", "trip", "route", "drive", "destination", "campground", 
            "caravan park", "accommodation", "fuel", "attractions", "sights",
            "weather", "road", "directions", "visit", "stay", "camp"
        ]
        
        # Medium confidence keywords  
        medium_confidence_words = [
            "where", "how to get", "recommend", "suggest", "plan", "booking",
            "distance", "time", "cost", "budget", "road conditions"
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