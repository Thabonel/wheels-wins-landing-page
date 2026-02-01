"""
Session Management API Endpoints
Handles session tracking, management, and security
"""

from typing import List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status, Request, Response
from pydantic import BaseModel

from app.api.deps import get_secure_current_user, CurrentUser
from app.services.auth.session_manager import get_session_manager, SessionInfo
from app.services.auth.session_compatibility import get_compatibility_layer, AuthContext
from app.core.logging import get_logger

logger = get_logger(__name__)

router = APIRouter(prefix="/sessions", tags=["Session Management"])

# Response Models
class SessionInfoResponse(BaseModel):
    """Session information for API response"""
    session_id: str
    user_id: str
    created_at: str
    last_activity: str
    device_info: Dict[str, Any] = None
    ip_address: str = None
    user_agent: str = None

class SessionListResponse(BaseModel):
    """List of active sessions"""
    sessions: List[SessionInfoResponse]
    current_session_id: str = None

class SessionStatsResponse(BaseModel):
    """Session statistics"""
    total_sessions: int
    active_users: int
    blacklisted_tokens: int
    max_sessions_per_user: int
    session_timeout_hours: float
    redis_connected: bool

class MigrationStatsResponse(BaseModel):
    """Migration statistics"""
    migration_enabled: bool
    total_users: int = 0
    migrated_users: int = 0
    migration_attempts: int = 0
    migration_failures: int = 0
    rollback_count: int = 0
    migration_rate: float = 0.0

@router.get("", response_model=SessionListResponse)
async def list_user_sessions(
    current_user: CurrentUser = Depends(get_secure_current_user)
) -> SessionListResponse:
    """
    Get all active sessions for the current user
    """
    try:
        session_manager = await get_session_manager()

        sessions = await session_manager.get_user_sessions(current_user.user_id)

        session_responses = []
        for session in sessions:
            session_responses.append(SessionInfoResponse(
                session_id=session.session_id,
                user_id=session.user_id,
                created_at=session.created_at.isoformat(),
                last_activity=session.last_activity.isoformat(),
                device_info=session.device_info,
                ip_address=session.ip_address,
                user_agent=session.user_agent
            ))

        return SessionListResponse(
            sessions=session_responses,
            current_session_id=current_user.session_id
        )

    except Exception as e:
        logger.error(f"Error listing sessions for user {current_user.user_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve sessions"
        )

@router.delete("/{session_id}")
async def revoke_session(
    session_id: str,
    current_user: CurrentUser = Depends(get_secure_current_user)
) -> Dict[str, str]:
    """
    Revoke a specific session
    Users can only revoke their own sessions
    """
    try:
        session_manager = await get_session_manager()

        # Verify the session belongs to the current user
        session_info = await session_manager.get_session(session_id)

        if not session_info:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Session not found"
            )

        if session_info.user_id != current_user.user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Cannot revoke another user's session"
            )

        # Prevent revoking current session
        if session_id == current_user.session_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot revoke your current session. Use logout instead."
            )

        success = await session_manager.invalidate_session(session_id)

        if not success:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to revoke session"
            )

        logger.info(f"User {current_user.user_id} revoked session {session_id}")

        return {"message": "Session revoked successfully"}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error revoking session {session_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to revoke session"
        )

@router.post("/logout-all")
async def logout_all_devices(
    request: Request,
    response: Response,
    current_user: CurrentUser = Depends(get_secure_current_user)
) -> Dict[str, str]:
    """
    Logout from all devices
    Invalidates all sessions for the current user
    """
    try:
        # Get compatibility layer for proper session handling
        compatibility_layer = await get_compatibility_layer()

        # Create auth context for logout
        token, auth_method = await compatibility_layer.detect_auth_method(request)

        if not token:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="No active session found"
            )

        auth_context = AuthContext(
            user_id=current_user.user_id,
            token=token,
            method=auth_method,
            session_id=current_user.session_id
        )

        # Logout from all sessions
        success = await compatibility_layer.handle_logout(
            auth_context=auth_context,
            response=response,
            invalidate_all_sessions=True
        )

        if not success:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to logout from all devices"
            )

        logger.info(f"User {current_user.user_id} logged out from all devices")

        return {"message": "Logged out from all devices successfully"}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error logging out all devices for user {current_user.user_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to logout from all devices"
        )

