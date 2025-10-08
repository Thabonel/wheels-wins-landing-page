"""
Admin Knowledge Management Tool - Search Knowledge
Searches PAM's admin knowledge base for relevant information
"""

import logging
from typing import Dict, Any, Optional, List
from datetime import datetime

from app.core.database import get_supabase_client
from app.core.logging import get_logger

logger = get_logger(__name__)


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

            # Format results
            knowledge_items = []
            for item in result.data:
                knowledge_items.append({
                    "id": item["id"],
                    "title": item["title"],
                    "content": item["content"],
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
