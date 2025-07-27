"""
User Settings API Endpoints
Provides backend API for user settings management
"""
from fastapi import APIRouter, HTTPException, Depends
from typing import Dict, Any
from app.services.user_settings_service import user_settings_service
from app.api.deps import verify_supabase_jwt_flexible

router = APIRouter()

@router.get("/users/{user_id}/settings")
async def get_user_settings(
    user_id: str,
    current_user: dict = Depends(verify_supabase_jwt_flexible)
):
    """Get user settings - matches frontend useUserSettings.ts expectation"""
    # Verify user can only access their own settings
    if current_user.get('sub') != user_id:
        raise HTTPException(status_code=403, detail="Access denied")
    settings = await user_settings_service.get_user_settings(user_id)
    if not settings:
        raise HTTPException(status_code=404, detail="Settings not found")
    return settings

@router.put("/users/{user_id}/settings")
async def update_user_settings(
    user_id: str, 
    settings_data: Dict[str, Any],
    current_user: dict = Depends(verify_supabase_jwt_flexible)
):
    """Update user settings - matches frontend useUserSettings.ts expectation"""
    # Verify user can only update their own settings
    if current_user.get('sub') != user_id:
        raise HTTPException(status_code=403, detail="Access denied")
    updated_settings = await user_settings_service.update_user_settings(user_id, settings_data)
    if not updated_settings:
        raise HTTPException(status_code=400, detail="Failed to update settings")
    return updated_settings

@router.post("/users/{user_id}/settings")
async def create_user_settings(
    user_id: str,
    current_user: dict = Depends(verify_supabase_jwt_flexible)
):
    """Create default settings for user"""
    # Verify user can only create their own settings
    if current_user.get('sub') != user_id:
        raise HTTPException(status_code=403, detail="Access denied")
    settings = await user_settings_service.create_default_settings(user_id)
    if not settings:
        raise HTTPException(status_code=400, detail="Failed to create settings")
    return settings