@router.get("/stats", response_model=SessionStatsResponse)
async def get_session_stats(
    current_user: CurrentUser = Depends(get_secure_current_user)
) -> SessionStatsResponse:
    """
    Get session statistics (for security monitoring)
    Only returns stats for current user's sessions
    """
    try:
        session_manager = await get_session_manager()

        # Get user's session count only
        user_sessions = await session_manager.get_user_sessions(current_user.user_id)

        return SessionStatsResponse(
            total_sessions=len(user_sessions),
            active_users=1 if user_sessions else 0,
            blacklisted_tokens=0,  # User-specific blacklist count not implemented
            max_sessions_per_user=session_manager.max_sessions_per_user,
            session_timeout_hours=session_manager.session_timeout.total_seconds() / 3600,
            redis_connected=session_manager.redis_client is not None
        )

    except Exception as e:
        logger.error(f"Error getting session stats for user {current_user.user_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve session statistics"
        )

# Migration endpoints
@router.get("/migration/stats", response_model=MigrationStatsResponse)
async def get_migration_stats(
    current_user: CurrentUser = Depends(get_secure_current_user)
) -> MigrationStatsResponse:
    """
    Get authentication migration statistics
    """
    try:
        compatibility_layer = await get_compatibility_layer()

        stats = await compatibility_layer.get_migration_stats()

        return MigrationStatsResponse(
            migration_enabled=stats.get("migration_enabled", False),
            total_users=stats.get("total_users", 0),
            migrated_users=stats.get("migrated_users", 0),
            migration_attempts=stats.get("migration_attempts", 0),
            migration_failures=stats.get("migration_failures", 0),
            rollback_count=stats.get("rollback_count", 0),
            migration_rate=stats.get("migration_rate", 0.0)
        )

    except Exception as e:
        logger.error(f"Error getting migration stats: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve migration statistics"
        )

@router.post("/migration/rollback")
async def rollback_migration(
    current_user: CurrentUser = Depends(get_secure_current_user)
) -> Dict[str, str]:
    """
    Rollback authentication migration for current user (emergency feature)
    """
    try:
        compatibility_layer = await get_compatibility_layer()

        success = await compatibility_layer.rollback_migration(current_user.user_id)

        if not success:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to rollback migration"
            )

        logger.warning(f"User {current_user.user_id} rolled back authentication migration")

        return {"message": "Migration rollback completed. Please refresh your browser."}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error rolling back migration for user {current_user.user_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to rollback migration"
        )

# Admin endpoints (require admin role with MFA)
from app.api.deps import require_admin_with_mfa

@router.get("/admin/stats", response_model=SessionStatsResponse)
async def get_all_session_stats(
    admin_user: CurrentUser = Depends(require_admin_with_mfa())
) -> SessionStatsResponse:
    """
    Get comprehensive session statistics (admin only)
    """
    try:
        session_manager = await get_session_manager()

        stats = await session_manager.get_session_stats()

        return SessionStatsResponse(
            total_sessions=stats.get("total_sessions", 0),
            active_users=stats.get("active_users", 0),
            blacklisted_tokens=stats.get("blacklisted_tokens", 0),
            max_sessions_per_user=stats.get("max_sessions_per_user", 3),
            session_timeout_hours=stats.get("session_timeout_hours", 24),
            redis_connected=stats.get("redis_connected", False)
        )

    except Exception as e:
        logger.error(f"Error getting admin session stats: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve session statistics"
        )

@router.delete("/admin/user/{user_id}/all")
async def admin_logout_user_all_devices(
    user_id: str,
    admin_user: CurrentUser = Depends(require_admin_with_mfa())
) -> Dict[str, str]:
    """
    Admin endpoint to logout a user from all devices
    """
    try:
        session_manager = await get_session_manager()

        count = await session_manager.invalidate_all_user_sessions(user_id)

        logger.info(f"Admin {admin_user.user_id} logged out user {user_id} from {count} sessions")

        return {"message": f"User logged out from {count} sessions"}

    except Exception as e:
        logger.error(f"Admin error logging out user {user_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to logout user from all devices"
        )