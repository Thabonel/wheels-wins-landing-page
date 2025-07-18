from fastapi import APIRouter, HTTPException
from typing import Dict, Any
from app.services.profiles_service import profiles_service

router = APIRouter()

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
