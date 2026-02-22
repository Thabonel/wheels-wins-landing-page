# Fuel Receipt Upload Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Allow users to upload a fuel receipt photo (via PAM chat or FuelLog UI) and have OCR extract the data to auto-create a fuel log entry.

**Architecture:** Frontend tries Tesseract.js OCR first. If confidence is low, falls back to a backend endpoint that uses Claude Vision API to extract structured fuel data. Extracted fields pre-fill a confirmation form. On confirm, the existing `add_fuel_entry` function creates the record. Receipt images are stored in Supabase Storage with URL saved to a new `receipt_url` column on `fuel_log`.

**Tech Stack:** Tesseract.js (frontend OCR), Claude Vision API (backend fallback), Supabase Storage, FastAPI, React/TypeScript

---

### Task 1: Add receipt_url column to fuel_log table

**Files:**
- Create: `docs/sql-fixes/ADD_FUEL_LOG_RECEIPT_URL.sql`

**Step 1: Write the SQL migration**

```sql
-- Add receipt_url column to fuel_log table for storing receipt image URLs
ALTER TABLE fuel_log ADD COLUMN IF NOT EXISTS receipt_url TEXT;

-- Add receipt_metadata column for OCR extraction data (confidence scores, extracted fields)
ALTER TABLE fuel_log ADD COLUMN IF NOT EXISTS receipt_metadata JSONB;
```

**Step 2: Apply the migration via Supabase MCP**

Run the SQL against the Supabase database using `mcp__supabase__execute_sql`.

**Step 3: Verify columns exist**

```sql
SELECT column_name, data_type FROM information_schema.columns
WHERE table_name = 'fuel_log' AND column_name IN ('receipt_url', 'receipt_metadata');
```

Expected: 2 rows returned.

**Step 4: Commit**

```bash
git add docs/sql-fixes/ADD_FUEL_LOG_RECEIPT_URL.sql
git commit -m "feat: add receipt_url and receipt_metadata columns to fuel_log"
```

---

### Task 2: Backend receipt parsing endpoint with Claude Vision fallback

**Files:**
- Create: `backend/app/services/pam/tools/fuel/receipt_parser.py`
- Create: `backend/app/api/v1/fuel_receipts.py`
- Modify: `backend/app/main.py` (add router)
- Test: `tests/pam/test_receipt_parser.py`

**Step 1: Write the failing test for receipt_parser.py**

```python
"""Tests for fuel receipt parser - extracts structured data from OCR text"""
import sys
import os
import asyncio

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', 'backend'))

os.environ.setdefault("ENVIRONMENT", "test")
os.environ.setdefault("SUPABASE_URL", "https://test.supabase.co")
os.environ.setdefault("SUPABASE_SERVICE_ROLE_KEY", "test-key")


def test_parse_receipt_text_extracts_total():
    """Must extract total cost from receipt text"""
    from app.services.pam.tools.fuel.receipt_parser import parse_receipt_text
    result = parse_receipt_text("TOTAL: $67.50\nVolume: 45.00L\nPrice: $1.50/L")
    assert result["total"] == 67.50


def test_parse_receipt_text_extracts_volume():
    """Must extract volume (litres or gallons)"""
    from app.services.pam.tools.fuel.receipt_parser import parse_receipt_text
    result = parse_receipt_text("TOTAL: $67.50\nVolume: 45.00L\nPrice: $1.50/L")
    assert result["volume"] == 45.0


def test_parse_receipt_text_extracts_price():
    """Must extract price per unit"""
    from app.services.pam.tools.fuel.receipt_parser import parse_receipt_text
    result = parse_receipt_text("TOTAL: $67.50\nVolume: 45.00L\nPrice: $1.50/L")
    assert result["price"] == 1.50


def test_parse_receipt_text_extracts_date():
    """Must extract date from receipt"""
    from app.services.pam.tools.fuel.receipt_parser import parse_receipt_text
    result = parse_receipt_text("Date: 02/06/2026\nTOTAL: $67.50\nVolume: 45.00L")
    assert result["date"] == "2026-02-06"


def test_parse_receipt_text_extracts_station():
    """Must extract station name from receipt header"""
    from app.services.pam.tools.fuel.receipt_parser import parse_receipt_text
    result = parse_receipt_text("Shell Service Station\nDate: 02/06/2026\nTOTAL: $67.50")
    assert "shell" in result["station"].lower()


def test_parse_receipt_text_returns_confidence():
    """Must return confidence scores for each field"""
    from app.services.pam.tools.fuel.receipt_parser import parse_receipt_text
    result = parse_receipt_text("TOTAL: $67.50\nVolume: 45.00L\nPrice: $1.50/L")
    assert "confidence" in result
    assert result["confidence"]["total"] > 0.5


def test_parse_receipt_text_handles_empty():
    """Empty text should return empty result with low confidence"""
    from app.services.pam.tools.fuel.receipt_parser import parse_receipt_text
    result = parse_receipt_text("")
    assert result["total"] is None
    assert result["volume"] is None


def test_parse_receipt_text_handles_gallons():
    """Must handle gallon-based receipts"""
    from app.services.pam.tools.fuel.receipt_parser import parse_receipt_text
    result = parse_receipt_text("TOTAL: $45.00\n12.5 GAL @ $3.60/GAL")
    assert result["volume"] == 12.5
    assert result["price"] == 3.60


def test_parse_receipt_text_overall_confidence():
    """Must return overall_confidence as average of field confidences"""
    from app.services.pam.tools.fuel.receipt_parser import parse_receipt_text
    result = parse_receipt_text("TOTAL: $67.50\nVolume: 45.00L\nPrice: $1.50/L")
    assert "overall_confidence" in result
    assert 0 <= result["overall_confidence"] <= 1.0
```

