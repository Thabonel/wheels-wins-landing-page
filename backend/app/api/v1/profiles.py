from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Form, status
from typing import Dict, Any
from app.services.profiles_service import profiles_service
from app.services.pam.cache_warming import get_cache_warming_service
from app.core.auth import get_current_user
from app.api.deps import verify_supabase_jwt_token

router = APIRouter()

# Frontend-expected endpoint: GET /api/v1/users/{user_id}/profile
@router.get("/users/{user_id}/profile")
async def get_user_profile(
    user_id: str,
    current_user: dict = Depends(verify_supabase_jwt_token)
):
    """Get profile for a specific user - matches frontend useProfile.ts expectation"""
    # Verify user can access this profile (own profile or admin)
    current_user_id = current_user.get("sub")
    if current_user_id != user_id:
        # Check if current user is admin (you can adjust this logic based on your admin role field)
        user_role = current_user.get("role", "user")
        if user_role != "admin":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN, 
                detail="Access denied: You can only access your own profile"
            )
    
    profile = await profiles_service.get_profile(user_id)
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    return profile

# Frontend-expected endpoint: PUT /api/v1/users/{user_id}/profile  
@router.put("/users/{user_id}/profile")
async def update_user_profile(
    user_id: str, 
    payload: Dict[str, Any],
    current_user: dict = Depends(verify_supabase_jwt_token)
):
    """Update profile for a specific user - matches frontend Profile.tsx expectation"""
    # Verify user can update this profile (own profile only, no admin override for updates)
    current_user_id = current_user.get("sub")
    if current_user_id != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, 
            detail="Access denied: You can only update your own profile"
        )
    
    profile = await profiles_service.update_profile(user_id, payload)
    if not profile:
        # If profile doesn't exist, create it
        payload['user_id'] = user_id
        profile = await profiles_service.create_profile(payload)
    # Invalidate Redis profile cache for this user so PAM reads fresh data
    try:
        cache_service = await get_cache_warming_service()
        await cache_service.invalidate_user_cache(user_id, 'profile')
        await cache_service.invalidate_user_cache(user_id, 'preferences')
    except Exception:
        pass
    return profile

# Frontend-expected endpoint: POST /api/v1/users/{user_id}/profile/upload
@router.post("/users/{user_id}/profile/upload")
async def upload_profile_photo(
    user_id: str, 
    file: UploadFile = File(...), 
    field_type: str = Form(...),
    current_user: dict = Depends(verify_supabase_jwt_token)
):
    """Upload profile or partner profile photo - matches frontend Profile.tsx expectation"""
    # Verify user can upload to this profile (own profile only)
    current_user_id = current_user.get("sub")
    if current_user_id != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, 
            detail="Access denied: You can only upload photos to your own profile"
        )
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
        # Invalidate profile cache keys to refresh avatar URLs and profile fields
        try:
            cache_service = await get_cache_warming_service()
            await cache_service.invalidate_user_cache(user_id, 'profile')
        except Exception:
            pass
            
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
    profile = await profiles_service.create_profile(payload)
    try:
        user_id = payload.get('user_id') or payload.get('id')
        if user_id:
            cache_service = await get_cache_warming_service()
            await cache_service.invalidate_user_cache(user_id, 'profile')
            await cache_service.invalidate_user_cache(user_id, 'preferences')
    except Exception:
        pass
    return profile

@router.put("/profiles/{profile_id}")
async def update_profile(profile_id: str, payload: Dict[str, Any]):
    profile = await profiles_service.update_profile(profile_id, payload)
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    try:
        user_id = profile.get('user_id') or profile_id
        cache_service = await get_cache_warming_service()
        await cache_service.invalidate_user_cache(user_id, 'profile')
        await cache_service.invalidate_user_cache(user_id, 'preferences')
    except Exception:
        pass
    return profile

@router.delete("/profiles/{profile_id}")
async def delete_profile(profile_id: str):
    success = await profiles_service.delete_profile(profile_id)
    if not success:
        raise HTTPException(status_code=404, detail="Profile not found")
    try:
        cache_service = await get_cache_warming_service()
        await cache_service.invalidate_user_cache(profile_id, 'all')
    except Exception:
        pass
    return {"success": True}
