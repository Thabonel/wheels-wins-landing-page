"""
Pydantic validation schemas for Profile tools

Amendment #4: Input validation for all 6 profile tools
"""

from pydantic import Field, validator
from typing import Optional
from enum import Enum

from app.services.pam.schemas.base import BaseToolInput


class ThemeOption(str, Enum):
    """Valid theme options"""
    LIGHT = "light"
    DARK = "dark"
    AUTO = "auto"


class FuelType(str, Enum):
    """Valid fuel types for vehicles"""
    GASOLINE = "gasoline"
    DIESEL = "diesel"
    ELECTRIC = "electric"
    HYBRID = "hybrid"
    PROPANE = "propane"


class VehicleType(str, Enum):
    """Valid vehicle types"""
    RV = "rv"
    MOTORHOME = "motorhome"
    TRUCK = "truck"
    CAR = "car"
    VAN = "van"
    FIFTH_WHEEL = "fifth_wheel"
    TRAVEL_TRAILER = "travel_trailer"


class ExportFormat(str, Enum):
    """Valid export formats"""
    JSON = "json"
    CSV = "csv"
    PDF = "pdf"


class UpdateProfileInput(BaseToolInput):
    """Validation for update_profile tool"""

    username: Optional[str] = Field(None, min_length=3, max_length=30, description="Username")
    bio: Optional[str] = Field(None, max_length=500, description="Bio text")
    avatar_url: Optional[str] = Field(None, description="Avatar image URL")
    location: Optional[str] = Field(None, max_length=200, description="User location")
    rv_type: Optional[str] = Field(None, max_length=100, description="RV type")
    rv_year: Optional[int] = Field(None, ge=1900, le=2100, description="RV year")

    @validator("username")
    def validate_username(cls, v):
        """Validate username format"""
        if v:
            v = v.strip()
            if not v:
                raise ValueError("Username cannot be empty")
            # Alphanumeric and underscores only
            if not all(c.isalnum() or c == '_' for c in v):
                raise ValueError("Username can only contain letters, numbers, and underscores")
        return v

    @validator("bio")
    def validate_bio(cls, v):
        """Clean up bio"""
        if v:
            return v.strip()
        return v

    @validator("rv_year")
    def validate_rv_year(cls, v):
        """Ensure reasonable year"""
        if v:
            from datetime import datetime
            current_year = datetime.now().year
            if v > current_year + 1:
                raise ValueError(f"RV year cannot be in the future (max: {current_year + 1})")
        return v


class UpdateSettingsInput(BaseToolInput):
    """Validation for update_settings tool"""

    email_notifications: Optional[bool] = Field(None, description="Email notifications enabled")
    push_notifications: Optional[bool] = Field(None, description="Push notifications enabled")
    theme: Optional[ThemeOption] = Field(None, description="UI theme")
    language: Optional[str] = Field(None, min_length=2, max_length=5, description="Language code (e.g., 'en', 'es')")
    budget_alerts: Optional[bool] = Field(None, description="Budget alerts enabled")
    trip_reminders: Optional[bool] = Field(None, description="Trip reminders enabled")

    @validator("language")
    def validate_language(cls, v):
        """Validate language code format"""
        if v:
            v = v.lower().strip()
            # Basic language code format (ISO 639-1 or locale like en-US)
            if len(v) not in [2, 5]:
                raise ValueError("Language code must be 2 characters (e.g., 'en') or 5 (e.g., 'en-US')")
        return v


class ManagePrivacyInput(BaseToolInput):
    """Validation for manage_privacy tool"""

    profile_visibility: Optional[str] = Field(None, description="Profile visibility (public, friends, private)")
    location_sharing: Optional[bool] = Field(None, description="Share location with others")
    trip_sharing: Optional[bool] = Field(None, description="Share trip plans with community")
    financial_data_visibility: Optional[str] = Field(None, description="Financial data visibility (none, summary, detailed)")

    @validator("profile_visibility")
    def validate_profile_visibility(cls, v):
        """Validate visibility option"""
        if v:
            valid_options = ["public", "friends", "private"]
            v = v.lower()
            if v not in valid_options:
                raise ValueError(f"profile_visibility must be one of: {', '.join(valid_options)}")
        return v

    @validator("financial_data_visibility")
    def validate_financial_visibility(cls, v):
        """Validate financial visibility option"""
        if v:
            valid_options = ["none", "summary", "detailed"]
            v = v.lower()
            if v not in valid_options:
                raise ValueError(f"financial_data_visibility must be one of: {', '.join(valid_options)}")
        return v


class GetUserStatsInput(BaseToolInput):
    """Validation for get_user_stats tool"""

    period: Optional[str] = Field("all_time", description="Stats period (week, month, year, all_time)")

    @validator("period")
    def validate_period(cls, v):
        """Validate stats period"""
        valid_periods = ["week", "month", "year", "all_time"]
        v = v.lower()
        if v not in valid_periods:
            raise ValueError(f"period must be one of: {', '.join(valid_periods)}")
        return v


class ExportDataInput(BaseToolInput):
    """Validation for export_data tool (GDPR compliance)"""

    format: ExportFormat = Field(ExportFormat.JSON, description="Export format")
    include_expenses: bool = Field(True, description="Include expense data")
    include_trips: bool = Field(True, description="Include trip data")
    include_social: bool = Field(True, description="Include social data")
    include_messages: bool = Field(False, description="Include private messages")


class CreateVehicleInput(BaseToolInput):
    """Validation for create_vehicle tool"""

    name: str = Field(..., min_length=1, max_length=100, description="Vehicle nickname")
    make: Optional[str] = Field(None, max_length=50, description="Manufacturer")
    model: Optional[str] = Field(None, max_length=50, description="Model name")
    year: Optional[int] = Field(None, ge=1900, le=2100, description="Year of manufacture")
    vehicle_type: VehicleType = Field(VehicleType.RV, description="Type of vehicle")
    fuel_type: FuelType = Field(FuelType.GASOLINE, description="Type of fuel")
    set_as_primary: bool = Field(True, description="Make this the primary vehicle")

    @validator("name")
    def validate_name(cls, v):
        """Clean up vehicle name"""
        v = v.strip()
        if not v:
            raise ValueError("Vehicle name cannot be empty")
        return v

    @validator("year")
    def validate_year(cls, v):
        """Ensure reasonable year"""
        if v:
            from datetime import datetime
            current_year = datetime.now().year
            if v > current_year + 1:
                raise ValueError(f"Vehicle year cannot be in the future (max: {current_year + 1})")
            if v < 1900:
                raise ValueError("Vehicle year must be 1900 or later")
        return v
