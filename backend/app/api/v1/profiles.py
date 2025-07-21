from fastapi import APIRouter, HTTPException, Depends
from typing import Dict, Any
from app.services.profiles_service import profiles_service
from app.core.auth import get_current_user

router = APIRouter()

# Frontend-expected endpoint: GET /api/v1/users/{user_id}/profile
@router.get("/users/{user_id}/profile")
async def get_user_profile(user_id: str):
    """Get profile for a specific user - matches frontend useProfile.ts expectation"""
    profile = await profiles_service.get_profile(user_id)
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    return profile

# Frontend-expected endpoint: PUT /api/v1/users/{user_id}/profile  
@router.put("/users/{user_id}/profile")
async def update_user_profile(user_id: str, payload: Dict[str, Any]):
    """Update profile for a specific user - matches frontend Profile.tsx expectation"""
    profile = await profiles_service.update_profile(user_id, payload)
    if not profile:
        # If profile doesn't exist, create it
        payload['user_id'] = user_id
        profile = await profiles_service.create_profile(payload)
    return profile

# Legacy endpoints for backward compatibility
@router.get("/profiles/{profile_id}")
async def get_profile(profile_id: str):
    profile = await profiles_service.get_profile(profile_id)
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    return profile

@router.post("/profiles", status_code=201)
async def create_profile(payload: Dict[str, Any]):
    return await profiles_service.create_profile(payload)

@router.put("/profiles/{profile_id}")
async def update_profile(profile_id: str, payload: Dict[str, Any]):
    profile = await profiles_service.update_profile(profile_id, payload)
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    return profile

@router.delete("/profiles/{profile_id}")
async def delete_profile(profile_id: str):
    success = await profiles_service.delete_profile(profile_id)
    if not success:
        raise HTTPException(status_code=404, detail="Profile not found")
    return {"success": True}
