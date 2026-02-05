"""
Fuel Receipt Text Parser

Regex-based extraction of structured fuel data from OCR text.
Handles common receipt formats for total cost, volume, price per unit,
date, and station name with per-field confidence scoring.
"""

import re
from typing import Dict, Any, Optional


# Known fuel station brand keywords (lowercase)
STATION_KEYWORDS = [
    "shell", "bp", "caltex", "chevron", "mobil", "exxon", "texaco",
    "costco", "arco", "sunoco", "citgo", "valero", "marathon",
    "phillips", "conoco", "sinclair", "casey", "wawa", "sheetz",
    "racetrac", "quiktrip", "speedway", "circle k", "7-eleven",
    "pilot", "love", "flying j", "ta ", "petro", "fuel", "gas",
    "service station", "truck stop", "petrol",
]


def _extract_total(text: str) -> tuple[Optional[float], float]:
    """Extract total cost from receipt text. Returns (value, confidence)."""
    patterns = [
        # "TOTAL: $67.50" or "TOTAL $67.50" or "TOTAL:$67.50"
        (r"(?:TOTAL|SALE|AMOUNT|DUE)\s*:?\s*\$?\s*(\d+\.?\d*)", 0.95),
        # "$67.50" at end of a line (likely the total)
        (r"\$\s*(\d+\.\d{2})\s*$", 0.7),
        # Standalone dollar amount on its own line
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


def _extract_volume(text: str) -> tuple[Optional[float], float, str]:
    """Extract volume and determine unit. Returns (value, confidence, unit)."""
    patterns_litres = [
        # "45.00L" or "45.00 L" or "45L"
        (r"(\d+\.?\d*)\s*[Ll](?:\b|itr)", 0.95),
        # "Volume: 45.00" (assumes litres if no unit specified)
        (r"[Vv]olume\s*:?\s*(\d+\.?\d*)", 0.85),
        # "Litres: 45.00"
        (r"[Ll]it(?:re|er)s?\s*:?\s*(\d+\.?\d*)", 0.95),
    ]

    patterns_gallons = [
        # "12.5 GAL" or "12.5GAL" or "12.5 gal"
        (r"(\d+\.?\d*)\s*[Gg][Aa][Ll]", 0.95),
        # "12.5 gal @" or "Gallons: 12.5"
        (r"[Gg]allons?\s*:?\s*(\d+\.?\d*)", 0.90),
    ]

    # Check gallons first (more specific patterns)
    for pattern, confidence in patterns_gallons:
        match = re.search(pattern, text)
        if match:
            try:
                return float(match.group(1)), confidence, "GAL"
            except ValueError:
                continue

    for pattern, confidence in patterns_litres:
        match = re.search(pattern, text)
        if match:
            try:
                return float(match.group(1)), confidence, "L"
            except ValueError:
                continue

    return None, 0.0, "L"


def _extract_price(text: str) -> tuple[Optional[float], float]:
    """Extract price per unit. Returns (value, confidence)."""
    patterns = [
        # "$1.50/L" or "$3.60/GAL"
        (r"\$\s*(\d+\.?\d*)\s*/\s*(?:L|GAL|[Gg]al|[Ll])", 0.95),
        # "Price: $1.50" or "Price/L: $1.50"
        (r"[Pp]rice\s*(?:/\s*(?:L|GAL|[Gg]al|[Ll]))?\s*:?\s*\$?\s*(\d+\.?\d*)", 0.85),
        # "@ $3.60/GAL" or "@ $1.50/L"
        (r"@\s*\$?\s*(\d+\.?\d*)\s*/?\s*(?:GAL|[Gg]al|L|[Ll])?", 0.90),
        # "1.50 $/L" or "3.60 $/gal"
        (r"(\d+\.?\d*)\s*\$/\s*(?:L|GAL|[Gg]al|[Ll])", 0.85),
    ]

    for pattern, confidence in patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            try:
                val = float(match.group(1))
                # Sanity check: price per unit should be reasonable (0.01 - 50.00)
                if 0.01 <= val <= 50.0:
                    return val, confidence
            except ValueError:
                continue

    return None, 0.0


def _extract_date(text: str) -> tuple[Optional[str], float]:
    """Extract date and normalize to YYYY-MM-DD. Returns (date_str, confidence)."""
    patterns = [
        # YYYY-MM-DD (ISO format)
        (r"(\d{4})-(\d{1,2})-(\d{1,2})", "ymd", 0.95),
        # MM/DD/YYYY
        (r"(\d{1,2})/(\d{1,2})/(\d{4})", "mdy", 0.85),
        # DD/MM/YYYY (ambiguous, lower confidence)
        (r"(\d{1,2})-(\d{1,2})-(\d{4})", "mdy", 0.75),
        # MM-DD-YYYY
        (r"(\d{1,2})-(\d{1,2})-(\d{4})", "mdy", 0.75),
    ]

    for pattern, fmt, confidence in patterns:
        match = re.search(pattern, text)
        if match:
            try:
                if fmt == "ymd":
                    year, month, day = int(match.group(1)), int(match.group(2)), int(match.group(3))
                else:  # mdy
                    month, day, year = int(match.group(1)), int(match.group(2)), int(match.group(3))

                # Basic validation
                if 1 <= month <= 12 and 1 <= day <= 31 and 1900 <= year <= 2100:
                    return f"{year:04d}-{month:02d}-{day:02d}", confidence
            except (ValueError, IndexError):
                continue

    return None, 0.0


def _extract_station(text: str) -> tuple[Optional[str], float]:
    """Extract station name from receipt text. Returns (name, confidence)."""
    lines = text.strip().split("\n")

    # Check first few lines for station brand keywords
    for line in lines[:5]:
        line_lower = line.strip().lower()
        for keyword in STATION_KEYWORDS:
            if keyword in line_lower:
                return line.strip(), 0.85

    # If no keyword match, use the first non-empty line as a guess
    for line in lines[:3]:
        cleaned = line.strip()
        # Skip lines that look like amounts or dates
        if cleaned and not re.match(r"^[\d$./\-]+$", cleaned):
            return cleaned, 0.4

    return None, 0.0


def parse_receipt_text(text: str) -> Dict[str, Any]:
    """
    Parse OCR text from a fuel receipt and extract structured data.

    Returns a dict with extracted fields and confidence scores:
        total: float or None - total cost
        volume: float or None - fuel volume
        price: float or None - price per unit
        date: str or None - date in YYYY-MM-DD format
        station: str or None - station name
        unit: "L" or "GAL" - detected fuel unit
        confidence: dict of per-field confidence scores (0-1)
        overall_confidence: float - average of non-zero confidences
    """
    if not text or not text.strip():
        return {
            "total": None,
            "volume": None,
            "price": None,
            "date": None,
            "station": None,
            "unit": "L",
            "confidence": {
                "total": 0.0,
                "volume": 0.0,
                "price": 0.0,
                "date": 0.0,
                "station": 0.0,
            },
            "overall_confidence": 0.0,
        }

    total, total_conf = _extract_total(text)
    volume, volume_conf, unit = _extract_volume(text)
    price, price_conf = _extract_price(text)
    date_str, date_conf = _extract_date(text)
    station, station_conf = _extract_station(text)

    confidence = {
        "total": total_conf,
        "volume": volume_conf,
        "price": price_conf,
        "date": date_conf,
        "station": station_conf,
    }

    # Overall confidence is the average of non-zero field confidences
    non_zero = [v for v in confidence.values() if v > 0]
    overall = sum(non_zero) / len(non_zero) if non_zero else 0.0

    return {
        "total": total,
        "volume": volume,
        "price": price,
        "date": date_str,
        "station": station,
        "unit": unit,
        "confidence": confidence,
        "overall_confidence": round(overall, 4),
    }
