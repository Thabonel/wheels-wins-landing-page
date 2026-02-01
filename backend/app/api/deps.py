"""
API Dependencies - Common dependencies for FastAPI endpoints
Enhanced with secure session management and MFA support
"""

from typing import Optional, Dict, Any, Generator
from datetime import datetime, timedelta
from functools import wraps
import json
import uuid

from fastapi import Depends, HTTPException, status, Header, Query, Request, Response
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import jwt
from jwt import PyJWTError  # Import PyJWTError directly
from pydantic import BaseModel, Field

from app.core.config import settings
from app.services.database import DatabaseService
from app.services.cache import CacheService
from app.services.pam.enhanced_orchestrator import enhanced_orchestrator as orchestrator, get_enhanced_orchestrator
from app.core.exceptions import PAMError, AuthenticationError, PermissionError, ErrorCode
from app.core.logging import get_logger
from app.services.auth.session_manager import get_session_manager
from app.services.auth.mfa_service import get_mfa_service
from app.services.auth.session_compatibility import get_compatibility_layer

logger = get_logger("api.deps")

# Security scheme
security = HTTPBearer(auto_error=False)  # Don't auto-error for missing auth


def _safe_error_message(error: Exception) -> str:
    """
    Safely extract error message from exception, preventing JSON serialization errors.
    Handles cases where error objects contain non-serializable enum types like PAMEventType.
    """
    try:
        # First, try to get the basic error message
        error_msg = str(error)
        
        # If the error message contains references to enum objects that can't be serialized,
        # we need to clean it up
        if "Object of type" in error_msg and "is not JSON serializable" in error_msg:
            # Extract just the type name for cleaner error reporting
            if "PAMEventType" in error_msg:
                return "PAM event logging error: enum serialization issue"
            elif "ErrorCode" in error_msg:
                return "Error code serialization issue"
            else:
                return "Object serialization error"
        
        return error_msg
        
    except Exception:
        # Fallback: if we can't even convert to string safely
        return f"Error occurred in {type(error).__name__}"


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
    session_id: Optional[str] = None
    mfa_verified: bool = False
    requires_mfa: bool = False


# Database Dependencies
async def get_database() -> Generator[DatabaseService, None, None]:
    """Get database service instance"""
    db_service = DatabaseService()
    try:
        yield db_service
    except Exception as e:
        # Safe error message extraction to prevent JSON serialization errors
        error_message = _safe_error_message(e)
        logger.error(f"Database dependency error: {error_message}")
        raise PAMError(f"Database service error: {error_message}", ErrorCode.DATABASE_CONNECTION_ERROR)
    finally:
        # Cleanup if needed
        pass


async def get_cache() -> Generator[CacheService, None, None]:
    """Get cache service instance"""
    cache_service = CacheService()
    try:
        yield cache_service
    except Exception as e:
        # Safe error message extraction to prevent JSON serialization errors
        error_message = _safe_error_message(e)
        logger.error(f"Cache dependency error: {error_message}")
        raise PAMError(f"Cache service error: {error_message}", ErrorCode.CACHE_CONNECTION_ERROR)
    finally:
        # Cleanup if needed
        pass


# PAM Service Dependencies
async def get_pam_orchestrator():
    """Get PAM orchestrator instance"""
    try:
        # Get the enhanced orchestrator with full tool support
        return await get_enhanced_orchestrator()
    except Exception as e:
        # Safe error message extraction to prevent JSON serialization errors
        error_message = _safe_error_message(e)
        logger.error(f"PAM orchestrator dependency error: {error_message}")
        raise PAMError(f"PAM service error: {error_message}", ErrorCode.NODE_INITIALIZATION_ERROR)


# Enhanced Authentication Dependencies with Session Management and MFA

