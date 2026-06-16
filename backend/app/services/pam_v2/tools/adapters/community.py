"""
Pam V2 community adapter: social posts, feed, messaging, and events.
"""

from __future__ import annotations

from typing import List, Optional

from pydantic import BaseModel, Field

from app.services.pam.tools.social.create_event import create_event as v1_create_event
from app.services.pam.tools.social.create_post import create_post as v1_create_post
from app.services.pam.tools.social.follow_user import follow_user as v1_follow_user
from app.services.pam.tools.social.get_feed import get_feed as v1_get_feed
from app.services.pam.tools.social.like_post import like_post as v1_like_post
from app.services.pam.tools.social.message_friend import message_friend as v1_message_friend
from app.services.pam.tools.social.search_posts import search_posts as v1_search_posts

from ..catalog import catalog
from ..handlers import register_handler
from ..namespaces import COMMUNITY
from ..types import (
    ApprovalPolicy,
    ToolContext,
    ToolEffect,
    ToolResult,
    ToolRisk,
    ToolScope,
    ToolSpec,
)


# ---- get_feed (READ) ----

class GetFeedInput(BaseModel):
    limit: int = Field(default=20, ge=1, le=100)


class GetFeedOutput(BaseModel):
    posts: list
    count: int


get_feed_tool = ToolSpec(
    name="get_feed",
    description="Get the social feed from followed users.",
    namespace=COMMUNITY.name,
    input_schema=GetFeedInput,
    output_schema=GetFeedOutput,
    effect=ToolEffect.READ,
    risk=ToolRisk.LOW,
    scope=ToolScope.OWN,
    approval_policy=ApprovalPolicy.NONE,
    idempotent=True,
)


@register_handler(get_feed_tool.name)
async def handle_get_feed(context: ToolContext, input: GetFeedInput) -> ToolResult:
    try:
        result = await v1_get_feed(user_id=context.user_id, limit=input.limit)
        if not result.get("success"):
            return ToolResult(success=False, error_code="feed_failed", error_message=result.get("message"))
        posts = result.get("posts", [])
        return ToolResult(
            success=True,
            data={"posts": posts, "count": len(posts)},
            summary=f"{len(posts)} posts in feed",
        )
    except Exception as exc:
        return ToolResult(success=False, error_code="feed_error", error_message=str(exc))


catalog.register(get_feed_tool)


# ---- create_post (WRITE) ----

class CreatePostInput(BaseModel):
    content: str = Field(..., min_length=1, max_length=2000)
    tags: Optional[List[str]] = Field(default=None)
    location: Optional[str] = Field(default=None, max_length=200)


class CreatePostOutput(BaseModel):
    post: dict


create_post_tool = ToolSpec(
    name="create_post",
    description="Create a social post to share with the community.",
    namespace=COMMUNITY.name,
    input_schema=CreatePostInput,
    output_schema=CreatePostOutput,
    effect=ToolEffect.WRITE,
    risk=ToolRisk.LOW,
    scope=ToolScope.OWN,
    approval_policy=ApprovalPolicy.NONE,
    idempotent=True,
)


@register_handler(create_post_tool.name)
async def handle_create_post(context: ToolContext, input: CreatePostInput) -> ToolResult:
    try:
        result = await v1_create_post(
            user_id=context.user_id, content=input.content,
            tags=input.tags, location=input.location,
        )
        if not result.get("success"):
            return ToolResult(success=False, error_code="post_failed", error_message=result.get("message"))
        return ToolResult(
            success=True,
            data={"post": result.get("post", {})},
            summary="Post created",
        )
    except Exception as exc:
        return ToolResult(success=False, error_code="post_error", error_message=str(exc))


catalog.register(create_post_tool)


# ---- like_post (WRITE) ----

class LikePostInput(BaseModel):
    post_id: str = Field(..., min_length=1)
    unlike: bool = False


class LikePostOutput(BaseModel):
    liked: bool


like_post_tool = ToolSpec(
    name="like_post",
    description="Like or unlike a community post.",
    namespace=COMMUNITY.name,
    input_schema=LikePostInput,
    output_schema=LikePostOutput,
    effect=ToolEffect.WRITE,
    risk=ToolRisk.LOW,
    scope=ToolScope.OWN,
    approval_policy=ApprovalPolicy.NONE,
    idempotent=True,
)


@register_handler(like_post_tool.name)
async def handle_like_post(context: ToolContext, input: LikePostInput) -> ToolResult:
    try:
        result = await v1_like_post(user_id=context.user_id, post_id=input.post_id, unlike=input.unlike)
        if not result.get("success"):
            return ToolResult(success=False, error_code="like_failed", error_message=result.get("message"))
        return ToolResult(
            success=True,
            data={"liked": not input.unlike},
            summary="Liked post" if not input.unlike else "Unliked post",
        )
    except Exception as exc:
        return ToolResult(success=False, error_code="like_error", error_message=str(exc))


catalog.register(like_post_tool)


# ---- send_message (WRITE) ----

class SendMessageInput(BaseModel):
    recipient_id: str = Field(..., min_length=1)
    content: str = Field(..., min_length=1, max_length=2000)


class SendMessageOutput(BaseModel):
    message: dict


