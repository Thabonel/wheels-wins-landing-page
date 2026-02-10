"""
Universal Receipt Text Parser

Detects receipt type from OCR text via keyword matching, extracts common
fields (total, date, vendor, description), and maps to expense categories.
Delegates fuel receipts to the specialized fuel parser for richer extraction.
"""

import re
from typing import Dict, Any, Optional, List, Tuple


# Receipt type keyword sets - order matters for scoring priority
TYPE_KEYWORDS: Dict[str, List[str]] = {
    "fuel": [
        "shell", "bp", "caltex", "chevron", "mobil", "exxon", "gasoline",
        "diesel", "unleaded", "fuel", "gallon", "litre", "pump",
    ],
    "food": [
        "restaurant", "cafe", "coffee", "pizza", "burger", "mcdonald",
        "subway", "diner", "breakfast", "lunch", "dinner", "takeaway",
    ],
    "maintenance": [
        "mechanic", "repair", "tire", "oil change", "brake", "service",
        "auto parts", "maintenance", "lube",
    ],
    "accommodation": [
        "hotel", "motel", "airbnb", "resort", "camp", "rv park",
        "caravan park", "holiday park", "lodge",
    ],
    "shopping": [
        "walmart", "target", "costco", "store", "supermarket", "grocery",
        "amazon",
    ],
}

# Maps receipt type to the expense category used in the budget system
CATEGORY_MAP: Dict[str, str] = {
    "fuel": "Fuel",
    "food": "Food",
    "maintenance": "Other",
    "accommodation": "Camp",
    "shopping": "Fun",
    "general": "Other",
}


def _detect_type(text: str) -> str:
    """Score each receipt type by keyword hits and return the best match."""
    text_lower = text.lower()
    scores: Dict[str, int] = {}

    for rtype, keywords in TYPE_KEYWORDS.items():
        score = sum(1 for kw in keywords if kw in text_lower)
        if score > 0:
            scores[rtype] = score

    if not scores:
        return "general"

    return max(scores, key=scores.get)


def _extract_total(text: str) -> Tuple[Optional[float], float]:
    """Extract total cost from receipt text. Returns (value, confidence)."""
    patterns = [
        (r"(?:TOTAL|SALE|AMOUNT|DUE|BALANCE|SUBTOTAL)\s*:?\s*\$?\s*(\d+\.?\d*)", 0.95),
        (r"\$\s*(\d+\.\d{2})\s*$", 0.7),
        (r"^\s*\$\s*(\d+\.\d{2})\s*$", 0.6),
    ]

    for pattern, confidence in patterns:
        match = re.search(pattern, text, re.IGNORECASE | re.MULTILINE)
        if match:
            try:
                return float(match.group(1)), confidence
            except ValueError:
                continue

    return None, 0.0


def _extract_date(text: str) -> Tuple[Optional[str], float]:
    """Extract date and normalize to YYYY-MM-DD. Returns (date_str, confidence)."""
    patterns = [
        (r"(\d{4})-(\d{1,2})-(\d{1,2})", "ymd", 0.95),
        (r"(\d{1,2})/(\d{1,2})/(\d{4})", "mdy", 0.85),
        (r"(\d{1,2})-(\d{1,2})-(\d{4})", "mdy", 0.75),
    ]

    for pattern, fmt, confidence in patterns:
        match = re.search(pattern, text)
        if match:
            try:
                if fmt == "ymd":
                    year, month, day = int(match.group(1)), int(match.group(2)), int(match.group(3))
                else:
                    month, day, year = int(match.group(1)), int(match.group(2)), int(match.group(3))

                if 1 <= month <= 12 and 1 <= day <= 31 and 1900 <= year <= 2100:
                    return f"{year:04d}-{month:02d}-{day:02d}", confidence
            except (ValueError, IndexError):
                continue

    return None, 0.0


