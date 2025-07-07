from __future__ import annotations

from typing import Any, Dict
from datetime import datetime
import uuid

from langchain_core.tools import tool

from app.database.supabase_client import get_supabase_client


@tool
async def record_user_feedback(user_id: str, message_id: str, thumbs_up: bool) -> Dict[str, Any]:
    """Store a thumbs-up or thumbs-down for a PAM message."""
    supabase = get_supabase_client()
    data = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "message_id": message_id,
        "thumbs_up": thumbs_up,
        "timestamp": datetime.utcnow().isoformat(),
    }
    result = supabase.table("pam_feedback").insert(data).execute()
    return result.data[0] if result.data else {}