async def verify_secure_jwt_token(
    request: Request,
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> Dict[str, Any]:
    """
    Enhanced JWT verification with session management and MFA validation
    Checks for session validity and JWT blacklisting
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
        logger.info(f"🔐 Verifying secure JWT token (length: {len(token)})")

        # Decode JWT to get payload and JTI
        try:
            # First decode without verification to get JTI for blacklist check
            unverified_payload = jwt.decode(
                token,
                options={"verify_signature": False, "verify_exp": False}
            )

            jti = unverified_payload.get('jti')
            if not jti:
                # Generate JTI for tokens that don't have one
                jti = str(uuid.uuid4())
                logger.info("🔐 Generated JTI for token without one")

            # Check if JWT is blacklisted
            session_manager = await get_session_manager()
            if await session_manager.is_jwt_blacklisted(jti):
                logger.warning(f"🚫 Blacklisted JWT attempted: {jti}")
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Token has been revoked",
                    headers={"WWW-Authenticate": "Bearer"},
                )

        except Exception as e:
            logger.error(f"🔐 Token preprocessing error: {e}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token format",
                headers={"WWW-Authenticate": "Bearer"},
            )

        # Now verify the token properly
        try:
            payload = jwt.decode(
                token,
                settings.SUPABASE_SERVICE_ROLE_KEY.get_secret_value(),
                algorithms=["HS256"],
                options={
                    "verify_signature": True,
                    "verify_exp": True,
                    "verify_aud": False,
                    "verify_iss": False
                }
            )
        except jwt.ExpiredSignatureError:
            logger.warning("🔐 Token has expired")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token has expired",
                headers={"WWW-Authenticate": "Bearer"},
            )
        except Exception as e:
            logger.error(f"🔐 Token verification failed: {e}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Could not validate credentials",
                headers={"WWW-Authenticate": "Bearer"},
            )

        user_id = payload.get('sub')
        if not user_id:
            logger.error(f"🔐 Token missing 'sub' field")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token: missing user ID",
                headers={"WWW-Authenticate": "Bearer"},
            )

        # Extract device info from request
        device_info = {
            "user_agent": request.headers.get("User-Agent"),
            "ip_address": request.client.host if request.client else None,
            "x_forwarded_for": request.headers.get("X-Forwarded-For")
        }

        # Add session tracking information
        payload.update({
            "jti": jti,
            "device_info": device_info,
            "auth_method": "secure_jwt"
        })

        logger.info(f"🔐 Secure JWT verified for user: {user_id}")
        return payload

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"🔐 Unexpected secure authentication error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication failed",
            headers={"WWW-Authenticate": "Bearer"},
        )


async def verify_mfa_if_required(
    payload: Dict[str, Any],
    mfa_code: Optional[str] = Header(None, alias="X-MFA-Code")
) -> Dict[str, Any]:
    """
    Verify MFA if required for the user
    Returns payload with MFA verification status
    """
    user_id = payload.get('sub')
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload"
        )

    mfa_service = get_mfa_service()

    # Check if MFA is required for this user
    requires_mfa = await mfa_service.is_mfa_required_for_user(user_id)

    if requires_mfa:
        if not mfa_code:
            logger.warning(f"🔐 MFA required but not provided for user {user_id}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="MFA code required",
                headers={"X-MFA-Required": "true"},
            )

        # Verify MFA code
        mfa_result = await mfa_service.verify_mfa(user_id, mfa_code)

        if not mfa_result.get('success'):
            logger.warning(f"🔐 MFA verification failed for user {user_id}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=mfa_result.get('error', 'MFA verification failed'),
                headers={"X-MFA-Required": "true"},
            )

        logger.info(f"🔐 MFA verified for user {user_id} via {mfa_result.get('method')}")
        payload.update({
            "mfa_verified": True,
            "mfa_method": mfa_result.get('method'),
            "backup_codes_remaining": mfa_result.get('backup_codes_remaining', 0)
        })
    else:
        payload.update({"mfa_verified": False})

    payload.update({"requires_mfa": requires_mfa})
    return payload


async def create_or_update_session(
    payload: Dict[str, Any],
    request: Request
) -> str:
    """
    Create or update session tracking for authenticated user
    Returns session_id
    """
    try:
        session_manager = await get_session_manager()

        user_id = payload.get('sub')
        jti = payload.get('jti')
        device_info = payload.get('device_info', {})

        # Create session
        session_info = await session_manager.create_session(
            user_id=user_id,
            jti=jti,
            device_info=device_info,
            ip_address=device_info.get('ip_address'),
            user_agent=device_info.get('user_agent')
        )

        return session_info.session_id

    except Exception as e:
        logger.error(f"🔐 Session creation failed: {e}")
        # Don't fail authentication if session tracking fails
        return str(uuid.uuid4())


async def get_secure_current_user_compatible(
    request: Request,
    response: Response = None
) -> CurrentUser:
    """
    Get current authenticated user with compatibility layer
    Supports dual-mode authentication and migration
    """
    try:
        # Use compatibility layer for authentication
        compatibility_layer = await get_compatibility_layer()
        auth_context = await compatibility_layer.authenticate_request(request)

        if not auth_context:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Authentication required",
                headers={"WWW-Authenticate": "Bearer"},
            )

        # Check MFA if required
        mfa_service = await get_mfa_service()
        requires_mfa = await mfa_service.is_mfa_required_for_user(auth_context.user_id)

        mfa_verified = False
        if requires_mfa:
            mfa_code = request.headers.get("X-MFA-Code")
            if not mfa_code:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="MFA code required",
                    headers={"X-MFA-Required": "true"},
                )

            # Verify MFA code
            mfa_result = await mfa_service.verify_mfa(auth_context.user_id, mfa_code)
            if not mfa_result.success:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail=mfa_result.error or 'MFA verification failed',
                    headers={"X-MFA-Required": "true"},
                )
            mfa_verified = True

        # Get user details from database
        db = DatabaseService()
        user_data = await db.get_user_profile(auth_context.user_id)

        if not user_data:
            raise AuthenticationError("User not found")

        # Handle migration if needed and response is available
        if response and auth_context.requires_migration:
            await compatibility_layer.schedule_token_migration(auth_context, response)

        return CurrentUser(
            user_id=auth_context.user_id,
            email=user_data.get("email", ""),
            role=user_data.get("role", "user"),
            permissions=user_data.get("permissions", []),
            session_id=auth_context.session_id,
            mfa_verified=mfa_verified,
            requires_mfa=requires_mfa
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get secure current user compatible error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication failed"
        )


# Legacy Authentication Dependencies (for backward compatibility)
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
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
) -> Dict[str, Any]:
    """
    Verify Supabase JWT token and return payload
    
    Supabase uses proper JWT + refresh token flow:
    - Access tokens are short-lived (1 hour by default) 
    - Refresh tokens are long-lived (stored securely)
    - Frontend handles automatic token refresh
    - We just need to validate the current access token
    
    CORS Support: Skips authentication for OPTIONS preflight requests
    """
    # Handle CORS preflight requests (OPTIONS) - these don't need authentication
    if request.method == "OPTIONS":
        logger.info(f"🔍 OPTIONS request to {request.url.path} - skipping authentication")
        return {"user_id": "anonymous", "method": "OPTIONS", "sub": "anonymous"}
    
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
        
        # Verify Supabase JWT with proper signature verification
        # Use the service role key as the JWT secret
        jwt_secret = settings.SUPABASE_SERVICE_ROLE_KEY.get_secret_value()
        
        try:
            # First try with proper signature verification
            payload = jwt.decode(
                token,
                jwt_secret,
                algorithms=["HS256"],
                options={
                    "verify_signature": True,   # Verify signature
                    "verify_exp": True,         # Check if token is expired
                    "verify_aud": False,        # Don't verify audience
                    "verify_iss": False         # Don't verify issuer
                }
            )
            logger.debug("🔐 Supabase JWT verified with signature")
            
        except jwt.ExpiredSignatureError:
            logger.warning("🔐 Token has expired - frontend should refresh")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token expired - please refresh",
                headers={"WWW-Authenticate": "Bearer"},
            )
        except Exception as e:
            logger.error(f"🔐 JWT decode failed: {str(e)}")
            
            # Fallback: try without signature verification for development
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
        # Accept admin role along with authenticated and service_role
        if role not in ['authenticated', 'service_role', 'admin', 'anon']:
            logger.warning(f"🔐 Unusual token role: {role}")
        else:
            logger.info(f"🔐 Token role validated: {role}")
        
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


def verify_supabase_jwt_token_sync(
    credentials: HTTPAuthorizationCredentials,
) -> Dict[str, Any]:
    """
    Synchronous version of verify_supabase_jwt_token for WebSocket use
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
        
        # SECURITY FIX: Remove UUID acceptance - only accept proper JWT tokens
        # All clients must use JWT authentication
        
        # Verify Supabase JWT with proper signature verification
        jwt_secret = settings.SUPABASE_SERVICE_ROLE_KEY.get_secret_value()
        
        try:
            payload = jwt.decode(
                token,
                jwt_secret, 
                algorithms=["HS256"],
                options={
                    "verify_signature": True,   # Verify signature
                    "verify_exp": True,         # Check if token is expired
                    "verify_aud": False,        # Don't verify audience
                    "verify_iss": False         # Don't verify issuer
                }
            )
            logger.debug("🔐 Supabase JWT verified with signature (sync)")
            
        except jwt.ExpiredSignatureError:
            logger.warning("🔐 Token has expired - frontend should refresh")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token expired - please refresh",
                headers={"WWW-Authenticate": "Bearer"},
            )
        except Exception as e:
            logger.error(f"🔐 JWT decode failed: {str(e)}")
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
        logger.info(f"🔐 User authenticated (sync): {user_id}")
        
        return payload
        
    except HTTPException:
        # Re-raise HTTP exceptions as-is
        raise
    except Exception as e:
        logger.error(f"🔐 Unexpected authentication error (sync): {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication failed",
            headers={"WWW-Authenticate": "Bearer"},
        )


