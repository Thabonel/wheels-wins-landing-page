
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from ..domain.pam import (
    PamMessage, PamConversation, PamMemory, PamIntent, 
    PamContext, PamResponse, IntentType, ConversationStatus, MemoryType
)

class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=2000)
    conversation_id: Optional[str] = None
    context: Optional[Dict[str, Any]] = Field(default_factory=dict)
    voice_input: bool = False
    attachments: List[str] = Field(default_factory=list)

class ChatResponse(BaseModel):
    response: PamResponse
    conversation_id: str
    message_id: str
    processing_time_ms: int
    tokens_used: Optional[int] = None

class ConversationCreateRequest(BaseModel):
    title: Optional[str] = Field(None, max_length=100)
    initial_message: Optional[str] = None
    context: Optional[Dict[str, Any]] = Field(default_factory=dict)

class ConversationUpdateRequest(BaseModel):
    title: Optional[str] = Field(None, max_length=100)
    status: Optional[ConversationStatus] = None
    tags: Optional[List[str]] = None

class ConversationListResponse(BaseModel):
    conversations: List[PamConversation]
    total: int
    active_count: int
    archived_count: int

class MessageHistoryResponse(BaseModel):
    messages: List[PamMessage]
    conversation: PamConversation
    has_more: bool
    next_cursor: Optional[str] = None

class ContextUpdateRequest(BaseModel):
    location: Optional[Dict[str, float]] = None
    budget_status: Optional[Dict[str, Any]] = None
    travel_plans: Optional[Dict[str, Any]] = None
    vehicle_info: Optional[Dict[str, Any]] = None
    preferences: Optional[Dict[str, Any]] = None

class MemoryCreateRequest(BaseModel):
    memory_type: MemoryType
    content: str = Field(..., min_length=1, max_length=1000)
    context: Optional[Dict[str, Any]] = Field(default_factory=dict)
    confidence: float = Field(1.0, ge=0.0, le=1.0)
    expires_at: Optional[datetime] = None

class MemoryUpdateRequest(BaseModel):
    content: Optional[str] = Field(None, min_length=1, max_length=1000)
    context: Optional[Dict[str, Any]] = None
    confidence: Optional[float] = Field(None, ge=0.0, le=1.0)
    is_verified: Optional[bool] = None

class MemorySearchRequest(BaseModel):
    query: str = Field(..., min_length=1)
    memory_types: Optional[List[MemoryType]] = None
    limit: int = Field(10, ge=1, le=50)
    min_confidence: float = Field(0.0, ge=0.0, le=1.0)

class IntentAnalysisResponse(BaseModel):
    intent: IntentType
    confidence: float
    entities: Dict[str, Any]
    suggestions: List[str] = Field(default_factory=list)
    requires_context: List[str] = Field(default_factory=list)

class ConversationSummaryResponse(BaseModel):
    conversation_id: str
    summary: str
    key_topics: List[str]
    action_items: List[str]
    sentiment: str
    generated_at: datetime

class VoiceToTextRequest(BaseModel):
    audio_data: str  # Base64 encoded audio
    format: str = "wav"
    language: str = "en-US"

class TextToVoiceRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=1000)
    voice: str = "default"
    speed: float = Field(1.0, ge=0.5, le=2.0)
    pitch: float = Field(1.0, ge=0.5, le=2.0)
