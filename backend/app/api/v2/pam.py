"""
Pam V2 HTTP API

Versioned, provider-neutral endpoints for the rebuilt Pam assistant.
V1 endpoints remain untouched in backend/app/api/v1/pam/.
"""

from __future__ import annotations

from fastapi import APIRouter, status

from app.core.feature_flags import get_feature_flags
from app.models.schemas.pam_v2 import PamHealthResponseV2


router = APIRouter(tags=["PAM V2"])


@router.get(
    "/health",
    response_model=PamHealthResponseV2,
    status_code=status.HTTP_200_OK,
    summary="Pam V2 health and capability check",
)
async def pam_v2_health() -> PamHealthResponseV2:
    """Return Pam V2 status without making any model calls."""
    flags = get_feature_flags()
    return PamHealthResponseV2(
        status="ok",
        pam_v2_enabled=flags.PAM_V2_ENABLED,
        provider=flags.PAM_V2_PROVIDER,
        model=flags.PAM_V2_MODEL,
        environment="development",  # overridden by runtime config in later PRDs
    )
