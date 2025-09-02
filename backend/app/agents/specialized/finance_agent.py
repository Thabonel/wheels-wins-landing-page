"""
PAM Finance Agent - Specialized agent for expense tracking, budgeting, and financial planning
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
from ..tools import expense_tracking_tool, budget_analysis_tool
from ..memory import PAMAgentMemory

logger = logging.getLogger(__name__)


class PAMFinanceAgent(PAMBaseAgent):
    """
    Specialized agent for expense tracking, budget analysis, and financial planning for Grey Nomads
    """
    
    def __init__(self, config: PAMAgentConfig, memory: PAMAgentMemory):
        super().__init__(config, memory)
        self.agent_type = "finance_specialist"
        self.domain = "finance"
        
        # Finance-specific capabilities
        self.capabilities = [
            "expense_tracking",
            "budget_analysis",
            "spending_pattern_recognition",
            "financial_forecasting",
            "cost_optimization_advice",
            "category_analysis",
            "trend_identification",
            "savings_recommendations",
            "travel_cost_estimation"
        ]
        
        # Initialize specialized finance agent
        self._initialize_finance_agent()
        
        logger.info(f"PAM Finance Agent initialized with {len(self.capabilities)} capabilities")
    
    def _initialize_finance_agent(self):
        """Initialize the finance-specific ReAct agent"""
        try:
            model = ChatOpenAI(
                api_key=self.config.openai_api_key,
                model="gpt-4",
                temperature=0.1,  # Very precise for financial calculations
                max_tokens=3000
            )
            
            # Finance-specific tools
            finance_tools = [expense_tracking_tool, budget_analysis_tool]
            
            # Create specialized finance agent
            self.agent = create_react_agent(
                model=model,
                tools=finance_tools,
                checkpointer=MemorySaver()
            )
            
            logger.info("Finance agent ReAct system initialized")
            
        except Exception as e:
            logger.error(f"Failed to initialize finance agent: {e}")
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
        Process finance-related requests with specialized knowledge
        """
        try:
            # Build finance-specific system prompt
            system_prompt = self._build_finance_system_prompt(context)
            
            # Get financial context and spending patterns
            financial_context = await self._get_financial_context(
                context.get('user_id', ''), 
                user_message
            )
            
            # Create agent input with financial context
            agent_input = {
                "messages": [
                    HumanMessage(content=f"{system_prompt}\n\nFinancial Context:\n{financial_context}\n\nUser Request: {user_message}")
                ]
            }
            
            # Execute finance agent
            start_time = datetime.utcnow()
            response = await self.agent.ainvoke(
                agent_input, 
                {"configurable": {"thread_id": f"finance_{context.get('user_id', 'anon')}_{int(start_time.timestamp())}"}}
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
                        'financial_context_items': len(financial_context.split('\n')) if financial_context else 0,
                        'calculation_precision': 'high'
                    },
                    confidence=0.95,
                    sources=['finance_agent', 'expense_tools', 'budget_tools'],
                    agent_used=self.agent_type,
                    execution_time_ms=execution_time,
                    tool_calls=self._extract_tool_calls(response)
                )
            else:
                return PAMAgentResult(
                    success=False,
                    content="Finance agent failed to generate response",
                    metadata={'error': 'No response from finance agent'},
                    confidence=0.0,
                    sources=[],
                    agent_used=self.agent_type,
                    execution_time_ms=execution_time,
                    tool_calls=[]
                )
                
        except Exception as e:
            logger.error(f"Finance agent processing error: {e}")
            return PAMAgentResult(
                success=False,
                content=f"Financial advisor encountered an error: {str(e)}",
                metadata={'error': str(e), 'agent_type': self.agent_type},
                confidence=0.0,
                sources=[],
                agent_used=self.agent_type,
                execution_time_ms=0,
                tool_calls=[]
            )
    
    def _build_finance_system_prompt(self, context: Dict[str, Any]) -> str:
        """Build finance-specific system prompt"""
        
        base_prompt = """You are PAM's Financial Advisor, specialized in Grey Nomad travel budgeting and expense management.

Your expertise includes:
- Travel expense tracking and categorization
- Budget planning for extended road trips
- Cost optimization strategies for nomadic living
- Fuel cost analysis and forecasting  
- Accommodation cost comparison
- Food and supplies budgeting
- Vehicle maintenance cost planning
- Emergency fund recommendations
- Income management while traveling

You understand:
- Seasonal price variations for camping and fuel
- Regional cost differences across Australia
- Hidden costs of nomadic travel (repairs, permits, etc.)
- Fixed vs variable travel expenses
- Pension and income considerations for retirees
- Insurance and health cost implications

Always provide:
- Accurate financial calculations
- Realistic budget estimates
- Cost-saving recommendations
- Risk assessment for financial decisions
- Clear categorization of expenses
- Actionable financial advice"""

        # Add current financial context
        current_date = datetime.now().strftime('%B %Y')
        base_prompt += f"\n\nCurrent period: {current_date}"
        
        # Add location-based cost context if available
        if context.get('user_location'):
            base_prompt += "\n\nConsider regional cost variations for current location"
        
        return base_prompt
    
    async def _get_financial_context(self, user_id: str, query: str) -> str:
        """Get finance-specific context and spending patterns"""
        try:
            if not self.memory or not user_id:
                return ""
            
            # Get expense and budget related memories
            memories = await self.memory.get_relevant_memories(user_id, query, limit=5)
            
            financial_context = []
            for memory in memories:
                if memory.get('type') in ['expense_pattern', 'budget', 'financial']:
                    content = memory.get('content', '')
                    relevance = memory.get('relevance_score', 0)
                    if content and relevance > 0.5:
                        financial_context.append(f"- {content[:150]} (relevance: {relevance:.2f})")
            
            # Get user financial preferences
            user_prefs = await self.memory.get_user_preferences(user_id)
            financial_prefs = []
            
            financial_pref_keys = ['budget_category', 'spending_style', 'financial_goals', 'income_type']
            for key in financial_pref_keys:
                if key in user_prefs and user_prefs[key]:
                    financial_prefs.append(f"- {key}: {user_prefs[key]}")
            
            # Add recent spending patterns (simulated for now)
            spending_patterns = await self._get_recent_spending_patterns(user_id)
            
            # Combine context
            context_parts = []
            if financial_context:
                context_parts.append("Recent Financial Memories:")
                context_parts.extend(financial_context)
            
            if financial_prefs:
                context_parts.append("\nFinancial Preferences:")
                context_parts.extend(financial_prefs)
            
            if spending_patterns:
                context_parts.append("\nRecent Spending Patterns:")
                context_parts.extend(spending_patterns)
            
            return "\n".join(context_parts) if context_parts else ""
            
        except Exception as e:
            logger.warning(f"Failed to get financial context: {e}")
            return ""
    
    async def _get_recent_spending_patterns(self, user_id: str) -> List[str]:
        """Get recent spending pattern analysis"""
        # This would integrate with actual expense data
        # For now, return pattern examples based on typical Grey Nomad spending
        
        patterns = [
            "- Average fuel spending: $120/week (trending up 5%)",
            "- Accommodation costs: $45/night (mostly powered sites)",
            "- Food/supplies: $85/week (mix of shopping and dining out)",
            "- Vehicle maintenance: $150/month average"
        ]
        
        return patterns
    
    def _extract_used_capabilities(self, user_message: str) -> List[str]:
        """Extract which financial capabilities were likely used"""
        message_lower = user_message.lower()
        used_capabilities = []
        
        capability_keywords = {
            "expense_tracking": ["spent", "expense", "cost", "paid", "bought", "track"],
            "budget_analysis": ["budget", "spending", "afford", "money", "financial"],
            "spending_pattern_recognition": ["pattern", "trend", "usually", "typically", "average"],
            "cost_optimization_advice": ["save", "cheaper", "reduce", "optimize", "cut costs"],
            "financial_forecasting": ["predict", "forecast", "expect", "future", "estimate"],
            "category_analysis": ["fuel", "food", "accommodation", "maintenance", "category"]
        }
        
        for capability, keywords in capability_keywords.items():
            if any(keyword in message_lower for keyword in keywords):
                used_capabilities.append(capability)
        
        return used_capabilities if used_capabilities else ["general_financial_advice"]
    
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
            "specialization": "Grey Nomad travel budgeting and expense management",
            "tools_available": ["expense_tracking_tool", "budget_analysis_tool"],
            "context_sources": ["expense_history", "budget_data", "spending_patterns"],
            "typical_use_cases": [
                "Track daily travel expenses",
                "Analyze monthly spending patterns",
                "Budget planning for trip legs",
                "Cost comparison analysis",
                "Savings goal tracking",
                "Financial advice for nomadic lifestyle"
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
            "expense", "budget", "cost", "money", "spent", "paid", "bought",
            "financial", "save", "afford", "spending", "track", "bill"
        ]
        
        # Medium confidence keywords
        medium_confidence_words = [
            "cheap", "expensive", "price", "dollar", "$", "bank", "account",
            "income", "pension", "investment", "calculate", "total"
        ]
        
        # Financial amount patterns (e.g., "$50", "50 dollars")
        financial_patterns = ["$", "dollar", "cent", "aud", "budget"]
        
        high_matches = sum(1 for word in high_confidence_words if word in message_lower)
        medium_matches = sum(1 for word in medium_confidence_words if word in message_lower)
        financial_amount_matches = sum(1 for pattern in financial_patterns if pattern in message_lower)
        
        if high_matches >= 2 or financial_amount_matches >= 1:
            return 0.95
        elif high_matches >= 1:
            return 0.85
        elif medium_matches >= 2:
            return 0.6
        elif medium_matches >= 1:
            return 0.4
        else:
            return 0.1