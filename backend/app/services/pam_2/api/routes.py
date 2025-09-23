"""
PAM 2.0 API Routes
Enhanced router with service integration
"""

from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import JSONResponse
from typing import Optional, Dict, Any
import logging
from datetime import datetime

# Import models from the new structure
from .models import (
    ChatRequest,
    ChatResponse,
    HealthCheckResponse,
    ContextRequest,
    ContextResponse,
    SafetyCheckRequest,
    SafetyCheckResponse,
    TripActivityRequest,
    TripActivityResponse,
    FinancialAnalysisRequest,
    FinancialAnalysisResponse,
    ErrorResponse
)

# Import services
from ..services import (
    ConversationalEngine,
    ContextManager,
    TripLogger,
    SavingsTracker,
    SafetyLayer
)

# Import core utilities
from ..core.exceptions import PAMBaseException, format_error_response

logger = logging.getLogger(__name__)

# Create router
router = APIRouter()

# Service instances (will be dependency injected in Phase 2+)
conversational_engine = ConversationalEngine()
context_manager = ContextManager()
trip_logger = TripLogger()
savings_tracker = SavingsTracker()
safety_layer = SafetyLayer()

# =====================================================
# Health Check Endpoints
# =====================================================

@router.get("/health", response_model=HealthCheckResponse)
async def pam_health():
    """PAM 2.0 Comprehensive Health Check"""
    try:
        # Get health from all services
        service_healths = await get_all_service_health()

        # Determine overall status
        overall_status = "healthy"
        if any(health.get("status") != "healthy" for health in service_healths.values()):
            overall_status = "degraded"

        return HealthCheckResponse(
            status=overall_status,
            service="pam-2.0",
            version="2.0.0",
            modules={
                service: health.get("status", "unknown")
                for service, health in service_healths.items()
            }
        )

    except Exception as e:
        logger.error(f"Health check error: {e}")
        return HealthCheckResponse(
            status="unhealthy",
            service="pam-2.0",
            version="2.0.0",
            modules={"error": str(e)}
        )

async def get_all_service_health() -> Dict[str, Dict[str, Any]]:
    """Get health status from all services"""
    return {
        "conversational_engine": await conversational_engine.get_service_health(),
        "context_manager": await context_manager.get_service_health(),
        "trip_logger": await trip_logger.get_service_health(),
        "savings_tracker": await savings_tracker.get_service_health(),
        "safety_layer": await safety_layer.get_service_health()
    }

# =====================================================
# Chat Endpoints
# =====================================================

