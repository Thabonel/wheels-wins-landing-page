"""
User Settings API Endpoints
Provides backend API for user settings management
"""
from fastapi import APIRouter, HTTPException
from typing import Dict, Any
from app.services.user_settings_service import user_settings_service

router = APIRouter()

@router.get("/users/{user_id}/settings")
async def get_user_settings(user_id: str):
    """Get user settings - matches frontend useUserSettings.ts expectation"""
    settings = await user_settings_service.get_user_settings(user_id)
    if not settings:
        raise HTTPException(status_code=404, detail="Settings not found")
    return settings

@router.put("/users/{user_id}/settings")
async def update_user_settings(user_id: str, settings_data: Dict[str, Any]):
    """Update user settings - matches frontend useUserSettings.ts expectation"""
    updated_settings = await user_settings_service.update_user_settings(user_id, settings_data)
    if not updated_settings:
        raise HTTPException(status_code=400, detail="Failed to update settings")
    return updated_settings

@router.post("/users/{user_id}/settings")
async def create_user_settings(user_id: str):
    """Create default settings for user"""
    settings = await user_settings_service.create_default_settings(user_id)
    if not settings:
        raise HTTPException(status_code=400, detail="Failed to create settings")
    return settings