"""
Life Transition Navigator API Endpoints

Provides CRUD operations for:
- Transition profiles
- Transition tasks
- Transition timeline
- Transition financial buckets
- Dashboard statistics
"""

from fastapi import APIRouter, HTTPException, Depends
from typing import List, Optional, Dict, Any
from datetime import datetime, date, timedelta
from pydantic import BaseModel, Field
from app.core.auth import get_current_user
from supabase import create_client, Client
import os
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/transition", tags=["transition"])

# Supabase client factory (dependency injection pattern to prevent import-time failures)
def get_supabase_client() -> Client:
    """Create Supabase client with proper error handling."""
    try:
        from app.core.config import settings
        supabase_url = str(settings.SUPABASE_URL)
        service_role_key = settings.SUPABASE_SERVICE_ROLE_KEY.get_secret_value()
        return create_client(supabase_url, service_role_key)
    except Exception:
        # Fallback to environment variables for compatibility
        supabase_url = os.getenv("SUPABASE_URL")
        service_role_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

        if not supabase_url:
            raise ValueError("SUPABASE_URL environment variable is required")
        if not service_role_key:
            raise ValueError("SUPABASE_SERVICE_ROLE_KEY environment variable is required")

        return create_client(supabase_url, service_role_key)

# Global client instance (initialized lazily)
_supabase_client: Optional[Client] = None

def supabase() -> Client:
    """Get cached Supabase client instance."""
    global _supabase_client
    if _supabase_client is None:
        _supabase_client = get_supabase_client()
    return _supabase_client

# ============================================================================
# PYDANTIC MODELS (Request/Response)
# ============================================================================

class TransitionProfileCreate(BaseModel):
    departure_date: date
    transition_type: str = Field(..., pattern="^(full_time|part_time|seasonal|exploring)$")
    motivation: Optional[str] = None
    concerns: Optional[List[str]] = []

class TransitionProfileUpdate(BaseModel):
    departure_date: Optional[date] = None
    current_phase: Optional[str] = Field(None, pattern="^(planning|preparing|launching|on_road)$")
    transition_type: Optional[str] = Field(None, pattern="^(full_time|part_time|seasonal|exploring)$")
    motivation: Optional[str] = None
    concerns: Optional[List[str]] = None
    is_enabled: Optional[bool] = None
    auto_hide_after_departure: Optional[bool] = None
    hide_days_after_departure: Optional[int] = None

class TaskCreate(BaseModel):
    title: str
    description: Optional[str] = None
    category: str = Field(..., pattern="^(financial|vehicle|life|downsizing|equipment|legal|social|custom)$")
    priority: str = Field("medium", pattern="^(low|medium|high|critical)$")
    milestone: Optional[str] = None
    days_before_departure: Optional[int] = None
    checklist_items: Optional[List[Dict[str, Any]]] = []

class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = Field(None, pattern="^(financial|vehicle|life|downsizing|equipment|legal|social|custom)$")
    priority: Optional[str] = Field(None, pattern="^(low|medium|high|critical)$")
    is_completed: Optional[bool] = None
    milestone: Optional[str] = None
    days_before_departure: Optional[int] = None
    checklist_items: Optional[List[Dict[str, Any]]] = None

class MilestoneCreate(BaseModel):
    milestone_type: str = Field(..., pattern="^(planning_start|three_months|one_month|one_week|departure|first_night|one_month_road|custom)$")
    milestone_name: str
    milestone_date: date
    celebration_message: Optional[str] = None

class MilestoneUpdate(BaseModel):
    milestone_name: Optional[str] = None
    milestone_date: Optional[date] = None
    is_completed: Optional[bool] = None
    celebration_message: Optional[str] = None

class FinancialItemCreate(BaseModel):
    bucket_type: str = Field(..., pattern="^(transition|emergency|travel)$")
    category: str
    subcategory: Optional[str] = None
    estimated_amount: float = Field(..., gt=0)
    current_amount: float = Field(0, ge=0)
    priority: str = Field("medium", pattern="^(low|medium|high|critical)$")
    notes: Optional[str] = None
    due_date: Optional[date] = None

class FinancialItemUpdate(BaseModel):
    category: Optional[str] = None
    subcategory: Optional[str] = None
    estimated_amount: Optional[float] = Field(None, gt=0)
    current_amount: Optional[float] = Field(None, ge=0)
    priority: Optional[str] = Field(None, pattern="^(low|medium|high|critical)$")
    notes: Optional[str] = None
    due_date: Optional[date] = None

