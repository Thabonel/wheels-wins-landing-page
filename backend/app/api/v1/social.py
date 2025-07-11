
"""
SOCIAL API Endpoints
Community, groups, and social networking endpoints.
"""

from fastapi import APIRouter, Depends, HTTPException
from typing import List, Optional, Dict, Any
from datetime import datetime, date

from app.models.schemas.social import (
    PostCreateRequest, GroupCreateRequest, ListingCreateRequest,
    PostResponse, GroupResponse, SocialFeedResponse
)
from app.services.database import get_database_service
from app.core.logging import setup_logging, get_logger

router = APIRouter()
setup_logging()
logger = get_logger(__name__)

@router.get("/groups")
async def search_groups(
    location: Optional[str] = None,
    group_type: Optional[str] = None,
    limit: int = 20
):
    """Search for RV groups and communities"""
    try:
        db_service = get_database_service()
        
        where_conditions = []
        params = []
        param_count = 0
        
        if location:
            param_count += 1
            where_conditions.append(f"location ILIKE ${param_count}")
            params.append(f"%{location}%")
        
        if group_type:
            param_count += 1
            where_conditions.append(f"group_type = ${param_count}")
            params.append(group_type)
        
        where_clause = "WHERE " + " AND ".join(where_conditions) if where_conditions else ""
        
        query = f"""
            SELECT group_name, group_type, location, member_count, description,
                   activity_level, admin_contact, group_url
            FROM facebook_groups 
            {where_clause}
            ORDER BY member_count DESC NULLS LAST
            LIMIT {limit}
        """
        
        groups = await db_service.execute_query(query, *params)
        
        return {
            "groups": [
                GroupResponse(
                    id=f"group_{i}",
                    name=group['group_name'],
                    group_type=group['group_type'],
                    location=group['location'],
                    member_count=group['member_count'] or 0,
                    description=group['description'],
                    activity_level=group['activity_level'],
                    admin_contact=group['admin_contact'],
                    group_url=group['group_url'],
                    created_at=datetime.utcnow()
                )
                for i, group in enumerate(groups)
            ],
            "total_groups": len(groups),
            "filters": {
                "location": location,
                "group_type": group_type
            }
        }
        
    except Exception as e:
        logger.error(f"Group search error: {e}")
        raise HTTPException(status_code=500, detail="Could not search groups")

@router.get("/events")
async def search_events(
    location: Optional[str] = None,
    event_type: Optional[str] = None,
    start_date: Optional[date] = None,
    limit: int = 20
):
    """Search for local RV events and meetups"""
    try:
        db_service = get_database_service()
        
        where_conditions = ["start_date >= CURRENT_DATE"]
        params = []
        param_count = 0
        
        if location:
            param_count += 1
            where_conditions.append(f"(address ILIKE ${param_count} OR venue_name ILIKE ${param_count})")
            params.append(f"%{location}%")
        
        if event_type:
            param_count += 1
            where_conditions.append(f"event_type = ${param_count}")
            params.append(event_type)
        
        if start_date:
            param_count += 1
            where_conditions.append(f"start_date >= ${param_count}")
            params.append(start_date)
        
        query = f"""
            SELECT event_name, event_type, start_date, end_date, venue_name, address,
                   description, is_free, ticket_price, registration_required, registration_link
            FROM local_events 
            WHERE {' AND '.join(where_conditions)}
            ORDER BY start_date ASC
            LIMIT {limit}
        """
        
        events = await db_service.execute_query(query, *params)
        
        return {
            "events": [
                {
                    "id": f"event_{i}",
                    "name": event['event_name'],
                    "type": event['event_type'],
                    "start_date": event['start_date'],
                    "end_date": event['end_date'],
                    "venue": event['venue_name'],
                    "address": event['address'],
                    "description": event['description'],
                    "is_free": event['is_free'],
                    "ticket_price": float(event['ticket_price']) if event['ticket_price'] else None,
                    "registration_required": event['registration_required'],
                    "registration_link": event['registration_link']
                }
                for i, event in enumerate(events)
            ],
            "total_events": len(events),
            "filters": {
                "location": location,
                "event_type": event_type,
                "start_date": start_date
            }
        }
        
    except Exception as e:
        logger.error(f"Event search error: {e}")
        raise HTTPException(status_code=500, detail="Could not search events")

