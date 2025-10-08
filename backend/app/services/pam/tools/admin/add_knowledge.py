"""
Admin Knowledge Management Tool - Add Knowledge
Allows admins to teach PAM new information that will be recalled in future conversations
"""

import logging
from typing import Dict, Any, Optional, List
from datetime import datetime

from app.core.database import get_supabase_client
from app.core.logging import get_logger

logger = get_logger(__name__)


async def add_knowledge(
    user_id: str,
    title: str,
    content: str,
    knowledge_type: str,
    category: str,
    location_context: Optional[str] = None,
    date_context: Optional[str] = None,
    priority: int = 5,
    tags: Optional[List[str]] = None
) -> Dict[str, Any]:
    """
    Add admin knowledge to PAM's long-term memory.

    Args:
        user_id: Admin user ID (must have admin privileges)
        title: Short title for the knowledge (e.g., "Port Headland Best Season")
        content: The actual knowledge content (e.g., "May to August is best time to travel")
        knowledge_type: Type of knowledge (location_tip, travel_rule, seasonal_advice, general_knowledge, policy, warning)
        category: Category (travel, budget, social, shop, general)
        location_context: Optional location context (e.g., "Port Headland, Western Australia")
        date_context: Optional date/season context (e.g., "May-August", "Winter", "Summer 2025")
        priority: Priority level 1-10 (10 = highest, 5 = normal, 1 = lowest)
        tags: Optional list of tags for easier searching

    Returns:
        Dict with success status, knowledge_id, and confirmation message

    Example Usage:
        Admin: "PAM, remember that May to August is the best time to travel in the Port Headland vicinity"

        PAM calls: add_knowledge(
            user_id="admin-uuid",
            title="Port Headland Best Season",
            content="May to August is the best time to travel in Port Headland vicinity due to mild weather",
            knowledge_type="seasonal_advice",
            category="travel",
            location_context="Port Headland, Western Australia",
            date_context="May-August",
            priority=7,
            tags=["port-headland", "seasonal", "western-australia", "travel-timing"]
        )
    """
    try:
        logger.info(f"💡 Admin adding knowledge: '{title}' (type: {knowledge_type}, category: {category})")

        # TODO: Add admin privilege check
        # For now, we'll allow any authenticated user to add knowledge
        # In production, check if user_id has admin role

        # Validate knowledge_type
        valid_types = ['location_tip', 'travel_rule', 'seasonal_advice', 'general_knowledge', 'policy', 'warning']
        if knowledge_type not in valid_types:
            return {
                "success": False,
                "error": f"Invalid knowledge_type. Must be one of: {', '.join(valid_types)}"
            }

        # Validate category
        valid_categories = ['travel', 'budget', 'social', 'shop', 'general']
        if category not in valid_categories:
            return {
                "success": False,
                "error": f"Invalid category. Must be one of: {', '.join(valid_categories)}"
            }

        # Validate priority
        if not (1 <= priority <= 10):
            return {
                "success": False,
                "error": "Priority must be between 1 and 10"
            }

        # Insert into database
        supabase = get_supabase_client()

        knowledge_data = {
            "admin_user_id": user_id,
            "title": title,
            "content": content,
            "knowledge_type": knowledge_type,
            "category": category,
            "priority": priority,
            "is_active": True,
            "created_at": datetime.utcnow().isoformat(),
            "updated_at": datetime.utcnow().isoformat()
        }

        # Add optional fields
        if location_context:
            knowledge_data["location_context"] = location_context

        if date_context:
            knowledge_data["date_context"] = date_context

        if tags:
            knowledge_data["tags"] = tags

        result = supabase.table("pam_admin_knowledge").insert(knowledge_data).execute()

        if result.data and len(result.data) > 0:
            knowledge_id = result.data[0]["id"]
            logger.info(f"✅ Knowledge added successfully: {knowledge_id}")

            return {
                "success": True,
                "knowledge_id": knowledge_id,
                "message": f"I've learned: '{title}'. I'll remember this and use it when helping users.",
                "data": {
                    "title": title,
                    "type": knowledge_type,
                    "category": category,
                    "priority": priority,
                    "location": location_context,
                    "date_context": date_context,
                    "tags": tags
                }
            }
        else:
            logger.error("❌ Failed to insert knowledge into database")
            return {
                "success": False,
                "error": "Failed to save knowledge to database"
            }

    except Exception as e:
        logger.error(f"❌ Error adding admin knowledge: {e}")
        return {
            "success": False,
            "error": f"Failed to add knowledge: {str(e)}"
        }
