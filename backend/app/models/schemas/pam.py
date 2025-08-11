
from pydantic import BaseModel, Field, validator, ValidationError
from typing import Optional, List, Dict, Any, Union
from datetime import datetime
import re
import bleach
import html
from ..domain.pam import (
    PamMessage, PamConversation, PamMemory, PamIntent, 
    PamContext, PamResponse, IntentType, ConversationStatus, MemoryType
)

# Security Configuration
ALLOWED_HTML_TAGS = []  # No HTML tags allowed in user input
ALLOWED_ATTRIBUTES = {}
MAX_MESSAGE_LENGTH = 2000
MAX_CONTEXT_FIELDS = 50
MAX_CONTEXT_VALUE_LENGTH = 1000
SUSPICIOUS_PATTERNS = [
    r'<script[^>]*>.*?</script>',  # Script tags
    r'javascript:',                # Javascript URLs
    r'vbscript:',                 # VBScript URLs
    r'data:text/html',            # Data URLs with HTML
    r'on\w+\s*=',                 # Event handlers (onclick, onload, etc.)
    r'<iframe[^>]*>.*?</iframe>',  # Iframe tags
    r'<object[^>]*>.*?</object>',  # Object tags
    r'<embed[^>]*>.*?</embed>',    # Embed tags
    r'<link[^>]*>',               # Link tags
    r'<style[^>]*>.*?</style>',   # Style tags
]

def sanitize_text(text: str) -> str:
    """
    Comprehensive text sanitization for user input
    """
    if not text:
        return text
    
    # HTML entity decode first to catch encoded attacks
    text = html.unescape(text)
    
    # Remove HTML tags and dangerous content
    text = bleach.clean(text, tags=ALLOWED_HTML_TAGS, attributes=ALLOWED_ATTRIBUTES, strip=True)
    
    # Check for suspicious patterns
    for pattern in SUSPICIOUS_PATTERNS:
        if re.search(pattern, text, re.IGNORECASE):
            raise ValueError(f"Potentially dangerous content detected")
    
    # Normalize whitespace
    text = ' '.join(text.split())
    
    # Encode any remaining HTML entities for safety
    text = html.escape(text, quote=False)
    
    return text

def validate_context_dict(context: Dict[str, Any]) -> Dict[str, Any]:
    """
    Validate and sanitize context dictionary
    """
    if not context:
        return {}
    
    if len(context) > MAX_CONTEXT_FIELDS:
        raise ValueError(f"Context cannot have more than {MAX_CONTEXT_FIELDS} fields")
    
    sanitized_context = {}
    for key, value in context.items():
        # Sanitize keys
        if not isinstance(key, str):
            continue
        
        # Validate key format
        if not re.match(r'^[a-zA-Z0-9_.-]+$', key):
            continue
        
        if len(key) > 100:
            continue
            
        # Sanitize values
        if isinstance(value, str):
            if len(value) > MAX_CONTEXT_VALUE_LENGTH:
                value = value[:MAX_CONTEXT_VALUE_LENGTH]
            value = sanitize_text(value)
        elif isinstance(value, (int, float, bool)):
            pass  # Allow primitive types as-is
        elif isinstance(value, (list, dict)):
            # Recursively validate nested structures (limited depth)
            continue  # Skip complex nested structures for security
        else:
            continue  # Skip unknown types
            
        sanitized_context[key] = value
    
    return sanitized_context

# Secure Pydantic Models with Input Validation

class SecureChatRequest(BaseModel):
    """
    Secure chat request model with comprehensive input validation and sanitization
    """
    message: str = Field(
        ..., 
        min_length=1, 
        max_length=MAX_MESSAGE_LENGTH,
        description="User message content - will be sanitized"
    )
    user_id: Optional[str] = Field(
        None, 
        pattern=r'^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$',
        description="Valid UUID for user identification"
    )
    session_id: Optional[str] = Field(
        None, 
        pattern=r'^[a-zA-Z0-9_-]+$',
        max_length=100,
        description="Session identifier (alphanumeric, dash, underscore only)"
    )
    conversation_id: Optional[str] = Field(
        None, 
        pattern=r'^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$',
        description="Valid UUID for conversation identification"
    )
    context: Optional[Dict[str, Any]] = Field(
        default_factory=dict,
        description="Additional context data - will be validated and sanitized"
    )
    voice_input: bool = Field(
        False,
        description="Whether input originated from voice"
    )
    attachments: List[str] = Field(
        default_factory=list,
        max_items=10,
        description="List of attachment references (max 10)"
    )
    auth_token: Optional[str] = Field(
        None, 
        pattern=r'^[A-Za-z0-9._-]+$',
        max_length=2048,
        description="JWT token for authentication"
    )

    @validator('message')
    def sanitize_message(cls, v):
        """Sanitize and validate message content"""
        if not v or not v.strip():
            raise ValueError('Message cannot be empty')
        
        try:
            sanitized = sanitize_text(v.strip())
            if not sanitized:
                raise ValueError('Message content is invalid after sanitization')
            return sanitized
        except ValueError as e:
            raise ValueError(f'Message validation failed: {str(e)}')
    
    @validator('context')
    def validate_and_sanitize_context(cls, v):
        """Validate and sanitize context dictionary"""
        if not v:
            return {}
        
        try:
            return validate_context_dict(v)
        except ValueError as e:
            raise ValueError(f'Context validation failed: {str(e)}')
    
    @validator('attachments')
    def validate_attachments(cls, v):
        """Validate attachment references"""
        if not v:
            return []
        
        validated_attachments = []
        for attachment in v:
            if isinstance(attachment, str) and len(attachment) <= 255:
                # Basic URL/ID validation
                if re.match(r'^[a-zA-Z0-9._/-]+$', attachment):
                    validated_attachments.append(attachment)
        
        return validated_attachments

    class Config:
        """Pydantic configuration for security"""
        validate_assignment = True
        str_strip_whitespace = True
        anystr_lower = False
        max_anystr_length = MAX_MESSAGE_LENGTH

