"""
Admin API Module
Administrative endpoints for system configuration and monitoring

Date: October 16, 2025
"""

from fastapi import APIRouter
from .model_config import router as model_config_router
from .intelligent_router import router as intelligent_router_router

# Create main admin router
router = APIRouter(prefix="/admin", tags=["admin"])

# Include sub-routers
router.include_router(model_config_router)
router.include_router(intelligent_router_router)

__all__ = ["router"]
