
from pydantic import BaseModel, Field, validator
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum

class VehicleType(str, Enum):
    MOTORHOME = "motorhome"
    TRAVEL_TRAILER = "travel_trailer"
    FIFTH_WHEEL = "fifth_wheel"
    TRUCK_CAMPER = "truck_camper"
    VAN = "van"
    TENT_TRAILER = "tent_trailer"

class FuelType(str, Enum):
    GASOLINE = "gasoline"
    DIESEL = "diesel"
    ELECTRIC = "electric"
    HYBRID = "hybrid"

class TravelStyle(str, Enum):
    BOONDOCKING = "boondocking"
    CAMPGROUNDS = "campgrounds"
    MIXED = "mixed"
    LUXURY = "luxury"

class UserVehicle(BaseModel):
    vehicle_type: VehicleType
    make: Optional[str] = None
    model: Optional[str] = None
    year: Optional[int] = None
    length_feet: Optional[int] = None
    fuel_type: FuelType = FuelType.GASOLINE
    towing_capacity: Optional[int] = None
    has_toad: bool = False
    toad_info: Optional[str] = None

class UserPreferences(BaseModel):
    travel_style: TravelStyle = TravelStyle.MIXED
    max_drive_hours: Optional[int] = 8
    preferred_camp_types: List[str] = []
    budget_categories: List[str] = ["Fuel", "Food", "Camp", "Fun", "Other"]
    region: Optional[str] = None
    accessibility_needs: List[str] = []
    has_pets: bool = False
    pet_info: Optional[str] = None

class UserProfile(BaseModel):
    id: str
    email: str
    full_name: Optional[str] = None
    nickname: Optional[str] = None
    avatar_url: Optional[str] = None
    phone: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    is_active: bool = True
    vehicle: Optional[UserVehicle] = None
    preferences: UserPreferences = Field(default_factory=UserPreferences)
    onboarding_completed: bool = False
    last_login: Optional[datetime] = None
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }

class UserLocation(BaseModel):
    latitude: float
    longitude: float
    address: Optional[str] = None
    timestamp: datetime
    accuracy: Optional[float] = None

class UserSession(BaseModel):
    user_id: str
    session_id: str
    created_at: datetime
    expires_at: datetime
    device_info: Optional[Dict[str, Any]] = None
    ip_address: Optional[str] = None
    is_active: bool = True