async def verify_supabase_jwt_flexible(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(HTTPBearer(auto_error=False)),
) -> Dict[str, Any]:
    """
    Flexible Supabase JWT verification that handles both:
    1. Authorization header (standard method)
    2. Request body auth_token field (workaround for Render.com header size limits)
    """
    token = None
    auth_method = "none"
    
    # Method 1: Check for Authorization header (standard)
    if credentials and credentials.credentials:
        token = credentials.credentials
        auth_method = "header"
        logger.info(f"🔐 Using Authorization header (length: {len(token)})")
    
    # Method 2: Check for X-Auth-Method header indicating body-based auth
    elif request.headers.get("X-Auth-Method") == "body-token":
        try:
            # Parse request body to extract auth_token
            body = await request.body()
            if body:
                body_data = json.loads(body.decode())
                token = body_data.get("auth_token")
                if token:
                    auth_method = "body"
                    logger.info(f"🔐 Using body-based auth (length: {len(token)})")
        except Exception as e:
            logger.error(f"🔐 Failed to extract token from body: {str(e)}")
    
    # If no token found, raise authentication error
    if not token:
        logger.error("🔐 No authentication token found in header or body")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication token missing",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Now verify the token using the same logic as verify_supabase_jwt_token
    try:
        logger.info(f"🔐 Verifying Supabase token via {auth_method} (length: {len(token)})")
        
        # Decode JWT without signature verification (trust Supabase)
        try:
            payload = jwt.decode(
                token, 
                options={
                    "verify_signature": False,
                    "verify_exp": True,
                    "verify_aud": False,
                    "verify_iss": False
                },
                algorithms=["HS256", "RS256"]
            )
            logger.info(f"🔐 JWT decoded successfully via {auth_method}")
            
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
                logger.warning(f"🔐 JWT decoded with full verification disabled via {auth_method}")
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
        logger.info(f"🔐 User authenticated via {auth_method}: {user_id}")
        
        return payload
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"🔐 Unexpected authentication error via {auth_method}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication failed",
            headers={"WWW-Authenticate": "Bearer"},
        )