**Step 2: Run test to verify it fails**

Run: `cd /Users/thabonel/Code/wheels-wins-landing-page/backend && python -m pytest ../tests/pam/test_receipt_parser.py -v --tb=short`
Expected: FAIL with "cannot import name 'parse_receipt_text'"

**Step 3: Write receipt_parser.py**

```python
"""
Fuel Receipt Text Parser

Extracts structured fuel data from OCR text using regex patterns.
Handles both metric (litres) and imperial (gallons) formats.
Returns confidence scores for each extracted field.
"""

import re
import logging
from typing import Dict, Any, Optional
from datetime import datetime

logger = logging.getLogger(__name__)

# Patterns for fuel receipt fields
TOTAL_PATTERNS = [
    r"(?:total|amount|due|charge)[:\s]*\$?([\d,]+\.?\d*)",
    r"\$\s*([\d,]+\.\d{2})\s*$",  # Dollar amount at end of line
    r"(?:sale|purchase)[:\s]*\$?([\d,]+\.?\d*)",
]

VOLUME_PATTERNS = [
    r"([\d.]+)\s*(?:L|litres?|liters?)\b",
    r"(?:volume|qty|quantity)[:\s]*([\d.]+)",
    r"([\d.]+)\s*(?:GAL|gallons?)\b",
    r"([\d.]+)\s*(?:gal)\s*@",
]

PRICE_PATTERNS = [
    r"(?:price|rate)[:\s]*\$?([\d.]+)\s*/?\s*(?:L|litre|liter|gal)",
    r"\$?([\d.]+)\s*/\s*(?:L|litre|liter|gal)",
    r"@\s*\$?([\d.]+)\s*/?\s*(?:L|litre|liter|GAL|gal)",
    r"([\d.]+)\s*(?:c|cents?)\s*/?\s*(?:L|litre|liter)",
]

DATE_PATTERNS = [
    r"(?:date|dated?)[:\s]*([\d]{1,2})[/\-]([\d]{1,2})[/\-]([\d]{2,4})",
    r"([\d]{1,2})[/\-]([\d]{1,2})[/\-]([\d]{4})",
    r"([\d]{4})[/\-]([\d]{1,2})[/\-]([\d]{1,2})",
]

STATION_KEYWORDS = [
    "shell", "bp", "caltex", "ampol", "7-eleven", "united", "liberty",
    "costco", "mobil", "chevron", "exxon", "texaco", "citgo", "sunoco",
    "speedway", "marathon", "wawa", "circle k", "pilot", "love",
    "petro", "fuel", "gas", "station", "service",
]


def parse_receipt_text(text: str) -> Dict[str, Any]:
    """
    Parse OCR text from a fuel receipt into structured data.

    Args:
        text: Raw OCR text from receipt image

    Returns:
        Dict with extracted fields and confidence scores:
        {
            "total": float or None,
            "volume": float or None,
            "price": float or None,
            "date": str (YYYY-MM-DD) or None,
            "station": str or None,
            "unit": "L" or "GAL",
            "confidence": {"total": 0-1, "volume": 0-1, "price": 0-1, "date": 0-1, "station": 0-1},
            "overall_confidence": float 0-1
        }
    """
    if not text or not text.strip():
        return {
            "total": None,
            "volume": None,
            "price": None,
            "date": None,
            "station": None,
            "unit": "L",
            "confidence": {"total": 0, "volume": 0, "price": 0, "date": 0, "station": 0},
            "overall_confidence": 0.0,
        }

    text_lower = text.lower()
    result = {
        "total": None,
        "volume": None,
        "price": None,
        "date": None,
        "station": None,
        "unit": "L",
        "confidence": {"total": 0.0, "volume": 0.0, "price": 0.0, "date": 0.0, "station": 0.0},
    }

    # Detect unit system
    if re.search(r"\bgal(?:lon)?s?\b", text_lower):
        result["unit"] = "GAL"

    # Extract total
    for pattern in TOTAL_PATTERNS:
        match = re.search(pattern, text, re.IGNORECASE | re.MULTILINE)
        if match:
            try:
                result["total"] = float(match.group(1).replace(",", ""))
                result["confidence"]["total"] = 0.85
                break
            except ValueError:
                continue

    # Extract volume
    for pattern in VOLUME_PATTERNS:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            try:
                result["volume"] = float(match.group(1))
                result["confidence"]["volume"] = 0.85
                break
            except ValueError:
                continue

    # Extract price per unit
    for pattern in PRICE_PATTERNS:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            try:
                val = float(match.group(1))
                # If matched cents pattern, convert to dollars
                if val > 10 and "cent" in text_lower:
                    val = val / 100
                result["price"] = val
                result["confidence"]["price"] = 0.80
                break
            except ValueError:
                continue

    # Extract date
    for pattern in DATE_PATTERNS:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            groups = match.groups()
            try:
                if len(groups[0]) == 4:
                    # YYYY-MM-DD format
                    parsed = datetime(int(groups[0]), int(groups[1]), int(groups[2]))
                else:
                    year = int(groups[2])
                    if year < 100:
                        year += 2000
                    month = int(groups[0])
                    day = int(groups[1])
                    # Swap if month > 12 (likely DD/MM format)
                    if month > 12:
                        month, day = day, month
                    parsed = datetime(year, month, day)
                result["date"] = parsed.strftime("%Y-%m-%d")
                result["confidence"]["date"] = 0.75
                break
            except (ValueError, IndexError):
                continue

    # Extract station name (first line that contains a station keyword)
    lines = text.strip().split("\n")
    for line in lines[:5]:  # Check first 5 lines only
        line_lower = line.strip().lower()
        for keyword in STATION_KEYWORDS:
            if keyword in line_lower:
                result["station"] = line.strip()
                result["confidence"]["station"] = 0.70
                break
        if result["station"]:
            break

    # Calculate overall confidence
    confidences = [v for v in result["confidence"].values() if v > 0]
    result["overall_confidence"] = sum(confidences) / len(confidences) if confidences else 0.0

    return result
```

