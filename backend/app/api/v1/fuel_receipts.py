"""
Fuel Receipt Upload and Vision OCR API Endpoints

Handles fuel receipt image upload to Supabase Storage and
Claude Vision-based OCR extraction as a fallback parsing method.
"""

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from pydantic import BaseModel
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

MAX_FILE_SIZE = 5 * 1024 * 1024  # 5MB
ALLOWED_MIME_TYPES = [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/gif",
    "image/webp",
    "image/heic",
    "image/heif",
]


class VisionParseRequest(BaseModel):
    image_base64: str
    mime_type: str = "image/jpeg"


@router.post("/fuel/upload-receipt")
async def upload_fuel_receipt(
    file: UploadFile = File(...),
    current_user: dict = Depends(verify_supabase_jwt_token),
):
    """
    Upload a fuel receipt image to Supabase Storage.

    - Validates file type (image/*) and size (5MB max)
    - Stores in receipts bucket under {user_id}/fuel-receipts/
    - Returns public URL for the uploaded receipt
    """
    try:
        user_id = current_user.get("sub")
        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User ID not found in token",
            )

        contents = await file.read()
        if len(contents) > MAX_FILE_SIZE:
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail=f"File size exceeds maximum allowed size of {MAX_FILE_SIZE / 1024 / 1024}MB",
            )

        await file.seek(0)

        content_type = file.content_type
        if content_type not in ALLOWED_MIME_TYPES:
            guessed_type = mimetypes.guess_type(file.filename)[0]
            if guessed_type not in ALLOWED_MIME_TYPES:
                raise HTTPException(
                    status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
                    detail=f"File type {content_type} is not allowed. Allowed types: {', '.join(ALLOWED_MIME_TYPES)}",
                )
            content_type = guessed_type

        file_ext = file.filename.split(".")[-1] if "." in file.filename else "jpg"
        timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
        unique_filename = f"{user_id}/fuel-receipts/{timestamp}_{uuid.uuid4().hex[:8]}.{file_ext}"

        supabase = get_supabase_client()

        try:
            buckets = supabase.storage.list_buckets()
            if not any(bucket.name == "receipts" for bucket in buckets):
                supabase.storage.create_bucket(
                    "receipts",
                    options={
                        "public": True,
                        "file_size_limit": MAX_FILE_SIZE,
                        "allowed_mime_types": ALLOWED_MIME_TYPES,
                    },
                )
        except Exception as e:
            logger.warning(f"Bucket creation check failed (may already exist): {e}")

        response = supabase.storage.from_("receipts").upload(
            path=unique_filename,
            file=contents,
            file_options={
                "content-type": content_type,
                "upsert": False,
            },
        )

        if hasattr(response, "error") and response.error:
            logger.error(f"Supabase storage upload error: {response.error}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to upload fuel receipt",
            )

        public_url = supabase.storage.from_("receipts").get_public_url(unique_filename)

        logger.info(f"Fuel receipt uploaded for user {user_id}: {unique_filename}")

        return {
            "success": True,
            "receipt_url": public_url,
            "filename": unique_filename,
            "size": len(contents),
            "content_type": content_type,
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Fuel receipt upload error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to upload fuel receipt",
        )


@router.post("/fuel/parse-receipt-vision")
async def parse_receipt_with_vision(
    body: VisionParseRequest,
    current_user: dict = Depends(verify_supabase_jwt_token),
):
    """
    Use Claude Vision to extract structured fuel data from a receipt image.

    Sends the base64-encoded image to Claude claude-sonnet-4-5-20250929 with a prompt
    instructing it to extract total, volume, price, date, station, and unit.
    Returns structured data with confidence scores.
    """
    try:
        user_id = current_user.get("sub")
        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User ID not found in token",
            )

        api_key = settings.anthropic_api_key
        if not api_key:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Vision service not configured",
            )

        import anthropic

        client = anthropic.AsyncAnthropic(api_key=api_key)

        extraction_prompt = (
            "Extract the following structured data from this fuel receipt image. "
            "Return ONLY valid JSON with these fields:\n"
            '- "total": number or null (total cost in dollars)\n'
            '- "volume": number or null (fuel volume)\n'
            '- "price": number or null (price per unit)\n'
            '- "date": "YYYY-MM-DD" string or null\n'
            '- "station": string or null (station name)\n'
            '- "unit": "L" or "GAL" (fuel unit)\n'
            '- "confidence": object with keys total, volume, price, date, station '
            "each valued 0.0-1.0 indicating extraction confidence\n"
            "Return only the JSON object, no markdown or explanation."
        )

        message = await client.messages.create(
            model="claude-sonnet-4-5-20250929",
            max_tokens=512,
            messages=[
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "image",
                            "source": {
                                "type": "base64",
                                "media_type": body.mime_type,
                                "data": body.image_base64,
                            },
                        },
                        {
                            "type": "text",
                            "text": extraction_prompt,
                        },
                    ],
                }
            ],
        )

        raw_text = message.content[0].text.strip()

        # Strip markdown code fences if present
        if raw_text.startswith("```"):
            lines = raw_text.split("\n")
            # Remove first and last lines (fences)
            lines = [l for l in lines if not l.strip().startswith("```")]
            raw_text = "\n".join(lines).strip()

        import json

        extracted = json.loads(raw_text)

        # Compute overall_confidence from per-field confidence values
        conf = extracted.get("confidence", {})
        non_zero = [v for v in conf.values() if isinstance(v, (int, float)) and v > 0]
        overall = sum(non_zero) / len(non_zero) if non_zero else 0.0

        return {
            "success": True,
            "extracted": {
                "total": extracted.get("total"),
                "volume": extracted.get("volume"),
                "price": extracted.get("price"),
                "date": extracted.get("date"),
                "station": extracted.get("station"),
                "unit": extracted.get("unit", "L"),
            },
            "method": "claude_vision",
            "confidence": conf,
            "overall_confidence": round(overall, 4),
        }

    except HTTPException:
        raise
    except json.JSONDecodeError as e:
        logger.error(f"Failed to parse Claude vision response as JSON: {e}")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Vision service returned unparseable response",
        )
    except Exception as e:
        logger.error(f"Vision receipt parse error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to parse receipt with vision",
        )
