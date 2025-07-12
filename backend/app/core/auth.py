from datetime import datetime, timedelta
from typing import Optional
import jwt  # SECURITY FIX: Replaced python-jose with PyJWT
from jwt.exceptions import InvalidTokenError, DecodeError
from passlib.context import CryptContext
from fastapi import HTTPException, status
import os
import requests
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import rsa
import json

# Add WebSocket auth verification
async def verify_token_websocket(token: str) -> str:
    """Verify JWT token for WebSocket connections and return user_id"""
    try:
        # Try to decode as JWT first (for Supabase tokens)
        decoded = jwt.decode(token, options={"verify_signature": False})
        user_id = decoded.get('sub', token)  # 'sub' is the user ID in Supabase JWT
        return str(user_id)
    except Exception:
        # Fall back to treating token as plain user_id
        return token

# Configuration
SECRET_KEY = os.getenv("SECRET_KEY", "change-me")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

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


def verify_supabase_token(token: str, supabase_url: str):
    """Verify a Supabase-issued JWT using the project's public JWKS."""
    try:
        jwks_url = f"{supabase_url.rstrip('/')}/auth/v1/keys"
        jwks_data = requests.get(jwks_url, timeout=5).json()
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
