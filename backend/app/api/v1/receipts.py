"""
Receipt Upload API Endpoints
Secure receipt image upload and management for expense tracking.
"""

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from typing import Optional
import uuid
import mimetypes
from datetime import datetime

from app.core.database import get_supabase_client
from app.api.deps import verify_supabase_jwt_token
from app.core.logging import setup_logging, get_logger
from app.core.config import settings

router = APIRouter()
setup_logging()
logger = get_logger(__name__)

# Maximum file size: 5MB
MAX_FILE_SIZE = 5 * 1024 * 1024
# Allowed MIME types
ALLOWED_MIME_TYPES = [
    "image/jpeg",
    "image/jpg", 
    "image/png",
    "image/gif",
    "image/webp",
    "image/heic",
    "image/heif"
]

@router.post("/receipts/upload")
async def upload_receipt(
    file: UploadFile = File(...),
    expense_id: Optional[int] = None,
    current_user: dict = Depends(verify_supabase_jwt_token)
):
    """
    Upload a receipt image to Supabase storage
    
    - Validates file type and size
    - Generates unique filename
    - Uploads to user-specific folder
    - Returns public URL for the receipt
    """
    try:
        user_id = current_user.get("sub")
        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User ID not found in token"
            )
        
        # Validate file size
        contents = await file.read()
        if len(contents) > MAX_FILE_SIZE:
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail=f"File size exceeds maximum allowed size of {MAX_FILE_SIZE / 1024 / 1024}MB"
            )
        
        # Reset file position
        await file.seek(0)
        
        # Validate MIME type
        content_type = file.content_type
        if content_type not in ALLOWED_MIME_TYPES:
            # Try to detect MIME type from filename
            guessed_type = mimetypes.guess_type(file.filename)[0]
            if guessed_type not in ALLOWED_MIME_TYPES:
                raise HTTPException(
                    status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
                    detail=f"File type {content_type} is not allowed. Allowed types: {', '.join(ALLOWED_MIME_TYPES)}"
                )
            content_type = guessed_type
        
        # Generate unique filename
        file_ext = file.filename.split('.')[-1] if '.' in file.filename else 'jpg'
        timestamp = datetime.utcnow().strftime('%Y%m%d_%H%M%S')
        unique_filename = f"{user_id}/receipts/{timestamp}_{uuid.uuid4().hex[:8]}.{file_ext}"
        
        # Upload to Supabase storage
        supabase = get_supabase_client()
        
        try:
            # Create bucket if it doesn't exist (only needed once)
            buckets = supabase.storage.list_buckets()
            if not any(bucket.name == 'receipts' for bucket in buckets):
                supabase.storage.create_bucket(
                    'receipts',
                    options={
                        "public": True,  # Public read access for receipts
                        "file_size_limit": MAX_FILE_SIZE,
                        "allowed_mime_types": ALLOWED_MIME_TYPES
                    }
                )
        except Exception as e:
            logger.warning(f"Bucket creation check failed (may already exist): {e}")
        
        # Upload file
        response = supabase.storage.from_('receipts').upload(
            path=unique_filename,
            file=contents,
            file_options={
                "content-type": content_type,
                "upsert": False  # Don't overwrite existing files
            }
        )
        
        if hasattr(response, 'error') and response.error:
            logger.error(f"Supabase storage upload error: {response.error}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to upload receipt"
            )
        
        # Get public URL
        public_url = supabase.storage.from_('receipts').get_public_url(unique_filename)
        
        # If expense_id provided, update the expense record
        if expense_id:
            try:
                result = supabase.table('expenses').update({
                    'receipt_url': public_url
                }).eq('id', expense_id).eq('user_id', user_id).execute()
                
                if not result.data:
                    logger.warning(f"No expense found with id {expense_id} for user {user_id}")
            except Exception as e:
                logger.error(f"Failed to update expense with receipt URL: {e}")
                # Don't fail the upload if expense update fails
        
        logger.info(f"Receipt uploaded successfully for user {user_id}: {unique_filename}")
        
        return {
            "success": True,
            "receipt_url": public_url,
            "filename": unique_filename,
            "size": len(contents),
            "content_type": content_type
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Receipt upload error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to upload receipt"
        )

@router.delete("/receipts/{filename:path}")
async def delete_receipt(
    filename: str,
    current_user: dict = Depends(verify_supabase_jwt_token)
):
    """
    Delete a receipt image from Supabase storage
    
    - Validates user ownership
    - Removes file from storage
    - Updates expense record if linked
    """
    try:
        user_id = current_user.get("sub")
        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User ID not found in token"
            )
        
        # Ensure user can only delete their own receipts
        if not filename.startswith(f"{user_id}/receipts/"):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only delete your own receipts"
            )
        
        supabase = get_supabase_client()
        
        # Delete from storage
        response = supabase.storage.from_('receipts').remove([filename])
        
        if hasattr(response, 'error') and response.error:
            logger.error(f"Supabase storage delete error: {response.error}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to delete receipt"
            )
        
        # Update any expenses that reference this receipt
        try:
            public_url = supabase.storage.from_('receipts').get_public_url(filename)
            result = supabase.table('expenses').update({
                'receipt_url': None
            }).eq('receipt_url', public_url).eq('user_id', user_id).execute()
            
            if result.data:
                logger.info(f"Updated {len(result.data)} expense(s) after deleting receipt")
        except Exception as e:
            logger.error(f"Failed to update expenses after receipt deletion: {e}")
        
        logger.info(f"Receipt deleted successfully for user {user_id}: {filename}")
        
        return {
            "success": True,
            "message": "Receipt deleted successfully"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Receipt deletion error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete receipt"
        )