@router.get("/marketplace")
async def browse_marketplace(
    category: Optional[str] = None,
    location: Optional[str] = None,
    max_price: Optional[float] = None,
    condition: Optional[str] = None,
    limit: int = 20
):
    """Browse marketplace listings"""
    try:
        db_service = get_database_service()
        
        where_conditions = ["status = 'approved'"]
        params = []
        param_count = 0
        
        if category:
            param_count += 1
            where_conditions.append(f"category = ${param_count}")
            params.append(category)
        
        if location:
            param_count += 1
            where_conditions.append(f"location ILIKE ${param_count}")
            params.append(f"%{location}%")
        
        if max_price:
            param_count += 1
            where_conditions.append(f"price <= ${param_count}")
            params.append(max_price)
        
        if condition:
            param_count += 1
            where_conditions.append(f"condition = ${param_count}")
            params.append(condition)
        
        query = f"""
            SELECT title, description, price, category, location, condition,
                   seller, posted, image, photos
            FROM marketplace_listings 
            WHERE {' AND '.join(where_conditions)}
            ORDER BY updated_at DESC
            LIMIT {limit}
        """
        
        listings = await db_service.execute_query(query, *params)
        
        return {
            "listings": [
                {
                    "id": f"listing_{i}",
                    "title": listing['title'],
                    "description": listing['description'],
                    "price": float(listing['price']) if listing['price'] else None,
                    "category": listing['category'],
                    "location": listing['location'],
                    "condition": listing['condition'],
                    "seller": listing['seller'],
                    "posted": listing['posted'],
                    "image": listing['image'],
                    "photos": listing['photos']
                }
                for i, listing in enumerate(listings)
            ],
            "total_listings": len(listings),
            "filters": {
                "category": category,
                "location": location,
                "max_price": max_price,
                "condition": condition
            }
        }
        
    except Exception as e:
        logger.error(f"Marketplace browse error: {e}")
        raise HTTPException(status_code=500, detail="Could not browse marketplace")

@router.post("/marketplace")
async def create_listing(request: ListingCreateRequest):
    """Create a new marketplace listing"""
    try:
        db_service = get_database_service()
        
        query = """
            INSERT INTO marketplace_listings 
            (user_id, title, description, price, category, location, condition, photos)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING id
        """
        
        result = await db_service.execute_single(
            query, request.user_id, request.title, request.description,
            request.price, request.category, request.location, 
            request.condition, request.photos
        )
        
        if not result:
            raise HTTPException(status_code=400, detail="Failed to create listing")
        
        return {
            "id": result['id'],
            "status": "success",
            "message": f"Created listing: {request.title}",
            "listing_status": "pending_approval"
        }
        
    except Exception as e:
        logger.error(f"Listing creation error: {e}")
        raise HTTPException(status_code=500, detail="Could not create listing")

@router.get("/feed/{user_id}")
async def get_social_feed(user_id: str, limit: int = 50):
    """Get personalized social feed"""
    try:
        # This would aggregate posts from user's groups, friends, etc.
        # For now, return a basic feed
        
        return SocialFeedResponse(
            user_id=user_id,
            posts=[],
            total_posts=0,
            last_updated=datetime.utcnow(),
            has_more=False
        )
        
    except Exception as e:
        logger.error(f"Social feed error: {e}")
        raise HTTPException(status_code=500, detail="Could not load social feed")

@router.post("/groups/{group_id}/join")
async def join_group(group_id: str, user_id: str):
    """Join an RV group"""
    try:
        db_service = get_database_service()
        
        # Check if already a member
        check_query = """
            SELECT id FROM group_memberships 
            WHERE user_id = $1 AND group_id = $2 AND is_active = true
        """
        
        existing = await db_service.execute_single(check_query, user_id, group_id)
        
        if existing:
            return {
                "status": "already_member",
                "message": "You are already a member of this group"
            }
        
        # Add membership
        insert_query = """
            INSERT INTO group_memberships (user_id, group_id, role, is_active)
            VALUES ($1, $2, 'member', true)
            RETURNING id
        """
        
        result = await db_service.execute_single(insert_query, user_id, group_id)
        
        if not result:
            raise HTTPException(status_code=400, detail="Failed to join group")
        
        return {
            "status": "success",
            "message": "Successfully joined the group!",
            "membership_id": result['id']
        }
        
    except Exception as e:
        logger.error(f"Group join error: {e}")
        raise HTTPException(status_code=500, detail="Could not join group")

@router.get("/groups/{user_id}/memberships")
async def get_user_groups(user_id: str):
    """Get user's group memberships"""
    try:
        db_service = get_database_service()
        
        query = """
            SELECT fg.group_name, fg.location, fg.member_count, fg.group_type,
                   fg.description, gm.role, gm.joined_at
            FROM group_memberships gm
            JOIN facebook_groups fg ON fg.id = gm.group_id
            WHERE gm.user_id = $1 AND gm.is_active = true
            ORDER BY gm.joined_at DESC
        """
        
        memberships = await db_service.execute_query(query, user_id)
        
        return {
            "user_id": user_id,
            "groups": [
                {
                    "name": group['group_name'],
                    "location": group['location'],
                    "member_count": group['member_count'],
                    "type": group['group_type'],
                    "description": group['description'],
                    "role": group['role'],
                    "joined_at": group['joined_at']
                }
                for group in memberships
            ],
            "total_groups": len(memberships)
        }
        
    except Exception as e:
        logger.error(f"User groups error: {e}")
        raise HTTPException(status_code=500, detail="Could not retrieve user groups")
