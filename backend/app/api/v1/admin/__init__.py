"""
Admin API Module
Administrative endpoints for system configuration and monitoring

Date: October 16, 2025
"""

from fastapi import APIRouter, Header, HTTPException
from app.analytics.dashboard import fetch_dashboard_stats
from app.core.config import get_settings
from app.core.logging import get_logger

from .model_config import router as model_config_router
from .intelligent_router import router as intelligent_router_router

logger = get_logger(__name__)

# Create main admin router
router = APIRouter(prefix="/admin", tags=["admin"])

# Include sub-routers
router.include_router(model_config_router)
router.include_router(intelligent_router_router)

# Legacy admin metrics endpoint (keeping for backward compatibility)
@router.get("/metrics")
async def get_admin_metrics(x_admin_token: str | None = Header(None)):
    """Legacy admin metrics endpoint"""
    settings = get_settings()
    expected = getattr(settings, "ADMIN_TOKEN", None)
    if not expected or x_admin_token != expected:
        logger.warning("Unauthorized admin metrics access")
        raise HTTPException(status_code=401, detail="Unauthorized")
    return await fetch_dashboard_stats()

__all__ = ["router"]
