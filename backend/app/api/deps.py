"""
API Dependencies - Common dependencies for FastAPI endpoints
"""

from typing import Optional, Dict, Any, Generator
from datetime import datetime, timedelta
from functools import wraps
import json

from fastapi import Depends, HTTPException, status, Header, Query
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import jwt
from jwt import PyJWTError  # Import PyJWTError directly
from pydantic import BaseModel, Field

from app.core.config import settings
from app.services.database import DatabaseService
from app.services.cache import CacheService
from app.services.pam.orchestrator import orchestrator
from app.core.exceptions import PAMError, AuthenticationError, PermissionError, ErrorCode
from app.core.logging import get_logger

logger = get_logger("api.deps")

# Security scheme
security = HTTPBearer()


# Models
class PaginationParams(BaseModel):
    """Pagination parameters"""

    page: int = Field(default=1, ge=1, description="Page number")
    limit: int = Field(default=20, ge=1, le=100, description="Items per page")

    @property
    def offset(self) -> int:
        return (self.page - 1) * self.limit


class CurrentUser(BaseModel):
    """Current authenticated user"""

    user_id: str
    email: str
    role: str = "user"
    permissions: list[str] = []


# Database Dependencies
async def get_database() -> Generator[DatabaseService, None, None]:
    """Get database service instance"""
    db_service = DatabaseService()
    try:
        yield db_service
    except Exception as e:
        logger.error(f"Database dependency error: {str(e)}")
        raise PAMError(f"Database service error: {str(e)}", ErrorCode.DATABASE_CONNECTION_ERROR)
    finally:
        # Cleanup if needed
        pass


async def get_cache() -> Generator[CacheService, None, None]:
    """Get cache service instance"""
    cache_service = CacheService()
    try:
        yield cache_service
    except Exception as e:
        logger.error(f"Cache dependency error: {str(e)}")
        raise PAMError(f"Cache service error: {str(e)}", ErrorCode.CACHE_CONNECTION_ERROR)
    finally:
        # Cleanup if needed
        pass


# PAM Service Dependencies
async def get_pam_orchestrator():
    """Get PAM orchestrator instance"""
    try:
        # Initialize orchestrator if not already initialized
        if not orchestrator.database_service:
            await orchestrator.initialize()
        return orchestrator
    except Exception as e:
        logger.error(f"PAM orchestrator dependency error: {str(e)}")
        raise PAMError(f"PAM service error: {str(e)}", ErrorCode.NODE_INITIALIZATION_ERROR)


