from fastapi import APIRouter, HTTPException, status, Depends
from pydantic import BaseModel
from datetime import datetime
from typing import Optional, Dict, Any, List
from app.core.security import verify_token
from app.core.logging import setup_logging
from app.services.pam.nodes.you_node import you_node

router = APIRouter()
logger = setup_logging()

class CalendarEventRequest(BaseModel):
    title: str
    description: Optional[str] = ""
    start_time: str  # ISO format datetime
    duration_hours: Optional[float] = 1.0
    location: Optional[str] = ""
    event_type: Optional[str] = "general"

class ProfileUpdateRequest(BaseModel):
    travel_style: Optional[str] = None
    budget_preferences: Optional[Dict[str, Any]] = None
    location: Optional[str] = None
    vehicle_info: Optional[Dict[str, Any]] = None
    interests: Optional[List[str]] = None

class PreferencesRequest(BaseModel):
    display: Optional[Dict[str, Any]] = None
    notifications: Optional[Dict[str, Any]] = None
    privacy: Optional[Dict[str, Any]] = None
    travel: Optional[Dict[str, Any]] = None

class MaintenanceReminderRequest(BaseModel):
    item_type: str  # vehicle, equipment, etc.
    item_name: str
    maintenance_type: str  # service, inspection, etc.
    due_date: Optional[str] = None
    current_reading: Optional[int] = None
    interval: Optional[int] = None

@router.post("/calendar/events")
async def create_calendar_event(
    request: CalendarEventRequest,
    user_id: str = Depends(verify_token)
):
    """Create a new calendar event"""
    try:
        event_data = request.dict()
        result = await you_node.create_calendar_event(user_id, event_data)
        return result
        
    except Exception as e:
        logger.error(f"Error creating calendar event: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error creating calendar event"
        )

@router.get("/calendar/events")
async def get_calendar_events(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    event_type: Optional[str] = None,
    user_id: str = Depends(verify_token)
):
    """Get calendar events for a date range"""
    try:
        # Get upcoming events (simplified for now)
        upcoming_events = await you_node._get_upcoming_events(user_id, days=30)
        
        return {
            "success": True,
            "data": {
                "events": [event.__dict__ for event in upcoming_events],
                "total_events": len(upcoming_events)
            },
            "message": f"Retrieved {len(upcoming_events)} calendar events"
        }
        
    except Exception as e:
        logger.error(f"Error getting calendar events: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error getting calendar events"
        )

@router.put("/profile")
async def update_user_profile(
    request: ProfileUpdateRequest,
    user_id: str = Depends(verify_token)
):
    """Update user profile information"""
    try:
        profile_data = {k: v for k, v in request.dict().items() if v is not None}
        result = await you_node.update_user_profile(user_id, profile_data)
        return result
        
    except Exception as e:
        logger.error(f"Error updating profile: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error updating user profile"
        )

@router.get("/profile")
async def get_user_profile(
    user_id: str = Depends(verify_token)
):
    """Get user profile information"""
    try:
        # TODO: Implement actual profile retrieval
        return {
            "success": True,
            "data": {
                "user_id": user_id,
                "travel_style": "budget",
                "current_location": "Brisbane, QLD",
                "vehicle_info": {
                    "type": "motorhome",
                    "make": "Ford",
                    "model": "Transit"
                },
                "interests": ["photography", "hiking", "local_food"],
                "profile_completeness": 0.75
            },
            "message": "User profile retrieved"
        }
        
    except Exception as e:
        logger.error(f"Error getting profile: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error getting user profile"
        )

@router.put("/preferences")
async def set_user_preferences(
    request: PreferencesRequest,
    user_id: str = Depends(verify_token)
):
    """Set or update user preferences"""
    try:
        preferences = {k: v for k, v in request.dict().items() if v is not None}
        result = await you_node.set_user_preferences(user_id, preferences)
        return result
        
    except Exception as e:
        logger.error(f"Error setting preferences: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error setting user preferences"
        )

@router.get("/dashboard")
async def get_personalized_dashboard(
    user_id: str = Depends(verify_token)
):
    """Get personalized dashboard view"""
    try:
        result = await you_node.get_personalized_dashboard(user_id)
        return result
        
    except Exception as e:
        logger.error(f"Error getting dashboard: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error getting personalized dashboard"
        )

@router.post("/maintenance/reminders")
async def schedule_maintenance_reminder(
    request: MaintenanceReminderRequest,
    user_id: str = Depends(verify_token)
):
    """Schedule vehicle or equipment maintenance reminders"""
    try:
        maintenance_data = request.dict()
        result = await you_node.schedule_maintenance_reminder(user_id, maintenance_data)
        return result
        
    except Exception as e:
        logger.error(f"Error scheduling maintenance: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error scheduling maintenance reminder"
        )

@router.get("/timeline")
async def get_travel_timeline(
    timeframe: Optional[str] = "month",
    user_id: str = Depends(verify_token)
):
    """Get user's travel timeline and itinerary"""
    try:
        result = await you_node.get_travel_timeline(user_id, timeframe)
        return result
        
    except Exception as e:
        logger.error(f"Error getting travel timeline: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error getting travel timeline"
        )

@router.get("/insights")
async def get_personal_insights(
    category: Optional[str] = None,
    period: Optional[str] = "week",
    user_id: str = Depends(verify_token)
):
    """Get personalized insights and recommendations"""
    try:
        insights = await you_node._generate_personal_insights(user_id)
        
        # Filter by category if specified
        if category:
            insights = [i for i in insights if i.get("type") == category]
        
        return {
            "success": True,
            "data": {
                "insights": insights,
                "period": period,
                "total_insights": len(insights)
            },
            "message": f"Generated {len(insights)} personal insights"
        }
        
    except Exception as e:
        logger.error(f"Error getting insights: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error getting personal insights"
        )

@router.get("/quick-actions")
async def get_quick_actions(
    user_id: str = Depends(verify_token)
):
    """Get personalized quick actions based on user patterns"""
    try:
        quick_actions = await you_node._get_personalized_quick_actions(user_id)
        
        return {
            "success": True,
            "data": {
                "quick_actions": quick_actions,
                "total_actions": len(quick_actions)
            },
            "message": f"Retrieved {len(quick_actions)} quick actions"
        }
        
    except Exception as e:
        logger.error(f"Error getting quick actions: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error getting quick actions"
        )

@router.get("/notifications")
async def get_pending_notifications(
    priority: Optional[str] = None,
    user_id: str = Depends(verify_token)
):
    """Get pending notifications for user"""
    try:
        notifications = await you_node._get_pending_notifications(user_id)
        
        # Filter by priority if specified
        if priority:
            notifications = [n for n in notifications if n.get("priority") == priority]
        
        return {
            "success": True,
            "data": {
                "notifications": notifications,
                "unread_count": len([n for n in notifications if not n.get("read", False)]),
                "high_priority_count": len([n for n in notifications if n.get("priority") == "high"])
            },
            "message": f"Retrieved {len(notifications)} notifications"
        }
        
    except Exception as e:
        logger.error(f"Error getting notifications: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error getting notifications"
        )

@router.put("/notifications/{notification_id}/read")
async def mark_notification_read(
    notification_id: str,
    user_id: str = Depends(verify_token)
):
    """Mark a notification as read"""
    try:
        # TODO: Implement actual notification marking
        return {
            "success": True,
            "data": {
                "notification_id": notification_id,
                "marked_read": True
            },
            "message": "Notification marked as read"
        }
        
    except Exception as e:
        logger.error(f"Error marking notification read: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error marking notification as read"
        )
