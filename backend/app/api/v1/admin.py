from fastapi import APIRouter, Header, HTTPException

from app.analytics.dashboard import fetch_dashboard_stats
from app.core.config import get_settings
from app.core.logging import setup_logging, get_logger

router = APIRouter()
setup_logging()
logger = get_logger(__name__)

# Include model configuration endpoints (hot-swap AI models)
try:
    from app.api.v1.admin.model_config import router as model_config_router
    router.include_router(model_config_router)
    logger.info("Model config admin endpoints registered")
except ImportError as e:
    logger.warning(f"Could not load model config admin endpoints: {e}")

@router.get("/admin/metrics")
async def get_admin_metrics(x_admin_token: str | None = Header(None)):
    settings = get_settings()
    expected = getattr(settings, "ADMIN_TOKEN", None)
    if not expected or x_admin_token != expected:
        logger.warning("Unauthorized admin metrics access")
        raise HTTPException(status_code=401, detail="Unauthorized")
    return await fetch_dashboard_stats()
