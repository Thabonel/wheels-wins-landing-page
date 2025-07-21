"""
File Upload Service
Handles profile photo uploads to Supabase Storage
"""
import os
import uuid
from typing import Optional
from fastapi import UploadFile, HTTPException
from app.services.database import database_service
from app.core.logging import get_logger

logger = get_logger(__name__)

# Allowed image MIME types
ALLOWED_IMAGE_TYPES = {
    'image/jpeg',
    'image/png', 
    'image/webp',
    'image/gif'
}

# Allowed file extensions
ALLOWED_EXTENSIONS = {'.jpg', '.jpeg', '.png', '.webp', '.gif'}

async def upload_profile_photo(user_id: str, file: UploadFile, field_type: str) -> str:
    """
    Upload a profile photo to Supabase Storage and return the public URL
    
    Args:
        user_id: The user's ID
        file: The uploaded file
        field_type: Either 'profile_image' or 'partner_profile_image'
    
    Returns:
        str: Public URL of the uploaded image
    """
    try:
        # Validate file type
        if file.content_type not in ALLOWED_IMAGE_TYPES:
            raise HTTPException(
                status_code=400, 
                detail=f"Invalid file type. Allowed types: {', '.join(ALLOWED_IMAGE_TYPES)}"
            )
        
        # Get file extension
        filename = file.filename or 'upload'
        file_ext = os.path.splitext(filename)[1].lower()
        if file_ext not in ALLOWED_EXTENSIONS:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid file extension. Allowed extensions: {', '.join(ALLOWED_EXTENSIONS)}"
            )
        
        # Generate unique filename
        unique_id = str(uuid.uuid4())
        storage_filename = f"{user_id}/{field_type}_{unique_id}{file_ext}"
        
        # Read file content
        file_content = await file.read()
        
        # Upload to Supabase Storage using the database service
        if not database_service.client:
            raise HTTPException(status_code=500, detail="Database service not initialized")
        
        # Upload file to 'profiles' bucket
        storage_response = database_service.client.storage.from_('profiles').upload(
            storage_filename, 
            file_content,
            {
                'content-type': file.content_type,
                'upsert': 'true'  # Allow overwriting existing files
            }
        )
        
        if storage_response.error:
            logger.error(f"Supabase storage upload error: {storage_response.error}")
            raise HTTPException(
                status_code=500, 
                detail=f"Storage upload failed: {storage_response.error.message}"
            )
        
        # Get public URL
        url_response = database_service.client.storage.from_('profiles').get_public_url(storage_filename)
        
        if not url_response:
            raise HTTPException(status_code=500, detail="Failed to get public URL")
        
        public_url = url_response
        logger.info(f"Successfully uploaded {field_type} for user {user_id}: {public_url}")
        
        return public_url
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error uploading file for user {user_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")

async def delete_profile_photo(user_id: str, field_type: str, photo_url: str) -> bool:
    """
    Delete a profile photo from Supabase Storage
    
    Args:
        user_id: The user's ID  
        field_type: Either 'profile_image' or 'partner_profile_image'
        photo_url: The public URL of the photo to delete
        
    Returns:
        bool: True if deletion was successful
    """
    try:
        if not database_service.client:
            logger.warning("Database service not initialized, cannot delete photo")
            return False
        
        # Extract storage path from public URL
        # URL format: https://project.supabase.co/storage/v1/object/public/profiles/path
        if '/storage/v1/object/public/profiles/' not in photo_url:
            logger.warning(f"Invalid photo URL format: {photo_url}")
            return False
        
        storage_path = photo_url.split('/storage/v1/object/public/profiles/')[-1]
        
        # Delete from storage
        delete_response = database_service.client.storage.from_('profiles').remove([storage_path])
        
        if delete_response.error:
            logger.error(f"Failed to delete photo {storage_path}: {delete_response.error}")
            return False
        
        logger.info(f"Successfully deleted {field_type} for user {user_id}: {storage_path}")
        return True
        
    except Exception as e:
        logger.error(f"Error deleting photo for user {user_id}: {e}")
        return False