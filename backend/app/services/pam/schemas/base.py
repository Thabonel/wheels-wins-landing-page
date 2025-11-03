"""
Base Pydantic models for PAM tool inputs

Amendment #4: Input validation framework
"""

from pydantic import BaseModel, Field, validator
from typing import Optional
from datetime import datetime
import uuid


class BaseToolInput(BaseModel):
    """Base model for all PAM tool inputs"""

    user_id: str = Field(..., description="User UUID")

    @validator("user_id")
    def validate_user_id(cls, v):
        """Ensure user_id is a valid UUID"""
        try:
            uuid.UUID(v)
            return v
        except (ValueError, AttributeError):
            raise ValueError("user_id must be a valid UUID")

    class Config:
        # Allow extra fields (for **kwargs)
        extra = "allow"
        # Use enum values instead of names
        use_enum_values = True


class AmountInput(BaseModel):
    """Validation for monetary amounts"""

    amount: float = Field(..., gt=0, description="Amount must be positive")

    @validator("amount")
    def validate_amount(cls, v):
        """Ensure reasonable amount (< $1M)"""
        if v > 1_000_000:
            raise ValueError("Amount must be less than $1,000,000")
        # Round to 2 decimal places
        return round(v, 2)


class DateInput(BaseModel):
    """Validation for date inputs"""

    date: Optional[str] = Field(None, description="ISO format date string")

    @validator("date")
    def validate_date(cls, v):
        """Ensure valid ISO date format"""
        if v is None:
            return None
        try:
            # Try parsing as ISO format
            datetime.fromisoformat(v.replace('Z', '+00:00'))
            return v
        except (ValueError, AttributeError):
            raise ValueError("date must be in ISO format (e.g., '2025-01-15' or '2025-01-15T10:30:00')")


class LocationInput(BaseModel):
    """Validation for location inputs"""

    location: str = Field(..., min_length=1, max_length=500, description="Location name or coordinates")

    @validator("location")
    def validate_location(cls, v):
        """Basic location validation"""
        # Remove extra whitespace
        v = v.strip()
        if not v:
            raise ValueError("location cannot be empty")
        return v


class CoordinatesInput(BaseModel):
    """Validation for latitude/longitude"""

    latitude: float = Field(..., ge=-90, le=90, description="Latitude (-90 to 90)")
    longitude: float = Field(..., ge=-180, le=180, description="Longitude (-180 to 180)")
