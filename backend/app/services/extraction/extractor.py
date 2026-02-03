"""
Site-Agnostic Data Extraction - Main Extractor
Orchestrates the complete extraction pipeline from URL to structured data
"""

import time
from typing import Optional, Dict, Any
from datetime import datetime

from app.core.logging import get_logger

logger = get_logger(__name__)

from .schemas import PageState, ExtractionResult, PageType
from .browser_engine import BrowserEngine
from .dom_analyzer import DOMAnalyzer
from .content_classifier import ContentClassifier
from .semantic_extractor import SemanticExtractor
from .pattern_cache import PatternCache
from .output_formatter import OutputFormatter
from .exceptions import (
    ExtractionError,
    BrowserError,
    NavigationError,
    NavigationTimeoutError,
    ContentExtractionError,
    DOMAnalysisError,
)


class SiteAgnosticExtractor:
    """
    Main orchestrator for site-agnostic data extraction
    Combines browser rendering, AI classification, semantic extraction, and caching

    Pipeline:
    1. Check cache for existing extraction
    2. Render page with headless browser
    3. Classify page type using AI
    4. Extract structured data based on type
    5. Cache successful extractions
    6. Format output for requested format

    Usage as context manager:
        async with SiteAgnosticExtractor() as extractor:
            result = await extractor.extract("https://example.com")
    """

    def __init__(self):
        self.browser_engine = BrowserEngine()
        self.dom_analyzer = DOMAnalyzer()
        self.content_classifier = ContentClassifier()
        self.semantic_extractor = SemanticExtractor()
        self.pattern_cache = PatternCache()
        self.output_formatter = OutputFormatter()

        logger.info("Site-agnostic extractor initialized")

    async def __aenter__(self):
        """Async context manager entry"""
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Async context manager exit - cleanup resources"""
        await self.close()
        return False

    async def extract(
        self,
        url: str,
        intent: Optional[str] = None,
        output_format: str = "json",
        skip_cache: bool = False,
        include_screenshot: bool = False
    ) -> ExtractionResult:
        """
        Extract structured data from any URL

        Args:
            url: URL to extract data from
            intent: Optional user intent for focused extraction
            output_format: Output format - "json", "markdown", or "natural"
            skip_cache: Skip cache lookup (force fresh extraction)
            include_screenshot: Include page screenshot in result

        Returns:
            ExtractionResult with extracted data and metadata
        """
        start_time = time.time()

        try:
            logger.info(f"Starting extraction for: {url}")

            # Step 1: Check cache (unless skipped)
            if not skip_cache:
                cached_result = await self.pattern_cache.get_cached_extraction(url, intent)
                if cached_result:
                    logger.info(f"Returning cached extraction for: {url}")
                    cached_result.metadata["from_cache"] = True
                    cached_result.processing_time_ms = (time.time() - start_time) * 1000
                    return cached_result

            # Step 2: Render page with browser
            try:
                page_state = await self.browser_engine.capture_page_state(
                    url,
                    wait_for_network_idle=True,
                    take_screenshot=include_screenshot
                )
            except NavigationTimeoutError as e:
                logger.error(f"Navigation timeout for {url}: {str(e)}", exc_info=True)
                return self._create_error_result(
                    url=url,
                    error=f"Page load timed out: {str(e)}",
                    processing_time_ms=(time.time() - start_time) * 1000,
                    error_type="navigation_timeout"
                )
            except NavigationError as e:
                logger.error(f"Navigation failed for {url}: {str(e)}", exc_info=True)
                return self._create_error_result(
                    url=url,
                    error=f"Failed to navigate to page: {str(e)}",
                    processing_time_ms=(time.time() - start_time) * 1000,
                    error_type="navigation_error"
                )
            except BrowserError as e:
                logger.error(f"Browser error for {url}: {str(e)}", exc_info=True)
                return self._create_error_result(
                    url=url,
                    error=f"Browser error: {str(e)}",
                    processing_time_ms=(time.time() - start_time) * 1000,
                    error_type="browser_error"
                )
            except Exception as e:
                logger.error(
                    f"Unexpected error during page capture for {url}: {str(e)}",
                    exc_info=True
                )
                return self._create_error_result(
                    url=url,
                    error=f"Failed to load page: {str(e)}",
                    processing_time_ms=(time.time() - start_time) * 1000,
                    error_type="unknown_browser_error"
                )

            # Step 3: Analyze DOM structure
            try:
                dom_analysis = self.dom_analyzer.analyze_structure(
                    page_state.html,
                    page_state.snapshot,
                    url=url
                )
            except DOMAnalysisError as e:
                logger.error(f"DOM analysis failed for {url}: {str(e)}", exc_info=True)
                return self._create_error_result(
                    url=url,
                    error=f"Failed to analyze page structure: {str(e)}",
                    processing_time_ms=(time.time() - start_time) * 1000,
                    error_type="dom_analysis_error"
                )

            # Step 4: Classify page type
            classification = await self.content_classifier.classify(page_state)

            # Use DOM analyzer's classification if AI classification is uncertain
            if classification.confidence < 0.5 and dom_analysis.page_type != PageType.UNKNOWN:
                logger.info(f"Using DOM-based classification: {dom_analysis.page_type}")
                final_page_type = dom_analysis.page_type
            else:
                final_page_type = classification.category

            # Step 5: Extract structured data
            extracted_data = await self.semantic_extractor.extract(
                page_state,
                final_page_type,
                intent
            )

            # Build result
            result = ExtractionResult(
                success=True,
                url=url,
                page_type=final_page_type,
                confidence=classification.confidence,
                data=extracted_data,
                errors=[],
                metadata={
                    "title": page_state.title,
                    "classification_reasoning": classification.reasoning,
                    "available_fields": classification.available_fields,
                    "dom_regions": len(dom_analysis.content_regions),
                    "intent": intent,
                    "output_format": output_format
                },
                extracted_at=datetime.utcnow(),
                processing_time_ms=(time.time() - start_time) * 1000
            )

            # Step 6: Cache successful extraction
            if result.success and result.confidence >= 0.5:
                await self.pattern_cache.cache_extraction(url, intent, result)

            logger.info(
                f"Extraction complete for {url}: "
                f"type={final_page_type}, confidence={classification.confidence:.2f}, "
                f"time={result.processing_time_ms:.0f}ms"
            )

            return result

        except ExtractionError as e:
            # Our custom exceptions - already logged at source
            logger.error(f"Extraction failed for {url}: {str(e)}", exc_info=True)
            return self._create_error_result(
                url=url,
                error=str(e),
                processing_time_ms=(time.time() - start_time) * 1000,
                error_type=type(e).__name__
            )
        except Exception as e:
            # Unexpected errors - log with full traceback
            logger.error(
                f"Unexpected extraction error for {url}: {type(e).__name__}: {str(e)}",
                exc_info=True
            )
            return self._create_error_result(
                url=url,
                error=f"Unexpected error: {str(e)}",
                processing_time_ms=(time.time() - start_time) * 1000,
                error_type="unexpected_error"
            )

    async def extract_formatted(
        self,
        url: str,
        intent: Optional[str] = None,
        output_format: str = "json",
        **kwargs
    ) -> Dict[str, Any]:
        """
        Extract and format data in a single call

        Args:
            url: URL to extract from
            intent: Optional user intent
            output_format: "json", "markdown", or "natural"
            **kwargs: Additional extraction options

        Returns:
            Dictionary with formatted output and metadata
        """
        result = await self.extract(url, intent, output_format, **kwargs)

        if not result.success:
            return {
                "success": False,
                "error": result.errors[0] if result.errors else "Extraction failed",
                "url": url
            }

        # Format output
        if output_format == "markdown":
            formatted = self.output_formatter.format_markdown(
                result.data,
                result.page_type
            )
        elif output_format == "natural":
            formatted = self.output_formatter.format_natural_language(
                result.data,
                {"page_type": result.page_type, "intent": intent}
            )
        else:
            formatted = self.output_formatter.format_json(result.data)

        return {
            "success": True,
            "url": url,
            "page_type": result.page_type.value,
            "confidence": result.confidence,
            "formatted_output": formatted,
            "raw_data": result.data,
            "metadata": result.metadata,
            "processing_time_ms": result.processing_time_ms
        }

    async def extract_for_pam(
        self,
        url: str,
        user_question: Optional[str] = None
    ) -> str:
        """
        Extract data formatted specifically for PAM responses

        Args:
            url: URL to extract from
            user_question: User's original question for context

        Returns:
            Natural language response suitable for PAM
        """
        result = await self.extract_formatted(
            url,
            intent=user_question,
            output_format="natural"
        )

        if not result["success"]:
            return f"I wasn't able to extract information from that page. {result.get('error', '')}"

        return result["formatted_output"]

    def _create_error_result(
        self,
        url: str,
        error: str,
        processing_time_ms: float,
        error_type: str = "extraction_failed"
    ) -> ExtractionResult:
        """Create an error result with categorized error type for debugging.

        Args:
            url: The URL that failed extraction
            error: Human-readable error message
            processing_time_ms: Time elapsed before failure
            error_type: Categorized error type for programmatic handling

        Returns:
            ExtractionResult with success=False and error details
        """
        return ExtractionResult(
            success=False,
            url=url,
            page_type=PageType.UNKNOWN,
            confidence=0.0,
            data={},
            errors=[error],
            metadata={
                "error_type": error_type,
                "error_message": error,
            },
            extracted_at=datetime.utcnow(),
            processing_time_ms=processing_time_ms
        )

    async def close(self) -> None:
        """Close browser and cleanup resources"""
        await self.browser_engine.close()
        logger.info("Extractor resources cleaned up")

    async def health_check(self) -> Dict[str, Any]:
        """Check health of all extraction components"""
        checks = {}

        # Check browser engine
        browser_health = await self.browser_engine.health_check()
        checks["browser_engine"] = browser_health

        # Check content classifier
        classifier_health = await self.content_classifier.health_check()
        checks["content_classifier"] = classifier_health

        # Check semantic extractor
        extractor_health = await self.semantic_extractor.health_check()
        checks["semantic_extractor"] = extractor_health

        # Check pattern cache
        cache_health = await self.pattern_cache.health_check()
        checks["pattern_cache"] = cache_health

        # Overall status
        all_healthy = all(
            check.get("status") in ["healthy", "available"]
            for check in checks.values()
        )

        degraded = any(
            check.get("status") == "degraded"
            for check in checks.values()
        )

        if all_healthy:
            overall_status = "healthy"
        elif degraded:
            overall_status = "degraded"
        else:
            overall_status = "unhealthy"

        return {
            "status": overall_status,
            "components": checks,
            "timestamp": datetime.utcnow().isoformat()
        }


# Module-level singleton for convenience
_extractor_instance: Optional[SiteAgnosticExtractor] = None


async def get_extractor() -> SiteAgnosticExtractor:
    """Get or create the singleton extractor instance"""
    global _extractor_instance
    if _extractor_instance is None:
        _extractor_instance = SiteAgnosticExtractor()
    return _extractor_instance


async def extract_url(
    url: str,
    intent: Optional[str] = None,
    output_format: str = "json"
) -> ExtractionResult:
    """Convenience function for quick extraction"""
    extractor = await get_extractor()
    return await extractor.extract(url, intent, output_format)
