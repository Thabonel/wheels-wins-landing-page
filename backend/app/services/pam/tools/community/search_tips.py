"""
Community Tips - Search Tool for PAM

Enables PAM to search and use community-contributed tips to help users.
When PAM uses a tip, it credits the contributor and tracks impact.

Amendment #4: Input validation with Pydantic models

Created: January 12, 2025
"""

import logging
from typing import Dict, Any, Optional, List
from datetime import datetime
from pydantic import ValidationError

from app.services.database import DatabaseService
from app.services.pam.schemas.community import (
    SearchCommunityTipsInput,
    LogTipUsageInput,
    GetTipByIdInput
)

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
        # Validate inputs using Pydantic schema
        try:
            validated = SearchCommunityTipsInput(
                user_id=user_id,
                query=query,
                category=category,
                limit=limit
            )
        except ValidationError as e:
            # Extract first error message for user-friendly response
            error_msg = e.errors()[0]['msg']
            return {
                "success": False,
                "tips": [],
                "count": 0,
                "error": f"Invalid input: {error_msg}"
            }

        db = DatabaseService()

        # Search tips using Supabase function
        result = db.client.rpc(
            'search_community_tips',
            {
                'p_query': validated.query,
                'p_category': validated.category.value if validated.category else None,
                'p_limit': validated.limit
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
            f"Found {len(tips)} community tips for query '{validated.query}' "
            f"(category: {validated.category})"
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
        # Validate inputs using Pydantic schema
        try:
            validated = LogTipUsageInput(
                tip_id=tip_id,
                contributor_id=contributor_id,
                beneficiary_id=beneficiary_id,
                conversation_id=conversation_id,
                pam_response=pam_response
            )
        except ValidationError as e:
            # Extract first error message for user-friendly response
            error_msg = e.errors()[0]['msg']
            return {
                "success": False,
                "error": f"Invalid input: {error_msg}"
            }

        db = DatabaseService()

        # Insert usage log (triggers update stats)
        result = db.client.table('tip_usage_log').insert({
            'tip_id': validated.tip_id,
            'contributor_id': validated.contributor_id,
            'beneficiary_id': validated.beneficiary_id,
            'conversation_id': validated.conversation_id,
            'pam_response': validated.pam_response[:500] if validated.pam_response else None  # Limit length
        }).execute()

        if result.data:
            logger.info(
                f"Logged tip usage: tip={validated.tip_id}, "
                f"contributor={validated.contributor_id}, "
                f"beneficiary={validated.beneficiary_id}"
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
        # Validate inputs using Pydantic schema
        try:
            validated = GetTipByIdInput(tip_id=tip_id)
        except ValidationError as e:
            # Extract first error message for user-friendly response
            error_msg = e.errors()[0]['msg']
            return {
                "success": False,
                "error": f"Invalid input: {error_msg}"
            }

        db = DatabaseService()

        result = db.client.table('community_tips').select(
            '*',
            'profiles(username)'
        ).eq('id', validated.tip_id).eq('status', 'active').single().execute()

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
        logger.error(f"Error getting tip {validated.tip_id if 'validated' in locals() else tip_id}: {str(e)}")
        return {
            "success": False,
            "error": str(e)
        }
