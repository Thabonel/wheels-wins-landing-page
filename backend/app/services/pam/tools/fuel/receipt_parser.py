"""
Fuel Receipt Text Parser

Regex-based extraction of structured fuel data from OCR text.
Handles common receipt formats for total cost, volume, price per unit,
date, and station name with per-field confidence scoring.
"""

import re
from typing import Dict, Any, Optional


# Known fuel station brand keywords (lowercase) - includes Australian brands
STATION_KEYWORDS = [
    # Major Australian brands
    "shell", "bp", "caltex", "chevron", "mobil", "exxon", "texaco", "ampol",
    "united", "metro petroleum", "woolworths petrol", "coles express",
    "7-eleven", "puma energy", "gull", "liberty", "viva energy", "z energy",
    "iga petrol", "apco", "on the run", "otr", "fast fuel", "budget petrol",
    "independent", "fuel express", "petro stop", "fuel stop",
    # US brands (for comparison/travel)
    "costco", "arco", "sunoco", "citgo", "valero", "marathon",
    "phillips", "conoco", "sinclair", "casey", "wawa", "sheetz",
    "racetrac", "quiktrip", "speedway", "circle k",
    "pilot", "love", "flying j", "ta ", "petro",
    # Generic terms
    "fuel", "gas", "petrol", "service station", "truck stop", "roadhouse",
    "servo", "service centre", "automotive",
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


def _extract_volume(text: str) -> tuple[Optional[float], float, str, Optional[list]]:
    """Extract volume(s) and determine unit. Returns (total_volume, confidence, unit, individual_volumes)."""
    patterns_litres = [
        # "45.00L" or "45.00 L" or "45L" - captures individual volumes
        (r"(\d+\.?\d*)\s*[Ll](?:\b|itr)", 0.95),
        # "Volume: 45.00" or "Tank 1: 45.00" (assumes litres if no unit specified)
        (r"(?:[Vv]olume|[Tt]ank\s*\d*)\s*:?\s*(\d+\.?\d*)", 0.85),
        # "Litres: 45.00"
        (r"[Ll]it(?:re|er)s?\s*:?\s*(\d+\.?\d*)", 0.95),
        # "Pump A: 45.78L" or "Pump B: 163.97L"
        (r"[Pp]ump\s*[A-Z\d]\s*:?\s*(\d+\.?\d*)\s*[Ll]?", 0.90),
    ]

    patterns_gallons = [
        # "12.5 GAL" or "12.5GAL" or "12.5 gal"
        (r"(\d+\.?\d*)\s*[Gg][Aa][Ll]", 0.95),
        # "12.5 gal @" or "Gallons: 12.5" or "Tank 1: 12.5 gal"
        (r"(?:[Gg]allons?|[Tt]ank\s*\d*|[Pp]ump\s*[A-Z\d])\s*:?\s*(\d+\.?\d*)", 0.90),
    ]

    volumes_found = []
    unit = "L"  # default unit
    max_confidence = 0.0

    # Check gallons first (more specific patterns)
    for pattern, confidence in patterns_gallons:
        matches = re.findall(pattern, text)
        if matches:
            try:
                for match in matches:
                    vol = float(match)
                    volumes_found.append(vol)
                    max_confidence = max(max_confidence, confidence)
                unit = "GAL"
            except ValueError:
                continue

    # If no gallons found, check litres
    if not volumes_found:
        for pattern, confidence in patterns_litres:
            matches = re.findall(pattern, text)
            if matches:
                try:
                    for match in matches:
                        vol = float(match)
                        volumes_found.append(vol)
                        max_confidence = max(max_confidence, confidence)
                    unit = "L"
                except ValueError:
                    continue

    if not volumes_found:
        return None, 0.0, "L", None

    # Filter out unrealistic volumes (too small or too large)
    realistic_volumes = [v for v in volumes_found if 1.0 <= v <= 1000.0]

    if not realistic_volumes:
        return None, 0.0, unit, None

    # If we have multiple realistic volumes, return the sum and the list
    if len(realistic_volumes) > 1:
        total_volume = sum(realistic_volumes)
        # Higher confidence when multiple tanks detected as expected for RVs
        adjusted_confidence = min(max_confidence * 1.1, 1.0)
        return total_volume, adjusted_confidence, unit, realistic_volumes
    else:
        # Single volume
        return realistic_volumes[0], max_confidence, unit, None


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
        # DD-MM-YYYY or MM-DD-YYYY (ambiguous with dashes, lower confidence)
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

    # Avoid obvious placeholder text
    PLACEHOLDER_PATTERNS = [
        "temp", "temporary", "test", "example", "placeholder", "tbd", "xxx",
        "fuel stop", "gas station", "service station", "petrol station"
    ]

    # Check first few lines for station brand keywords
    for line in lines[:5]:
        line_lower = line.strip().lower()

        # Skip obvious placeholder text
        is_placeholder = any(placeholder in line_lower for placeholder in PLACEHOLDER_PATTERNS)
        if is_placeholder:
            continue

        for keyword in STATION_KEYWORDS:
            if keyword in line_lower:
                # Found a matching brand keyword
                cleaned_line = line.strip()
                # Extra validation - avoid very short or generic matches
                if len(cleaned_line) >= 3 and not cleaned_line.lower() in ["fuel", "gas", "petrol"]:
                    return cleaned_line, 0.85

    # Look for business names in a wider range (sometimes station name is not in the first few lines)
    for line in lines[:8]:
        cleaned = line.strip()
        line_lower = cleaned.lower()

        # Skip placeholder text, amounts, dates, and common receipt formatting
        if (cleaned and
            len(cleaned) >= 4 and
            not re.match(r"^[\d$./\-\s,]+$", cleaned) and
            not any(placeholder in line_lower for placeholder in PLACEHOLDER_PATTERNS) and
            not re.match(r"^\d{1,2}[/\-]\d{1,2}[/\-]\d{2,4}", cleaned) and
            "total" not in line_lower and
            "tax" not in line_lower and
            "receipt" not in line_lower):

            # This looks like it could be a business name
            return cleaned, 0.4

    return None, 0.0


def _extract_odometer(text: str) -> tuple[Optional[float], float]:
    """Extract odometer/mileage reading with decimals. Returns (value, confidence)."""
    patterns = [
        # "Odometer: 150057.6" or "ODO: 150,057.6" - with decimals
        (r"(?:ODO(?:METER)?|MILEAGE|KM|MILES)\s*:?\s*(\d{1,3}(?:,?\d{3})*\.?\d*)", 0.95),
        # "150,057.6 km" or "150057.6 mi" - with commas and decimals
        (r"(\d{1,3}(?:,\d{3})*\.?\d*)\s*(?:km|mi|miles)", 0.90),
        # "150057.6 km" or "150057.6 mi" - without commas but with decimals
        (r"(\d{5,7}\.?\d*)\s*(?:km|mi|miles)", 0.85),
        # Look for standalone large numbers with decimals that could be odometer
        (r"\b(\d{5,6}\.\d+)\b", 0.75),
        # Look for large whole numbers that are likely odometer readings
        (r"\b(\d{5,7})\b(?!\s*(?:L|GAL|gal|litr|\$|cent))", 0.70),
    ]

    for pattern, confidence in patterns:
        matches = re.findall(pattern, text, re.IGNORECASE)
        if matches:
            # Process all matches and pick the most realistic odometer reading
            for match in matches:
                try:
                    # Clean up the match (remove commas, handle multiple groups)
                    if isinstance(match, tuple):
                        val_str = match[0]
                    else:
                        val_str = match

                    val_str = val_str.replace(",", "").replace(" ", "")
                    val = float(val_str)

                    # Realistic odometer range: 1000 to 9,999,999 (reasonable vehicle range)
                    if 1000 <= val <= 9999999:
                        return val, confidence
                except ValueError:
                    continue

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
            "volumes": None,
            "price": None,
            "date": None,
            "station": None,
            "odometer": None,
            "unit": "L",
            "confidence": {
                "total": 0.0,
                "volume": 0.0,
                "price": 0.0,
                "date": 0.0,
                "station": 0.0,
                "odometer": 0.0,
            },
            "overall_confidence": 0.0,
        }

    total, total_conf = _extract_total(text)
    volume, volume_conf, unit, individual_volumes = _extract_volume(text)
    price, price_conf = _extract_price(text)
    date_str, date_conf = _extract_date(text)
    station, station_conf = _extract_station(text)
    odometer, odo_conf = _extract_odometer(text)

    confidence = {
        "total": total_conf,
        "volume": volume_conf,
        "price": price_conf,
        "date": date_conf,
        "station": station_conf,
        "odometer": odo_conf,
    }

    # Auto-calculate missing field if we have 2 of 3
    if total and price and not volume:
        volume = round(total / price, 2)
        volume_conf = min(total_conf, price_conf) * 0.9
        confidence["volume"] = volume_conf
    elif total and volume and not price:
        price = round(total / volume, 3)
        price_conf = min(total_conf, volume_conf) * 0.9
        confidence["price"] = price_conf
    elif volume and price and not total:
        total = round(volume * price, 2)
        total_conf = min(volume_conf, price_conf) * 0.9
        confidence["total"] = total_conf

    # Overall confidence is the average of non-zero field confidences
    non_zero = [v for v in confidence.values() if v > 0]
    overall = sum(non_zero) / len(non_zero) if non_zero else 0.0

    return {
        "total": total,
        "volume": volume,
        "volumes": individual_volumes,  # Array of individual tank volumes
        "price": price,
        "date": date_str,
        "station": station,
        "odometer": odometer,
        "unit": unit,
        "confidence": confidence,
        "overall_confidence": round(overall, 4),
    }
