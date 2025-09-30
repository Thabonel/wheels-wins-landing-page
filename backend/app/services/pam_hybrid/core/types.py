"""Type definitions for PAM Hybrid System"""

from enum import Enum
from typing import Any, Dict, List, Optional, Union
from pydantic import BaseModel, Field
from datetime import datetime


class QueryComplexity(str, Enum):
    """Query complexity classification"""
    SIMPLE = "simple"  # Handle with GPT-4o-mini
    MODERATE = "moderate"  # Can use either
    COMPLEX = "complex"  # Requires Claude Agent SDK


class AgentDomain(str, Enum):
    """Domain specialization for Claude agents"""
    DASHBOARD = "dashboard"
    BUDGET = "budget"
    TRIP = "trip"
    COMMUNITY = "community"
    SHOP = "shop"


class AgentCapability(str, Enum):
    """Agent capabilities"""
    ANALYSIS = "analysis"
    PLANNING = "planning"
    RECOMMENDATION = "recommendation"
    EXECUTION = "execution"
    MODERATION = "moderation"


class HybridRequest(BaseModel):
    """Request to hybrid system"""
    user_id: str
    message: str
    context: Dict[str, Any] = Field(default_factory=dict)
    conversation_history: List[Dict[str, str]] = Field(default_factory=list)
    voice_input: bool = False
    metadata: Dict[str, Any] = Field(default_factory=dict)
    timestamp: datetime = Field(default_factory=datetime.utcnow)


class HybridResponse(BaseModel):
    """Response from hybrid system"""
    response: str
    handler: str  # "gpt4o-mini" or agent domain
    complexity: QueryComplexity
    agent_used: Optional[AgentDomain] = None
    tools_called: List[str] = Field(default_factory=list)
    cost_estimate: float = 0.0  # USD
    latency_ms: int = 0
    metadata: Dict[str, Any] = Field(default_factory=dict)
    timestamp: datetime = Field(default_factory=datetime.utcnow)


class AgentTask(BaseModel):
    """Task for Claude agent"""
    domain: AgentDomain
    user_id: str
    objective: str
    context: Dict[str, Any] = Field(default_factory=dict)
    conversation_history: List[Dict[str, str]] = Field(default_factory=list)
    tools_available: List[str] = Field(default_factory=list)
    max_iterations: int = 5
    timeout_seconds: int = 30
    metadata: Dict[str, Any] = Field(default_factory=dict)


class AgentResult(BaseModel):
    """Result from Claude agent"""
    success: bool
    response: str
    tools_used: List[str] = Field(default_factory=list)
    iterations: int = 0
    cost_usd: float = 0.0
    latency_ms: int = 0
    error: Optional[str] = None
    metadata: Dict[str, Any] = Field(default_factory=dict)
    timestamp: datetime = Field(default_factory=datetime.utcnow)


class ToolCall(BaseModel):
    """Tool call representation"""
    name: str
    parameters: Dict[str, Any]
    result: Optional[Any] = None
    error: Optional[str] = None
    latency_ms: int = 0


class AgentMetrics(BaseModel):
    """Performance metrics for agents"""
    agent_domain: AgentDomain
    total_requests: int = 0
    successful_requests: int = 0
    failed_requests: int = 0
    avg_latency_ms: float = 0.0
    total_cost_usd: float = 0.0
    tools_usage: Dict[str, int] = Field(default_factory=dict)
    last_updated: datetime = Field(default_factory=datetime.utcnow)


class ClassificationResult(BaseModel):
    """Result from complexity classifier"""
    complexity: QueryComplexity
    confidence: float  # 0.0 to 1.0
    domain: Optional[AgentDomain] = None
    reasoning: str
    suggested_handler: str  # "gpt4o-mini" or "claude-agent"
    estimated_cost_usd: float = 0.0