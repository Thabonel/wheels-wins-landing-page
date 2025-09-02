"""
Base Agent Classes for PAM LangGraph Integration
"""

from typing import Dict, Any, Optional, List
from abc import ABC, abstractmethod
from pydantic import BaseModel
from langchain_core.tools import BaseTool
from langchain_core.messages import BaseMessage
from langgraph.checkpoint.memory import MemorySaver


class PAMAgentConfig(BaseModel):
    """Configuration for PAM agents"""
    agent_id: str
    name: str
    description: str
    openai_api_key: str
    temperature: float = 0.1
    model: str = "gpt-4"
    max_tokens: int = 4000
    tools: List[str] = []
    memory_enabled: bool = True


class PAMAgentResult(BaseModel):
    """Standard result format for PAM agents"""
    success: bool
    content: str
    metadata: Dict[str, Any] = {}
    confidence: float = 1.0
    sources: List[str] = []
    agent_used: str
    execution_time_ms: int
    tool_calls: List[Dict[str, Any]] = []


class PAMBaseAgent(ABC):
    """Base class for all PAM agents"""
    
    def __init__(self, config: PAMAgentConfig, memory=None):
        self.config = config
        self.tools: List[BaseTool] = []
        self.memory = memory or (MemorySaver() if config.memory_enabled else None)
        
    @abstractmethod
    async def process_message(
        self, 
        message: str, 
        context: Dict[str, Any],
        user_id: str
    ) -> PAMAgentResult:
        """Process a message and return structured result"""
        pass
    
    @abstractmethod
    async def get_capabilities(self) -> List[str]:
        """Return list of capabilities this agent provides"""
        pass
    
    def add_tool(self, tool: BaseTool):
        """Add a tool to this agent"""
        self.tools.append(tool)
    
    async def initialize(self):
        """Initialize the agent (override if needed)"""
        pass
    
    async def cleanup(self):
        """Cleanup agent resources (override if needed)"""
        pass