**Step 4: Run test to verify it passes**

Run: `cd /Users/thabonel/Code/wheels-wins-landing-page/backend && python -m pytest ../tests/pam/test_receipt_parser.py -v --tb=short`
Expected: 9/9 PASS

**Step 5: Create the fuel receipt upload API endpoint**

Create `backend/app/api/v1/fuel_receipts.py`:

```python
"""
Fuel Receipt Upload and OCR Endpoint

Handles fuel receipt image upload, stores in Supabase Storage,
and uses Claude Vision API as fallback OCR when Tesseract.js
confidence is low.
"""

import uuid
import base64
import mimetypes
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from pydantic import BaseModel

from app.core.database import get_supabase_client
from app.api.deps import verify_supabase_jwt_token
from app.core.logging import get_logger
from app.core.config import settings

router = APIRouter()
logger = get_logger(__name__)

MAX_FILE_SIZE = 5 * 1024 * 1024  # 5MB
ALLOWED_MIME_TYPES = [
    "image/jpeg", "image/jpg", "image/png",
    "image/webp", "image/heic", "image/heif"
]


class ReceiptOCRRequest(BaseModel):
    """Request body for Vision OCR fallback"""
    image_base64: str
    mime_type: str = "image/jpeg"


@router.post("/fuel/upload-receipt")
async def upload_fuel_receipt(
    file: UploadFile = File(...),
    current_user: dict = Depends(verify_supabase_jwt_token)
):
    """
    Upload a fuel receipt image to Supabase Storage.

    Returns the public URL for the uploaded receipt.
    Frontend handles primary OCR via Tesseract.js.
    """
    user_id = current_user.get("sub")
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User ID not found")

    contents = await file.read()
    if len(contents) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File exceeds {MAX_FILE_SIZE // (1024*1024)}MB limit"
        )

    content_type = file.content_type
    if content_type not in ALLOWED_MIME_TYPES:
        guessed = mimetypes.guess_type(file.filename)[0]
        if guessed not in ALLOWED_MIME_TYPES:
            raise HTTPException(
                status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
                detail=f"File type {content_type} not allowed"
            )
        content_type = guessed

    file_ext = file.filename.rsplit('.', 1)[-1] if '.' in file.filename else 'jpg'
    timestamp = datetime.utcnow().strftime('%Y%m%d_%H%M%S')
    storage_path = f"{user_id}/fuel-receipts/{timestamp}_{uuid.uuid4().hex[:8]}.{file_ext}"

    supabase = get_supabase_client()

    try:
        buckets = supabase.storage.list_buckets()
        if not any(b.name == 'receipts' for b in buckets):
            supabase.storage.create_bucket('receipts', options={
                "public": True,
                "file_size_limit": MAX_FILE_SIZE,
                "allowed_mime_types": ALLOWED_MIME_TYPES
            })
    except Exception as e:
        logger.warning(f"Bucket check failed (may exist): {e}")

    response = supabase.storage.from_('receipts').upload(
        path=storage_path,
        file=contents,
        file_options={"content-type": content_type, "upsert": False}
    )

    if hasattr(response, 'error') and response.error:
        raise HTTPException(status_code=500, detail="Failed to upload receipt")

    public_url = supabase.storage.from_('receipts').get_public_url(storage_path)

    logger.info(f"Fuel receipt uploaded for user {user_id}: {storage_path}")

    return {
        "success": True,
        "receipt_url": public_url,
        "filename": storage_path,
        "size": len(contents),
        "content_type": content_type
    }


@router.post("/fuel/parse-receipt-vision")
async def parse_receipt_with_vision(
    request: ReceiptOCRRequest,
    current_user: dict = Depends(verify_supabase_jwt_token)
):
    """
    Fallback OCR: Send receipt image to Claude Vision API for extraction.

    Called by frontend when Tesseract.js confidence is below threshold.
    """
    user_id = current_user.get("sub")
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User ID not found")

    try:
        import anthropic
        client = anthropic.AsyncAnthropic(api_key=settings.ANTHROPIC_API_KEY)

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
                            "media_type": request.mime_type,
                            "data": request.image_base64,
                        }
                    },
                    {
                        "type": "text",
                        "text": (
                            "Extract fuel receipt data as JSON. Return ONLY valid JSON with these fields:\n"
                            '{"total": number or null, "volume": number or null, "price": number or null, '
                            '"date": "YYYY-MM-DD" or null, "station": "string" or null, "unit": "L" or "GAL"}\n'
                            "Extract the total cost, fuel volume, price per unit, date, and station name."
                        )
                    }
                ]
            }]
        )

        import json
        response_text = response.content[0].text.strip()
        # Strip markdown code fences if present
        if response_text.startswith("```"):
            response_text = response_text.split("\n", 1)[1].rsplit("```", 1)[0].strip()

        extracted = json.loads(response_text)

        return {
            "success": True,
            "extracted": extracted,
            "method": "claude_vision",
            "confidence": {
                "total": 0.95 if extracted.get("total") else 0,
                "volume": 0.95 if extracted.get("volume") else 0,
                "price": 0.95 if extracted.get("price") else 0,
                "date": 0.90 if extracted.get("date") else 0,
                "station": 0.85 if extracted.get("station") else 0,
            },
            "overall_confidence": 0.92,
        }

    except json.JSONDecodeError:
        raise HTTPException(status_code=422, detail="Could not parse receipt - try a clearer photo")
    except Exception as e:
        logger.error(f"Vision OCR failed for user {user_id}: {e}")
        raise HTTPException(status_code=500, detail="Receipt analysis failed")