class RoomCreate(BaseModel):
    name: str
    room_type: str = Field(..., pattern="^(living_room|bedroom|kitchen|bathroom|garage|storage|office|other|custom)$")

class RoomUpdate(BaseModel):
    name: Optional[str] = None
    room_type: Optional[str] = Field(None, pattern="^(living_room|bedroom|kitchen|bathroom|garage|storage|office|other|custom)$")
    status: Optional[str] = Field(None, pattern="^(not_started|in_progress|completed)$")

class ItemCreate(BaseModel):
    room_id: str
    name: str
    description: Optional[str] = None
    category: Optional[str] = None
    estimated_value: Optional[float] = Field(None, ge=0)
    emotional_difficulty: Optional[int] = Field(None, ge=1, le=5)
    photo_url: Optional[str] = None
    notes: Optional[str] = None

class ItemUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    decision: Optional[str] = Field(None, pattern="^(keep|sell|donate|store|trash|parking_lot)$")
    estimated_value: Optional[float] = Field(None, ge=0)
    emotional_difficulty: Optional[int] = Field(None, ge=1, le=5)
    photo_url: Optional[str] = None
    notes: Optional[str] = None

class ServiceCreate(BaseModel):
    service_type: str = Field(..., pattern="^(cancellation|consolidation|digitization)$")
    service_name: str
    category: str
    provider: Optional[str] = None
    account_number: Optional[str] = None
    cancellation_target_date: Optional[date] = None
    old_account_info: Optional[str] = None
    new_account_info: Optional[str] = None
    consolidation_status: Optional[str] = Field(None, pattern="^(pending|in_progress|completed)$")
    documents_total: Optional[int] = Field(0, ge=0)
    priority: str = Field("medium", pattern="^(low|medium|high|critical)$")
    notes: Optional[str] = None

class ServiceUpdate(BaseModel):
    service_name: Optional[str] = None
    category: Optional[str] = None
    provider: Optional[str] = None
    account_number: Optional[str] = None
    cancellation_target_date: Optional[date] = None
    cancellation_completed: Optional[bool] = None
    old_account_info: Optional[str] = None
    new_account_info: Optional[str] = None
    consolidation_status: Optional[str] = Field(None, pattern="^(pending|in_progress|completed)$")
    documents_total: Optional[int] = Field(None, ge=0)
    documents_scanned: Optional[int] = Field(None, ge=0)
    storage_location: Optional[str] = None
    status: Optional[str] = Field(None, pattern="^(pending|in_progress|completed|cancelled)$")
    priority: Optional[str] = Field(None, pattern="^(low|medium|high|critical)$")
    notes: Optional[str] = None

class IncomeStreamCreate(BaseModel):
    stream_name: str
    income_type: str = Field(..., pattern="^(remote_work|freelance|passive|seasonal)$")
    monthly_estimate: float = Field(0, ge=0)
    status: str = Field("planning", pattern="^(planning|setting_up|active|paused|discontinued)$")
    setup_checklist: Optional[List[Dict[str, Any]]] = []
    resources: Optional[List[Dict[str, str]]] = []
    notes: Optional[str] = None
    priority: str = Field("medium", pattern="^(low|medium|high|critical)$")

class IncomeStreamUpdate(BaseModel):
    stream_name: Optional[str] = None
    income_type: Optional[str] = Field(None, pattern="^(remote_work|freelance|passive|seasonal)$")
    monthly_estimate: Optional[float] = Field(None, ge=0)
    actual_monthly: Optional[float] = Field(None, ge=0)
    status: Optional[str] = Field(None, pattern="^(planning|setting_up|active|paused|discontinued)$")
    setup_checklist: Optional[List[Dict[str, Any]]] = None
    setup_completed: Optional[bool] = None
    resources: Optional[List[Dict[str, str]]] = None
    notes: Optional[str] = None
    priority: Optional[str] = Field(None, pattern="^(low|medium|high|critical)$")

# ============================================================================
# PROFILE ENDPOINTS
# ============================================================================

@router.get("/profile")
async def get_profile(current_user = Depends(get_current_user)):
    """Get user's transition profile"""
    try:
        result = supabase().table("transition_profiles").select("*").eq("user_id", current_user["id"]).maybe_single().execute()

        if not result.data:
            raise HTTPException(status_code=404, detail="Transition profile not found")

        return result.data
    except Exception as e:
        logger.error(f"Error fetching transition profile: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/profile")
