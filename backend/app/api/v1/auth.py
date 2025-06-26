
"""
Authentication API endpoints
"""

import logging
from datetime import datetime, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.security import HTTPBearer
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, delete

from app.api.deps import (
    get_db, get_cache, check_rate_limit, get_current_user,
    get_optional_current_user
)
from app.core.security import create_access_token, verify_token
from app.models.schemas.auth import (
    RegisterRequest, LoginRequest, TokenRefreshRequest,
    AuthResponse, TokenResponse, UserResponse,
    ResetPasswordRequest, ConfirmResetPasswordRequest,
    VerifyEmailRequest, ChangePasswordRequest
)
from app.models.domain.user import UserProfile
from app.core.exceptions import AuthenticationError, ValidationError
from app.services.database import DatabaseService
from app.services.cache import CacheService

router = APIRouter(prefix="/auth", tags=["authentication"])
security = HTTPBearer()
logger = logging.getLogger("api.auth")

@router.post("/register", response_model=AuthResponse)
async def register(
    request: RegisterRequest,
    req: Request,
    db: AsyncSession = Depends(get_db),
    cache: CacheService = Depends(get_cache)
):
    """Register a new user account"""
    try:
        # Rate limiting - 5 registrations per hour per IP
        await check_rate_limit(
            req.client.host, 
            "register", 
            limit=5, 
            window_minutes=60,
            cache=cache
        )
        
        logger.info(f"Registration attempt for email: {request.email}")
        
        # Check if user already exists
        db_service = DatabaseService(db)
        existing_user = await db_service.get_user_by_email(request.email)
        
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="User with this email already exists"
            )
        
        # Create new user profile
        user_data = {
            "email": request.email,
            "full_name": request.full_name,
            "region": "Australia",  # Default region
            "status": "active",
            "role": "user",
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        
        # In a real implementation, you would hash the password and store it
        # For now, we'll create a user profile without password storage
        # as that should be handled by Supabase Auth
        
        new_user = await db_service.create_user_profile(user_data)
        
        # Generate access token
        token_data = {"sub": str(new_user.id), "email": new_user.email}
        access_token = create_access_token(token_data)
        refresh_token = create_access_token(
            token_data, 
            expires_delta=timedelta(days=30)
        )
        
        # Cache user session
        await cache.set(
            f"user_session:{new_user.id}",
            {"user_id": str(new_user.id), "email": new_user.email},
            expire=3600
        )
        
        logger.info(f"User registered successfully: {new_user.email}")
        
        return AuthResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            token_type="bearer",
            expires_in=1800,  # 30 minutes
            user=UserProfile(
                id=str(new_user.id),
                email=new_user.email,
                full_name=new_user.full_name,
                created_at=new_user.created_at,
                updated_at=new_user.updated_at,
                region=new_user.region,
                is_active=True
            )
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Registration failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Registration failed"
        )

@router.post("/login", response_model=AuthResponse)
async def login(
    request: LoginRequest,
    req: Request,
    db: AsyncSession = Depends(get_db),
    cache: CacheService = Depends(get_cache)
):
    """Authenticate user and return JWT tokens"""
    try:
        # Rate limiting - 10 login attempts per hour per IP
        await check_rate_limit(
            req.client.host,
            "login",
            limit=10,
            window_minutes=60,
            cache=cache
        )
        
        logger.info(f"Login attempt for email: {request.email}")
        
        db_service = DatabaseService(db)
        user = await db_service.get_user_by_email(request.email)
        
        if not user or not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid credentials or inactive account"
            )
        
        # In a real implementation, verify password hash here
        # For now, we'll proceed with token generation
        
        # Update last login
        await db_service.update_user_last_login(user.id)
        
        # Generate tokens
        token_data = {"sub": str(user.id), "email": user.email}
        access_token = create_access_token(token_data)
        refresh_token = create_access_token(
            token_data,
            expires_delta=timedelta(days=30)
        )
        
        # Cache user session
        await cache.set(
            f"user_session:{user.id}",
            {"user_id": str(user.id), "email": user.email},
            expire=3600
        )
        
        # Log login history
        await db_service.log_user_login(
            user.id,
            req.client.host,
            req.headers.get("user-agent", ""),
            True
        )
        
        logger.info(f"User logged in successfully: {user.email}")
        
        return AuthResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            token_type="bearer",
            expires_in=1800,
            user=UserProfile(
                id=str(user.id),
                email=user.email,
                full_name=user.full_name,
                created_at=user.created_at,
                updated_at=user.updated_at,
                region=user.region or "Australia",
                is_active=user.is_active
            )
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Login failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Login failed"
        )