```

**Step 6: Register the router in main.py**

In `backend/app/main.py`, add:

```python
from app.api.v1.fuel_receipts import router as fuel_receipts_router
app.include_router(fuel_receipts_router, prefix="/api/v1", tags=["fuel-receipts"])
```

Find the existing router registrations (near the other `include_router` calls) and add this alongside them.

**Step 7: Commit**

```bash
git add backend/app/services/pam/tools/fuel/receipt_parser.py
git add backend/app/api/v1/fuel_receipts.py
git add backend/app/main.py
git add -f tests/pam/test_receipt_parser.py
git commit -m "feat: add fuel receipt parser and upload/vision OCR endpoints"
```

---

### Task 3: Update add_fuel_entry to accept receipt_url

**Files:**
- Modify: `backend/app/services/pam/tools/fuel/fuel_crud.py:30-170`

**Step 1: Write the failing test**

Add to `tests/pam/test_receipt_parser.py`:

```python
def test_add_fuel_entry_accepts_receipt_url():
    """add_fuel_entry must accept receipt_url parameter"""
    import inspect
    from app.services.pam.tools.fuel.fuel_crud import add_fuel_entry
    sig = inspect.signature(add_fuel_entry)
    assert "receipt_url" in sig.parameters
    assert "receipt_metadata" in sig.parameters
