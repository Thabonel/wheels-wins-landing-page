"""
Page Data Extractor for Universal Site Access

Extracts structured data from web pages including:
- Tables
- Product information
- Campground/RV park details
- Generic structured content
"""

import logging
import re
from typing import Dict, List, Any, Optional, TYPE_CHECKING

from .models import ProductInfo, CampgroundInfo
from .element_indexer import index_page

if TYPE_CHECKING:
    from playwright.async_api import Page

logger = logging.getLogger(__name__)


class SelectorValidationError(ValueError):
    """Raised when a selector fails validation"""
    pass


def sanitize_xpath(xpath: str) -> str:
    """
    Sanitize XPath to prevent injection attacks.

    Args:
        xpath: The XPath expression to sanitize

    Returns:
        The sanitized XPath if valid

    Raises:
        SelectorValidationError: If XPath contains invalid or dangerous patterns
    """
    if not xpath or not xpath.strip():
        raise SelectorValidationError("XPath cannot be empty")

    # Only allow safe XPath characters
    if not re.match(r'^[a-zA-Z0-9\[\]@=\'"\/\.\-_\s\(\)\*:]+$', xpath):
        logger.warning(f"XPath contains invalid characters: {xpath[:50]}...")
        raise SelectorValidationError("Invalid XPath characters detected")

    # Disallow dangerous functions that could be exploited
    dangerous_patterns = [
        'document',
        'evaluate',
        'concat(',
        'string(',
        'normalize-space(',
        'translate(',
        'format-number(',
        'unparsed-entity-uri(',
        'generate-id(',
        'system-property(',
    ]
    xpath_lower = xpath.lower()
    for func in dangerous_patterns:
        if func in xpath_lower:
            logger.warning(f"Dangerous XPath function detected: {func} in {xpath[:50]}...")
            raise SelectorValidationError(f"Dangerous XPath function not allowed: {func}")

    return xpath


def sanitize_css_selector(selector: str) -> str:
    """
    Sanitize CSS selector to prevent injection attacks.

    Args:
        selector: The CSS selector to sanitize

    Returns:
        The sanitized selector if valid

    Raises:
        SelectorValidationError: If selector contains invalid or dangerous patterns
    """
    if not selector or not selector.strip():
        raise SelectorValidationError("CSS selector cannot be empty")

    # Only allow safe CSS selector characters
    if not re.match(r'^[a-zA-Z0-9\[\]@=\'"\/\.\-_\s\(\)\*#:>,~\+\|\^]+$', selector):
        logger.warning(f"CSS selector contains invalid characters: {selector[:50]}...")
        raise SelectorValidationError("Invalid CSS selector characters detected")

    # Disallow patterns that could be dangerous in evaluated contexts
    dangerous_patterns = [
        'javascript:',
        'expression(',
        'url(',
        'import',
    ]
    selector_lower = selector.lower()
    for pattern in dangerous_patterns:
        if pattern in selector_lower:
            logger.warning(f"Dangerous CSS pattern detected: {pattern} in {selector[:50]}...")
            raise SelectorValidationError(f"Dangerous CSS pattern not allowed: {pattern}")

    return selector


