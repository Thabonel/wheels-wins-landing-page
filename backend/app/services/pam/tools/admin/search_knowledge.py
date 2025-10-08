"""
Admin Knowledge Management Tool - Search Knowledge
Searches PAM's admin knowledge base for relevant information

SECURITY: Retrieved knowledge is sanitized before being used in responses
"""

import logging
import re
from typing import Dict, Any, Optional, List
from datetime import datetime

from app.core.database import get_supabase_client
from app.core.logging import get_logger

logger = get_logger(__name__)


def sanitize_knowledge_content(content: str) -> str:
    """
    Sanitize knowledge content to prevent injection attacks.

    This is a defense-in-depth measure in case malicious content was stored.
    Removes or escapes patterns that could manipulate PAM's behavior.
    """
    # Remove any attempts to inject system-level instructions
    sanitized = content

    # Remove XML-style tags that could be interpreted as system messages
    sanitized = re.sub(r"<\s*system\s*>.*?<\s*/\s*system\s*>", "", sanitized, flags=re.IGNORECASE | re.DOTALL)
    sanitized = re.sub(r"<\s*assistant\s*>.*?<\s*/\s*assistant\s*>", "", sanitized, flags=re.IGNORECASE | re.DOTALL)

    # Remove bracket-style injections
    sanitized = re.sub(r"\[SYSTEM\].*?\[/SYSTEM\]", "", sanitized, flags=re.IGNORECASE | re.DOTALL)
    sanitized = re.sub(r"\[ASSISTANT\].*?\[/ASSISTANT\]", "", sanitized, flags=re.IGNORECASE | re.DOTALL)

    # Remove markdown code blocks that could contain instructions
    sanitized = re.sub(r"```[\s\S]*?```", "", sanitized)

    # Escape any remaining potentially dangerous patterns
    # Replace "system:" or "assistant:" prefixes that could be interpreted as role markers
    sanitized = re.sub(r"^\s*(system|assistant)\s*:\s*", "Note - ", sanitized, flags=re.IGNORECASE | re.MULTILINE)

    # Remove excessive whitespace that could be hiding injection attempts
    sanitized = re.sub(r"\s+", " ", sanitized).strip()

    return sanitized


async def search_knowledge(
    user_id: str,
    query: Optional[str] = None,
    category: Optional[str] = None,
    knowledge_type: Optional[str] = None,
    location_context: Optional[str] = None,
    tags: Optional[List[str]] = None,
    min_priority: int = 1,
    limit: int = 10
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
        logger.info(f"🔍 Searching admin knowledge: query='{query}', category={category}, type={knowledge_type}")

        supabase = get_supabase_client()

        # Start with base query - only active knowledge
        query_builder = supabase.table("pam_admin_knowledge").select("*").eq("is_active", True)

        # Apply filters
        if category:
            query_builder = query_builder.eq("category", category)

        if knowledge_type:
            query_builder = query_builder.eq("knowledge_type", knowledge_type)

        if location_context:
            # Case-insensitive partial match for location
            query_builder = query_builder.ilike("location_context", f"%{location_context}%")

        if min_priority > 1:
            query_builder = query_builder.gte("priority", min_priority)

        # Tag filtering (matches ANY tag in the list)
        if tags:
            query_builder = query_builder.overlaps("tags", tags)

        # Text search in title and content
        if query:
            # Note: Supabase text search syntax
            query_builder = query_builder.or_(
                f"title.ilike.%{query}%,content.ilike.%{query}%"
            )

        # Order by priority (high to low) and recency
        query_builder = query_builder.order("priority", desc=True).order("created_at", desc=True)

        # Apply limit
        query_builder = query_builder.limit(limit)

        # Execute query
        result = query_builder.execute()

        if result.data:
            logger.info(f"✅ Found {len(result.data)} knowledge entries")

            # Format results with sanitization
            knowledge_items = []
            for item in result.data:
                # SECURITY: Sanitize content before returning
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

            # Log usage for each knowledge entry
            for item in result.data:
                try:
                    supabase.table("pam_knowledge_usage_log").insert({
                        "knowledge_id": item["id"],
                        "user_id": user_id,
                        "conversation_context": query or "search",
                        "used_at": datetime.utcnow().isoformat()
                    }).execute()
                except Exception as log_error:
                    logger.warning(f"⚠️ Failed to log knowledge usage: {log_error}")

            return {
                "success": True,
                "count": len(knowledge_items),
                "knowledge": knowledge_items,
                "message": f"Found {len(knowledge_items)} relevant knowledge entries"
            }
        else:
            logger.info("ℹ️ No matching knowledge found")
            return {
                "success": True,
                "count": 0,
                "knowledge": [],
                "message": "No matching knowledge found"
            }

    except Exception as e:
        logger.error(f"❌ Error searching admin knowledge: {e}")
        return {
            "success": False,
            "error": f"Failed to search knowledge: {str(e)}",
            "knowledge": []
        }