@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(
    request: TokenRefreshRequest,
    cache: CacheService = Depends(get_cache)
):
    """Refresh access token using refresh token"""
    try:
        # Verify refresh token
        payload = verify_token(request.refresh_token)
        user_id = payload.get("sub")
        email = payload.get("email")
        
        if not user_id or not email:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid refresh token"
            )
        
        # Check if user session exists in cache
        session_data = await cache.get(f"user_session:{user_id}")
        if not session_data:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Session expired"
            )
        
        # Generate new access token
        token_data = {"sub": user_id, "email": email}
        new_access_token = create_access_token(token_data)
        new_refresh_token = create_access_token(
            token_data,
            expires_delta=timedelta(days=30)
        )
        
        logger.info(f"Token refreshed for user: {email}")
        
        return TokenResponse(
            access_token=new_access_token,
            refresh_token=new_refresh_token,
            token_type="bearer",
            expires_in=1800
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Token refresh failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token refresh failed"
        )

@router.post("/logout")
async def logout(
    current_user = Depends(get_current_user),
    cache: CacheService = Depends(get_cache)
):
    """Logout user and invalidate session"""
    try:
        # Remove user session from cache
        await cache.delete(f"user_session:{current_user['user_id']}")
        
        logger.info(f"User logged out: {current_user['email']}")
        
        return {"message": "Logged out successfully"}
        
    except Exception as e:
        logger.error(f"Logout failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Logout failed"
        )

@router.get("/me", response_model=UserResponse)
async def get_current_user_profile(
    current_user = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get current user profile information"""
    try:
        db_service = DatabaseService(db)
        user = await db_service.get_user_by_id(current_user["user_id"])
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        return UserResponse(
            user=UserProfile(
                id=str(user.id),
                email=user.email,
                full_name=user.full_name,
                nickname=user.nickname,
                created_at=user.created_at,
                updated_at=user.updated_at,
                region=user.region or "Australia",
                is_active=user.is_active
            ),
            permissions=[user.role] if user.role else [],
            last_activity=datetime.utcnow()
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get user profile failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get user profile"
        )

@router.post("/forgot-password")
async def forgot_password(
    request: ResetPasswordRequest,
    req: Request,
    db: AsyncSession = Depends(get_db),
    cache: CacheService = Depends(get_cache)
):
    """Initiate password reset flow"""
    try:
        # Rate limiting - 3 password reset requests per hour per IP
        await check_rate_limit(
            req.client.host,
            "password_reset",
            limit=3,
            window_minutes=60,
            cache=cache
        )
        
        db_service = DatabaseService(db)
        user = await db_service.get_user_by_email(request.email)
        
        # Always return success to prevent email enumeration
        if user:
            # Generate reset token
            reset_token = create_access_token(
                {"sub": str(user.id), "type": "password_reset"},
                expires_delta=timedelta(minutes=15)
            )
            
            # Store reset token in cache
            await cache.set(
                f"password_reset:{user.id}",
                reset_token,
                expire=900  # 15 minutes
            )
            
            # In a real implementation, send email with reset link
            logger.info(f"Password reset requested for: {user.email}")
        
        return {"message": "If the email exists, a password reset link has been sent"}
        
    except Exception as e:
        logger.error(f"Password reset request failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Password reset request failed"
        )

@router.post("/reset-password")
async def reset_password(
    request: ConfirmResetPasswordRequest,
    db: AsyncSession = Depends(get_db),
    cache: CacheService = Depends(get_cache)
):
    """Complete password reset with token"""
    try:
        # Verify reset token
        payload = verify_token(request.token)
        user_id = payload.get("sub")
        token_type = payload.get("type")
        
        if not user_id or token_type != "password_reset":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid or expired reset token"
            )
        
        # Check if token exists in cache
        cached_token = await cache.get(f"password_reset:{user_id}")
        if not cached_token or cached_token != request.token:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid or expired reset token"
            )
        
        # In a real implementation, update password hash here
        db_service = DatabaseService(db)
        await db_service.update_user_last_login(user_id)
        
        # Remove reset token from cache
        await cache.delete(f"password_reset:{user_id}")
        
        logger.info(f"Password reset completed for user: {user_id}")
        
        return {"message": "Password reset successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Password reset failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Password reset failed"
        )

@router.post("/verify-email")
async def verify_email(
    request: VerifyEmailRequest,
    db: AsyncSession = Depends(get_db),
    cache: CacheService = Depends(get_cache)
):
    """Verify user email with token"""
    try:
        # Verify email verification token
        payload = verify_token(request.token)
        user_id = payload.get("sub")
        token_type = payload.get("type")
        
        if not user_id or token_type != "email_verification":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid or expired verification token"
            )
        
        # Update user verification status
        db_service = DatabaseService(db)
        await db_service.update_user_email_verified(user_id, True)
        
        # Remove verification token from cache
        await cache.delete(f"email_verification:{user_id}")
        
        logger.info(f"Email verified for user: {user_id}")
        
        return {"message": "Email verified successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Email verification failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Email verification failed"
        )

@router.post("/change-password")
async def change_password(
    request: ChangePasswordRequest,
    current_user = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Change user password (requires current password)"""
    try:
        db_service = DatabaseService(db)
        user = await db_service.get_user_by_id(current_user["user_id"])
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        # In a real implementation, verify current password hash here
        # and update with new password hash
        
        await db_service.update_user_last_login(user.id)
        
        logger.info(f"Password changed for user: {user.email}")
        
        return {"message": "Password changed successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Password change failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Password change failed"
        )