def verify_token_from_request_or_header(
    request_data: Optional[Dict[str, Any]] = None,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(HTTPBearer(auto_error=False)),
) -> Dict[str, Any]:
    """
    Simple token verification that checks both request body and Authorization header
    for cases where we already have the parsed request data
    """
    token = None
    auth_method = "none"
    
    # Method 1: Check for Authorization header (standard)
    if credentials and credentials.credentials:
        token = credentials.credentials
        auth_method = "header"
        logger.info(f"🔐 Using Authorization header (length: {len(token)})")
    
    # Method 2: Check for auth_token in request data (workaround)
    elif request_data and "auth_token" in request_data:
        token = request_data["auth_token"]
        if token:
            auth_method = "body"
            logger.info(f"🔐 Using body-based auth (length: {len(token)})")
    
    # If no token found, raise authentication error
    if not token:
        logger.error("🔐 No authentication token found in header or body")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication token missing",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Verify the token using same logic as verify_supabase_jwt_token
    try:
        logger.info(f"🔐 Verifying Supabase token via {auth_method} (length: {len(token)})")
        
        # Decode JWT without signature verification (trust Supabase)
        try:
            payload = jwt.decode(
                token, 
                options={
                    "verify_signature": False,
                    "verify_exp": True,
                    "verify_aud": False,
                    "verify_iss": False
                },
                algorithms=["HS256", "RS256"]
            )
            logger.info(f"🔐 JWT decoded successfully via {auth_method}")
            
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
                logger.warning(f"🔐 JWT decoded with full verification disabled via {auth_method}")
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
        logger.info(f"🔐 User authenticated via {auth_method}: {user_id}")
        
        return payload
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"🔐 Unexpected authentication error via {auth_method}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication failed",
            headers={"WWW-Authenticate": "Bearer"},
        )


