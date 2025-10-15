"""
Admin API Endpoints for Model Configuration
Hot-swap AI models without downtime

Endpoints:
  GET  /api/v1/admin/models/config - View current model configuration
  POST /api/v1/admin/models/reload - Reload config from environment (hot-swap)
  POST /api/v1/admin/models/set-primary - Change primary model instantly
  GET  /api/v1/admin/models/available - List all available models
  GET  /api/v1/admin/models/health - Check health status of all models

Date: October 16, 2025
"""

from fastapi import APIRouter, HTTPException, Depends
from typing import Dict, Any, List, Optional
from pydantic import BaseModel
from datetime import datetime
import logging

from app.config.model_config import (
    get_model_config,
    reload_model_config,
    MODEL_REGISTRY,
    ModelConfig
)
from app.core.unified_auth import require_admin

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/models", tags=["admin", "models"])


class ModelConfigResponse(BaseModel):
    """Current model configuration"""
    primary_model: Dict[str, Any]
    fallback_models: List[Dict[str, Any]]
    total_models: int
    healthy_models: int
    timestamp: str


class ReloadConfigRequest(BaseModel):
    """Request to reload configuration"""
    force: bool = False


class SetPrimaryModelRequest(BaseModel):
    """Request to change primary model"""
    model_id: str
    update_env: bool = False  # If true, also update environment variable


class ModelHealthResponse(BaseModel):
    """Health status of a model"""
    model_id: str
    model_name: str
    provider: str
    is_healthy: bool
    cost_per_1m_input: float
    cost_per_1m_output: float
    supports_tools: bool


@router.get("/config", response_model=ModelConfigResponse)
async def get_model_configuration(
    current_user = Depends(require_admin)
):
    """
    Get current PAM model configuration

    Returns:
    - Primary model details
    - Fallback model chain
    - Health status
    - Configuration timestamp

    Admin only - requires authentication
    """
    try:
        config = get_model_config()
        summary = config.get_config_summary()

        return ModelConfigResponse(
            primary_model=summary["primary_model"],
            fallback_models=summary["fallback_models"],
            total_models=summary["total_models"],
            healthy_models=summary["healthy_models"],
            timestamp=datetime.now().isoformat()
        )

    except Exception as e:
        logger.error(f"Failed to get model configuration: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/reload")
async def reload_configuration(
    request: ReloadConfigRequest,
    current_user = Depends(require_admin)
):
    """
    Reload model configuration from environment variables

    This enables ZERO-DOWNTIME model switching:
    1. Update environment variables in Render dashboard
    2. Call this endpoint
    3. New model takes effect on next request

    No code deploy needed! Changes happen instantly.

    Admin only - requires authentication
    """
    try:
        logger.info(f"Admin {current_user.email} triggered model config reload (force={request.force})")

        # Reload configuration from environment
        reload_model_config()

        # Get new config
        config = get_model_config()
        summary = config.get_config_summary()

        logger.info(f"Model config reloaded: Primary={summary['primary_model']['id']}")

        return {
            "success": True,
            "message": "Model configuration reloaded successfully",
            "new_config": summary,
            "timestamp": datetime.now().isoformat()
        }

    except Exception as e:
        logger.error(f"Failed to reload model configuration: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/set-primary")
async def set_primary_model(
    request: SetPrimaryModelRequest,
    current_user = Depends(require_admin)
):
    """
    Change primary model instantly (hot-swap)

    WARNING: This only affects the current process.
    For persistent changes across restarts, set PAM_PRIMARY_MODEL environment variable.

    Admin only - requires authentication
    """
    try:
        # Validate model exists
        if request.model_id not in MODEL_REGISTRY:
            available_models = list(MODEL_REGISTRY.keys())
            raise HTTPException(
                status_code=400,
                detail=f"Invalid model_id. Available models: {available_models}"
            )

        logger.info(f"Admin {current_user.email} changing primary model to {request.model_id}")

        # Update configuration
        config = get_model_config()
        old_primary = config.primary_model
        config.primary_model = request.model_id

        # Clear health cache for new model
        if request.model_id in config._health_cache:
            del config._health_cache[request.model_id]

        new_model = MODEL_REGISTRY[request.model_id]

        logger.info(f"Primary model changed: {old_primary} -> {request.model_id}")

        response = {
            "success": True,
            "message": f"Primary model changed to {new_model.name}",
            "old_model": old_primary,
            "new_model": request.model_id,
            "model_details": new_model.__dict__,
            "timestamp": datetime.now().isoformat()
        }

        if not request.update_env:
            response["warning"] = (
                "Change is temporary and will reset on server restart. "
                "Set update_env=true or manually update PAM_PRIMARY_MODEL environment variable for persistence."
            )

        return response

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to set primary model: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/available", response_model=List[Dict[str, Any]])
async def get_available_models(
    current_user = Depends(require_admin)
):
    """
    Get list of all available AI models

    Returns details about each model:
    - Model ID
    - Provider
    - Cost
    - Capabilities
    - Description

    Admin only - requires authentication
    """
    try:
        models = []
        for model_id, model_config in MODEL_REGISTRY.items():
            models.append({
                "model_id": model_id,
                "name": model_config.name,
                "provider": model_config.provider,
                "cost_per_1m_input": model_config.cost_per_1m_input,
                "cost_per_1m_output": model_config.cost_per_1m_output,
                "max_tokens": model_config.max_tokens,
                "supports_tools": model_config.supports_tools,
                "supports_streaming": model_config.supports_streaming,
                "description": model_config.description
            })

        # Sort by provider, then by cost
        models.sort(key=lambda x: (x["provider"], x["cost_per_1m_input"]))

        return models

    except Exception as e:
        logger.error(f"Failed to get available models: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/health", response_model=List[ModelHealthResponse])
async def get_model_health_status(
    current_user = Depends(require_admin)
):
    """
    Get health status of all configured models

    Returns:
    - Model details
    - Health status (healthy/unhealthy)
    - Cost information
    - Capabilities

    Unhealthy models are temporarily excluded from failover chain (5 min cooldown)

    Admin only - requires authentication
    """
    try:
        config = get_model_config()
        all_models = [config.primary_model] + config.fallback_chain

        health_statuses = []
        for model_id in all_models:
            if model_id in MODEL_REGISTRY:
                model_config = MODEL_REGISTRY[model_id]
                health_statuses.append(ModelHealthResponse(
                    model_id=model_id,
                    model_name=model_config.name,
                    provider=model_config.provider,
                    is_healthy=config.is_model_healthy(model_id),
                    cost_per_1m_input=model_config.cost_per_1m_input,
                    cost_per_1m_output=model_config.cost_per_1m_output,
                    supports_tools=model_config.supports_tools
                ))

        return health_statuses

    except Exception as e:
        logger.error(f"Failed to get model health status: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))
