from datetime import datetime, timedelta
from typing import Optional, Dict, Any
import jwt  # SECURITY FIX: Replaced python-jose with PyJWT
from jwt.exceptions import InvalidTokenError, DecodeError
from passlib.context import CryptContext
from fastapi import HTTPException, status, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import os
import requests
from requests.exceptions import Timeout as RequestsTimeout
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import rsa
import json

# Add WebSocket auth verification
async def verify_token_websocket(token: str) -> str:
    """Verify JWT token for WebSocket connections and return user_id"""
    try:
        # First try to verify as local JWT token
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
        if user_id:
            return str(user_id)
    except (InvalidTokenError, DecodeError):
        pass
    
    try:
        # Try to verify as Supabase token
        supabase_url = os.getenv("SUPABASE_URL")
        if supabase_url:
            payload = verify_supabase_token(token, supabase_url)
            user_id = payload.get("sub")
            if user_id:
                return str(user_id)
    except Exception:
        pass
    
    # If all verification fails, reject the connection
    raise ValueError("Invalid or expired token")

# Configuration
SECRET_KEY = os.getenv("SECRET_KEY", "change-me")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

# HTTP timeout for external requests
HTTP_TIMEOUT = float(os.getenv("HTTP_TIMEOUT", "5"))

# Reuse a session with connection pooling for external HTTP requests
_http_session = requests.Session()
_adapter = HTTPAdapter(
    pool_connections=10,
    pool_maxsize=10,
    max_retries=Retry(total=3, backoff_factor=0.5)
)
_http_session.mount("http://", _adapter)
_http_session.mount("https://", _adapter)

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against its hash"""
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    """Hash a password"""
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    """Create JWT access token"""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def verify_token(token: str):
    """Verify JWT token and return payload"""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Could not validate credentials",
                headers={"WWW-Authenticate": "Bearer"},
            )
        return payload
    except (InvalidTokenError, DecodeError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

async def verify_jwt_token(token: str) -> Dict[str, Any]:
    """
    Async function to verify JWT token for WebSocket connections.
    Returns the decoded payload if valid, raises exception if invalid.
    
    This function is specifically designed for WebSocket authentication where
    we need to verify the token BEFORE accepting the connection.
    """
    try:
        # Decode and verify the JWT token
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        
        # Ensure the token has a subject (user ID)
        user_id = payload.get("sub")
        if not user_id:
            raise ValueError("Token missing user ID (sub)")
        
        return payload
        
    except jwt.ExpiredSignatureError:
        raise ValueError("Token has expired")
    except (InvalidTokenError, DecodeError) as e:
        raise ValueError(f"Invalid token: {str(e)}")


def verify_supabase_token(token: str, supabase_url: str):
    """Verify a Supabase-issued JWT using the project's public JWKS."""
    try:
        jwks_url = f"{str(supabase_url).rstrip('/')}/auth/v1/keys"
        try:
            jwks_data = _http_session.get(jwks_url, timeout=HTTP_TIMEOUT).json()
        except RequestsTimeout:
            raise HTTPException(
                status_code=status.HTTP_504_GATEWAY_TIMEOUT,
                detail="JWKS request timed out",
            )
        header = jwt.get_unverified_header(token)
        key_data = next(
            (k for k in jwks_data.get("keys", []) if k.get("kid") == header.get("kid")),
            None,
        )
        if not key_data:
            raise InvalidTokenError("Signing key not found")
        
        # Convert JWK to PEM format for PyJWT
        if key_data.get("kty") == "RSA":
            # Convert RSA key from JWK format
            public_key = rsa.RSAPublicNumbers(
                int.from_bytes(jwt.utils.base64url_decode(key_data["e"]), 'big'),
                int.from_bytes(jwt.utils.base64url_decode(key_data["n"]), 'big')
            ).public_key()
            pem_key = public_key.public_bytes(
                encoding=serialization.Encoding.PEM,
                format=serialization.PublicFormat.SubjectPublicKeyInfo
            )
        else:
            # For other key types, use the key directly (may need additional handling)
            pem_key = key_data
        
        return jwt.decode(token, pem_key, algorithms=[header.get("alg")], options={"verify_aud": False})
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid Supabase token",
        ) from e


# Security scheme for Bearer token
security = HTTPBearer()

async def get_current_user_id(credentials: HTTPAuthorizationCredentials = Depends(security)) -> str:
    """
    FastAPI dependency to get current user ID from JWT token.
    Returns just the user_id string for API endpoints.
    """
    user_data = await get_current_user(credentials)
    return user_data.get("id")

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> Dict[str, Any]:
    """
    FastAPI dependency to get current user from JWT token.
    Supports both local JWT tokens and Supabase tokens.
    """
    token = credentials.credentials
    
    try:
        # First try to verify as local JWT token
        payload = verify_token(token)
        return {
            "id": payload.get("sub"),
            "username": payload.get("username"),
            "email": payload.get("email"),
            "is_admin": payload.get("is_admin", False),
            "token_type": "local"
        }
    except HTTPException:
        pass  # Try Supabase verification
    
    try:
        # Try to verify as Supabase token
        supabase_url = os.getenv("SUPABASE_URL")
        if supabase_url:
            payload = verify_supabase_token(token, supabase_url)
            return {
                "id": payload.get("sub"),
                "email": payload.get("email"),
                "username": payload.get("user_metadata", {}).get("username"),
                "is_admin": payload.get("user_metadata", {}).get("is_admin", False),
                "token_type": "supabase"
            }
    except HTTPException:
        pass  # Try simple token verification
    
    # REMOVED: Insecure unverified token fallback - Security Risk
    # This fallback allowed token manipulation and bypassed authentication
    
    # If all verification methods fail
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )


async def get_current_user_optional(credentials: Optional[HTTPAuthorizationCredentials] = Depends(HTTPBearer(auto_error=False))) -> Optional[Dict[str, Any]]:
    """
    FastAPI dependency to get current user from JWT token, but returns None if no token provided.
    Used for endpoints that work with or without authentication.
    """
    if not credentials:
        return None
    
    try:
        return await get_current_user(credentials)
    except HTTPException:
        return None
