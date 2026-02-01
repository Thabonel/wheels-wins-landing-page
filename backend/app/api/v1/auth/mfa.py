"""
Multi-Factor Authentication API Endpoints
Handles MFA setup, verification, and management
"""

from typing import Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field

from app.api.deps import get_secure_current_user, CurrentUser, require_admin_with_mfa
from app.services.auth.mfa_service import get_mfa_service, MFASetupResult, MFAVerificationResult
from app.core.logging import get_logger

logger = get_logger(__name__)

router = APIRouter(prefix="/mfa", tags=["MFA"])

# Request/Response Models
class MFASetupRequest(BaseModel):
    """Request to setup MFA for current user"""
    pass

class MFASetupResponse(BaseModel):
    """Response from MFA setup initiation"""
    secret: str
    qr_code_data: str
    backup_codes: list[str]
    setup_url: str

class MFAVerifySetupRequest(BaseModel):
    """Request to verify and enable MFA"""
    code: str = Field(..., min_length=6, max_length=6)

class MFAVerifyRequest(BaseModel):
    """Request to verify MFA during authentication"""
    code: str = Field(..., min_length=1)

class MFAStatusResponse(BaseModel):
    """MFA status for user"""
    mfa_enabled: bool
    setup_completed: bool
    backup_codes_remaining: int
    last_used: str = None
    required: bool
    grace_period: bool

class MFAVerificationResponse(BaseModel):
    """Response from MFA verification"""
    success: bool
    method: str = None
    backup_codes_remaining: int = 0
    error: str = None

@router.post("/setup", response_model=MFASetupResponse)
async def setup_mfa(
    request: MFASetupRequest,
    current_user: CurrentUser = Depends(get_secure_current_user)
) -> MFASetupResponse:
    """
    Setup MFA for the current user
    Generates TOTP secret, QR code, and backup codes
    """
    try:
        mfa_service = await get_mfa_service()

        setup_result = await mfa_service.setup_mfa_for_user(
            user_id=current_user.user_id,
            user_email=current_user.email
        )

        logger.info(f"MFA setup initiated for user {current_user.user_id}")

        return MFASetupResponse(
            secret=setup_result.secret,
            qr_code_data=setup_result.qr_code_data,
            backup_codes=setup_result.backup_codes,
            setup_url=setup_result.setup_url
        )

    except Exception as e:
        logger.error(f"MFA setup failed for user {current_user.user_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to setup MFA"
        )

@router.post("/verify-setup", response_model=MFAVerificationResponse)
async def verify_and_enable_mfa(
    request: MFAVerifySetupRequest,
    current_user: CurrentUser = Depends(get_secure_current_user)
) -> MFAVerificationResponse:
    """
    Verify TOTP code and enable MFA for user
    Completes the MFA setup process
    """
    try:
        mfa_service = await get_mfa_service()

        result = await mfa_service.verify_and_enable_mfa(
            user_id=current_user.user_id,
            totp_code=request.code
        )

        if result.success:
            logger.info(f"MFA enabled successfully for user {current_user.user_id}")
        else:
            logger.warning(f"MFA setup verification failed for user {current_user.user_id}")

        return MFAVerificationResponse(
            success=result.success,
            method=result.method,
            backup_codes_remaining=result.backup_codes_remaining,
            error=result.error
        )

    except Exception as e:
        logger.error(f"MFA verification failed for user {current_user.user_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="MFA verification failed"
        )

@router.post("/verify", response_model=MFAVerificationResponse)
async def verify_mfa(
    request: MFAVerifyRequest,
    current_user: CurrentUser = Depends(get_secure_current_user)
) -> MFAVerificationResponse:
    """
    Verify MFA code during authentication
    Supports both TOTP codes and backup codes
    """
    try:
        mfa_service = await get_mfa_service()

        result = await mfa_service.verify_mfa(
            user_id=current_user.user_id,
            code=request.code
        )

        if result.success:
            logger.info(f"MFA verification successful for user {current_user.user_id} via {result.method}")
        else:
            logger.warning(f"MFA verification failed for user {current_user.user_id}")

        return MFAVerificationResponse(
            success=result.success,
            method=result.method,
            backup_codes_remaining=result.backup_codes_remaining,
            error=result.error
        )

    except Exception as e:
        logger.error(f"MFA verification error for user {current_user.user_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="MFA verification failed"
        )

@router.get("/status", response_model=MFAStatusResponse)
async def get_mfa_status(
    current_user: CurrentUser = Depends(get_secure_current_user)
) -> MFAStatusResponse:
    """
    Get current MFA status for user
    """
    try:
        mfa_service = await get_mfa_service()

        status_data = await mfa_service.get_mfa_status(current_user.user_id)

        return MFAStatusResponse(
            mfa_enabled=status_data.get("mfa_enabled", False),
            setup_completed=status_data.get("setup_completed", False),
            backup_codes_remaining=status_data.get("backup_codes_remaining", 0),
            last_used=status_data.get("last_used"),
            required=status_data.get("required", False),
            grace_period=status_data.get("grace_period", False)
        )

    except Exception as e:
        logger.error(f"Error getting MFA status for user {current_user.user_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get MFA status"
        )

@router.delete("/disable")
async def disable_mfa(
    current_user: CurrentUser = Depends(get_secure_current_user)
) -> Dict[str, str]:
    """
    Disable MFA for current user
    Requires MFA verification
    """
    try:
        # Ensure user has verified MFA for this session
        if current_user.requires_mfa and not current_user.mfa_verified:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="MFA verification required to disable MFA",
                headers={"X-MFA-Required": "true"}
            )

        mfa_service = await get_mfa_service()

        success = await mfa_service.disable_mfa(current_user.user_id)

        if not success:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to disable MFA"
            )

        logger.info(f"MFA disabled for user {current_user.user_id}")

        return {"message": "MFA has been disabled for your account"}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error disabling MFA for user {current_user.user_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to disable MFA"
        )

# Admin endpoints
@router.post("/admin/disable/{user_id}")
async def admin_disable_mfa(
    user_id: str,
    admin_user: CurrentUser = Depends(require_admin_with_mfa())
) -> Dict[str, str]:
    """
    Admin endpoint to disable MFA for any user
    Requires admin role with MFA verification
    """
    try:
        mfa_service = await get_mfa_service()

        success = await mfa_service.disable_mfa(user_id)

        if not success:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to disable MFA"
            )

        logger.info(f"Admin {admin_user.user_id} disabled MFA for user {user_id}")

        return {"message": f"MFA has been disabled for user {user_id}"}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Admin MFA disable error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to disable MFA"
        )

@router.get("/admin/status/{user_id}", response_model=MFAStatusResponse)
async def admin_get_mfa_status(
    user_id: str,
    admin_user: CurrentUser = Depends(require_admin_with_mfa())
) -> MFAStatusResponse:
    """
    Admin endpoint to get MFA status for any user
    """
    try:
        mfa_service = await get_mfa_service()

        status_data = await mfa_service.get_mfa_status(user_id)

        return MFAStatusResponse(
            mfa_enabled=status_data.get("mfa_enabled", False),
            setup_completed=status_data.get("setup_completed", False),
            backup_codes_remaining=status_data.get("backup_codes_remaining", 0),
            last_used=status_data.get("last_used"),
            required=status_data.get("required", False),
            grace_period=status_data.get("grace_period", False)
        )

    except Exception as e:
        logger.error(f"Admin error getting MFA status for user {user_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get MFA status"
        )