"""
PAM 2.0 API Models
==================

Pydantic models for API requests and responses.
Provides type safety and automatic validation for all API endpoints.
"""

from datetime import datetime
from typing import Optional, Dict, Any, List
from pydantic import BaseModel, Field

from ..core.types import ServiceStatus


class ChatRequest(BaseModel):
    """Request model for chat endpoints"""
    user_id: str = Field(..., min_length=1, description="User identifier")
    message: str = Field(..., min_length=1, description="User message")
    session_id: Optional[str] = Field(None, description="Optional session ID")
    context_enabled: bool = Field(default=True, description="Enable conversation context")

    class Config:
        schema_extra = {
            "example": {
                "user_id": "user_123",
                "message": "Plan a 5-day trip to Tokyo with a $2000 budget",
                "session_id": "session_456",
                "context_enabled": True
            }
        }


class ChatResponse(BaseModel):
    """Response model for chat endpoints"""
    success: bool = Field(..., description="Operation success status")
    response: Optional[str] = Field(None, description="AI-generated response")
    ui_action: Optional[str] = Field(None, description="Suggested UI action")
    processing_time_ms: int = Field(..., description="Processing time in milliseconds")
    model_used: str = Field(..., description="AI model used for response")
    session_id: Optional[str] = Field(None, description="Session identifier")
    error: Optional[str] = Field(None, description="Error message if failed")
    metadata: Dict[str, Any] = Field(default_factory=dict, description="Additional metadata")

    class Config:
        schema_extra = {
            "example": {
                "success": True,
                "response": "I'd love to help you plan your Tokyo trip! For a 5-day trip with a $2000 budget...",
                "ui_action": "update_trip",
                "processing_time_ms": 150,
                "model_used": "gemini-1.5-flash",
                "session_id": "session_456",
                "metadata": {
                    "tokens_used": 75,
                    "cost_estimate": 0.0056
                }
            }
        }


class TripAnalysisRequest(BaseModel):
    """Request model for trip analysis"""
    user_id: str = Field(..., min_length=1, description="User identifier")
    message: str = Field(..., min_length=1, description="Message to analyze")

    class Config:
        schema_extra = {
            "example": {
                "user_id": "user_123",
                "message": "I want to visit Paris for 7 days with my family, budget around $3000"
            }
        }


class TripAnalysisResponse(BaseModel):
    """Response model for trip analysis"""
    success: bool = Field(..., description="Operation success status")
    trip_activity_detected: bool = Field(..., description="Whether trip activity was detected")
    activity_score: float = Field(..., description="Trip activity confidence score")
    entities: Optional[Dict[str, List[str]]] = Field(None, description="Extracted trip entities")
    confidence: float = Field(..., description="Overall confidence score")
    error: Optional[str] = Field(None, description="Error message if failed")

    class Config:
        schema_extra = {
            "example": {
                "success": True,
                "trip_activity_detected": True,
                "activity_score": 0.85,
                "entities": {
                    "destinations": ["Paris"],
                    "budgets": ["3000"],
                    "dates": ["7 days"],
                    "activities": ["family"]
                },
                "confidence": 0.9
            }
        }


class FinancialAnalysisRequest(BaseModel):
    """Request model for financial analysis"""
    user_id: str = Field(..., min_length=1, description="User identifier")
    message: str = Field(..., min_length=1, description="Message to analyze")

    class Config:
        schema_extra = {
            "example": {
                "user_id": "user_123",
                "message": "I spent $500 on groceries this month, is that too much?"
            }
        }


class FinancialAnalysisResponse(BaseModel):
    """Response model for financial analysis"""
    success: bool = Field(..., description="Operation success status")
    financial_content_detected: bool = Field(..., description="Whether financial content was detected")
    financial_score: float = Field(..., description="Financial content confidence score")
    entities: Optional[Dict[str, List[str]]] = Field(None, description="Extracted financial entities")
    recommendations: List[str] = Field(default_factory=list, description="Financial recommendations")
    savings_analysis: Optional[Dict[str, Any]] = Field(None, description="Savings potential analysis")
    confidence: float = Field(..., description="Overall confidence score")
    error: Optional[str] = Field(None, description="Error message if failed")

    class Config:
        schema_extra = {
            "example": {
                "success": True,
                "financial_content_detected": True,
                "financial_score": 0.75,
                "entities": {
                    "amounts": ["500"],
                    "categories": ["groceries"]
                },
                "recommendations": [
                    "Try meal planning and cooking at home to reduce food expenses by 20-30%."
                ],
                "confidence": 0.8
            }
        }


