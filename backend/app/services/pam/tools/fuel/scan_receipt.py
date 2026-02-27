"""
Receipt Confidence System - AI data extraction with mandatory user verification

All receipt data extraction includes confidence scores and requires user approval
for low-confidence extractions. This prevents inaccurate AI-parsed data from
being automatically accepted without user review.

Usage in PAM:
    # Extract receipt data with confidence scoring
    result = await scan_fuel_receipt_with_confidence(
        user_id=user_id,
        receipt_url=receipt_url,
        ocr_text=optional_ocr_text
    )

    # Result includes confidence scores and approval requirements:
    # - High confidence (>0.8): Auto-approved
    # - Medium confidence (0.5-0.8): User review recommended
    # - Low confidence (<0.5): User confirmation required

    # Frontend shows confidence scores and extracted data
    # User approves, corrects, or rejects the extraction

Example confidence display:
- "Total: $67.50 (95% confident)"
- "Volume: 45.2L (78% confident) - Please review"
- "Station: [Unclear OCR] (23% confident) - Requires correction"
"""

import json
import logging
from typing import Dict, Any, Optional

from app.core.config import settings

logger = logging.getLogger(__name__)


# Confidence thresholds for user approval requirements
HIGH_CONFIDENCE_THRESHOLD = 0.80   # Auto-approve if above this
MEDIUM_CONFIDENCE_THRESHOLD = 0.50 # Review recommended
LOW_CONFIDENCE_THRESHOLD = 0.30    # Must require user confirmation

