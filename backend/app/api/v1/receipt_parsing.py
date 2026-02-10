"""
Universal Receipt Parsing API Endpoints

Handles any receipt type (fuel, food, maintenance, accommodation, shopping)
via Claude Vision OCR or regex-based text parsing. Returns a unified shape
with receipt type detection, common fields, and per-field confidence scores.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, field_validator
import json

from app.api.deps import verify_supabase_jwt_token
from app.core.logging import setup_logging, get_logger
from app.core.config import settings

router = APIRouter()
setup_logging()
logger = get_logger(__name__)

MAX_BASE64_SIZE = 10 * 1024 * 1024  # ~7.5MB image after base64 encoding
ALLOWED_MIME_TYPES = [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/gif",
    "image/webp",
    "image/heic",
    "image/heif",
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]


class VisionParseRequest(BaseModel):
    image_base64: str
    mime_type: str = "image/jpeg"

    @field_validator("image_base64")
    @classmethod
    def validate_base64_size(cls, v: str) -> str:
        if len(v) > MAX_BASE64_SIZE:
            raise ValueError(f"Image too large. Maximum base64 size is {MAX_BASE64_SIZE} bytes")
        return v

    @field_validator("mime_type")
    @classmethod
    def validate_mime_type(cls, v: str) -> str:
        if v not in ALLOWED_MIME_TYPES:
            raise ValueError(f"Unsupported mime type: {v}. Allowed: {', '.join(ALLOWED_MIME_TYPES)}")
        return v


class TextParseRequest(BaseModel):
    text: str


UNIVERSAL_EXTRACTION_PROMPT = (
    "Extract structured data from this receipt image. "
    "First determine the receipt TYPE (fuel, food, maintenance, accommodation, shopping, general).\n\n"
    "Return ONLY valid JSON with these fields:\n"
    '- "receipt_type": one of "fuel", "food", "maintenance", "accommodation", "shopping", "general"\n'
    '- "total": number or null (total cost)\n'
    '- "date": "YYYY-MM-DD" string or null\n'
    '- "vendor": string or null (business/store name)\n'
    '- "description": string or null (summary of items/services)\n'
    '- "suggested_category": one of "Fuel", "Food", "Camp", "Fun", "Other"\n'
    '- "confidence": object with keys total, date, vendor, description each valued 0.0-1.0\n\n'
    "If this is a FUEL receipt, also include:\n"
    '- "volume": number or null (fuel volume)\n'
    '- "price": number or null (price per unit)\n'
    '- "unit": "L" or "GAL"\n'
    '- "odometer": number or null\n'
    '- "station": string or null\n\n'
    "Return only the JSON object, no markdown or explanation."
)


@router.post("/receipts/parse-vision")
async def parse_receipt_vision(
    body: VisionParseRequest,
    current_user: dict = Depends(verify_supabase_jwt_token),
):
    """
    Use Claude Vision to extract structured data from any receipt image.

    Detects receipt type and extracts common fields. For fuel receipts,
    also extracts volume, price-per-unit, odometer, and unit.
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

        # PDFs use "document" content type, images use "image"
        content_type = "document" if body.mime_type == "application/pdf" else "image"

        message = await client.messages.create(
            model="claude-sonnet-4-5-20250929",
            max_tokens=1024,
            messages=[
                {
                    "role": "user",
                    "content": [
                        {
                            "type": content_type,
                            "source": {
                                "type": "base64",
                                "media_type": body.mime_type,
                                "data": body.image_base64,
                            },
                        },
                        {
                            "type": "text",
                            "text": UNIVERSAL_EXTRACTION_PROMPT,
                        },
                    ],
                }
            ],
        )

        raw_text = message.content[0].text.strip()

        # Strip markdown code fences if Claude wraps the JSON
        if raw_text.startswith("```"):
            lines = raw_text.split("\n")
            lines = [l for l in lines if not l.strip().startswith("```")]
            raw_text = "\n".join(lines).strip()

        extracted = json.loads(raw_text)

        conf = extracted.get("confidence", {})
        non_zero = [v for v in conf.values() if isinstance(v, (int, float)) and v > 0]
        overall = sum(non_zero) / len(non_zero) if non_zero else 0.0

        receipt_type = extracted.get("receipt_type", "general")

        # Build fuel_data sub-object when the receipt is a fuel type
        fuel_data = None
        if receipt_type == "fuel":
            fuel_data = {
                "volume": extracted.get("volume"),
                "price": extracted.get("price"),
                "unit": extracted.get("unit", "L"),
                "odometer": extracted.get("odometer"),
                "station": extracted.get("station"),
            }

        return {
            "success": True,
            "extracted": {
                "receipt_type": receipt_type,
                "total": extracted.get("total"),
                "date": extracted.get("date"),
                "vendor": extracted.get("vendor"),
                "description": extracted.get("description"),
                "suggested_category": extracted.get("suggested_category", "Other"),
                "fuel_data": fuel_data,
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
        logger.error(f"Universal vision receipt parse error: {type(e).__name__}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to parse receipt with vision: {type(e).__name__}",
        )


@router.post("/receipts/parse-text")
async def parse_receipt_text_endpoint(
    body: TextParseRequest,
    current_user: dict = Depends(verify_supabase_jwt_token),
):
    """Parse OCR text to extract structured receipt data using regex patterns."""
    from app.services.receipts.universal_parser import parse_receipt_text_universal

    result = parse_receipt_text_universal(body.text)
    return {
        "success": True,
        "extracted": result,
        "method": "regex_text_parser",
        "overall_confidence": result.get("overall_confidence", 0),
    }
