"""
AI Provider Interface - Abstract base for all AI providers
Defines the contract that all AI providers must implement
"""

from abc import ABC, abstractmethod
from typing import List, Dict, Any, AsyncGenerator, Optional, Tuple
from dataclasses import dataclass
from enum import Enum
from datetime import datetime


class AICapability(Enum):
    """Capabilities that AI providers may support"""
    CHAT = "chat"
    STREAMING = "streaming"
    FUNCTION_CALLING = "function_calling"
    VISION = "vision"
    AUDIO = "audio"
    EMBEDDINGS = "embeddings"
    FINE_TUNING = "fine_tuning"
    LONG_CONTEXT = "long_context"  # >100k tokens
    FAST_RESPONSE = "fast_response"  # <500ms first token


class AIProviderStatus(Enum):
    """Health status of an AI provider"""
    HEALTHY = "healthy"
    DEGRADED = "degraded"
    UNHEALTHY = "unhealthy"
    UNKNOWN = "unknown"


@dataclass
class AIMessage:
    """Standard message format across all providers"""
    role: str  # "system", "user", "assistant", "function"
    content: str
    name: Optional[str] = None  # For function messages
    function_call: Optional[Dict[str, Any]] = None
    
    def to_openai_format(self) -> Dict[str, Any]:
        """Convert to OpenAI message format"""
        msg = {"role": self.role, "content": self.content}
        if self.name:
            msg["name"] = self.name
        if self.function_call:
            msg["function_call"] = self.function_call
        return msg
    
    def to_anthropic_format(self) -> Dict[str, Any]:
        """Convert to Anthropic message format"""
        # Anthropic doesn't have system role in messages
        if self.role == "system":
            return None
        return {"role": self.role, "content": self.content}


@dataclass
class AIResponse:
    """Standard response format across all providers"""
    content: str
    model: str
    provider: str
    usage: Dict[str, int]  # tokens used
    latency_ms: float
    cached: bool = False
    finish_reason: Optional[str] = None
    function_calls: Optional[List[Dict[str, Any]]] = None


@dataclass
class ProviderConfig:
    """Configuration for an AI provider"""
    name: str
    api_key: str
    endpoint: Optional[str] = None
    default_model: str = ""
    max_retries: int = 3
    timeout_seconds: int = 30
    capabilities: List[AICapability] = None
    cost_per_1k_input_tokens: float = 0.0
    cost_per_1k_output_tokens: float = 0.0
    max_tokens_per_request: int = 4096
    max_context_window: int = 4096
    
    def __post_init__(self):
        if self.capabilities is None:
            self.capabilities = [AICapability.CHAT]


class AIProviderInterface(ABC):
    """Abstract base class for AI providers"""
    
    def __init__(self, config: ProviderConfig):
        self.config = config
        self._status = AIProviderStatus.UNKNOWN
        self._last_health_check = None
        self._consecutive_failures = 0
        self._total_requests = 0
        self._total_errors = 0
        self._average_latency_ms = 0.0
    
    @property
    def name(self) -> str:
        return self.config.name
    
    @property
    def status(self) -> AIProviderStatus:
        return self._status
    
    @property
    def capabilities(self) -> List[AICapability]:
        return self.config.capabilities
    
    def supports(self, capability: AICapability) -> bool:
        """Check if provider supports a specific capability"""
        return capability in self.config.capabilities
    
    @abstractmethod
    async def complete(
        self,
        messages: List[AIMessage],
        model: Optional[str] = None,
        temperature: float = 0.7,
        max_tokens: Optional[int] = None,
        **kwargs
    ) -> AIResponse:
        """Generate a completion from messages"""
        pass
    
    @abstractmethod
    async def stream(
        self,
        messages: List[AIMessage],
        model: Optional[str] = None,
        temperature: float = 0.7,
        max_tokens: Optional[int] = None,
        **kwargs
    ) -> AsyncGenerator[str, None]:
        """Stream a completion from messages"""
        pass
    
    @abstractmethod
    async def health_check(self) -> Tuple[AIProviderStatus, Optional[str]]:
        """Check provider health and return status with optional message"""
        pass
    
    async def initialize(self) -> bool:
        """Initialize the provider (optional override)"""
        return True
    
    async def cleanup(self) -> None:
        """Cleanup resources (optional override)"""
        pass
    
    def record_success(self, latency_ms: float):
        """Record successful request metrics"""
        self._total_requests += 1
        self._consecutive_failures = 0
        self._status = AIProviderStatus.HEALTHY
        
        # Update moving average latency
        self._average_latency_ms = (
            (self._average_latency_ms * (self._total_requests - 1) + latency_ms) 
            / self._total_requests
        )
    
    def record_failure(self, error: Exception):
        """Record failed request metrics"""
        self._total_requests += 1
        self._total_errors += 1
        self._consecutive_failures += 1
        
        # Update status based on consecutive failures
        if self._consecutive_failures >= 5:
            self._status = AIProviderStatus.UNHEALTHY
        elif self._consecutive_failures >= 2:
            self._status = AIProviderStatus.DEGRADED
    
    def get_metrics(self) -> Dict[str, Any]:
        """Get provider metrics"""
        error_rate = self._total_errors / max(1, self._total_requests)
        return {
            "name": self.name,
            "status": self._status.value,
            "total_requests": self._total_requests,
            "total_errors": self._total_errors,
            "error_rate": error_rate,
            "consecutive_failures": self._consecutive_failures,
            "average_latency_ms": self._average_latency_ms,
            "last_health_check": datetime.fromtimestamp(self._last_health_check).isoformat() if self._last_health_check else None
        }