async def create_profile(profile: TransitionProfileCreate, current_user = Depends(get_current_user)):
    """Create a new transition profile"""
    try:
        # Check if profile already exists
        existing = supabase().table("transition_profiles").select("id").eq("user_id", current_user["id"]).maybe_single().execute()

        if existing.data:
            raise HTTPException(status_code=400, detail="Transition profile already exists")

        # Create profile
        new_profile = {
            "user_id": current_user["id"],
            "departure_date": profile.departure_date.isoformat(),
            "transition_type": profile.transition_type,
            "motivation": profile.motivation,
            "concerns": profile.concerns or [],
        }

        result = supabase().table("transition_profiles").insert(new_profile).execute()

        if not result.data:
            raise HTTPException(status_code=500, detail="Failed to create profile")

        created_profile = result.data[0]

        # Create default tasks for the user
        try:
            supabase().rpc("create_default_transition_tasks", {
                "p_profile_id": created_profile["id"],
                "p_user_id": current_user["id"],
                "p_departure_date": profile.departure_date.isoformat()
            }).execute()
        except Exception as e:
            logger.warning(f"Failed to create default tasks: {e}")

        return created_profile
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating transition profile: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/profile")
async def update_profile(profile: TransitionProfileUpdate, current_user = Depends(get_current_user)):
    """Update transition profile"""
    try:
        updates = {k: v for k, v in profile.dict(exclude_unset=True).items()}

        if not updates:
            raise HTTPException(status_code=400, detail="No fields to update")

        # Convert date to ISO string if present
        if "departure_date" in updates:
            updates["departure_date"] = updates["departure_date"].isoformat()

        result = supabase().table("transition_profiles").update(updates).eq("user_id", current_user["id"]).execute()

        if not result.data:
            raise HTTPException(status_code=404, detail="Transition profile not found")

        return result.data[0]
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating transition profile: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/profile")
async def delete_profile(current_user = Depends(get_current_user)):
    """Delete transition profile (archives it)"""
    try:
        result = supabase().table("transition_profiles").update({
            "archived_at": datetime.utcnow().isoformat()
        }).eq("user_id", current_user["id"]).execute()

        if not result.data:
            raise HTTPException(status_code=404, detail="Transition profile not found")

        return {"message": "Transition profile archived successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error archiving transition profile: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ============================================================================
# TASKS ENDPOINTS
# ============================================================================

@router.get("/tasks")
async def get_tasks(
    category: Optional[str] = None,
    is_completed: Optional[bool] = None,
    current_user = Depends(get_current_user)
):
    """Get all transition tasks for user"""
    try:
        # Get profile first
        profile_result = supabase().table("transition_profiles").select("id").eq("user_id", current_user["id"]).maybe_single().execute()

        if not profile_result.data:
            return []

        query = supabase().table("transition_tasks").select("*").eq("profile_id", profile_result.data["id"])

        if category:
            query = query.eq("category", category)
        if is_completed is not None:
            query = query.eq("is_completed", is_completed)

        result = query.order("priority", desc=True).order("created_at").execute()

        return result.data or []
    except Exception as e:
        logger.error(f"Error fetching transition tasks: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/tasks")
async def create_task(task: TaskCreate, current_user = Depends(get_current_user)):
    """Create a new transition task"""
    try:
        # Get profile
        profile_result = supabase().table("transition_profiles").select("id").eq("user_id", current_user["id"]).maybe_single().execute()

        if not profile_result.data:
            raise HTTPException(status_code=404, detail="Transition profile not found")

        new_task = {
            "profile_id": profile_result.data["id"],
            "user_id": current_user["id"],
            **task.dict(),
        }

        result = supabase().table("transition_tasks").insert(new_task).execute()

        if not result.data:
            raise HTTPException(status_code=500, detail="Failed to create task")

        return result.data[0]
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating transition task: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/tasks/{task_id}")
async def update_task(task_id: str, task: TaskUpdate, current_user = Depends(get_current_user)):
    """Update a transition task"""
    try:
        updates = {k: v for k, v in task.dict(exclude_unset=True).items()}

        if not updates:
            raise HTTPException(status_code=400, detail="No fields to update")

        # Add completion timestamp if marking as completed
        if updates.get("is_completed") is True:
            updates["completed_at"] = datetime.utcnow().isoformat()
        elif updates.get("is_completed") is False:
            updates["completed_at"] = None

        result = supabase().table("transition_tasks").update(updates).eq("id", task_id).eq("user_id", current_user["id"]).execute()

        if not result.data:
            raise HTTPException(status_code=404, detail="Task not found")

        return result.data[0]
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating transition task: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/tasks/{task_id}")
async def delete_task(task_id: str, current_user = Depends(get_current_user)):
    """Delete a transition task"""
    try:
        result = supabase().table("transition_tasks").delete().eq("id", task_id).eq("user_id", current_user["id"]).execute()

        if not result.data:
            raise HTTPException(status_code=404, detail="Task not found")

        return {"message": "Task deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting transition task: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ============================================================================
# TIMELINE ENDPOINTS
# ============================================================================

@router.get("/timeline")
async def get_timeline(current_user = Depends(get_current_user)):
    """Get transition timeline milestones"""
    try:
        # Get profile
        profile_result = supabase().table("transition_profiles").select("id").eq("user_id", current_user["id"]).maybe_single().execute()

        if not profile_result.data:
            return []

        result = supabase().table("transition_timeline").select("*").eq("profile_id", profile_result.data["id"]).order("milestone_date").execute()

        return result.data or []
    except Exception as e:
        logger.error(f"Error fetching transition timeline: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/timeline")
async def create_milestone(milestone: MilestoneCreate, current_user = Depends(get_current_user)):
    """Create a new timeline milestone"""
    try:
        # Get profile
        profile_result = supabase().table("transition_profiles").select("id").eq("user_id", current_user["id"]).maybe_single().execute()

        if not profile_result.data:
            raise HTTPException(status_code=404, detail="Transition profile not found")

        new_milestone = {
            "profile_id": profile_result.data["id"],
            "user_id": current_user["id"],
            "milestone_type": milestone.milestone_type,
            "milestone_name": milestone.milestone_name,
            "milestone_date": milestone.milestone_date.isoformat(),
            "celebration_message": milestone.celebration_message,
            "is_system_milestone": False,  # Custom milestones are not system milestones
        }

        result = supabase().table("transition_timeline").insert(new_milestone).execute()

        if not result.data:
            raise HTTPException(status_code=500, detail="Failed to create milestone")

        return result.data[0]
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating transition milestone: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/timeline/{milestone_id}")
async def update_milestone(milestone_id: str, milestone: MilestoneUpdate, current_user = Depends(get_current_user)):
    """Update a timeline milestone"""
    try:
        updates = {k: v for k, v in milestone.dict(exclude_unset=True).items()}

        if not updates:
            raise HTTPException(status_code=400, detail="No fields to update")

        # Convert date to ISO string if present
        if "milestone_date" in updates:
            updates["milestone_date"] = updates["milestone_date"].isoformat()

        # Add completion timestamp if marking as completed
        if updates.get("is_completed") is True:
            updates["completed_at"] = datetime.utcnow().isoformat()
        elif updates.get("is_completed") is False:
            updates["completed_at"] = None

        result = supabase().table("transition_timeline").update(updates).eq("id", milestone_id).eq("user_id", current_user["id"]).execute()

        if not result.data:
            raise HTTPException(status_code=404, detail="Milestone not found")

        return result.data[0]
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating transition milestone: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/timeline/{milestone_id}")
async def delete_milestone(milestone_id: str, current_user = Depends(get_current_user)):
    """Delete a timeline milestone"""
    try:
        result = supabase().table("transition_timeline").delete().eq("id", milestone_id).eq("user_id", current_user["id"]).execute()

        if not result.data:
            raise HTTPException(status_code=404, detail="Milestone not found")

        return {"message": "Milestone deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting transition milestone: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ============================================================================
# FINANCIAL ENDPOINTS
# ============================================================================

@router.get("/financial")
async def get_financial_items(
    bucket_type: Optional[str] = None,
    current_user = Depends(get_current_user)
):
    """Get transition financial items"""
    try:
        # Get profile
        profile_result = supabase().table("transition_profiles").select("id").eq("user_id", current_user["id"]).maybe_single().execute()

        if not profile_result.data:
            return []

        query = supabase().table("transition_financial").select("*").eq("profile_id", profile_result.data["id"])

        if bucket_type:
            query = query.eq("bucket_type", bucket_type)

        result = query.order("bucket_type").order("category").execute()

        return result.data or []
    except Exception as e:
        logger.error(f"Error fetching transition financial items: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/financial")
async def create_financial_item(item: FinancialItemCreate, current_user = Depends(get_current_user)):
    """Create a new financial item"""
    try:
        # Get profile
        profile_result = supabase().table("transition_profiles").select("id").eq("user_id", current_user["id"]).maybe_single().execute()

        if not profile_result.data:
            raise HTTPException(status_code=404, detail="Transition profile not found")

        new_item = {
            "profile_id": profile_result.data["id"],
            "user_id": current_user["id"],
            **item.dict(),
        }

        # Convert date to ISO string if present
        if new_item.get("due_date"):
            new_item["due_date"] = new_item["due_date"].isoformat()

        result = supabase().table("transition_financial").insert(new_item).execute()

        if not result.data:
            raise HTTPException(status_code=500, detail="Failed to create financial item")

        return result.data[0]
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating transition financial item: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/financial/{item_id}")
async def update_financial_item(item_id: str, item: FinancialItemUpdate, current_user = Depends(get_current_user)):
    """Update a financial item"""
    try:
        updates = {k: v for k, v in item.dict(exclude_unset=True).items()}

        if not updates:
            raise HTTPException(status_code=400, detail="No fields to update")

        # Convert date to ISO string if present
        if "due_date" in updates and updates["due_date"]:
            updates["due_date"] = updates["due_date"].isoformat()

        result = supabase().table("transition_financial").update(updates).eq("id", item_id).eq("user_id", current_user["id"]).execute()

        if not result.data:
            raise HTTPException(status_code=404, detail="Financial item not found")

        return result.data[0]
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating transition financial item: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/financial/{item_id}")
async def delete_financial_item(item_id: str, current_user = Depends(get_current_user)):
    """Delete a financial item"""
    try:
        result = supabase().table("transition_financial").delete().eq("id", item_id).eq("user_id", current_user["id"]).execute()

        if not result.data:
            raise HTTPException(status_code=404, detail="Financial item not found")

        return {"message": "Financial item deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting transition financial item: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ============================================================================
# DASHBOARD STATS ENDPOINT
# ============================================================================

@router.get("/stats")
async def get_stats(current_user = Depends(get_current_user)):
    """Get transition dashboard statistics"""
    try:
        # Get profile
        profile_result = supabase().table("transition_profiles").select("*").eq("user_id", current_user["id"]).maybe_single().execute()

        if not profile_result.data:
            raise HTTPException(status_code=404, detail="Transition profile not found")

        profile = profile_result.data

        # Calculate days until departure
        departure_date = datetime.fromisoformat(profile["departure_date"])
        days_until_departure = (departure_date.date() - datetime.utcnow().date()).days

        # Get task stats
        tasks_result = supabase().table("transition_tasks").select("is_completed").eq("profile_id", profile["id"]).execute()
        tasks = tasks_result.data or []
        total_tasks = len(tasks)
        completed_tasks = sum(1 for t in tasks if t["is_completed"])

        # Get milestone stats
        milestones_result = supabase().table("transition_timeline").select("is_completed").eq("profile_id", profile["id"]).execute()
        milestones = milestones_result.data or []
        total_milestones = len(milestones)
        completed_milestones = sum(1 for m in milestones if m["is_completed"])

        # Get financial stats
        financial_result = supabase().table("transition_financial").select("estimated_amount,current_amount").eq("profile_id", profile["id"]).execute()
        financial_items = financial_result.data or []
        total_estimated = sum(item["estimated_amount"] for item in financial_items)
        total_funded = sum(item["current_amount"] for item in financial_items)
        funding_percentage = int((total_funded / total_estimated * 100)) if total_estimated > 0 else 0

        return {
            "profile": profile,
            "stats": {
                "total_tasks": total_tasks,
                "completed_tasks": completed_tasks,
                "total_milestones": total_milestones,
                "completed_milestones": completed_milestones,
                "days_until_departure": days_until_departure,
                "total_estimated_cost": total_estimated,
                "total_funded": total_funded,
                "funding_percentage": funding_percentage,
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching transition stats: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ============================================================================
# ROOM INVENTORY ENDPOINTS
# ============================================================================

@router.get("/rooms")
async def get_rooms(current_user = Depends(get_current_user)):
    """Get all rooms for user's transition profile"""
    try:
        # Get profile
        profile_result = supabase().table("transition_profiles").select("id").eq("user_id", current_user["id"]).maybe_single().execute()

        if not profile_result.data:
            return []

        result = supabase().table("transition_rooms").select("*").eq("profile_id", profile_result.data["id"]).order("created_at").execute()

        return result.data or []
    except Exception as e:
        logger.error(f"Error fetching transition rooms: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/rooms")
async def create_room(room: RoomCreate, current_user = Depends(get_current_user)):
    """Create a new room"""
    try:
        # Get profile
        profile_result = supabase().table("transition_profiles").select("id").eq("user_id", current_user["id"]).maybe_single().execute()

        if not profile_result.data:
            raise HTTPException(status_code=404, detail="Transition profile not found")

        new_room = {
            "profile_id": profile_result.data["id"],
            "user_id": current_user["id"],
            **room.dict(),
        }

        result = supabase().table("transition_rooms").insert(new_room).execute()

        if not result.data:
            raise HTTPException(status_code=500, detail="Failed to create room")

        return result.data[0]
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating transition room: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/rooms/{room_id}")
async def update_room(room_id: str, room: RoomUpdate, current_user = Depends(get_current_user)):
    """Update a room"""
    try:
        updates = {k: v for k, v in room.dict(exclude_unset=True).items()}

        if not updates:
            raise HTTPException(status_code=400, detail="No fields to update")

        result = supabase().table("transition_rooms").update(updates).eq("id", room_id).eq("user_id", current_user["id"]).execute()

        if not result.data:
            raise HTTPException(status_code=404, detail="Room not found")

        return result.data[0]
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating transition room: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/rooms/{room_id}")
async def delete_room(room_id: str, current_user = Depends(get_current_user)):
    """Delete a room"""
    try:
        result = supabase().table("transition_rooms").delete().eq("id", room_id).eq("user_id", current_user["id"]).execute()

        if not result.data:
            raise HTTPException(status_code=404, detail="Room not found")

        return {"message": "Room deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting transition room: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ============================================================================
# ROOM ITEMS ENDPOINTS
# ============================================================================

@router.get("/rooms/{room_id}/items")
async def get_room_items(room_id: str, current_user = Depends(get_current_user)):
    """Get all items in a room"""
    try:
        # Verify room belongs to user
        room_result = supabase().table("transition_rooms").select("id").eq("id", room_id).eq("user_id", current_user["id"]).maybe_single().execute()

        if not room_result.data:
            raise HTTPException(status_code=404, detail="Room not found")

        result = supabase().table("transition_items").select("*").eq("room_id", room_id).order("created_at").execute()

        return result.data or []
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching room items: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/items")
async def create_item(item: ItemCreate, current_user = Depends(get_current_user)):
    """Create a new item in a room"""
    try:
        # Get profile
        profile_result = supabase().table("transition_profiles").select("id").eq("user_id", current_user["id"]).maybe_single().execute()

        if not profile_result.data:
            raise HTTPException(status_code=404, detail="Transition profile not found")

        # Verify room belongs to user
        room_result = supabase().table("transition_rooms").select("id").eq("id", item.room_id).eq("user_id", current_user["id"]).maybe_single().execute()

        if not room_result.data:
            raise HTTPException(status_code=404, detail="Room not found")

        new_item = {
            "profile_id": profile_result.data["id"],
            "user_id": current_user["id"],
            **item.dict(),
        }

        result = supabase().table("transition_items").insert(new_item).execute()

        if not result.data:
            raise HTTPException(status_code=500, detail="Failed to create item")

        return result.data[0]
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating transition item: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/items/{item_id}")
async def update_item(item_id: str, item: ItemUpdate, current_user = Depends(get_current_user)):
    """Update an item (including decision)"""
    try:
        updates = {k: v for k, v in item.dict(exclude_unset=True).items()}

        if not updates:
            raise HTTPException(status_code=400, detail="No fields to update")

        # Add decision_date if making a decision
        if "decision" in updates and updates["decision"]:
            updates["decision_date"] = datetime.utcnow().isoformat()
        elif "decision" in updates and not updates["decision"]:
            updates["decision_date"] = None

        result = supabase().table("transition_items").update(updates).eq("id", item_id).eq("user_id", current_user["id"]).execute()

        if not result.data:
            raise HTTPException(status_code=404, detail="Item not found")

        return result.data[0]
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating transition item: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/items/{item_id}")
async def delete_item(item_id: str, current_user = Depends(get_current_user)):
    """Delete an item"""
    try:
        result = supabase().table("transition_items").delete().eq("id", item_id).eq("user_id", current_user["id"]).execute()

        if not result.data:
            raise HTTPException(status_code=404, detail="Item not found")

        return {"message": "Item deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting transition item: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ============================================================================
# DOWNSIZING STATS ENDPOINT
# ============================================================================

@router.get("/downsizing-stats")
async def get_downsizing_stats(current_user = Depends(get_current_user)):
    """Get comprehensive downsizing statistics"""
    try:
        # Get profile
        profile_result = supabase().table("transition_profiles").select("id").eq("user_id", current_user["id"]).maybe_single().execute()

        if not profile_result.data:
            raise HTTPException(status_code=404, detail="Transition profile not found")

        # Call database function for stats
        result = supabase().rpc("get_downsizing_stats", {
            "p_profile_id": profile_result.data["id"]
        }).execute()

        if not result.data or len(result.data) == 0:
            # Return default stats if no data
            return {
                "total_rooms": 0,
                "completed_rooms": 0,
                "total_items": 0,
                "decided_items": 0,
                "keep_count": 0,
                "sell_count": 0,
                "donate_count": 0,
                "store_count": 0,
                "trash_count": 0,
                "parking_lot_count": 0,
                "estimated_sale_value": 0.0,
                "overall_completion": 0,
            }

        return result.data[0]
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching downsizing stats: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ============================================================================
# DIGITAL LIFE SERVICES ENDPOINTS
# ============================================================================

@router.get("/services")
async def get_services(
    service_type: Optional[str] = None,
    current_user = Depends(get_current_user)
):
    """Get all digital life services for user"""
    try:
        # Get profile
        profile_result = supabase().table("transition_profiles").select("id").eq("user_id", current_user["id"]).maybe_single().execute()

        if not profile_result.data:
            return []

        query = supabase().table("transition_services").select("*").eq("profile_id", profile_result.data["id"])

        if service_type:
            query = query.eq("service_type", service_type)

        result = query.order("created_at").execute()

        return result.data or []
    except Exception as e:
        logger.error(f"Error fetching transition services: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/services")
async def create_service(service: ServiceCreate, current_user = Depends(get_current_user)):
    """Create a new digital life service"""
    try:
        # Get profile
        profile_result = supabase().table("transition_profiles").select("id").eq("user_id", current_user["id"]).maybe_single().execute()

        if not profile_result.data:
            raise HTTPException(status_code=404, detail="Transition profile not found")

        new_service = {
            "profile_id": profile_result.data["id"],
            "user_id": current_user["id"],
            **service.dict(),
        }

        # Convert date to ISO string if present
        if new_service.get("cancellation_target_date"):
            new_service["cancellation_target_date"] = new_service["cancellation_target_date"].isoformat()

        result = supabase().table("transition_services").insert(new_service).execute()

        if not result.data:
            raise HTTPException(status_code=500, detail="Failed to create service")

        return result.data[0]
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating transition service: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/services/{service_id}")
async def update_service(service_id: str, service: ServiceUpdate, current_user = Depends(get_current_user)):
    """Update a digital life service"""
    try:
        updates = {k: v for k, v in service.dict(exclude_unset=True).items()}

        if not updates:
            raise HTTPException(status_code=400, detail="No fields to update")

        # Convert date to ISO string if present
        if "cancellation_target_date" in updates and updates["cancellation_target_date"]:
            updates["cancellation_target_date"] = updates["cancellation_target_date"].isoformat()

        # Add cancellation_completed_date if marking as completed
        if updates.get("cancellation_completed") is True:
            updates["cancellation_completed_date"] = datetime.utcnow().date().isoformat()
        elif updates.get("cancellation_completed") is False:
            updates["cancellation_completed_date"] = None

        result = supabase().table("transition_services").update(updates).eq("id", service_id).eq("user_id", current_user["id"]).execute()

        if not result.data:
            raise HTTPException(status_code=404, detail="Service not found")

        return result.data[0]
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating transition service: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/services/{service_id}")
async def delete_service(service_id: str, current_user = Depends(get_current_user)):
    """Delete a digital life service"""
    try:
        result = supabase().table("transition_services").delete().eq("id", service_id).eq("user_id", current_user["id"]).execute()

        if not result.data:
            raise HTTPException(status_code=404, detail="Service not found")

        return {"message": "Service deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting transition service: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/service-stats")
async def get_service_stats(current_user = Depends(get_current_user)):
    """Get digital life service statistics"""
    try:
        # Get profile
        profile_result = supabase().table("transition_profiles").select("id").eq("user_id", current_user["id"]).maybe_single().execute()

        if not profile_result.data:
            raise HTTPException(status_code=404, detail="Transition profile not found")

        # Call database function for stats
        result = supabase().rpc("get_service_stats", {
            "p_profile_id": profile_result.data["id"]
        }).execute()

        if not result.data or len(result.data) == 0:
            # Return default stats if no data
            return {
                "total_cancellations": 0,
                "completed_cancellations": 0,
                "pending_cancellations": 0,
                "total_consolidations": 0,
                "completed_consolidations": 0,
                "pending_consolidations": 0,
                "total_digitizations": 0,
                "documents_scanned": 0,
                "documents_total": 0,
                "digitization_percentage": 0,
            }

        return result.data[0]
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching service stats: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ============================================================================
# INCOME STREAMS ENDPOINTS
# ============================================================================

@router.get("/income-streams")
async def get_income_streams(current_user = Depends(get_current_user)):
    """Get all income streams for user"""
    try:
        # Get profile
        profile_result = supabase().table("transition_profiles").select("id").eq("user_id", current_user["id"]).maybe_single().execute()

        if not profile_result.data:
            return []

        result = supabase().table("income_streams").select("*").eq("profile_id", profile_result.data["id"]).order("created_at").execute()

        return result.data or []
    except Exception as e:
        logger.error(f"Error fetching income streams: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/income-streams")
async def create_income_stream(stream: IncomeStreamCreate, current_user = Depends(get_current_user)):
    """Create a new income stream"""
    try:
        # Get profile
        profile_result = supabase().table("transition_profiles").select("id").eq("user_id", current_user["id"]).maybe_single().execute()

        if not profile_result.data:
            raise HTTPException(status_code=404, detail="Transition profile not found")

        new_stream = {
            "profile_id": profile_result.data["id"],
            "user_id": current_user["id"],
            **stream.dict(),
        }

        result = supabase().table("income_streams").insert(new_stream).execute()

        if not result.data:
            raise HTTPException(status_code=500, detail="Failed to create income stream")

        return result.data[0]
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating income stream: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/income-streams/{stream_id}")
async def update_income_stream(stream_id: str, stream: IncomeStreamUpdate, current_user = Depends(get_current_user)):
    """Update an income stream"""
    try:
        updates = {k: v for k, v in stream.dict(exclude_unset=True).items()}

        if not updates:
            raise HTTPException(status_code=400, detail="No fields to update")

        # Add setup_completed_date if marking as completed
        if updates.get("setup_completed") is True:
            updates["setup_completed_date"] = datetime.utcnow().date().isoformat()
        elif updates.get("setup_completed") is False:
            updates["setup_completed_date"] = None

        # Add started_at if changing to active status
        if updates.get("status") == "active":
            updates["started_at"] = datetime.utcnow().isoformat()

        # Add discontinued_at if changing to discontinued status
        if updates.get("status") == "discontinued":
            updates["discontinued_at"] = datetime.utcnow().isoformat()
        elif updates.get("status") and updates["status"] != "discontinued":
            updates["discontinued_at"] = None

        result = supabase().table("income_streams").update(updates).eq("id", stream_id).eq("user_id", current_user["id"]).execute()

        if not result.data:
            raise HTTPException(status_code=404, detail="Income stream not found")

        return result.data[0]
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating income stream: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/income-streams/{stream_id}")
async def delete_income_stream(stream_id: str, current_user = Depends(get_current_user)):
    """Delete an income stream"""
    try:
        result = supabase().table("income_streams").delete().eq("id", stream_id).eq("user_id", current_user["id"]).execute()

        if not result.data:
            raise HTTPException(status_code=404, detail="Income stream not found")

        return {"message": "Income stream deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting income stream: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/income-stats")
async def get_income_stats(current_user = Depends(get_current_user)):
    """Get comprehensive income stream statistics"""
    try:
        # Get profile
        profile_result = supabase().table("transition_profiles").select("id").eq("user_id", current_user["id"]).maybe_single().execute()

        if not profile_result.data:
            raise HTTPException(status_code=404, detail="Transition profile not found")

        # Call database function for stats
        result = supabase().rpc("get_income_stats", {
            "p_profile_id": profile_result.data["id"]
        }).execute()

        if not result.data or len(result.data) == 0:
            # Return default stats if no data
            return {
                "total_streams": 0,
                "active_streams": 0,
                "total_monthly_estimate": 0.0,
                "total_actual_monthly": 0.0,
                "remote_work_count": 0,
                "freelance_count": 0,
                "passive_count": 0,
                "seasonal_count": 0,
                "setup_completion_percentage": 0,
            }

        return result.data[0]
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching income stats: {e}")
        raise HTTPException(status_code=500, detail=str(e))
