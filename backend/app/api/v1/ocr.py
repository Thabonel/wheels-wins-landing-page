"""Unified OCR API endpoint.

Single endpoint for all document text extraction: receipts, medical docs,
bank statements, fuel receipts. Replaces 8 scattered OCR implementations.
"""
import time
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query, status

from app.api.deps import verify_supabase_jwt_token
from app.core.logging import get_logger
from app.services.ocr.service import OCRService

router = APIRouter()
logger = get_logger(__name__)

MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB
ALLOWED_MIME_TYPES = {
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/gif",
    "image/webp",
    "image/heic",
    "image/heif",
    "image/bmp",
    "image/tiff",
    "application/pdf",
}


@router.post("/ocr/extract")
async def extract_text(
    file: UploadFile = File(...),
    sensitivity: str = Query(
        default="standard",
        description="'standard' for full pipeline, 'high' for non-generative OCR only (medical docs)",
    ),
    current_user: dict = Depends(verify_supabase_jwt_token),
):
    """Extract text from an uploaded document using the unified OCR pipeline.

    Pipeline: cache -> PDF text (pdfplumber) -> Google Vision -> Claude -> Gemini

    Returns extracted text with confidence score and method used.
    """
    start_time = time.time()
    user_id = current_user.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User ID not found in token",
        )

    # Validate file
    file_bytes = await file.read()

    if len(file_bytes) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Empty file",
        )

    if len(file_bytes) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File size exceeds maximum of {MAX_FILE_SIZE // (1024 * 1024)}MB",
        )

    content_type = file.content_type or ""
    if content_type not in ALLOWED_MIME_TYPES:
        # Try to guess from filename
        filename = file.filename or ""
        ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
        ext_to_mime = {
            "jpg": "image/jpeg", "jpeg": "image/jpeg", "png": "image/png",
            "gif": "image/gif", "webp": "image/webp", "heic": "image/heic",
            "heif": "image/heif", "bmp": "image/bmp", "tiff": "image/tiff",
            "tif": "image/tiff", "pdf": "application/pdf",
        }
        content_type = ext_to_mime.get(ext, content_type)
        if content_type not in ALLOWED_MIME_TYPES:
            raise HTTPException(
                status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
                detail=f"Unsupported file type: {file.content_type}. Supported: images (JPEG, PNG, GIF, WebP, HEIC, BMP, TIFF) and PDF.",
            )

    if sensitivity not in ("standard", "high"):
        sensitivity = "standard"

    filename = file.filename or "unknown"
    service = OCRService()

    try:
        result = await service.extract_text(
            file_bytes=file_bytes,
            filename=filename,
            sensitivity=sensitivity,
        )

        elapsed_ms = int((time.time() - start_time) * 1000)

        logger.info("ocr_request", extra={
            "user_id": user_id,
            "file_hash": result.file_hash,
            "file_type": content_type,
            "file_size_bytes": len(file_bytes),
            "method_used": result.method,
            "confidence": result.confidence,
            "confidence_method": result.confidence_method,
            "processing_time_ms": elapsed_ms,
            "success": True,
            "cached": result.cached,
            "sensitivity": sensitivity,
        })

        return result.model_dump()

    except Exception as e:
        elapsed_ms = int((time.time() - start_time) * 1000)
        logger.error("ocr_request_failed", extra={
            "user_id": user_id,
            "file_type": content_type,
            "file_size_bytes": len(file_bytes),
            "error_type": type(e).__name__,
            "error_message": str(e),
            "processing_time_ms": elapsed_ms,
        })
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="All OCR methods failed",
        )
