"""
Tests for the universal receipt text parser.

Covers: type detection, field extraction, category mapping,
fuel delegation, and edge cases.
"""

import pytest
from app.services.receipts.universal_parser import (
    _detect_type,
    _extract_total,
    _extract_date,
    _extract_vendor,
    _extract_description,
    parse_receipt_text_universal,
    CATEGORY_MAP,
)


# -- Type Detection --

class TestDetectType:
    def test_fuel_keywords(self):
        assert _detect_type("Shell station\nUnleaded 95\n10 gallons") == "fuel"

    def test_food_keywords(self):
        assert _detect_type("McDonalds\nBig Mac\nCoffee\nLunch special") == "food"

    def test_maintenance_keywords(self):
        assert _detect_type("Auto Parts Plus\nOil change\nBrake pads") == "maintenance"

    def test_accommodation_keywords(self):
        assert _detect_type("Holiday Inn Hotel\nRoom 204\nCheckout 11am") == "accommodation"

    def test_shopping_keywords(self):
        assert _detect_type("Walmart Supercenter\nGrocery items\nStore #1234") == "shopping"

    def test_general_fallback(self):
        assert _detect_type("Random text with no keywords at all") == "general"

    def test_empty_text(self):
        assert _detect_type("") == "general"

    def test_highest_score_wins(self):
        # Food keywords outnumber fuel keywords here
        text = "Restaurant cafe lunch dinner coffee\nGas"
        assert _detect_type(text) == "food"


# -- Total Extraction --

class TestExtractTotal:
    def test_total_with_label(self):
        total, conf = _extract_total("Items\nTOTAL: $25.99\nThank you")
        assert total == 25.99
        assert conf >= 0.9

    def test_sale_label(self):
        total, conf = _extract_total("SALE $15.00")
        assert total == 15.0

    def test_amount_due(self):
        total, conf = _extract_total("AMOUNT DUE: 42.50")
        assert total == 42.50

    def test_dollar_on_own_line(self):
        total, conf = _extract_total("Item 1\n$11.47\n")
        assert total == 11.47

    def test_no_total_found(self):
        total, conf = _extract_total("No numbers here")
        assert total is None
        assert conf == 0.0

    def test_subtotal_label(self):
        total, conf = _extract_total("SUBTOTAL $8.99")
        assert total == 8.99


# -- Date Extraction --

class TestExtractDate:
    def test_iso_format(self):
        date, conf = _extract_date("Date: 2025-01-15\nItems")
        assert date == "2025-01-15"
        assert conf >= 0.9

    def test_us_slash_format(self):
        date, conf = _extract_date("01/15/2025")
        assert date == "2025-01-15"
        assert conf >= 0.8

    def test_us_dash_format(self):
        date, conf = _extract_date("01-15-2025")
        assert date == "2025-01-15"

    def test_no_date(self):
        date, conf = _extract_date("No date here")
        assert date is None
        assert conf == 0.0

    def test_invalid_month(self):
        date, conf = _extract_date("15/32/2025")
        assert date is None


# -- Vendor Extraction --

class TestExtractVendor:
    def test_known_keyword_in_header(self):
        vendor, conf = _extract_vendor("Shell Station\n123 Main St\nPump 3\nTotal: $40")
        assert vendor == "Shell Station"
        assert conf >= 0.8

    def test_fallback_first_line(self):
        vendor, conf = _extract_vendor("Joe's Place\n123 Main St\nTotal $10")
        assert vendor == "Joe's Place"
        assert conf > 0

    def test_skips_numeric_lines(self):
        vendor, conf = _extract_vendor("$25.00\n12/03/2025\nRandom Store\nItem 1")
        assert vendor is not None
        # The numeric lines should be skipped

    def test_empty_text(self):
        vendor, conf = _extract_vendor("")
        assert vendor is None


# -- Description Extraction --

class TestExtractDescription:
    def test_extracts_item_lines(self):
        receipt = """McDonalds
123 High St
Big Mac            $5.99
Fries              $2.49
Coffee             $1.99
SUBTOTAL           $10.47
TAX                $1.00
TOTAL              $11.47
Thank you!
Have a nice day
"""
        desc, conf = _extract_description(receipt)
        assert desc is not None
        assert "Big Mac" in desc

    def test_empty_receipt(self):
        desc, conf = _extract_description("")
        assert desc is None
        assert conf == 0.0