@router.post("/chat", response_model=ChatResponse)
async def chat_endpoint(request: ChatRequest):
    """
    PAM 2.0 Enhanced Chat Endpoint
    Integrates all services for comprehensive AI assistance
    """
    try:
        logger.info(f"Processing chat request for user {request.user_id}")

        # Phase 1: Safety check first
        safety_check = await safety_layer.check_message_safety(
            user_id=request.user_id,
            message=request.message,
            context=request.context
        )

        if not safety_check.data.get("is_safe", False):
            raise HTTPException(
                status_code=400,
                detail=f"Message blocked: {safety_check.data.get('detected_issues', [])}"
            )

        # Get conversation context
        context = await context_manager.get_conversation_context(
            user_id=request.user_id,
            session_id=request.session_id
        )

        # Create context if none exists
        if not context:
            context = await context_manager.create_conversation_context(
                user_id=request.user_id,
                session_id=request.session_id
            )

        # Process with conversational engine
        ai_response = await conversational_engine.process_message(
            user_id=request.user_id,
            message=request.message,
            context=context
        )

        # Analyze for trip activity (passive logging)
        trip_analysis = await trip_logger.analyze_conversation_for_trip_activity(
            user_id=request.user_id,
            message=request.message,
            context=request.context
        )

        # Analyze for financial content
        financial_analysis = await savings_tracker.analyze_financial_conversation(
            user_id=request.user_id,
            message=request.message,
            context=request.context
        )

        # Update conversation context
        from ..core.types import ChatMessage, MessageType
        user_message = ChatMessage(
            user_id=request.user_id,
            type=MessageType.USER,
            content=request.message,
            timestamp=datetime.now()
        )
        await context_manager.update_conversation_context(context, user_message)

        # Build enhanced response
        enhanced_metadata = {
            "user_id": request.user_id,
            "session_id": context.session_id,
            "phase": "1_with_services",
            "service_analyses": {
                "trip_activity": trip_analysis.data,
                "financial_content": financial_analysis.data,
                "safety_check": safety_check.data
            },
            "timestamp": datetime.now().isoformat()
        }

        response = ChatResponse(
            response=ai_response.data.get("response", ""),
            ui_action=ai_response.data.get("ui_action"),
            metadata=enhanced_metadata,
            session_id=context.session_id
        )

        return response

    except HTTPException:
        raise
    except PAMBaseException as e:
        logger.error(f"PAM service error: {e}")
        raise HTTPException(status_code=500, detail=format_error_response(e))
    except Exception as e:
        logger.error(f"Chat endpoint error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# =====================================================
# Context Management Endpoints
# =====================================================

@router.get("/context/{user_id}", response_model=ContextResponse)
async def get_user_context(
    user_id: str,
    session_id: Optional[str] = None
):
    """Get conversation context for user"""
    try:
        context = await context_manager.get_conversation_context(user_id, session_id)

        if context:
            return ContextResponse(
                context_found=True,
                session_id=context.session_id,
                message_count=len(context.messages),
                last_activity=context.last_activity,
                context_data={
                    "current_topic": context.current_topic,
                    "user_preferences": context.user_context.preferences
                }
            )
        else:
            return ContextResponse(
                context_found=False,
                message_count=0
            )

    except Exception as e:
        logger.error(f"Error getting context for user {user_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# =====================================================
# Service-Specific Endpoints
# =====================================================

@router.post("/analyze/trip", response_model=TripActivityResponse)
async def analyze_trip_activity(request: TripActivityRequest):
    """Analyze message for trip planning activity"""
    try:
        result = await trip_logger.analyze_conversation_for_trip_activity(
            user_id=request.user_id,
            message=request.message,
            context=request.context
        )

        return TripActivityResponse(
            trip_activity_detected=result.data.get("trip_activity_detected", False),
            activity_type=result.data.get("activity_type"),
            confidence=result.data.get("confidence", 0.0),
            entities=result.data.get("entities", []),
            suggestions=await trip_logger.suggest_trip_assistance(
                request.user_id,
                result.data
            )
        )

    except Exception as e:
        logger.error(f"Error analyzing trip activity: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/analyze/financial", response_model=FinancialAnalysisResponse)
async def analyze_financial_content(request: FinancialAnalysisRequest):
    """Analyze message for financial content"""
    try:
        result = await savings_tracker.analyze_financial_conversation(
            user_id=request.user_id,
            message=request.message,
            context=request.context
        )

        return FinancialAnalysisResponse(
            financial_content_detected=result.data.get("financial_content_detected", False),
            topic_type=result.data.get("topic_type"),
            confidence=result.data.get("confidence", 0.0),
            recommendations=result.data.get("recommendations", []),
            detected_amounts=result.data.get("detected_amounts", [])
        )

    except Exception as e:
        logger.error(f"Error analyzing financial content: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/safety/check", response_model=SafetyCheckResponse)
async def check_content_safety(request: SafetyCheckRequest):
    """Check content safety"""
    try:
        result = await safety_layer.check_message_safety(
            user_id=request.user_id,
            message=request.content
        )

        return SafetyCheckResponse(
            is_safe=result.data.get("is_safe", False),
            risk_level=result.data.get("risk_level", "unknown"),
            confidence=result.data.get("confidence", 0.0),
            issues=result.data.get("detected_issues", []),
            requires_disclaimer=result.data.get("requires_disclaimer", False)
        )

    except Exception as e:
        logger.error(f"Error checking content safety: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# =====================================================
# Development/Debug Endpoints
# =====================================================

@router.get("/debug/services")
async def debug_services():
    """Debug endpoint to check all service statuses"""
    try:
        return await get_all_service_health()
    except Exception as e:
        return {"error": str(e)}

@router.get("/debug/config")
async def debug_config():
    """Debug endpoint to check configuration"""
    from ..core.config import pam2_settings

    return {
        "service_name": pam2_settings.service_name,
        "version": pam2_settings.version,
        "environment": pam2_settings.environment,
        "services_enabled": {
            "conversational_engine": pam2_settings.conversational_engine_enabled,
            "context_manager": pam2_settings.context_manager_enabled,
            "trip_logger": pam2_settings.trip_logger_enabled,
            "savings_tracker": pam2_settings.savings_tracker_enabled,
            "safety_layer": pam2_settings.safety_layer_enabled
        },
        "features": {
            "websocket_enabled": pam2_settings.websocket_enabled,
            "realtime_sync_enabled": pam2_settings.realtime_sync_enabled,
            "debug_mode": pam2_settings.debug_mode
        }
    }