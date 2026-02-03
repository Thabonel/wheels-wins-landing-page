"""
Site-Agnostic Data Extraction - Semantic Extractor
Uses Claude to extract structured data based on page type and user intent
"""

import os
import json
from typing import Optional, Dict, Any

from app.core.logging import get_logger
from app.core.config import get_settings

logger = get_logger(__name__)

# Safe import of anthropic
try:
    import anthropic
    ANTHROPIC_AVAILABLE = True
except ImportError:
    anthropic = None
    ANTHROPIC_AVAILABLE = False

from .schemas import PageState, PageType


# Type-specific extraction prompts
EXTRACTION_PROMPTS = {
    PageType.PRODUCT: """Extract product information from this page.

PAGE URL: {url}
PAGE TITLE: {title}

ACCESSIBILITY SNAPSHOT:
{snapshot}

{intent_context}

Extract and return JSON with these fields (include only fields that are present):
{{
    "name": "product name",
    "price": "price with currency symbol",
    "currency": "currency code (USD, EUR, etc.)",
    "description": "product description",
    "images": ["list of image URLs"],
    "rating": 4.5,
    "review_count": 123,
    "availability": "in stock / out of stock / limited",
    "brand": "brand name",
    "sku": "product SKU/ID",
    "categories": ["category list"],
    "specifications": {{"key": "value"}},
    "variants": [{{"name": "variant name", "price": "price"}}]
}}

Include confidence scores (0-1) for each extracted field as "_confidence" suffix.""",

    PageType.CAMPGROUND: """Extract campground/RV park information from this page.

PAGE URL: {url}
PAGE TITLE: {title}

ACCESSIBILITY SNAPSHOT:
{snapshot}

{intent_context}

Extract and return JSON with these fields (include only fields that are present):
{{
    "name": "campground name",
    "location": "address or location description",
    "coordinates": {{"lat": 0.0, "lng": 0.0}},
    "description": "campground description",
    "amenities": ["list of amenities"],
    "site_types": ["tent", "RV", "cabin", etc.],
    "price_range": "$XX - $XX per night",
    "rating": 4.5,
    "review_count": 123,
    "photos": ["photo URLs"],
    "availability": "availability information",
    "contact_info": {{"phone": "", "email": "", "website": ""}},
    "rv_specifics": {{
        "max_length": "feet",
        "hookups": ["electric", "water", "sewer"],
        "pull_through": true/false
    }},
    "pet_policy": "pet policy details",
    "reservation_url": "booking link"
}}

This is for RV travelers, so prioritize RV-specific information like hookups, max length, and pull-through sites.
Include confidence scores (0-1) for each extracted field as "_confidence" suffix.""",

    PageType.BUSINESS: """Extract business information from this page.

PAGE URL: {url}
PAGE TITLE: {title}

ACCESSIBILITY SNAPSHOT:
{snapshot}

{intent_context}

Extract and return JSON with these fields (include only fields that are present):
{{
    "name": "business name",
    "address": "full address",
    "phone": "phone number",
    "website": "website URL",
    "hours": {{"Monday": "9am-5pm", "Tuesday": "9am-5pm", ...}},
    "rating": 4.5,
    "review_count": 123,
    "categories": ["business categories"],
    "price_level": "$ / $$ / $$$ / $$$$",
    "description": "business description",
    "photos": ["photo URLs"],
    "services": ["list of services"],
    "coordinates": {{"lat": 0.0, "lng": 0.0}}
}}

Include confidence scores (0-1) for each extracted field as "_confidence" suffix.""",

    PageType.COMPARISON: """Extract comparison data from this page.

PAGE URL: {url}
PAGE TITLE: {title}

ACCESSIBILITY SNAPSHOT:
{snapshot}

{intent_context}

Extract and return JSON with these fields:
{{
    "title": "comparison title",
    "items": [
        {{
            "name": "item name",
            "pros": ["list of pros"],
            "cons": ["list of cons"],
            "price": "price if available",
            "rating": 4.5,
            "key_features": ["features"]
        }}
    ],
    "comparison_criteria": ["criteria used for comparison"],
    "winner": "recommended item if stated",
    "summary": "comparison summary"
}}

Include confidence scores (0-1) for each extracted field as "_confidence" suffix.""",
}

