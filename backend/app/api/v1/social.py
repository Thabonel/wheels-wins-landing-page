
from fastapi import APIRouter, Depends, HTTPException, Query, Path
from fastapi.responses import JSONResponse
from typing import Optional, List
import logging
from datetime import datetime, timedelta
import uuid

from ...core.security import verify_token
from ...models.schemas.social import (
    PostCreateRequest, PostUpdateRequest, PostSearchRequest, PostResponse,
    GroupCreateRequest, GroupUpdateRequest, GroupSearchRequest, GroupResponse,
    ListingCreateRequest, ListingUpdateRequest, ListingSearchRequest, ListingResponse,
    CommentCreateRequest, ReactionRequest, SocialFeedResponse
)
from ...models.schemas.common import PaginationParams, PaginatedResponse
from ...database.supabase_client import get_supabase_client

router = APIRouter(prefix="/social", tags=["Social"])
logger = logging.getLogger(__name__)

# Rate limiting helper
async def check_rate_limit(user_id: str, action: str = "default", limit: int = 10):
    """Check rate limit for user actions"""
    supabase = get_supabase_client()
    window_start = datetime.utcnow() - timedelta(minutes=1)
    
    try:
        result = supabase.rpc('check_rate_limit', {
            'user_id': user_id,
            'window_start': window_start.isoformat(),
            'limit_count': limit
        }).execute()
        
        if not result.data.get('allow', True):
            raise HTTPException(
                status_code=429,
                detail=f"Rate limit exceeded for {action}. Try again later."
            )
    except Exception as e:
        logger.warning(f"Rate limiting check failed: {e}")

