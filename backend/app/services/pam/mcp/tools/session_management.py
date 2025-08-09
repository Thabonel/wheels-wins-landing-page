"""
Session Management Tools - Full control over user sessions and chat sessions
"""
from typing import Any, Dict, List, Optional
from datetime import datetime, timedelta
from langchain_core.tools import tool
from app.services.pam.database.unified_database_service import get_pam_database_service
from app.core.logging import get_logger
import uuid

logger = get_logger("pam_session_tools")


@tool
async def pam_create_chat_session(
    user_id: str,
    session_type: str = "conversation",
    metadata: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """
    Create a new chat session for a user.
    
    Args:
        user_id: User ID
        session_type: Type of session ('conversation', 'support', 'planning')
        metadata: Optional session metadata
    
    Returns:
        Created session details
    """
    try:
        db = await get_pam_database_service()
        table = await db.get_table("chat_sessions")
        
        session_id = str(uuid.uuid4())
        
        session_data = {
            "session_id": session_id,
            "user_id": user_id,
            "session_type": session_type,
            "status": "active",
            "started_at": datetime.utcnow().isoformat(),
            "metadata": metadata or {},
            "message_count": 0
        }
        
        result = await table.create(session_data)
        
        if result.get("success"):
            logger.info(f"Created chat session {session_id} for user {user_id}")
            
            # Also create PAM conversation session
            pam_session_table = await db.get_table("pam_conversation_sessions")
            pam_session = {
                "session_id": session_id,
                "user_id": user_id,
                "context": {"session_type": session_type},
                "created_at": datetime.utcnow().isoformat(),
                "last_activity": datetime.utcnow().isoformat()
            }
            await pam_session_table.create(pam_session)
            
            return {
                "success": True,
                "session_id": session_id,
                "data": result.get("data")
            }
        else:
            return {"success": False, "error": result.get("error")}
            
    except Exception as e:
        logger.error(f"Failed to create chat session: {e}")
        return {"success": False, "error": str(e)}


@tool
async def pam_update_chat_session(
    session_id: str,
    status: Optional[str] = None,
    metadata_update: Optional[Dict[str, Any]] = None,
    increment_message_count: bool = False
) -> Dict[str, Any]:
    """
    Update an existing chat session.
    
    Args:
        session_id: Session ID to update
        status: New status ('active', 'paused', 'ended')
        metadata_update: Metadata to merge with existing
        increment_message_count: Whether to increment message count
    
    Returns:
        Updated session details
    """
    try:
        db = await get_pam_database_service()
        table = await db.get_table("chat_sessions")
        
        # Get current session
        current = await table.read(filters={"session_id": session_id}, limit=1)
        if not current.get("success") or not current.get("data"):
            return {"success": False, "error": "Session not found"}
        
        session = current.get("data")[0]
        update_data = {}
        
        if status:
            update_data["status"] = status
            if status == "ended":
                update_data["ended_at"] = datetime.utcnow().isoformat()
        
        if metadata_update:
            current_metadata = session.get("metadata", {})
            current_metadata.update(metadata_update)
            update_data["metadata"] = current_metadata
        
        if increment_message_count:
            update_data["message_count"] = session.get("message_count", 0) + 1
        
        update_data["last_activity"] = datetime.utcnow().isoformat()
        
        result = await table.update(
            filters={"session_id": session_id},
            data=update_data
        )
        
        # Update PAM conversation session
        pam_session_table = await db.get_table("pam_conversation_sessions")
        await pam_session_table.update(
            filters={"session_id": session_id},
            data={"last_activity": datetime.utcnow().isoformat()}
        )
        
        if result.get("success"):
            return {
                "success": True,
                "session_id": session_id,
                "updated": update_data
            }
        else:
            return {"success": False, "error": result.get("error")}
            
    except Exception as e:
        logger.error(f"Failed to update chat session: {e}")
        return {"success": False, "error": str(e)}


@tool
async def pam_manage_user_session(
    user_id: str,
    action: str,
    session_data: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """
    Manage user active sessions (create, refresh, end).
    
    Args:
        user_id: User ID
        action: Action to perform ('create', 'refresh', 'end', 'check')
        session_data: Optional session data for create action
    
    Returns:
        Session management result
    """
    try:
        db = await get_pam_database_service()
        table = await db.get_table("user_active_sessions")
        
        if action == "create":
            # End any existing sessions first
            await table.update(
                filters={"user_id": user_id, "status": "active"},
                data={"status": "ended", "ended_at": datetime.utcnow().isoformat()}
            )
            
            # Create new session
            session = {
                "user_id": user_id,
                "session_token": str(uuid.uuid4()),
                "status": "active",
                "started_at": datetime.utcnow().isoformat(),
                "last_activity": datetime.utcnow().isoformat(),
                "expires_at": (datetime.utcnow() + timedelta(hours=24)).isoformat(),
                "metadata": session_data or {}
            }
            
            result = await table.create(session)
            
            if result.get("success"):
                return {
                    "success": True,
                    "action": "created",
                    "session_token": session["session_token"],
                    "data": result.get("data")
                }
            else:
                return {"success": False, "error": result.get("error")}
        
        elif action == "refresh":
            # Update last activity and extend expiration
            result = await table.update(
                filters={"user_id": user_id, "status": "active"},
                data={
                    "last_activity": datetime.utcnow().isoformat(),
                    "expires_at": (datetime.utcnow() + timedelta(hours=24)).isoformat()
                }
            )
            
            return {
                "success": result.get("success"),
                "action": "refreshed",
                "count": result.get("count", 0)
            }
        
        elif action == "end":
            # End active sessions
            result = await table.update(
                filters={"user_id": user_id, "status": "active"},
                data={
                    "status": "ended",
                    "ended_at": datetime.utcnow().isoformat()
                }
            )
            
            return {
                "success": result.get("success"),
                "action": "ended",
                "count": result.get("count", 0)
            }
        
        elif action == "check":
            # Check for active sessions
            result = await table.read(
                filters={
                    "user_id": user_id,
                    "status": "active",
                    "expires_at": {"gt": datetime.utcnow().isoformat()}
                }
            )
            
            if result.get("success"):
                active_sessions = result.get("data", [])
                return {
                    "success": True,
                    "action": "checked",
                    "has_active_session": len(active_sessions) > 0,
                    "session_count": len(active_sessions),
                    "sessions": active_sessions
                }
            else:
                return {"success": False, "error": result.get("error")}
        
        else:
            return {"success": False, "error": f"Unknown action: {action}"}
            
    except Exception as e:
        logger.error(f"Failed to manage user session: {e}")
        return {"success": False, "error": str(e)}


@tool
async def pam_get_session_analytics(
    user_id: Optional[str] = None,
    date_range: Optional[Dict[str, str]] = None
) -> Dict[str, Any]:
    """
    Get session analytics and insights.
    
    Args:
        user_id: Optional user ID for user-specific analytics
        date_range: Optional date range {'start': 'YYYY-MM-DD', 'end': 'YYYY-MM-DD'}
    
    Returns:
        Session analytics data
    """
    try:
        db = await get_pam_database_service()
        
        # Default date range to last 7 days
        if not date_range:
            end_date = datetime.utcnow()
            start_date = end_date - timedelta(days=7)
            date_range = {
                "start": start_date.isoformat(),
                "end": end_date.isoformat()
            }
        
        # Get chat sessions
        chat_table = await db.get_table("chat_sessions")
        filters = {}
        if user_id:
            filters["user_id"] = user_id
        
        chat_sessions = await chat_table.read(filters=filters)
        
        if not chat_sessions.get("success"):
            return {"success": False, "error": "Failed to fetch chat sessions"}
        
        sessions = chat_sessions.get("data", [])
        
        # Filter by date range
        filtered_sessions = []
        for session in sessions:
            started_at = session.get("started_at", "")
            if started_at and date_range["start"] <= started_at <= date_range["end"]:
                filtered_sessions.append(session)
        
        # Calculate analytics
        analytics = {
            "date_range": date_range,
            "total_sessions": len(filtered_sessions),
            "active_sessions": len([s for s in filtered_sessions if s.get("status") == "active"]),
            "completed_sessions": len([s for s in filtered_sessions if s.get("status") == "ended"]),
            "average_message_count": 0,
            "session_types": {},
            "user_engagement": {},
            "peak_hours": {str(h): 0 for h in range(24)}
        }
        
        total_messages = 0
        unique_users = set()
        
        for session in filtered_sessions:
            # Message count
            message_count = session.get("message_count", 0)
            total_messages += message_count
            
            # Session types
            session_type = session.get("session_type", "unknown")
            analytics["session_types"][session_type] = \
                analytics["session_types"].get(session_type, 0) + 1
            
            # User tracking
            user = session.get("user_id")
            if user:
                unique_users.add(user)
                if user not in analytics["user_engagement"]:
                    analytics["user_engagement"][user] = {
                        "session_count": 0,
                        "total_messages": 0
                    }
                analytics["user_engagement"][user]["session_count"] += 1
                analytics["user_engagement"][user]["total_messages"] += message_count
            
            # Peak hours
            started_at = session.get("started_at", "")
            if started_at:
                try:
                    hour = datetime.fromisoformat(started_at.replace("Z", "+00:00")).hour
                    analytics["peak_hours"][str(hour)] += 1
                except:
                    pass
        
        # Calculate averages
        if filtered_sessions:
            analytics["average_message_count"] = total_messages / len(filtered_sessions)
        
        analytics["unique_users"] = len(unique_users)
        
        # Find peak usage hour
        peak_hour = max(analytics["peak_hours"].items(), key=lambda x: x[1])
        analytics["peak_usage_hour"] = {
            "hour": peak_hour[0],
            "session_count": peak_hour[1]
        }
        
        return {
            "success": True,
            "analytics": analytics,
            "session_count": len(filtered_sessions)
        }
        
    except Exception as e:
        logger.error(f"Failed to get session analytics: {e}")
        return {"success": False, "error": str(e)}


@tool
async def pam_clean_expired_sessions() -> Dict[str, Any]:
    """
    Clean up expired sessions from the database.
    
    Returns:
        Cleanup results
    """
    try:
        db = await get_pam_database_service()
        
        current_time = datetime.utcnow().isoformat()
        results = {}
        
        # Clean expired user sessions
        user_sessions_table = await db.get_table("user_active_sessions")
        expired_user = await user_sessions_table.update(
            filters={
                "status": "active",
                "expires_at": {"lt": current_time}
            },
            data={
                "status": "expired",
                "ended_at": current_time
            }
        )
        
        results["user_sessions_expired"] = expired_user.get("count", 0)
        
        # Clean old chat sessions (older than 30 days and ended)
        chat_table = await db.get_table("chat_sessions")
        cutoff_date = (datetime.utcnow() - timedelta(days=30)).isoformat()
        
        old_chats = await chat_table.read(
            filters={
                "status": "ended",
                "ended_at": {"lt": cutoff_date}
            }
        )
        
        if old_chats.get("success"):
            # Archive or delete old sessions
            results["chat_sessions_to_archive"] = len(old_chats.get("data", []))
        
        return {
            "success": True,
            "results": results,
            "cleaned_at": current_time
        }
        
    except Exception as e:
        logger.error(f"Failed to clean expired sessions: {e}")
        return {"success": False, "error": str(e)}