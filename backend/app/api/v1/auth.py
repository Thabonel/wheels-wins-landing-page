from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, EmailStr, field_validator
from typing import Optional
import uuid
import asyncio
from datetime import timedelta

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
async def logout():
    """Logout user (client should delete token)"""
    return {"message": "Successfully logged out"}

@router.get("/password-requirements")
async def get_password_requirements_endpoint():
    """Get password strength requirements for frontend display"""
    return {
        "requirements": get_password_requirements(),
        "min_length": 8,
        "max_length": 128
    }


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
