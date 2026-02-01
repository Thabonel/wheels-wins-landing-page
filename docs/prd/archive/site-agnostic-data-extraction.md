# Site-Agnostic Data Extraction and Parsing System

## Product Requirements Document (PRD)

**Version:** 1.0
**Status:** Draft
**Created:** February 1, 2026
**Author:** Engineering Team
**Product:** PAM (Personal AI Manager) - Wheels & Wins

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Problem Statement](#2-problem-statement)
3. [Goals and Success Metrics](#3-goals-and-success-metrics)
4. [User Stories](#4-user-stories)
5. [System Architecture](#5-system-architecture)
6. [Technical Specifications](#6-technical-specifications)
7. [Data Schemas](#7-data-schemas)
8. [AI Prompts and Classification](#8-ai-prompts-and-classification)
9. [Caching Strategy](#9-caching-strategy)
10. [Error Handling and Recovery](#10-error-handling-and-recovery)
11. [Performance Requirements](#11-performance-requirements)
12. [Testing Approach](#12-testing-approach)
13. [Security Considerations](#13-security-considerations)
14. [Implementation Phases](#14-implementation-phases)
15. [Appendix](#15-appendix)

---

## 1. Executive Summary

### 1.1 Vision

Build a universal data extraction system that enables PAM to extract structured data from ANY website without requiring site-specific parsers. The system combines traditional DOM parsing with AI-powered semantic understanding to deliver accurate, structured data regardless of the source website's structure.

### 1.2 Key Innovation: OpenClaw Integration

The system leverages OpenClaw's numeric element reference system for universal page interaction:
- Every interactive element receives a unique numeric identifier
- AI can reference elements by number (e.g., "Click element 7")
- No need for site-specific CSS selectors or XPath
- Works across all websites uniformly

### 1.3 Core Capabilities

| Capability | Description |
|------------|-------------|
| **Universal Extraction** | Extract data from any website without pre-built parsers |
| **AI-Powered Understanding** | Semantic comprehension of page content and structure |
| **Multi-Format Output** | JSON, structured data, natural language responses |
| **Pattern Learning** | Cache successful extraction strategies for reuse |
| **Real-Time Processing** | Sub-5 second extraction for most pages |

---

## 2. Problem Statement

### 2.1 Current Limitations

**Traditional Web Scraping:**
- Requires site-specific selectors (CSS, XPath)
- Breaks when websites change their structure
- Cannot handle dynamic JavaScript content
- No semantic understanding of content meaning

**PAM's Current Scraping Service:**
- Uses hardcoded `ScrapingTarget` definitions
- Requires manual selector configuration per site
- Limited to predefined data types
- Cannot adapt to unknown website structures

### 2.2 User Pain Points

| Pain Point | Impact |
|------------|--------|
| "PAM can't read this website" | Users share links PAM cannot extract data from |
| Manual data entry | Users must manually tell PAM what they see |
| Outdated information | Pre-built parsers break when sites update |
| Limited sources | Only works with predefined websites |

### 2.3 Business Impact

- **Reduced utility**: PAM cannot help with arbitrary web content
- **User frustration**: Links shared with PAM yield no results
- **Maintenance burden**: Constant parser updates required
- **Competitive disadvantage**: Modern AI assistants handle any URL

---

## 3. Goals and Success Metrics

### 3.1 Primary Goals

1. **Universal Coverage**: Extract meaningful data from 90%+ of public websites
2. **Zero Configuration**: No site-specific setup required
3. **Semantic Accuracy**: Correctly identify data types and relationships
4. **Performance**: Sub-5 second extraction for standard pages
5. **Reliability**: Graceful degradation when full extraction fails

### 3.2 Success Metrics

| Metric | Target | Measurement Method |
|--------|--------|-------------------|
| **Extraction Success Rate** | >90% | Automated test suite against 1000 URLs |
| **Data Accuracy** | >85% | Human validation of 100 random extractions |
| **Response Time (P95)** | <5 seconds | Performance monitoring |
| **Pattern Cache Hit Rate** | >60% | Cache analytics |
| **Error Recovery Rate** | >95% | Graceful fallback success rate |
| **User Satisfaction** | >4.0/5.0 | Post-extraction feedback |

### 3.3 Anti-Goals (Out of Scope)

- Bypassing authentication or paywalls
- Extracting copyrighted content at scale
- Real-time streaming of dynamic content
- Extracting from mobile-only apps
- Supporting non-web content (PDFs, documents - separate system)

---

## 4. User Stories

### 4.1 Primary Use Cases

#### Use Case 1: Product Price Extraction

```
User: "What's the price of this Blink camera?"
      [shares Amazon/Walmart/BestBuy link]

PAM: "The Blink Mini 2 Camera is $29.99 on Amazon.
      Key features include:
      - 1080p HD video
      - Two-way audio
      - Night vision
      - Motion detection alerts

      Prime members get free same-day delivery.
      Would you like me to compare prices elsewhere?"
```

**Acceptance Criteria:**
- Extract product name, price, features from any e-commerce site
- Identify availability, shipping info, reviews
- Handle variations (colors, sizes, bundles)

#### Use Case 2: Campground Availability

```
User: "What campgrounds are available near Yellowstone next week?"
      [shares recreation.gov search results]

PAM: "I found 3 campgrounds with availability:

      1. Madison Campground - $28/night
         - Sites available: 15, 23, 47
         - Amenities: Flush toilets, potable water
         - 0.2 miles to trailhead

      2. Bridge Bay Campground - $32/night
         - Sites available: 112, 156
         - Amenities: Showers, laundry, boat launch

      Would you like me to help book one of these?"
```

**Acceptance Criteria:**
- Parse campground listings from any booking site
- Extract pricing, availability, amenities
- Handle date-specific information

#### Use Case 3: Equipment Comparison

```
User: "Can you compare these RV generators?"
      [shares link to comparison article]

PAM: "Based on that comparison article:

      | Feature        | Honda EU2200i | Champion 3400 | Westinghouse |
      |---------------|---------------|---------------|--------------|
      | Watts         | 2,200         | 3,400         | 4,500        |
      | Runtime       | 8.1 hrs       | 7.5 hrs       | 18 hrs       |
      | Noise Level   | 48-57 dB      | 59 dB         | 52 dB        |
      | Price         | $1,149        | $649          | $449         |
      | Parallel Cap  | Yes           | Yes           | Yes          |

      The Honda is quietest but most expensive.
      The Champion offers best value for mid-range power.
      What's most important to you - noise, runtime, or price?"
```

**Acceptance Criteria:**
- Extract comparison tables from any format
- Identify product specifications
- Normalize data for side-by-side comparison

#### Use Case 4: Local Service Information

```
User: "What are the hours for this RV repair shop?"
      [shares Google Maps or Yelp link]

PAM: "Wanderlust RV Repair in Flagstaff, AZ:

      Hours:
      - Monday-Friday: 8:00 AM - 6:00 PM
      - Saturday: 9:00 AM - 3:00 PM
      - Sunday: Closed

      Contact: (928) 555-0123
      Rating: 4.7 stars (127 reviews)
      Services: Engine repair, electrical, appliances, body work

      They're currently open and close in 4 hours.
      Would you like me to call them or get directions?"
```

**Acceptance Criteria:**
- Extract business information from any directory
- Parse hours, contact info, services
- Calculate current open/closed status

#### Use Case 5: Travel Blog Information

```
User: "What routes does this blog recommend for the Pacific Coast Highway?"
      [shares travel blog post]

PAM: "This article recommends a 10-day PCH itinerary:

      Day 1-2: San Francisco - Monterey (120 miles)
      - Stop: Half Moon Bay for lunch
      - Camp: Pfeiffer Big Sur State Park

      Day 3-4: Big Sur - San Simeon (90 miles)
      - Must-see: Bixby Bridge, McWay Falls
      - Camp: San Simeon Creek Campground

      [continues...]

      Total distance: 655 miles
      Best time: September-October
      Estimated fuel cost: $180-220

      Want me to add these stops to your trip plan?"
```

**Acceptance Criteria:**
- Extract route recommendations from articles
- Identify locations, distances, timing
- Parse embedded maps and directions

---

## 5. System Architecture

### 5.1 High-Level Architecture

```
+------------------------------------------------------------------+
|                    PAM Data Extraction System                      |
+------------------------------------------------------------------+
|                                                                    |
|  +-------------------+    +-------------------+    +------------+  |
|  |   Input Handler   |    |  Browser Engine   |    |   Output   |  |
|  |                   |--->|   (Playwright)    |--->|  Formatter |  |
|  | - URL validation  |    | - Page rendering  |    | - JSON     |  |
|  | - Request context |    | - JS execution    |    | - Markdown |  |
|  | - User intent     |    | - Screenshot      |    | - NL text  |  |
|  +-------------------+    +-------------------+    +------------+  |
|            |                       |                     ^         |
|            v                       v                     |         |
|  +-------------------+    +-------------------+          |         |
|  |  Intent Analyzer  |    |   DOM Analyzer    |          |         |
|  |                   |    |                   |          |         |
|  | - What to extract |    | - Structure map   |          |         |
|  | - Data type hints |    | - Element index   |          |         |
|  | - Priority fields |    | - Content regions |          |         |
|  +-------------------+    +-------------------+          |         |
|            |                       |                     |         |
|            v                       v                     |         |
|  +-----------------------------------------------------------+    |
|  |              AI Extraction Engine (Claude)                 |    |
|  |                                                            |    |
|  |  +------------------+  +------------------+  +----------+  |    |
|  |  | Content Classifier|  | Semantic Extractor|  | Schema   |  |    |
|  |  |                  |  |                  |  | Mapper   |  |----+
|  |  | - Page type      |  | - Field values   |  |          |  |
|  |  | - Data categories|  | - Relationships  |  | - Output |  |
|  |  | - Confidence     |  | - Normalization  |  |   format |  |
|  |  +------------------+  +------------------+  +----------+  |
|  +-----------------------------------------------------------+
|            |                       |
|            v                       v
|  +-------------------+    +-------------------+
|  |   Pattern Cache   |    |   Error Handler   |
|  |                   |    |                   |
|  | - Successful      |    | - Missing elements|
|  |   extraction      |    | - Layout changes  |
|  |   strategies      |    | - Partial data    |
|  | - Site signatures |    | - Fallback logic  |
|  +-------------------+    +-------------------+
|
+------------------------------------------------------------------+
```

### 5.2 Component Details

#### 5.2.1 Input Handler

**Purpose:** Receive and validate extraction requests

```python
@dataclass
class ExtractionRequest:
    """Request for data extraction from a URL"""
    url: str
    user_intent: Optional[str] = None  # "What's the price?" "Compare these"
    expected_data_type: Optional[str] = None  # product, campground, article
    context: Optional[Dict[str, Any]] = None  # User location, preferences
    priority_fields: Optional[List[str]] = None  # ["price", "availability"]
    max_wait_time: int = 10000  # milliseconds
```

**Responsibilities:**
- URL validation and normalization
- Request deduplication
- Rate limiting
- Context enrichment

#### 5.2.2 Browser Engine (Playwright)

**Purpose:** Render pages and capture DOM state

```python
class BrowserEngine:
    """Headless browser for page rendering and interaction"""

    async def capture_page_state(self, url: str) -> PageState:
        """Capture complete page state including JavaScript-rendered content"""

        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=True)
            page = await browser.new_page()

            # Wait for network idle and DOM stability
            await page.goto(url, wait_until='networkidle')
            await self._wait_for_dom_stability(page)

            # Capture state
            state = PageState(
                html=await page.content(),
                snapshot=await self._create_accessibility_snapshot(page),
                screenshot=await page.screenshot(full_page=True),
                url=page.url,
                title=await page.title(),
                metadata=await self._extract_metadata(page)
            )

            await browser.close()
            return state
```

**Accessibility Snapshot Format (OpenClaw-style):**

```
[1] navigation "Main Menu"
    [2] link "Home"
    [3] link "Products"
    [4] link "Contact"
[5] main "Product Page"
    [6] heading "Blink Mini 2 Camera"
    [7] image "Product photo"
    [8] text "$29.99"
    [9] button "Add to Cart"
    [10] region "Product Details"
        [11] text "1080p HD video"
        [12] text "Two-way audio"
        [13] text "Night vision"
```

#### 5.2.3 DOM Analyzer

**Purpose:** Analyze page structure and identify content regions

```python
class DOMAnalyzer:
    """Analyze DOM structure to identify content regions and patterns"""

    def analyze_structure(self, html: str, snapshot: str) -> DOMAnalysis:
        """Analyze page structure and identify extractable regions"""

        soup = BeautifulSoup(html, 'html.parser')

        return DOMAnalysis(
            page_type=self._classify_page_type(soup),
            content_regions=self._identify_content_regions(soup),
            data_patterns=self._detect_data_patterns(soup),
            element_index=self._build_element_index(snapshot),
            semantic_structure=self._extract_semantic_structure(soup)
        )

    def _classify_page_type(self, soup: BeautifulSoup) -> str:
        """Classify the type of page based on structural patterns"""

        patterns = {
            'product': self._has_product_patterns(soup),
            'listing': self._has_listing_patterns(soup),
            'article': self._has_article_patterns(soup),
            'form': self._has_form_patterns(soup),
            'table': self._has_table_patterns(soup),
            'directory': self._has_directory_patterns(soup)
        }

        return max(patterns, key=patterns.get)
```

#### 5.2.4 AI Extraction Engine

**Purpose:** Use Claude for semantic understanding and data extraction

See [Section 8: AI Prompts and Classification](#8-ai-prompts-and-classification) for detailed prompts.

#### 5.2.5 Pattern Cache

**Purpose:** Store and reuse successful extraction strategies

```python
class PatternCache:
    """Cache successful extraction patterns for reuse"""

    def __init__(self, redis_client):
        self.redis = redis_client
        self.ttl = 86400 * 7  # 7 days

    async def get_pattern(self, url: str) -> Optional[ExtractionPattern]:
        """Get cached extraction pattern for a domain/page type"""

        domain = urlparse(url).netloc
        page_type = await self._detect_page_type(url)

        cache_key = f"extraction:pattern:{domain}:{page_type}"
        pattern_data = await self.redis.get(cache_key)

        if pattern_data:
            return ExtractionPattern.from_json(pattern_data)
        return None

    async def save_pattern(
        self,
        url: str,
        pattern: ExtractionPattern,
        success_rate: float
    ):
        """Save successful extraction pattern"""

        if success_rate < 0.8:
            return  # Only cache high-success patterns

        domain = urlparse(url).netloc
        page_type = pattern.page_type

        cache_key = f"extraction:pattern:{domain}:{page_type}"
        await self.redis.setex(
            cache_key,
            self.ttl,
            pattern.to_json()
        )
```

---

## 6. Technical Specifications

### 6.1 Extraction Pipeline

```
                    Extraction Pipeline Flow

    +--------+     +--------+     +--------+     +--------+
    |  URL   | --> | Render | --> | Analyze| --> | Extract|
    | Input  |     | Page   |     | DOM    |     | Data   |
    +--------+     +--------+     +--------+     +--------+
        |              |              |              |
        |              |              |              |
        v              v              v              v
    +--------+     +--------+     +--------+     +--------+
    |Validate|     |Snapshot|     |Classify|     |  AI    |
    | & Norm |     | & HTML |     | & Map  |     | Claude |
    +--------+     +--------+     +--------+     +--------+
        |              |              |              |
        |              |              |              |
        v              v              v              v
    +--------+     +--------+     +--------+     +--------+
    | Check  |     | Cache  |     | Pattern|     | Schema |
    | Cache  |     | Assets |     | Match  |     | Map    |
    +--------+     +--------+     +--------+     +--------+
        |              |              |              |
        +-------+------+------+------+------+------+
                               |
                               v
                        +------------+
                        |  Validate  |
                        |  & Output  |
                        +------------+
```

### 6.2 BeautifulSoup + AI Hybrid Approach

**Phase 1: Structural Extraction (BeautifulSoup)**

```python
class StructuralExtractor:
    """Extract structural elements using BeautifulSoup patterns"""

    COMMON_PATTERNS = {
        'price': [
            r'\$[\d,]+\.?\d*',
            r'[\d,]+\.?\d*\s*(USD|EUR|GBP)',
            r'Price:\s*[\d,]+\.?\d*'
        ],
        'phone': [
            r'\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}',
            r'\+1[-.\s]?\d{3}[-.\s]?\d{3}[-.\s]?\d{4}'
        ],
        'email': [
            r'[\w.+-]+@[\w-]+\.[\w.-]+'
        ],
        'rating': [
            r'(\d\.?\d?)\s*(?:out of|/)\s*5',
            r'(\d\.?\d?)\s*stars?',
            r'Rating:\s*(\d\.?\d?)'
        ]
    }

    def extract_structural_data(self, soup: BeautifulSoup) -> Dict[str, List[str]]:
        """Extract data using structural patterns"""

        text_content = soup.get_text()
        results = {}

        for data_type, patterns in self.COMMON_PATTERNS.items():
            matches = []
            for pattern in patterns:
                found = re.findall(pattern, text_content, re.IGNORECASE)
                matches.extend(found)
            results[data_type] = list(set(matches))

        return results
```

**Phase 2: Semantic Extraction (Claude AI)**

```python
class SemanticExtractor:
    """Use Claude for semantic understanding of content"""

    async def extract_semantic_data(
        self,
        page_state: PageState,
        structural_data: Dict[str, List[str]],
        intent: ExtractionIntent
    ) -> SemanticExtractionResult:
        """Extract semantically meaningful data using Claude"""

        prompt = self._build_extraction_prompt(
            page_state,
            structural_data,
            intent
        )

        response = await self.claude_client.complete(
            model="claude-sonnet-4-5-20250929",
            messages=[{"role": "user", "content": prompt}],
            max_tokens=4096
        )

        return self._parse_extraction_response(response)
```

### 6.3 Playwright Snapshot Processing

**Accessibility Tree Capture:**

```python
async def capture_accessibility_snapshot(page: Page) -> str:
    """Capture accessibility tree with numeric element references"""

    # Get accessibility tree
    snapshot = await page.accessibility.snapshot(interesting_only=True)

    # Format with numeric indices (OpenClaw style)
    formatted = format_accessibility_tree(snapshot)

    return formatted

def format_accessibility_tree(node: dict, index_counter: list = None, depth: int = 0) -> str:
    """Format accessibility tree with numeric indices"""

    if index_counter is None:
        index_counter = [0]

    lines = []
    indent = "    " * depth

    # Assign numeric index
    index_counter[0] += 1
    current_index = index_counter[0]

    # Format node
    role = node.get('role', 'unknown')
    name = node.get('name', '')
    value = node.get('value', '')

    line = f"{indent}[{current_index}] {role}"
    if name:
        line += f' "{name[:50]}"'
    if value:
        line += f' value="{value[:30]}"'

    lines.append(line)

    # Process children
    for child in node.get('children', []):
        lines.append(format_accessibility_tree(child, index_counter, depth + 1))

    return '\n'.join(lines)
```

**Element Interaction via Numeric Reference:**

```python
async def interact_with_element(page: Page, element_index: int, action: str):
    """Interact with element by numeric index"""

    # Find element by accessibility index
    element = await find_element_by_index(page, element_index)

    if action == "click":
        await element.click()
    elif action == "fill":
        await element.fill(value)
    elif action == "hover":
        await element.hover()
```

### 6.4 Content Classification System

**Classification Categories:**

| Category | Subcategories | Key Indicators |
|----------|---------------|----------------|
| **E-Commerce** | Product page, Category listing, Cart | Price, Add to Cart, SKU |
| **Travel** | Campground, Hotel, Attraction | Availability, Booking, Amenities |
| **Business** | Directory, Contact, Hours | Phone, Address, Map |
| **Content** | Article, Blog, News | Publish date, Author, Body text |
| **Comparison** | Table, List, Review | Multiple items, Specs, Ratings |
| **Form** | Booking, Contact, Search | Input fields, Submit button |

**Classification Algorithm:**

```python
class ContentClassifier:
    """Classify page content type using structural and semantic signals"""

    CLASSIFICATION_SIGNALS = {
        'product': {
            'structural': [
                ('meta[property="og:type"]', lambda x: x == 'product'),
                ('script[type="application/ld+json"]', lambda x: '"@type":"Product"' in x),
                ('.price, .product-price, [data-price]', lambda x: bool(x)),
                ('button:contains("Add to Cart"), button:contains("Buy")', lambda x: bool(x))
            ],
            'semantic': [
                'price_pattern',
                'add_to_cart_button',
                'product_images',
                'specifications'
            ],
            'weight': 1.0
        },
        'campground': {
            'structural': [
                ('script[type="application/ld+json"]', lambda x: '"@type":"Campground"' in x),
                ('.amenities, .facilities, [data-amenities]', lambda x: bool(x)),
                ('.availability, .booking-calendar', lambda x: bool(x))
            ],
            'semantic': [
                'campsite_terms',
                'amenity_list',
                'booking_form',
                'map_location'
            ],
            'weight': 0.9
        }
        # ... more categories
    }

    async def classify(self, page_state: PageState) -> ClassificationResult:
        """Classify page content type"""

        scores = {}

        for category, signals in self.CLASSIFICATION_SIGNALS.items():
            structural_score = self._evaluate_structural_signals(
                page_state.html, signals['structural']
            )
            semantic_score = await self._evaluate_semantic_signals(
                page_state, signals['semantic']
            )

            scores[category] = (structural_score + semantic_score) * signals['weight']

        top_category = max(scores, key=scores.get)
        confidence = scores[top_category] / sum(scores.values())

        return ClassificationResult(
            category=top_category,
            confidence=confidence,
            all_scores=scores
        )
```

---

## 7. Data Schemas

### 7.1 Common Output Schemas

#### Product Schema

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "Product",
  "type": "object",
  "required": ["name", "price"],
  "properties": {
    "name": {
      "type": "string",
      "description": "Product name/title"
    },
    "price": {
      "type": "object",
      "properties": {
        "amount": { "type": "number" },
        "currency": { "type": "string", "default": "USD" },
        "formatted": { "type": "string" },
        "sale_price": { "type": "number" },
        "original_price": { "type": "number" }
      },
      "required": ["amount", "currency"]
    },
    "availability": {
      "type": "object",
      "properties": {
        "in_stock": { "type": "boolean" },
        "quantity": { "type": "integer" },
        "shipping_estimate": { "type": "string" }
      }
    },
    "description": { "type": "string" },
    "features": {
      "type": "array",
      "items": { "type": "string" }
    },
    "specifications": {
      "type": "object",
      "additionalProperties": { "type": "string" }
    },
    "images": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "url": { "type": "string", "format": "uri" },
          "alt": { "type": "string" },
          "type": { "enum": ["primary", "gallery", "thumbnail"] }
        }
      }
    },
    "rating": {
      "type": "object",
      "properties": {
        "score": { "type": "number", "minimum": 0, "maximum": 5 },
        "count": { "type": "integer" },
        "source": { "type": "string" }
      }
    },
    "brand": { "type": "string" },
    "sku": { "type": "string" },
    "category": { "type": "string" },
    "url": { "type": "string", "format": "uri" },
    "extracted_at": { "type": "string", "format": "date-time" }
  }
}
```

#### Campground Schema

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "Campground",
  "type": "object",
  "required": ["name"],
  "properties": {
    "name": { "type": "string" },
    "location": {
      "type": "object",
      "properties": {
        "address": { "type": "string" },
        "city": { "type": "string" },
        "state": { "type": "string" },
        "zip": { "type": "string" },
        "coordinates": {
          "type": "object",
          "properties": {
            "lat": { "type": "number" },
            "lng": { "type": "number" }
          }
        }
      }
    },
    "pricing": {
      "type": "object",
      "properties": {
        "nightly_rate": { "type": "number" },
        "weekly_rate": { "type": "number" },
        "monthly_rate": { "type": "number" },
        "currency": { "type": "string", "default": "USD" },
        "fees": {
          "type": "array",
          "items": {
            "type": "object",
            "properties": {
              "name": { "type": "string" },
              "amount": { "type": "number" }
            }
          }
        }
      }
    },
    "availability": {
      "type": "object",
      "properties": {
        "is_available": { "type": "boolean" },
        "available_sites": { "type": "array", "items": { "type": "string" } },
        "next_available_date": { "type": "string", "format": "date" },
        "booking_url": { "type": "string", "format": "uri" }
      }
    },
    "amenities": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "name": { "type": "string" },
          "available": { "type": "boolean" },
          "details": { "type": "string" }
        }
      }
    },
    "site_types": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "type": { "enum": ["tent", "rv", "cabin", "yurt", "glamping"] },
          "count": { "type": "integer" },
          "max_length": { "type": "integer" },
          "hookups": { "type": "array", "items": { "type": "string" } }
        }
      }
    },
    "contact": {
      "type": "object",
      "properties": {
        "phone": { "type": "string" },
        "email": { "type": "string", "format": "email" },
        "website": { "type": "string", "format": "uri" }
      }
    },
    "rating": {
      "type": "object",
      "properties": {
        "score": { "type": "number" },
        "count": { "type": "integer" },
        "source": { "type": "string" }
      }
    },
    "policies": {
      "type": "object",
      "properties": {
        "check_in": { "type": "string" },
        "check_out": { "type": "string" },
        "pets_allowed": { "type": "boolean" },
        "quiet_hours": { "type": "string" },
        "cancellation": { "type": "string" }
      }
    }
  }
}
```

#### Business Directory Schema

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "Business",
  "type": "object",
  "required": ["name"],
  "properties": {
    "name": { "type": "string" },
    "type": { "type": "string" },
    "address": {
      "type": "object",
      "properties": {
        "street": { "type": "string" },
        "city": { "type": "string" },
        "state": { "type": "string" },
        "zip": { "type": "string" },
        "country": { "type": "string" },
        "formatted": { "type": "string" }
      }
    },
    "contact": {
      "type": "object",
      "properties": {
        "phone": { "type": "string" },
        "email": { "type": "string" },
        "website": { "type": "string" },
        "social": {
          "type": "object",
          "additionalProperties": { "type": "string" }
        }
      }
    },
    "hours": {
      "type": "object",
      "properties": {
        "monday": { "type": "string" },
        "tuesday": { "type": "string" },
        "wednesday": { "type": "string" },
        "thursday": { "type": "string" },
        "friday": { "type": "string" },
        "saturday": { "type": "string" },
        "sunday": { "type": "string" },
        "holiday_hours": { "type": "string" },
        "timezone": { "type": "string" }
      }
    },
    "services": {
      "type": "array",
      "items": { "type": "string" }
    },
    "rating": {
      "type": "object",
      "properties": {
        "score": { "type": "number" },
        "count": { "type": "integer" },
        "source": { "type": "string" }
      }
    },
    "price_range": {
      "type": "string",
      "pattern": "^\\${1,4}$"
    }
  }
}
```

#### Comparison Table Schema

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "ComparisonTable",
  "type": "object",
  "properties": {
    "title": { "type": "string" },
    "categories": {
      "type": "array",
      "items": { "type": "string" }
    },
    "items": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "name": { "type": "string" },
          "attributes": {
            "type": "object",
            "additionalProperties": {
              "oneOf": [
                { "type": "string" },
                { "type": "number" },
                { "type": "boolean" }
              ]
            }
          },
          "link": { "type": "string", "format": "uri" },
          "image": { "type": "string", "format": "uri" }
        },
        "required": ["name", "attributes"]
      }
    },
    "source": { "type": "string" },
    "extracted_at": { "type": "string", "format": "date-time" }
  }
}
```

### 7.2 Universal Extraction Result

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "ExtractionResult",
  "type": "object",
  "required": ["success", "url", "extracted_at"],
  "properties": {
    "success": { "type": "boolean" },
    "url": { "type": "string", "format": "uri" },
    "extracted_at": { "type": "string", "format": "date-time" },
    "page_type": {
      "type": "string",
      "enum": ["product", "campground", "business", "article", "comparison", "listing", "form", "unknown"]
    },
    "confidence": {
      "type": "number",
      "minimum": 0,
      "maximum": 1
    },
    "data": {
      "oneOf": [
        { "$ref": "#/definitions/Product" },
        { "$ref": "#/definitions/Campground" },
        { "$ref": "#/definitions/Business" },
        { "$ref": "#/definitions/ComparisonTable" },
        { "type": "object" }
      ]
    },
    "raw_content": {
      "type": "object",
      "properties": {
        "title": { "type": "string" },
        "description": { "type": "string" },
        "text_content": { "type": "string" },
        "structured_data": { "type": "object" }
      }
    },
    "extraction_metadata": {
      "type": "object",
      "properties": {
        "method": { "enum": ["structural", "semantic", "hybrid"] },
        "pattern_used": { "type": "string" },
        "processing_time_ms": { "type": "integer" },
        "cache_hit": { "type": "boolean" }
      }
    },
    "errors": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "code": { "type": "string" },
          "message": { "type": "string" },
          "recoverable": { "type": "boolean" }
        }
      }
    }
  }
}
```

---

## 8. AI Prompts and Classification

### 8.1 Content Classification Prompt

```markdown
# Page Content Classification

You are analyzing a web page to determine its content type and structure.

## Page Information

**URL:** {url}
**Title:** {title}
**Meta Description:** {meta_description}

## Accessibility Tree (with element indices)

```
{accessibility_snapshot}
```

## Visible Text Sample

```
{text_sample}
```

## Structured Data Found

```json
{structured_data}
```

## Classification Task

Analyze this page and determine:

1. **Primary Content Type** - Choose one:
   - `product` - Single product for sale
   - `product_listing` - Multiple products displayed
   - `campground` - Campsite or RV park information
   - `hotel` - Hotel or accommodation
   - `business` - Business directory entry
   - `article` - News, blog, or informational content
   - `comparison` - Product/service comparison
   - `form` - Input form (booking, contact, etc.)
   - `search_results` - Search results page
   - `unknown` - Cannot determine

2. **Confidence Score** - 0.0 to 1.0

3. **Key Elements** - List element indices that contain important data

4. **Data Fields Available** - What information can be extracted

## Response Format

Respond with JSON only:

```json
{
  "content_type": "product",
  "confidence": 0.92,
  "reasoning": "Page has price, add-to-cart button, product images, and specifications",
  "key_elements": [6, 8, 9, 10, 11, 12, 13],
  "available_fields": ["name", "price", "description", "features", "images", "rating"],
  "extraction_strategy": "Use element 6 for name, element 8 for price, elements 11-13 for features"
}
```
```

### 8.2 Product Extraction Prompt

```markdown
# Product Data Extraction

Extract product information from this e-commerce page.

## Page Accessibility Tree

```
{accessibility_snapshot}
```

## HTML Content Sample

```html
{html_sample}
```

## Pre-Extracted Patterns

```json
{structural_patterns}
```

## Extraction Instructions

Extract the following fields. Use the element indices for reference.

For each field:
- Provide the extracted value
- Note the source element index
- Rate confidence (0.0-1.0)

## Required Fields

1. **Product Name** - Main product title
2. **Price** - Current price (handle sales/discounts)
3. **Availability** - In stock status

## Optional Fields

4. **Description** - Product description
5. **Features** - Bullet points or feature list
6. **Specifications** - Technical specs
7. **Images** - Product image URLs
8. **Rating** - Star rating and review count
9. **Brand** - Manufacturer/brand name
10. **SKU/Model** - Product identifier

## Response Format

```json
{
  "name": {
    "value": "Blink Mini 2 Indoor Security Camera",
    "element_index": 6,
    "confidence": 0.95
  },
  "price": {
    "amount": 29.99,
    "currency": "USD",
    "sale_price": 29.99,
    "original_price": 34.99,
    "element_index": 8,
    "confidence": 0.98
  },
  "availability": {
    "in_stock": true,
    "message": "In Stock",
    "element_index": 15,
    "confidence": 0.90
  },
  "features": [
    { "text": "1080p HD video", "element_index": 11 },
    { "text": "Two-way audio", "element_index": 12 },
    { "text": "Night vision", "element_index": 13 }
  ],
  "overall_confidence": 0.92,
  "extraction_notes": "Price was found in sale format with strikethrough original"
}
```
```

### 8.3 Campground Extraction Prompt

```markdown
# Campground Data Extraction

Extract campground/RV park information from this page.

## Page Accessibility Tree

```
{accessibility_snapshot}
```

## Extracted Patterns

```json
{structural_patterns}
```

## User Context

- User Location: {user_location}
- Travel Dates: {travel_dates}
- RV Length: {rv_length}

## Extraction Instructions

Extract campground details with special attention to:
- Pricing tiers (daily, weekly, monthly)
- RV site specifications (length limits, hookups)
- Amenities relevant to RV travelers
- Booking availability

## Required Fields

1. **Name** - Campground name
2. **Location** - Address and coordinates
3. **Pricing** - Rate structure
4. **Site Types** - Available site categories

## Optional Fields

5. **Amenities** - Facilities and services
6. **Availability** - Current booking status
7. **Contact** - Phone, email, website
8. **Policies** - Check-in/out, pets, quiet hours
9. **Rating** - Reviews and ratings
10. **Photos** - Campground images

## Response Format

```json
{
  "name": {
    "value": "Madison Campground - Yellowstone",
    "confidence": 0.95
  },
  "location": {
    "address": "Madison Junction, Yellowstone National Park, WY",
    "coordinates": { "lat": 44.6463, "lng": -110.8556 },
    "confidence": 0.88
  },
  "pricing": {
    "nightly_rate": 28.00,
    "currency": "USD",
    "notes": "No hookups, includes park entry",
    "confidence": 0.92
  },
  "site_types": [
    {
      "type": "rv",
      "count": 278,
      "max_length_ft": 40,
      "hookups": ["none"],
      "surface": "gravel"
    }
  ],
  "amenities": [
    { "name": "Flush toilets", "available": true },
    { "name": "Potable water", "available": true },
    { "name": "Dump station", "available": true },
    { "name": "Showers", "available": false }
  ],
  "availability": {
    "available_dates": ["2026-06-15", "2026-06-16", "2026-06-17"],
    "booking_url": "https://www.recreation.gov/camping/...",
    "confidence": 0.85
  }
}
```
```

### 8.4 Comparison Table Extraction Prompt

```markdown
# Comparison Data Extraction

Extract comparison data from this page containing multiple items.

## Page Accessibility Tree

```
{accessibility_snapshot}
```

## User Intent

{user_intent}

## Extraction Instructions

Identify and extract comparison data:
1. Find the comparison structure (table, list, cards)
2. Identify the items being compared
3. Extract attributes for each item
4. Normalize values for comparison

## Response Format

```json
{
  "comparison_type": "product_specs",
  "title": "Generator Comparison",
  "items": [
    {
      "name": "Honda EU2200i",
      "attributes": {
        "watts": 2200,
        "runtime_hours": 8.1,
        "noise_db": 48,
        "price_usd": 1149,
        "weight_lbs": 47,
        "parallel_capable": true
      },
      "source_element": 15
    },
    {
      "name": "Champion 3400",
      "attributes": {
        "watts": 3400,
        "runtime_hours": 7.5,
        "noise_db": 59,
        "price_usd": 649,
        "weight_lbs": 96,
        "parallel_capable": true
      },
      "source_element": 28
    }
  ],
  "comparison_categories": ["power", "runtime", "noise", "price", "portability"],
  "recommendations": {
    "best_value": "Champion 3400",
    "quietest": "Honda EU2200i",
    "most_powerful": "Westinghouse 4500"
  },
  "confidence": 0.89
}
```
```

### 8.5 Error Recovery Prompt

```markdown
# Extraction Recovery

The initial extraction attempt failed or returned incomplete data.

## Original Request

**URL:** {url}
**Expected Type:** {expected_type}
**User Intent:** {user_intent}

## Failed Extraction Attempt

```json
{failed_result}
```

## Error Information

**Error Type:** {error_type}
**Error Message:** {error_message}

## Available Fallback Data

**Page Title:** {page_title}
**Meta Description:** {meta_description}
**Text Content Sample:** {text_sample}

## Recovery Task

Attempt to extract useful information using alternative strategies:

1. Look for structured data (JSON-LD, microdata)
2. Search for common patterns in text
3. Extract any partial information available
4. Provide natural language summary if structured extraction fails

## Response Format

```json
{
  "recovery_successful": true,
  "recovery_method": "text_pattern_extraction",
  "partial_data": {
    "name": "Extracted product name",
    "possible_price": "$XX.XX found in text",
    "description_fragment": "..."
  },
  "natural_language_summary": "This appears to be a product page for [X]. The price seems to be around $XX based on the text content. Full structured extraction was not possible because [reason].",
  "suggestions_for_user": [
    "Try sharing a direct product link",
    "The page may require login to view details",
    "Consider searching for this product on another site"
  ],
  "confidence": 0.45
}
```
```

---

## 9. Caching Strategy

### 9.1 Cache Architecture

```
                        Caching Layers

    +------------------+
    | Request Cache    |  TTL: 5 min
    | (Same URL/intent)|  Key: hash(url + intent)
    +------------------+
            |
            v
    +------------------+
    | Pattern Cache    |  TTL: 7 days
    | (Domain patterns)|  Key: domain + page_type
    +------------------+
            |
            v
    +------------------+
    | Schema Cache     |  TTL: 24 hours
    | (Site schemas)   |  Key: domain + detected_schema
    +------------------+
            |
            v
    +------------------+
    | Asset Cache      |  TTL: 1 hour
    | (Screenshots)    |  Key: hash(url)
    +------------------+
```

### 9.2 Cache Implementation

```python
class ExtractionCache:
    """Multi-layer caching for extraction operations"""

    def __init__(self, redis_client):
        self.redis = redis_client

        self.cache_config = {
            'request': {
                'prefix': 'extraction:request:',
                'ttl': 300,  # 5 minutes
            },
            'pattern': {
                'prefix': 'extraction:pattern:',
                'ttl': 604800,  # 7 days
            },
            'schema': {
                'prefix': 'extraction:schema:',
                'ttl': 86400,  # 24 hours
            },
            'asset': {
                'prefix': 'extraction:asset:',
                'ttl': 3600,  # 1 hour
            }
        }

    async def get_cached_extraction(
        self,
        url: str,
        intent: Optional[str] = None
    ) -> Optional[ExtractionResult]:
        """Check for cached extraction result"""

        cache_key = self._build_request_key(url, intent)
        cached = await self.redis.get(cache_key)

        if cached:
            return ExtractionResult.from_json(cached)
        return None

    async def get_pattern(self, url: str) -> Optional[ExtractionPattern]:
        """Get cached extraction pattern for domain"""

        domain = urlparse(url).netloc
        cache_key = f"{self.cache_config['pattern']['prefix']}{domain}"
        cached = await self.redis.get(cache_key)

        if cached:
            return ExtractionPattern.from_json(cached)
        return None

    async def cache_extraction(
        self,
        url: str,
        intent: Optional[str],
        result: ExtractionResult,
        pattern: Optional[ExtractionPattern] = None
    ):
        """Cache extraction result and pattern"""

        # Cache the result
        request_key = self._build_request_key(url, intent)
        await self.redis.setex(
            request_key,
            self.cache_config['request']['ttl'],
            result.to_json()
        )

        # Cache the pattern if successful and confident
        if pattern and result.confidence > 0.8:
            domain = urlparse(url).netloc
            pattern_key = f"{self.cache_config['pattern']['prefix']}{domain}:{result.page_type}"
            await self.redis.setex(
                pattern_key,
                self.cache_config['pattern']['ttl'],
                pattern.to_json()
            )

    def _build_request_key(self, url: str, intent: Optional[str]) -> str:
        """Build cache key for request"""

        key_source = f"{url}:{intent or 'default'}"
        key_hash = hashlib.md5(key_source.encode()).hexdigest()
        return f"{self.cache_config['request']['prefix']}{key_hash}"
```

### 9.3 Pattern Storage

```python
@dataclass
class ExtractionPattern:
    """Cached pattern for successful extractions"""

    domain: str
    page_type: str
    selectors: Dict[str, str]  # field -> selector
    ai_hints: Dict[str, str]   # field -> extraction hint
    element_indices: Dict[str, List[int]]  # field -> element indices
    success_count: int
    last_success: datetime
    confidence: float

    def to_json(self) -> str:
        return json.dumps({
            'domain': self.domain,
            'page_type': self.page_type,
            'selectors': self.selectors,
            'ai_hints': self.ai_hints,
            'element_indices': self.element_indices,
            'success_count': self.success_count,
            'last_success': self.last_success.isoformat(),
            'confidence': self.confidence
        })

    @classmethod
    def from_json(cls, json_str: str) -> 'ExtractionPattern':
        data = json.loads(json_str)
        data['last_success'] = datetime.fromisoformat(data['last_success'])
        return cls(**data)
```

### 9.4 Cache Invalidation

```python
class CacheInvalidator:
    """Handle cache invalidation for extraction patterns"""

    async def invalidate_on_failure(
        self,
        url: str,
        pattern: ExtractionPattern,
        failure_type: str
    ):
        """Invalidate cached pattern on extraction failure"""

        # Track failure
        failure_key = f"extraction:failures:{pattern.domain}"
        await self.redis.hincrby(failure_key, pattern.page_type, 1)

        # Check failure threshold
        failures = await self.redis.hget(failure_key, pattern.page_type)
        if int(failures or 0) >= 3:
            # Invalidate pattern
            pattern_key = f"extraction:pattern:{pattern.domain}:{pattern.page_type}"
            await self.redis.delete(pattern_key)

            # Reset failure counter
            await self.redis.hdel(failure_key, pattern.page_type)

    async def invalidate_domain(self, domain: str):
        """Invalidate all cached patterns for a domain"""

        pattern = f"extraction:pattern:{domain}:*"
        keys = await self.redis.keys(pattern)

        if keys:
            await self.redis.delete(*keys)
```

---

## 10. Error Handling and Recovery

### 10.1 Error Categories

| Category | Examples | Recovery Strategy |
|----------|----------|-------------------|
| **Network** | Timeout, DNS, Connection refused | Retry with backoff |
| **Rendering** | JS error, Infinite scroll, Heavy page | Partial content extraction |
| **Structure** | No matching elements, Layout change | AI fallback extraction |
| **Content** | Login required, Captcha, Geo-blocked | Inform user, suggest alternatives |
| **Rate Limit** | 429 response, IP blocked | Queue and retry later |

### 10.2 Error Recovery Pipeline

```
            Error Recovery Flow

    +----------------+
    | Extraction     |
    | Attempt        |
    +-------+--------+
            |
            | Error
            v
    +----------------+
    | Classify Error |
    | Type           |
    +-------+--------+
            |
    +-------+-------+-------+-------+
    |       |       |       |       |
    v       v       v       v       v
 Network Structure Content Rate   Other
    |       |       |     Limit     |
    v       v       v       |       v
 Retry   AI      Inform    v     Log &
 with   Fallback  User   Queue   Report
 backoff          |       |
    |       |     |       |
    +-------+-----+-------+
            |
            v
    +----------------+
    | Partial Result |
    | or Error Msg   |
    +----------------+
```

### 10.3 Recovery Implementation

```python
class ExtractionErrorHandler:
    """Handle errors during extraction with recovery strategies"""

    def __init__(self, extraction_service):
        self.service = extraction_service
        self.max_retries = 3
        self.backoff_base = 1.0

    async def handle_error(
        self,
        error: Exception,
        context: ExtractionContext
    ) -> ExtractionResult:
        """Handle extraction error with appropriate recovery"""

        error_type = self._classify_error(error)

        if error_type == 'network':
            return await self._handle_network_error(error, context)
        elif error_type == 'structure':
            return await self._handle_structure_error(error, context)
        elif error_type == 'content':
            return await self._handle_content_error(error, context)
        elif error_type == 'rate_limit':
            return await self._handle_rate_limit(error, context)
        else:
            return await self._handle_unknown_error(error, context)

    async def _handle_structure_error(
        self,
        error: Exception,
        context: ExtractionContext
    ) -> ExtractionResult:
        """Handle structure-related errors with AI fallback"""

        # Try AI-only extraction
        try:
            result = await self.service.extract_with_ai_only(
                context.page_state,
                context.intent
            )
            result.extraction_metadata['recovery_method'] = 'ai_fallback'
            return result
        except Exception as ai_error:
            # Return partial result
            return ExtractionResult(
                success=False,
                url=context.url,
                extracted_at=datetime.utcnow(),
                errors=[{
                    'code': 'STRUCTURE_ERROR',
                    'message': str(error),
                    'recoverable': False
                }],
                raw_content={
                    'title': context.page_state.title,
                    'text_content': context.page_state.text_content[:1000]
                }
            )

    async def _handle_content_error(
        self,
        error: Exception,
        context: ExtractionContext
    ) -> ExtractionResult:
        """Handle content access errors"""

        error_info = self._analyze_content_error(error, context)

        suggestions = []
        if error_info.get('login_required'):
            suggestions.append("This page requires login to view content")
        if error_info.get('captcha_detected'):
            suggestions.append("The site is showing a captcha challenge")
        if error_info.get('geo_blocked'):
            suggestions.append("This content may be restricted in your region")

        return ExtractionResult(
            success=False,
            url=context.url,
            extracted_at=datetime.utcnow(),
            errors=[{
                'code': 'CONTENT_ACCESS_ERROR',
                'message': str(error),
                'suggestions': suggestions,
                'recoverable': False
            }]
        )

    def _classify_error(self, error: Exception) -> str:
        """Classify error type for recovery strategy"""

        error_str = str(error).lower()

        if any(x in error_str for x in ['timeout', 'connection', 'dns', 'network']):
            return 'network'
        elif any(x in error_str for x in ['selector', 'element', 'not found']):
            return 'structure'
        elif any(x in error_str for x in ['403', '401', 'login', 'captcha']):
            return 'content'
        elif '429' in error_str or 'rate limit' in error_str:
            return 'rate_limit'
        else:
            return 'unknown'
```

### 10.4 Graceful Degradation Levels

```python
class DegradationLevels:
    """Define graceful degradation levels for extraction"""

    LEVELS = {
        'full': {
            'description': 'Complete structured extraction',
            'confidence_threshold': 0.85,
            'includes': ['structured_data', 'images', 'metadata']
        },
        'partial': {
            'description': 'Primary fields only',
            'confidence_threshold': 0.60,
            'includes': ['name', 'price', 'description']
        },
        'minimal': {
            'description': 'Basic information only',
            'confidence_threshold': 0.40,
            'includes': ['title', 'text_summary']
        },
        'raw': {
            'description': 'Raw content only',
            'confidence_threshold': 0.0,
            'includes': ['raw_text', 'page_title']
        }
    }

    @classmethod
    def get_level_for_confidence(cls, confidence: float) -> str:
        """Get appropriate degradation level for confidence score"""

        for level_name, config in cls.LEVELS.items():
            if confidence >= config['confidence_threshold']:
                return level_name
        return 'raw'
```

---

## 11. Performance Requirements

### 11.1 Performance Targets

| Operation | Target (P95) | Maximum |
|-----------|--------------|---------|
| Page Render | 3 seconds | 10 seconds |
| DOM Analysis | 500ms | 2 seconds |
| AI Classification | 1 second | 3 seconds |
| AI Extraction | 2 seconds | 5 seconds |
| **Total E2E** | **5 seconds** | **15 seconds** |

### 11.2 Optimization Strategies

```python
class PerformanceOptimizer:
    """Optimize extraction performance"""

    async def optimize_extraction(
        self,
        url: str,
        intent: Optional[str]
    ) -> ExtractionResult:
        """Optimized extraction with parallel operations"""

        # Check cache first (fast path)
        cached = await self.cache.get_cached_extraction(url, intent)
        if cached:
            return cached

        # Start browser render and pattern lookup in parallel
        render_task = asyncio.create_task(
            self.browser.capture_page_state(url)
        )
        pattern_task = asyncio.create_task(
            self.cache.get_pattern(url)
        )

        # Wait for both
        page_state, cached_pattern = await asyncio.gather(
            render_task, pattern_task
        )

        # If we have a cached pattern, try fast extraction
        if cached_pattern:
            try:
                result = await self._fast_extraction(
                    page_state, cached_pattern
                )
                if result.confidence > 0.8:
                    return result
            except Exception:
                pass  # Fall through to full extraction

        # Full extraction pipeline
        return await self._full_extraction(page_state, intent)

    async def _fast_extraction(
        self,
        page_state: PageState,
        pattern: ExtractionPattern
    ) -> ExtractionResult:
        """Fast extraction using cached pattern"""

        # Use cached selectors directly
        extracted_data = {}

        for field, selector in pattern.selectors.items():
            value = await self._extract_by_selector(
                page_state.html, selector
            )
            if value:
                extracted_data[field] = value

        return ExtractionResult(
            success=True,
            url=page_state.url,
            page_type=pattern.page_type,
            data=extracted_data,
            confidence=0.85,
            extraction_metadata={
                'method': 'cached_pattern',
                'pattern_age_days': (
                    datetime.utcnow() - pattern.last_success
                ).days
            }
        )
```

### 11.3 Resource Limits

```python
RESOURCE_LIMITS = {
    'max_page_size_mb': 10,
    'max_render_time_ms': 10000,
    'max_screenshot_size_mb': 5,
    'max_text_content_chars': 100000,
    'max_elements_to_analyze': 500,
    'max_ai_tokens_per_extraction': 8000,
    'max_concurrent_extractions': 10,
    'browser_pool_size': 5
}
```

### 11.4 Performance Monitoring

```python
class ExtractionMetrics:
    """Track extraction performance metrics"""

    def __init__(self):
        self.metrics = {
            'extraction_count': Counter(),
            'extraction_duration': Histogram(
                buckets=[0.5, 1, 2, 5, 10, 30]
            ),
            'success_rate': Gauge(),
            'cache_hit_rate': Gauge(),
            'ai_tokens_used': Counter(),
            'errors_by_type': Counter()
        }

    async def record_extraction(
        self,
        result: ExtractionResult,
        duration_ms: int,
        cache_hit: bool
    ):
        """Record extraction metrics"""

        self.metrics['extraction_count'].inc()
        self.metrics['extraction_duration'].observe(duration_ms / 1000)

        if cache_hit:
            self.metrics['cache_hit_rate'].inc()

        if not result.success:
            for error in result.errors:
                self.metrics['errors_by_type'].labels(
                    error_code=error['code']
                ).inc()
```

---

## 12. Testing Approach

### 12.1 Test Categories

| Category | Coverage | Automation |
|----------|----------|------------|
| Unit Tests | Core extraction logic | 100% automated |
| Integration Tests | Full pipeline | 100% automated |
| E2E Tests | Real websites | 80% automated |
| Accuracy Tests | Extraction quality | Weekly manual review |
| Performance Tests | Load and latency | Nightly automated |
| Regression Tests | Known patterns | On every deploy |

### 12.2 Test Site Categories

```python
TEST_SITES = {
    'e_commerce': [
        'https://www.amazon.com/dp/B0BCR7TJ4T',  # Amazon product
        'https://www.walmart.com/ip/...',         # Walmart product
        'https://www.bestbuy.com/site/...',       # Best Buy product
        'https://www.ebay.com/itm/...',           # eBay listing
        'https://www.target.com/p/...',           # Target product
    ],
    'travel': [
        'https://www.recreation.gov/camping/...',  # Recreation.gov
        'https://www.reserveamerica.com/...',      # ReserveAmerica
        'https://www.hipcamp.com/...',             # Hipcamp
        'https://www.rvshare.com/...',             # RV Share
        'https://www.koa.com/...',                 # KOA
    ],
    'business': [
        'https://www.yelp.com/biz/...',            # Yelp
        'https://www.google.com/maps/place/...',   # Google Maps
        'https://www.tripadvisor.com/...',         # TripAdvisor
        'https://www.yellowpages.com/...',         # Yellow Pages
    ],
    'comparison': [
        'https://www.bestreviews.guide/...',       # Best Reviews
        'https://www.consumerreports.org/...',     # Consumer Reports
        'https://www.cnet.com/...',                # CNET
    ],
    'articles': [
        'https://www.doityourselfrv.com/...',      # RV Blog
        'https://www.rvlife.com/...',              # RV Life
        'https://www.thewaywardhome.com/...',      # Travel Blog
    ]
}
```

### 12.3 Accuracy Measurement

```python
class AccuracyValidator:
    """Validate extraction accuracy against ground truth"""

    def __init__(self):
        self.field_weights = {
            'name': 1.0,
            'price': 1.0,
            'availability': 0.8,
            'description': 0.6,
            'features': 0.5,
            'rating': 0.4,
            'images': 0.3
        }

    def calculate_accuracy(
        self,
        extracted: Dict[str, Any],
        ground_truth: Dict[str, Any]
    ) -> float:
        """Calculate weighted accuracy score"""

        total_weight = 0
        correct_weight = 0

        for field, weight in self.field_weights.items():
            if field in ground_truth:
                total_weight += weight

                if field in extracted:
                    if self._fields_match(
                        extracted[field],
                        ground_truth[field],
                        field
                    ):
                        correct_weight += weight

        return correct_weight / total_weight if total_weight > 0 else 0

    def _fields_match(
        self,
        extracted: Any,
        ground_truth: Any,
        field_type: str
    ) -> bool:
        """Check if extracted value matches ground truth"""

        if field_type == 'price':
            # Allow 1% tolerance for price
            if isinstance(extracted, dict):
                extracted = extracted.get('amount', 0)
            if isinstance(ground_truth, dict):
                ground_truth = ground_truth.get('amount', 0)
            return abs(extracted - ground_truth) / ground_truth < 0.01

        elif field_type in ['name', 'description']:
            # Fuzzy string match
            return fuzz.ratio(str(extracted), str(ground_truth)) > 85

        elif field_type == 'features':
            # Check for list overlap
            if isinstance(extracted, list) and isinstance(ground_truth, list):
                overlap = len(set(extracted) & set(ground_truth))
                return overlap / len(ground_truth) > 0.7

        return extracted == ground_truth
```

### 12.4 Test Automation

```python
@pytest.mark.asyncio
class TestExtractionPipeline:
    """Automated tests for extraction pipeline"""

    @pytest.fixture
    async def extraction_service(self):
        service = SiteAgnosticExtractor()
        yield service
        await service.close()

    @pytest.mark.parametrize("url,expected_type,expected_fields", [
        (
            "https://www.amazon.com/dp/B0BCR7TJ4T",
            "product",
            ["name", "price", "availability"]
        ),
        (
            "https://www.recreation.gov/camping/campgrounds/232445",
            "campground",
            ["name", "location", "amenities"]
        ),
    ])
    async def test_extraction_types(
        self,
        extraction_service,
        url,
        expected_type,
        expected_fields
    ):
        """Test extraction for different content types"""

        result = await extraction_service.extract(url)

        assert result.success
        assert result.page_type == expected_type

        for field in expected_fields:
            assert field in result.data

    async def test_extraction_performance(self, extraction_service):
        """Test extraction completes within time limit"""

        start = time.time()
        result = await extraction_service.extract(
            "https://www.amazon.com/dp/B0BCR7TJ4T"
        )
        duration = time.time() - start

        assert duration < 5.0  # P95 target
        assert result.success

    async def test_error_recovery(self, extraction_service):
        """Test graceful error handling"""

        result = await extraction_service.extract(
            "https://httpstat.us/404"
        )

        assert not result.success
        assert len(result.errors) > 0
        assert result.errors[0]['code'] is not None
```

---

## 13. Security Considerations

### 13.1 Security Requirements

| Requirement | Implementation |
|-------------|----------------|
| **URL Validation** | Strict URL parsing, blocklist check |
| **Content Sanitization** | Sanitize extracted HTML, strip scripts |
| **Rate Limiting** | Per-user and per-domain limits |
| **Data Privacy** | No PII storage, encryption in transit |
| **SSRF Prevention** | Block internal IPs, localhost, metadata endpoints |

### 13.2 Security Implementation

```python
class SecurityValidator:
    """Validate and sanitize extraction requests"""

    BLOCKED_DOMAINS = {
        'localhost',
        '127.0.0.1',
        '0.0.0.0',
        '169.254.169.254',  # AWS metadata
        'metadata.google.internal',  # GCP metadata
    }

    BLOCKED_SCHEMES = {'file', 'ftp', 'data', 'javascript'}

    def validate_url(self, url: str) -> Tuple[bool, Optional[str]]:
        """Validate URL for security issues"""

        try:
            parsed = urlparse(url)

            # Check scheme
            if parsed.scheme not in {'http', 'https'}:
                return False, f"Invalid scheme: {parsed.scheme}"

            # Check for blocked domains
            hostname = parsed.hostname.lower()
            if hostname in self.BLOCKED_DOMAINS:
                return False, f"Blocked domain: {hostname}"

            # Check for IP addresses (potential SSRF)
            try:
                ip = ipaddress.ip_address(hostname)
                if ip.is_private or ip.is_loopback:
                    return False, "Private IP addresses not allowed"
            except ValueError:
                pass  # Not an IP address, continue

            return True, None

        except Exception as e:
            return False, f"URL parsing error: {str(e)}"

    def sanitize_content(self, content: str) -> str:
        """Sanitize extracted content"""

        # Remove script tags
        content = re.sub(r'<script[^>]*>.*?</script>', '', content, flags=re.DOTALL)

        # Remove event handlers
        content = re.sub(r'\s*on\w+\s*=\s*["\'][^"\']*["\']', '', content)

        # Remove javascript: URLs
        content = re.sub(r'javascript:', '', content, flags=re.IGNORECASE)

        return content
```

### 13.3 Rate Limiting

```python
class ExtractionRateLimiter:
    """Rate limiting for extraction requests"""

    def __init__(self, redis_client):
        self.redis = redis_client

        self.limits = {
            'per_user_per_minute': 10,
            'per_user_per_hour': 100,
            'per_domain_per_minute': 5,
            'global_per_minute': 1000
        }

    async def check_rate_limit(
        self,
        user_id: str,
        domain: str
    ) -> Tuple[bool, Optional[str]]:
        """Check if request is within rate limits"""

        now = datetime.utcnow()

        # Check user rate
        user_key = f"rate:user:{user_id}:{now.minute}"
        user_count = await self.redis.incr(user_key)
        await self.redis.expire(user_key, 60)

        if user_count > self.limits['per_user_per_minute']:
            return False, "User rate limit exceeded (per minute)"

        # Check domain rate
        domain_key = f"rate:domain:{domain}:{now.minute}"
        domain_count = await self.redis.incr(domain_key)
        await self.redis.expire(domain_key, 60)

        if domain_count > self.limits['per_domain_per_minute']:
            return False, f"Domain rate limit exceeded for {domain}"

        return True, None
```

---

## 14. Implementation Phases

### 14.1 Phase Overview

```
    Phase 1       Phase 2       Phase 3       Phase 4
    Foundation    Core AI       Advanced      Optimization
    (2 weeks)     (3 weeks)     (2 weeks)     (1 week)

    +--------+    +--------+    +--------+    +--------+
    | Browser|    |   AI   |    | Pattern|    | Perf   |
    | Engine |    |Extract |    | Cache  |    | Tuning |
    +--------+    +--------+    +--------+    +--------+
         |             |             |             |
    +--------+    +--------+    +--------+    +--------+
    |  DOM   |    |Content |    | Error  |    |Monitor |
    |Analyzer|    |Classify|    |Recovery|    |  ing   |
    +--------+    +--------+    +--------+    +--------+
         |             |             |             |
    +--------+    +--------+    +--------+    +--------+
    |Schemas |    | Schema |    | Multi  |    | Scale  |
    | Define |    | Mapper |    | Format |    | Test   |
    +--------+    +--------+    +--------+    +--------+
```

### 14.2 Phase 1: Foundation (Weeks 1-2)

**Goals:**
- Browser rendering infrastructure
- DOM analysis engine
- Basic schema definitions

**Deliverables:**

```python
# browser_engine.py - Playwright integration
class BrowserEngine:
    async def capture_page_state(url: str) -> PageState
    async def create_accessibility_snapshot(page: Page) -> str

# dom_analyzer.py - Structure analysis
class DOMAnalyzer:
    def analyze_structure(html: str, snapshot: str) -> DOMAnalysis
    def classify_page_type(soup: BeautifulSoup) -> str

# schemas/ - Data schemas
schemas/product.json
schemas/campground.json
schemas/business.json
schemas/comparison.json
```

**Success Criteria:**
- Render 100 test URLs successfully
- DOM analysis returns valid structure for 95% of pages
- All schemas validated and documented

### 14.3 Phase 2: Core AI Extraction (Weeks 3-5)

**Goals:**
- AI-powered content classification
- Semantic data extraction
- Schema mapping

**Deliverables:**

```python
# content_classifier.py - AI classification
class ContentClassifier:
    async def classify(page_state: PageState) -> ClassificationResult

# semantic_extractor.py - AI extraction
class SemanticExtractor:
    async def extract(page_state: PageState, intent: ExtractionIntent) -> Dict

# schema_mapper.py - Output formatting
class SchemaMapper:
    def map_to_schema(raw_data: Dict, schema_type: str) -> Dict
```

**Success Criteria:**
- Content classification accuracy > 85%
- Extraction accuracy > 80% for top 5 categories
- E2E extraction time < 5 seconds (P95)

### 14.4 Phase 3: Advanced Features (Weeks 6-7)

**Goals:**
- Pattern caching system
- Error recovery pipeline
- Multi-format output

**Deliverables:**

```python
# pattern_cache.py - Caching
class PatternCache:
    async def get_pattern(url: str) -> Optional[ExtractionPattern]
    async def save_pattern(url: str, pattern: ExtractionPattern)

# error_handler.py - Recovery
class ExtractionErrorHandler:
    async def handle_error(error: Exception, context: ExtractionContext)

# output_formatter.py - Formats
class OutputFormatter:
    def format_json(data: Dict) -> str
    def format_markdown(data: Dict) -> str
    def format_natural_language(data: Dict, context: Dict) -> str
```

**Success Criteria:**
- Cache hit rate > 50% after 1 week
- Error recovery success rate > 90%
- All output formats supported

### 14.5 Phase 4: Optimization (Week 8)

**Goals:**
- Performance optimization
- Monitoring and alerting
- Scale testing

**Deliverables:**

```python
# performance_optimizer.py - Optimization
class PerformanceOptimizer:
    async def optimize_extraction(url: str, intent: str)

# metrics.py - Monitoring
class ExtractionMetrics:
    async def record_extraction(result, duration, cache_hit)

# load_tests/ - Scale testing
load_tests/concurrent_extraction_test.py
load_tests/stress_test.py
```

**Success Criteria:**
- P95 latency < 5 seconds under load
- System handles 100 concurrent extractions
- All metrics exported to monitoring

---

## 15. Appendix

### 15.1 Glossary

| Term | Definition |
|------|------------|
| **OpenClaw** | Element indexing system using numeric references |
| **Accessibility Snapshot** | Tree representation of page elements |
| **Extraction Pattern** | Cached strategy for successful extractions |
| **Schema Mapping** | Converting raw data to standardized format |
| **Semantic Extraction** | AI-powered content understanding |
| **Structural Extraction** | Pattern-based DOM parsing |

### 15.2 Related Documentation

- PAM System Architecture: `/docs/PAM_SYSTEM_ARCHITECTURE.md`
- Database Schema Reference: `/docs/DATABASE_SCHEMA_REFERENCE.md`
- Existing Scraper: `/backend/app/services/scraping/enhanced_scraper.py`
- Screenshot Analyzer: `/backend/app/services/vision/screenshot_analyzer.py`

### 15.3 API Endpoints (Proposed)

```yaml
# New PAM Tool Endpoints

POST /api/v1/pam/extract
  description: Extract data from URL
  request:
    url: string (required)
    intent: string (optional)
    expected_type: string (optional)
    output_format: enum [json, markdown, natural_language]
  response:
    success: boolean
    data: object
    page_type: string
    confidence: number

GET /api/v1/pam/extract/status/{job_id}
  description: Check extraction status for async jobs
  response:
    status: enum [pending, processing, completed, failed]
    result: object (if completed)

POST /api/v1/pam/extract/batch
  description: Extract data from multiple URLs
  request:
    urls: array<string>
    intent: string (optional)
  response:
    job_id: string
```

### 15.4 Configuration Reference

```yaml
# extraction_config.yaml

browser:
  headless: true
  timeout_ms: 10000
  viewport:
    width: 1920
    height: 1080

extraction:
  max_page_size_mb: 10
  max_text_chars: 100000
  ai_model: claude-sonnet-4-5-20250929
  max_ai_tokens: 8000

cache:
  request_ttl_seconds: 300
  pattern_ttl_seconds: 604800
  redis_prefix: extraction

rate_limits:
  per_user_per_minute: 10
  per_domain_per_minute: 5

performance:
  target_p95_ms: 5000
  max_concurrent: 10
  browser_pool_size: 5
```

### 15.5 Example Extraction Flow

```
User Message: "What's the price of this camera?"
URL: https://www.amazon.com/dp/B0BCR7TJ4T

1. INPUT HANDLER
   - Validates URL
   - Extracts intent: "price extraction"
   - Checks cache: MISS

2. BROWSER ENGINE
   - Launches headless browser
   - Navigates to URL
   - Waits for page load
   - Captures accessibility snapshot
   - Takes screenshot

3. DOM ANALYZER
   - Parses HTML structure
   - Identifies page type: "product"
   - Maps content regions
   - Builds element index

4. AI CLASSIFICATION
   Prompt: "Classify this page..."
   Response: {
     "content_type": "product",
     "confidence": 0.94,
     "key_elements": [6, 8, 9]
   }

5. AI EXTRACTION
   Prompt: "Extract product data..."
   Response: {
     "name": "Blink Mini 2",
     "price": {"amount": 29.99, "currency": "USD"},
     "availability": {"in_stock": true}
   }

6. SCHEMA MAPPER
   - Maps to Product schema
   - Validates required fields
   - Normalizes values

7. OUTPUT FORMATTER
   Natural Language: "The Blink Mini 2 Camera is $29.99
   and is currently in stock."

8. CACHE UPDATE
   - Saves extraction pattern
   - Caches result (5 min TTL)

9. RESPONSE TO PAM
   PAM formats response for user
```

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-02-01 | Engineering Team | Initial draft |

---

**Status:** Draft - Pending Review
**Next Review:** 2026-02-08
**Approvers:** Product Lead, Engineering Lead, Security Team
