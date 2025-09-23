"""
PAM 2.0 Core Types
TypeScript-style type definitions for Python
"""

from typing import Dict, Any, Optional, List, Union, Literal
from enum import Enum
from pydantic import BaseModel
from datetime import datetime

# =====================================================
# Core Enums
# =====================================================

class PhaseStatus(str, Enum):
    """Implementation phase status"""
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    TESTING = "testing"

class SafetyLevel(str, Enum):
    """Guardrails safety levels"""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"

class MessageType(str, Enum):
    """Chat message types"""
    USER = "user"
    ASSISTANT = "assistant"
    SYSTEM = "system"
    ERROR = "error"

class UIAction(str, Enum):
    """UI actions that PAM can trigger"""
    NONE = "none"
    NAVIGATE = "navigate"
    UPDATE_TRIP = "update_trip"
    UPDATE_BUDGET = "update_budget"
    SHOW_SAVINGS = "show_savings"
    ALERT = "alert"

# =====================================================
# Core Data Types
# =====================================================

class UserContext(BaseModel):
    """User context for conversations"""
    user_id: str
    session_id: Optional[str] = None
    preferences: Dict[str, Any] = {}
    trip_data: Dict[str, Any] = {}
    financial_data: Dict[str, Any] = {}
    conversation_history: List[Dict[str, Any]] = []

class ChatMessage(BaseModel):
    """Standard chat message format"""
    id: Optional[str] = None
    user_id: str
    type: MessageType
    content: str
    timestamp: datetime
    metadata: Dict[str, Any] = {}

class ConversationContext(BaseModel):
    """Context for ongoing conversations"""
    session_id: str
    user_context: UserContext
    messages: List[ChatMessage]
    current_topic: Optional[str] = None
    last_activity: datetime

class ServiceResponse(BaseModel):
    """Standard response from PAM services"""
    success: bool
    data: Optional[Dict[str, Any]] = None
    error: Optional[str] = None
    metadata: Dict[str, Any] = {}

# =====================================================
# Configuration Types
# =====================================================

class GuardrailsConfig(BaseModel):
    """Guardrails configuration"""
    safety_level: SafetyLevel = SafetyLevel.MEDIUM
    rate_limit_messages_per_hour: int = 100
    content_filtering_enabled: bool = True
    user_safety_monitoring: bool = True

class ServiceConfig(BaseModel):
    """Individual service configuration"""
    enabled: bool = True
    max_response_time_ms: int = 500
    retry_attempts: int = 3
    timeout_seconds: int = 30

# =====================================================
# Integration Types
# =====================================================

class GeminiConfig(BaseModel):
    """Google Gemini configuration"""
    api_key: str
    model: str = "gemini-1.5-flash"
    temperature: float = 0.7
    max_tokens: int = 1000
    timeout_seconds: int = 30

class MCPConfig(BaseModel):
    """MCP Server configuration"""
    supabase_url: str
    service_role_key: str
    enabled_tables: List[str] = []
    read_only: bool = False

class RedisConfig(BaseModel):
    """Redis configuration"""
    url: str
    host: str = "localhost"
    port: int = 6379
    db: int = 0
    password: Optional[str] = None