class PageDataExtractor:
    """
    Extracts structured data from web pages.

    Combines element indexing with content extraction to pull
    meaningful data from various page types.
    """

    async def extract_structured_data(
        self,
        page: 'Page',
        data_type: str,
    ) -> Dict[str, Any]:
        """
        Extract structured data of a specific type from the page.

        Args:
            page: Playwright page instance
            data_type: Type of data to extract ("product", "campground", "table", "contact", "pricing")

        Returns:
            Dict with extracted data, structure varies by data_type
        """
        logger.info(f"Extracting {data_type} data from page")

        extractors = {
            "product": self._extract_product_data,
            "campground": self._extract_campground_data,
            "table": self._extract_all_tables,
            "contact": self._extract_contact_info,
            "pricing": self._extract_pricing_info,
            "search_results": self._extract_search_results,
        }

        extractor = extractors.get(data_type.lower())
        if not extractor:
            logger.warning(f"Unknown data type: {data_type}")
            return {"error": f"Unknown data type: {data_type}"}

        try:
            return await extractor(page)
        except Exception as e:
            logger.error(f"Data extraction failed for {data_type}: {e}")
            return {"error": str(e)}

    async def extract_table_data(
        self,
        page: 'Page',
        table_index: int = 0,
    ) -> List[Dict[str, str]]:
        """
        Extract data from a table on the page.

        Args:
            page: Playwright page instance
            table_index: Index of table to extract (0-based)

        Returns:
            List of dicts, each dict is a row with column headers as keys
        """
        logger.info(f"Extracting table {table_index}")

        try:
            tables = await page.query_selector_all('table')
            if table_index >= len(tables):
                logger.warning(f"Table index {table_index} not found, only {len(tables)} tables")
                return []

            table = tables[table_index]

            # Extract headers
            headers = await table.evaluate('''t => {
                const headerRow = t.querySelector('thead tr') || t.querySelector('tr');
                if (!headerRow) return [];
                return Array.from(headerRow.querySelectorAll('th, td')).map(
                    cell => cell.textContent.trim()
                );
            }''')

            if not headers:
                headers = [f"col_{i}" for i in range(10)]

            # Extract rows
            rows = await table.evaluate('''t => {
                const rows = t.querySelectorAll('tbody tr') || t.querySelectorAll('tr');
                return Array.from(rows).slice(0, 100).map(row =>
                    Array.from(row.querySelectorAll('td, th')).map(
                        cell => cell.textContent.trim()
                    )
                );
            }''')

            # Convert to list of dicts
            result = []
            for row in rows:
                if len(row) > 0 and row != headers:
                    row_dict = {}
                    for i, value in enumerate(row):
                        key = headers[i] if i < len(headers) else f"col_{i}"
                        row_dict[key] = value
                    result.append(row_dict)

            logger.info(f"Extracted {len(result)} rows from table")
            return result

        except Exception as e:
            logger.error(f"Table extraction failed: {e}")
            return []

    async def extract_product_info(
        self,
        page: 'Page',
    ) -> ProductInfo:
        """
        Extract product information from a product page.

        Args:
            page: Playwright page instance

        Returns:
            ProductInfo dataclass with extracted data
        """
        logger.info("Extracting product info")

        data = await self._extract_product_data(page)

        return ProductInfo(
            name=data.get("name", ""),
            price=data.get("price"),
            currency=data.get("currency", "USD"),
            description=data.get("description", ""),
            images=data.get("images", []),
            availability=data.get("availability", ""),
            rating=data.get("rating"),
            review_count=data.get("review_count", 0),
            attributes=data.get("attributes", {}),
            url=page.url,
        )

    async def extract_campground_info(
        self,
        page: 'Page',
    ) -> CampgroundInfo:
        """
        Extract campground/RV park information from a listing page.

        Args:
            page: Playwright page instance

        Returns:
            CampgroundInfo dataclass with extracted data
        """
        logger.info("Extracting campground info")

        data = await self._extract_campground_data(page)

        return CampgroundInfo(
            name=data.get("name", ""),
            address=data.get("address", ""),
            city=data.get("city", ""),
            state=data.get("state", ""),
            phone=data.get("phone", ""),
            website=data.get("website", ""),
            price_per_night=data.get("price_per_night"),
            rating=data.get("rating"),
            review_count=data.get("review_count", 0),
            amenities=data.get("amenities", []),
            site_types=data.get("site_types", []),
            max_rv_length=data.get("max_rv_length"),
            pet_friendly=data.get("pet_friendly"),
            wifi=data.get("wifi"),
            availability=data.get("availability", ""),
            images=data.get("images", []),
            latitude=data.get("latitude"),
            longitude=data.get("longitude"),
        )

    async def _extract_product_data(self, page: 'Page') -> Dict[str, Any]:
        """Extract generic product data using common patterns"""

        result = await page.evaluate(r'''() => {
            const data = {};

            // Product name - multiple common patterns
            const nameSelectors = [
                'h1[itemprop="name"]',
                'h1.product-title',
                'h1.product-name',
                '[data-testid="product-title"]',
                '.product-details h1',
                'h1',
            ];
            for (const sel of nameSelectors) {
                const el = document.querySelector(sel);
                if (el && el.textContent.trim()) {
                    data.name = el.textContent.trim();
                    break;
                }
            }

            // Price - look for common patterns
            const priceSelectors = [
                '[itemprop="price"]',
                '.price',
                '.product-price',
                '[data-testid="price"]',
                '.current-price',
                '.sale-price',
            ];
            for (const sel of priceSelectors) {
                const el = document.querySelector(sel);
                if (el) {
                    const text = el.textContent || el.getAttribute('content') || '';
                    const match = text.match(/[\$\u00A3\u20AC]?([0-9,.]+)/);
                    if (match) {
                        data.price = parseFloat(match[1].replace(',', ''));
                        break;
                    }
                }
            }

            // Description
            const descSelectors = [
                '[itemprop="description"]',
                '.product-description',
                '.description',
                '#description',
            ];
            for (const sel of descSelectors) {
                const el = document.querySelector(sel);
                if (el && el.textContent.trim()) {
                    data.description = el.textContent.trim().substring(0, 1000);
                    break;
                }
            }

            // Images
            data.images = [];
            const imgSelectors = [
                '.product-image img',
                '.gallery img',
                '[itemprop="image"]',
                '.product-photos img',
            ];
            for (const sel of imgSelectors) {
                const imgs = document.querySelectorAll(sel);
                imgs.forEach(img => {
                    const src = img.src || img.getAttribute('data-src');
                    if (src && data.images.length < 10) {
                        data.images.push(src);
                    }
                });
                if (data.images.length > 0) break;
            }

            // Rating
            const ratingEl = document.querySelector('[itemprop="ratingValue"]') ||
                           document.querySelector('.rating') ||
                           document.querySelector('.stars');
            if (ratingEl) {
                const match = (ratingEl.textContent || ratingEl.getAttribute('content') || '')
                    .match(/([0-9.]+)/);
                if (match) {
                    data.rating = parseFloat(match[1]);
                }
            }

            // Review count
            const reviewEl = document.querySelector('[itemprop="reviewCount"]') ||
                           document.querySelector('.review-count');
            if (reviewEl) {
                const match = (reviewEl.textContent || reviewEl.getAttribute('content') || '')
                    .match(/([0-9,]+)/);
                if (match) {
                    data.review_count = parseInt(match[1].replace(',', ''));
                }
            }

            // Availability
            const availEl = document.querySelector('[itemprop="availability"]') ||
                          document.querySelector('.availability') ||
                          document.querySelector('.stock-status');
            if (availEl) {
                data.availability = availEl.textContent.trim();
            }

            return data;
        }''')

        return result

    async def _extract_campground_data(self, page: 'Page') -> Dict[str, Any]:
        """Extract campground-specific data"""

        result = await page.evaluate(r'''() => {
            const data = {};

            // Name
            const nameEl = document.querySelector('h1') ||
                          document.querySelector('.park-name') ||
                          document.querySelector('.campground-name');
            if (nameEl) {
                data.name = nameEl.textContent.trim();
            }

            // Address - look for address patterns
            const addressEl = document.querySelector('[itemprop="address"]') ||
                            document.querySelector('.address') ||
                            document.querySelector('.location');
            if (addressEl) {
                const text = addressEl.textContent.trim();
                data.address = text;

                // Try to parse city, state
                const cityStateMatch = text.match(/([^,]+),\\s*([A-Z]{2})/);
                if (cityStateMatch) {
                    data.city = cityStateMatch[1].trim();
                    data.state = cityStateMatch[2];
                }
            }

            // Phone
            const phoneEl = document.querySelector('[itemprop="telephone"]') ||
                          document.querySelector('a[href^="tel:"]') ||
                          document.querySelector('.phone');
            if (phoneEl) {
                data.phone = phoneEl.textContent.trim().replace(/[^0-9-()+ ]/g, '');
            }

            // Price
            const priceText = document.body.innerText;
            const priceMatch = priceText.match(/\\$([0-9]+(?:\\.[0-9]{2})?).{0,20}(?:night|nightly|per night)/i);
            if (priceMatch) {
                data.price_per_night = parseFloat(priceMatch[1]);
            }

            // Rating
            const ratingEl = document.querySelector('[itemprop="ratingValue"]') ||
                           document.querySelector('.rating') ||
                           document.querySelector('.review-score');
            if (ratingEl) {
                const match = (ratingEl.textContent || '').match(/([0-9.]+)/);
                if (match) {
                    data.rating = parseFloat(match[1]);
                }
            }

            // Amenities - common patterns
            data.amenities = [];
            const amenityContainers = document.querySelectorAll('.amenities li, .features li, .facilities li');
            amenityContainers.forEach(el => {
                const text = el.textContent.trim();
                if (text && data.amenities.length < 30) {
                    data.amenities.push(text);
                }
            });

            // Check for specific amenities in page text
            const pageText = document.body.innerText.toLowerCase();
            if (pageText.includes('wifi') || pageText.includes('wi-fi')) {
                data.wifi = true;
            }
            if (pageText.includes('pet friendly') || pageText.includes('pets allowed') || pageText.includes('dogs allowed')) {
                data.pet_friendly = true;
            }

            // RV length
            const lengthMatch = pageText.match(/max(?:imum)?.{0,10}(?:rv|rig).{0,10}([0-9]+).{0,5}(?:ft|feet|foot)/i);
            if (lengthMatch) {
                data.max_rv_length = parseInt(lengthMatch[1]);
            }

            // Images
            data.images = [];
            document.querySelectorAll('.gallery img, .photos img, .park-images img').forEach(img => {
                const src = img.src || img.getAttribute('data-src');
                if (src && data.images.length < 10) {
                    data.images.push(src);
                }
            });

            return data;
        }''')

        return result

    async def _extract_all_tables(self, page: 'Page') -> Dict[str, Any]:
        """Extract all tables from the page"""

        tables_count = await page.evaluate('() => document.querySelectorAll("table").length')

        result = {
            "table_count": tables_count,
            "tables": []
        }

        for i in range(min(tables_count, 5)):  # Limit to 5 tables
            table_data = await self.extract_table_data(page, i)
            result["tables"].append({
                "index": i,
                "rows": len(table_data),
                "data": table_data[:20]  # Limit rows per table
            })

        return result

    async def _extract_contact_info(self, page: 'Page') -> Dict[str, Any]:
        """Extract contact information from the page"""

        return await page.evaluate(r'''() => {
            const data = {};
            const text = document.body.innerText;

            // Email
            const emailMatch = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}/);
            if (emailMatch) {
                data.email = emailMatch[0];
            }

            // Phone - US format
            const phoneMatch = text.match(/(?:\\+1[-.\\s]?)?\\(?[0-9]{3}\\)?[-.\\s]?[0-9]{3}[-.\\s]?[0-9]{4}/);
            if (phoneMatch) {
                data.phone = phoneMatch[0];
            }

            // Address patterns
            const addressEl = document.querySelector('[itemprop="address"]') ||
                            document.querySelector('.address') ||
                            document.querySelector('.contact-address');
            if (addressEl) {
                data.address = addressEl.textContent.trim();
            }

            // Social links
            data.social = {};
            const socialPatterns = {
                facebook: /facebook\\.com\\/[^"\\s]+/,
                twitter: /twitter\\.com\\/[^"\\s]+/,
                instagram: /instagram\\.com\\/[^"\\s]+/,
                linkedin: /linkedin\\.com\\/[^"\\s]+/,
            };
            const html = document.body.innerHTML;
            for (const [platform, pattern] of Object.entries(socialPatterns)) {
                const match = html.match(pattern);
                if (match) {
                    data.social[platform] = 'https://' + match[0];
                }
            }

            return data;
        }''')

    async def _extract_pricing_info(self, page: 'Page') -> Dict[str, Any]:
        """Extract pricing information from the page"""

        return await page.evaluate(r'''() => {
            const data = {
                prices: [],
                currency: 'USD'
            };

            // Look for price elements
            const priceEls = document.querySelectorAll(
                '[itemprop="price"], .price, .pricing, .rate, .cost'
            );

            priceEls.forEach(el => {
                const text = el.textContent || '';
                const match = text.match(/([\\$\\u00A3\\u20AC])([0-9,.]+)/);
                if (match) {
                    const currencyMap = {'$': 'USD', '\\u00A3': 'GBP', '\\u20AC': 'EUR'};
                    data.currency = currencyMap[match[1]] || 'USD';
                    const price = parseFloat(match[2].replace(',', ''));

                    // Try to get label/context
                    const parent = el.closest('tr, li, div');
                    const label = parent ? parent.textContent.split(/\\s*[\\$\\u00A3\\u20AC]/)[0].trim() : '';

                    data.prices.push({
                        amount: price,
                        label: label.substring(0, 50)
                    });
                }
            });

            // Deduplicate
            const seen = new Set();
            data.prices = data.prices.filter(p => {
                const key = `${p.amount}-${p.label}`;
                if (seen.has(key)) return false;
                seen.add(key);
                return true;
            }).slice(0, 20);

            return data;
        }''')

    async def _extract_search_results(self, page: 'Page') -> Dict[str, Any]:
        """Extract search results from a results page"""

        return await page.evaluate(r'''() => {
            const data = {
                results: [],
                total_count: null,
                page_info: {}
            };

            // Look for result count
            const countMatch = document.body.innerText.match(
                /([0-9,]+)\\s*(?:results?|listings?|items?|found)/i
            );
            if (countMatch) {
                data.total_count = parseInt(countMatch[1].replace(',', ''));
            }

            // Common result container patterns
            const resultSelectors = [
                '.search-result',
                '.result-item',
                '.listing',
                '[data-testid*="result"]',
                '.product-card',
                '.search-results > li',
                '.results-list > div',
            ];

            let results = [];
            for (const sel of resultSelectors) {
                results = document.querySelectorAll(sel);
                if (results.length > 0) break;
            }

            results.forEach((el, i) => {
                if (i >= 20) return; // Limit results

                const result = {};

                // Title
                const titleEl = el.querySelector('h2, h3, h4, .title, .name, a');
                if (titleEl) {
                    result.title = titleEl.textContent.trim().substring(0, 100);
                    if (titleEl.href) {
                        result.url = titleEl.href;
                    }
                }

                // Price
                const priceEl = el.querySelector('.price, [itemprop="price"]');
                if (priceEl) {
                    const match = priceEl.textContent.match(/[\\$\\u00A3\\u20AC]?([0-9,.]+)/);
                    if (match) {
                        result.price = parseFloat(match[1].replace(',', ''));
                    }
                }

                // Description/snippet
                const descEl = el.querySelector('.description, .snippet, p');
                if (descEl) {
                    result.description = descEl.textContent.trim().substring(0, 200);
                }

                // Rating
                const ratingEl = el.querySelector('.rating, .stars, [itemprop="ratingValue"]');
                if (ratingEl) {
                    const match = ratingEl.textContent.match(/([0-9.]+)/);
                    if (match) {
                        result.rating = parseFloat(match[1]);
                    }
                }

                // Image
                const imgEl = el.querySelector('img');
                if (imgEl && imgEl.src) {
                    result.image = imgEl.src;
                }

                if (Object.keys(result).length > 0) {
                    data.results.push(result);
                }
            });

            return data;
        }''')
