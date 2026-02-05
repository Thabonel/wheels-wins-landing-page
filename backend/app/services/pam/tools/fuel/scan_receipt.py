"""
Scan Fuel Receipt Tool

PAM tool that processes a receipt image URL through OCR to extract fuel data.
"""

import logging
from typing import Dict, Any, Optional

from app.core.config import settings

logger = logging.getLogger(__name__)


async def scan_fuel_receipt(
    user_id: str,
    receipt_url: str,
    ocr_text: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Process a fuel receipt image and extract structured data.

    If ocr_text is provided (from frontend Tesseract.js), parse it directly.
    Otherwise, download the image and use Claude Vision.
    """
    from app.services.pam.tools.fuel.receipt_parser import parse_receipt_text

    if ocr_text:
        result = parse_receipt_text(ocr_text)
        result["receipt_url"] = receipt_url
        result["method"] = "tesseract_ocr"
        return {"success": True, "extracted": result}

    # Fallback: Use Claude Vision API
    try:
        import anthropic
        import httpx
        import base64

        async with httpx.AsyncClient() as http_client:
            resp = await http_client.get(receipt_url)
            if resp.status_code != 200:
                return {"success": False, "error": "Could not download receipt image"}

            image_b64 = base64.b64encode(resp.content).decode("utf-8")
            content_type = resp.headers.get("content-type", "image/jpeg")

        api_key = settings.ANTHROPIC_API_KEY
        if hasattr(api_key, "get_secret_value"):
            api_key = api_key.get_secret_value()

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
                            '"station": "string" or null, "unit": "L" or "GAL"}'
                        )
                    }
                ]
            }]
        )

        import json
        response_text = response.content[0].text.strip()
        if response_text.startswith("```"):
            response_text = response_text.split("\n", 1)[1].rsplit("```", 1)[0].strip()

        extracted = json.loads(response_text)
        extracted["receipt_url"] = receipt_url
        extracted["method"] = "claude_vision"

        return {"success": True, "extracted": extracted}

    except Exception as e:
        logger.error(f"scan_fuel_receipt failed for user {user_id}: {e}")
        return {
            "success": False,
            "error": f"Could not parse receipt: {str(e)}",
            "receipt_url": receipt_url,
        }
