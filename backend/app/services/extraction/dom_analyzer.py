"""
Site-Agnostic Data Extraction - DOM Analyzer
Analyzes HTML structure to classify pages and identify content regions
"""

import re
from typing import List, Dict, Any, Optional
from urllib.parse import urlparse

from bs4 import BeautifulSoup

from app.core.logging import get_logger
from .schemas import (
    PageType, DOMAnalysis, ContentRegion, ElementInfo
)
from .exceptions import DOMAnalysisError

logger = get_logger(__name__)


class DOMAnalyzer:
    """
    Analyzes DOM structure to classify page types and identify content regions
    Uses heuristics and pattern matching for site-agnostic analysis
    """

    # Page type detection patterns
    PAGE_TYPE_PATTERNS = {
        PageType.PRODUCT: {
            "selectors": [
                "[itemtype*='Product']",
                "[data-product-id]",
                ".product-page",
                "#product-details",
                ".add-to-cart",
                ".buy-button",
                "[class*='product-price']",
            ],
            "keywords": ["add to cart", "buy now", "in stock", "out of stock", "sku", "product details"],
            "meta_patterns": ["og:type.*product", "product:price"],
        },
        PageType.CAMPGROUND: {
            "selectors": [
                "[itemtype*='Campground']",
                "[itemtype*='LodgingBusiness']",
                ".campground-details",
                ".campsite-info",
                ".rv-park",
                "[class*='amenities']",
                "[class*='reservation']",
            ],
            "keywords": ["campsite", "rv hookup", "tent site", "campground", "amenities",
                        "reservation", "check-in", "check-out", "full hookup", "electric hookup"],
            "url_patterns": ["camp", "rv-park", "campground", "recreation.gov", "reserveamerica"],
        },
        PageType.BUSINESS: {
            "selectors": [
                "[itemtype*='LocalBusiness']",
                "[itemtype*='Organization']",
                ".business-info",
                ".store-info",
                "[class*='hours']",
                "[class*='contact-info']",
            ],
            "keywords": ["hours of operation", "contact us", "our location", "about us",
                        "phone number", "address", "opening hours"],
            "meta_patterns": ["og:type.*business"],
        },
        PageType.ARTICLE: {
            "selectors": [
                "article",
                "[itemtype*='Article']",
                "[itemtype*='BlogPosting']",
                ".post-content",
                ".article-body",
                "[class*='blog-post']",
            ],
            "keywords": ["published", "author", "read time", "comments", "share"],
            "meta_patterns": ["og:type.*article", "article:author", "article:published_time"],
        },
        PageType.COMPARISON: {
            "selectors": [
                ".comparison-table",
                "[class*='vs']",
                ".product-comparison",
                "table.comparison",
                "[class*='compare']",
            ],
            "keywords": ["vs", "versus", "comparison", "compare", "pros and cons",
                        "winner", "best", "top picks"],
        },
        PageType.LISTING: {
            "selectors": [
                ".search-results",
                ".listing-results",
                "[class*='grid']",
                ".product-list",
                ".results-list",
                "[class*='card'][class*='list']",
            ],
            "keywords": ["results", "showing", "of", "items", "page", "next", "previous", "filter"],
        },
        PageType.FORM: {
            "selectors": [
                "form[action]",
                ".contact-form",
                ".signup-form",
                ".login-form",
                "[class*='checkout']",
            ],
            "keywords": ["submit", "sign up", "register", "login", "checkout", "contact form"],
        },
    }

    # Content region patterns
    CONTENT_REGION_PATTERNS = {
        "header": {
            "selectors": ["header", "[role='banner']", "#header", ".header", ".site-header"],
            "content_type": "navigation"
        },
        "main_content": {
            "selectors": ["main", "[role='main']", "#main", ".main-content", "#content", ".content"],
            "content_type": "primary"
        },
        "sidebar": {
            "selectors": ["aside", "[role='complementary']", ".sidebar", "#sidebar"],
            "content_type": "supplementary"
        },
        "navigation": {
            "selectors": ["nav", "[role='navigation']", ".nav", ".navigation", ".menu"],
            "content_type": "navigation"
        },
        "footer": {
            "selectors": ["footer", "[role='contentinfo']", "#footer", ".footer", ".site-footer"],
            "content_type": "supplementary"
        },
        "product_info": {
            "selectors": [".product-info", ".product-details", "#product", "[itemtype*='Product']"],
            "content_type": "primary"
        },
        "pricing": {
            "selectors": [".price", ".pricing", "[class*='price']", ".cost"],
            "content_type": "data"
        },
        "reviews": {
            "selectors": [".reviews", "#reviews", "[class*='review']", ".testimonials"],
            "content_type": "social"
        },
        "media": {
            "selectors": [".gallery", ".images", ".photos", "[class*='carousel']", ".media"],
            "content_type": "media"
        },
    }

    def __init__(self):
        pass

    def analyze_structure(self, html: str, snapshot: str, url: str = None) -> DOMAnalysis:
        """
        Analyze DOM structure to classify page and identify regions

        Args:
            html: Page HTML content
            snapshot: Accessibility snapshot
            url: URL being analyzed (for error context)

        Returns:
            DOMAnalysis with page type, content regions, and element index

        Raises:
            DOMAnalysisError: If critical analysis fails (HTML parsing)
        """
        # Validate inputs
        if not html:
            error = DOMAnalysisError(
                "Empty HTML content provided",
                url=url,
                context={"html_length": 0}
            )
            logger.error(str(error), exc_info=True)
            raise error

        try:
            soup = BeautifulSoup(html, "html.parser")
        except Exception as e:
            error = DOMAnalysisError(
                f"Failed to parse HTML: {str(e)}",
                url=url,
                context={"html_length": len(html), "original_error": type(e).__name__}
            )
            logger.error(str(error), exc_info=True)
            raise error from e

        # Classify page type - non-critical, returns UNKNOWN on failure
        try:
            page_type = self.classify_page_type(soup)
        except Exception as e:
            logger.warning(
                f"Page type classification failed for {url or 'unknown URL'}: {str(e)}",
                exc_info=True
            )
            page_type = PageType.UNKNOWN

        # Identify content regions - non-critical, returns empty list on failure
        try:
            content_regions = self.identify_content_regions(soup)
        except Exception as e:
            logger.warning(
                f"Content region identification failed for {url or 'unknown URL'}: {str(e)}",
                exc_info=True
            )
            content_regions = []

        # Build element index from snapshot - non-critical, returns empty dict on failure
        try:
            element_index = self.build_element_index(snapshot)
        except Exception as e:
            logger.warning(
                f"Element index building failed for {url or 'unknown URL'}: {str(e)}",
                exc_info=True
            )
            element_index = {}

        # Find primary content selector - non-critical
        try:
            primary_selector = self._find_primary_content_selector(soup, page_type)
        except Exception as e:
            logger.debug(f"Primary content selector search failed: {str(e)}")
            primary_selector = None

        # Extract navigation structure - non-critical
        try:
            nav_structure = self._extract_navigation_structure(soup)
        except Exception as e:
            logger.debug(f"Navigation structure extraction failed: {str(e)}")
            nav_structure = []

        # Extract form fields if present - non-critical
        try:
            form_fields = self._extract_form_fields(soup)
        except Exception as e:
            logger.debug(f"Form fields extraction failed: {str(e)}")
            form_fields = []

        analysis = DOMAnalysis(
            page_type=page_type,
            content_regions=content_regions,
            element_index=element_index,
            primary_content_selector=primary_selector,
            navigation_structure=nav_structure,
            form_fields=form_fields
        )

        logger.info(f"DOM analysis complete: type={page_type}, regions={len(content_regions)}")
        return analysis

    def classify_page_type(self, soup: BeautifulSoup) -> PageType:
        """
        Classify page type based on DOM patterns

        Args:
            soup: BeautifulSoup parsed HTML

        Returns:
            Detected PageType
        """
        scores = {page_type: 0.0 for page_type in PageType}

        html_text = soup.get_text().lower()
        html_str = str(soup).lower()

        for page_type, patterns in self.PAGE_TYPE_PATTERNS.items():
            # Check selectors
            for selector in patterns.get("selectors", []):
                try:
                    if soup.select(selector):
                        scores[page_type] += 2.0
                except Exception as e:
                    # Invalid CSS selector - log at debug level as this is expected for some patterns
                    logger.debug(f"Selector '{selector}' failed during classification: {type(e).__name__}")
                    continue

            # Check keywords in text
            for keyword in patterns.get("keywords", []):
                if keyword.lower() in html_text:
                    scores[page_type] += 1.0

            # Check meta patterns
            for pattern in patterns.get("meta_patterns", []):
                if re.search(pattern, html_str):
                    scores[page_type] += 1.5

            # Check URL patterns (if embedded in page)
            for url_pattern in patterns.get("url_patterns", []):
                if url_pattern in html_str:
                    scores[page_type] += 0.5

        # Find highest scoring type
        max_score = 0
        best_type = PageType.UNKNOWN

        for page_type, score in scores.items():
            if score > max_score:
                max_score = score
                best_type = page_type

        # Require minimum score to classify
        if max_score < 2.0:
            best_type = PageType.UNKNOWN

        logger.debug(f"Page type scores: {scores}, classified as: {best_type}")
        return best_type

    def identify_content_regions(self, soup: BeautifulSoup) -> List[ContentRegion]:
        """
        Identify distinct content regions in the page

        Args:
            soup: BeautifulSoup parsed HTML

        Returns:
            List of ContentRegion objects
        """
        regions = []

        for region_name, config in self.CONTENT_REGION_PATTERNS.items():
            for selector in config["selectors"]:
                try:
                    elements = soup.select(selector)
                    if elements:
                        # Calculate confidence based on number of elements and selector specificity
                        confidence = min(0.9, 0.5 + (0.1 * len(elements)))

                        # Adjust confidence for more specific selectors
                        if "#" in selector or "[" in selector:
                            confidence = min(0.95, confidence + 0.1)

                        region = ContentRegion(
                            name=region_name,
                            selector=selector,
                            confidence=confidence,
                            content_type=config["content_type"],
                            element_count=len(elements)
                        )
                        regions.append(region)
                        break  # Use first matching selector for each region
                except Exception as e:
                    # Log selector failures at debug level - these are expected for CSS selector edge cases
                    logger.debug(
                        f"Selector '{selector}' failed for region '{region_name}': "
                        f"{type(e).__name__}: {str(e)}"
                    )
                    continue

        return regions

    def build_element_index(self, snapshot: str) -> Dict[int, ElementInfo]:
        """
        Build element index from accessibility snapshot

        Args:
            snapshot: Accessibility snapshot string

        Returns:
            Dictionary mapping indices to ElementInfo
        """
        element_index = {}

        if not snapshot or snapshot.startswith("[Empty") or snapshot.startswith("[Accessibility"):
            return element_index

        # Parse snapshot lines
        lines = snapshot.split("\n")
        index_pattern = re.compile(r"^\s*\[(\d+)\]\s*(\w+)(?::\s*\"([^\"]*)\")?\s*(?:\(([^)]*)\))?")

        for line in lines:
            match = index_pattern.match(line)
            if match:
                # Validate required groups exist before accessing
                if not match.lastindex or match.lastindex < 2:
                    logger.debug(f"Pattern did not capture required groups for line: {line[:50]}...")
                    continue

                try:
                    index = int(match.group(1))
                    role = match.group(2)
                except (IndexError, TypeError) as e:
                    logger.debug(f"Failed to extract required groups from line: {line[:50]}... - {e}")
                    continue

                # Optional groups (3 and 4) - safely access with fallback
                name = match.group(3) if match.lastindex >= 3 and match.group(3) else ""
                value = match.group(4) if match.lastindex >= 4 and match.group(4) else ""

                # Calculate depth from indentation
                depth = (len(line) - len(line.lstrip())) // 2

                element_info = ElementInfo(
                    index=index,
                    role=role,
                    name=name,
                    text=value,
                    attributes={"depth": str(depth)}
                )
                element_index[index] = element_info

        logger.debug(f"Built element index with {len(element_index)} elements")
        return element_index

    def _find_primary_content_selector(self, soup: BeautifulSoup, page_type: PageType) -> Optional[str]:
        """Find the most likely primary content selector"""
        # Type-specific primary selectors
        type_selectors = {
            PageType.PRODUCT: [".product-details", "#product", "[itemtype*='Product']", ".product-info"],
            PageType.CAMPGROUND: [".campground-details", ".campsite-info", ".park-info", "main"],
            PageType.BUSINESS: [".business-info", ".store-info", "[itemtype*='LocalBusiness']", "main"],
            PageType.ARTICLE: ["article", ".article-body", ".post-content", ".entry-content"],
            PageType.COMPARISON: [".comparison-table", ".product-comparison", "main"],
            PageType.LISTING: [".search-results", ".listing-results", ".results", "main"],
            PageType.FORM: ["form", ".form-container", "main"],
        }

        selectors_to_try = type_selectors.get(page_type, ["main", "#content", ".content"])

        for selector in selectors_to_try:
            try:
                if soup.select_one(selector):
                    return selector
            except Exception as e:
                # Log at debug level - invalid selectors are expected for some page types
                logger.debug(f"Primary content selector '{selector}' failed: {type(e).__name__}")
                continue

        return None

    def _extract_navigation_structure(self, soup: BeautifulSoup) -> List[str]:
        """Extract navigation menu items"""
        nav_items = []

        nav_elements = soup.select("nav a, [role='navigation'] a, .nav a, .menu a")
        for element in nav_elements[:20]:  # Limit to prevent huge lists
            text = element.get_text(strip=True)
            if text and len(text) < 50:
                nav_items.append(text)

        return nav_items

    def _extract_form_fields(self, soup: BeautifulSoup) -> List[Dict[str, Any]]:
        """Extract form field information"""
        form_fields = []

        inputs = soup.select("input, select, textarea")
        for element in inputs:
            field_info = {
                "type": element.get("type", element.name),
                "name": element.get("name", ""),
                "id": element.get("id", ""),
                "required": element.has_attr("required"),
                "placeholder": element.get("placeholder", ""),
            }

            # Get label if available
            field_id = element.get("id")
            if field_id:
                label = soup.select_one(f"label[for='{field_id}']")
                if label:
                    field_info["label"] = label.get_text(strip=True)

            form_fields.append(field_info)

        return form_fields