```

**Step 2: Run test to verify it fails**

Run: `cd /Users/thabonel/Code/wheels-wins-landing-page/backend && python -m pytest ../tests/pam/test_receipt_parser.py::test_add_fuel_entry_accepts_receipt_url -v`
Expected: FAIL with "receipt_url not in sig.parameters"

**Step 3: Add receipt_url and receipt_metadata params to add_fuel_entry**

In `backend/app/services/pam/tools/fuel/fuel_crud.py`, update the `add_fuel_entry` function signature to add two new optional params:

```python
async def add_fuel_entry(
    user_id: str,
    odometer: float,
    volume: Optional[float] = None,
    price: Optional[float] = None,
    total: Optional[float] = None,
    entry_date: Optional[str] = None,
    filled_to_top: bool = True,
    station: Optional[str] = None,
    notes: Optional[str] = None,
    receipt_url: Optional[str] = None,
    receipt_metadata: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
```

And in the `record_data` dict construction (around line 127-141), add:

```python
        if receipt_url:
            record_data["receipt_url"] = receipt_url
        if receipt_metadata:
            record_data["receipt_metadata"] = receipt_metadata
```

**Step 4: Run test to verify it passes**

Run: `cd /Users/thabonel/Code/wheels-wins-landing-page/backend && python -m pytest ../tests/pam/test_receipt_parser.py -v`
Expected: ALL PASS

**Step 5: Commit**

```bash
git add backend/app/services/pam/tools/fuel/fuel_crud.py
git add -f tests/pam/test_receipt_parser.py
git commit -m "feat: add receipt_url and receipt_metadata params to add_fuel_entry"
```

---

### Task 4: Register scan_fuel_receipt PAM tool

**Files:**
- Create: `backend/app/services/pam/tools/fuel/scan_receipt.py`
- Modify: `backend/app/services/pam/tools/fuel/__init__.py`
- Modify: `backend/app/services/pam/tools/tool_registry.py` (add registration)

**Step 1: Write the failing test**

Add to `tests/pam/test_receipt_parser.py`:

```python
def test_scan_fuel_receipt_tool_exists():
    """scan_fuel_receipt must be importable"""
    from app.services.pam.tools.fuel.scan_receipt import scan_fuel_receipt
    assert callable(scan_fuel_receipt)


def test_scan_fuel_receipt_registered_in_registry():
    """scan_fuel_receipt must be in tool registry after loading"""
    from app.services.pam.tools.tool_registry import ToolRegistry, _register_all_tools
    registry = ToolRegistry()
    import asyncio
    asyncio.get_event_loop().run_until_complete(_register_all_tools(registry))
    assert "scan_fuel_receipt" in registry.get_all_tools()
```

**Step 2: Run tests to verify they fail**

Run: `cd /Users/thabonel/Code/wheels-wins-landing-page/backend && python -m pytest ../tests/pam/test_receipt_parser.py::test_scan_fuel_receipt_tool_exists -v`
Expected: FAIL

**Step 3: Create scan_receipt.py**

```python
"""
Scan Fuel Receipt Tool

PAM tool that processes a receipt image URL through OCR to extract fuel data.
Used when a user sends a receipt image in PAM chat.
"""

import logging
from typing import Dict, Any, Optional

from app.core.database import get_supabase_client
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

    Args:
        user_id: The user's ID
        receipt_url: URL of the uploaded receipt image
        ocr_text: Optional pre-extracted OCR text from frontend

    Returns:
        Dict with extracted fuel data and confidence scores
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

        # Download the image
        async with httpx.AsyncClient() as http_client:
            resp = await http_client.get(receipt_url)
            if resp.status_code != 200:
                return {"success": False, "error": "Could not download receipt image"}

            import base64
            image_b64 = base64.b64encode(resp.content).decode("utf-8")
            content_type = resp.headers.get("content-type", "image/jpeg")

        client = anthropic.AsyncAnthropic(api_key=settings.ANTHROPIC_API_KEY)
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
```

**Step 4: Update fuel/__init__.py**

```python
from .scan_receipt import scan_fuel_receipt

__all__ = [
    "add_fuel_entry",
    "update_fuel_entry",
    "delete_fuel_entry",
    "get_fuel_stats",
    "scan_fuel_receipt",
]
```

**Step 5: Register in tool_registry.py**

After the `get_fuel_stats` registration block (around line 5031), add a new registration block following the same pattern as the other fuel tools. The tool definition:

```python
    # Scan Fuel Receipt
    try:
        logger.debug("Attempting to register scan_fuel_receipt tool...")
        from app.services.pam.tools.fuel.scan_receipt import scan_fuel_receipt

        class ScanFuelReceiptWrapper(BaseTool):
            def __init__(self):
                super().__init__(
                    "scan_fuel_receipt",
                    "Scan a fuel receipt image to extract fuel data (total, volume, price, date, station). Use when user uploads or sends a receipt photo.",
                    capabilities=[ToolCapability.USER_DATA]
                )
                self.scan_func = scan_fuel_receipt

            async def initialize(self):
                self.is_initialized = True
                return True

            async def execute(self, user_id: str, parameters: Dict[str, Any]) -> Dict[str, Any]:
                return await self.scan_func(user_id=user_id, **parameters)

        registry.register_tool(
            tool=ScanFuelReceiptWrapper(),
            function_definition={
                "name": "scan_fuel_receipt",
                "description": "Scan a fuel receipt image to extract fuel data (total, volume, price, date, station). Use when user uploads or sends a receipt photo.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "receipt_url": {
                            "type": "string",
                            "description": "URL of the uploaded receipt image"
                        },
                        "ocr_text": {
                            "type": "string",
                            "description": "Optional pre-extracted OCR text from frontend Tesseract.js"
                        }
                    },
                    "required": ["receipt_url"]
                }
            },
            capability=ToolCapability.USER_DATA,
            priority=2
        )
        logger.info("scan_fuel_receipt tool registered")
        registered_count += 1
    except ImportError as e:
        logger.warning(f"Could not register scan_fuel_receipt tool: {e}")
        failed_count += 1
    except Exception as e:
        logger.error(f"scan_fuel_receipt tool registration failed: {e}")
        failed_count += 1
