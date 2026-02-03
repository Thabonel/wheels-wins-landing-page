"""
Site-Agnostic Data Extraction System for PAM

Based on OpenClaw's approach to intelligent web data extraction:
- Headless browser rendering with Playwright
- AI-powered page classification and semantic extraction
- Pattern caching for improved performance
- Multiple output formats for different use cases

Usage:
    from app.services.extraction import SiteAgnosticExtractor, extract_url

    # Quick extraction
    result = await extract_url("https://example.com/product/123")

    # Full control
    extractor = SiteAgnosticExtractor()
    result = await extractor.extract(
        url="https://example.com/campground",
        intent="I want to know about amenities",
        output_format="markdown"
    )

    # For PAM responses
    response = await extractor.extract_for_pam(
        url="https://example.com/rv-park",
        user_question="Does this place have full hookups?"
    )
"""

from .schemas import (
    PageType,
    PageState,
    ElementInfo,
    ContentRegion,
    DOMAnalysis,
    ClassificationResult,
    FieldExtraction,
    ProductData,
    CampgroundData,
    BusinessData,
    ComparisonData,
    ExtractionPattern,
    ExtractionResult,
)

from .browser_engine import BrowserEngine, shutdown_browser_pool
from .browser_pool import BrowserPool, get_browser_pool, close_browser_pool
from .dom_analyzer import DOMAnalyzer
from .content_classifier import ContentClassifier
from .semantic_extractor import SemanticExtractor
from .pattern_cache import PatternCache
from .output_formatter import OutputFormatter
from .extractor import (
    SiteAgnosticExtractor,
    get_extractor,
    extract_url,
)
from .exceptions import (
    ExtractionError,
    BrowserError,
    BrowserInitializationError,
    NavigationError,
    PageLoadError,
    NavigationTimeoutError,
    ScreenshotError,
    AccessibilitySnapshotError,
    ContentExtractionError,
    DOMAnalysisError,
    ClassificationError,
    MetadataExtractionError,
    CacheError,
)

__all__ = [
    # Main extractor
    "SiteAgnosticExtractor",
    "get_extractor",
    "extract_url",
    # Component classes
    "BrowserEngine",
    "BrowserPool",
    "get_browser_pool",
    "close_browser_pool",
    "shutdown_browser_pool",
    "DOMAnalyzer",
    "ContentClassifier",
    "SemanticExtractor",
    "PatternCache",
    "OutputFormatter",
    # Schema types
    "PageType",
    "PageState",
    "ElementInfo",
    "ContentRegion",
    "DOMAnalysis",
    "ClassificationResult",
    "FieldExtraction",
    "ProductData",
    "CampgroundData",
    "BusinessData",
    "ComparisonData",
    "ExtractionPattern",
    "ExtractionResult",
    # Exception types
    "ExtractionError",
    "BrowserError",
    "BrowserInitializationError",
    "NavigationError",
    "PageLoadError",
    "NavigationTimeoutError",
    "ScreenshotError",
    "AccessibilitySnapshotError",
    "ContentExtractionError",
    "DOMAnalysisError",
    "ClassificationError",
    "MetadataExtractionError",
    "CacheError",
]