send_message_tool = ToolSpec(
    name="send_message",
    description="Send a direct message to another user.",
    namespace=COMMUNITY.name,
    input_schema=SendMessageInput,
    output_schema=SendMessageOutput,
    effect=ToolEffect.WRITE,
    risk=ToolRisk.LOW,
    scope=ToolScope.OWN,
    approval_policy=ApprovalPolicy.NONE,
    idempotent=True,
)


@register_handler(send_message_tool.name)
async def handle_send_message(context: ToolContext, input: SendMessageInput) -> ToolResult:
    try:
        result = await v1_message_friend(
            user_id=context.user_id, friend_id=input.recipient_id, message=input.content,
        )
        if not result.get("success"):
            return ToolResult(success=False, error_code="message_failed", error_message=result.get("message"))
        return ToolResult(
            success=True,
            data={"message": result.get("message", {})},
            summary="Message sent",
        )
    except Exception as exc:
        return ToolResult(success=False, error_code="message_error", error_message=str(exc))


catalog.register(send_message_tool)


# ---- follow_user (WRITE) ----

class FollowUserInput(BaseModel):
    target_user_id: str = Field(..., min_length=1)
    unfollow: bool = False


class FollowUserOutput(BaseModel):
    following: bool


follow_user_tool = ToolSpec(
    name="follow_user",
    description="Follow or unfollow another user.",
    namespace=COMMUNITY.name,
    input_schema=FollowUserInput,
    output_schema=FollowUserOutput,
    effect=ToolEffect.WRITE,
    risk=ToolRisk.LOW,
    scope=ToolScope.OWN,
    approval_policy=ApprovalPolicy.NONE,
    idempotent=True,
)


@register_handler(follow_user_tool.name)
async def handle_follow_user(context: ToolContext, input: FollowUserInput) -> ToolResult:
    try:
        result = await v1_follow_user(
            user_id=context.user_id, target_user_id=input.target_user_id, unfollow=input.unfollow,
        )
        if not result.get("success"):
            return ToolResult(success=False, error_code="follow_failed", error_message=result.get("message"))
        return ToolResult(
            success=True,
            data={"following": not input.unfollow},
            summary="Followed user" if not input.unfollow else "Unfollowed user",
        )
    except Exception as exc:
        return ToolResult(success=False, error_code="follow_error", error_message=str(exc))


catalog.register(follow_user_tool)


# ---- search_posts (READ) ----

class SearchPostsInput(BaseModel):
    query: str = Field(..., min_length=1, max_length=500)
    limit: int = Field(default=20, ge=1, le=100)


class SearchPostsOutput(BaseModel):
    posts: list
    count: int


search_posts_tool = ToolSpec(
    name="search_posts",
    description="Search community posts by content, tags, or location.",
    namespace=COMMUNITY.name,
    input_schema=SearchPostsInput,
    output_schema=SearchPostsOutput,
    effect=ToolEffect.READ,
    risk=ToolRisk.LOW,
    scope=ToolScope.PUBLIC,
    approval_policy=ApprovalPolicy.NONE,
    idempotent=True,
)


@register_handler(search_posts_tool.name)
async def handle_search_posts(context: ToolContext, input: SearchPostsInput) -> ToolResult:
    try:
        result = await v1_search_posts(user_id=context.user_id, query=input.query, limit=input.limit)
        if not result.get("success"):
            return ToolResult(success=False, error_code="search_failed", error_message=result.get("message"))
        posts = result.get("posts", [])
        return ToolResult(
            success=True,
            data={"posts": posts, "count": len(posts)},
            summary=f"Found {len(posts)} posts",
        )
    except Exception as exc:
        return ToolResult(success=False, error_code="search_error", error_message=str(exc))


catalog.register(search_posts_tool)


# ---- create_community_event (WRITE) ----

class CreateCommunityEventInput(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = Field(default=None, max_length=2000)
    location: Optional[str] = Field(default=None, max_length=200)
    date: Optional[str] = Field(default=None, description="ISO date")


class CreateCommunityEventOutput(BaseModel):
    event: dict


create_community_event_tool = ToolSpec(
    name="create_community_event",
    description="Create a community event or meetup.",
    namespace=COMMUNITY.name,
    input_schema=CreateCommunityEventInput,
    output_schema=CreateCommunityEventOutput,
    effect=ToolEffect.WRITE,
    risk=ToolRisk.LOW,
    scope=ToolScope.OWN,
    approval_policy=ApprovalPolicy.NONE,
    idempotent=True,
)


@register_handler(create_community_event_tool.name)
async def handle_create_community_event(context: ToolContext, input: CreateCommunityEventInput) -> ToolResult:
    try:
        result = await v1_create_event(
            user_id=context.user_id, title=input.title,
            description=input.description, location=input.location, date=input.date,
        )
        if not result.get("success"):
            return ToolResult(success=False, error_code="event_failed", error_message=result.get("message"))
        return ToolResult(
            success=True,
            data={"event": result.get("event", {})},
            summary=f"Event created: {input.title}",
        )
    except Exception as exc:
        return ToolResult(success=False, error_code="event_error", error_message=str(exc))


catalog.register(create_community_event_tool)
