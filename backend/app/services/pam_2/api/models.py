"""
PAM 2.0 API Models
Pydantic models for requests and responses
"""

from typing import Optional, Dict, Any, List
from pydantic import BaseModel, Field
from datetime import datetime

# =====================================================
# Request Models
# =====================================================

class ChatRequest(BaseModel):
    """Chat request model"""
    user_id: str = Field(..., description="User identifier")
    message: str = Field(..., description="User message content")
    context: Optional[Dict[str, Any]] = Field(default=None, description="Additional context")
    session_id: Optional[str] = Field(default=None, description="Session identifier")

class ContextRequest(BaseModel):
    """Context retrieval request"""
    user_id: str = Field(..., description="User identifier")
    session_id: Optional[str] = Field(default=None, description="Session identifier")
    include_history: bool = Field(default=True, description="Include conversation history")

class SafetyCheckRequest(BaseModel):
    """Safety check request"""
    user_id: str = Field(..., description="User identifier")
    content: str = Field(..., description="Content to check")
    content_type: str = Field(default="message", description="Type of content")

# =====================================================
# Response Models
# =====================================================

class ChatResponse(BaseModel):
    """Chat response model"""
    response: str = Field(..., description="AI response")
    ui_action: Optional[str] = Field(default=None, description="UI action to trigger")
    metadata: Optional[Dict[str, Any]] = Field(default=None, description="Response metadata")
    session_id: Optional[str] = Field(default=None, description="Session identifier")

class ContextResponse(BaseModel):
    """Context response model"""
    context_found: bool = Field(..., description="Whether context was found")
    session_id: Optional[str] = Field(default=None, description="Session identifier")
    message_count: int = Field(default=0, description="Number of messages in context")
    last_activity: Optional[datetime] = Field(default=None, description="Last activity timestamp")
    context_data: Optional[Dict[str, Any]] = Field(default=None, description="Context data")

class SafetyCheckResponse(BaseModel):
    """Safety check response"""
    is_safe: bool = Field(..., description="Whether content is safe")
    risk_level: str = Field(..., description="Risk level assessment")
    confidence: float = Field(..., description="Confidence in assessment")
    issues: List[str] = Field(default=[], description="Detected issues")
    requires_disclaimer: bool = Field(default=False, description="Whether disclaimer is needed")

class ServiceHealthResponse(BaseModel):
    """Service health response"""
    service: str = Field(..., description="Service name")
    status: str = Field(..., description="Service status")
    details: Dict[str, Any] = Field(default={}, description="Health details")
    timestamp: datetime = Field(default_factory=datetime.now, description="Check timestamp")

class ErrorResponse(BaseModel):
    """Error response model"""
    error: bool = Field(default=True, description="Error indicator")
    error_code: str = Field(..., description="Error code")
    message: str = Field(..., description="Error message")
    details: Optional[Dict[str, Any]] = Field(default=None, description="Error details")

# =====================================================
# WebSocket Models
# =====================================================

class WebSocketMessage(BaseModel):
    """WebSocket message model"""
    type: str = Field(..., description="Message type")
    data: Dict[str, Any] = Field(default={}, description="Message data")
    timestamp: datetime = Field(default_factory=datetime.now, description="Message timestamp")

class WebSocketChatMessage(BaseModel):
    """WebSocket chat message"""
    user_id: str = Field(..., description="User identifier")
    message: str = Field(..., description="Message content")
    session_id: Optional[str] = Field(default=None, description="Session identifier")

class WebSocketResponse(BaseModel):
    """WebSocket response model"""
    type: str = Field(..., description="Response type")
    response: str = Field(..., description="AI response")
    ui_action: Optional[str] = Field(default=None, description="UI action")
    metadata: Dict[str, Any] = Field(default={}, description="Response metadata")
    timestamp: datetime = Field(default_factory=datetime.now, description="Response timestamp")

# =====================================================
# Health Check Models
# =====================================================

class HealthCheckResponse(BaseModel):
    """Overall health check response"""
    status: str = Field(..., description="Overall status")
    service: str = Field(default="pam-2.0", description="Service name")
    version: str = Field(default="2.0.0", description="Service version")
    modules: Dict[str, str] = Field(default={}, description="Module statuses")
    timestamp: datetime = Field(default_factory=datetime.now, description="Check timestamp")

# =====================================================
# Integration Models
# =====================================================

class TripActivityRequest(BaseModel):
    """Trip activity analysis request"""
    user_id: str = Field(..., description="User identifier")
    message: str = Field(..., description="Message to analyze")
    context: Optional[Dict[str, Any]] = Field(default=None, description="Additional context")

class TripActivityResponse(BaseModel):
    """Trip activity analysis response"""
    trip_activity_detected: bool = Field(..., description="Whether trip activity was detected")
    activity_type: Optional[str] = Field(default=None, description="Type of activity detected")
    confidence: float = Field(..., description="Confidence in detection")
    entities: List[str] = Field(default=[], description="Detected entities")
    suggestions: Optional[Dict[str, Any]] = Field(default=None, description="Assistance suggestions")

class FinancialAnalysisRequest(BaseModel):
    """Financial analysis request"""
    user_id: str = Field(..., description="User identifier")
    message: str = Field(..., description="Message to analyze")
    context: Optional[Dict[str, Any]] = Field(default=None, description="Additional context")

class FinancialAnalysisResponse(BaseModel):
    """Financial analysis response"""
    financial_content_detected: bool = Field(..., description="Whether financial content was detected")
    topic_type: Optional[str] = Field(default=None, description="Type of financial topic")
    confidence: float = Field(..., description="Confidence in detection")
    recommendations: List[Dict[str, Any]] = Field(default=[], description="Financial recommendations")
    detected_amounts: List[Dict[str, Any]] = Field(default=[], description="Detected monetary amounts")