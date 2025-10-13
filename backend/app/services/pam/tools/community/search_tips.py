"""
Community Tips - Search Tool for PAM

Enables PAM to search and use community-contributed tips to help users.
When PAM uses a tip, it credits the contributor and tracks impact.

Created: January 12, 2025
"""

import logging
from typing import Dict, Any, Optional, List
from datetime import datetime

from app.services.database import DatabaseService

logger = logging.getLogger(__name__)


async def search_community_tips(
    user_id: str,
    query: str,
    category: Optional[str] = None,
    limit: int = 5
) -> Dict[str, Any]:
    """
    Search community tips that might help answer user's question.

    Args:
        user_id: ID of the user asking (beneficiary)
        query: Search query (keywords from user's message)
        category: Optional category filter (camping, gas_savings, etc.)
        limit: Max number of tips to return

    Returns:
        Dict with:
        - success: bool
        - tips: List of relevant tips with contributor info
        - count: Number of tips found
    """
    try:
        db = DatabaseService()

        # Search tips using Supabase function
        result = db.client.rpc(
            'search_community_tips',
            {
                'p_query': query,
                'p_category': category,
                'p_limit': limit
            }
        ).execute()

        if not result.data:
            return {
                "success": True,
                "tips": [],
                "count": 0,
                "message": "No community tips found for this query"
            }

        tips = []
        for tip in result.data:
            tips.append({
                "id": tip['id'],
                "title": tip['title'],
                "content": tip['content'],
                "category": tip['category'],
                "contributor": tip['contributor_username'],
                "use_count": tip['use_count'],
                "helpful_count": tip['helpful_count']
            })

        logger.info(
            f"Found {len(tips)} community tips for query '{query}' "
            f"(category: {category})"
        )

        return {
            "success": True,
            "tips": tips,
            "count": len(tips),
            "message": f"Found {len(tips)} community tips"
        }

    except Exception as e:
        logger.error(f"Error searching community tips: {str(e)}")
        return {
            "success": False,
            "tips": [],
            "count": 0,
            "error": str(e)
        }


async def log_tip_usage(
    tip_id: str,
    contributor_id: str,
    beneficiary_id: str,
    conversation_id: Optional[str] = None,
    pam_response: Optional[str] = None
) -> Dict[str, Any]:
    """
    Log when PAM uses a community tip to help someone.
    This updates contributor stats and impact metrics.

    Args:
        tip_id: ID of the tip that was used
        contributor_id: User who created the tip
        beneficiary_id: User who received the tip
        conversation_id: Optional conversation ID
        pam_response: How PAM used the tip in response

    Returns:
        Dict with success status
    """
    try:
        db = DatabaseService()

        # Insert usage log (triggers update stats)
        result = db.client.table('tip_usage_log').insert({
            'tip_id': tip_id,
            'contributor_id': contributor_id,
            'beneficiary_id': beneficiary_id,
            'conversation_id': conversation_id,
            'pam_response': pam_response[:500] if pam_response else None  # Limit length
        }).execute()

        if result.data:
            logger.info(
                f"Logged tip usage: tip={tip_id}, "
                f"contributor={contributor_id}, "
                f"beneficiary={beneficiary_id}"
            )

            return {
                "success": True,
                "message": "Tip usage logged successfully"
            }
        else:
            return {
                "success": False,
                "error": "Failed to log tip usage"
            }

    except Exception as e:
        logger.error(f"Error logging tip usage: {str(e)}")
        return {
            "success": False,
            "error": str(e)
        }


async def get_tip_by_id(tip_id: str) -> Dict[str, Any]:
    """
    Get a specific tip by ID (for crediting in PAM response).

    Args:
        tip_id: UUID of the tip

    Returns:
        Dict with tip details including contributor info
    """
    try:
        db = DatabaseService()

        result = db.client.table('community_tips').select(
            '*',
            'profiles(username)'
        ).eq('id', tip_id).eq('status', 'active').single().execute()

        if result.data:
            tip = result.data
            return {
                "success": True,
                "tip": {
                    "id": tip['id'],
                    "title": tip['title'],
                    "content": tip['content'],
                    "category": tip['category'],
                    "contributor_id": tip['user_id'],
                    "contributor_username": tip.get('profiles', {}).get('username', 'Anonymous'),
                    "location": tip.get('location_name'),
                    "use_count": tip['use_count']
                }
            }
        else:
            return {
                "success": False,
                "error": "Tip not found"
            }

    except Exception as e:
        logger.error(f"Error getting tip {tip_id}: {str(e)}")
        return {
            "success": False,
            "error": str(e)
        }
