"""
Community Tips - Submission Tool

Enables users to share tips with the community.
Tips become part of PAM's knowledge base.

Created: January 12, 2025
"""

import logging
from typing import Dict, Any, Optional, List
from datetime import datetime

from app.services.database import DatabaseService

logger = logging.getLogger(__name__)


async def submit_community_tip(
    user_id: str,
    title: str,
    content: str,
    category: str,
    location_name: Optional[str] = None,
    location_lat: Optional[float] = None,
    location_lng: Optional[float] = None,
    tags: Optional[List[str]] = None
) -> Dict[str, Any]:
    """
    Submit a new community tip.

    Args:
        user_id: ID of the user submitting the tip
        title: Short title for the tip
        content: Full tip content
        category: Category (camping, gas_savings, route_planning, etc.)
        location_name: Optional location name
        location_lat: Optional latitude
        location_lng: Optional longitude
        tags: Optional list of searchable tags

    Returns:
        Dict with:
        - success: bool
        - tip_id: UUID of created tip
        - message: Status message
    """
    try:
        # Validate category
        valid_categories = [
            'camping', 'gas_savings', 'route_planning', 'maintenance',
            'safety', 'cooking', 'weather', 'attractions', 'budget', 'general'
        ]

        if category not in valid_categories:
            return {
                "success": False,
                "error": f"Invalid category. Must be one of: {', '.join(valid_categories)}"
            }

        db = DatabaseService()

        # Insert tip
        tip_data = {
            'user_id': user_id,
            'title': title.strip(),
            'content': content.strip(),
            'category': category,
            'status': 'active'
        }

        # Add optional fields
        if location_name:
            tip_data['location_name'] = location_name
        if location_lat is not None:
            tip_data['location_lat'] = location_lat
        if location_lng is not None:
            tip_data['location_lng'] = location_lng
        if tags:
            tip_data['tags'] = tags

        result = db.client.table('community_tips').insert(tip_data).execute()

        if result.data:
            tip = result.data[0]
            logger.info(
                f"User {user_id} submitted tip: {tip['id']} "
                f"(category: {category})"
            )

            return {
                "success": True,
                "tip_id": tip['id'],
                "message": "Tip shared successfully! It's now part of PAM's knowledge base.",
                "tip": {
                    "id": tip['id'],
                    "title": tip['title'],
                    "category": tip['category']
                }
            }
        else:
            return {
                "success": False,
                "error": "Failed to create tip"
            }

    except Exception as e:
        logger.error(f"Error submitting community tip: {str(e)}")
        return {
            "success": False,
            "error": str(e)
        }


async def get_user_tips(
    user_id: str,
    limit: int = 20,
    status: str = 'active'
) -> Dict[str, Any]:
    """
    Get all tips submitted by a user.

    Args:
        user_id: ID of the user
        limit: Max number of tips to return
        status: Filter by status (active, archived, flagged)

    Returns:
        Dict with list of user's tips and their impact stats
    """
    try:
        db = DatabaseService()

        query = db.client.table('community_tips').select('*').eq('user_id', user_id)

        if status:
            query = query.eq('status', status)

        result = query.order('created_at', desc=True).limit(limit).execute()

        tips = []
        if result.data:
            for tip in result.data:
                tips.append({
                    "id": tip['id'],
                    "title": tip['title'],
                    "content": tip['content'],
                    "category": tip['category'],
                    "location": tip.get('location_name'),
                    "use_count": tip['use_count'],
                    "view_count": tip['view_count'],
                    "helpful_count": tip['helpful_count'],
                    "is_featured": tip.get('is_featured', False),
                    "created_at": tip['created_at'],
                    "last_used_at": tip.get('last_used_at')
                })

        return {
            "success": True,
            "tips": tips,
            "count": len(tips)
        }

    except Exception as e:
        logger.error(f"Error getting user tips: {str(e)}")
        return {
            "success": False,
            "tips": [],
            "count": 0,
            "error": str(e)
        }


async def get_user_contribution_stats(user_id: str) -> Dict[str, Any]:
    """
    Get aggregated contribution statistics for a user.

    Args:
        user_id: ID of the user

    Returns:
        Dict with:
        - tips_shared: Number of tips submitted
        - people_helped: Number of unique users who benefited
        - total_tip_uses: Total times tips were used
        - reputation_level: Current reputation level
        - badges: List of earned badges
    """
    try:
        db = DatabaseService()

        result = db.client.rpc(
            'get_user_contribution_stats',
            {'p_user_id': user_id}
        ).execute()

        if result.data and len(result.data) > 0:
            stats = result.data[0]
            return {
                "success": True,
                "stats": {
                    "tips_shared": stats['tips_shared'],
                    "people_helped": stats['people_helped'],
                    "total_tip_uses": stats['total_tip_uses'],
                    "reputation_level": stats['reputation_level'],
                    "badges": stats['badges']
                }
            }
        else:
            # No stats yet - return zeros
            return {
                "success": True,
                "stats": {
                    "tips_shared": 0,
                    "people_helped": 0,
                    "total_tip_uses": 0,
                    "reputation_level": 1,
                    "badges": []
                }
            }

    except Exception as e:
        logger.error(f"Error getting contribution stats: {str(e)}")
        return {
            "success": False,
            "stats": {
                "tips_shared": 0,
                "people_helped": 0,
                "total_tip_uses": 0,
                "reputation_level": 1,
                "badges": []
            },
            "error": str(e)
        }


async def get_community_stats() -> Dict[str, Any]:
    """
    Get aggregate community statistics for homepage display.

    Returns:
        Dict with:
        - total_tips: Total number of active tips
        - total_contributors: Number of users who have shared tips
        - total_people_helped: Total unique users helped
        - total_tip_uses: Total times tips have been used
    """
    try:
        db = DatabaseService()

        result = db.client.rpc('get_community_stats').execute()

        if result.data and len(result.data) > 0:
            stats = result.data[0]
            return {
                "success": True,
                "stats": {
                    "total_tips": stats['total_tips'] or 0,
                    "total_contributors": stats['total_contributors'] or 0,
                    "total_people_helped": stats['total_people_helped'] or 0,
                    "total_tip_uses": stats['total_tip_uses'] or 0
                }
            }
        else:
            return {
                "success": True,
                "stats": {
                    "total_tips": 0,
                    "total_contributors": 0,
                    "total_people_helped": 0,
                    "total_tip_uses": 0
                }
            }

    except Exception as e:
        logger.error(f"Error getting community stats: {str(e)}")
        return {
            "success": False,
            "stats": {
                "total_tips": 0,
                "total_contributors": 0,
                "total_people_helped": 0,
                "total_tip_uses": 0
            },
            "error": str(e)
        }