async def scan_fuel_receipt_with_confidence(
    user_id: str,
    receipt_url: str,
    ocr_text: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Extract fuel receipt data with confidence scoring and approval requirements.

    This function analyzes receipt data and determines what level of user
    confirmation is required based on AI confidence scores.

    If ocr_text is provided (from frontend Tesseract.js), parse it directly.
    Otherwise, download the image and use Claude Vision.

    Returns:
        Dict with extracted data, confidence analysis, and approval requirements
    """
    from app.services.pam.tools.fuel.receipt_parser import parse_receipt_text

    if ocr_text:
        # Parse OCR text and analyze confidence
        extracted_data = parse_receipt_text(ocr_text)
        extracted_data["receipt_url"] = receipt_url
        extracted_data["method"] = "tesseract_ocr"

        # Analyze confidence and determine approval requirements
        confidence_analysis = _analyze_confidence_and_approval(extracted_data)

        return {
            "success": True,
            "extracted": extracted_data,
            "confidence_analysis": confidence_analysis,
            "requires_user_confirmation": confidence_analysis["requires_confirmation"],
            "approval_message": confidence_analysis["user_message"]
        }

    # Fallback: Use Claude Vision API
    try:
        import anthropic
        import httpx
        import base64

        async with httpx.AsyncClient(timeout=30.0) as http_client:
            resp = await http_client.get(receipt_url)
            if resp.status_code != 200:
                return {"success": False, "error": "Could not download receipt image"}

            image_b64 = base64.b64encode(resp.content).decode("utf-8")
            content_type = resp.headers.get("content-type", "image/jpeg")

        api_key = settings.anthropic_api_key
        if not api_key:
            return {"success": False, "error": "Vision service not configured"}

        client = anthropic.AsyncAnthropic(api_key=api_key)
        response = await client.messages.create(
            model="claude-sonnet-4-5-20250929",
            max_tokens=500,
            messages=[{
                "role": "user",
                "content": [
                    {
                        "type": "image",
                        "source": {
                            "type": "base64",
                            "media_type": content_type,
                            "data": image_b64,
                        }
                    },
                    {
                        "type": "text",
                        "text": (
                            "Extract fuel receipt data as JSON. Return ONLY valid JSON:\n"
                            '{"total": number or null, "volume": number or null, '
                            '"price": number or null, "date": "YYYY-MM-DD" or null, '
                            '"station": "string" or null, "odometer": number or null, '
                            '"unit": "L" or "GAL"}. '
                            "Calculate missing values if possible (total = volume * price)."
                        )
                    }
                ]
            }]
        )

        response_text = response.content[0].text.strip()
        if response_text.startswith("```"):
            response_text = response_text.split("\n", 1)[1].rsplit("```", 1)[0].strip()

        extracted_data = json.loads(response_text)
        extracted_data["receipt_url"] = receipt_url
        extracted_data["method"] = "claude_vision"

        # For Claude Vision, add basic confidence scoring
        # (Claude Vision is generally more accurate than OCR)
        if "confidence" not in extracted_data:
            extracted_data["confidence"] = _estimate_vision_confidence(extracted_data)

        # Calculate overall confidence if not present
        if "overall_confidence" not in extracted_data:
            extracted_data["overall_confidence"] = _calculate_overall_confidence(extracted_data["confidence"])

        # Analyze confidence and determine approval requirements
        confidence_analysis = _analyze_confidence_and_approval(extracted_data)

        return {
            "success": True,
            "extracted": extracted_data,
            "confidence_analysis": confidence_analysis,
            "requires_user_confirmation": confidence_analysis["requires_confirmation"],
            "approval_message": confidence_analysis["user_message"]
        }

    except Exception as e:
        logger.error(f"scan_fuel_receipt failed for user {user_id}: {e}")
        return {
            "success": False,
            "error": f"Could not parse receipt: {str(e)}",
            "receipt_url": receipt_url,
        }


def _estimate_vision_confidence(extracted_data: Dict[str, Any]) -> Dict[str, float]:
    """Estimate confidence scores for Claude Vision extractions."""
    confidence = {}

    # Claude Vision is generally accurate, but confidence varies by field completeness
    for field in ["total", "volume", "price", "date", "station", "odometer"]:
        if extracted_data.get(field) is not None:
            # Vision API found the field
            if field in ["total", "price"]:
                confidence[field] = 0.90  # Financial fields usually accurate
            elif field in ["volume", "date"]:
                confidence[field] = 0.85  # Structured data usually accurate
            elif field == "station":
                confidence[field] = 0.75  # Text recognition varies
            elif field == "odometer":
                confidence[field] = 0.70  # Often missing or unclear
        else:
            confidence[field] = 0.0  # Field not found

    return confidence


def _calculate_overall_confidence(confidence_dict: Dict[str, float]) -> float:
    """Calculate overall confidence from individual field confidences."""
    non_zero = [v for v in confidence_dict.values() if v > 0]
    return round(sum(non_zero) / len(non_zero), 4) if non_zero else 0.0


def _analyze_confidence_and_approval(extracted_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Analyze extraction confidence and determine approval requirements.

    Returns dict with:
        - requires_confirmation: bool
        - confidence_level: "high" | "medium" | "low"
        - user_message: str with recommendation
        - field_analysis: dict with per-field analysis
    """
    overall_conf = extracted_data.get("overall_confidence", 0.0)
    field_conf = extracted_data.get("confidence", {})

    # Analyze individual fields
    field_analysis = {}
    critical_fields = ["total", "volume", "price"]  # Most important for fuel tracking

    low_confidence_fields = []
    medium_confidence_fields = []
    high_confidence_fields = []

    for field, conf in field_conf.items():
        field_value = extracted_data.get(field)

        if field_value is None:
            status = "missing"
            message = "Not found on receipt"
        elif conf >= HIGH_CONFIDENCE_THRESHOLD:
            status = "high_confidence"
            message = f"{conf:.0%} confident"
            high_confidence_fields.append(field)
        elif conf >= MEDIUM_CONFIDENCE_THRESHOLD:
            status = "medium_confidence"
            message = f"{conf:.0%} confident - Please review"
            medium_confidence_fields.append(field)
        else:
            status = "low_confidence"
            message = f"{conf:.0%} confident - Requires verification"
            low_confidence_fields.append(field)

        field_analysis[field] = {
            "value": field_value,
            "confidence": conf,
            "status": status,
            "message": message
        }

    # Determine overall approval requirement
    critical_low_conf = any(field in critical_fields for field in low_confidence_fields)

    if overall_conf >= HIGH_CONFIDENCE_THRESHOLD and not critical_low_conf:
        requires_confirmation = False
        confidence_level = "high"
        user_message = (
            f"✅ High confidence extraction ({overall_conf:.0%}). "
            "Data looks accurate and ready to use."
        )
    elif overall_conf >= MEDIUM_CONFIDENCE_THRESHOLD:
        requires_confirmation = True
        confidence_level = "medium"
        user_message = (
            f"⚠️ Medium confidence extraction ({overall_conf:.0%}). "
            f"Please review {len(medium_confidence_fields + low_confidence_fields)} field(s) "
            "and confirm or correct the data before saving."
        )
    else:
        requires_confirmation = True
        confidence_level = "low"
        user_message = (
            f"❌ Low confidence extraction ({overall_conf:.0%}). "
            f"Found {len(low_confidence_fields)} uncertain field(s). "
            "Please verify and correct the data before saving."
        )

    return {
        "requires_confirmation": requires_confirmation,
        "confidence_level": confidence_level,
        "user_message": user_message,
        "field_analysis": field_analysis,
        "summary": {
            "overall_confidence": overall_conf,
            "high_confidence_fields": high_confidence_fields,
            "medium_confidence_fields": medium_confidence_fields,
            "low_confidence_fields": low_confidence_fields,
            "critical_fields_uncertain": critical_low_conf
        }
    }


async def approve_receipt_data(
    user_id: str,
    extraction_id: str,
    approved_data: Dict[str, Any],
    user_corrections: Optional[Dict[str, Any]] = None,
    **kwargs
) -> Dict[str, Any]:
    """
    Approve receipt extraction data after user review and optional corrections.

    This function should be called after the user has reviewed the extracted
    receipt data and either approved it as-is or provided corrections.

    Args:
        user_id: UUID of the user
        extraction_id: ID of the original extraction to approve
        approved_data: The final approved receipt data
        user_corrections: Optional dict of fields the user corrected

    Returns:
        Dict with approved receipt data ready for expense tracking

    Raises:
        ValidationError: Invalid input parameters
    """
    try:
        from app.services.pam.tools.utils import validate_uuid, validate_required

        validate_uuid(user_id, "user_id")
        validate_required(extraction_id, "extraction_id")
        validate_required(approved_data, "approved_data")

        # Validate that approved data contains required fields
        required_fields = ["total", "volume", "price"]
        missing_fields = [field for field in required_fields
                         if approved_data.get(field) is None]

        if missing_fields:
            return {
                "success": False,
                "error": f"Missing required fields: {', '.join(missing_fields)}",
                "requires_correction": True
            }

        # Mark data as user-approved
        approved_data["user_approved"] = True
        approved_data["user_id"] = user_id
        approved_data["approval_timestamp"] = json.loads(json.dumps(
            __import__('datetime').datetime.now(),
            default=str
        ))

        if user_corrections:
            approved_data["user_corrections"] = user_corrections
            approved_data["had_corrections"] = True
            logger.info(f"User {user_id} approved receipt data with corrections: {list(user_corrections.keys())}")
        else:
            approved_data["had_corrections"] = False
            logger.info(f"User {user_id} approved receipt data without corrections")

        return {
            "success": True,
            "approved_data": approved_data,
            "message": "✅ Receipt data approved and ready for expense tracking!",
            "ready_for_expense_creation": True
        }

    except Exception as e:
        logger.error(f"approve_receipt_data failed for user {user_id}: {e}")
        return {
            "success": False,
            "error": f"Failed to approve receipt data: {str(e)}"
        }