# Generic extraction prompt for unknown types
GENERIC_EXTRACTION_PROMPT = """Extract useful information from this web page.

PAGE URL: {url}
PAGE TITLE: {title}

ACCESSIBILITY SNAPSHOT:
{snapshot}

{intent_context}

Analyze the page content and extract all relevant structured data. Return JSON with:
{{
    "page_type": "your assessment of page type",
    "title": "main title/heading",
    "main_content": "primary content summary",
    "key_data": {{"any structured data you can identify"}},
    "links": ["important links"],
    "images": ["image URLs"],
    "contact_info": {{"any contact information found"}},
    "metadata": {{"any other relevant metadata"}}
}}

Include confidence scores (0-1) for key extracted fields as "_confidence" suffix."""


class SemanticExtractor:
    """
    AI-powered semantic data extractor using Claude
    Extracts structured data based on page type and user intent
    """

    def __init__(self):
        settings = get_settings()
        api_key = os.getenv("ANTHROPIC-WHEELS-KEY") or settings.anthropic_api_key

        if not ANTHROPIC_AVAILABLE:
            logger.warning("Anthropic package not available - extractor will be limited")
            self.client = None
        elif not api_key:
            logger.warning("Anthropic API key not found - extractor will be limited")
            self.client = None
        else:
            self.client = anthropic.Anthropic(api_key=api_key)
            logger.info("Semantic extractor initialized with Claude")

    async def extract(
        self,
        page_state: PageState,
        page_type: PageType,
        intent: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Extract structured data from page based on type and intent

        Args:
            page_state: Captured page state
            page_type: Classified page type
            intent: Optional user intent for focused extraction

        Returns:
            Dictionary of extracted data with confidence scores
        """
        if not self.client:
            logger.info("Using fallback extraction (no AI available)")
            return self._fallback_extract(page_state, page_type)

        try:
            # Select appropriate prompt template
            prompt_template = EXTRACTION_PROMPTS.get(page_type, GENERIC_EXTRACTION_PROMPT)

            # Build intent context
            intent_context = ""
            if intent:
                intent_context = f"\nUSER INTENT: The user specifically wants to know about: {intent}\nFocus extraction on information relevant to this intent."

            # Truncate snapshot if too long
            snapshot = page_state.snapshot
            if len(snapshot) > 10000:
                snapshot = snapshot[:10000] + "\n... [truncated]"

            # Build prompt
            prompt = prompt_template.format(
                url=page_state.url,
                title=page_state.title,
                snapshot=snapshot,
                intent_context=intent_context
            )

            # Call Claude API
            response = self.client.messages.create(
                model="claude-3-5-sonnet-20241022",
                max_tokens=4000,
                temperature=0.2,  # Low temperature for consistent extraction
                messages=[{"role": "user", "content": prompt}]
            )

            # Parse response
            response_text = response.content[0].text
            extracted_data = self._parse_extraction_response(response_text)

            # Log extraction summary
            field_count = len([k for k in extracted_data.keys() if not k.endswith("_confidence")])
            logger.info(f"Extracted {field_count} fields from {page_type} page")

            return extracted_data

        except Exception as e:
            logger.error(f"Extraction error: {str(e)}, using fallback")
            return self._fallback_extract(page_state, page_type)

    def _parse_extraction_response(self, response_text: str) -> Dict[str, Any]:
        """Parse Claude's JSON response"""
        try:
            # Extract JSON from response (handle potential markdown wrapping)
            json_start = response_text.find("{")
            json_end = response_text.rfind("}") + 1

            if json_start >= 0 and json_end > json_start:
                json_str = response_text[json_start:json_end]
                return json.loads(json_str)

        except json.JSONDecodeError as e:
            logger.warning(f"Failed to parse extraction response: {str(e)}")

        # Return minimal data if parsing fails
        return {
            "extraction_error": "Failed to parse AI response",
            "raw_response": response_text[:500]
        }

    def _fallback_extract(self, page_state: PageState, page_type: PageType) -> Dict[str, Any]:
        """
        Fallback extraction using basic patterns when AI is unavailable

        Args:
            page_state: Captured page state
            page_type: Page type

        Returns:
            Basic extracted data
        """
        from bs4 import BeautifulSoup

        data = {
            "title": page_state.title,
            "url": page_state.url,
            "_extraction_method": "fallback"
        }

        try:
            soup = BeautifulSoup(page_state.html, "html.parser")

            # Extract basic content
            main_content = soup.select_one("main, article, .content, #content")
            if main_content:
                text = main_content.get_text(strip=True)
                data["main_content"] = text[:1000] + "..." if len(text) > 1000 else text

            # Extract images
            images = []
            for img in soup.select("img[src]")[:10]:
                src = img.get("src", "")
                if src and not src.startswith("data:"):
                    images.append(src)
            if images:
                data["images"] = images

            # Type-specific fallback extraction
            if page_type == PageType.PRODUCT:
                data.update(self._fallback_product_extract(soup))
            elif page_type == PageType.CAMPGROUND:
                data.update(self._fallback_campground_extract(soup))
            elif page_type == PageType.BUSINESS:
                data.update(self._fallback_business_extract(soup))

        except Exception as e:
            logger.warning(f"Fallback extraction error: {str(e)}")
            data["fallback_error"] = str(e)

        return data

    def _fallback_product_extract(self, soup) -> Dict[str, Any]:
        """Fallback product data extraction"""
        data = {}

        # Try to find price
        price_selectors = [".price", "[class*='price']", "[data-price]", ".cost"]
        for selector in price_selectors:
            price_elem = soup.select_one(selector)
            if price_elem:
                data["price"] = price_elem.get_text(strip=True)
                break

        # Try to find name/title
        name_selectors = ["h1", ".product-name", ".product-title", "[itemprop='name']"]
        for selector in name_selectors:
            name_elem = soup.select_one(selector)
            if name_elem:
                data["name"] = name_elem.get_text(strip=True)
                break

        return data

    def _fallback_campground_extract(self, soup) -> Dict[str, Any]:
        """Fallback campground data extraction"""
        data = {}

        # Try to find name
        name_elem = soup.select_one("h1, .campground-name, .park-name")
        if name_elem:
            data["name"] = name_elem.get_text(strip=True)

        # Try to find amenities
        amenities_elem = soup.select_one(".amenities, [class*='amenities']")
        if amenities_elem:
            amenity_items = amenities_elem.select("li, .amenity")
            data["amenities"] = [item.get_text(strip=True) for item in amenity_items[:20]]

        return data

    def _fallback_business_extract(self, soup) -> Dict[str, Any]:
        """Fallback business data extraction"""
        data = {}

        # Try to find name
        name_elem = soup.select_one("h1, .business-name, [itemprop='name']")
        if name_elem:
            data["name"] = name_elem.get_text(strip=True)

        # Try to find address
        address_elem = soup.select_one("[itemprop='address'], .address, [class*='address']")
        if address_elem:
            data["address"] = address_elem.get_text(strip=True)

        # Try to find phone
        phone_elem = soup.select_one("[itemprop='telephone'], .phone, [class*='phone'], a[href^='tel:']")
        if phone_elem:
            data["phone"] = phone_elem.get_text(strip=True)

        return data

    async def health_check(self) -> Dict[str, Any]:
        """Check extractor health"""
        if not self.client:
            return {
                "status": "degraded",
                "ai_available": False,
                "message": "Running with fallback extraction only"
            }

        return {
            "status": "healthy",
            "ai_available": True,
            "model": "claude-3-5-sonnet-20241022"
        }