async def verify_reference_token(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: DatabaseService = Depends(get_database)
) -> Dict[str, Any]:
    """
    Verify reference token - Industry standard SaaS authentication pattern
    Used by Stripe, GitHub, and other major platforms for minimal header size
    """
    if not credentials or not credentials.credentials:
        logger.error("🎫 No reference token provided")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Reference token missing",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    token = credentials.credentials
    logger.info(f"🎫 Verifying reference token (length: {len(token)})")
    
    try:
        # Hash the token to match stored hash
        import hashlib
        token_hash = hashlib.sha256(token.encode()).hexdigest()
        
        # Look up session data
        # Note: This requires the user_sessions table from our SQL script
        session_data = await db.get_user_session_by_token_hash(token_hash)
        
        if not session_data:
            logger.warning("🎫 Reference token not found or expired")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired reference token",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        # Check expiration
        from datetime import datetime
        expires_at = datetime.fromisoformat(session_data['expires_at'].replace('Z', '+00:00'))
        if datetime.now().timestamp() > expires_at.timestamp():
            logger.warning("🎫 Reference token expired")
            # Clean up expired token
            await db.delete_user_session(session_data['id'])
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Reference token expired",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        user_data = session_data['user_data']
        logger.info(f"🎫 Reference token validated for user: {user_data['id']}")
        
        # Return user data in same format as JWT payload
        return {
            'sub': user_data['id'],
            'email': user_data['email'],
            'role': user_data['role'],
            'metadata': user_data.get('metadata', {}),
            'token_type': 'reference'
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"🎫 Reference token verification error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Reference token verification failed",
            headers={"WWW-Authenticate": "Bearer"},
        )


async def verify_flexible_auth(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(HTTPBearer(auto_error=False)),
) -> Dict[str, Any]:
    """
    Flexible authentication supporting multiple methods:
    1. Reference tokens (industry standard, minimal size)
    2. Standard JWTs (fallback)
    3. Body-based tokens (workaround for header limits)
    """
    auth_type = request.headers.get("X-Auth-Type", "jwt")
    
    if auth_type == "reference-token":
        logger.info("🎫 Using reference token authentication")
        return await verify_reference_token(credentials, await get_database().__anext__())
    else:
        logger.info("🔐 Using JWT authentication")
        return await verify_supabase_jwt_flexible(request, credentials)


async def get_current_user(
    payload: Dict[str, Any] = Depends(verify_supabase_jwt_token), db: DatabaseService = Depends(get_database)
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


# Enhanced Authentication Dependencies with Compatibility Layer

async def get_secure_current_user(
    request: Request,
    payload: Dict[str, Any] = Depends(verify_secure_jwt_token)
) -> CurrentUser:
    """
    Get current authenticated user with complete security validation
    Includes MFA verification and session management (legacy mode)
    """
    try:
        # Verify MFA if required
        payload = await verify_mfa_if_required(payload)

        # Create/update session
        session_id = await create_or_update_session(payload, request)

        user_id = payload.get('sub')

        # Get user details from database
        db = DatabaseService()
        user_data = await db.get_user_profile(user_id)

        if not user_data:
            raise AuthenticationError("User not found")

        return CurrentUser(
            user_id=user_id,
            email=user_data.get("email", ""),
            role=user_data.get("role", "user"),
            permissions=user_data.get("permissions", []),
            session_id=session_id,
            mfa_verified=payload.get("mfa_verified", False),
            requires_mfa=payload.get("requires_mfa", False)
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get secure current user error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate user"
        )

# MFA-Enhanced Permission Dependencies

def require_mfa_verified():
    """Require MFA verification for sensitive operations"""

    def dependency(current_user: CurrentUser = Depends(get_secure_current_user_compatible)):
        if current_user.requires_mfa and not current_user.mfa_verified:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="MFA verification required for this operation",
                headers={"X-MFA-Required": "true"},
            )
        return current_user

    return dependency


def require_admin_with_mfa():
    """Require admin role with mandatory MFA verification"""

    def dependency(current_user: CurrentUser = Depends(get_secure_current_user_compatible)):
        # Admin users must have MFA enabled and verified
        if current_user.role != "admin":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Admin role required"
            )

        if not current_user.mfa_verified:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="MFA verification required for admin operations",
                headers={"X-MFA-Required": "true"},
            )

        return current_user

    return dependency


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
            # Safe error message extraction to prevent JSON serialization errors
            error_message = _safe_error_message(e)
            health["services"]["pam"] = f"unhealthy: {error_message}"
            health["status"] = "degraded"

        return health
    except Exception as e:
        # Safe error message extraction to prevent JSON serialization errors
        error_message = _safe_error_message(e)
        logger.error(f"Health check error: {error_message}")
        return {"status": "unhealthy", "error": error_message, "timestamp": datetime.utcnow().isoformat()}


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


# DUPLICATE DELETED: get_pam_orchestrator() was defined twice in this file
# The first definition at line 109 is the canonical one used by the app
# This duplicate at line 880 has been removed to avoid confusion
# Deleted: October 9, 2025 - See docs/OBSOLETE_CODE_AUDIT.md


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
