"""
PAM 2.0 TypeScript-Style Type Definitions
==========================================

Comprehensive type definitions using Pydantic for runtime validation
and IDE support. Provides a TypeScript-like development experience
with Python's dynamic capabilities.
"""

from datetime import datetime
from enum import Enum
from typing import Dict, List, Optional, Any, Union
from uuid import UUID, uuid4

from pydantic import BaseModel, Field, validator


class MessageType(str, Enum):
    """Chat message types"""
    USER = "user"
    ASSISTANT = "assistant"
    SYSTEM = "system"
    ERROR = "error"


class ServiceStatus(str, Enum):
    """Service health status"""
    HEALTHY = "healthy"
    DEGRADED = "degraded"
    UNHEALTHY = "unhealthy"
    INITIALIZING = "initializing"


class ChatMessage(BaseModel):
    """
    Individual chat message with metadata

    TypeScript equivalent:
    interface ChatMessage {
        id: string;
        user_id: string;
        type: MessageType;
        content: string;
        timestamp: Date;
        metadata?: Record<string, any>;
    }
    """
    id: str = Field(default_factory=lambda: str(uuid4()))
    user_id: str = Field(..., min_length=1, description="User identifier")
    type: MessageType = Field(..., description="Message type")
    content: str = Field(..., min_length=1, description="Message content")
    timestamp: datetime = Field(default_factory=datetime.now)
    metadata: Dict[str, Any] = Field(default_factory=dict)

    class Config:
        json_encoders = {
            datetime: lambda dt: dt.isoformat()
        }


class TripData(BaseModel):
    """
    Trip planning data structure

    TypeScript equivalent:
    interface TripData {
        destinations: string[];
        start_date?: Date;
        end_date?: Date;
        budget?: number;
        preferences: Record<string, any>;
        activities: string[];
    }
    """
    destinations: List[str] = Field(default_factory=list)
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    budget: Optional[float] = Field(None, ge=0)
    preferences: Dict[str, Any] = Field(default_factory=dict)
    activities: List[str] = Field(default_factory=list)


class FinancialData(BaseModel):
    """
    Financial tracking data structure

    TypeScript equivalent:
    interface FinancialData {
        monthly_income?: number;
        expenses: Record<string, number>;
        savings_goals: Record<string, number>;
        budget_categories: Record<string, number>;
    }
    """
    monthly_income: Optional[float] = Field(None, ge=0)
    expenses: Dict[str, float] = Field(default_factory=dict)
    savings_goals: Dict[str, float] = Field(default_factory=dict)
    budget_categories: Dict[str, float] = Field(default_factory=dict)


class UserContext(BaseModel):
    """
    User context information

    TypeScript equivalent:
    interface UserContext {
        user_id: string;
        preferences: Record<string, any>;
        trip_data: TripData;
        financial_data: FinancialData;
        last_activity: Date;
    }
    """
    user_id: str = Field(..., min_length=1)
    preferences: Dict[str, Any] = Field(default_factory=dict)
    trip_data: TripData = Field(default_factory=TripData)
    financial_data: FinancialData = Field(default_factory=FinancialData)
    last_activity: datetime = Field(default_factory=datetime.now)


class ConversationContext(BaseModel):
    """
    Full conversation context with history

    TypeScript equivalent:
    interface ConversationContext {
        session_id: string;
        user_context: UserContext;
        messages: ChatMessage[];
        current_topic?: string;
        last_activity: Date;
        metadata: Record<string, any>;
    }
    """
    session_id: str = Field(default_factory=lambda: str(uuid4()))
    user_context: UserContext
    messages: List[ChatMessage] = Field(default_factory=list)
    current_topic: Optional[str] = None
    last_activity: datetime = Field(default_factory=datetime.now)
    metadata: Dict[str, Any] = Field(default_factory=dict)

    @validator('messages')
    def limit_message_history(cls, messages):
        """Keep only last 50 messages for performance"""
        if len(messages) > 50:
            return messages[-50:]
        return messages


class ServiceResponse(BaseModel):
    """
    Standard service response format

    TypeScript equivalent:
    interface ServiceResponse<T = any> {
        success: boolean;
        data: T;
        error?: string;
        metadata: Record<string, any>;
        timestamp: Date;
        service_name: string;
    }
    """
    success: bool = Field(..., description="Operation success status")
    data: Any = Field(..., description="Response data")
    error: Optional[str] = Field(None, description="Error message if failed")
    metadata: Dict[str, Any] = Field(default_factory=dict)
    timestamp: datetime = Field(default_factory=datetime.now)
    service_name: str = Field(..., description="Name of the service")

    class Config:
        json_encoders = {
            datetime: lambda dt: dt.isoformat()
        }


class GeminiConfig(BaseModel):
    """
    Google Gemini configuration

    TypeScript equivalent:
    interface GeminiConfig {
        api_key: string;
        model: string;
        temperature: number;
        max_tokens: number;
        timeout_seconds: number;
    }
    """
    api_key: str = Field(..., min_length=10)
    model: str = Field(default="gemini-1.5-flash")
    temperature: float = Field(default=0.7, ge=0.0, le=2.0)
    max_tokens: int = Field(default=1000, ge=1, le=8192)
    timeout_seconds: int = Field(default=30, ge=1, le=300)

    @validator('api_key')
    def validate_api_key_format(cls, v):
        """Validate Gemini API key format"""
        if not v.startswith('AIza'):
            raise ValueError(
                "Invalid Gemini API key format. "
                "Google API keys typically start with 'AIza'. "
                "Get your key at https://makersuite.google.com/app/apikey"
            )
        return v


class RedisConfig(BaseModel):
    """
    Redis configuration

    TypeScript equivalent:
    interface RedisConfig {
        url: string;
        max_connections: number;
        timeout_seconds: number;
        default_ttl: number;
    }
    """
    url: str = Field(default="redis://localhost:6379")
    max_connections: int = Field(default=10, ge=1, le=100)
    timeout_seconds: int = Field(default=5, ge=1, le=30)
    default_ttl: int = Field(default=3600, ge=60, le=86400)  # 1 hour to 1 day


class RateLimitConfig(BaseModel):
    """
    Rate limiting configuration

    TypeScript equivalent:
    interface RateLimitConfig {
        messages_per_hour: number;
        messages_per_minute: number;
        burst_limit: number;
    }
    """
    messages_per_hour: int = Field(default=100, ge=1, le=1000)
    messages_per_minute: int = Field(default=10, ge=1, le=60)
    burst_limit: int = Field(default=5, ge=1, le=20)


# Type aliases for better readability (TypeScript style)
MessageHistory = List[ChatMessage]
UserID = str
SessionID = str
Timestamp = datetime
ServiceMetadata = Dict[str, Any]