def _extract_vendor(text: str) -> Tuple[Optional[str], float]:
    """
    Extract vendor/business name from the first few lines.
    Receipts almost always print the business name at the top.
    """
    lines = text.strip().split("\n")

    # All known keywords across every receipt type for header matching
    all_keywords = []
    for keywords in TYPE_KEYWORDS.values():
        all_keywords.extend(keywords)

    for line in lines[:5]:
        line_lower = line.strip().lower()
        for keyword in all_keywords:
            if keyword in line_lower:
                return line.strip(), 0.85

    # Fall back to first non-numeric, non-empty line
    for line in lines[:3]:
        cleaned = line.strip()
        if cleaned and not re.match(r"^[\d$./\-]+$", cleaned):
            return cleaned, 0.4

    return None, 0.0


def _extract_description(text: str) -> Tuple[Optional[str], float]:
    """
    Build a short description from item-like lines in the receipt body.
    Skips header/footer lines that look like totals, dates, or addresses.
    """
    lines = text.strip().split("\n")
    item_lines: List[str] = []

    skip_patterns = re.compile(
        r"(^\s*$|^[\d$./\-]+$|TOTAL|SUBTOTAL|TAX|CHANGE|CASH|CARD|VISA|MASTER"
        r"|THANK|RECEIPT|ABN|GST|^\d{1,2}[/\-]\d{1,2}[/\-]\d{2,4})",
        re.IGNORECASE,
    )

    # Skip first 2 lines (usually store name/address) and last 3 (totals/footer)
    body = lines[2:-3] if len(lines) > 5 else lines

    for line in body:
        stripped = line.strip()
        if stripped and not skip_patterns.search(stripped):
            item_lines.append(stripped)

    if not item_lines:
        return None, 0.0

    # Join first few item lines into a summary
    description = "; ".join(item_lines[:5])
    if len(description) > 200:
        description = description[:197] + "..."

    return description, 0.7


def parse_receipt_text_universal(text: str) -> Dict[str, Any]:
    """
    Parse OCR text from any receipt type and extract structured data.

    For fuel receipts, delegates to the specialized fuel parser to capture
    volume, price-per-unit, odometer, and unit fields. For all other types,
    extracts the common fields: total, date, vendor, and description.

    Returns a unified dict with per-field confidence scores.
    """
    if not text or not text.strip():
        return {
            "receipt_type": "general",
            "total": None,
            "date": None,
            "vendor": None,
            "description": None,
            "suggested_category": "Other",
            "confidence": {
                "total": 0.0,
                "date": 0.0,
                "vendor": 0.0,
                "description": 0.0,
            },
            "overall_confidence": 0.0,
            "fuel_data": None,
        }

    receipt_type = _detect_type(text)

    # Fuel receipts get richer extraction from the specialized parser
    fuel_data = None
    if receipt_type == "fuel":
        try:
            from app.services.pam.tools.fuel.receipt_parser import parse_receipt_text
            fuel_data = parse_receipt_text(text)
        except ImportError:
            fuel_data = None

    total, total_conf = _extract_total(text)
    date_str, date_conf = _extract_date(text)
    vendor, vendor_conf = _extract_vendor(text)
    description, desc_conf = _extract_description(text)

    # If the fuel parser found a better total or date, prefer those
    if fuel_data:
        if fuel_data.get("total") and (not total or fuel_data["confidence"].get("total", 0) > total_conf):
            total = fuel_data["total"]
            total_conf = fuel_data["confidence"].get("total", total_conf)
        if fuel_data.get("date") and (not date_str or fuel_data["confidence"].get("date", 0) > date_conf):
            date_str = fuel_data["date"]
            date_conf = fuel_data["confidence"].get("date", date_conf)
        if fuel_data.get("station") and (not vendor or fuel_data["confidence"].get("station", 0) > vendor_conf):
            vendor = fuel_data["station"]
            vendor_conf = fuel_data["confidence"].get("station", vendor_conf)

    confidence = {
        "total": total_conf,
        "date": date_conf,
        "vendor": vendor_conf,
        "description": desc_conf,
    }

    non_zero = [v for v in confidence.values() if v > 0]
    overall = sum(non_zero) / len(non_zero) if non_zero else 0.0

    return {
        "receipt_type": receipt_type,
        "total": total,
        "date": date_str,
        "vendor": vendor,
        "description": description,
        "suggested_category": CATEGORY_MAP.get(receipt_type, "Other"),
        "confidence": confidence,
        "overall_confidence": round(overall, 4),
        "fuel_data": fuel_data,
    }