class SafetyCheckRequest(BaseModel):
    """Request model for safety checks"""
    user_id: str = Field(..., min_length=1, description="User identifier")
    content: str = Field(..., min_length=1, description="Content to check")

    class Config:
        schema_extra = {
            "example": {
                "user_id": "user_123",
                "content": "Help me plan a safe trip to Tokyo"
            }
        }


class SafetyCheckResponse(BaseModel):
    """Response model for safety checks"""
    success: bool = Field(..., description="Operation success status")
    safety_passed: bool = Field(..., description="Whether content passed safety checks")
    checks: Dict[str, bool] = Field(..., description="Individual check results")
    rate_limit_status: Optional[Dict[str, Any]] = Field(None, description="Current rate limit status")
    error: Optional[str] = Field(None, description="Error message if failed")

    class Config:
        schema_extra = {
            "example": {
                "success": True,
                "safety_passed": True,
                "checks": {
                    "content_filter": True,
                    "rate_limit": True
                },
                "rate_limit_status": {
                    "hourly_remaining": 95,
                    "minute_remaining": 9
                }
            }
        }


class HealthResponse(BaseModel):
    """Response model for health checks"""
    status: ServiceStatus = Field(..., description="Overall service status")
    version: str = Field(..., description="Application version")
    timestamp: datetime = Field(..., description="Health check timestamp")
    services: Dict[str, Dict[str, Any]] = Field(..., description="Individual service health")
    uptime_seconds: float = Field(..., description="Service uptime in seconds")

    class Config:
        schema_extra = {
            "example": {
                "status": "healthy",
                "version": "2.0.0",
                "timestamp": "2025-01-01T12:00:00Z",
                "services": {
                    "conversational_engine": {
                        "status": "healthy",
                        "model": "gemini-1.5-flash"
                    },
                    "context_manager": {
                        "status": "healthy",
                        "redis_available": True
                    }
                },
                "uptime_seconds": 3600.0
            }
        }


# WebSocket message models

class WebSocketMessage(BaseModel):
    """Base WebSocket message model"""
    type: str = Field(..., description="Message type")
    data: Dict[str, Any] = Field(..., description="Message data")
    timestamp: datetime = Field(default_factory=datetime.now, description="Message timestamp")

    class Config:
        schema_extra = {
            "example": {
                "type": "chat_message",
                "data": {
                    "user_id": "user_123",
                    "message": "Hello PAM!"
                },
                "timestamp": "2025-01-01T12:00:00Z"
            }
        }


class WebSocketChatMessage(BaseModel):
    """WebSocket chat message"""
    user_id: str = Field(..., min_length=1, description="User identifier")
    message: str = Field(..., min_length=1, description="Chat message")
    session_id: Optional[str] = Field(None, description="Session identifier")

    class Config:
        schema_extra = {
            "example": {
                "user_id": "user_123",
                "message": "Plan a trip to Tokyo",
                "session_id": "session_456"
            }
        }


class WebSocketResponse(BaseModel):
    """WebSocket response message"""
    type: str = Field(..., description="Response type")
    success: bool = Field(..., description="Operation success")
    data: Any = Field(..., description="Response data")
    error: Optional[str] = Field(None, description="Error message if failed")
    timestamp: datetime = Field(default_factory=datetime.now, description="Response timestamp")

    class Config:
        schema_extra = {
            "example": {
                "type": "chat_response",
                "success": True,
                "data": {
                    "response": "I'd love to help you plan your Tokyo trip!",
                    "processing_time_ms": 150
                },
                "timestamp": "2025-01-01T12:00:00Z"
            }
        }