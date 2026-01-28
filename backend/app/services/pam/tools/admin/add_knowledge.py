"""
Admin Knowledge Management Tool - Add Knowledge
Allows admins to teach PAM new information that will be recalled in future conversations

SECURITY: All knowledge content is validated to prevent prompt injection attacks

Amendment #4: Input validation with Pydantic models
"""

import logging
import re
from typing import Dict, Any, Optional, List
from datetime import datetime
from pydantic import ValidationError as PydanticValidationError

from app.core.database import get_supabase_client
from app.core.logging import get_logger
from app.services.pam.security import check_message_safety
from app.services.pam.schemas.admin import AddKnowledgeInput
from app.services.pam.tools.exceptions import (
    ValidationError,
    DatabaseError,
    AuthorizationError,
)
from app.services.pam.tools.utils import (
    validate_uuid,
    safe_db_insert,
)

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

    Raises:
        ValidationError: Invalid input parameters or security validation failed
        AuthorizationError: User does not have admin privileges
        DatabaseError: Database operation failed

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
        try:
            validated = AddKnowledgeInput(
                user_id=user_id,
                title=title,
                content=content,
                knowledge_type=knowledge_type,
                category=category,
                location_context=location_context,
                date_context=date_context,
                priority=priority,
                tags=tags
            )
        except PydanticValidationError as e:
            error_msg = e.errors()[0]['msg']
            raise ValidationError(
                f"Invalid input: {error_msg}",
                context={"validation_errors": e.errors()}
            )

        logger.info(f"Admin adding knowledge: '{validated.title}' (type: {validated.knowledge_type}, category: {validated.category})")

        safety_result = await check_message_safety(
            f"{validated.title}\n{validated.content}",
            context={"user_id": validated.user_id, "action": "add_knowledge"}
        )

        if safety_result.is_malicious:
            logger.warning(
                f"BLOCKED malicious knowledge submission from {validated.user_id}: "
                f"{safety_result.reason} (confidence: {safety_result.confidence})"
            )
            raise ValidationError(
                "Knowledge content failed security validation. Please rephrase without system instructions or code.",
                context={"security_reason": safety_result.reason, "confidence": safety_result.confidence}
            )

        suspicious_patterns = [
            r"ignore\s+(previous|above|prior)\s+instructions",
            r"you\s+are\s+(now|actually|really)\s+a",
            r"system\s*:\s*",
            r"assistant\s*:\s*",
            r"<\s*system\s*>",
            r"\[SYSTEM\]",
        ]

        content_lower = validated.content.lower()
        for pattern in suspicious_patterns:
            if re.search(pattern, content_lower, re.IGNORECASE):
                logger.warning(f"BLOCKED knowledge with suspicious pattern: {pattern}")
                raise ValidationError(
                    "Knowledge content contains suspicious patterns. Please use plain language only.",
                    context={"pattern": pattern}
                )

        if "<script" in validated.content.lower() or "<iframe" in validated.content.lower():
            logger.warning(f"BLOCKED knowledge with script/iframe tags")
            raise ValidationError(
                "Knowledge content cannot contain script or iframe tags.",
                context={"content_preview": validated.content[:100]}
            )

        supabase = get_supabase_client()
        try:
            profile_response = supabase.table("profiles").select("role").eq("id", validated.user_id).execute()

            if not profile_response.data or len(profile_response.data) == 0:
                logger.warning(f"User {validated.user_id} profile not found while attempting to add knowledge")
                raise AuthorizationError(
                    "User profile not found",
                    context={"user_id": validated.user_id}
                )

            user_role = profile_response.data[0].get("role")
            if user_role != "admin":
                logger.warning(f"Non-admin user {validated.user_id} (role: {user_role}) attempted to add knowledge")
                raise AuthorizationError(
                    "Admin privileges required to add knowledge",
                    context={"user_id": validated.user_id, "role": user_role}
                )
        except AuthorizationError:
            raise
        except Exception as auth_error:
            logger.error(f"Error checking admin privileges for {validated.user_id}: {auth_error}")
            raise DatabaseError(
                "Failed to verify admin privileges",
                context={"user_id": validated.user_id, "error": str(auth_error)}
            )

        knowledge_data = {
            "admin_user_id": validated.user_id,
            "title": validated.title,
            "content": validated.content,
            "knowledge_type": validated.knowledge_type.value,
            "category": validated.category.value,
            "priority": validated.priority,
            "is_active": True,
            "created_at": datetime.utcnow().isoformat(),
            "updated_at": datetime.utcnow().isoformat()
        }

        if validated.location_context:
            knowledge_data["location_context"] = validated.location_context

        if validated.date_context:
            knowledge_data["date_context"] = validated.date_context

        if validated.tags:
            knowledge_data["tags"] = validated.tags

        knowledge = await safe_db_insert("pam_admin_knowledge", knowledge_data, validated.user_id)

        logger.info(f"Knowledge added successfully: {knowledge['id']}")

        return {
            "success": True,
            "knowledge_id": knowledge["id"],
            "message": f"I've learned: '{validated.title}'. I'll remember this and use it when helping users.",
            "data": {
                "title": validated.title,
                "type": validated.knowledge_type.value,
                "category": validated.category.value,
                "priority": validated.priority,
                "location": validated.location_context,
                "date_context": validated.date_context,
                "tags": validated.tags
            }
        }

    except ValidationError:
        raise
    except AuthorizationError:
        raise
    except DatabaseError:
        raise
    except Exception as e:
        logger.error(
            f"Unexpected error adding admin knowledge",
            extra={"user_id": user_id, "title": title},
            exc_info=True
        )
        raise DatabaseError(
            "Failed to add knowledge",
            context={"user_id": user_id, "title": title, "error": str(e)}
        )
