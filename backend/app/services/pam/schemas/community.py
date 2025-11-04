"""Community Tool Validation Schemas

Pydantic schemas for PAM community tool input validation.

Created: January 15, 2025 (Amendment #4)
"""

from typing import Optional, List
from enum import Enum
from pydantic import BaseModel, validator, Field, UUID4

from .base import BaseToolInput


# Enums for community tools
class TipCategory(str, Enum):
    """Categories for community tips"""
    camping = "camping"
    gas_savings = "gas_savings"
    route_planning = "route_planning"
    maintenance = "maintenance"
    safety = "safety"
    cooking = "cooking"
    weather = "weather"
    attractions = "attractions"
    budget = "budget"
    general = "general"


class TipStatus(str, Enum):
    """Status values for tips"""
    active = "active"
    archived = "archived"
    flagged = "flagged"


# Community tool schemas
class SearchCommunityTipsInput(BaseToolInput):
    """Validation for search_community_tips tool

    Searches community tips with optional category filtering.
    """
    query: str = Field(..., min_length=1)
    category: Optional[TipCategory] = None
    limit: int = Field(default=5, ge=1, le=50)

    @validator('query')
    def strip_query(cls, v):
        """Strip whitespace from query"""
        return v.strip()


class LogTipUsageInput(BaseModel):
    """Validation for log_tip_usage tool

    Logs when a community tip is used to help another user.
    Note: Does not inherit BaseToolInput since it uses tip_id as primary identifier.
    """
    tip_id: str  # UUID validation handled by database
    contributor_id: str  # UUID validation handled by database
    beneficiary_id: str  # UUID validation handled by database
    conversation_id: Optional[str] = None  # UUID validation handled by database
    pam_response: Optional[str] = Field(None, max_length=2000)


class GetTipByIdInput(BaseModel):
    """Validation for get_tip_by_id tool

    Retrieves a specific community tip by ID.
    Note: Does not inherit BaseToolInput since it uses tip_id as primary identifier.
    """
    tip_id: str  # UUID validation handled by database


class SubmitCommunityTipInput(BaseToolInput):
    """Validation for submit_community_tip tool

    Enables users to share tips with the community.
    """
    title: str = Field(..., min_length=1, max_length=200)
    content: str = Field(..., min_length=1, max_length=2000)
    category: TipCategory
    location_name: Optional[str] = Field(None, max_length=200)
    location_lat: Optional[float] = Field(None, ge=-90, le=90)
    location_lng: Optional[float] = Field(None, ge=-180, le=180)
    tags: Optional[List[str]] = None

    @validator('title', 'content')
    def strip_whitespace(cls, v):
        """Strip leading/trailing whitespace"""
        return v.strip() if v else v

    @validator('tags')
    def validate_tags(cls, v):
        """Validate and clean tags"""
        if v is None:
            return v
        if len(v) > 10:
            raise ValueError('Maximum 10 tags allowed')
        return [tag.strip() for tag in v if tag.strip()]

    @validator('location_lng')
    def validate_location_coords(cls, v, values):
        """Ensure both lat and lng are provided together"""
        if v is not None and values.get('location_lat') is None:
            raise ValueError('location_lat required when location_lng is provided')
        if v is None and values.get('location_lat') is not None:
            raise ValueError('location_lng required when location_lat is provided')
        return v


class GetUserTipsInput(BaseToolInput):
    """Validation for get_user_tips tool

    Gets all tips submitted by a user.
    """
    limit: int = Field(default=20, ge=1, le=100)
    status: TipStatus = Field(default=TipStatus.active)


# Note: get_user_contribution_stats uses BaseToolInput (only needs user_id)
# Note: get_community_stats has no parameters and doesn't need a schema
