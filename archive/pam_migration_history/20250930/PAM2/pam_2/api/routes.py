"""
PAM 2.0 REST API Routes
======================

Clean REST API endpoints for PAM 2.0 services.
Provides comprehensive API access to all PAM functionality.
"""

import time
from datetime import datetime
from typing import Dict, Any

from fastapi import APIRouter, HTTPException, Depends, status
from fastapi.responses import JSONResponse

from .models import (
    ChatRequest, ChatResponse, HealthResponse,
    TripAnalysisRequest, TripAnalysisResponse,
    FinancialAnalysisRequest, FinancialAnalysisResponse,
    SafetyCheckRequest, SafetyCheckResponse
)
from ..core.types import ChatMessage, MessageType, ServiceStatus
from ..core.config import pam2_settings
from ..core.exceptions import PAM2Exception
from ..services import (
    create_conversational_engine, create_context_manager,
    create_trip_logger, create_savings_tracker, create_safety_layer
)
from ..services.voice_service import get_voice_service
from ..integrations.mcp_client import get_mcp_client
from ..services.advanced_features import get_advanced_features_service

# Global service instances (initialized on startup)
conversational_engine = None
context_manager = None
trip_logger = None
savings_tracker = None
safety_layer = None
voice_service = None
mcp_client = None
advanced_features = None

# Application start time for uptime calculation
app_start_time = time.time()

# Create FastAPI router
router = APIRouter(prefix="/api/v1", tags=["PAM 2.0"])


async def get_services():
    """Dependency to ensure services are initialized"""
    global conversational_engine, context_manager, trip_logger, savings_tracker, safety_layer

    if not conversational_engine:
        # Initialize services on first request
        conversational_engine = create_conversational_engine()
        context_manager = create_context_manager()
        trip_logger = create_trip_logger()
        savings_tracker = create_savings_tracker()
        safety_layer = create_safety_layer()

        # Initialize async services
        await conversational_engine.initialize()
        await context_manager.initialize()
        await safety_layer.initialize()

    return {
        "conversational_engine": conversational_engine,
        "context_manager": context_manager,
        "trip_logger": trip_logger,
        "savings_tracker": savings_tracker,
        "safety_layer": safety_layer
    }


@router.get("/health", response_model=HealthResponse)
async def health_check(services: Dict = Depends(get_services)):
    """
    Get overall system health status

    Returns comprehensive health information for all PAM 2.0 services.
    """
    try:
        uptime_seconds = time.time() - app_start_time

        # Check all service health
        service_health = {}
        overall_status = ServiceStatus.HEALTHY

        for service_name, service in services.items():
            try:
                health = await service.get_service_health()
                service_health[service_name] = health

                # Determine overall status based on individual services
                service_status = health.get("status", "unknown")
                if service_status == "unhealthy":
                    overall_status = ServiceStatus.UNHEALTHY
                elif service_status == "degraded" and overall_status == ServiceStatus.HEALTHY:
                    overall_status = ServiceStatus.DEGRADED

            except Exception as e:
                service_health[service_name] = {
                    "status": "unhealthy",
                    "error": str(e)
                }
                overall_status = ServiceStatus.UNHEALTHY

        return HealthResponse(
            status=overall_status,
            version=pam2_settings.app_version,
            timestamp=datetime.now(),
            services=service_health,
            uptime_seconds=uptime_seconds
        )

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Health check failed: {str(e)}"
        )


@router.post("/chat", response_model=ChatResponse)
async def chat(
    request: ChatRequest,
    services: Dict = Depends(get_services)
):
    """
    Process chat message and generate AI response

    Handles conversation with context awareness and safety checks.
    """
    try:
        # Create chat message
        chat_message = ChatMessage(
            user_id=request.user_id,
            type=MessageType.USER,
            content=request.message
        )

        # Safety check first
        safety_result = await services["safety_layer"].check_message_safety(chat_message)
        if not safety_result.success or not safety_result.data["safety_passed"]:
            return ChatResponse(
                success=False,
                response=None,
                ui_action="none",
                processing_time_ms=0,
                model_used="none",
                session_id=request.session_id,
                error="Message blocked by safety filters",
                metadata=safety_result.data
            )

        # Retrieve context if enabled and session provided
        context = None
        if request.context_enabled and request.session_id:
            context_result = await services["context_manager"].retrieve_context(
                request.session_id, request.user_id
            )
            if context_result.success and context_result.data:
                context = context_result.data

        # Generate AI response
        response_result = await services["conversational_engine"].process_message(
            user_id=request.user_id,
            message=request.message,
            context=context,
            session_id=request.session_id
        )

        if not response_result.success:
            return ChatResponse(
                success=False,
                response=None,
                ui_action="none",
                processing_time_ms=response_result.metadata.get("processing_time_ms", 0),
                model_used="none",
                session_id=request.session_id,
                error=response_result.error,
                metadata=response_result.metadata
            )

        # Store updated context if enabled
        if request.context_enabled and request.session_id and context:
            # Add user message and AI response to context
            ai_response_message = ChatMessage(
                user_id=request.user_id,
                type=MessageType.ASSISTANT,
                content=response_result.data["response"]
            )

            await services["context_manager"].add_message_to_context(request.session_id, chat_message)
            await services["context_manager"].add_message_to_context(request.session_id, ai_response_message)

        return ChatResponse(
            success=True,
            response=response_result.data["response"],
            ui_action=response_result.data.get("ui_action", "none"),
            processing_time_ms=response_result.data.get("processing_time_ms", 0),
            model_used=response_result.data.get("model_used", "unknown"),
            session_id=request.session_id,
            metadata=response_result.metadata
        )

    except PAM2Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=e.to_dict()
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Chat processing failed: {str(e)}"
        )


