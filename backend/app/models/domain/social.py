
from pydantic import BaseModel, Field, validator
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum

class PostStatus(str, Enum):
    DRAFT = "draft"
    PUBLISHED = "published"
    ARCHIVED = "archived"
    FLAGGED = "flagged"
    DELETED = "deleted"

class PostType(str, Enum):
    TEXT = "text"
    IMAGE = "image"
    LOCATION = "location"
    TIP = "tip"
    QUESTION = "question"
    MARKETPLACE = "marketplace"

class GroupType(str, Enum):
    FACEBOOK = "facebook"
    LOCAL = "local"
    INTEREST = "interest"
    REGIONAL = "regional"

class ListingStatus(str, Enum):
    ACTIVE = "active"
    SOLD = "sold"
    EXPIRED = "expired"
    DRAFT = "draft"
    FLAGGED = "flagged"

class ListingCondition(str, Enum):
    NEW = "new"
    LIKE_NEW = "like_new"
    GOOD = "good"
    FAIR = "fair"
    POOR = "poor"

class ModerationStatus(str, Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    FLAGGED = "flagged"

class PostReaction(BaseModel):
    user_id: str
    reaction_type: str  # like, love, helpful, etc.
    created_at: datetime

class PostComment(BaseModel):
    id: str
    post_id: str
    user_id: str
    content: str
    parent_comment_id: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    is_deleted: bool = False
    reactions: List[PostReaction] = Field(default_factory=list)

class SocialPost(BaseModel):
    id: str
    user_id: str
    content: str
    post_type: PostType = PostType.TEXT
    status: PostStatus = PostStatus.PUBLISHED
    title: Optional[str] = None
    images: List[str] = Field(default_factory=list)
    location: Optional[Dict[str, Any]] = None
    tags: List[str] = Field(default_factory=list)
    category: Optional[str] = None
    reactions: List[PostReaction] = Field(default_factory=list)
    comments: List[PostComment] = Field(default_factory=list)
    view_count: int = 0
    share_count: int = 0
    created_at: datetime
    updated_at: datetime
    expires_at: Optional[datetime] = None
    
    @property
    def reaction_count(self) -> int:
        return len(self.reactions)
    
    @property
    def comment_count(self) -> int:
        return len([c for c in self.comments if not c.is_deleted])

class SocialGroup(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    group_type: GroupType
    location: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    member_count: int = 0
    activity_level: Optional[str] = None
    admin_contact: Optional[str] = None
    group_url: Optional[str] = None
    meetup_frequency: Optional[str] = None
    tags: List[str] = Field(default_factory=list)
    is_active: bool = True
    created_at: datetime
    updated_at: datetime

class GroupMembership(BaseModel):
    id: str
    user_id: str
    group_id: str
    role: str = "member"  # member, admin, moderator
    joined_at: datetime
    is_active: bool = True
    notification_preferences: Dict[str, bool] = Field(default_factory=dict)

class MarketplaceListing(BaseModel):
    id: str
    user_id: str
    title: str
    description: str
    category: str
    price: Optional[float] = None
    condition: ListingCondition = ListingCondition.GOOD
    status: ListingStatus = ListingStatus.ACTIVE
    location: Optional[str] = None
    images: List[str] = Field(default_factory=list)
    tags: List[str] = Field(default_factory=list)
    contact_method: str = "message"
    contact_info: Optional[str] = None
    view_count: int = 0
    favorite_count: int = 0
    created_at: datetime
    updated_at: datetime
    expires_at: Optional[datetime] = None
    is_negotiable: bool = True
    shipping_available: bool = False
    
    @validator('price')
    def price_must_be_positive(cls, v):
        if v is not None and v < 0:
            raise ValueError('Price must be positive')
        return v

class MessageThread(BaseModel):
    id: str
    listing_id: Optional[str] = None
    participants: List[str] = Field(min_items=2)
    subject: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    is_active: bool = True

class Message(BaseModel):
    id: str
    thread_id: str
    sender_id: str
    content: str
    message_type: str = "text"  # text, image, location
    attachments: List[str] = Field(default_factory=list)
    created_at: datetime
    is_read: bool = False
    is_deleted: bool = False

class UserInteraction(BaseModel):
    id: str
    user_id: str
    target_user_id: str
    interaction_type: str  # follow, block, favorite_seller
    created_at: datetime
    is_active: bool = True

class ContentModeration(BaseModel):
    id: str
    content_id: str
    content_type: str  # post, comment, listing, message
    reported_by: str
    reason: str
    status: ModerationStatus = ModerationStatus.PENDING
    moderator_id: Optional[str] = None
    moderator_notes: Optional[str] = None
    created_at: datetime
    resolved_at: Optional[datetime] = None

class SocialMetrics(BaseModel):
    user_id: str
    posts_count: int = 0
    comments_count: int = 0
    reactions_received: int = 0
    followers_count: int = 0
    following_count: int = 0
    listings_count: int = 0
    successful_sales: int = 0
    reputation_score: float = 0.0
    last_activity: Optional[datetime] = None
    updated_at: datetime