# Legacy support - alias for backward compatibility
ChatRequest = SecureChatRequest

class SecureWebSocketMessage(BaseModel):
    """
    Secure WebSocket message model with comprehensive validation
    """
    type: str = Field(
        ...,
        pattern=r'^[a-zA-Z_][a-zA-Z0-9_]*$',
        max_length=50,
        description="Message type (alphanumeric and underscore only)"
    )
    message: Optional[str] = Field(
        None,
        max_length=MAX_MESSAGE_LENGTH,
        description="Message content - will be sanitized"
    )
    content: Optional[str] = Field(
        None,
        max_length=MAX_MESSAGE_LENGTH,
        description="Alternative message content field"
    )
    context: Optional[Dict[str, Any]] = Field(
        default_factory=dict,
        description="Message context - will be validated"
    )
    user_id: Optional[str] = Field(
        None,
        pattern=r'^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$',
        description="Valid UUID for user identification"
    )
    session_id: Optional[str] = Field(
        None,
        pattern=r'^[a-zA-Z0-9_-]+$',
        max_length=100,
        description="Session identifier"
    )
    timestamp: Optional[Union[str, int, float]] = Field(
        None,
        description="Timestamp as ISO 8601 string or Unix timestamp (ms)"
    )
    metadata: Optional[Dict[str, Any]] = Field(
        default_factory=dict,
        description="Additional metadata"
    )

    @validator('message', 'content')
    def sanitize_text_fields(cls, v):
        """Sanitize text content fields"""
        if not v:
            return v
        
        try:
            return sanitize_text(v.strip())
        except ValueError as e:
            raise ValueError(f'Text validation failed: {str(e)}')
    
    @validator('context', 'metadata')
    def validate_dict_fields(cls, v):
        """Validate dictionary fields"""
        if not v:
            return {}
        
        try:
            return validate_context_dict(v)
        except ValueError as e:
            raise ValueError(f'Dictionary validation failed: {str(e)}')
    
    @validator('timestamp', pre=True)
    def normalize_timestamp(cls, v):
        """Convert numeric timestamps to ISO format"""
        if v is None:
            return v
        
        # If it's already a string in ISO format, return as-is
        if isinstance(v, str):
            return v
        
        # If it's a number (Unix timestamp in ms), convert to ISO
        if isinstance(v, (int, float)):
            try:
                # Convert from milliseconds to seconds
                timestamp_seconds = v / 1000
                dt = datetime.fromtimestamp(timestamp_seconds)
                return dt.isoformat() + 'Z'
            except Exception:
                # If conversion fails, return as string
                return str(v)
        
        return v
    
    @validator('type')
    def validate_message_type(cls, v):
        """Validate message type against allowed types"""
        allowed_types = {
            'chat', 'user_message', 'system_message', 'heartbeat', 'ping', 'pong',
            'connection_established', 'voice_input', 'text_input', 'error',
            'status_update', 'typing_indicator', 'conversation_end',
            'init', 'auth', 'init_ack', 'context_update', 'test'  # Added missing types
        }
        
        if v not in allowed_types:
            raise ValueError(f'Invalid message type: {v}. Must be one of: {", ".join(allowed_types)}')
        
        return v

    def get_message_content(self) -> str:
        """Get message content from either 'message' or 'content' field"""
        return self.message or self.content or ""
    
    class Config:
        validate_assignment = True
        str_strip_whitespace = True

class ChatResponse(BaseModel):
    response: str  # Primary response field
    intent: Optional[str] = None
    confidence: Optional[float] = None
    suggestions: Optional[List[str]] = None
    actions: Optional[List[Dict[str, Any]]] = None
    requires_followup: Optional[bool] = None
    context_updates: Optional[Dict[str, Any]] = None
    voice_enabled: Optional[bool] = None
    conversation_id: Optional[str] = None
    session_id: str
    message_id: Optional[str] = None
    processing_time_ms: Optional[int] = None
    timestamp: datetime
    tokens_used: Optional[int] = None
    
    # Support for content field (backwards compatibility)
    @property
    def content(self) -> str:
        return self.response

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
    conversation: Optional[PamConversation] = None
    has_more: bool
    next_cursor: Optional[str] = None

class ContextUpdateRequest(BaseModel):
    location: Optional[Dict[str, float]] = None
    budget_status: Optional[Dict[str, Any]] = None
    travel_plans: Optional[Dict[str, Any]] = None
    vehicle_info: Optional[Dict[str, Any]] = None
    preferences: Optional[Dict[str, Any]] = None

class PamFeedbackRequest(BaseModel):
    message_id: str = Field(..., min_length=1)
    rating: int = Field(..., ge=1, le=5)
    feedback_text: Optional[str] = Field(None, max_length=1000)
    feedback_type: str = Field(..., pattern="^(helpful|unhelpful|incorrect|inappropriate)$")

class PamThumbFeedbackRequest(BaseModel):
    message_id: str = Field(..., min_length=1)
    thumbs_up: bool

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
