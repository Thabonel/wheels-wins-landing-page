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
from pydantic import ValidationError as PydanticValidationError

from app.services.database import DatabaseService
from app.services.pam.schemas.community import (
    SearchCommunityTipsInput,
    LogTipUsageInput,
    GetTipByIdInput
)
from app.services.pam.tools.exceptions import (
    ValidationError,
    DatabaseError,
    ResourceNotFoundError,
)
from app.services.pam.tools.utils import (
    validate_uuid,
    safe_db_insert,
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

    Raises:
        ValidationError: Invalid input parameters
        DatabaseError: Database operation failed
    """
    try:
        try:
            validated = SearchCommunityTipsInput(
                user_id=user_id,
                query=query,
                category=category,
                limit=limit
            )
        except PydanticValidationError as e:
            error_msg = e.errors()[0]['msg']
            raise ValidationError(
                f"Invalid input: {error_msg}",
                context={"validation_errors": e.errors()}
            )

        db = DatabaseService()

        try:
            result = db.client.rpc(
                'search_community_tips',
                {
                    'p_query': validated.query,
                    'p_category': validated.category.value if validated.category else None,
                    'p_limit': validated.limit
                }
            ).execute()
        except Exception as db_error:
            raise DatabaseError(
                "Failed to search community tips",
                context={"user_id": user_id, "query": query, "error": str(db_error)}
            )

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

    except ValidationError:
        raise
    except DatabaseError:
        raise
    except Exception as e:
        logger.error(
            f"Unexpected error searching community tips",
            extra={"user_id": user_id, "query": query},
            exc_info=True
        )
        raise DatabaseError(
            "Failed to search community tips",
            context={"user_id": user_id, "query": query, "error": str(e)}
        )


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

    Raises:
        ValidationError: Invalid input parameters
        DatabaseError: Database operation failed
    """
    try:
        try:
            validated = LogTipUsageInput(
                tip_id=tip_id,
                contributor_id=contributor_id,
                beneficiary_id=beneficiary_id,
                conversation_id=conversation_id,
                pam_response=pam_response
            )
        except PydanticValidationError as e:
            error_msg = e.errors()[0]['msg']
            raise ValidationError(
                f"Invalid input: {error_msg}",
                context={"validation_errors": e.errors()}
            )

        usage_data = {
            'tip_id': validated.tip_id,
            'contributor_id': validated.contributor_id,
            'beneficiary_id': validated.beneficiary_id,
            'conversation_id': validated.conversation_id,
            'pam_response': validated.pam_response[:500] if validated.pam_response else None
        }

        await safe_db_insert("tip_usage_log", usage_data, validated.beneficiary_id)

        logger.info(
            f"Logged tip usage: tip={validated.tip_id}, "
            f"contributor={validated.contributor_id}, "
            f"beneficiary={validated.beneficiary_id}"
        )

        return {
            "success": True,
            "message": "Tip usage logged successfully"
        }

    except ValidationError:
        raise
    except DatabaseError:
        raise
    except Exception as e:
        logger.error(
            f"Unexpected error logging tip usage",
            extra={"tip_id": tip_id, "beneficiary_id": beneficiary_id},
            exc_info=True
        )
        raise DatabaseError(
            "Failed to log tip usage",
            context={"tip_id": tip_id, "beneficiary_id": beneficiary_id, "error": str(e)}
        )


async def get_tip_by_id(tip_id: str) -> Dict[str, Any]:
    """
    Get a specific tip by ID (for crediting in PAM response).

    Args:
        tip_id: UUID of the tip

    Returns:
        Dict with tip details including contributor info

    Raises:
        ValidationError: Invalid tip ID
        ResourceNotFoundError: Tip not found
        DatabaseError: Database operation failed
    """
    try:
        try:
            validated = GetTipByIdInput(tip_id=tip_id)
        except PydanticValidationError as e:
            error_msg = e.errors()[0]['msg']
            raise ValidationError(
                f"Invalid input: {error_msg}",
                context={"validation_errors": e.errors()}
            )

        db = DatabaseService()

        try:
            result = db.client.table('community_tips').select(
                '*',
                'profiles(username)'
            ).eq('id', validated.tip_id).eq('status', 'active').single().execute()
        except Exception as db_error:
            raise DatabaseError(
                "Failed to retrieve tip",
                context={"tip_id": tip_id, "error": str(db_error)}
            )

        if not result.data:
            raise ResourceNotFoundError(
                "Tip not found",
                context={"tip_id": tip_id}
            )

        tip = result.data
        logger.info(f"Retrieved tip {tip_id}")

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

    except ValidationError:
        raise
    except ResourceNotFoundError:
        raise
    except DatabaseError:
        raise
    except Exception as e:
        logger.error(
            f"Unexpected error getting tip",
            extra={"tip_id": tip_id},
            exc_info=True
        )
        raise DatabaseError(
            "Failed to retrieve tip",
            context={"tip_id": tip_id, "error": str(e)}
        )
