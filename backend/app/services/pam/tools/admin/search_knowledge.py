"""
Admin Knowledge Management Tool - Search Knowledge
Searches PAM's admin knowledge base for relevant information

SECURITY: Retrieved knowledge is sanitized before being used in responses

Amendment #4: Input validation with Pydantic models
"""

import logging
import re
from typing import Dict, Any, Optional, List
from datetime import datetime
from pydantic import ValidationError as PydanticValidationError

from app.core.database import get_supabase_client
from app.core.logging import get_logger
from app.services.pam.schemas.admin import SearchKnowledgeInput
from app.services.pam.tools.exceptions import (
    ValidationError,
    DatabaseError,
)
from app.services.pam.tools.utils import (
    validate_uuid,
    validate_positive_number,
    safe_db_insert,
)

logger = get_logger(__name__)

DEFAULT_KNOWLEDGE_SEARCH_LIMIT = 10
MIN_KNOWLEDGE_PRIORITY = 1


def sanitize_knowledge_content(content: str) -> str:
    """
    Sanitize knowledge content to prevent injection attacks.

    Defense-in-depth measure for stored content.
    Removes patterns that could manipulate PAM's behavior.
    """
    sanitized = content

    sanitized = re.sub(r"<\s*system\s*>.*?<\s*/\s*system\s*>", "", sanitized, flags=re.IGNORECASE | re.DOTALL)
    sanitized = re.sub(r"<\s*assistant\s*>.*?<\s*/\s*assistant\s*>", "", sanitized, flags=re.IGNORECASE | re.DOTALL)

    sanitized = re.sub(r"\[SYSTEM\].*?\[/SYSTEM\]", "", sanitized, flags=re.IGNORECASE | re.DOTALL)
    sanitized = re.sub(r"\[ASSISTANT\].*?\[/ASSISTANT\]", "", sanitized, flags=re.IGNORECASE | re.DOTALL)

    sanitized = re.sub(r"```[\s\S]*?```", "", sanitized)

    sanitized = re.sub(r"^\s*(system|assistant)\s*:\s*", "Note - ", sanitized, flags=re.IGNORECASE | re.MULTILINE)

    sanitized = re.sub(r"\s+", " ", sanitized).strip()

    return sanitized


async def search_knowledge(
    user_id: str,
    query: Optional[str] = None,
    category: Optional[str] = None,
    knowledge_type: Optional[str] = None,
    location_context: Optional[str] = None,
    tags: Optional[List[str]] = None,
    min_priority: int = MIN_KNOWLEDGE_PRIORITY,
    limit: int = DEFAULT_KNOWLEDGE_SEARCH_LIMIT
) -> Dict[str, Any]:
    """
    Search admin knowledge base for relevant information.
    PAM uses this internally when processing user queries.

    Args:
        user_id: User making the request
        query: Text search query (searches title and content)
        category: Filter by category (travel, budget, social, shop, general)
        knowledge_type: Filter by type (location_tip, travel_rule, seasonal_advice, etc.)
        location_context: Filter by location
        tags: Filter by tags (returns entries matching ANY tag)
        min_priority: Minimum priority level (1-10)
        limit: Maximum number of results to return

    Returns:
        Dict with success status and list of matching knowledge entries

    Raises:
        ValidationError: Invalid input parameters
        DatabaseError: Database operation failed

    Example Usage:
        User asks: "When should I visit Port Headland?"

        PAM calls: search_knowledge(
            user_id="user-uuid",
            query="Port Headland",
            category="travel",
            knowledge_type="seasonal_advice"
        )

        Returns: "May to August is the best time to travel in Port Headland vicinity"
    """
    try:
        try:
            validated = SearchKnowledgeInput(
                user_id=user_id,
                query=query,
                category=category,
                knowledge_type=knowledge_type,
                location_context=location_context,
                tags=tags,
                min_priority=min_priority,
                limit=limit
            )
        except PydanticValidationError as e:
            error_msg = e.errors()[0]['msg']
            raise ValidationError(
                f"Invalid input: {error_msg}",
                context={"validation_errors": e.errors()}
            )

        logger.info(f"Searching admin knowledge: query='{validated.query}', category={validated.category}, type={validated.knowledge_type}")

        supabase = get_supabase_client()

        query_builder = supabase.table("pam_admin_knowledge").select("*").eq("is_active", True)

        if validated.category:
            query_builder = query_builder.eq("category", validated.category.value)

        if validated.knowledge_type:
            query_builder = query_builder.eq("knowledge_type", validated.knowledge_type.value)

        if validated.location_context:
            query_builder = query_builder.ilike("location_context", f"%{validated.location_context}%")

        if validated.min_priority > MIN_KNOWLEDGE_PRIORITY:
            query_builder = query_builder.gte("priority", validated.min_priority)

        if validated.tags:
            query_builder = query_builder.overlaps("tags", validated.tags)

        if validated.query:
            query_builder = query_builder.or_(
                f"title.ilike.%{validated.query}%,content.ilike.%{validated.query}%"
            )

        query_builder = query_builder.order("priority", desc=True).order("created_at", desc=True)
        query_builder = query_builder.limit(validated.limit)

        try:
            result = query_builder.execute()
        except Exception as db_error:
            raise DatabaseError(
                "Failed to search admin knowledge",
                context={"user_id": user_id, "query": query, "error": str(db_error)}
            )

        if result.data:
            logger.info(f"Found {len(result.data)} knowledge entries")

            knowledge_items = []
            for item in result.data:
                sanitized_content = sanitize_knowledge_content(item["content"])
                sanitized_title = sanitize_knowledge_content(item["title"])

                knowledge_items.append({
                    "id": item["id"],
                    "title": sanitized_title,
                    "content": sanitized_content,
                    "type": item["knowledge_type"],
                    "category": item["category"],
                    "priority": item["priority"],
                    "location": item.get("location_context"),
                    "date_context": item.get("date_context"),
                    "tags": item.get("tags", []),
                    "usage_count": item.get("usage_count", 0),
                    "created_at": item["created_at"]
                })

            for item in result.data:
                try:
                    usage_data = {
                        "knowledge_id": item["id"],
                        "user_id": validated.user_id,
                        "conversation_context": validated.query or "search",
                        "used_at": datetime.utcnow().isoformat()
                    }
                    await safe_db_insert("pam_knowledge_usage_log", usage_data, validated.user_id)
                except Exception as log_error:
                    logger.warning(f"Failed to log knowledge usage: {log_error}")

            return {
                "success": True,
                "count": len(knowledge_items),
                "knowledge": knowledge_items,
                "message": f"Found {len(knowledge_items)} relevant knowledge entries"
            }
        else:
            logger.info("No matching knowledge found")
            return {
                "success": True,
                "count": 0,
                "knowledge": [],
                "message": "No matching knowledge found"
            }

    except ValidationError:
        raise
    except DatabaseError:
        raise
    except Exception as e:
        logger.error(
            f"Unexpected error searching admin knowledge",
            extra={"user_id": user_id, "query": query},
            exc_info=True
        )
        raise DatabaseError(
            "Failed to search knowledge",
            context={"user_id": user_id, "query": query, "error": str(e)}
        )