# -- Category Mapping --

class TestCategoryMap:
    def test_all_types_mapped(self):
        for rtype in ["fuel", "food", "maintenance", "accommodation", "shopping", "general"]:
            assert rtype in CATEGORY_MAP

    def test_fuel_maps_to_fuel(self):
        assert CATEGORY_MAP["fuel"] == "Fuel"

    def test_food_maps_to_food(self):
        assert CATEGORY_MAP["food"] == "Food"

    def test_accommodation_maps_to_camp(self):
        assert CATEGORY_MAP["accommodation"] == "Camp"

    def test_shopping_maps_to_fun(self):
        assert CATEGORY_MAP["shopping"] == "Fun"

    def test_general_maps_to_other(self):
        assert CATEGORY_MAP["general"] == "Other"


# -- Full Parser Integration --

class TestParseReceiptTextUniversal:
    def test_food_receipt(self):
        text = """McDonalds
123 High St
Big Mac            $5.99
Fries              $2.49
Coffee             $1.99
TOTAL: $11.47
01/15/2025
"""
        result = parse_receipt_text_universal(text)
        assert result["receipt_type"] == "food"
        assert result["total"] == 11.47
        assert result["date"] == "2025-01-15"
        assert result["suggested_category"] == "Food"
        assert result["overall_confidence"] > 0
        assert result["fuel_data"] is None

    def test_fuel_receipt(self):
        text = """Shell Service Station
Pump 5
Unleaded 95
15.5 Gallons
TOTAL: $52.70
2025-02-01
"""
        result = parse_receipt_text_universal(text)
        assert result["receipt_type"] == "fuel"
        assert result["total"] == 52.70
        assert result["suggested_category"] == "Fuel"

    def test_empty_input(self):
        result = parse_receipt_text_universal("")
        assert result["receipt_type"] == "general"
        assert result["total"] is None
        assert result["date"] is None
        assert result["vendor"] is None
        assert result["description"] is None
        assert result["suggested_category"] == "Other"
        assert result["overall_confidence"] == 0.0
        assert result["fuel_data"] is None

    def test_whitespace_only(self):
        result = parse_receipt_text_universal("   \n  \n  ")
        assert result["receipt_type"] == "general"
        assert result["overall_confidence"] == 0.0

    def test_none_input(self):
        result = parse_receipt_text_universal(None)
        assert result["receipt_type"] == "general"

    def test_general_receipt(self):
        text = """Random Business
Something happened
TOTAL $25.00
"""
        result = parse_receipt_text_universal(text)
        assert result["receipt_type"] == "general"
        assert result["total"] == 25.00
        assert result["suggested_category"] == "Other"

    def test_maintenance_receipt(self):
        text = """Quick Lube Auto Repair
Oil Change - Synthetic
Brake inspection
TOTAL: $89.95
02/10/2025
"""
        result = parse_receipt_text_universal(text)
        assert result["receipt_type"] == "maintenance"
        assert result["total"] == 89.95
        assert result["suggested_category"] == "Other"

    def test_accommodation_receipt(self):
        text = """Holiday Inn Hotel
Room 204 - King Suite
2 nights
TOTAL: $259.00
01/20/2025
"""
        result = parse_receipt_text_universal(text)
        assert result["receipt_type"] == "accommodation"
        assert result["suggested_category"] == "Camp"

    def test_result_shape(self):
        """Verify the full response structure matches what frontend expects."""
        result = parse_receipt_text_universal("TOTAL $10.00")
        required_keys = [
            "receipt_type", "total", "date", "vendor", "description",
            "suggested_category", "confidence", "overall_confidence", "fuel_data",
        ]
        for key in required_keys:
            assert key in result, f"Missing key: {key}"

        conf = result["confidence"]
        for field in ["total", "date", "vendor", "description"]:
            assert field in conf, f"Missing confidence field: {field}"
