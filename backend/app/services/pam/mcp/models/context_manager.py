from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, List, Optional

from app.services.database import DatabaseService
from app.core.logging import get_logger

logger = get_logger(__name__)


class ContextManager:
    """Retrieve and store conversation context using Supabase."""

    def __init__(self, db_service: Optional[DatabaseService] = None) -> None:
        self.db_service = db_service or DatabaseService()
        self.client = self.db_service.get_client()

    async def get_user_context(
        self,
        user_id: str,
        session_id: Optional[str] = None,
        limit: int = 10,
    ) -> Dict[str, Any]:
        """Return recent conversation messages for a user."""
        try:
            query = (
                self.client.table("pam_conversation_memory")
                .select("*")
                .eq("user_id", user_id)
            )
            if session_id:
                query = query.eq("session_id", session_id)

            result = (
                query.order("message_sequence", desc=True).limit(limit).execute()
            )

            messages: List[Dict[str, Any]] = []
            if result.data:
                for record in reversed(result.data):
                    if record.get("user_message"):
                        messages.append(
                            {
                                "role": "user",
                                "content": record["user_message"],
                                "timestamp": record["message_timestamp"],
                                "sequence": record["message_sequence"],
                            }
                        )
                    if record.get("pam_response"):
                        messages.append(
                            {
                                "role": "assistant",
                                "content": record["pam_response"],
                                "timestamp": record["message_timestamp"],
                                "sequence": record["message_sequence"],
                                "intent": record.get("detected_intent"),
                                "node_used": record.get("node_used"),
                            }
                        )

            logger.info(
                "Retrieved %s messages for user %s", len(messages), user_id
            )
            return {
                "user_id": user_id,
                "messages": messages,
                "context_retrieved_at": datetime.utcnow().isoformat(),
            }

        except Exception as exc:  # pragma: no cover - supabase failures
            logger.error("Failed to get user context: %s", exc)
            return {"user_id": user_id, "messages": []}

    async def save_memory(
        self,
        user_id: str,
        session_id: str,
        user_message: str,
        pam_response: str,
        *,
        intent: Optional[str] = None,
        node_used: Optional[str] = None,
        context_used: Optional[Dict[str, Any]] = None,
    ) -> bool:
        """Persist a conversation turn to Supabase."""
        try:
            seq_result = (
                self.client.table("pam_conversation_memory")
                .select("message_sequence")
                .eq("user_id", user_id)
                .eq("session_id", session_id)
                .order("message_sequence", desc=True)
                .limit(1)
                .execute()
            )
            next_seq = 1
            if seq_result.data:
                next_seq = seq_result.data[0]["message_sequence"] + 1

            record = {
                "user_id": user_id,
                "session_id": session_id,
                "message_sequence": next_seq,
                "user_message": user_message,
                "pam_response": pam_response,
                "detected_intent": intent,
                "node_used": node_used,
                "context_used": context_used or {},
                "message_timestamp": datetime.utcnow().isoformat(),
            }

            result = self.client.table("pam_conversation_memory").insert(record).execute()
            success = bool(result.data)
            if success:
                logger.info("Saved memory for user %s", user_id)
            else:
                logger.warning("Failed to save memory for user %s", user_id)
            return success
        except Exception as exc:  # pragma: no cover - supabase failures
            logger.error("Save memory error: %s", exc)
            return False


context_manager = ContextManager()
