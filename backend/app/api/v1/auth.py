from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, EmailStr
from typing import Optional
import uuid
from datetime import timedelta

from app.core.auth import (
    verify_password, 
    get_password_hash, 
    create_access_token, 
    verify_token,
    ACCESS_TOKEN_EXPIRE_MINUTES
)
from app.services.database import DatabaseService

router = APIRouter()
security = HTTPBearer()

# Request/Response models
class UserRegister(BaseModel):
    email: EmailStr
    password: str
    full_name: Optional[str] = None

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
