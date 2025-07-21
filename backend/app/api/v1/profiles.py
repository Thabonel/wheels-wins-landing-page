from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Form
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

# Frontend-expected endpoint: POST /api/v1/users/{user_id}/profile/upload
@router.post("/users/{user_id}/profile/upload")
async def upload_profile_photo(user_id: str, file: UploadFile = File(...), field_type: str = Form(...)):
    """Upload profile or partner profile photo - matches frontend Profile.tsx expectation"""
    from app.services.file_upload_service import upload_profile_photo as upload_service
    
    # Validate field type
    if field_type not in ['profile_image', 'partner_profile_image']:
        raise HTTPException(status_code=400, detail="Invalid field_type. Must be 'profile_image' or 'partner_profile_image'")
    
    # Validate file type
    if not file.content_type or not file.content_type.startswith('image/'):
        raise HTTPException(status_code=400, detail="File must be an image")
    
    # Validate file size (max 5MB)
    if file.size and file.size > 5 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File size must be less than 5MB")
    
    try:
        # Upload file and update profile
        photo_url = await upload_service(user_id, file, field_type)
        
        # Update profile with new photo URL
        field_name = f"{field_type}_url"  # profile_image_url or partner_profile_image_url
        update_data = {field_name: photo_url}
        
        profile = await profiles_service.update_profile(user_id, update_data)
        if not profile:
            raise HTTPException(status_code=404, detail="Profile not found")
            
        return {
            "message": f"{field_type.replace('_', ' ').title()} uploaded successfully",
            "photo_url": photo_url,
            "profile": profile
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")

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