@router.post("/analyze/trip", response_model=TripAnalysisResponse)
async def analyze_trip(
    request: TripAnalysisRequest,
    services: Dict = Depends(get_services)
):
    """
    Analyze message for trip planning activity

    Detects travel-related content and extracts trip entities.
    """
    try:
        chat_message = ChatMessage(
            user_id=request.user_id,
            type=MessageType.USER,
            content=request.message
        )

        result = await services["trip_logger"].analyze_trip_activity(chat_message)

        if not result.success:
            return TripAnalysisResponse(
                success=False,
                trip_activity_detected=False,
                activity_score=0.0,
                confidence=0.0,
                error=result.error
            )

        return TripAnalysisResponse(
            success=True,
            trip_activity_detected=result.data.get("trip_activity_detected", False),
            activity_score=result.data.get("activity_score", 0.0),
            entities=result.data.get("entities"),
            confidence=result.data.get("confidence", 0.0)
        )

    except PAM2Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=e.to_dict()
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Trip analysis failed: {str(e)}"
        )


@router.post("/analyze/financial", response_model=FinancialAnalysisResponse)
async def analyze_financial(
    request: FinancialAnalysisRequest,
    services: Dict = Depends(get_services)
):
    """
    Analyze message for financial content

    Detects financial content and provides savings recommendations.
    """
    try:
        chat_message = ChatMessage(
            user_id=request.user_id,
            type=MessageType.USER,
            content=request.message
        )

        result = await services["savings_tracker"].analyze_financial_content(chat_message)

        if not result.success:
            return FinancialAnalysisResponse(
                success=False,
                financial_content_detected=False,
                financial_score=0.0,
                confidence=0.0,
                error=result.error
            )

        return FinancialAnalysisResponse(
            success=True,
            financial_content_detected=result.data.get("financial_content_detected", False),
            financial_score=result.data.get("financial_score", 0.0),
            entities=result.data.get("entities"),
            recommendations=result.data.get("recommendations", []),
            savings_analysis=result.data.get("savings_analysis"),
            confidence=result.data.get("confidence", 0.0)
        )

    except PAM2Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=e.to_dict()
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Financial analysis failed: {str(e)}"
        )


@router.post("/safety/check", response_model=SafetyCheckResponse)
async def check_safety(
    request: SafetyCheckRequest,
    services: Dict = Depends(get_services)
):
    """
    Check content safety and rate limits

    Validates content against safety policies and rate limits.
    """
    try:
        chat_message = ChatMessage(
            user_id=request.user_id,
            type=MessageType.USER,
            content=request.content
        )

        safety_result = await services["safety_layer"].check_message_safety(chat_message)
        rate_status_result = await services["safety_layer"].get_user_rate_status(request.user_id)

        return SafetyCheckResponse(
            success=safety_result.success,
            safety_passed=safety_result.data.get("safety_passed", False),
            checks=safety_result.data.get("checks", {}),
            rate_limit_status=rate_status_result.data if rate_status_result.success else None,
            error=safety_result.error
        )

    except PAM2Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=e.to_dict()
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Safety check failed: {str(e)}"
        )


@router.get("/debug/config")
async def debug_config():
    """
    Get configuration information (for debugging)

    Only available in development mode.
    """
    if not pam2_settings.is_development:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Debug endpoints only available in development mode"
        )

    return {
        "environment": pam2_settings.environment,
        "app_name": pam2_settings.app_name,
        "app_version": pam2_settings.app_version,
        "debug": pam2_settings.debug,
        "gemini_model": pam2_settings.gemini_model,
        "rate_limits": {
            "messages_per_hour": pam2_settings.rate_limit_messages_per_hour,
            "messages_per_minute": pam2_settings.rate_limit_messages_per_minute
        },
        "features": {
            "content_filtering": pam2_settings.enable_content_filtering,
            "rate_limiting": pam2_settings.enable_rate_limiting,
            "trip_logger": pam2_settings.enable_trip_logger,
            "savings_tracker": pam2_settings.enable_savings_tracker
        }
    }