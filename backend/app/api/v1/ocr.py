"""Unified OCR API endpoints.

Single service for all document text extraction: receipts, medical docs,
bank statements, fuel receipts. Replaces 8 scattered OCR implementations.

Endpoints:
  POST /ocr/extract   - Synchronous extraction (single-page images/receipts)
  POST /ocr/jobs       - Async job creation (multi-page PDFs)
  GET  /ocr/jobs/{id}  - Poll async job status
  GET  /ocr/stats      - Admin: success rate, method distribution, cache hit rate
"""
import asyncio
import time
import uuid
from typing import Dict, Any

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query, status

from app.api.deps import verify_supabase_jwt_token
from app.core.logging import get_logger
from app.services.ocr.service import OCRService

router = APIRouter()
logger = get_logger(__name__)

# In-memory job store (lightweight - jobs expire after 1 hour)
_ocr_jobs: Dict[str, Dict[str, Any]] = {}

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


async def _run_ocr_job(job_id: str, file_bytes: bytes, filename: str, sensitivity: str):
    """Background task that processes an OCR job and stores the result."""
    service = OCRService()
    try:
        _ocr_jobs[job_id]["status"] = "processing"
        result = await service.extract_text(
            file_bytes=file_bytes,
            filename=filename,
            sensitivity=sensitivity,
        )
        _ocr_jobs[job_id].update({
            "status": "completed",
            "result": result.model_dump(),
            "completed_at": time.time(),
        })
    except Exception as e:
        _ocr_jobs[job_id].update({
            "status": "failed",
            "error": str(e),
            "completed_at": time.time(),
        })


@router.post("/ocr/jobs")
async def create_ocr_job(
    file: UploadFile = File(...),
    sensitivity: str = Query(default="standard"),
    current_user: dict = Depends(verify_supabase_jwt_token),
):
    """Create an async OCR job for large or multi-page documents.

    Returns a job_id immediately. Poll GET /ocr/jobs/{job_id} for results.
    Use this for multi-page PDFs that may exceed the 30s sync timeout.
    """
    user_id = current_user.get("sub")
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User ID not found in token")

    file_bytes = await file.read()

    if len(file_bytes) == 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Empty file")

    if len(file_bytes) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File size exceeds maximum of {MAX_FILE_SIZE // (1024 * 1024)}MB",
        )

    if sensitivity not in ("standard", "high"):
        sensitivity = "standard"

    job_id = str(uuid.uuid4())
    _ocr_jobs[job_id] = {
        "job_id": job_id,
        "status": "queued",
        "created_at": time.time(),
        "user_id": user_id,
        "filename": file.filename or "unknown",
    }

    # Launch background task
    asyncio.create_task(_run_ocr_job(job_id, file_bytes, file.filename or "unknown", sensitivity))

    # Evict old jobs (>1 hour) and enforce max count to prevent memory leak
    cutoff = time.time() - 3600
    stale = [k for k, v in _ocr_jobs.items() if v.get("created_at", 0) < cutoff]
    for k in stale:
        _ocr_jobs.pop(k, None)

    if len(_ocr_jobs) > 1000:
        oldest = sorted(_ocr_jobs, key=lambda k: _ocr_jobs[k].get("created_at", 0))
        for k in oldest[:len(_ocr_jobs) - 1000]:
            _ocr_jobs.pop(k, None)

    return {"job_id": job_id, "status": "queued"}


@router.get("/ocr/jobs/{job_id}")
async def get_ocr_job(
    job_id: str,
    current_user: dict = Depends(verify_supabase_jwt_token),
):
    """Poll an async OCR job for status and results."""
    user_id = current_user.get("sub")
    job = _ocr_jobs.get(job_id)

    if not job:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found")

    if job.get("user_id") != user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not your job")

    response = {
        "job_id": job_id,
        "status": job["status"],
        "filename": job.get("filename"),
    }

    if job["status"] == "completed":
        response["result"] = job.get("result")
    elif job["status"] == "failed":
        response["error"] = "OCR processing failed"

    return response


@router.get("/ocr/stats")
async def ocr_stats(
    current_user: dict = Depends(verify_supabase_jwt_token),
):
    """OCR service statistics: success rate, method distribution, cache hit rate.

    Queries the ocr_cache table for aggregate metrics.
    """
    try:
        from app.core.database import get_supabase_client
        client = get_supabase_client()

        # Single query for method and confidence, with exact count
        resp = client.table("ocr_cache").select("method, confidence", count="exact").execute()
        total_cached = resp.count or 0

        # Aggregate method counts and confidence in one pass
        method_counts: Dict[str, int] = {}
        method_confs: Dict[str, list] = {}
        for row in (resp.data or []):
            m = row.get("method", "unknown")
            method_counts[m] = method_counts.get(m, 0) + 1
            c = row.get("confidence")
            if c is not None:
                method_confs.setdefault(m, []).append(c)

        avg_confidence = {
            m: round(sum(confs) / len(confs), 4)
            for m, confs in method_confs.items() if confs
        }

        # Active async jobs
        active_jobs = sum(1 for j in _ocr_jobs.values() if j["status"] in ("queued", "processing"))

        return {
            "total_cached_results": total_cached,
            "method_distribution": method_counts,
            "average_confidence_by_method": avg_confidence,
            "active_async_jobs": active_jobs,
        }

    except Exception as e:
        logger.error("Failed to get OCR stats", extra={"error": str(e)})
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve OCR statistics",
        )
