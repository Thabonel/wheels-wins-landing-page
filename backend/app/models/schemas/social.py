
from pydantic import BaseModel, Field, validator
from typing import Optional, List, Dict, Any
from datetime import datetime
from ..domain.social import (
    SocialPost, SocialGroup, MarketplaceListing, Message, MessageThread,
    PostType, PostStatus, GroupType, ListingStatus, ListingCondition, ModerationStatus
)

class PostCreateRequest(BaseModel):
    content: str = Field(..., min_length=1, max_length=2000)
    post_type: PostType = PostType.TEXT
    title: Optional[str] = Field(None, min_length=1, max_length=100)
    images: List[str] = Field(default_factory=list)
    location: Optional[Dict[str, Any]] = None
    tags: List[str] = Field(default_factory=list)
    category: Optional[str] = Field(None, max_length=50)
    expires_at: Optional[datetime] = None

class PostUpdateRequest(BaseModel):
    content: Optional[str] = Field(None, min_length=1, max_length=2000)
    title: Optional[str] = Field(None, min_length=1, max_length=100)
    status: Optional[PostStatus] = None
    tags: Optional[List[str]] = None
    category: Optional[str] = Field(None, max_length=50)

class PostSearchRequest(BaseModel):
    query: Optional[str] = None
    post_type: Optional[PostType] = None
    category: Optional[str] = None
    tags: Optional[List[str]] = None
    location_radius_km: Optional[int] = Field(None, ge=1, le=500)
    latitude: Optional[float] = Field(None, ge=-90, le=90)
    longitude: Optional[float] = Field(None, ge=-180, le=180)
    sort_by: str = Field("created_at", pattern="^(created_at|reactions|comments|views)$")
    sort_order: str = Field("desc", pattern="^(asc|desc)$")

class CommentCreateRequest(BaseModel):
    content: str = Field(..., min_length=1, max_length=1000)
    parent_comment_id: Optional[str] = None

class CommentUpdateRequest(BaseModel):
    content: str = Field(..., min_length=1, max_length=1000)

class ReactionRequest(BaseModel):
    reaction_type: str = Field(..., min_length=1, max_length=20)

class GroupCreateRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=1000)
    group_type: GroupType
    location: Optional[str] = Field(None, max_length=100)
    latitude: Optional[float] = Field(None, ge=-90, le=90)
    longitude: Optional[float] = Field(None, ge=-180, le=180)
    admin_contact: Optional[str] = Field(None, max_length=100)
    group_url: Optional[str] = None
    meetup_frequency: Optional[str] = Field(None, max_length=50)
    tags: List[str] = Field(default_factory=list)

class GroupUpdateRequest(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=1000)
    location: Optional[str] = Field(None, max_length=100)
    admin_contact: Optional[str] = Field(None, max_length=100)
    group_url: Optional[str] = None
    meetup_frequency: Optional[str] = Field(None, max_length=50)
    tags: Optional[List[str]] = None
    is_active: Optional[bool] = None

class GroupSearchRequest(BaseModel):
    query: Optional[str] = None
    group_type: Optional[GroupType] = None
    location: Optional[str] = None
    latitude: Optional[float] = Field(None, ge=-90, le=90)
    longitude: Optional[float] = Field(None, ge=-180, le=180)
    radius_km: int = Field(50, ge=1, le=500)
    tags: Optional[List[str]] = None
    min_members: Optional[int] = Field(None, ge=1)

class ListingCreateRequest(BaseModel):
    title: str = Field(..., min_length=1, max_length=100)
    description: str = Field(..., min_length=1, max_length=2000)
    category: str = Field(..., min_length=1, max_length=50)
    price: Optional[float] = Field(None, gt=0)
    condition: ListingCondition = ListingCondition.GOOD
    location: Optional[str] = Field(None, max_length=100)
    images: List[str] = Field(default_factory=list)
    tags: List[str] = Field(default_factory=list)
    contact_method: str = Field("message", pattern="^(message|phone|email)$")
    contact_info: Optional[str] = Field(None, max_length=100)
    is_negotiable: bool = True
    shipping_available: bool = False
    expires_at: Optional[datetime] = None

class ListingUpdateRequest(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = Field(None, min_length=1, max_length=2000)
    price: Optional[float] = Field(None, gt=0)
    condition: Optional[ListingCondition] = None
    status: Optional[ListingStatus] = None
    contact_method: Optional[str] = Field(None, pattern="^(message|phone|email)$")
    contact_info: Optional[str] = Field(None, max_length=100)
    is_negotiable: Optional[bool] = None
    shipping_available: Optional[bool] = None

class ListingSearchRequest(BaseModel):
    query: Optional[str] = None
    category: Optional[str] = None
    min_price: Optional[float] = Field(None, ge=0)
    max_price: Optional[float] = Field(None, ge=0)
    condition: Optional[ListingCondition] = None
    location: Optional[str] = None
    latitude: Optional[float] = Field(None, ge=-90, le=90)
    longitude: Optional[float] = Field(None, ge=-180, le=180)
    radius_km: int = Field(50, ge=1, le=500)
    tags: Optional[List[str]] = None
    shipping_available: Optional[bool] = None
    sort_by: str = Field("created_at", pattern="^(created_at|price|title|views)$")
    sort_order: str = Field("desc", pattern="^(asc|desc)$")

class MessageCreateRequest(BaseModel):
    content: str = Field(..., min_length=1, max_length=2000)
    message_type: str = Field("text", pattern="^(text|image|location)$")
    attachments: List[str] = Field(default_factory=list)

class MessageThreadCreateRequest(BaseModel):
    participant_id: str
    listing_id: Optional[str] = None
    subject: Optional[str] = Field(None, max_length=100)
    initial_message: str = Field(..., min_length=1, max_length=2000)

class ModerationReportRequest(BaseModel):
    content_id: str
    content_type: str = Field(..., pattern="^(post|comment|listing|message)$")
    reason: str = Field(..., min_length=1, max_length=200)

class PostResponse(BaseModel):
    post: SocialPost
    author: Dict[str, Any]
    is_liked: bool = False
    is_bookmarked: bool = False
    user_reaction: Optional[str] = None

class GroupResponse(BaseModel):
    group: SocialGroup
    is_member: bool = False
    member_role: Optional[str] = None
    recent_activity: List[Dict[str, Any]] = Field(default_factory=list)

class ListingResponse(BaseModel):
    listing: MarketplaceListing
    seller: Dict[str, Any]
    is_favorited: bool = False
    related_listings: List[MarketplaceListing] = Field(default_factory=list)

class MessageThreadResponse(BaseModel):
    thread: MessageThread
    messages: List[Message]
    participants: List[Dict[str, Any]]
    unread_count: int = 0

class SocialFeedResponse(BaseModel):
    posts: List[PostResponse]
    has_more: bool
    next_cursor: Optional[str] = None
    trending_tags: List[str] = Field(default_factory=list)

class NotificationResponse(BaseModel):
    id: str
    type: str
    title: str
    message: str
    data: Dict[str, Any]
    is_read: bool
    created_at: datetime
