"""
Pydantic validation schemas for Social tools

Amendment #4: Input validation for all 10 social tools
"""

from pydantic import Field, validator, HttpUrl
from typing import Optional, List
from enum import Enum

from app.services.pam.schemas.base import BaseToolInput


class CreatePostInput(BaseToolInput):
    """Validation for create_post tool"""

    content: str = Field(..., min_length=1, max_length=5000, description="Post content (required)")
    title: Optional[str] = Field(None, max_length=200, description="Post title")
    location: Optional[str] = Field(None, max_length=200, description="Location tag")
    image_url: Optional[str] = Field(None, description="Image URL")
    tags: Optional[List[str]] = Field(None, description="Post tags")

    @validator("content")
    def validate_content(cls, v):
        """Ensure non-empty content"""
        v = v.strip()
        if not v:
            raise ValueError("Post content cannot be empty")
        return v

    @validator("title")
    def validate_title(cls, v):
        """Clean up title"""
        if v:
            return v.strip()
        return v

    @validator("tags")
    def validate_tags(cls, v):
        """Validate tags list"""
        if v:
            if len(v) > 20:
                raise ValueError("Maximum 20 tags allowed")
            # Clean up tags
            return [tag.strip().lower() for tag in v if tag.strip()]
        return v


class MessageFriendInput(BaseToolInput):
    """Validation for message_friend tool"""

    recipient_id: str = Field(..., description="Recipient user UUID")
    message: str = Field(..., min_length=1, max_length=2000, description="Message content")

    @validator("recipient_id")
    def validate_recipient(cls, v):
        """Ensure valid UUID"""
        import uuid
        try:
            uuid.UUID(v)
            return v
        except (ValueError, AttributeError):
            raise ValueError("recipient_id must be a valid UUID")

    @validator("message")
    def validate_message(cls, v):
        """Ensure non-empty message"""
        v = v.strip()
        if not v:
            raise ValueError("Message cannot be empty")
        return v


class FindNearbyRVersInput(BaseToolInput):
    """Validation for find_nearby_rvers tool"""

    latitude: float = Field(..., ge=-90, le=90, description="Search center latitude")
    longitude: float = Field(..., ge=-180, le=180, description="Search center longitude")
    radius_miles: int = Field(50, gt=0, le=500, description="Search radius in miles (default: 50, max: 500)")
    limit: int = Field(20, gt=0, le=100, description="Maximum results (default: 20, max: 100)")


class SearchPostsInput(BaseToolInput):
    """Validation for search_posts tool"""

    query: str = Field(..., min_length=1, max_length=200, description="Search query")
    tags: Optional[List[str]] = Field(None, description="Filter by tags")
    location: Optional[str] = Field(None, max_length=200, description="Filter by location")
    limit: int = Field(20, gt=0, le=100, description="Maximum results (default: 20, max: 100)")

    @validator("query")
    def validate_query(cls, v):
        """Clean up query"""
        v = v.strip()
        if not v:
            raise ValueError("Search query cannot be empty")
        return v

    @validator("tags")
    def validate_tags(cls, v):
        """Clean up tags"""
        if v:
            return [tag.strip().lower() for tag in v if tag.strip()]
        return v


class GetFeedInput(BaseToolInput):
    """Validation for get_feed tool"""

    limit: int = Field(20, gt=0, le=100, description="Maximum posts (default: 20, max: 100)")
    offset: int = Field(0, ge=0, description="Pagination offset (default: 0)")
    filter_type: Optional[str] = Field(None, description="Feed filter (friends, following, all)")

    @validator("filter_type")
    def validate_filter(cls, v):
        """Validate filter type"""
        if v:
            valid_filters = ["friends", "following", "all", "popular", "recent"]
            v = v.lower()
            if v not in valid_filters:
                raise ValueError(f"filter_type must be one of: {', '.join(valid_filters)}")
        return v


class CommentOnPostInput(BaseToolInput):
    """Validation for comment_on_post tool"""

    post_id: str = Field(..., description="Post UUID to comment on")
    comment: str = Field(..., min_length=1, max_length=1000, description="Comment text")

    @validator("post_id")
    def validate_post_id(cls, v):
        """Ensure valid UUID"""
        import uuid
        try:
            uuid.UUID(v)
            return v
        except (ValueError, AttributeError):
            raise ValueError("post_id must be a valid UUID")

    @validator("comment")
    def validate_comment(cls, v):
        """Ensure non-empty comment"""
        v = v.strip()
        if not v:
            raise ValueError("Comment cannot be empty")
        return v


class LikePostInput(BaseToolInput):
    """Validation for like_post tool"""

    post_id: str = Field(..., description="Post UUID to like")

    @validator("post_id")
    def validate_post_id(cls, v):
        """Ensure valid UUID"""
        import uuid
        try:
            uuid.UUID(v)
            return v
        except (ValueError, AttributeError):
            raise ValueError("post_id must be a valid UUID")


class FollowUserInput(BaseToolInput):
    """Validation for follow_user tool"""

    target_user_id: str = Field(..., description="User UUID to follow")

    @validator("target_user_id")
    def validate_target_user(cls, v):
        """Ensure valid UUID"""
        import uuid
        try:
            uuid.UUID(v)
            return v
        except (ValueError, AttributeError):
            raise ValueError("target_user_id must be a valid UUID")


class ShareLocationInput(BaseToolInput):
    """Validation for share_location tool"""

    latitude: float = Field(..., ge=-90, le=90, description="Current latitude")
    longitude: float = Field(..., ge=-180, le=180, description="Current longitude")
    location_name: Optional[str] = Field(None, max_length=200, description="Location name")
    share_duration_hours: int = Field(24, gt=0, le=168, description="How long to share (hours, max 1 week)")
    share_with: str = Field("friends", description="Share with (friends, followers, public)")

    @validator("share_with")
    def validate_share_with(cls, v):
        """Validate sharing visibility"""
        valid_options = ["friends", "followers", "public"]
        v = v.lower()
        if v not in valid_options:
            raise ValueError(f"share_with must be one of: {', '.join(valid_options)}")
        return v


class CreateEventInput(BaseToolInput):
    """Validation for create_event tool"""

    title: str = Field(..., min_length=1, max_length=200, description="Event title")
    description: Optional[str] = Field(None, max_length=2000, description="Event description")
    event_date: str = Field(..., description="Event date (ISO format)")
    location: str = Field(..., min_length=1, max_length=200, description="Event location")
    latitude: Optional[float] = Field(None, ge=-90, le=90, description="Event latitude")
    longitude: Optional[float] = Field(None, ge=-180, le=180, description="Event longitude")
    max_attendees: Optional[int] = Field(None, gt=0, le=1000, description="Maximum attendees")
    is_public: bool = Field(True, description="Public event or private (default: public)")

    @validator("title")
    def validate_title(cls, v):
        """Clean up title"""
        v = v.strip()
        if not v:
            raise ValueError("Event title cannot be empty")
        return v

    @validator("event_date")
    def validate_event_date(cls, v):
        """Validate date format"""
        from datetime import datetime
        try:
            # Try parsing as ISO format
            datetime.fromisoformat(v.replace('Z', '+00:00'))
            return v
        except (ValueError, AttributeError):
            raise ValueError("event_date must be in ISO format (e.g., '2025-01-15T10:00:00')")

    @validator("location")
    def validate_location(cls, v):
        """Clean up location"""
        v = v.strip()
        if not v:
            raise ValueError("Event location cannot be empty")
        return v