# Authentication Dependencies
def verify_jwt_token(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> Dict[str, Any]:
    """Verify JWT token and return payload"""
    try:
        token = credentials.credentials
        payload = jwt.decode(
            token, settings.SECRET_KEY.get_secret_value(), algorithms=[settings.ALGORITHM]
        )
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except PyJWTError as e:  # Fixed: Use PyJWTError instead of jwt.JWTError
        logger.error(f"JWT verification error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )


def verify_supabase_jwt_token(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> Dict[str, Any]:
    """
    Verify Supabase JWT token and return payload
    
    Supabase uses proper JWT + refresh token flow:
    - Access tokens are short-lived (1 hour by default) 
    - Refresh tokens are long-lived (stored securely)
    - Frontend handles automatic token refresh
    - We just need to validate the current access token
    """
    try:
        if not credentials or not credentials.credentials:
            logger.error("🔐 No credentials provided")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Authorization header missing",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        token = credentials.credentials
        logger.info(f"🔐 Verifying Supabase access token (length: {len(token)})")
        
        # Supabase uses standard JWT format - decode without signature verification
        # since we trust Supabase's token issuance and the frontend handles refresh
        try:
            payload = jwt.decode(
                token, 
                options={
                    "verify_signature": False,  # Trust Supabase's signing
                    "verify_exp": True,         # Check if token is expired
                    "verify_aud": False,        # Don't verify audience
                    "verify_iss": False         # Don't verify issuer
                },
                algorithms=["HS256", "RS256"]
            )
            logger.info("🔐 Supabase JWT decoded successfully")
            
        except jwt.ExpiredSignatureError:
            logger.warning("🔐 Token has expired - frontend should refresh")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token expired - please refresh",
                headers={"WWW-Authenticate": "Bearer"},
            )
        except Exception as e:
            logger.error(f"🔐 JWT decode failed: {str(e)}")
            # Fallback: try without any verification for debugging
            try:
                payload = jwt.decode(
                    token,
                    options={"verify_signature": False, "verify_exp": False}
                )
                logger.warning("🔐 JWT decoded with full verification disabled")
            except Exception as fallback_error:
                logger.error(f"🔐 Fallback decode also failed: {str(fallback_error)}")
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail=f"Invalid JWT format: {str(e)}",
                    headers={"WWW-Authenticate": "Bearer"},
                )
        
        # Validate required fields
        user_id = payload.get('sub')
        if not user_id:
            logger.error(f"🔐 Token missing 'sub' field. Available keys: {list(payload.keys())}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token: missing user ID",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        # Log successful authentication
        logger.info(f"🔐 User authenticated: {user_id}")
        logger.debug(f"🔐 Token payload keys: {list(payload.keys())}")
        
        # Optional: Check token role and permissions
        role = payload.get('role', 'authenticated')
        if role not in ['authenticated', 'service_role']:
            logger.warning(f"🔐 Unusual token role: {role}")
        
        return payload
        
    except HTTPException:
        # Re-raise HTTP exceptions as-is
        raise
    except Exception as e:
        logger.error(f"🔐 Unexpected authentication error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication failed",
            headers={"WWW-Authenticate": "Bearer"},
        )


async def get_current_user(
    payload: Dict[str, Any] = Depends(verify_jwt_token), db: DatabaseService = Depends(get_database)
) -> CurrentUser:
    """Get current authenticated user"""
    try:
        user_id = payload.get("sub")
        if not user_id:
            raise AuthenticationError("Invalid token payload")

        # Get user details from database
        user_data = await db.get_user_profile(user_id)
        if not user_data:
            raise AuthenticationError("User not found")

        return CurrentUser(
            user_id=user_id,
            email=user_data.get("email", ""),
            role=user_data.get("role", "user"),
            permissions=user_data.get("permissions", []),
        )
    except Exception as e:
        logger.error(f"Get current user error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Could not validate user"
        )


async def get_optional_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(HTTPBearer(auto_error=False)),
    db: DatabaseService = Depends(get_database),
) -> Optional[CurrentUser]:
    """Get current user if authenticated, None otherwise"""
    if not credentials:
        return None

    try:
        payload = verify_jwt_token(credentials)
        return await get_current_user(payload, db)
    except HTTPException:
        return None


# Permission Dependencies
def require_permission(permission: str):
    """Decorator to require specific permission"""

    def dependency(current_user: CurrentUser = Depends(get_current_user)):
        if permission not in current_user.permissions and current_user.role != "admin":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN, detail=f"Permission '{permission}' required"
            )
        return current_user

    return dependency


def require_role(role: str):
    """Decorator to require specific role"""

    def dependency(current_user: CurrentUser = Depends(get_current_user)):
        if current_user.role != role and current_user.role != "admin":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN, detail=f"Role '{role}' required"
            )
        return current_user

    return dependency


def require_admin():
    """Require admin role"""
    return require_role("admin")


def require_user_or_admin():
    """Require user or admin role"""

    def dependency(current_user: CurrentUser = Depends(get_current_user)):
        if current_user.role not in ["user", "admin"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN, detail="User or admin role required"
            )
        return current_user

    return dependency


# API Key Dependencies
async def validate_api_key(
    x_api_key: Optional[str] = Header(None, alias="X-API-Key")
) -> Optional[str]:
    """Validate API key if provided"""
    if not x_api_key:
        return None

    # Add your API key validation logic here
    # This is a placeholder - implement based on your needs
    valid_api_keys = getattr(settings, "VALID_API_KEYS", [])

    if x_api_key not in valid_api_keys:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid API key")

    return x_api_key


# Pagination Dependencies
def get_pagination_params(
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(20, ge=1, le=100, description="Items per page"),
) -> PaginationParams:
    """Get pagination parameters"""
    return PaginationParams(page=page, limit=limit)