# Social Feed Endpoints
@router.get("/posts", response_model=SocialFeedResponse)
async def get_social_feed(
    pagination: PaginationParams = Depends(),
    search: Optional[str] = Query(None, description="Search posts"),
    category: Optional[str] = Query(None, description="Filter by category"),
    group_id: Optional[str] = Query(None, description="Filter by group"),
    token_data: dict = Depends(verify_token)
):
    """Get social feed with posts"""
    try:
        user_id = token_data.get("sub")
        supabase = get_supabase_client()
        
        # Build query
        query = supabase.table("social_posts").select(
            """
            id, content, image_url, status, location, created_at, updated_at,
            upvotes, downvotes, author_id,
            profiles!social_posts_author_id_fkey(email, region)
            """
        )
        
        # Apply filters
        if search:
            query = query.ilike("content", f"%{search}%")
        if category:
            query = query.eq("category", category)
        if group_id:
            query = query.eq("group_id", group_id)
        
        # Only approved posts for feed
        query = query.eq("status", "approved")
        query = query.eq("location", "feed")
        
        # Pagination
        query = query.order("created_at", desc=True)
        query = query.range(pagination.offset, pagination.offset + pagination.limit - 1)
        
        result = query.execute()
        
        if result.data is None:
            raise HTTPException(status_code=500, detail="Failed to fetch posts")
        
        # Format posts
        posts = []
        for post in result.data:
            profile = post.get('profiles') or {}
            post_response = PostResponse(
                post={
                    "id": post["id"],
                    "content": post["content"],
                    "image_url": post.get("image_url"),
                    "status": post["status"],
                    "location": post["location"],
                    "upvotes": post.get("upvotes", 0),
                    "downvotes": post.get("downvotes", 0),
                    "created_at": post["created_at"],
                    "updated_at": post["updated_at"],
                    "author_id": post["author_id"]
                },
                author={
                    "id": post["author_id"],
                    "email": profile.get("email", "Unknown"),
                    "region": profile.get("region", "Unknown")
                }
            )
            posts.append(post_response)
        
        return SocialFeedResponse(
            posts=posts,
            has_more=len(result.data) == pagination.limit
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching social feed: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch social feed")

@router.post("/posts", response_model=dict)
async def create_post(
    request: PostCreateRequest,
    token_data: dict = Depends(verify_token)
):
    """Create a new social post"""
    try:
        user_id = token_data.get("sub")
        await check_rate_limit(user_id, "create_post", 5)
        
        supabase = get_supabase_client()
        
        # Create post
        post_data = {
            "author_id": user_id,
            "content": request.content,
            "post_type": request.post_type,
            "status": "approved",  # Auto-approve for now
            "location": "feed"
        }
        
        if request.title:
            post_data["title"] = request.title
        if request.images:
            post_data["image_url"] = request.images[0]  # Take first image
        if request.category:
            post_data["category"] = request.category
        if request.tags:
            post_data["tags"] = request.tags
        
        result = supabase.table("social_posts").insert(post_data).execute()
        
        if not result.data:
            raise HTTPException(status_code=500, detail="Failed to create post")
        
        logger.info(f"User {user_id} created post {result.data[0]['id']}")
        return {"message": "Post created successfully", "post_id": result.data[0]["id"]}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating post: {e}")
        raise HTTPException(status_code=500, detail="Failed to create post")

@router.put("/posts/{post_id}")
async def update_post(
    post_id: str = Path(..., description="Post ID"),
    request: PostUpdateRequest = None,
    token_data: dict = Depends(verify_token)
):
    """Update a social post"""
    try:
        user_id = token_data.get("sub")
        supabase = get_supabase_client()
        
        # Check if post exists and user owns it
        existing = supabase.table("social_posts").select("author_id").eq("id", post_id).execute()
        
        if not existing.data:
            raise HTTPException(status_code=404, detail="Post not found")
        
        if existing.data[0]["author_id"] != user_id:
            raise HTTPException(status_code=403, detail="Not authorized to update this post")
        
        # Update post
        update_data = {"updated_at": datetime.utcnow().isoformat()}
        
        if request.content:
            update_data["content"] = request.content
        if request.title:
            update_data["title"] = request.title
        if request.status:
            update_data["status"] = request.status
        if request.category:
            update_data["category"] = request.category
        if request.tags:
            update_data["tags"] = request.tags
        
        result = supabase.table("social_posts").update(update_data).eq("id", post_id).execute()
        
        if not result.data:
            raise HTTPException(status_code=500, detail="Failed to update post")
        
        logger.info(f"User {user_id} updated post {post_id}")
        return {"message": "Post updated successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating post: {e}")
        raise HTTPException(status_code=500, detail="Failed to update post")

@router.delete("/posts/{post_id}")
async def delete_post(
    post_id: str = Path(..., description="Post ID"),
    token_data: dict = Depends(verify_token)
):
    """Delete a social post"""
    try:
        user_id = token_data.get("sub")
        supabase = get_supabase_client()
        
        # Check if post exists and user owns it
        existing = supabase.table("social_posts").select("author_id").eq("id", post_id).execute()
        
        if not existing.data:
            raise HTTPException(status_code=404, detail="Post not found")
        
        if existing.data[0]["author_id"] != user_id:
            raise HTTPException(status_code=403, detail="Not authorized to delete this post")
        
        # Delete post
        result = supabase.table("social_posts").delete().eq("id", post_id).execute()
        
        logger.info(f"User {user_id} deleted post {post_id}")
        return {"message": "Post deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting post: {e}")
        raise HTTPException(status_code=500, detail="Failed to delete post")

@router.post("/posts/{post_id}/vote")
async def vote_on_post(
    post_id: str = Path(..., description="Post ID"),
    request: ReactionRequest = None,
    is_upvote: bool = Query(..., description="True for upvote, False for downvote"),
    token_data: dict = Depends(verify_token)
):
    """Vote on a post"""
    try:
        user_id = token_data.get("sub")
        await check_rate_limit(user_id, "vote", 20)
        
        supabase = get_supabase_client()
        
        # Check if post exists
        existing = supabase.table("social_posts").select("id").eq("id", post_id).execute()
        if not existing.data:
            raise HTTPException(status_code=404, detail="Post not found")
        
        # Check existing vote
        existing_vote = supabase.table("post_votes").select("vote_type").eq("post_id", post_id).eq("user_id", user_id).execute()
        
        if existing_vote.data:
            # Update existing vote
            if existing_vote.data[0]["vote_type"] == is_upvote:
                # Remove vote if same
                supabase.table("post_votes").delete().eq("post_id", post_id).eq("user_id", user_id).execute()
                action = "removed"
            else:
                # Change vote
                supabase.table("post_votes").update({"vote_type": is_upvote}).eq("post_id", post_id).eq("user_id", user_id).execute()
                action = "changed"
        else:
            # Create new vote
            supabase.table("post_votes").insert({
                "post_id": post_id,
                "user_id": user_id,
                "vote_type": is_upvote
            }).execute()
            action = "added"
        
        logger.info(f"User {user_id} {action} vote on post {post_id}")
        return {"message": f"Vote {action} successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error voting on post: {e}")
        raise HTTPException(status_code=500, detail="Failed to vote on post")

# Groups Endpoints
@router.get("/groups")
async def list_groups(
    pagination: PaginationParams = Depends(),
    search: Optional[str] = Query(None, description="Search groups"),
    group_type: Optional[str] = Query(None, description="Filter by type"),
    token_data: dict = Depends(verify_token)
):
    """List social groups"""
    try:
        supabase = get_supabase_client()
        
        # Build query
        query = supabase.table("social_groups").select(
            "id, name, description, group_type, location, member_count, activity_level, created_at"
        )
        
        # Apply filters
        if search:
            query = query.ilike("name", f"%{search}%")
        if group_type:
            query = query.eq("group_type", group_type)
        
        # Only active groups
        query = query.eq("is_active", True)
        
        # Pagination
        query = query.order("created_at", desc=True)
        query = query.range(pagination.offset, pagination.offset + pagination.limit - 1)
        
        result = query.execute()
        
        if result.data is None:
            raise HTTPException(status_code=500, detail="Failed to fetch groups")
        
        return {
            "groups": result.data,
            "has_more": len(result.data) == pagination.limit
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching groups: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch groups")

@router.post("/groups")
async def create_group(
    request: GroupCreateRequest,
    token_data: dict = Depends(verify_token)
):
    """Create a new social group"""
    try:
        user_id = token_data.get("sub")
        await check_rate_limit(user_id, "create_group", 2)
        
        supabase = get_supabase_client()
        
        # Create group
        group_data = {
            "name": request.name,
            "group_type": request.group_type,
            "admin_id": user_id,
            "member_count": 1,
            "is_active": True
        }
        
        if request.description:
            group_data["description"] = request.description
        if request.location:
            group_data["location"] = request.location
        if request.latitude:
            group_data["latitude"] = request.latitude
        if request.longitude:
            group_data["longitude"] = request.longitude
        if request.admin_contact:
            group_data["admin_contact"] = request.admin_contact
        if request.group_url:
            group_data["group_url"] = request.group_url
        if request.meetup_frequency:
            group_data["meetup_frequency"] = request.meetup_frequency
        if request.tags:
            group_data["tags"] = request.tags
        
        result = supabase.table("social_groups").insert(group_data).execute()
        
        if not result.data:
            raise HTTPException(status_code=500, detail="Failed to create group")
        
        group_id = result.data[0]["id"]
        
        # Add creator as member
        supabase.table("group_memberships").insert({
            "user_id": user_id,
            "group_id": group_id,
            "role": "admin",
            "is_active": True
        }).execute()
        
        logger.info(f"User {user_id} created group {group_id}")
        return {"message": "Group created successfully", "group_id": group_id}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating group: {e}")
        raise HTTPException(status_code=500, detail="Failed to create group")

@router.post("/groups/{group_id}/join")
async def join_group(
    group_id: str = Path(..., description="Group ID"),
    token_data: dict = Depends(verify_token)
):
    """Join a social group"""
    try:
        user_id = token_data.get("sub")
        supabase = get_supabase_client()
        
        # Check if group exists
        existing = supabase.table("social_groups").select("id, is_active").eq("id", group_id).execute()
        if not existing.data or not existing.data[0]["is_active"]:
            raise HTTPException(status_code=404, detail="Group not found or inactive")
        
        # Check if already a member
        membership = supabase.table("group_memberships").select("id").eq("group_id", group_id).eq("user_id", user_id).execute()
        if membership.data:
            raise HTTPException(status_code=400, detail="Already a member of this group")
        
        # Join group
        supabase.table("group_memberships").insert({
            "user_id": user_id,
            "group_id": group_id,
            "role": "member",
            "is_active": True
        }).execute()
        
        logger.info(f"User {user_id} joined group {group_id}")
        return {"message": "Successfully joined group"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error joining group: {e}")
        raise HTTPException(status_code=500, detail="Failed to join group")

# Marketplace Endpoints
@router.get("/marketplace")
async def get_marketplace_listings(
    pagination: PaginationParams = Depends(),
    search: Optional[str] = Query(None, description="Search listings"),
    category: Optional[str] = Query(None, description="Filter by category"),
    min_price: Optional[float] = Query(None, description="Minimum price"),
    max_price: Optional[float] = Query(None, description="Maximum price"),
    condition: Optional[str] = Query(None, description="Filter by condition"),
    token_data: dict = Depends(verify_token)
):
    """Get marketplace listings"""
    try:
        supabase = get_supabase_client()
        
        # Build query
        query = supabase.table("marketplace_listings").select(
            """
            id, title, description, price, condition, category, location, 
            image, photos, created_at, updated_at, user_id,
            profiles!marketplace_listings_user_id_fkey(email, region)
            """
        )
        
        # Apply filters
        if search:
            query = query.or_(f"title.ilike.%{search}%,description.ilike.%{search}%")
        if category:
            query = query.eq("category", category)
        if condition:
            query = query.eq("condition", condition)
        if min_price is not None:
            query = query.gte("price", min_price)
        if max_price is not None:
            query = query.lte("price", max_price)
        
        # Only approved listings
        query = query.eq("status", "approved")
        
        # Pagination
        query = query.order("created_at", desc=True)
        query = query.range(pagination.offset, pagination.offset + pagination.limit - 1)
        
        result = query.execute()
        
        if result.data is None:
            raise HTTPException(status_code=500, detail="Failed to fetch listings")
        
        # Format listings
        listings = []
        for listing in result.data:
            profile = listing.get('profiles') or {}
            listings.append({
                "id": listing["id"],
                "title": listing["title"],
                "description": listing["description"],
                "price": listing["price"],
                "condition": listing["condition"],
                "category": listing["category"],
                "location": listing["location"],
                "image": listing.get("image"),
                "photos": listing.get("photos", []),
                "created_at": listing["created_at"],
                "seller": {
                    "id": listing["user_id"],
                    "email": profile.get("email", "Unknown"),
                    "region": profile.get("region", "Unknown")
                }
            })
        
        return {
            "listings": listings,
            "has_more": len(result.data) == pagination.limit
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching marketplace listings: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch listings")

@router.post("/marketplace")
async def create_marketplace_listing(
    request: ListingCreateRequest,
    token_data: dict = Depends(verify_token)
):
    """Create a new marketplace listing"""
    try:
        user_id = token_data.get("sub")
        await check_rate_limit(user_id, "create_listing", 5)
        
        supabase = get_supabase_client()
        
        # Create listing
        listing_data = {
            "user_id": user_id,
            "title": request.title,
            "description": request.description,
            "category": request.category,
            "condition": request.condition,
            "contact_method": request.contact_method,
            "is_negotiable": request.is_negotiable,
            "shipping_available": request.shipping_available,
            "status": "approved"  # Auto-approve for now
        }
        
        if request.price:
            listing_data["price"] = request.price
        if request.location:
            listing_data["location"] = request.location
        if request.images:
            listing_data["image"] = request.images[0]  # First image
            listing_data["photos"] = request.images
        if request.tags:
            listing_data["tags"] = request.tags
        if request.contact_info:
            listing_data["contact_info"] = request.contact_info
        if request.expires_at:
            listing_data["expires_at"] = request.expires_at.isoformat()
        
        result = supabase.table("marketplace_listings").insert(listing_data).execute()
        
        if not result.data:
            raise HTTPException(status_code=500, detail="Failed to create listing")
        
        logger.info(f"User {user_id} created listing {result.data[0]['id']}")
        return {"message": "Listing created successfully", "listing_id": result.data[0]["id"]}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating listing: {e}")
        raise HTTPException(status_code=500, detail="Failed to create listing")
