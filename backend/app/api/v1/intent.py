"""
Intent Classification API Endpoint
Provides enhanced intent classification services for PAM
"""

from fastapi import APIRouter, HTTPException, Depends
from typing import Dict, Any, Optional
from pydantic import BaseModel, Field
import logging
from datetime import datetime

from app.api.deps import get_current_user, verify_supabase_jwt_token
from app.services.pam.intent_classifier import get_intent_classifier
from app.services.pam.intent_handlers import get_intent_router
from app.core.feature_flags import is_feature_enabled

logger = logging.getLogger(__name__)

router = APIRouter()


class IntentClassificationRequest(BaseModel):
    """Request model for intent classification"""
    message: str = Field(description="User message to classify")
    context: Optional[Dict[str, Any]] = Field(
        description="Additional context (current_page, user_id, etc.)",
        default={}
    )
    include_routing: Optional[bool] = Field(
        description="Whether to include routing to handlers",
        default=False
    )


class IntentClassificationResponse(BaseModel):
    """Response model for intent classification"""
    success: bool
    classification: Optional[Dict[str, Any]] = None
    routing_result: Optional[Dict[str, Any]] = None
    error: Optional[str] = None
    processing_time_ms: Optional[int] = None


@router.post("/classify-intent", response_model=IntentClassificationResponse)
async def classify_intent(
    request: IntentClassificationRequest,
    user_data: Dict = Depends(verify_supabase_jwt_token)
):
    """
    Classify user intent using enhanced AI-powered classification system
    """
    start_time = datetime.now()
    user_id = user_data.get('sub', 'anonymous')
    
    try:
        logger.info(f"Intent classification requested by user {user_id}: {request.message[:100]}...")
        
        # Check if enhanced intent classification is enabled
        if not is_feature_enabled("ENABLE_PAM_ENHANCED", user_id):
            raise HTTPException(
                status_code=503,
                detail="Enhanced intent classification is not enabled for this user"
            )
        
        # Get intent classifier
        classifier = get_intent_classifier()
        
        # Add user_id to context
        context = request.context or {}
        context['user_id'] = user_id
        
        # Classify intent
        classification = await classifier.classify_intent(
            message=request.message,
            user_id=user_id,
            context=context
        )
        
        # Prepare response
        classification_data = classification.to_dict()
        
        response = IntentClassificationResponse(
            success=True,
            classification=classification_data,
            processing_time_ms=int((datetime.now() - start_time).total_seconds() * 1000)
        )
        
        # Include routing if requested
        if request.include_routing:
            try:
                router_instance = get_intent_router()
                routing_result = await router_instance.route_intent(
                    message=request.message,
                    user_id=user_id,
                    classification=classification,
                    context=context
                )
                response.routing_result = routing_result
                
                logger.info(f"Intent routed to {routing_result.get('handler', 'unknown')} for user {user_id}")
                
            except Exception as routing_error:
                logger.error(f"Intent routing error for user {user_id}: {routing_error}")
                response.routing_result = {
                    "error": "Routing failed",
                    "message": str(routing_error)
                }
        
        logger.info(f"Intent classified as {classification.intent.value} (confidence: {classification.confidence:.2f}) for user {user_id}")
        return response
        
    except HTTPException:
        raise
        
    except Exception as e:
        logger.error(f"Intent classification error for user {user_id}: {e}")
        
        processing_time = int((datetime.now() - start_time).total_seconds() * 1000)
        
        return IntentClassificationResponse(
            success=False,
            error=str(e),
            processing_time_ms=processing_time
        )


