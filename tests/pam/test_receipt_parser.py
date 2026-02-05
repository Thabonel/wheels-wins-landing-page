"""
Tests for the fuel receipt text parser.

Validates regex-based extraction of total, volume, price, date,
station name, and confidence scoring from OCR receipt text.
"""

import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "backend"))
os.environ.setdefault("ENVIRONMENT", "test")
os.environ.setdefault("SUPABASE_URL", "https://test.supabase.co")
os.environ.setdefault("SUPABASE_SERVICE_ROLE_KEY", "test-key")

from app.services.pam.tools.fuel.receipt_parser import parse_receipt_text


STANDARD_RECEIPT = "TOTAL: $67.50\nVolume: 45.00L\nPrice: $1.50/L"


def test_parse_receipt_text_extracts_total():
    result = parse_receipt_text(STANDARD_RECEIPT)
    assert result["total"] == 67.50


def test_parse_receipt_text_extracts_volume():
    result = parse_receipt_text(STANDARD_RECEIPT)
    assert result["volume"] == 45.0


def test_parse_receipt_text_extracts_price():
    result = parse_receipt_text(STANDARD_RECEIPT)
    assert result["price"] == 1.50


def test_parse_receipt_text_extracts_date():
    text = "Date: 02/06/2026\nTOTAL: $67.50\nVolume: 45.00L"
    result = parse_receipt_text(text)
    assert result["date"] == "2026-02-06"


def test_parse_receipt_text_extracts_station():
    text = "Shell Service Station\nDate: 02/06/2026\nTOTAL: $67.50"
    result = parse_receipt_text(text)
    assert result["station"] is not None
    assert "shell" in result["station"].lower()


def test_parse_receipt_text_returns_confidence():
    result = parse_receipt_text(STANDARD_RECEIPT)
    assert "confidence" in result
    assert result["confidence"]["total"] > 0.5


def test_parse_receipt_text_handles_empty():
    result = parse_receipt_text("")
    assert result["total"] is None
    assert result["volume"] is None


def test_parse_receipt_text_handles_gallons():
    text = "TOTAL: $45.00\n12.5 GAL @ $3.60/GAL"
    result = parse_receipt_text(text)
    assert result["volume"] == 12.5
    assert result["price"] == 3.60


def test_parse_receipt_text_overall_confidence():
    result = parse_receipt_text(STANDARD_RECEIPT)
    assert "overall_confidence" in result
    assert 0 <= result["overall_confidence"] <= 1.0