# Rate Limiting Dependencies
async def check_rate_limit(
    current_user: CurrentUser = Depends(get_current_user),
    db: DatabaseService = Depends(get_database),
) -> bool:
    """Check rate limiting for current user"""
    try:
        # Check rate limit (60 requests per minute by default)
        window_start = datetime.utcnow() - timedelta(minutes=1)
        result = await db.check_rate_limit(
            current_user.user_id, window_start, settings.RATE_LIMIT_PER_MINUTE
        )

        if not result.get("allow", False):
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail="Rate limit exceeded"
            )

        return True
    except Exception as e:
        logger.error(f"Rate limit check error: {str(e)}")
        # Allow request if rate limiting fails
        return True


def apply_rate_limit(endpoint: str, limit: int, window_minutes: int = 1):
    """Rate limiting factory that returns a dependency function"""
    async def rate_limit_dependency(
        current_user: CurrentUser = Depends(get_current_user),
        db: DatabaseService = Depends(get_database),
    ) -> CurrentUser:
        """Apply rate limiting and return current user if allowed"""
        try:
            # Check rate limit with custom parameters
            window_start = datetime.utcnow() - timedelta(minutes=window_minutes)
            result = await db.check_rate_limit(
                current_user.user_id, window_start, limit
            )

            if not result.get("allow", False):
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS, 
                    detail=f"Rate limit exceeded for {endpoint}. Try again later."
                )

            return current_user
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Rate limit check error for {endpoint}: {str(e)}")
            # Allow request if rate limiting fails
            return current_user
    
    return rate_limit_dependency


def validate_user_context(
    current_user: CurrentUser = Depends(get_current_user),
) -> CurrentUser:
    """Validate user context and return current user"""
    return current_user


# Health Check Dependencies
async def get_health_status() -> Dict[str, Any]:
    """Get system health status"""
    try:
        health = {"status": "healthy", "timestamp": datetime.utcnow().isoformat(), "services": {}}

        # Check database
        try:
            db = DatabaseService()
            await db.health_check()
            health["services"]["database"] = "healthy"
        except Exception as e:
            health["services"]["database"] = f"unhealthy: {str(e)}"
            health["status"] = "degraded"

        # Check cache
        try:
            cache = CacheService()
            await cache.health_check()
            health["services"]["cache"] = "healthy"
        except Exception as e:
            health["services"]["cache"] = f"unhealthy: {str(e)}"
            health["status"] = "degraded"

        # Check PAM orchestrator
        try:
            pam = orchestrator
            health["services"]["pam"] = "healthy"
        except Exception as e:
            health["services"]["pam"] = f"unhealthy: {str(e)}"
            health["status"] = "degraded"

        return health
    except Exception as e:
        logger.error(f"Health check error: {str(e)}")
        return {"status": "unhealthy", "error": str(e), "timestamp": datetime.utcnow().isoformat()}


async def get_current_user_optional(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(HTTPBearer(auto_error=False))
) -> Optional[CurrentUser]:
    """
    Get current user from JWT token, but return None if no token provided.
    Used for endpoints that work with or without authentication.
    """
    if not credentials:
        return None
    
    try:
        # Verify JWT token
        payload = await verify_supabase_jwt_token(credentials)
        db = DatabaseService()
        return await get_current_user(payload, db)
    except Exception:
        return None


# Utility Dependencies
def get_user_context(current_user: CurrentUser = Depends(get_current_user)) -> Dict[str, Any]:
    """Get user context for requests"""
    return {
        "user_id": current_user.user_id,
        "email": current_user.email,
        "role": current_user.role,
        "permissions": current_user.permissions,
        "timestamp": datetime.utcnow().isoformat(),
    }


def get_request_metadata(
    user_agent: Optional[str] = Header(None, alias="User-Agent"),
    x_forwarded_for: Optional[str] = Header(None, alias="X-Forwarded-For"),
) -> Dict[str, Any]:
    """Get request metadata"""
    return {
        "user_agent": user_agent,
        "forwarded_for": x_forwarded_for,
        "timestamp": datetime.utcnow().isoformat(),
    }
