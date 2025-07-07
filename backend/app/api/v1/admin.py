from fastapi import APIRouter, Header, HTTPException

from app.analytics.dashboard import fetch_dashboard_stats
from app.core.config import get_settings
from app.core.logging import setup_logging

router = APIRouter()
logger = setup_logging()

@router.get("/admin/metrics")
async def get_admin_metrics(x_admin_token: str | None = Header(None)):
    settings = get_settings()
    expected = getattr(settings, "ADMIN_TOKEN", None)
    if not expected or x_admin_token != expected:
        logger.warning("Unauthorized admin metrics access")
        raise HTTPException(status_code=401, detail="Unauthorized")
    return await fetch_dashboard_stats()
