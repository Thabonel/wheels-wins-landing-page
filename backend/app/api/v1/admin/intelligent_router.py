"""
Admin API Endpoints for Intelligent Model Router
Configure and monitor automatic model selection

Endpoints:
  GET  /api/v1/admin/router/config - View router configuration
  POST /api/v1/admin/router/config - Update router configuration
  GET  /api/v1/admin/router/stats - Get performance statistics
  POST /api/v1/admin/router/test - Test model selection for a query

Date: October 16, 2025
"""

from fastapi import APIRouter, HTTPException, Depends
from typing import Dict, Any, Optional
from pydantic import BaseModel
import logging

from app.services.pam.intelligent_router import get_intelligent_router
from app.core.unified_auth import require_admin

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/router", tags=["admin", "intelligent-router"])


class RouterConfigResponse(BaseModel):
    """Current router configuration"""
    enable_intelligent_routing: bool
    prefer_cost_optimization: bool
    require_tool_support: bool
    max_latency_ms: int
    confidence_threshold: float


class UpdateRouterConfigRequest(BaseModel):
    """Request to update router configuration"""
    enable_intelligent_routing: Optional[bool] = None
    prefer_cost_optimization: Optional[bool] = None
    require_tool_support: Optional[bool] = None
    max_latency_ms: Optional[int] = None
    confidence_threshold: Optional[float] = None


class TestSelectionRequest(BaseModel):
    """Request to test model selection"""
    message: str
    context: Optional[Dict[str, Any]] = None


@router.get("/config", response_model=RouterConfigResponse)
async def get_router_configuration(
    current_user = Depends(require_admin)
):
    """
    Get current intelligent router configuration

    Returns:
    - Intelligent routing enabled/disabled
    - Cost optimization preference
    - Tool support requirement
    - Performance thresholds

    Admin only - requires authentication
    """
    try:
        router_instance = get_intelligent_router()

        return RouterConfigResponse(
            enable_intelligent_routing=router_instance.config["enable_intelligent_routing"],
            prefer_cost_optimization=router_instance.config["prefer_cost_optimization"],
            require_tool_support=router_instance.config["require_tool_support"],
            max_latency_ms=router_instance.config["max_latency_ms"],
            confidence_threshold=router_instance.config["confidence_threshold"]
        )

    except Exception as e:
        logger.error(f"Failed to get router configuration: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/config")
async def update_router_configuration(
    request: UpdateRouterConfigRequest,
    current_user = Depends(require_admin)
):
    """
    Update intelligent router configuration

    Allows fine-tuning of automatic model selection behavior:
    - Enable/disable intelligent routing
    - Adjust cost vs quality preference
    - Set performance thresholds

    Changes take effect immediately on next PAM request.

    Admin only - requires authentication
    """
    try:
        router_instance = get_intelligent_router()

        # Build update dict (only include non-None values)
        updates = {}
        if request.enable_intelligent_routing is not None:
            updates["enable_intelligent_routing"] = request.enable_intelligent_routing
        if request.prefer_cost_optimization is not None:
            updates["prefer_cost_optimization"] = request.prefer_cost_optimization
        if request.require_tool_support is not None:
            updates["require_tool_support"] = request.require_tool_support
        if request.max_latency_ms is not None:
            updates["max_latency_ms"] = request.max_latency_ms
        if request.confidence_threshold is not None:
            updates["confidence_threshold"] = request.confidence_threshold

        # Update config
        router_instance.update_config(updates)

        logger.info(f"Admin {current_user.email} updated router config: {updates}")

        return {
            "success": True,
            "message": "Router configuration updated successfully",
            "updated_config": router_instance.config
        }

    except Exception as e:
        logger.error(f"Failed to update router configuration: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/stats")
async def get_router_statistics(
    model_id: Optional[str] = None,
    current_user = Depends(require_admin)
):
    """
    Get performance statistics for intelligent routing

    Returns:
    - Request counts per model
    - Success rates
    - Average latency
    - Total costs
    - Complexity breakdown

    Admin only - requires authentication
    """
    try:
        router_instance = get_intelligent_router()
        stats = router_instance.get_performance_stats(model_id)

        return {
            "success": True,
            "stats": stats
        }

    except Exception as e:
        logger.error(f"Failed to get router statistics: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/test")
async def test_model_selection(
    request: TestSelectionRequest,
    current_user = Depends(require_admin)
):
    """
    Test model selection for a query

    Useful for:
    - Understanding which model will be selected
    - Debugging routing decisions
    - Fine-tuning complexity detection

    Does NOT actually call the model - just returns selection decision.

    Admin only - requires authentication
    """
    try:
        router_instance = get_intelligent_router()

        selection = await router_instance.select_model(
            message=request.message,
            context=request.context or {}
        )

        return {
            "success": True,
            "selection": {
                "model_id": selection.model.model_id,
                "model_name": selection.model.name,
                "provider": selection.model.provider,
                "complexity": selection.complexity.value,
                "confidence": selection.confidence,
                "reasoning": selection.reasoning,
                "estimated_cost": selection.estimated_cost,
                "cost_per_1m_input": selection.model.cost_per_1m_input,
                "cost_per_1m_output": selection.model.cost_per_1m_output
            }
        }

    except Exception as e:
        logger.error(f"Failed to test model selection: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))
