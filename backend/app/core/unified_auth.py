"""
Unified Authentication System
Simplifies permissions across the entire application - once signed in, everything works!
"""

from fastapi import Depends, HTTPException, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import Optional, Dict, Any, Union
import jwt
import os
from datetime import datetime

from app.core.config import settings
from app.core.logging import get_logger
from app.database.supabase_client import get_supabase_service, get_supabase_client

logger = get_logger(__name__)
security = HTTPBearer(auto_error=False)

class UnifiedUser:
    """Unified user object with all necessary permissions and data"""
    
    def __init__(self, user_id: str, email: str = "", is_admin: bool = False, 
                 token_type: str = "supabase", raw_token: str = ""):
        self.user_id = user_id
        self.email = email
        self.is_admin = is_admin
        self.token_type = token_type
        self.raw_token = raw_token
        self.authenticated = True
    
    def get_supabase_client(self):
        """Get the appropriate Supabase client based on user permissions"""
        if self.is_admin:
            return get_supabase_service()
        return get_supabase_client()
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for backward compatibility"""
        return {
            "id": self.user_id,
            "user_id": self.user_id,
            "email": self.email,
            "is_admin": self.is_admin,
            "token_type": self.token_type,
            "authenticated": self.authenticated
        }

async def verify_any_token(token: str) -> UnifiedUser:
    """
    Verify ANY type of token and return a unified user object
    This handles JWT, Supabase, and any other token format
    """
    
    # Try Supabase token first (most common)
    try:
        user = await verify_supabase_token(token)
        if user:
            return user
    except Exception as e:
        logger.debug(f"Supabase token verification failed: {e}")
    
    # Try local JWT token
    try:
        user = await verify_local_jwt(token)
        if user:
            return user
    except Exception as e:
        logger.debug(f"Local JWT verification failed: {e}")
    
    # Try admin service token
    try:
        user = await verify_admin_token(token)
        if user:
            return user
    except Exception as e:
        logger.debug(f"Admin token verification failed: {e}")
    
    # If all fail, raise unauthorized
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid or expired token",
        headers={"WWW-Authenticate": "Bearer"},
    )

async def verify_supabase_token(token: str) -> Optional[UnifiedUser]:
    """Verify Supabase JWT token"""
    try:
        # Use the existing Supabase JWT verification
        from app.core.auth import verify_supabase_token as verify_sb
        supabase_url = settings.SUPABASE_URL
        payload = verify_sb(token, supabase_url)
        
        if payload:
            user_id = payload.get("sub")
            email = payload.get("email", "")
            
            # Check if user is admin
            is_admin = await check_admin_status(user_id)
            
            return UnifiedUser(
                user_id=user_id,
                email=email,
                is_admin=is_admin,
                token_type="supabase",
                raw_token=token
            )
    except Exception as e:
        logger.debug(f"Supabase token verification error: {e}")
        return None

async def verify_local_jwt(token: str) -> Optional[UnifiedUser]:
    """Verify local JWT token"""
    try:
        from app.core.auth import verify_token
        payload = verify_token(token)
        
        if payload:
            user_id = payload.get("sub")
            email = payload.get("email", "")
            is_admin = payload.get("is_admin", False)
            
            return UnifiedUser(
                user_id=user_id,
                email=email,
                is_admin=is_admin,
                token_type="local",
                raw_token=token
            )
    except Exception as e:
        logger.debug(f"Local JWT verification error: {e}")
        return None

async def verify_admin_token(token: str) -> Optional[UnifiedUser]:
    """Verify admin service token"""
    try:
        # Check if this is a service token
        if token.startswith("service_"):
            # Implement service token verification logic
            # For now, just check against a service key
            if token == f"service_{settings.SECRET_KEY.get_secret_value()[:16]}":
                return UnifiedUser(
                    user_id="system_admin",
                    email="admin@system.local",
                    is_admin=True,
                    token_type="service",
                    raw_token=token
                )
    except Exception as e:
        logger.debug(f"Admin token verification error: {e}")
        return None

async def check_admin_status(user_id: str) -> bool:
    """Check if user has admin privileges by querying profiles table directly"""
    try:
        # Use service role client to bypass RLS for admin check
        supabase = get_supabase_service()

        # Query profiles table directly - uses 'id' column, not 'user_id'
        # See docs/DATABASE_SCHEMA_REFERENCE.md for schema
        result = supabase.table('profiles').select('role').eq('id', user_id).maybe_single().execute()

        if result.data and result.data.get('role') == 'admin':
            logger.debug(f"User {user_id} is admin")
            return True

        return False
    except Exception as e:
        logger.error(f"Error checking admin status for {user_id}: {e}")
        # Default to non-admin on error to be safe
        return False

# FastAPI Dependencies
async def get_current_user_unified(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)
) -> UnifiedUser:
    """
    Main authentication dependency - USE THIS EVERYWHERE!
    Returns a unified user object with all permissions handled
    """
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    return await verify_any_token(credentials.credentials)

async def get_current_user_id_unified(
    user: UnifiedUser = Depends(get_current_user_unified)
) -> str:
    """Get just the user ID (for backward compatibility)"""
    return user.user_id

async def get_current_user_dict_unified(
    user: UnifiedUser = Depends(get_current_user_unified)
) -> Dict[str, Any]:
    """Get user as dictionary (for backward compatibility)"""
    return user.to_dict()

# Optional authentication (allows anonymous access)
async def get_current_user_optional(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)
) -> Optional[UnifiedUser]:
    """Optional authentication - returns None if not authenticated"""
    if not credentials:
        return None
    
    try:
        return await verify_any_token(credentials.credentials)
    except HTTPException:
        return None

# Admin-only access
async def require_admin(
    user: UnifiedUser = Depends(get_current_user_unified)
) -> UnifiedUser:
    """Require admin access - raises 403 if not admin"""
    if not user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    return user

# Development mode bypass (for testing)
async def development_bypass() -> UnifiedUser:
    """Development mode - bypass authentication (USE ONLY IN DEV!)"""
    if settings.ENVIRONMENT == "development":
        return UnifiedUser(
            user_id="dev_user_123",
            email="dev@wheels-and-wins.local",
            is_admin=True,
            token_type="development"
        )
    else:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Development bypass not available in production"
        )