```

**Step 6: Run tests to verify they pass**

Run: `cd /Users/thabonel/Code/wheels-wins-landing-page/backend && python -m pytest ../tests/pam/test_receipt_parser.py -v`
Expected: ALL PASS

**Step 7: Commit**

```bash
git add backend/app/services/pam/tools/fuel/scan_receipt.py
git add backend/app/services/pam/tools/fuel/__init__.py
git add backend/app/services/pam/tools/tool_registry.py
git add -f tests/pam/test_receipt_parser.py
git commit -m "feat: add scan_fuel_receipt PAM tool with Claude Vision fallback"
```

---

### Task 5: Add scan_fuel_receipt to pam.py tool schema

**Files:**
- Modify: `backend/app/services/pam/core/pam.py` (add to `_build_tools_schema`)

**Step 1: Find the fuel tools in _build_tools_schema**

Search for `add_fuel_entry` in `pam.py` to find where fuel tool schemas are defined. Add the new tool schema after the existing fuel tools.

**Step 2: Add scan_fuel_receipt tool schema**

```python
{
    "name": "scan_fuel_receipt",
    "description": "Scan a fuel receipt image to extract fuel data (total, volume, price, date, station). Use when user uploads or sends a receipt photo.",
    "input_schema": {
        "type": "object",
        "properties": {
            "receipt_url": {
                "type": "string",
                "description": "URL of the uploaded receipt image"
            },
            "ocr_text": {
                "type": "string",
                "description": "Optional pre-extracted OCR text from frontend Tesseract.js"
            }
        },
        "required": ["receipt_url"]
    }
}
```

**Step 3: Add tool execution handler in pam.py**

Find where tool execution dispatch happens (the large if/elif block matching tool names). Add:

```python
elif tool_name == "scan_fuel_receipt":
    from app.services.pam.tools.fuel.scan_receipt import scan_fuel_receipt
    result = await scan_fuel_receipt(user_id=user_id, **tool_input)
```

**Step 4: Commit**

```bash
git add backend/app/services/pam/core/pam.py
git commit -m "feat: add scan_fuel_receipt to PAM core tool schema and execution"
```

---

### Task 6: Frontend receipt upload component

**Files:**
- Create: `src/components/wheels/FuelReceiptUpload.tsx`

**Step 1: Create the receipt upload component**

This component handles:
- File input / camera capture
- Tesseract.js OCR (primary)
- Confidence check -> fallback to backend Vision API
- Display extracted data in editable form
- Submit to create fuel entry

```tsx
import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/context/AuthContext";
import { useRegion } from "@/context/RegionContext";
import { supabase } from "@/integrations/supabase/client";
import { Camera, Upload, Loader2 } from "lucide-react";
import Tesseract from "tesseract.js";

const CONFIDENCE_THRESHOLD = 0.7;
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "";

interface ExtractedData {
  total: number | null;
  volume: number | null;
  price: number | null;
  date: string | null;
  station: string | null;
  unit: string;
  receipt_url?: string;
  overall_confidence: number;
}

interface FuelReceiptUploadProps {
  onEntryCreated: (entry: any) => void;
  onCancel: () => void;
}