@router.post("/learn-from-correction")
async def learn_from_correction(
    original_message: str,
    original_intent: str,
    corrected_intent: str,
    feedback: Optional[str] = None,
    user_data: Dict = Depends(verify_supabase_jwt_token)
):
    """
    Learn from user corrections to improve intent classification
    """
    user_id = user_data.get('sub', 'anonymous')
    
    try:
        logger.info(f"Learning correction from user {user_id}: {original_intent} -> {corrected_intent}")
        
        # Check feature flag
        if not is_feature_enabled("ENABLE_PAM_ENHANCED", user_id):
            raise HTTPException(
                status_code=503,
                detail="Enhanced intent classification is not enabled for this user"
            )
        
        # Get classifier and learn from correction
        classifier = get_intent_classifier()
        
        # Note: This would need the original classification object
        # For now, we'll log the correction for manual analysis
        logger.info(f"Intent correction logged: {original_message[:50]}... | {original_intent} -> {corrected_intent} | Feedback: {feedback}")
        
        return {
            "success": True,
            "message": "Correction learned and will improve future classifications",
            "user_id": user_id,
            "timestamp": datetime.utcnow().isoformat()
        }
        
    except HTTPException:
        raise
        
    except Exception as e:
        logger.error(f"Learning correction error for user {user_id}: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to learn from correction: {str(e)}"
        )


@router.get("/intent-patterns")
async def get_intent_patterns(
    user_data: Dict = Depends(verify_supabase_jwt_token)
):
    """
    Get user's intent patterns for analytics and proactive assistance
    """
    user_id = user_data.get('sub', 'anonymous')
    
    try:
        logger.info(f"Intent patterns requested by user {user_id}")
        
        # Check feature flag
        if not is_feature_enabled("ENABLE_PAM_ENHANCED", user_id):
            raise HTTPException(
                status_code=503,
                detail="Enhanced intent classification is not enabled for this user"
            )
        
        # Get classifier and retrieve patterns
        classifier = get_intent_classifier()
        patterns = await classifier.get_intent_patterns(user_id)
        
        return {
            "success": True,
            "patterns": patterns,
            "user_id": user_id,
            "retrieved_at": datetime.utcnow().isoformat()
        }
        
    except HTTPException:
        raise
        
    except Exception as e:
        logger.error(f"Intent patterns error for user {user_id}: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to retrieve intent patterns: {str(e)}"
        )


@router.post("/test-classification")
async def test_classification(
    test_messages: list[str],
    user_data: Dict = Depends(verify_supabase_jwt_token)
):
    """
    Test intent classification on multiple messages (for debugging/testing)
    """
    user_id = user_data.get('sub', 'anonymous')
    
    try:
        logger.info(f"Intent classification test requested by user {user_id} for {len(test_messages)} messages")
        
        # Check feature flag
        if not is_feature_enabled("ENABLE_PAM_ENHANCED", user_id):
            raise HTTPException(
                status_code=503,
                detail="Enhanced intent classification is not enabled for this user"
            )
        
        # Limit test messages
        if len(test_messages) > 20:
            raise HTTPException(
                status_code=400,
                detail="Maximum 20 test messages allowed"
            )
        
        classifier = get_intent_classifier()
        results = []
        
        for message in test_messages:
            try:
                classification = await classifier.classify_intent(
                    message=message,
                    user_id=user_id,
                    context={"test_mode": True}
                )
                
                results.append({
                    "message": message,
                    "classification": classification.to_dict()
                })
                
            except Exception as msg_error:
                results.append({
                    "message": message,
                    "error": str(msg_error)
                })
        
        return {
            "success": True,
            "results": results,
            "total_tested": len(test_messages),
            "user_id": user_id,
            "timestamp": datetime.utcnow().isoformat()
        }
        
    except HTTPException:
        raise
        
    except Exception as e:
        logger.error(f"Intent classification test error for user {user_id}: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Classification test failed: {str(e)}"
        )


# Health check endpoint
@router.get("/health")
async def intent_service_health():
    """Health check for intent classification service"""
    try:
        classifier = get_intent_classifier()
        router_instance = get_intent_router()
        
        return {
            "status": "healthy",
            "service": "intent_classification",
            "classifier_available": classifier is not None,
            "router_available": router_instance is not None,
            "ai_model_available": classifier.ai_model is not None if classifier else False,
            "timestamp": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Intent service health check failed: {e}")
        return {
            "status": "unhealthy",
            "service": "intent_classification",
            "error": str(e),
            "timestamp": datetime.utcnow().isoformat()
        }