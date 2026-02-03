"""
Site-Agnostic Data Extraction - Content Classifier
Uses Claude to intelligently classify page content and identify extractable fields
"""

import os
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
    logger.warning("Anthropic package not installed - content classifier will be limited")

from .schemas import PageState, ClassificationResult, PageType


CLASSIFICATION_PROMPT = """You are an expert web page analyzer. Analyze the following page content and classify it.

PAGE URL: {url}
PAGE TITLE: {title}

ACCESSIBILITY SNAPSHOT (showing page structure with element indices):
{snapshot}

HTML META TAGS:
{meta_tags}

Based on this information, classify the page and identify what data can be extracted.

Respond in JSON format:
{{
    "category": "<one of: product, campground, business, article, comparison, listing, form, unknown>",
    "confidence": <0.0-1.0>,
    "reasoning": "<brief explanation of why you classified it this way>",
    "key_elements": ["<list of key elements that led to this classification>"],
    "available_fields": ["<list of data fields that appear extractable from this page>"]
}}

Focus on:
1. The page's primary purpose (e-commerce product? campground listing? business info?)
2. Specific indicators in the structure (price elements, add-to-cart buttons, amenity lists, etc.)
3. What useful data could be extracted for a user wanting information from this page

Be specific about available_fields - list concrete fields like "price", "name", "rating", "amenities", "address", etc."""


class ContentClassifier:
    """
    AI-powered content classifier using Claude
    Analyzes page structure and content to determine page type and extractable fields
    """

    def __init__(self):
        settings = get_settings()
        api_key = os.getenv("ANTHROPIC-WHEELS-KEY") or settings.anthropic_api_key

        if not ANTHROPIC_AVAILABLE:
            logger.warning("Anthropic package not available - classifier will use fallback")
            self.client = None
        elif not api_key:
            logger.warning("Anthropic API key not found - classifier will use fallback")
            self.client = None
        else:
            self.client = anthropic.Anthropic(api_key=api_key)
            logger.info("Content classifier initialized with Claude")

    async def classify(self, page_state: PageState) -> ClassificationResult:
        """
        Classify page content using Claude AI

        Args:
            page_state: Captured page state

        Returns:
            ClassificationResult with category, confidence, and extractable fields
        """
        if not self.client:
            logger.info("Using fallback classification (no AI available)")
            return self._fallback_classify(page_state)

        try:
            # Prepare meta tags for prompt
            meta_tags = page_state.metadata.get("meta_tags", {})
            meta_str = "\n".join([f"  {k}: {v}" for k, v in meta_tags.items()][:20])

            # Truncate snapshot if too long (keep first 8000 chars)
            snapshot = page_state.snapshot
            if len(snapshot) > 8000:
                snapshot = snapshot[:8000] + "\n... [truncated]"

            # Build prompt
            prompt = CLASSIFICATION_PROMPT.format(
                url=page_state.url,
                title=page_state.title,
                snapshot=snapshot,
                meta_tags=meta_str or "No meta tags found"
            )

            # Call Claude API
            response = self.client.messages.create(
                model="claude-3-5-sonnet-20241022",
                max_tokens=1000,
                temperature=0.3,  # Lower temperature for more consistent classification
                messages=[{"role": "user", "content": prompt}]
            )

            # Parse response
            response_text = response.content[0].text
            result = self._parse_classification_response(response_text)

            logger.info(f"Page classified as {result.category} with confidence {result.confidence}")
            return result

        except Exception as e:
            logger.error(f"Classification error: {str(e)}, using fallback")
            return self._fallback_classify(page_state)

    def _parse_classification_response(self, response_text: str) -> ClassificationResult:
        """Parse Claude's JSON response into ClassificationResult"""
        import json

        try:
            # Extract JSON from response (handle potential markdown wrapping)
            json_start = response_text.find("{")
            json_end = response_text.rfind("}") + 1

            if json_start >= 0 and json_end > json_start:
                json_str = response_text[json_start:json_end]
                data = json.loads(json_str)

                # Map category string to PageType enum
                category_str = data.get("category", "unknown").lower()
                try:
                    category = PageType(category_str)
                except ValueError:
                    category = PageType.UNKNOWN

                return ClassificationResult(
                    category=category,
                    confidence=float(data.get("confidence", 0.5)),
                    reasoning=data.get("reasoning", ""),
                    key_elements=data.get("key_elements", []),
                    available_fields=data.get("available_fields", [])
                )

        except (json.JSONDecodeError, KeyError) as e:
            logger.warning(f"Failed to parse classification response: {str(e)}")

        # Return default if parsing fails
        return ClassificationResult(
            category=PageType.UNKNOWN,
            confidence=0.3,
            reasoning="Failed to parse AI response",
            key_elements=[],
            available_fields=[]
        )

    def _fallback_classify(self, page_state: PageState) -> ClassificationResult:
        """
        Fallback classification using basic heuristics when AI is unavailable

        Args:
            page_state: Captured page state

        Returns:
            Basic ClassificationResult
        """
        title_lower = page_state.title.lower()
        url_lower = page_state.url.lower()
        snapshot_lower = page_state.snapshot.lower()

        # Check for common patterns
        if any(word in url_lower or word in title_lower for word in ["campground", "rv-park", "camping", "campsite"]):
            return ClassificationResult(
                category=PageType.CAMPGROUND,
                confidence=0.6,
                reasoning="URL/title contains camping-related keywords",
                key_elements=["url_keywords", "title_keywords"],
                available_fields=["name", "location", "amenities", "description"]
            )

        if any(word in snapshot_lower for word in ["add to cart", "buy now", "price"]):
            return ClassificationResult(
                category=PageType.PRODUCT,
                confidence=0.6,
                reasoning="Page contains e-commerce elements",
                key_elements=["add_to_cart", "price"],
                available_fields=["name", "price", "description", "images"]
            )

        if any(word in url_lower for word in ["article", "blog", "post", "news"]):
            return ClassificationResult(
                category=PageType.ARTICLE,
                confidence=0.5,
                reasoning="URL suggests article content",
                key_elements=["url_pattern"],
                available_fields=["title", "content", "author", "date"]
            )

        # Default unknown
        return ClassificationResult(
            category=PageType.UNKNOWN,
            confidence=0.3,
            reasoning="Could not determine page type from available signals",
            key_elements=[],
            available_fields=["title", "content"]
        )

    async def health_check(self) -> Dict[str, Any]:
        """Check classifier health"""
        if not self.client:
            return {
                "status": "degraded",
                "ai_available": False,
                "message": "Running with fallback classification only"
            }

        try:
            # Simple test to verify API connectivity
            response = self.client.messages.create(
                model="claude-3-5-sonnet-20241022",
                max_tokens=10,
                messages=[{"role": "user", "content": "Hi"}]
            )

            return {
                "status": "healthy",
                "ai_available": True,
                "model": "claude-3-5-sonnet-20241022"
            }

        except Exception as e:
            return {
                "status": "error",
                "ai_available": False,
                "error": str(e)
            }
