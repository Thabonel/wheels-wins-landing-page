
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum

class IntentType(str, Enum):
    BUDGET_QUERY = "budget_query"
    EXPENSE_LOG = "expense_log"
    ROUTE_PLANNING = "route_planning"
    CAMPGROUND_SEARCH = "campground_search"
    FUEL_PRICES = "fuel_prices"
    WEATHER_CHECK = "weather_check"
    MAINTENANCE_REMINDER = "maintenance_reminder"
    INCOME_TRACKING = "income_tracking"
    SOCIAL_INTERACTION = "social_interaction"
    GENERAL_CHAT = "general_chat"
    EMERGENCY_HELP = "emergency_help"

class ConversationStatus(str, Enum):
    ACTIVE = "active"
    COMPLETED = "completed"
    PAUSED = "paused"
    ARCHIVED = "archived"

class MemoryType(str, Enum):
    CONVERSATION = "conversation"
    PREFERENCE = "preference"
    FACT = "fact"
    LOCATION = "location"
    FINANCIAL = "financial"

class PamMessage(BaseModel):
    id: str
    conversation_id: str
    user_id: str
    content: str
    is_from_user: bool
    timestamp: datetime
    intent: Optional[IntentType] = None
    confidence: Optional[float] = None
    entities: Dict[str, Any] = Field(default_factory=dict)
    context_used: Dict[str, Any] = Field(default_factory=dict)
    response_time_ms: Optional[int] = None

class PamConversation(BaseModel):
    id: str
    user_id: str
    session_id: Optional[str] = None
    title: Optional[str] = None
    status: ConversationStatus = ConversationStatus.ACTIVE
    created_at: datetime
    updated_at: datetime
    last_message_at: Optional[datetime] = None
    message_count: int = 0
    context: Dict[str, Any] = Field(default_factory=dict)
    tags: List[str] = Field(default_factory=list)

class PamMemory(BaseModel):
    id: str
    user_id: str
    memory_type: MemoryType
    content: str
    context: Dict[str, Any] = Field(default_factory=dict)
    confidence: float = 1.0
    created_at: datetime
    updated_at: datetime
    expires_at: Optional[datetime] = None
    is_verified: bool = False
    source_conversation_id: Optional[str] = None

class PamIntent(BaseModel):
    intent_type: IntentType
    confidence: float
    entities: Dict[str, Any] = Field(default_factory=dict)
    required_data: List[str] = Field(default_factory=list)
    context_triggers: Dict[str, Any] = Field(default_factory=dict)

class PamContext(BaseModel):
    user_id: str
    current_location: Optional[Dict[str, float]] = None
    recent_expenses: List[Dict[str, Any]] = Field(default_factory=list)
    budget_status: Dict[str, Any] = Field(default_factory=dict)
    travel_plans: Dict[str, Any] = Field(default_factory=dict)
    vehicle_info: Dict[str, Any] = Field(default_factory=dict)
    preferences: Dict[str, Any] = Field(default_factory=dict)
    conversation_history: List[str] = Field(default_factory=list)
    timestamp: datetime

class PamResponse(BaseModel):
    content: str
    intent: Optional[IntentType] = None
    confidence: float
    suggestions: List[str] = Field(default_factory=list)
    actions: List[Dict[str, Any]] = Field(default_factory=list)
    requires_followup: bool = False
    context_updates: Dict[str, Any] = Field(default_factory=dict)
    voice_enabled: bool = False

class PamSession(BaseModel):
    id: str
    user_id: str
    started_at: datetime
    ended_at: Optional[datetime] = None
    is_active: bool = True
    conversation_count: int = 0
    total_messages: int = 0
    context: Dict[str, Any] = Field(default_factory=dict)
    device_info: Optional[Dict[str, Any]] = None
