"""
Admin Knowledge Management Tool - Add Knowledge
Allows admins to teach PAM new information that will be recalled in future conversations

SECURITY: All knowledge content is validated to prevent prompt injection attacks
"""

import logging
import re
from typing import Dict, Any, Optional, List
from datetime import datetime

from app.core.database import get_supabase_client
from app.core.logging import get_logger
from app.services.pam.security import check_message_safety

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
        logger.info(f"Admin adding knowledge: '{title}' (type: {knowledge_type}, category: {category})")

        # SECURITY: Validate knowledge content for prompt injection
        safety_result = await check_message_safety(
            f"{title}\n{content}",
            context={"user_id": user_id, "action": "add_knowledge"}
        )

        if safety_result.is_malicious:
            logger.warning(
                f"BLOCKED malicious knowledge submission from {user_id}: "
                f"{safety_result.reason} (confidence: {safety_result.confidence})"
            )
            return {
                "success": False,
                "error": "Knowledge content failed security validation. Please rephrase without system instructions or code.",
                "security_reason": safety_result.reason
            }

        # SECURITY: Additional validation - check for suspicious patterns in content
        suspicious_patterns = [
            r"ignore\s+(previous|above|prior)\s+instructions",
            r"you\s+are\s+(now|actually|really)\s+a",
            r"system\s*:\s*",  # Trying to inject system messages
            r"assistant\s*:\s*",  # Trying to inject assistant messages
            r"<\s*system\s*>",  # XML-style injection
            r"\[SYSTEM\]",  # Bracket-style injection
        ]

        content_lower = content.lower()
        for pattern in suspicious_patterns:
            if re.search(pattern, content_lower, re.IGNORECASE):
                logger.warning(f"BLOCKED knowledge with suspicious pattern: {pattern}")
                return {
                    "success": False,
                    "error": "Knowledge content contains suspicious patterns. Please use plain language only.",
                }

        # SECURITY: Length limits to prevent abuse
        MAX_TITLE_LENGTH = 200
        MAX_CONTENT_LENGTH = 5000
        MAX_TAGS = 20

        if len(title) > MAX_TITLE_LENGTH:
            return {
                "success": False,
                "error": f"Title too long (max {MAX_TITLE_LENGTH} characters)"
            }

        if len(content) > MAX_CONTENT_LENGTH:
            return {
                "success": False,
                "error": f"Content too long (max {MAX_CONTENT_LENGTH} characters)"
            }

        if tags and len(tags) > MAX_TAGS:
            return {
                "success": False,
                "error": f"Too many tags (max {MAX_TAGS})"
            }

        # SECURITY: Sanitize HTML/script tags if present
        if "<script" in content.lower() or "<iframe" in content.lower():
            logger.warning(f"BLOCKED knowledge with script/iframe tags")
            return {
                "success": False,
                "error": "Knowledge content cannot contain script or iframe tags."
            }

        # SECURITY: Check if user has admin privileges
        supabase = get_supabase_client()
        try:
            profile_response = supabase.table("profiles").select("role").eq("user_id", user_id).execute()

            if not profile_response.data or len(profile_response.data) == 0:
                logger.warning(f"User {user_id} profile not found while attempting to add knowledge")
                return {
                    "success": False,
                    "error": "User profile not found"
                }

            user_role = profile_response.data[0].get("role")
            if user_role != "admin":
                logger.warning(f"Non-admin user {user_id} (role: {user_role}) attempted to add knowledge")
                return {
                    "success": False,
                    "error": "Admin privileges required to add knowledge"
                }
        except Exception as auth_error:
            logger.error(f"Error checking admin privileges for {user_id}: {auth_error}")
            return {
                "success": False,
                "error": "Failed to verify admin privileges"
            }

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

        # Insert into database (supabase client already initialized above)

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
            logger.info(f"Knowledge added successfully: {knowledge_id}")

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
            logger.error("Failed to insert knowledge into database")
            return {
                "success": False,
                "error": "Failed to save knowledge to database"
            }

    except Exception as e:
        logger.error(f"Error adding admin knowledge: {e}")
        return {
            "success": False,
            "error": f"Failed to add knowledge: {str(e)}"
        }