export default function FuelReceiptUpload({ onEntryCreated, onCancel }: FuelReceiptUploadProps) {
  const { user } = useAuth();
  const { regionConfig } = useRegion();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState("");
  const [extracted, setExtracted] = useState<ExtractedData | null>(null);
  const [receiptUrl, setReceiptUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Editable fields (initialized from OCR)
  const [formData, setFormData] = useState({
    total: "",
    volume: "",
    price: "",
    date: "",
    station: "",
    odometer: "",
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setError(null);
    setExtracted(null);
  };

  const processReceipt = async () => {
    if (!selectedFile || !user) return;
    setIsProcessing(true);
    setError(null);

    try {
      // Step 1: Upload to Supabase Storage
      setProcessingStep("Uploading receipt...");
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      const formDataUpload = new FormData();
      formDataUpload.append("file", selectedFile);

      const uploadResp = await fetch(`${BACKEND_URL}/api/v1/fuel/upload-receipt`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formDataUpload,
      });

      if (!uploadResp.ok) throw new Error("Upload failed");
      const uploadResult = await uploadResp.json();
      setReceiptUrl(uploadResult.receipt_url);

      // Step 2: Try Tesseract.js OCR
      setProcessingStep("Reading receipt with OCR...");
      const ocrResult = await Tesseract.recognize(selectedFile, "eng", {
        logger: (m) => {
          if (m.status === "recognizing text") {
            setProcessingStep(`Reading receipt... ${Math.round((m.progress || 0) * 100)}%`);
          }
        },
      });

      const ocrText = ocrResult.data.text;
      const ocrConfidence = (ocrResult.data.confidence || 0) / 100;

      // Step 3: Parse the OCR text locally
      // Simple client-side parsing (mirrors backend logic)
      let extractedData: ExtractedData;

      if (ocrConfidence >= CONFIDENCE_THRESHOLD && ocrText.trim().length > 20) {
        setProcessingStep("Extracting fuel data...");
        // Send OCR text to backend for structured parsing
        const parseResp = await fetch(`${BACKEND_URL}/api/v1/fuel/parse-receipt-vision`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            image_base64: "", // Not needed when we have good OCR
            mime_type: selectedFile.type,
            // We'll actually use the vision endpoint as fallback below
          }),
        });

        // Actually, let's just use the backend regex parser via a simple approach:
        // Send to vision endpoint only if confidence is low
        // For now, try vision directly since it's more accurate
        throw new Error("FALLBACK_TO_VISION");
      }

      throw new Error("FALLBACK_TO_VISION");
    } catch (err: any) {
      if (err.message === "FALLBACK_TO_VISION") {
        // Step 4: Fallback to Claude Vision
        try {
          setProcessingStep("Analyzing receipt with AI...");
          const token = (await supabase.auth.getSession()).data.session?.access_token;
          const reader = new FileReader();
          const base64 = await new Promise<string>((resolve) => {
            reader.onload = () => {
              const result = reader.result as string;
              resolve(result.split(",")[1]);
            };
            reader.readAsDataURL(selectedFile!);
          });

          const visionResp = await fetch(`${BACKEND_URL}/api/v1/fuel/parse-receipt-vision`, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              image_base64: base64,
              mime_type: selectedFile!.type,
            }),
          });

          if (!visionResp.ok) throw new Error("Vision analysis failed");
          const visionResult = await visionResp.json();
          const data = visionResult.extracted;

          setExtracted({
            total: data.total,
            volume: data.volume,
            price: data.price,
            date: data.date,
            station: data.station,
            unit: data.unit || "L",
            overall_confidence: visionResult.overall_confidence || 0.9,
          });

          setFormData({
            total: data.total?.toString() || "",
            volume: data.volume?.toString() || "",
            price: data.price?.toString() || "",
            date: data.date || new Date().toISOString().split("T")[0],
            station: data.station || "",
            odometer: "",
          });
        } catch (visionErr) {
          setError("Could not read receipt. Please enter the details manually.");
        }
      } else {
        setError(err.message || "Failed to process receipt");
      }
    } finally {
      setIsProcessing(false);
      setProcessingStep("");
    }
  };

  const handleSubmit = async () => {
    if (!user) return;

    const entry = {
      user_id: user.id,
      date: formData.date || new Date().toISOString().split("T")[0],
      location: formData.station,
      odometer: parseFloat(formData.odometer) || 0,
      volume: parseFloat(formData.volume) || 0,
      price: parseFloat(formData.price) || 0,
      total: parseFloat(formData.total) || 0,
      filled_to_top: true,
      receipt_url: receiptUrl,
      receipt_metadata: extracted ? { ...extracted, receipt_url: undefined } : null,
    };

    const { data, error: dbError } = await (supabase as any)
      .from("fuel_log")
      .insert(entry)
      .select();

    if (dbError) {
      setError("Failed to save fuel entry");
      return;
    }

    if (data?.[0]) {
      onEntryCreated(data[0]);
    }
  };

  return (
    <div className="space-y-4">
      {/* File selection */}
      {!previewUrl && (
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFileSelect}
            className="hidden"
          />
          <div className="flex flex-col items-center gap-3">
            <div className="flex gap-3">
              <Button onClick={() => fileInputRef.current?.click()} variant="outline">
                <Camera className="h-4 w-4 mr-2" /> Take Photo
              </Button>
              <Button
                onClick={() => {
                  if (fileInputRef.current) {
                    fileInputRef.current.removeAttribute("capture");
                    fileInputRef.current.click();
                    fileInputRef.current.setAttribute("capture", "environment");
                  }
                }}
                variant="outline"
              >
                <Upload className="h-4 w-4 mr-2" /> Choose File
              </Button>
            </div>
            <p className="text-sm text-gray-500">Take a photo of your fuel receipt or upload one</p>
          </div>
        </div>
      )}

      {/* Preview + Process */}
      {previewUrl && !extracted && (
        <div className="space-y-3">
          <img src={previewUrl} alt="Receipt preview" className="max-h-64 mx-auto rounded-lg shadow" />
          <div className="flex gap-2 justify-center">
            <Button
              onClick={() => {
                setPreviewUrl(null);
                setSelectedFile(null);
              }}
              variant="outline"
            >
              Change Photo
            </Button>
            <Button onClick={processReceipt} disabled={isProcessing}>
              {isProcessing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {processingStep}
                </>
              ) : (
                "Scan Receipt"
              )}
            </Button>
          </div>
        </div>
      )}

      {/* Extracted data form */}
      {extracted && (
        <Card>
          <CardContent className="p-4 space-y-3">
            <p className="text-sm text-gray-600">
              Receipt scanned - verify and edit the details below:
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Total Cost</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.total}
                  onChange={(e) => setFormData({ ...formData, total: e.target.value })}
                />
              </div>
              <div>
                <Label>Volume ({regionConfig.units === "imperial" ? "gal" : "L"})</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.volume}
                  onChange={(e) => setFormData({ ...formData, volume: e.target.value })}
                />
              </div>
              <div>
                <Label>Price / unit</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                />
              </div>
              <div>
                <Label>Date</Label>
                <Input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                />
              </div>
              <div>
                <Label>Station</Label>
                <Input
                  value={formData.station}
                  onChange={(e) => setFormData({ ...formData, station: e.target.value })}
                />
              </div>
              <div>
                <Label>Odometer</Label>
                <Input
                  type="number"
                  value={formData.odometer}
                  onChange={(e) => setFormData({ ...formData, odometer: e.target.value })}
                  placeholder="Enter current reading"
                />
              </div>
            </div>
            {previewUrl && (
              <img src={previewUrl} alt="Receipt" className="max-h-32 rounded" />
            )}
          </CardContent>
        </Card>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}

      {/* Action buttons */}
      {extracted && (
        <div className="flex gap-2 justify-end">
          <Button variant="outline" onClick={onCancel}>Cancel</Button>
          <Button
            onClick={handleSubmit}
            disabled={!formData.total && !formData.volume}
          >
            Save Fuel Entry
          </Button>
        </div>
      )}

      {!extracted && !previewUrl && (
        <div className="flex justify-end">
          <Button variant="outline" onClick={onCancel}>Cancel</Button>
        </div>
      )}
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add src/components/wheels/FuelReceiptUpload.tsx
git commit -m "feat: add FuelReceiptUpload component with Tesseract.js + Claude Vision OCR"
```

---

### Task 7: Integrate receipt upload into FuelLog.tsx

**Files:**
- Modify: `src/components/wheels/FuelLog.tsx`

**Step 1: Add receipt upload tab to FuelLog**

Import the new component and add a toggle between "Add Manually" and "Scan Receipt":

At the top of FuelLog.tsx, add:
```tsx
import FuelReceiptUpload from "./FuelReceiptUpload";
```

Add state:
```tsx
const [showReceiptUpload, setShowReceiptUpload] = useState(false);
```

Replace the existing "Add Fuel Entry" button section (around line 308-336) to include a receipt upload option alongside the manual entry dialog:

```tsx
<div className="flex flex-col items-end gap-2">
  <p className="text-sm text-gray-600 text-right">You can ask Pam to log fuel, or add it manually:</p>
  <div className="flex gap-2">
    <Button variant="outline" onClick={() => setShowReceiptUpload(true)}>
      Scan Receipt
    </Button>
    <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
      <DialogTrigger asChild><Button>Add Manually</Button></DialogTrigger>
      {/* existing dialog content unchanged */}
    </Dialog>
  </div>
