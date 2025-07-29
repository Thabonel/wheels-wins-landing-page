"""
User Settings API Endpoints
Provides backend API for user settings management
"""
from fastapi import APIRouter, HTTPException, Depends, Response
from typing import Dict, Any
from app.services.user_settings_service import user_settings_service
from app.api.deps import verify_supabase_jwt_token

router = APIRouter()

# Handle OPTIONS for user settings endpoints explicitly
@router.options("/users/{user_id}/settings")
async def user_settings_options(user_id: str):
    """Handle CORS preflight for user settings endpoints"""
    response = Response(content='{"message": "CORS preflight handled"}', media_type="application/json")
    # Add cache-busting headers to force browser refresh
    response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
    response.headers["Pragma"] = "no-cache"
    response.headers["Expires"] = "0"
    return response

@router.get("/users/{user_id}/settings")
async def get_user_settings(
    user_id: str,
    current_user: dict = Depends(verify_supabase_jwt_token)
):
    """Get user settings - matches frontend useUserSettings.ts expectation"""
    # Handle OPTIONS preflight - should not reach here but add safety check
    if current_user.get("method") == "OPTIONS":
        return {"message": "OPTIONS handled"}
    
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
    current_user: dict = Depends(verify_supabase_jwt_token)
):
    """Update user settings - matches frontend useUserSettings.ts expectation"""
    # Handle OPTIONS preflight - should not reach here but add safety check
    if current_user.get("method") == "OPTIONS":
        return {"message": "OPTIONS handled"}
    
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
    current_user: dict = Depends(verify_supabase_jwt_token)
):
    """Create default settings for user"""
    # Handle OPTIONS preflight - should not reach here but add safety check
    if current_user.get("method") == "OPTIONS":
        return {"message": "OPTIONS handled"}
    
    # Verify user can only create their own settings
    if current_user.get('sub') != user_id:
        raise HTTPException(status_code=403, detail="Access denied")
    settings = await user_settings_service.create_default_settings(user_id)
    if not settings:
        raise HTTPException(status_code=400, detail="Failed to create settings")
    return settings