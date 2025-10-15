"""
Admin API - Imports from admin/ module directory
Provides backward compatibility while using new modular admin structure.

Date: October 16, 2025
"""
from fastapi import APIRouter, Header, HTTPException

from app.analytics.dashboard import fetch_dashboard_stats
from app.core.config import get_settings
from app.core.logging import setup_logging, get_logger

# Import the main admin router from the admin module directory
from app.api.v1.admin import router as admin_module_router

setup_logging()
logger = get_logger(__name__)

# Create main router and include the admin module router
router = APIRouter()
router.include_router(admin_module_router)

# Legacy admin metrics endpoint (keeping for backward compatibility)
@router.get("/admin/metrics")
async def get_admin_metrics(x_admin_token: str | None = Header(None)):
    """Legacy admin metrics endpoint - consider using /admin/... endpoints instead"""
    settings = get_settings()
    expected = getattr(settings, "ADMIN_TOKEN", None)
    if not expected or x_admin_token != expected:
        logger.warning("Unauthorized admin metrics access")
        raise HTTPException(status_code=401, detail="Unauthorized")
    return await fetch_dashboard_stats()

logger.info("Admin API initialized with model config and intelligent router endpoints")
