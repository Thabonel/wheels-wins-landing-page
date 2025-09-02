
from pydantic import BaseModel, Field, EmailStr, validator
from typing import Optional, Dict, Any
from datetime import datetime
from ..domain.user import UserProfile, UserVehicle, UserPreferences

class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=8)
    remember_me: bool = False
    device_info: Optional[Dict[str, Any]] = None

class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=8)
    confirm_password: str
    full_name: Optional[str] = Field(None, max_length=100)
    terms_accepted: bool = True
    marketing_consent: bool = False
    
    @validator('confirm_password')
    def passwords_match(cls, v, values):
        if 'password' in values and v != values['password']:
            raise ValueError('Passwords do not match')
        return v

class TokenRefreshRequest(BaseModel):
    refresh_token: str

class ResetPasswordRequest(BaseModel):
    email: EmailStr

class ConfirmResetPasswordRequest(BaseModel):
    token: str
    new_password: str = Field(..., min_length=8)
    confirm_password: str
    
    @validator('confirm_password')
    def passwords_match(cls, v, values):
        if 'new_password' in values and v != values['new_password']:
            raise ValueError('Passwords do not match')
        return v

class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str = Field(..., min_length=8)
    confirm_password: str
    
    @validator('confirm_password')
    def passwords_match(cls, v, values):
        if 'new_password' in values and v != values['new_password']:
            raise ValueError('Passwords do not match')
        return v

class UpdateProfileRequest(BaseModel):
    full_name: Optional[str] = Field(None, max_length=100)
    nickname: Optional[str] = Field(None, max_length=50)
    phone: Optional[str] = None
    vehicle: Optional[UserVehicle] = None
    preferences: Optional[UserPreferences] = None

class AuthResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int
    user: UserProfile

class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int

class UserResponse(BaseModel):
    user: UserProfile
    permissions: list[str] = Field(default_factory=list)
    last_activity: Optional[datetime] = None

class LogoutResponse(BaseModel):
    success: bool = True
    message: str = "Successfully logged out"

class VerifyEmailRequest(BaseModel):
    token: str

class ResendVerificationRequest(BaseModel):
    email: EmailStr
