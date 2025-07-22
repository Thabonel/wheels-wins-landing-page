"""
User schema models for API endpoints
Provides Pydantic models for user-related requests and responses
"""

from pydantic import BaseModel, Field, EmailStr, validator
from typing import Optional, List, Dict, Any
from datetime import datetime
from ..domain.user import UserProfile, UserVehicle, UserPreferences, UserLocation, UserSession

# Re-export UserProfile as User for compatibility with voice conversation imports
User = UserProfile

class CreateUserRequest(BaseModel):
    email: EmailStr
    full_name: Optional[str] = Field(None, max_length=100)
    nickname: Optional[str] = Field(None, max_length=50)
    phone: Optional[str] = None
    vehicle: Optional[UserVehicle] = None
    preferences: Optional[UserPreferences] = None

class UpdateUserRequest(BaseModel):
    full_name: Optional[str] = Field(None, max_length=100)
    nickname: Optional[str] = Field(None, max_length=50)
    phone: Optional[str] = None
    avatar_url: Optional[str] = None
    vehicle: Optional[UserVehicle] = None
    preferences: Optional[UserPreferences] = None

class UserLocationUpdate(BaseModel):
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)
    address: Optional[str] = None
    accuracy: Optional[float] = None

class UserResponse(BaseModel):
    user: UserProfile
    permissions: List[str] = Field(default_factory=list)
    last_activity: Optional[datetime] = None

class UserListResponse(BaseModel):
    users: List[UserProfile]
    total: int
    page: int
    limit: int
    has_more: bool

class UserStatsResponse(BaseModel):
    user_id: str
    total_trips: int = 0
    total_miles: int = 0
    total_expenses: float = 0.0
    favorite_destinations: List[str] = Field(default_factory=list)
    vehicle_efficiency: Optional[float] = None
    last_trip_date: Optional[datetime] = None

class UserPrivacySettings(BaseModel):
    profile_visible: bool = True
    location_sharing: bool = False
    trip_sharing: bool = True
    contact_preferences: Dict[str, bool] = Field(default_factory=dict)

class UserNotificationSettings(BaseModel):
    email_notifications: bool = True
    push_notifications: bool = True
    trip_reminders: bool = True
    maintenance_alerts: bool = True
    social_updates: bool = False
    marketing_emails: bool = False

class UserSettingsRequest(BaseModel):
    privacy: Optional[UserPrivacySettings] = None
    notifications: Optional[UserNotificationSettings] = None
    preferences: Optional[UserPreferences] = None

class UserActivityLog(BaseModel):
    user_id: str
    activity_type: str
    description: str
    metadata: Optional[Dict[str, Any]] = None
    timestamp: datetime
    ip_address: Optional[str] = None

class UserDeviceInfo(BaseModel):
    device_id: str
    device_type: str  # mobile, desktop, tablet
    os: Optional[str] = None
    browser: Optional[str] = None
    app_version: Optional[str] = None
    last_seen: datetime
    is_active: bool = True

# Voice conversation specific models
class VoiceUserSession(BaseModel):
    """User session information for voice conversations"""
    user_id: str
    session_id: str
    voice_preferences: Optional[Dict[str, Any]] = None
    current_location: Optional[UserLocation] = None
    driving_status: str = "unknown"  # driving, parked, passenger
    created_at: datetime
    last_interaction: Optional[datetime] = None

class VoiceUserContext(BaseModel):
    """Extended user context for voice interactions"""
    user: UserProfile
    session: VoiceUserSession
    recent_trips: List[str] = Field(default_factory=list)
    favorite_destinations: List[str] = Field(default_factory=list)
    current_trip: Optional[str] = None
    safety_mode: bool = True