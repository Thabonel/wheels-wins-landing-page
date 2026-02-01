from fastapi import APIRouter, Depends, HTTPException, status, Request, Response
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, EmailStr, field_validator
from typing import Optional, List, Dict, Any
import uuid
import asyncio
from datetime import timedelta, datetime

from app.core.auth import (
    verify_password,
    get_password_hash,
    create_access_token,
    verify_token,
    ACCESS_TOKEN_EXPIRE_MINUTES
)
from app.core.validation import (
    validate_password_strength,
    sanitize_email,
    sanitize_name,
    InputValidationError,
    PasswordValidationError,
    get_password_requirements
)
from app.services.database import DatabaseService
from app.services.pam.cache_warming import get_cache_warming_service
from app.services.auth.session_manager import get_session_manager
from app.services.auth.mfa_service import get_mfa_service
from app.api.deps import get_secure_current_user, require_mfa_verified
from app.core.logging import get_logger

logger = get_logger(__name__)

router = APIRouter()
security = HTTPBearer()

# Request/Response models
class UserRegister(BaseModel):
    email: EmailStr
    password: str
    full_name: Optional[str] = None

    @field_validator('password')
    @classmethod
    def validate_password(cls, v: str) -> str:
        """Validate password strength"""
        is_valid, errors = validate_password_strength(v)
        if not is_valid:
            # Create detailed error message
            error_msg = "Password does not meet requirements:\n" + "\n".join(f"- {err}" for err in errors)
            raise ValueError(error_msg)
        return v

    @field_validator('email')
    @classmethod
    def validate_email(cls, v: str) -> str:
        """Sanitize and validate email"""
        try:
            return sanitize_email(v)
        except InputValidationError as e:
            raise ValueError(str(e))

    @field_validator('full_name')
    @classmethod
    def validate_name(cls, v: Optional[str]) -> Optional[str]:
        """Sanitize full name if provided"""
        if v is None:
            return None
        try:
            return sanitize_name(v)
        except InputValidationError as e:
            raise ValueError(str(e))

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str

class User(BaseModel):
    id: str
    email: str
    full_name: Optional[str] = None

class MFASetupResponse(BaseModel):
    secret: str
    qr_code: str
    backup_codes: List[str]
    setup_token: str

class MFAVerifyRequest(BaseModel):
    setup_token: str
    totp_code: str

class MFAStatusResponse(BaseModel):
    enabled: bool
    backup_codes_remaining: int
    last_used: Optional[datetime] = None
    setup_date: Optional[datetime] = None

class SessionInfo(BaseModel):
    session_id: str
    created_at: datetime
    last_activity: datetime
    device_info: Optional[Dict[str, Any]] = None
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None

class SessionListResponse(BaseModel):
    sessions: List[SessionInfo]
    current_session_id: Optional[str] = None

class SecuritySettings(BaseModel):
    mfa_enabled: bool
    active_sessions: int
    last_login: Optional[datetime] = None

@router.post("/register", response_model=Token)
async def register(user_data: UserRegister):
    """Register a new user"""
    supabase = DatabaseService().client
    
    # Check if user already exists
    existing_user = supabase.table('profiles').select('*').eq('email', user_data.email).execute()
    if existing_user.data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Create user
    user_id = str(uuid.uuid4())
    hashed_password = get_password_hash(user_data.password)
    
    # Insert into profiles table
    new_user = {
        'id': user_id,
        'user_id': user_id,
        'email': user_data.email,
        'password_hash': hashed_password,
        'full_name': user_data.full_name,
        'role': 'user',
        'status': 'active',
        'region': 'US'
    }
    
    result = supabase.table('profiles').insert(new_user).execute()
    if not result.data:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create user"
        )

    # Send welcome email (async via Celery)
    try:
        from app.workers.tasks.email_tasks import send_welcome_email
        send_welcome_email.delay(
            user_email=user_data.email,
            user_name=user_data.full_name or "Traveler"
        )
        logger.info(f"Welcome email queued for {user_data.email}")
    except Exception as e:
        logger.warning(f"Failed to queue welcome email: {e}")

    # Create access token
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user_id, "email": user_data.email},
        expires_delta=access_token_expires
    )
    
    return {"access_token": access_token, "token_type": "bearer"}

@router.post("/login", response_model=Token)
async def login(user_data: UserLogin):
    """Login user"""
    supabase = DatabaseService().client
    
    # Get user by email
    user_result = supabase.table('profiles').select('*').eq('email', user_data.email).execute()
    if not user_result.data:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password"
        )
    
    user = user_result.data[0]
    
    # Verify password
    if not verify_password(user_data.password, user.get('password_hash', '')):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password"
        )
    
    # Create access token
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user['user_id'], "email": user['email']},
        expires_delta=access_token_expires
    )

    # Warm cache asynchronously (non-blocking)
    user_id = user['user_id']
    asyncio.create_task(_warm_cache_async(user_id))

    return {"access_token": access_token, "token_type": "bearer"}