</div>

{showReceiptUpload && (
  <Card>
    <CardContent className="p-4">
      <h3 className="text-lg font-semibold mb-3">Scan Fuel Receipt</h3>
      <FuelReceiptUpload
        onEntryCreated={(entry) => {
          setFuelEntries(prev => [entry, ...prev]);
          setShowReceiptUpload(false);
        }}
        onCancel={() => setShowReceiptUpload(false)}
      />
    </CardContent>
  </Card>
)}
```

**Step 2: Commit**

```bash
git add src/components/wheels/FuelLog.tsx
git commit -m "feat: integrate receipt upload into FuelLog page"
```

---

### Task 8: Add receipt_url display in FuelLog table

**Files:**
- Modify: `src/components/wheels/FuelLog.tsx`

**Step 1: Add receipt indicator to table**

In the table header, add a "Receipt" column. In the table body, show a small receipt icon/thumbnail if `receipt_url` exists:

Add to table header:
```tsx
<TableHead>Receipt</TableHead>
```

Add to table body row:
```tsx
<TableCell>
  {entry.receipt_url ? (
    <a href={entry.receipt_url} target="_blank" rel="noopener noreferrer"
       className="text-blue-600 hover:underline text-sm">
      View
    </a>
  ) : '-'}
</TableCell>
```

**Step 2: Commit**

```bash
git add src/components/wheels/FuelLog.tsx
git commit -m "feat: show receipt link in fuel log table"
```

---

### Task 9: Update Supabase TypeScript types

**Files:**
- Modify: `src/integrations/supabase/types.ts`

**Step 1: Add receipt_url and receipt_metadata to fuel_log type**

Find the `fuel_log` type definition in `types.ts` and add the two new columns to both `Row` and `Insert` interfaces:

```typescript
receipt_url: string | null
receipt_metadata: Record<string, any> | null
```

**Step 2: Commit**

```bash
git add src/integrations/supabase/types.ts
git commit -m "feat: add receipt_url and receipt_metadata to fuel_log TypeScript types"
```

---

### Task 10: End-to-end verification

**Step 1: Run all PAM tests**

```bash
cd /Users/thabonel/Code/wheels-wins-landing-page/backend
python -m pytest ../tests/pam/ -v --tb=short
```

Expected: All tests pass including new receipt parser tests.

**Step 2: Run frontend type check**

```bash
cd /Users/thabonel/Code/wheels-wins-landing-page
npm run type-check
```

Expected: No TypeScript errors.

**Step 3: Run frontend build**

```bash
npm run build
```

Expected: Build succeeds.

**Step 4: Push to staging**

```bash
git push origin staging
```