@router.get("/me", response_model=User)
async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Get current user from JWT token"""
    token = credentials.credentials
    payload = verify_token(token)
    
    user_id = payload.get("sub")
    supabase = DatabaseService().client
    
    user_result = supabase.table('profiles').select('*').eq('user_id', user_id).execute()
    if not user_result.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    user = user_result.data[0]
    return User(
        id=user['user_id'],
        email=user['email'],
        full_name=user.get('full_name')
    )

@router.post("/logout")
async def logout(
    current_user = Depends(get_secure_current_user),
    all_devices: bool = False
):
    """
    Enhanced logout with session invalidation and JWT blacklisting

    Args:
        all_devices: If True, logout from all devices/sessions
    """
    try:
        session_manager = await get_session_manager()
        user_id = current_user.user_id
        session_id = current_user.session_id

        if all_devices:
            # Logout from all devices
            invalidated_count = await session_manager.invalidate_all_user_sessions(user_id)
            logger.info(f"🔒 All sessions invalidated for user {user_id}: {invalidated_count}")
            return {
                "message": "Successfully logged out from all devices",
                "sessions_invalidated": invalidated_count
            }
        else:
            # Logout from current session only
            if session_id:
                success = await session_manager.invalidate_session(session_id)
                if success:
                    logger.info(f"🔒 Session invalidated for user {user_id}: {session_id}")
                    return {"message": "Successfully logged out"}
                else:
                    logger.warning(f"🔒 Failed to invalidate session for user {user_id}: {session_id}")

            return {"message": "Logged out (session cleanup attempted)"}

    except Exception as e:
        logger.error(f"❌ Logout error for user {current_user.user_id}: {e}")
        # Don't fail logout if session cleanup fails
        return {"message": "Logged out (session cleanup may have failed)"}


@router.get("/sessions", response_model=SessionListResponse)
async def get_user_sessions(
    current_user = Depends(get_secure_current_user)
):
    """Get all active sessions for the current user"""
    try:
        session_manager = await get_session_manager()
        sessions = await session_manager.get_user_sessions(current_user.user_id)

        session_list = []
        for session in sessions:
            session_list.append(SessionInfo(
                session_id=session.session_id,
                created_at=session.created_at,
                last_activity=session.last_activity,
                device_info=session.device_info,
                ip_address=session.ip_address,
                user_agent=session.user_agent
            ))

        return SessionListResponse(
            sessions=session_list,
            current_session_id=current_user.session_id
        )

    except Exception as e:
        logger.error(f"❌ Failed to get sessions for user {current_user.user_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve sessions"
        )


@router.delete("/sessions/{session_id}")
async def revoke_session(
    session_id: str,
    current_user = Depends(get_secure_current_user)
):
    """Revoke a specific session (logout from specific device)"""
    try:
        session_manager = await get_session_manager()

        # Verify the session belongs to the current user
        session_info = await session_manager.get_session(session_id)
        if not session_info or session_info.user_id != current_user.user_id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Session not found"
            )

        success = await session_manager.invalidate_session(session_id)

        if success:
            logger.info(f"🔒 Session revoked by user {current_user.user_id}: {session_id}")
            return {"message": "Session revoked successfully"}
        else:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to revoke session"
            )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Session revocation error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to revoke session"
        )

@router.get("/password-requirements")
async def get_password_requirements_endpoint():
    """Get password strength requirements for frontend display"""
    return {
        "requirements": get_password_requirements(),
        "min_length": 8,
        "max_length": 128
    }


@router.get("/csrf-token")
async def get_csrf_token(response: Response):
    """Generate and return CSRF token for secure authentication"""
    import secrets

    csrf_token = secrets.token_urlsafe(32)

    # Set CSRF token in httpOnly cookie
    response.set_cookie(
        key="csrf_token",
        value=csrf_token,
        httponly=True,
        secure=True,  # HTTPS only in production
        samesite="strict",
        max_age=3600  # 1 hour
    )

    return {"csrf_token": csrf_token}


@router.post("/refresh")
async def refresh_token(response: Response, current_user = Depends(get_secure_current_user)):
    """Refresh authentication token"""
    try:
        # Generate new access token
        access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = create_access_token(
            data={"sub": current_user.user_id, "email": current_user.email},
            expires_delta=access_token_expires
        )

        # Set new token in httpOnly cookie
        response.set_cookie(
            key="access_token",
            value=access_token,
            httponly=True,
            secure=True,
            samesite="strict",
            max_age=ACCESS_TOKEN_EXPIRE_MINUTES * 60
        )

        # Update session activity
        if current_user.session_id:
            session_manager = await get_session_manager()
            await session_manager.update_session_activity(current_user.session_id)

        return {"message": "Token refreshed successfully"}

    except Exception as e:
        logger.error(f"❌ Token refresh failed for user {current_user.user_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Token refresh failed"
        )


# MFA Endpoints

@router.post("/mfa/setup", response_model=MFASetupResponse)
async def setup_mfa(
    current_user = Depends(get_secure_current_user)
):
    """Setup MFA for the current user"""
    try:
        mfa_service = get_mfa_service()

        # Check if MFA is already enabled
        mfa_status = await mfa_service.get_mfa_status(current_user.user_id)
        if mfa_status.enabled:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="MFA is already enabled"
            )

        # Setup MFA
        mfa_setup = await mfa_service.setup_mfa_for_user(
            current_user.user_id,
            current_user.email
        )

        # Don't return the actual backup codes in hashed form
        # The service should return display-friendly codes
        return MFASetupResponse(
            secret=mfa_setup.secret,
            qr_code=mfa_setup.qr_code,
            backup_codes=mfa_setup.backup_codes,
            setup_token=mfa_setup.setup_token
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ MFA setup failed for user {current_user.user_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="MFA setup failed"
        )


@router.post("/mfa/verify")
async def verify_mfa_setup(
    request: MFAVerifyRequest,
    current_user = Depends(get_secure_current_user)
):
    """Verify and enable MFA for the current user"""
    try:
        mfa_service = get_mfa_service()

        success = await mfa_service.verify_and_enable_mfa(
            current_user.user_id,
            request.setup_token,
            request.totp_code
        )

        if success:
            logger.info(f"✅ MFA enabled for user {current_user.user_id}")
            return {"message": "MFA enabled successfully"}
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid setup token or TOTP code"
            )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ MFA verification failed for user {current_user.user_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="MFA verification failed"
        )


@router.get("/mfa/status", response_model=MFAStatusResponse)
async def get_mfa_status(
    current_user = Depends(get_secure_current_user)
):
    """Get MFA status for the current user"""
    try:
        mfa_service = get_mfa_service()
        mfa_status = await mfa_service.get_mfa_status(current_user.user_id)

        return MFAStatusResponse(
            enabled=mfa_status.enabled,
            backup_codes_remaining=mfa_status.backup_codes_remaining,
            last_used=mfa_status.last_used,
            setup_date=mfa_status.setup_date
        )

    except Exception as e:
        logger.error(f"❌ MFA status check failed for user {current_user.user_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get MFA status"
        )


@router.post("/mfa/disable")
async def disable_mfa(
    current_user = Depends(require_mfa_verified())
):
    """Disable MFA for the current user (requires MFA verification)"""
    try:
        mfa_service = get_mfa_service()

        success = await mfa_service.disable_mfa(current_user.user_id)

        if success:
            logger.info(f"🔒 MFA disabled for user {current_user.user_id}")
            return {"message": "MFA disabled successfully"}
        else:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to disable MFA"
            )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ MFA disable failed for user {current_user.user_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to disable MFA"
        )


@router.post("/mfa/regenerate-backup-codes")
async def regenerate_backup_codes(
    current_user = Depends(require_mfa_verified())
) -> Dict[str, List[str]]:
    """Regenerate backup codes (requires MFA verification)"""
    try:
        mfa_service = get_mfa_service()

        backup_codes = await mfa_service.regenerate_backup_codes(current_user.user_id)

        if backup_codes:
            logger.info(f"🔄 Backup codes regenerated for user {current_user.user_id}")
            return {"backup_codes": backup_codes}
        else:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to regenerate backup codes"
            )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Backup code regeneration failed for user {current_user.user_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to regenerate backup codes"
        )


# Security Settings Endpoint

@router.get("/security", response_model=SecuritySettings)
async def get_security_settings(
    current_user = Depends(get_secure_current_user)
):
    """Get comprehensive security settings for the current user"""
    try:
        # Get MFA status
        mfa_service = get_mfa_service()
        mfa_status = await mfa_service.get_mfa_status(current_user.user_id)

        # Get session count
        session_manager = await get_session_manager()
        sessions = await session_manager.get_user_sessions(current_user.user_id)

        # Get last login from most recent session
        last_login = None
        if sessions:
            last_login = max(session.created_at for session in sessions)

        return SecuritySettings(
            mfa_enabled=mfa_status.enabled,
            active_sessions=len(sessions),
            last_login=last_login
        )

    except Exception as e:
        logger.error(f"❌ Security settings retrieval failed for user {current_user.user_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get security settings"
        )


async def _warm_cache_async(user_id: str):
    """
    Async task to warm user cache after login
    Runs in background, non-blocking
    """
    try:
        cache_service = await get_cache_warming_service()
        result = await cache_service.warm_user_cache(user_id)

        if result['success']:
            logger.info(
                f"✅ Cache warmed for {user_id}: "
                f"{len(result['cached_items'])} items, "
                f"{result['warming_time_ms']}ms"
            )
        else:
            logger.warning(f"⚠️ Cache warming partially failed for {user_id}")

    except Exception as e:
        logger.error(f"❌ Cache warming error for {user_id}: {e}")
